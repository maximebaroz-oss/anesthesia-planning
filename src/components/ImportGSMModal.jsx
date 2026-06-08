import { useState, useRef, useEffect } from 'react'
import { X, Upload, Phone, Check, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'
import { formatLastFirst, normalizeName } from '../config/constants'

function cleanExcelName(raw) {
  if (!raw) return ''
  return raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\b\d{1,2}[h:]\d{0,2}\s*[-–]\s*\d{1,2}[h:]\d{0,2}\b/gi, '')
    .replace(/\b\d{1,2}[h:]\d{0,2}\b/gi, '')
    .replace(/\b(AM|PM)\.?\b/gi, '')
    .replace(/[-,;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(raw) {
  if (!raw) return ''
  return String(raw).replace(/[^\d+]/g, '').replace(/^0(\d{9})$/, '+41$1')
}

// Téléphone "long" (mobiles, +41...) — min 7 chiffres
function looksLikePhone(val) {
  if (!val) return false
  const s = String(val).replace(/[\s\-().]/g, '')
  return /^[+\d]{7,15}$/.test(s)
}

// Extension interne courte (p. ex. "32 047", 36639) — min 5 chiffres
function looksLikeExtension(val) {
  if (!val) return false
  const s = String(val).replace(/[\s\-().]/g, '')
  return /^\d{5,6}$/.test(s)
}

// ─── Détection des colonnes (fichier simple 1 section) ───────────────────────
const NAME_KEYWORDS  = ['nom', 'name', 'medecin', 'médecin', 'docteur', 'prenom', 'prénom', 'fullname']
const PHONE_KEYWORDS = ['gsm', 'tel', 'téléphone', 'telephone', 'portable', 'mobile', 'phone', 'natel', 'numéro', 'numero']

function detectColumns(headers) {
  const h = headers.map(x => String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
  return {
    nameCol:  h.findIndex(x => NAME_KEYWORDS.some(k => x.includes(k))),
    phoneCol: h.findIndex(x => PHONE_KEYWORDS.some(k => x.includes(k))),
  }
}

// ─── Parser multi-sections ────────────────────────────────────────────────────
// Format : plusieurs groupes nom+téléphone côte à côte, séparés par des colonnes vides
// Ex : | Adjoints | | | | | Internes | | | | | Admin | |
function parseMultiSection(rows, headerRowIdx, sectionStarts) {
  const results = []
  const rowLen = rows[headerRowIdx].length

  // Sections : de sectionStarts[i] jusqu'à sectionStarts[i+1]-1 ou fin
  const sections = sectionStarts.map((startCol, idx) => ({
    nameCol: startCol,
    endCol:  idx + 1 < sectionStarts.length ? sectionStarts[idx + 1] - 1 : rowLen - 1,
  }))

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    for (const { nameCol, endCol } of sections) {
      const rawName = cleanExcelName(String(row[nameCol] ?? '').trim())
      if (!rawName || rawName.length < 2) continue

      // Cherche un numéro de téléphone dans les colonnes suivantes de la section
      let rawPhone = ''
      for (let c = nameCol + 1; c <= endCol; c++) {
        const cell = row[c]
        if (cell !== '' && cell !== null && cell !== undefined) {
          const cellStr = String(cell).trim()
          if (looksLikePhone(cellStr) || looksLikeExtension(cellStr)) {
            rawPhone = cellStr
            break
          }
        }
      }

      const nameStr = rawName.replace(/,/g, ' ').trim()
      results.push({
        rawName:  nameStr,
        normName: normalizeName(nameStr),
        rawPhone,
        phone:    normalizePhone(rawPhone),
      })
    }
  }
  return results
}

// ─── Parser simple (1 section, en-têtes de colonnes) ─────────────────────────
function parseSingleSection(rows, headerRowIdx) {
  const headers = rows[headerRowIdx].map(String)
  let { nameCol, phoneCol } = detectColumns(headers)

  // Fallback par contenu
  if (nameCol === -1 || phoneCol === -1) {
    for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 6, rows.length); r++) {
      rows[r].forEach((cell, ci) => {
        if (phoneCol === -1 && looksLikePhone(cell)) phoneCol = ci
      })
      if (phoneCol !== -1) break
    }
    if (nameCol === -1 && phoneCol > 0) nameCol = phoneCol - 1
    if (nameCol === -1) nameCol = 0
  }

  const results = []
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    const rawName  = row[nameCol]  ?? ''
    const rawPhone = phoneCol !== -1 ? (row[phoneCol] ?? '') : ''
    if (!rawName && !rawPhone) continue

    const nameStr = cleanExcelName(String(rawName).replace(/,/g, ' ').trim())
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

// ─── Dispatcher principal ─────────────────────────────────────────────────────
function parseGSMSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // Cherche la ligne d'en-tête (1ère ligne avec >1 cellule non vide)
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    if (rows[i].filter(Boolean).length > 1) { headerRowIdx = i; break }
  }

  const headerRow = rows[headerRowIdx]

  // Détecte si c'est un fichier multi-sections :
  // au moins 2 cellules non-vides dans l'en-tête avec un gap (≥2 colonnes) entre elles
  const nonEmpty = headerRow.reduce((acc, cell, i) => {
    if (String(cell).trim()) acc.push(i)
    return acc
  }, [])

  const isMultiSection = nonEmpty.length >= 2 &&
    nonEmpty.some((idx, i) => i > 0 && idx - nonEmpty[i - 1] > 1)

  if (isMultiSection) return parseMultiSection(rows, headerRowIdx, nonEmpty)
  return parseSingleSection(rows, headerRowIdx)
}

// ─── Matching avec les profils ────────────────────────────────────────────────
function matchProfile(normName, profiles) {
  let p = profiles.find(p => normalizeName(p.full_name) === normName)
  if (p) return p

  const parts = normName.split(' ')
  if (parts.length >= 2) {
    const reversed = [...parts].reverse().join(' ')
    p = profiles.find(p => normalizeName(p.full_name) === reversed)
    if (p) return p

    p = profiles.find(p => {
      const pn = normalizeName(p.full_name)
      return parts.every(w => w.length > 1 && pn.includes(w))
    })
    if (p) return p
  }
  return null
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function ImportGSMModal({ onClose, preloadedFile }) {
  const T = WARM
  const fileRef = useRef(null)
  const [step, setStep]           = useState('upload')
  const [loading, setLoading]     = useState(false)
  const [toUpdate, setToUpdate]   = useState([])
  const [alreadyOk, setAlreadyOk] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [noPhone, setNoPhone]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(0)
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [showAlreadyOk, setShowAlreadyOk] = useState(false)
  const [showNoPhone,   setShowNoPhone]   = useState(false)

  // Auto-traitement si fichier pré-chargé (depuis GlobalImportModal)
  useEffect(() => {
    if (preloadedFile) processFile(preloadedFile)
  }, [])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  async function processFile(file) {
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const entries = parseGSMSheet(ws)

      const { data } = await supabase.from('profiles').select('*')
      const profs = data ?? []

      const update  = []
      const ok      = []
      const noMatch = []
      const noPh    = []

      for (const entry of entries) {
        const p = matchProfile(entry.normName, profs)
        if (!p) { noMatch.push(entry); continue }
        if (!entry.phone) { noPh.push({ ...entry, profile: p }); continue }
        const oldNorm = normalizePhone(p.phone ?? '')
        if (oldNorm === entry.phone) {
          ok.push({ profile: p, phone: entry.phone, rawName: entry.rawName })
        } else {
          update.push({ profile: p, phone: entry.phone, oldPhone: p.phone || '—', rawName: entry.rawName })
        }
      }

      setToUpdate(update)
      setAlreadyOk(ok)
      setUnmatched(noMatch)
      setNoPhone(noPh)
      setStep('preview')
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    let count = 0
    for (const m of toUpdate) {
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

        {/* ── Upload / chargement ── */}
        {step === 'upload' && (
          <div className="px-5 py-6 flex flex-col items-center gap-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 size={32} className="animate-spin" style={{ color: T.accentBar }} />
                <p className="text-sm" style={{ color: T.textFaint }}>Analyse du fichier…</p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ── Prévisualisation ── */}
        {step === 'preview' && (
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">

            {/* Résumé */}
            {toUpdate.length === 0 && alreadyOk.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#D1FAE5', color: '#065F46' }}>
                <Check size={15} />
                Tout est déjà à jour ({alreadyOk.length} numéro{alreadyOk.length > 1 ? 's' : ''} inchangé{alreadyOk.length > 1 ? 's' : ''})
              </div>
            )}
            {toUpdate.length > 0 && (
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {toUpdate.length} numéro{toUpdate.length > 1 ? 's' : ''} à mettre à jour
              </p>
            )}

            {/* À mettre à jour */}
            {toUpdate.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {toUpdate.map((m, i) => (
                  <div key={i} style={{ background: T.surface, borderColor: T.border }}
                    className="border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                        {formatLastFirst(m.profile.full_name)}
                      </p>
                      <p className="text-xs line-through" style={{ color: T.textFaint }}>{m.oldPhone}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Phone size={12} style={{ color: T.accentBar }} />
                      <span className="text-sm font-mono font-semibold" style={{ color: T.accentBar }}>{m.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Déjà à jour */}
            {alreadyOk.length > 0 && toUpdate.length > 0 && (
              <div>
                <button className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 hover:opacity-70 transition-opacity"
                  style={{ color: '#059669' }}
                  onClick={() => setShowAlreadyOk(v => !v)}>
                  <Check size={12} />
                  {alreadyOk.length} déjà à jour
                  <ChevronDown size={12} style={{ transform: showAlreadyOk ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showAlreadyOk && (
                  <div className="flex flex-col gap-1">
                    {alreadyOk.map((u, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-lg flex items-center justify-between gap-2"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <span>{formatLastFirst(u.profile.full_name)}</span>
                        <span className="font-mono">{u.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sans numéro */}
            {noPhone.length > 0 && (
              <div>
                <button className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 hover:opacity-70 transition-opacity"
                  style={{ color: '#6B7280' }}
                  onClick={() => setShowNoPhone(v => !v)}>
                  <Phone size={12} />
                  {noPhone.length} reconnu{noPhone.length > 1 ? 's' : ''}, sans numéro dans le fichier
                  <ChevronDown size={12} style={{ transform: showNoPhone ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showNoPhone && (
                  <div className="flex flex-col gap-1">
                    {noPhone.map((u, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: '#F3F4F6', color: '#374151' }}>
                        {formatLastFirst(u.profile.full_name)}
                        <span className="ml-1" style={{ color: '#9CA3AF' }}>({u.rawName})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Non reconnus */}
            {unmatched.length > 0 && (
              <div>
                <button className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 hover:opacity-70 transition-opacity"
                  style={{ color: '#B45309' }}
                  onClick={() => setShowUnmatched(v => !v)}>
                  <AlertTriangle size={12} />
                  {unmatched.length} non reconnu{unmatched.length > 1 ? 's' : ''}
                  <ChevronDown size={12} style={{ transform: showUnmatched ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showUnmatched && (
                  <div className="flex flex-col gap-1">
                    {unmatched.map((u, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>
                        {u.rawName}{u.rawPhone ? ` · ${u.rawPhone}` : ' (pas de numéro)'}
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
              <button onClick={handleSave} disabled={saving || toUpdate.length === 0}
                style={{ background: T.accentBar }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                {saving
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Enregistrement…</span>
                  : toUpdate.length === 0 ? 'Rien à modifier' : `Mettre à jour ${toUpdate.length}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Succès ── */}
        {step === 'done' && (
          <div className="px-5 py-10 flex flex-col items-center gap-4">
            <div style={{ background: '#D1FAE5' }}
              className="w-14 h-14 rounded-full flex items-center justify-center">
              <Check size={28} style={{ color: '#059669' }} />
            </div>
            <p className="text-base font-bold" style={{ color: T.text }}>
              {saved} numéro{saved > 1 ? 's' : ''} mis à jour
            </p>
            {alreadyOk.length > 0 && (
              <p className="text-xs text-center" style={{ color: T.textFaint }}>
                {alreadyOk.length} numéro{alreadyOk.length > 1 ? 's' : ''} déjà identique{alreadyOk.length > 1 ? 's' : ''}
              </p>
            )}
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
