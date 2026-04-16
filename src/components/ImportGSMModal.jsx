import { useState, useRef } from 'react'
import { X, Upload, Phone, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'
import { formatLastFirst, normalizeName } from '../config/constants'

function normalizePhone(raw) {
  if (!raw) return ''
  // Garde chiffres, +, espaces, tirets, parenthèses → puis compacte
  return String(raw).replace(/[^\d+]/g, '').replace(/^0/, '+41')
}

// Tente de détecter si une valeur ressemble à un numéro de téléphone
function looksLikePhone(val) {
  if (!val) return false
  const s = String(val).replace(/[\s\-().]/g, '')
  return /^[+\d]{7,15}$/.test(s)
}

// ─── Détection automatique des colonnes ─────────────────────────────────────
const NAME_KEYWORDS  = ['nom', 'name', 'medecin', 'médecin', 'docteur', 'prenom', 'prénom', 'fullname']
const PHONE_KEYWORDS = ['gsm', 'tel', 'téléphone', 'telephone', 'portable', 'mobile', 'phone', 'natel', 'numéro', 'numero']

function detectColumns(headers) {
  const h = headers.map(x => String(x ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  let nameCol  = h.findIndex(x => NAME_KEYWORDS.some(k => x.includes(k)))
  let phoneCol = h.findIndex(x => PHONE_KEYWORDS.some(k => x.includes(k)))
  return { nameCol, phoneCol }
}

// ─── Parser principal ────────────────────────────────────────────────────────
function parseGSMSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // Cherche la ligne d'en-tête (première ligne avec >1 cellule non vide)
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i].filter(Boolean).length > 1) { headerRowIdx = i; break }
  }

  const headers = rows[headerRowIdx].map(String)
  let { nameCol, phoneCol } = detectColumns(headers)

  // Fallback : si colonnes non détectées, cherche par contenu
  if (nameCol === -1 || phoneCol === -1) {
    // Parcourt les premières lignes de données pour détecter par valeur
    for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 6, rows.length); r++) {
      rows[r].forEach((cell, ci) => {
        if (phoneCol === -1 && looksLikePhone(cell)) phoneCol = ci
      })
      if (phoneCol !== -1) break
    }
    // La colonne nom est celle avant le téléphone par défaut
    if (nameCol === -1 && phoneCol > 0) nameCol = phoneCol - 1
    if (nameCol === -1) nameCol = 0
  }

  const results = []
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    const rawName  = row[nameCol]  ?? ''
    const rawPhone = row[phoneCol] ?? ''
    if (!rawName && !rawPhone) continue

    // Gère "Prénom Nom" ou "NOM Prénom" ou "NOM, Prénom"
    const nameStr = String(rawName).replace(/,/g, ' ').trim()
    if (!nameStr) continue

    results.push({
      rawName:  nameStr,
      normName: normalizeName(nameStr),
      rawPhone: String(rawPhone).trim(),
      phone:    normalizePhone(rawPhone),
    })
  }
  return results
}

// ─── Matching avec les profils ───────────────────────────────────────────────
function matchProfile(normName, profiles) {
  // Essai exact
  let p = profiles.find(p => normalizeName(p.full_name) === normName)
  if (p) return p

  // Essai : nom + prénom inversés (ex: "VALENCE DE Timothée" vs "Timothée De Valence")
  const parts = normName.split(' ')
  if (parts.length >= 2) {
    // Essaie toutes les permutations prénom/nom classiques
    const reversed = [...parts].reverse().join(' ')
    p = profiles.find(p => normalizeName(p.full_name) === reversed)
    if (p) return p

    // Contient tous les mots dans n'importe quel ordre
    p = profiles.find(p => {
      const pn = normalizeName(p.full_name)
      return parts.every(w => w.length > 1 && pn.includes(w))
    })
    if (p) return p
  }
  return null
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function ImportGSMModal({ onClose }) {
  const T = WARM
  const fileRef = useRef(null)
  const [step, setStep] = useState('upload') // upload | preview | done
  const [profiles, setProfiles] = useState([])
  const [matches, setMatches] = useState([])   // { profile, phone, rawName }
  const [unmatched, setUnmatched] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(0)
  const [showUnmatched, setShowUnmatched] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const entries = parseGSMSheet(ws)

    // Charge les profils si pas encore fait
    let profs = profiles
    if (profs.length === 0) {
      const { data } = await supabase.from('profiles').select('*')
      profs = data ?? []
      setProfiles(profs)
    }

    const matched   = []
    const noMatch   = []

    for (const entry of entries) {
      if (!entry.rawPhone && !entry.phone) { noMatch.push(entry); continue }
      const p = matchProfile(entry.normName, profs)
      if (p) {
        matched.push({ profile: p, phone: entry.phone || entry.rawPhone, rawName: entry.rawName })
      } else {
        noMatch.push(entry)
      }
    }

    setMatches(matched)
    setUnmatched(noMatch)
    setStep('preview')
  }

  async function handleSave() {
    setSaving(true)
    let count = 0
    for (const m of matches) {
      if (!m.phone) continue
      await supabase.from('profiles').update({ phone: m.phone }).eq('id', m.profile.id)
      count++
    }
    setSaved(count)
    setSaving(false)
    setStep('done')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div style={{ background: T.cardHead, borderColor: T.border }}
          className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone size={17} style={{ color: T.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: T.text }}>Import GSM</h2>
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }}
            className="p-1.5 hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>

        {/* Upload */}
        {step === 'upload' && (
          <div className="px-5 py-6 flex flex-col items-center gap-4">
            <div style={{ background: T.surface, borderColor: T.border }}
              className="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => fileRef.current?.click()}>
              <Upload size={28} style={{ color: T.accentBar }} />
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                Glisser ou choisir un fichier Excel
              </p>
              <p className="text-xs text-center" style={{ color: T.textFaint }}>
                .xlsx, .xls ou .csv · colonnes Nom + GSM/Téléphone
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Prévisualisation */}
        {step === 'preview' && (
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {matches.length} numéro{matches.length > 1 ? 's' : ''} à importer
            </p>

            {/* Liste des correspondances */}
            <div className="flex flex-col gap-1.5">
              {matches.map((m, i) => (
                <div key={i}
                  style={{ background: T.surface, borderColor: T.border }}
                  className="border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                      {formatLastFirst(m.profile.full_name)}
                    </p>
                    <p className="text-xs" style={{ color: T.textFaint }}>{m.rawName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Phone size={12} style={{ color: T.accentBar }} />
                    <span className="text-sm font-mono" style={{ color: T.text }}>{m.phone}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Non reconnus */}
            {unmatched.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 hover:opacity-70 transition-opacity"
                  style={{ color: '#B45309' }}
                  onClick={() => setShowUnmatched(v => !v)}>
                  <AlertTriangle size={12} />
                  {unmatched.length} non reconnu{unmatched.length > 1 ? 's' : ''}
                  <ChevronDown size={12}
                    style={{ transform: showUnmatched ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showUnmatched && (
                  <div className="flex flex-col gap-1">
                    {unmatched.map((u, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>
                        {u.rawName} {u.rawPhone ? `· ${u.rawPhone}` : '(pas de numéro)'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('upload')}
                style={{ borderColor: T.border, color: T.textSub }}
                className="flex-1 border rounded-xl py-2.5 text-sm font-semibold hover:opacity-70 transition-opacity">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || matches.length === 0}
                style={{ background: T.accentBar }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                {saving ? 'Enregistrement…' : `Enregistrer ${matches.length}`}
              </button>
            </div>
          </div>
        )}

        {/* Succès */}
        {step === 'done' && (
          <div className="px-5 py-10 flex flex-col items-center gap-4">
            <div style={{ background: '#D1FAE5' }}
              className="w-14 h-14 rounded-full flex items-center justify-center">
              <Check size={28} style={{ color: '#059669' }} />
            </div>
            <p className="text-base font-bold" style={{ color: T.text }}>
              {saved} numéro{saved > 1 ? 's' : ''} mis à jour
            </p>
            {unmatched.length > 0 && (
              <p className="text-xs text-center" style={{ color: T.textFaint }}>
                {unmatched.length} entrée{unmatched.length > 1 ? 's' : ''} non reconnue{unmatched.length > 1 ? 's' : ''}
              </p>
            )}
            <button onClick={onClose}
              style={{ background: T.accentBar }}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
