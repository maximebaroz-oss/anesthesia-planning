import { useState, useRef } from 'react'
import { X, Upload, Check, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { WARM } from '../config/theme'

// Row definitions — label regex → roomId + sectorId
const PDF_ROWS = [
  { re: /^MG1\b/i,               roomId: 57, sectorId: 'gyneco' },
  { re: /^MG2.+INTERNE/i,        roomId: 58, sectorId: 'gyneco' },
  { re: /^MG2.+CDC/i,            roomId: 59, sectorId: 'gyneco' },
  { re: /^MG3\b/i,               roomId: 60, sectorId: 'gyneco' },
  { re: /^MG4\b/i,               roomId: 61, sectorId: 'gyneco' },
  { re: /^MG5\b/i,               roomId: 62, sectorId: 'gyneco' },
  { re: /^MC\s*Consult/i,        roomId: 63, sectorId: 'gyneco', mcConsult: true },
  { re: /^MO1\b(?!.*Jour)(?!.*Soir)(?!.*Garde)/i, roomId: 64, sectorId: 'obstetrique' },
  { re: /^MO2\s+CS/i,            roomId: 65, sectorId: 'obstetrique' },
  { re: /^MO1\s+Jour/i,          roomId: 66, sectorId: 'obstetrique' },
  { re: /^MO1\s+Soir/i,          roomId: 67, sectorId: 'obstetrique' },
  { re: /^MO1\s+Garde\s+WE/i,    roomId: 68, sectorId: 'obstetrique' },
  { re: /^MO2\s+Garde\s+WE/i,    roomId: 69, sectorId: 'obstetrique' },
  { re: /^MO1\s+Garde\s+N/i,     roomId: 70, sectorId: 'obstetrique' },
  { re: /^MO2\s+Garde\s+N/i,     roomId: 71, sectorId: 'obstetrique' },
  { re: /^PIQUETS/i,             roomId: 72, sectorId: 'obstetrique' },
  { re: /^OPHTALMOLOGIE/i,       roomId: 73, sectorId: 'ophtalmo' },
]

const DAY_KEYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI']

const FR_MONTHS = {
  JANVIER:1, FEVRIER:2, 'FÉVRIER':2, MARS:3, AVRIL:4, MAI:5, JUIN:6,
  JUILLET:7, 'AOÛT':8, AOUT:8, SEPTEMBRE:9, OCTOBRE:10, NOVEMBRE:11,
  DECEMBRE:12, 'DÉCEMBRE':12,
}

function matchProfile(rawName, profiles) {
  if (!rawName || typeof rawName !== 'string') return null
  const name = rawName.trim().toUpperCase().replace(/\s+/g, ' ')
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

function shouldSkip(str) {
  if (!str) return true
  const s = str.trim()
  if (!s || s === '/' || s === '-' || s === '–') return true
  if (/^\d/.test(s)) return true
  if (/^PAS\s+DE/i.test(s)) return true
  if (/^FERME/i.test(s)) return true
  if (/^ISA/i.test(s)) return true
  return false
}

// Build date string from day number + month name
function buildDate(dayNum, monthStr, refYear) {
  const month = FR_MONTHS[monthStr.toUpperCase().replace(/[ÉÈÊË]/g, 'E').replace(/[ÀÂÄA]/g, 'A').replace(/Û/g, 'U').replace(/Î/g, 'I')]
    ?? FR_MONTHS[monthStr.toUpperCase()]
  if (!month) return null
  const year = refYear ?? new Date().getFullYear()
  const d = new Date(year, month - 1, dayNum)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function parsePDF(file, profiles) {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const content = await page.getTextContent()

  // Collect items with position
  const items = content.items
    .filter(item => item.str && item.str.trim())
    .map(item => ({
      str: item.str.trim(),
      x: item.transform[4],
      y: item.transform[5],
      // fontName can help detect bold — pdfjs uses font name
      fontName: item.fontName ?? '',
    }))

  if (items.length === 0) return { error: 'PDF vide ou non lisible.' }

  // --- Detect column centers from topmost DAY_KEY headers ---
  // For each day key, find ALL items that contain just that word (case-insensitive)
  // Take the one with the HIGHEST y (topmost in PDF coords, y increases upward)
  const colCenters = {} // dayKey → x
  for (const key of DAY_KEYS) {
    const matches = items.filter(it => it.str.toUpperCase() === key)
    if (matches.length > 0) {
      // highest y = topmost = header
      const topmost = matches.reduce((a, b) => a.y > b.y ? a : b)
      colCenters[key] = topmost.x
    }
  }

  const foundDays = DAY_KEYS.filter(k => colCenters[k] != null)
  if (foundDays.length === 0) return { error: 'Impossible de détecter les colonnes (LUNDI/MARDI…).' }

  // --- Auto-detect week dates ---
  // Look for items near the column headers that contain a number (day) and a month name
  // Strategy: for each found day column, look for items close to colCenters[key] in x, near header y
  const headerY = Math.max(...foundDays.map(k => {
    const it = items.find(it => it.str.toUpperCase() === k)
    return it?.y ?? 0
  }))

  const refYear = new Date().getFullYear()
  const colDates = {} // dayKey → dateStr

  for (const key of foundDays) {
    const cx = colCenters[key]
    // Items within ±80px x of this column center, within ±30px y of header
    const nearby = items.filter(it =>
      Math.abs(it.x - cx) < 80 &&
      Math.abs(it.y - headerY) < 50
    )

    // Try to extract day number + month from nearby items
    // Items might be: "LUNDI", "6", "AVRIL" or "LUNDI 6 AVRIL" or "6 AVRIL"
    const combined = nearby.map(it => it.str).join(' ')
    const match = combined.match(/(\d{1,2})\s+([A-ZÉÈÊÀÛÔÙÎ]+)/i)
    if (match) {
      const dayNum = parseInt(match[1])
      const monthStr = match[2]
      const dateStr = buildDate(dayNum, monthStr, refYear)
      if (dateStr) colDates[key] = dateStr
    }
  }

  // --- Column boundaries ---
  // Sort found days by x position
  const sortedDays = foundDays.slice().sort((a, b) => colCenters[a] - colCenters[b])
  // Label column: everything left of (first column center - threshold)
  const firstColX = colCenters[sortedDays[0]]
  const labelThreshold = firstColX - 5

  // Column boundaries: midpoints between adjacent columns
  const colBoundaries = {} // dayKey → { xMin, xMax }
  for (let i = 0; i < sortedDays.length; i++) {
    const key = sortedDays[i]
    const cx = colCenters[key]
    const prevCx = i > 0 ? colCenters[sortedDays[i - 1]] : -Infinity
    const nextCx = i < sortedDays.length - 1 ? colCenters[sortedDays[i + 1]] : Infinity
    colBoundaries[key] = {
      xMin: i === 0 ? labelThreshold : (cx + prevCx) / 2,
      xMax: i === sortedDays.length - 1 ? Infinity : (cx + nextCx) / 2,
    }
  }

  // --- Group items into rows by y coordinate (±6px tolerance) ---
  const rows = [] // [{ y, items: [...] }]
  for (const item of items) {
    const existingRow = rows.find(r => Math.abs(r.y - item.y) <= 6)
    if (existingRow) {
      existingRow.items.push(item)
    } else {
      rows.push({ y: item.y, items: [item] })
    }
  }
  // Sort rows top-to-bottom (descending y in PDF coords)
  rows.sort((a, b) => b.y - a.y)

  // --- Find stop row (effectif summary section) ---
  // Stop when we see a row that has only "MATERNITE" or "SOUHAITS" as label (approx)
  // and is below the header rows
  const stopY = (() => {
    for (const row of rows) {
      if (row.y >= headerY) continue // skip header area
      const labelItems = row.items.filter(it => it.x < labelThreshold)
      const label = labelItems.map(it => it.str).join(' ').trim().toUpperCase()
      if (/^SOUHAITS/.test(label) || (label === 'MATERNITE' || label === 'MATERNITÉ')) {
        return row.y
      }
    }
    return -Infinity
  })()

  // --- Process data rows ---
  const unmatched = []
  const assignments = [] // { roomId, sectorId, date, userId, profile }
  const mcConsultDef = PDF_ROWS.find(r => r.mcConsult)

  for (const row of rows) {
    // Skip header area and below stop
    if (row.y >= headerY - 5) continue
    if (row.y <= stopY) continue

    // Get label items (left of first column)
    const labelItems = row.items.filter(it => it.x < labelThreshold)
    if (labelItems.length === 0) continue

    const labelText = labelItems.map(it => it.str).join(' ').trim()

    // Find matching row definition
    const rowDef = PDF_ROWS.find(r => r.re.test(labelText))
    if (!rowDef) continue

    if (rowDef.mcConsult) {
      // MC Consult: find bold uppercase name in each day column
      // Bold detection: check fontName for "Bold" or "bold"
      for (const key of foundDays) {
        const date = colDates[key]
        if (!date) continue
        const { xMin, xMax } = colBoundaries[key]
        // Look for items in this column near this row (±8px)
        const cellItems = items.filter(it =>
          it.x >= xMin && it.x < xMax &&
          Math.abs(it.y - row.y) <= 8
        )
        // Find bold+uppercase item
        const boldItem = cellItems.find(it => {
          const isBold = /bold/i.test(it.fontName)
          const isUpper = it.str === it.str.toUpperCase() && /[A-Z]/.test(it.str)
          return isBold && isUpper && !shouldSkip(it.str)
        })
        // Fallback: first uppercase item if no bold detected
        const candidateItem = boldItem ?? cellItems.find(it =>
          it.str === it.str.toUpperCase() && /[A-Z]/.test(it.str) && !shouldSkip(it.str)
        )
        if (!candidateItem) continue
        const profile = matchProfile(candidateItem.str, profiles)
        if (profile) {
          assignments.push({ roomId: rowDef.roomId, sectorId: rowDef.sectorId, date, userId: profile.id, profileName: profile.full_name })
        } else {
          unmatched.push({ name: candidateItem.str, rowLabel: labelText, date })
        }
      }
    } else {
      // Regular row: find first non-skip item in each day column
      for (const key of foundDays) {
        const date = colDates[key]
        if (!date) continue
        const { xMin, xMax } = colBoundaries[key]
        // All items in this column near this row
        // For multi-person rows, gather all non-skip items in a vertical band
        const cellItems = items.filter(it =>
          it.x >= xMin && it.x < xMax &&
          Math.abs(it.y - row.y) <= 8
        )
        const names = cellItems.map(it => it.str).filter(s => !shouldSkip(s))
        for (const name of names) {
          const profile = matchProfile(name, profiles)
          if (profile) {
            assignments.push({ roomId: rowDef.roomId, sectorId: rowDef.sectorId, date, userId: profile.id, profileName: profile.full_name })
          } else {
            unmatched.push({ name, rowLabel: labelText, date })
          }
        }
      }
    }
  }

  // Deduplicate assignments (same userId + roomId + date)
  const seen = new Set()
  const deduped = assignments.filter(a => {
    const key = `${a.userId}-${a.roomId}-${a.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const weekDates = Object.values(colDates).filter(Boolean)
  const weekLabel = weekDates.length > 0
    ? `Sem. du ${new Date(weekDates[0] + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : null

  return { assignments: deduped, unmatched, weekLabel, colDates, foundDays }
}

export default function ImportPlanningPDFModal({ profiles, theme, onClose, onImported }) {
  const T = theme ?? WARM
  const { profile: currentProfile } = useAuth()
  const fileRef = useRef(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null) // { assignments, unmatched, weekLabel, error }
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setResult(null)
    setError(null)
    try {
      const res = await parsePDF(file, profiles)
      if (res.error) { setError(res.error); setParsing(false); return }
      setResult(res)
    } catch (err) {
      setError(`Erreur de lecture : ${err.message}`)
    }
    setParsing(false)
  }

  async function handleImport() {
    if (!result?.assignments?.length) return
    setImporting(true)
    try {
      // Delete existing assignments for these dates + rooms
      const dates = [...new Set(result.assignments.map(a => a.date))]
      const roomIds = [...new Set(result.assignments.map(a => a.roomId))]
      await supabase.from('assignments').delete()
        .in('date', dates).in('room_id', roomIds)

      // Insert new assignments
      const rows = result.assignments.map(a => ({
        user_id: a.userId,
        room_id: a.roomId,
        date: a.date,
        assigned_by: currentProfile?.id ?? null,
      }))
      await supabase.from('assignments').insert(rows)
      onImported()
    } catch (err) {
      setError(`Erreur d'import : ${err.message}`)
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: T.cardHead, borderColor: T.border }}>
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: T.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: T.text }}>
              Import planning PDF (Maternité/Ophtalmo)
            </h2>
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }} className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* File upload */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: T.textFaint }}>
              Fichier PDF
            </label>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: T.surface, borderColor: T.border, color: T.text }}
              className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
              <Upload size={22} style={{ color: T.accentBar }} />
              <span className="text-sm font-medium">Sélectionner un fichier PDF</span>
              <span className="text-xs" style={{ color: T.textFaint }}>Planning Maternité / Ophtalmo</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm" style={{ color: T.textSub }}>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Lecture du PDF…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && !error && (
            <div className="space-y-3">
              {/* Week detected */}
              {result.weekLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <Check size={15} className="text-green-600 flex-shrink-0" />
                  <span style={{ color: T.text }}>{result.weekLabel}</span>
                </div>
              )}

              {/* Stats */}
              <div className="rounded-xl px-3 py-2.5 text-sm space-y-1"
                style={{ background: T.surface, borderColor: T.border, border: `1px solid ${T.border}` }}>
                <p style={{ color: T.text }}>
                  <span className="font-bold">{result.assignments.length}</span> affectation(s) détectée(s)
                </p>
                <p style={{ color: T.text }}>
                  <span className="font-bold">{[...new Set(result.assignments.map(a => a.date))].length}</span> jour(s)
                </p>
              </div>

              {/* Unmatched names */}
              {result.unmatched.length > 0 && (
                <div className="rounded-xl px-3 py-2.5 space-y-1.5"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle size={13} />
                    {result.unmatched.length} nom(s) non reconnu(s) — ignoré(s)
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {result.unmatched.map((u, i) => (
                      <p key={i} className="text-xs text-amber-800">
                        {u.name} <span className="text-amber-500">({u.rowLabel} — {u.date})</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            style={{ background: T.surface, color: T.textSub, border: `1px solid ${T.border}` }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity">
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={!result?.assignments?.length || importing}
            style={{ background: T.accentBar }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
            {importing ? 'Import…' : `Importer (${result?.assignments?.length ?? 0})`}
          </button>
        </div>
      </div>
    </div>
  )
}
