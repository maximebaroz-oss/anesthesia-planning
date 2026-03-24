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
    // Last word
    if (parts[parts.length - 1] === name) return true
    // Last two words (compound)
    if (parts.length >= 2 && parts.slice(-2).join(' ') === name) return true
    // Last three words
    if (parts.length >= 3 && parts.slice(-3).join(' ') === name) return true
    // Contains
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
  // If month is in past, try next year
  const now = new Date()
  let y = year
  if (month < now.getMonth() + 1 - 1) y = year + 1
  const d = new Date(y, month - 1, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ImportPlanningModal({ profiles, onClose, onImported }) {
  const { profile: currentProfile } = useAuth()
  const [step, setStep] = useState('upload')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      // Find HB sheet
      const hbSheetName = wb.SheetNames.find(n => n.toUpperCase() === 'HB')
        ?? wb.SheetNames.find(n => n.toUpperCase().includes('HB'))
      if (!hbSheetName) {
        setError('Onglet "HB" introuvable dans ce fichier.')
        return
      }

      const rows = XLSX.utils.sheet_to_json(wb.Sheets[hbSheetName], { header: 1, defval: '' })
      const headerRow = rows[0] ?? []
      const year = new Date().getFullYear()

      // Columns B-F (indices 1-5)
      const days = [1, 2, 3, 4, 5].map(colIdx => ({
        colIdx,
        header: String(headerRow[colIdx] ?? ''),
        date: parseDateFromHeader(String(headerRow[colIdx] ?? ''), year),
      })).filter(d => d.date)

      if (days.length === 0) {
        setError('Impossible de lire les dates dans l\'onglet HB.')
        return
      }

      const entries = []
      for (const day of days) {
        for (const { rowIdx, type, label, roomId } of HB_ROWS) {
          const raw = String(rows[rowIdx]?.[day.colIdx] ?? '').trim()
          if (!raw) continue
          const matched = matchProfile(raw, profiles)
          entries.push({
            date: day.date,
            dayLabel: day.header,
            rowLabel: label,
            excelName: raw,
            profile: matched,
            type,
            roomId,
          })
        }
      }

      setPreview({ entries, weekLabel: String(headerRow[0] ?? '') })
      setStep('preview')
    } catch (err) {
      setError('Erreur lecture fichier : ' + err.message)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setStep('importing')
    try {
      for (const entry of preview.entries) {
        if (!entry.profile || !entry.date) continue
        if (entry.type === 'supervisor') {
          await supabase.from('supervisors').upsert(
            { date: entry.date, user_id: entry.profile.id, assigned_by: currentProfile?.id },
            { onConflict: 'date' }
          )
        } else {
          const { data: existing } = await supabase.from('assignments').select('id')
            .eq('user_id', entry.profile.id).eq('room_id', entry.roomId).eq('date', entry.date)
            .maybeSingle()
          if (!existing) {
            await supabase.from('assignments').insert({
              user_id: entry.profile.id,
              room_id: entry.roomId,
              date: entry.date,
              assigned_by: currentProfile?.id,
            })
          }
        }
      }
      setStep('done')
      onImported?.()
    } catch (err) {
      setError('Erreur import : ' + err.message)
      setStep('preview')
    }
  }

  const matchedCount  = preview?.entries.filter(e => e.profile).length ?? 0
  const unmatchedCount = preview?.entries.filter(e => e.excelName && !e.profile).length ?? 0
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
            <span className="font-bold text-sm" style={{ color: WARM.text }}>Import planning HB</span>
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
                <p className="text-sm mt-1" style={{ color: WARM.textFaint }}>Fichier .xlsx avec un onglet « HB »</p>
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
            <div>
              {/* Summary bar */}
              <div className="flex items-center gap-4 mb-4 p-3 rounded-xl" style={{ background: WARM.surface }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold" style={{ color: WARM.text }}>{matchedCount} trouvé(s)</span>
                </div>
                {unmatchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span className="text-sm text-amber-600">{unmatchedCount} non trouvé(s)</span>
                  </div>
                )}
                <span className="text-xs ml-auto" style={{ color: WARM.textFaint }}>{dates.length} jour(s) détecté(s)</span>
              </div>

              {/* Per-day tables */}
              <div className="space-y-4">
                {dates.map(date => {
                  const dayEntries = preview.entries.filter(e => e.date === date)
                  const label = dayEntries[0]?.dayLabel ?? date
                  return (
                    <div key={date}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-0.5"
                        style={{ color: WARM.accent }}>{label}</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: WARM.border }}>
                        {dayEntries.map((entry, i) => (
                          <div key={i}
                            style={{
                              borderColor: WARM.border,
                              background: i % 2 === 0 ? WARM.cardBg : WARM.surface,
                            }}
                            className={`flex items-center gap-3 px-3 py-2 text-xs ${i > 0 ? 'border-t' : ''}`}>
                            <span className="w-20 flex-shrink-0 font-medium" style={{ color: WARM.textFaint }}>
                              {entry.rowLabel}
                            </span>
                            <span className="w-28 flex-shrink-0 font-mono" style={{ color: WARM.textSub }}>
                              {entry.excelName}
                            </span>
                            <span className="text-gray-400 flex-shrink-0">→</span>
                            {entry.profile ? (
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
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <p className="font-semibold" style={{ color: WARM.text }}>Import terminé !</p>
              <p className="text-sm" style={{ color: WARM.textSub }}>{matchedCount} affectations importées sur {dates.length} jour(s).</p>
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
                <button onClick={handleConfirm} disabled={matchedCount === 0}
                  style={{ background: WARM.accentBar }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                  Importer {matchedCount} affectation(s)
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
