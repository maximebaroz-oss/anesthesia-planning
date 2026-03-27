import { useState, useRef } from 'react'
import { X, Upload, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const WARM = {
  cardBg: '#F5F3F0', cardHead: '#EAE7E2', border: '#CEC8BF',
  surface: '#E2DED8', accent: '#6B5C48', accentBar: '#8A7560',
  text: '#2A2318', textSub: '#6B5F52', textFaint: '#9E9489',
}

// HB row index (0-based) → { roomId, label }
const HB_ROWS = [
  { rowIdx: 1, type: 'supervisor', label: 'Superviseur HB', roomId: null },
  { rowIdx: 2, type: 'assignment', label: 'Tardif',         roomId: 8 },
  { rowIdx: 3, type: 'assignment', label: 'Gastro 4',       roomId: 1 },
  { rowIdx: 4, type: 'assignment', label: 'Broncho 7',      roomId: 3 },
  { rowIdx: 5, type: 'assignment', label: 'Radio 11',       roomId: 4 },
  { rowIdx: 6, type: 'assignment', label: 'Radio 12',       roomId: 5 },
  { rowIdx: 7, type: 'assignment', label: 'Cardio 17',      roomId: 7 },
]

function matchProfile(excelName, profiles) {
  if (!excelName || typeof excelName !== 'string') return null
  const name = excelName.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!name) return null
  return profiles.find(p => {
    if (p.profession !== 'medecin') return false
    const up = p.full_name.toUpperCase()
    const parts = up.split(' ')
    if (parts[parts.length - 1] === name) return true
    if (parts.length >= 2 && parts.slice(-2).join(' ') === name) return true
    if (parts.length >= 3 && parts.slice(-3).join(' ') === name) return true
    if (up.includes(name)) return true
    return false
  }) ?? null
}

function parseDateFromHeader(header, year) {
  if (!header || typeof header !== 'string') return null
  const match = header.match(/(\d+)\.(\d+)/)
  if (!match) return null
  const day = parseInt(match[1])
  const month = parseInt(match[2])
  const now = new Date()
  let y = year
  if (month < now.getMonth() + 1 - 1) y = year + 1
  const d = new Date(y, month - 1, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Parse a DU cell like "Urg Viscérale 19H", "Uro 17h", "Viscérale", "Gyneco"
function parseDUCell(text) {
  const str = text.trim()
  const timeMatch = str.match(/(\d{1,2})\s*[Hh]/i)
  const closingTime = timeMatch ? `${String(parseInt(timeMatch[1])).padStart(2, '0')}:00` : null
  const activity = str.replace(/\s*\d{1,2}\s*[Hh]\s*/i, '').trim() || str
  // Normalize case: first letter uppercase, rest lowercase
  const activityNorm = activity.charAt(0).toUpperCase() + activity.slice(1).toLowerCase()
  return { activity: activityNorm, closingTime }
}

function parseHBSheet(rows, profiles) {
  const headerRow = rows[0] ?? []
  const year = new Date().getFullYear()
  const days = [1, 2, 3, 4, 5].map(colIdx => ({
    colIdx,
    header: String(headerRow[colIdx] ?? ''),
    date: parseDateFromHeader(String(headerRow[colIdx] ?? ''), year),
  })).filter(d => d.date)
  if (days.length === 0) return null

  const entries = []
  for (const day of days) {
    for (const { rowIdx, type, label, roomId } of HB_ROWS) {
      const raw = String(rows[rowIdx]?.[day.colIdx] ?? '').trim()
      if (!raw) continue
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: label, excelName: raw,
        profile: matchProfile(raw, profiles),
        type, roomId,
      })
    }
  }
  return { entries, weekLabel: String(headerRow[0] ?? '') }
}

// Vérifie si la cellule a un fond noir (= salle fermée dans le fichier Julliard)
function isCellBlack(ws, colIdx, rowIdx) {
  const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
  const cell = ws[cellRef]
  if (!cell?.s) return false
  const fill = cell.s.fill ?? cell.s.fgColor
  if (!fill) return false
  const rgb = fill.fgColor?.rgb ?? fill.bgColor?.rgb ?? fill.rgb
  if (!rgb || rgb.length < 6) return false
  const r = parseInt(rgb.slice(-6, -4), 16)
  const g = parseInt(rgb.slice(-4, -2), 16)
  const b = parseInt(rgb.slice(-2), 16)
  return r < 40 && g < 40 && b < 40
}

function parseDUSheet(ws, rows, profiles) {
  const headerRow = rows[0] ?? []
  const year = new Date().getFullYear()
  const days = [1, 2, 3, 4, 5].map(colIdx => ({
    colIdx,
    header: String(headerRow[colIdx] ?? ''),
    date: parseDateFromHeader(String(headerRow[colIdx] ?? ''), year),
  })).filter(d => d.date)
  if (days.length === 0) return null

  const entries = []

  // Row 2 (idx 1) = Julliard supervisor
  const supRow = rows[1] ?? []
  for (const day of days) {
    const raw = String(supRow[day.colIdx] ?? '').trim()
    if (!raw) continue
    entries.push({
      date: day.date, dayLabel: day.header,
      rowLabel: 'Superviseur Julliard', excelName: raw,
      profile: matchProfile(raw, profiles),
      type: 'supervisor', roomId: null,
    })
  }

  // Room schedule rows — salles 10-14 uniquement (salle 9 = VVC, ignorée)
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    const roomId = parseInt(String(row[0] ?? '').trim())
    if (isNaN(roomId) || roomId < 10 || roomId > 14) continue
    for (const day of days) {
      const cell = String(row[day.colIdx] ?? '').trim()
      const black = isCellBlack(ws, day.colIdx, rowIdx)
      if (!cell || black) {
        // Cellule vide ou noire = salle fermée ce jour
        entries.push({
          date: day.date, dayLabel: day.header,
          rowLabel: `Salle ${roomId}`, excelName: black ? '⬛ fermée' : '—',
          type: 'closure', roomId,
          activity: null, closingTime: null, profile: null,
        })
      } else {
        const { activity, closingTime } = parseDUCell(cell)
        entries.push({
          date: day.date, dayLabel: day.header,
          rowLabel: `Salle ${roomId}`, excelName: cell,
          type: 'schedule', roomId,
          activity, closingTime,
          profile: null,
        })
      }
    }
  }

  return { entries, weekLabel: String(headerRow[0] ?? '') }
}

export default function ImportPlanningModal({ profiles, unit, onClose, onImported }) {
  const { profile: currentProfile } = useAuth()
  const [step, setStep] = useState('upload')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const inputRef = useRef(null)

  const isJulliard = unit?.id === 'julliard'
  const unitLabel = isJulliard ? 'Julliard' : 'HB'
  const sheetName = isJulliard ? 'DU' : 'HB'

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellStyles: true })

      const targetSheet = wb.SheetNames.find(n => n.toUpperCase() === sheetName)
        ?? wb.SheetNames.find(n => n.toUpperCase().includes(sheetName))
      if (!targetSheet) {
        setError(`Onglet "${sheetName}" introuvable dans ce fichier.`)
        return
      }

      const ws = wb.Sheets[targetSheet]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      const result = isJulliard
        ? parseDUSheet(ws, rows, profiles)
        : parseHBSheet(rows, profiles)

      if (!result) {
        setError(`Impossible de lire les dates dans l'onglet ${sheetName}.`)
        return
      }

      setPreview(result)
      setStep('preview')
    } catch (err) {
      setError('Erreur lecture fichier : ' + err.message)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setStep('importing')
    const errors = []

    // 1. Fermetures en premier (priorité max)
    for (const entry of preview.entries.filter(e => e.type === 'closure')) {
      if (!entry.date || !entry.roomId) continue
      try {
        const { data: existing } = await supabase.from('room_closures').select('id')
          .eq('room_id', entry.roomId).eq('date', entry.date).maybeSingle()
        if (!existing) {
          const { error } = await supabase.from('room_closures').insert({
            room_id: entry.roomId, date: entry.date, closed_by: currentProfile?.id,
          })
          if (error) errors.push(`Fermeture salle ${entry.roomId} ${entry.date}: ${error.message}`)
        }
      } catch (e) { errors.push(e.message) }
    }

    // 2. Superviseurs
    for (const entry of preview.entries.filter(e => e.type === 'supervisor')) {
      if (!entry.date || !entry.profile) continue
      try {
        const { error } = await supabase.from('supervisors').upsert(
          { date: entry.date, unit_id: unit?.id ?? 'hors-bloc', user_id: entry.profile.id, assigned_by: currentProfile?.id },
          { onConflict: 'date,unit_id' }
        )
        if (error) errors.push(`Superviseur ${entry.date}: ${error.message}`)
      } catch (e) { errors.push(e.message) }
    }

    // 3. Affectations (HB)
    for (const entry of preview.entries.filter(e => e.type === 'assignment')) {
      if (!entry.date || !entry.profile || !entry.roomId) continue
      try {
        const { data: existing } = await supabase.from('assignments').select('id')
          .eq('user_id', entry.profile.id).eq('room_id', entry.roomId).eq('date', entry.date)
          .maybeSingle()
        if (!existing) {
          const { error } = await supabase.from('assignments').insert({
            user_id: entry.profile.id, room_id: entry.roomId,
            date: entry.date, assigned_by: currentProfile?.id,
          })
          if (error) errors.push(`Affectation: ${error.message}`)
        }
      } catch (e) { errors.push(e.message) }
    }

    // 4. Horaires salles (avec activity si disponible)
    for (const entry of preview.entries.filter(e => e.type === 'schedule')) {
      if (!entry.date || !entry.roomId) continue
      try {
        // Essai avec activity
        const payload = { room_id: entry.roomId, date: entry.date, opening_time: '07:00', closing_time: entry.closingTime ?? null, activity: entry.activity }
        const { error } = await supabase.from('room_schedules').upsert(payload, { onConflict: 'room_id,date' })
        if (error) {
          // Retry sans activity si colonne absente
          const payloadFallback = { room_id: entry.roomId, date: entry.date, opening_time: '07:00', closing_time: entry.closingTime ?? null }
          const { error: err2 } = await supabase.from('room_schedules').upsert(payloadFallback, { onConflict: 'room_id,date' })
          if (err2) errors.push(`Horaire salle ${entry.roomId}: ${err2.message}`)
        }
      } catch (e) { errors.push(e.message) }
    }

    setImportErrors(errors)
    setStep('done')
    if (errors.length === 0) onImported?.()
  }

  const personEntries   = preview?.entries.filter(e => e.type !== 'schedule' && e.type !== 'closure') ?? []
  const scheduleEntries = preview?.entries.filter(e => e.type === 'schedule') ?? []
  const closureEntries  = preview?.entries.filter(e => e.type === 'closure') ?? []
  const matchedCount    = personEntries.filter(e => e.profile).length
  const unmatchedCount  = personEntries.filter(e => e.excelName && !e.profile).length
  const dates = preview ? [...new Set(preview.entries.map(e => e.date))] : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: WARM.cardBg, borderColor: WARM.border }}
        className="border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div style={{ background: WARM.cardHead, borderColor: WARM.border }}
          className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} style={{ color: WARM.accentBar }} />
            <span className="font-bold text-sm" style={{ color: WARM.text }}>Import planning {unitLabel}</span>
            {preview && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: WARM.surface, color: WARM.textSub }}>
                {preview.weekLabel}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: WARM.textFaint }} className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* STEP: upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div style={{ background: WARM.surface, borderColor: WARM.border }}
                className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center">
                <Upload size={32} style={{ color: WARM.accentBar }} />
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: WARM.text }}>Sélectionner le planning Excel</p>
                <p className="text-sm mt-1" style={{ color: WARM.textFaint }}>
                  Fichier .xlsx avec un onglet «&nbsp;{sheetName}&nbsp;»
                </p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              <button onClick={() => inputRef.current?.click()}
                style={{ background: WARM.accentBar }}
                className="text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
                <Upload size={15} /> Choisir un fichier
              </button>
              {error && <p className="text-red-500 text-sm text-center max-w-sm">{error}</p>}
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && preview && (
            <div className="space-y-5">
              {/* Summary bar */}
              <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: WARM.surface }}>
                {matchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold" style={{ color: WARM.text }}>{matchedCount} médecin(s)</span>
                  </div>
                )}
                {unmatchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span className="text-sm text-amber-600">{unmatchedCount} non trouvé(s)</span>
                  </div>
                )}
                {scheduleEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm font-semibold" style={{ color: WARM.text }}>{scheduleEntries.length} horaire(s)</span>
                  </div>
                )}
                {closureEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm font-semibold" style={{ color: WARM.text }}>{closureEntries.length} fermeture(s)</span>
                  </div>
                )}
                <span className="text-xs ml-auto" style={{ color: WARM.textFaint }}>{dates.length} jour(s)</span>
              </div>

              {/* Per-day tables */}
              <div className="space-y-4">
                {dates.map(date => {
                  const dayPerson  = personEntries.filter(e => e.date === date)
                  const daySched   = scheduleEntries.filter(e => e.date === date)
                  const dayClose   = closureEntries.filter(e => e.date === date)
                  const allDay     = [...dayPerson, ...daySched, ...dayClose]
                  const label     = allDay[0]?.dayLabel ?? date
                  return (
                    <div key={date}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-0.5"
                        style={{ color: WARM.accent }}>{label}</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: WARM.border }}>
                        {allDay.map((entry, i) => (
                          <div key={i}
                            style={{
                              borderColor: WARM.border,
                              background: i % 2 === 0 ? WARM.cardBg : WARM.surface,
                            }}
                            className={`flex items-center gap-3 px-3 py-2 text-xs ${i > 0 ? 'border-t' : ''}`}>
                            <span className="w-24 flex-shrink-0 font-medium" style={{ color: WARM.textFaint }}>
                              {entry.rowLabel}
                            </span>
                            <span className="w-28 flex-shrink-0 font-mono" style={{ color: WARM.textSub }}>
                              {entry.excelName}
                            </span>
                            <span style={{ color: WARM.textFaint }} className="flex-shrink-0">→</span>
                            {entry.type === 'closure' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-red-500 font-medium">Salle fermée</span>
                              </div>
                            ) : entry.type === 'schedule' ? (
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                                <span style={{ color: WARM.text }}>
                                  {entry.activity}
                                  {entry.closingTime && (
                                    <span style={{ color: WARM.textFaint }}> · ferme {entry.closingTime}</span>
                                  )}
                                </span>
                              </div>
                            ) : entry.profile ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="font-medium" style={{ color: WARM.text }}>
                                  Dr. {entry.profile.full_name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />
                                <span className="text-amber-600 italic">Introuvable en base</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </div>
          )}

          {/* STEP: importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{ borderColor: WARM.surface, borderTopColor: WARM.accentBar }} />
              <p className="text-sm" style={{ color: WARM.textSub }}>Import en cours...</p>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              {importErrors.length === 0 ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
                    <Check size={28} className="text-green-600" />
                  </div>
                  <p className="font-semibold" style={{ color: WARM.text }}>Import terminé !</p>
                  <p className="text-sm" style={{ color: WARM.textSub }}>
                    {matchedCount > 0 && `${matchedCount} affectation(s)`}
                    {matchedCount > 0 && scheduleEntries.length > 0 && ' · '}
                    {scheduleEntries.length > 0 && `${scheduleEntries.length} horaire(s)`}
                    {' '}importé(s) sur {dates.length} jour(s).
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-600" />
                  </div>
                  <p className="font-semibold text-red-600">{importErrors.length} erreur(s) durant l'import</p>
                  <div className="w-full max-h-56 overflow-y-auto rounded-xl border border-red-200 bg-red-50 divide-y divide-red-100">
                    {importErrors.map((e, i) => (
                      <p key={i} className="px-3 py-2 text-xs text-red-700 font-mono break-all">{e}</p>
                    ))}
                  </div>
                  <p className="text-xs text-center" style={{ color: WARM.textFaint }}>
                    Copiez ces messages pour diagnostiquer le problème Supabase.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'done') && (
          <div className="px-5 pb-4 pt-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: WARM.border }}>
            {step === 'preview' ? (
              <>
                <button onClick={() => { setStep('upload'); setPreview(null); setError(null) }}
                  style={{ background: WARM.surface, color: WARM.textSub }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity">
                  ← Retour
                </button>
                <button onClick={handleConfirm} disabled={matchedCount === 0 && scheduleEntries.length === 0}
                  style={{ background: WARM.accentBar }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                  Importer
                </button>
              </>
            ) : (
              <button onClick={onClose}
                style={{ background: WARM.accentBar }}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity">
                Fermer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
