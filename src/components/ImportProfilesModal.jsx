import { useState, useRef } from 'react'
import { X, Upload, Users, Check, AlertTriangle, ChevronDown, Plus, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'
import { normalizeName, formatLastFirst } from '../config/constants'

// ─── Mapping grade ────────────────────────────────────────────────────────────
const GRADE_MAP = [
  { keys: ['adjoint', 'ph ', 'praticien', 'phar'],          grade: 'adjoint',       profession: 'medecin' },
  { keys: ['cdc', 'chef de clinique', 'chef clinique'],      grade: 'chef_clinique', profession: 'medecin' },
  { keys: ['interne', 'int.', ' int '],                      grade: 'interne',       profession: 'medecin' },
  { keys: ['consultant', 'cons.'],                           grade: 'consultant',    profession: 'medecin' },
  { keys: ['iade', 'isa', 'infirmier anesthé', 'infirmier anesthe'], grade: 'iade', profession: 'iade'    },
]
const GRADE_LABELS = {
  adjoint:      'Adjoint',
  chef_clinique:'CDC',
  interne:      'Interne',
  consultant:   'Consultant',
  iade:         'ISA',
}

function detectGrade(raw) {
  if (!raw) return null
  const s = raw.toString().toLowerCase().trim()
  for (const { keys, grade, profession } of GRADE_MAP) {
    if (keys.some(k => s.includes(k))) return { grade, profession }
  }
  return null
}

// ─── Détection des colonnes ───────────────────────────────────────────────────
const NAME_KW  = ['nom', 'name', 'prenom', 'prénom', 'medecin', 'médecin', 'docteur', 'personnel']
const GRADE_KW = ['grade', 'statut', 'fonction', 'titre', 'poste']
const PHONE_KW = ['gsm', 'tel', 'téléphone', 'telephone', 'portable', 'mobile', 'phone', 'natel']

function detectCols(headers) {
  const h = headers.map(x => normalizeName(String(x ?? '')).toLowerCase())
  return {
    nameCol:  h.findIndex(x => NAME_KW.some(k => x.includes(k))),
    gradeCol: h.findIndex(x => GRADE_KW.some(k => x.includes(k))),
    phoneCol: h.findIndex(x => PHONE_KW.some(k => x.includes(k))),
  }
}

function normalizePhone(raw) {
  if (!raw) return ''
  return String(raw).replace(/[^\d+]/g, '').replace(/^0(\d{9})$/, '+41$1')
}

// ─── Parse du fichier ─────────────────────────────────────────────────────────
function parseProfileSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // Trouve la ligne d'en-tête (1ère avec >1 cellule non vide)
  let hi = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i].filter(Boolean).length > 1) { hi = i; break }
  }

  const headers = rows[hi].map(String)
  let { nameCol, gradeCol, phoneCol } = detectCols(headers)

  // Fallback : si pas de colonne nom, prendre col 0
  if (nameCol === -1) nameCol = 0

  const results = []
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]
    const rawName  = String(row[nameCol] ?? '').trim()
    const rawGrade = gradeCol !== -1 ? String(row[gradeCol] ?? '').trim() : ''
    const rawPhone = phoneCol !== -1 ? String(row[phoneCol] ?? '').trim() : ''
    if (!rawName || rawName.length < 2) continue

    const gradeInfo = detectGrade(rawGrade) ?? { grade: 'adjoint', profession: 'medecin' }

    results.push({
      rawName,
      normName: normalizeName(rawName),
      rawGrade,
      rawPhone,
      phone:    normalizePhone(rawPhone),
      grade:    gradeInfo.grade,
      profession: gradeInfo.profession,
    })
  }
  return results
}

// ─── Matching (même logique que ImportGSMModal) ───────────────────────────────
function matchExisting(normName, profiles) {
  // Exact
  let p = profiles.find(p => normalizeName(p.full_name) === normName)
  if (p) return p
  // Tous les mots présents (ordre libre)
  const parts = normName.split(' ').filter(w => w.length > 1)
  if (parts.length >= 2) {
    p = profiles.find(p => {
      const pn = normalizeName(p.full_name)
      return parts.every(w => pn.includes(w))
    })
    if (p) return p
  }
  return null
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function ImportProfilesModal({ onClose }) {
  const T = WARM
  const fileRef = useRef(null)
  const [step, setStep]           = useState('upload')
  const [profiles, setProfiles]   = useState([])
  const [toCreate,      setToCreate]      = useState([])
  const [toUpdate,      setToUpdate]      = useState([])
  const [alreadyOk,     setAlreadyOk]     = useState([])  // reconnus mais déjà à jour
  const [unmatched,     setUnmatched]     = useState([])  // noms non trouvés en DB
  const [noGradeCol,    setNoGradeCol]    = useState(false) // colonne grade absente du fichier
  const [saving,        setSaving]        = useState(false)
  const [done,          setDone]          = useState({ created: 0, updated: 0 })
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [showOk,        setShowOk]        = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]

    // Détecter si colonne grade présente
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const hi = rows.findIndex((r, i) => i < 5 && r.filter(Boolean).length > 1) || 0
    const { gradeCol } = detectCols(rows[hi]?.map(String) ?? [])
    setNoGradeCol(gradeCol === -1)

    const entries = parseProfileSheet(ws)

    const { data } = await supabase.from('profiles').select('*')
    const existing = data ?? []
    setProfiles(existing)

    const creates = [], updates = [], ok = [], nomatch = []

    for (const entry of entries) {
      const found = matchExisting(entry.normName, existing)

      if (found) {
        // Détermine ce qui a changé
        const phoneChanged  = entry.phone && found.phone !== entry.phone
        const gradeChanged  = gradeCol !== -1 && found.grade !== entry.grade
        if (phoneChanged || gradeChanged) {
          updates.push({
            profile: found,
            grade:   gradeCol !== -1 ? entry.grade : found.grade,
            profession: gradeCol !== -1 ? entry.profession : found.profession,
            phone:   entry.phone || found.phone,
            rawName: entry.rawName,
            phoneChanged, gradeChanged,
            oldGrade: found.grade, newGrade: entry.grade,
          })
        } else {
          ok.push(entry.rawName)
        }
      } else {
        // Nouveau : créer seulement si grade détecté OU grade column absente (on crée avec défaut)
        creates.push({ rawName: entry.rawName, grade: entry.grade, profession: entry.profession, phone: entry.phone })
      }
    }

    setToCreate(creates)
    setToUpdate(updates)
    setAlreadyOk(ok)
    setUnmatched(nomatch)
    setStep('preview')
  }

  async function handleSave() {
    setSaving(true)
    let created = 0, updated = 0

    for (const p of toCreate) {
      const { error } = await supabase.from('profiles').insert({
        full_name:  p.rawName,
        grade:      p.grade,
        profession: p.profession,
        phone:      p.phone || null,
      })
      if (!error) created++
    }

    for (const u of toUpdate) {
      const patch = { grade: u.grade, profession: u.profession }
      if (u.phone) patch.phone = u.phone
      await supabase.from('profiles').update(patch).eq('id', u.profile.id)
      updated++
    }

    setDone({ created, updated })
    setSaving(false)
    setStep('done')
  }

  const totalChanges = toCreate.length + toUpdate.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div style={{ background: T.cardHead, borderColor: T.border }}
          className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={17} style={{ color: T.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: T.text }}>Import profils</h2>
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
                Glisser ou choisir la liste du personnel
              </p>
              <p className="text-xs text-center" style={{ color: T.textFaint }}>
                .xlsx, .xls ou .csv · colonnes Nom + Grade + GSM
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Prévisualisation */}
        {step === 'preview' && (
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">

            {/* Avertissement : pas de colonne grade */}
            {noGradeCol && (
              <div className="text-xs px-3 py-2 rounded-lg flex items-start gap-2"
                style={{ background: '#FEF9C3', color: '#854D0E' }}>
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Colonne "grade" non détectée — les nouvelles personnes seront ajoutées comme <strong>Adjoint</strong> par défaut.</span>
              </div>
            )}

            {/* Nouvelles personnes */}
            {toCreate.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  style={{ color: '#059669' }}>
                  <Plus size={12} />
                  {toCreate.length} nouvelle{toCreate.length > 1 ? 's' : ''} personne{toCreate.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-col gap-1.5">
                  {toCreate.map((p, i) => (
                    <div key={i} style={{ background: '#F0FFF4', borderColor: '#86EFAC' }}
                      className="border rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#065F46' }}>{p.rawName}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        {GRADE_LABELS[p.grade]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mises à jour */}
            {toUpdate.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  style={{ color: T.accentBar }}>
                  <RefreshCw size={12} />
                  {toUpdate.length} mise{toUpdate.length > 1 ? 's' : ''} à jour
                </p>
                <div className="flex flex-col gap-1.5">
                  {toUpdate.map((u, i) => (
                    <div key={i} style={{ background: T.surface, borderColor: T.border }}
                      className="border rounded-xl px-3 py-2 flex flex-col gap-1">
                      <p className="text-sm font-semibold" style={{ color: T.text }}>
                        {formatLastFirst(u.profile.full_name)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {u.gradeChanged && (
                          <span className="text-xs" style={{ color: T.textFaint }}>
                            Grade : <span className="line-through">{GRADE_LABELS[u.oldGrade]}</span> → <strong>{GRADE_LABELS[u.newGrade]}</strong>
                          </span>
                        )}
                        {u.phoneChanged && (
                          <span className="text-xs" style={{ color: T.textFaint }}>
                            GSM : <strong>{u.phone}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Déjà à jour */}
            {alreadyOk.length > 0 && (
              <button className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: T.textFaint }}
                onClick={() => setShowOk(v => !v)}>
                <Check size={12} />
                {alreadyOk.length} déjà à jour
                <ChevronDown size={12} style={{ transform: showOk ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
            )}
            {showOk && (
              <div className="flex flex-col gap-1 -mt-1">
                {alreadyOk.map((n, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: T.surface, color: T.textFaint }}>{n}</div>
                ))}
              </div>
            )}

            {toCreate.length === 0 && toUpdate.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: T.textFaint }}>
                {alreadyOk.length > 0
                  ? `Tout est déjà à jour (${alreadyOk.length} personne${alreadyOk.length > 1 ? 's' : ''} reconnue${alreadyOk.length > 1 ? 's' : ''}).`
                  : 'Aucun nom reconnu — vérifier le format du fichier.'}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('upload')}
                style={{ borderColor: T.border, color: T.textSub }}
                className="flex-1 border rounded-xl py-2.5 text-sm font-semibold hover:opacity-70 transition-opacity">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || (toCreate.length + toUpdate.length) === 0}
                style={{ background: T.accentBar }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                {saving ? 'Enregistrement…' : `Appliquer (${toCreate.length + toUpdate.length})`}
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
            <p className="text-base font-bold text-center" style={{ color: T.text }}>
              {done.created > 0 && `${done.created} personne${done.created > 1 ? 's' : ''} ajoutée${done.created > 1 ? 's' : ''}`}
              {done.created > 0 && done.updated > 0 && ' · '}
              {done.updated > 0 && `${done.updated} mise${done.updated > 1 ? 's' : ''} à jour`}
            </p>
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
