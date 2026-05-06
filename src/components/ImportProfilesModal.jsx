import { useState, useRef } from 'react'
import { X, Upload, Users, Check, AlertTriangle, ChevronDown, Plus, RefreshCw, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'
import { normalizeName, formatLastFirst } from '../config/constants'

// ─── Mapping grade ────────────────────────────────────────────────────────────
const GRADE_MAP = [
  { keys: ['adjoint', 'ph ', ' ph,', 'praticien', 'phar'],      grade: 'adjoint',       profession: 'medecin' },
  { keys: ['cdc', 'chef de clinique', 'chef clinique'],          grade: 'chef_clinique', profession: 'medecin' },
  { keys: ['interne', 'int.', ' int '],                          grade: 'interne',       profession: 'medecin' },
  { keys: ['consultant', 'cons.'],                               grade: 'consultant',    profession: 'medecin' },
  { keys: ['iade', 'isa', 'infirmier anesthé', 'infirmier anesthe'], grade: 'iade',     profession: 'iade'    },
]
const GRADE_LABELS = {
  adjoint:       'Adjoint/PH',
  chef_clinique: 'CDC',
  interne:       'Interne',
  consultant:    'Consultant',
  iade:          'ISA/IADE',
}

function detectGrade(raw) {
  if (!raw) return null
  const s = ` ${raw.toString().toLowerCase().trim()} `
  for (const { keys, grade, profession } of GRADE_MAP) {
    if (keys.some(k => s.includes(k))) return { grade, profession }
  }
  return null
}

// ─── Détection des colonnes ───────────────────────────────────────────────────
const NAME_KW  = ['nom', 'name', 'prenom', 'prénom', 'medecin', 'médecin', 'docteur', 'personnel', 'fullname']
const GRADE_KW = ['grade', 'statut', 'fonction', 'titre', 'poste', 'rang', 'role', 'categorie']
const PHONE_KW = ['gsm', 'tel', 'téléphone', 'telephone', 'portable', 'mobile', 'phone', 'natel', 'numero']

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

function cleanName(raw) {
  if (!raw) return ''
  return raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\b\d{1,2}[h:]\d{0,2}\s*[-–]\s*\d{1,2}[h:]\d{0,2}\b/gi, '')
    .replace(/\b\d{1,2}[h:]\d{0,2}\b/gi, '')
    .replace(/\b(AM|PM)\.?\b/gi, '')
    .replace(/[-,;]+$/, '')
    .replace(/\s+/g, ' ').trim()
}

// ─── Parse du fichier ─────────────────────────────────────────────────────────
function parseProfileSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 1) return { entries: [], headers: [], detected: { nameCol: -1, gradeCol: -1, phoneCol: -1 } }

  // Cherche la ligne d'en-tête (1ère avec >1 cellule non vide)
  let hi = 0
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    if (rows[i].filter(Boolean).length > 1) { hi = i; break }
  }

  const rawHeaders = rows[hi].map(String)
  const detected = detectCols(rawHeaders)
  let { nameCol, gradeCol, phoneCol } = detected

  // Fallback : si pas de colonne nom, prendre col 0
  if (nameCol === -1) nameCol = 0

  const entries = []
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]
    const rawName  = cleanName(String(row[nameCol] ?? '').trim())
    const rawGrade = gradeCol !== -1 ? String(row[gradeCol] ?? '').trim() : ''
    const rawPhone = phoneCol !== -1 ? String(row[phoneCol] ?? '').trim() : ''
    if (!rawName || rawName.length < 2) continue

    const gradeInfo = detectGrade(rawGrade) ?? { grade: 'adjoint', profession: 'medecin' }

    entries.push({
      rawName,
      normName: normalizeName(rawName),
      rawGrade,
      rawPhone,
      phone:    normalizePhone(rawPhone),
      grade:    gradeInfo.grade,
      profession: gradeInfo.profession,
    })
  }
  return { entries, headers: rawHeaders, detected }
}

// ─── Matching (exact + mots dans n'importe quel ordre) ───────────────────────
function matchExisting(normName, profiles) {
  let p = profiles.find(p => normalizeName(p.full_name) === normName)
  if (p) return p
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

// ─── Sous-composant liste pliable ─────────────────────────────────────────────
function CollapsibleSection({ color, icon: Icon, label, items, renderItem, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)
  const MAX = 10
  const visible = showAll ? items : items.slice(0, MAX)

  return (
    <div>
      <button
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2 hover:opacity-70 transition-opacity"
        style={{ color }}
        onClick={() => setOpen(v => !v)}>
        <Icon size={12} />
        {label}
        <ChevronDown size={12}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginLeft: 'auto' }} />
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 mb-1">
          {visible.map((item, i) => renderItem(item, i))}
          {!showAll && items.length > MAX && (
            <button className="text-xs text-center py-1 hover:opacity-70"
              style={{ color }}
              onClick={() => setShowAll(true)}>
              + {items.length - MAX} autres…
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function ImportProfilesModal({ onClose }) {
  const T = WARM
  const fileRef = useRef(null)
  const [step, setStep]         = useState('upload')
  const [loading, setLoading]   = useState(false)
  const [parseInfo, setParseInfo] = useState(null) // { headers, detected }
  const [toCreate, setToCreate] = useState([])
  const [toUpdate, setToUpdate] = useState([])
  const [alreadyOk, setAlreadyOk] = useState([])
  const [noGradeCol, setNoGradeCol] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveResult, setSaveResult] = useState(null) // { created, updated, errors }
  const [showOk, setShowOk]     = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)

    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const { entries, headers, detected } = parseProfileSheet(ws)

      setParseInfo({ headers, detected })
      setNoGradeCol(detected.gradeCol === -1)

      const { data, error: dbErr } = await supabase.from('profiles').select('*')
      if (dbErr) throw new Error(`Erreur base de données: ${dbErr.message}`)
      const existing = data ?? []

      const creates = [], updates = [], ok = []

      for (const entry of entries) {
        const found = matchExisting(entry.normName, existing)
        if (found) {
          const phoneChanged = entry.phone && normalizePhone(found.phone ?? '') !== entry.phone
          const gradeChanged = detected.gradeCol !== -1 && found.grade !== entry.grade
          if (phoneChanged || gradeChanged) {
            updates.push({
              profile: found,
              grade:       detected.gradeCol !== -1 ? entry.grade : found.grade,
              profession:  detected.gradeCol !== -1 ? entry.profession : found.profession,
              phone:       entry.phone || found.phone,
              rawName:     entry.rawName,
              phoneChanged, gradeChanged,
              oldGrade: found.grade, newGrade: entry.grade,
            })
          } else {
            ok.push(entry.rawName)
          }
        } else {
          creates.push({
            rawName:    entry.rawName,
            grade:      entry.grade,
            profession: entry.profession,
            phone:      entry.phone,
          })
        }
      }

      setToCreate(creates)
      setToUpdate(updates)
      setAlreadyOk(ok)
      setStep('preview')
    } catch (err) {
      alert(`Erreur lors du traitement du fichier:\n${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    let created = 0, updated = 0
    const errors = []

    // ── Mises à jour (UPDATE) ──────────────────────────────────────────────
    for (const u of toUpdate) {
      const patch = {}
      if (u.gradeChanged) { patch.grade = u.grade; patch.profession = u.profession }
      if (u.phoneChanged) patch.phone = u.phone
      const { error } = await supabase.from('profiles').update(patch).eq('id', u.profile.id)
      if (error) errors.push(`Mise à jour ${u.rawName}: ${error.message}`)
      else updated++
    }

    // ── Nouvelles personnes (INSERT) ───────────────────────────────────────
    // Note : l'id est généré automatiquement par la base si DEFAULT gen_random_uuid()
    // Sinon, l'insert échouera car id référence auth.users
    for (const p of toCreate) {
      const payload = {
        full_name:  p.rawName,
        grade:      p.grade,
        profession: p.profession,
      }
      if (p.phone) payload.phone = p.phone
      const { error } = await supabase.from('profiles').insert(payload)
      if (error) {
        // Si l'erreur indique que id est requis (FK vers auth.users),
        // on le signale clairement
        if (error.message.includes('null value') || error.message.includes('foreign key') || error.code === '23502' || error.code === '23503') {
          errors.push(`Impossible d'ajouter ${p.rawName} : le profil nécessite un compte utilisateur dans Supabase Auth. Créez d'abord le compte dans le dashboard Supabase, puis réimportez.`)
        } else {
          errors.push(`Ajout ${p.rawName}: ${error.message}`)
        }
      } else {
        created++
      }
    }

    setSaveResult({ created, updated, errors })
    setSaving(false)
    setStep('done')
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

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

        {/* ── Upload ── */}
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
                    Glisser ou choisir la liste du personnel
                  </p>
                  <p className="text-xs text-center" style={{ color: T.textFaint }}>
                    .xlsx, .xls ou .csv · colonnes Nom + Grade + GSM
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
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">

            {/* Colonnes détectées */}
            {parseInfo && (
              <div className="text-xs px-3 py-2 rounded-lg flex flex-col gap-0.5"
                style={{ background: T.surface, color: T.textFaint }}>
                <span className="font-semibold" style={{ color: T.textSub }}>Colonnes détectées :</span>
                <span>Nom : {parseInfo.detected.nameCol >= 0 ? `"${parseInfo.headers[parseInfo.detected.nameCol]}"` : '⚠ non trouvée (col. 1 utilisée)'}</span>
                <span>Grade : {parseInfo.detected.gradeCol >= 0 ? `"${parseInfo.headers[parseInfo.detected.gradeCol]}"` : '⚠ non trouvée'}</span>
                <span>GSM : {parseInfo.detected.phoneCol >= 0 ? `"${parseInfo.headers[parseInfo.detected.phoneCol]}"` : '— non trouvée'}</span>
              </div>
            )}

            {/* Avertissement : pas de colonne grade */}
            {noGradeCol && (
              <div className="text-xs px-3 py-2 rounded-lg flex items-start gap-2"
                style={{ background: '#FEF9C3', color: '#854D0E' }}>
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Colonne "grade" non détectée — les nouvelles personnes seront ajoutées comme <strong>Adjoint/PH</strong> par défaut.</span>
              </div>
            )}

            {/* Cas : rien détecté du tout */}
            {toCreate.length === 0 && toUpdate.length === 0 && alreadyOk.length === 0 && (
              <div className="text-sm text-center py-6" style={{ color: T.textFaint }}>
                Aucun nom reconnu dans le fichier.<br />
                <span className="text-xs">Vérifiez que la première ligne contient les en-têtes (Nom, Grade…)</span>
              </div>
            )}

            {/* Nouvelles personnes */}
            {toCreate.length > 0 && (
              <CollapsibleSection
                color="#059669"
                icon={Plus}
                label={`${toCreate.length} nouvelle${toCreate.length > 1 ? 's' : ''} personne${toCreate.length > 1 ? 's' : ''}`}
                items={toCreate}
                defaultOpen={true}
                renderItem={(p, i) => (
                  <div key={i} style={{ background: '#F0FFF4', borderColor: '#86EFAC' }}
                    className="border rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold flex-1 min-w-0 truncate" style={{ color: '#065F46' }}>{p.rawName}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        {GRADE_LABELS[p.grade] ?? p.grade}
                      </span>
                      {p.phone && <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{p.phone}</span>}
                    </div>
                  </div>
                )}
              />
            )}

            {/* Mises à jour */}
            {toUpdate.length > 0 && (
              <CollapsibleSection
                color={T.accentBar}
                icon={RefreshCw}
                label={`${toUpdate.length} mise${toUpdate.length > 1 ? 's' : ''} à jour`}
                items={toUpdate}
                defaultOpen={true}
                renderItem={(u, i) => (
                  <div key={i} style={{ background: T.surface, borderColor: T.border }}
                    className="border rounded-xl px-3 py-2 flex flex-col gap-1">
                    <p className="text-sm font-semibold" style={{ color: T.text }}>
                      {formatLastFirst(u.profile.full_name)}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {u.gradeChanged && (
                        <span className="text-xs" style={{ color: T.textFaint }}>
                          Grade : <span className="line-through">{GRADE_LABELS[u.oldGrade] ?? u.oldGrade}</span> → <strong>{GRADE_LABELS[u.newGrade] ?? u.newGrade}</strong>
                        </span>
                      )}
                      {u.phoneChanged && (
                        <span className="text-xs" style={{ color: T.textFaint }}>
                          GSM : <strong>{u.phone}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              />
            )}

            {/* Déjà à jour */}
            {alreadyOk.length > 0 && (
              <div>
                <button className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: T.textFaint }}
                  onClick={() => setShowOk(v => !v)}>
                  <Check size={12} />
                  {alreadyOk.length} déjà à jour
                  <ChevronDown size={12} style={{ transform: showOk ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {showOk && (
                  <div className="flex flex-col gap-1 mt-1.5">
                    {alreadyOk.slice(0, 20).map((n, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: T.surface, color: T.textFaint }}>{n}</div>
                    ))}
                    {alreadyOk.length > 20 && (
                      <div className="text-xs px-2 py-1" style={{ color: T.textFaint }}>
                        … et {alreadyOk.length - 20} autres
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message "tout à jour" */}
            {toCreate.length === 0 && toUpdate.length === 0 && alreadyOk.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#D1FAE5', color: '#065F46' }}>
                <Check size={15} />
                Tout est déjà à jour ({alreadyOk.length} personne{alreadyOk.length > 1 ? 's' : ''} reconnue{alreadyOk.length > 1 ? 's' : ''})
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setStep('upload'); fileRef.current && (fileRef.current.value = '') }}
                style={{ borderColor: T.border, color: T.textSub }}
                className="flex-1 border rounded-xl py-2.5 text-sm font-semibold hover:opacity-70 transition-opacity">
                Annuler
              </button>
              <button onClick={handleSave}
                disabled={saving || (toCreate.length + toUpdate.length) === 0}
                style={{ background: T.accentBar }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                {saving
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Enregistrement…</span>
                  : (toCreate.length + toUpdate.length) === 0
                    ? 'Rien à modifier'
                    : `Appliquer (${toCreate.length + toUpdate.length})`}
              </button>
            </div>
          </div>
        )}

        {/* ── Résultat ── */}
        {step === 'done' && saveResult && (
          <div className="px-5 py-8 flex flex-col items-center gap-4 max-h-[75vh] overflow-y-auto">
            <div style={{ background: saveResult.errors.length > 0 ? '#FEF9C3' : '#D1FAE5' }}
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0">
              {saveResult.errors.length > 0
                ? <AlertTriangle size={28} style={{ color: '#B45309' }} />
                : <Check size={28} style={{ color: '#059669' }} />}
            </div>

            {/* Résumé */}
            <div className="text-center">
              {saveResult.created > 0 && (
                <p className="text-base font-bold" style={{ color: T.text }}>
                  {saveResult.created} personne{saveResult.created > 1 ? 's' : ''} ajoutée{saveResult.created > 1 ? 's' : ''}
                </p>
              )}
              {saveResult.updated > 0 && (
                <p className="text-base font-bold" style={{ color: T.text }}>
                  {saveResult.updated} mise{saveResult.updated > 1 ? 's' : ''} à jour
                </p>
              )}
              {saveResult.created === 0 && saveResult.updated === 0 && saveResult.errors.length === 0 && (
                <p className="text-base font-bold" style={{ color: T.text }}>Aucune modification</p>
              )}
            </div>

            {/* Erreurs */}
            {saveResult.errors.length > 0 && (
              <div className="w-full flex flex-col gap-1.5">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B45309' }}>
                  {saveResult.errors.length} erreur{saveResult.errors.length > 1 ? 's' : ''}
                </p>
                {saveResult.errors.map((err, i) => (
                  <div key={i} className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#FEF3C7', color: '#92400E' }}>
                    {err}
                  </div>
                ))}
                {saveResult.errors.some(e => e.includes('Supabase Auth')) && (
                  <p className="text-xs mt-1" style={{ color: T.textFaint }}>
                    💡 Pour ajouter de nouvelles personnes, créez d'abord leur compte dans le dashboard Supabase (Authentication → Users), puis réimportez.
                  </p>
                )}
              </div>
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
