import { useState, useRef } from 'react'
import { X, Upload, Check, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { WARM } from '../config/theme'
import { getMonday, formatDateKey } from '../config/constants'

// Row definitions — label regex → roomId + sectorId
// mcConsult = special multi-line handling
const PDF_ROWS = [
  { re: /^MG1\b/i,                                    roomId: 57, sectorId: 'gyneco' },
  { re: /^MG2.+INTERNE/i,                             roomId: 58, sectorId: 'gyneco' },
  { re: /^MG2.+CDC/i,                                 roomId: 59, sectorId: 'gyneco' },
  { re: /^MG3\b/i,                                    roomId: 60, sectorId: 'gyneco' },
  { re: /^MG4\b/i,                                    roomId: 61, sectorId: 'gyneco' },
  { re: /^MG5\b/i,                                    roomId: 62, sectorId: 'gyneco' },
  { re: /^MC\s*Consult/i,                             roomId: 63, sectorId: 'gyneco', mcConsult: true },
  { re: /^MO1\b(?!.*Jour)(?!.*Soir)(?!.*Garde)/i,    roomId: 64, sectorId: 'obstetrique' },
  { re: /^MO2\s+CS/i,                                 roomId: 65, sectorId: 'obstetrique' },
  { re: /^MO1\s+Jour/i,                               roomId: 66, sectorId: 'obstetrique' },
  { re: /^MO1\s+Soir/i,                               roomId: 67, sectorId: 'obstetrique' },
  { re: /^MO1\s+Garde\s+WE/i,                         roomId: 68, sectorId: 'obstetrique' },
  { re: /^MO2\s+Garde\s+WE/i,                         roomId: 69, sectorId: 'obstetrique' },
  { re: /^MO1\s+Garde\s+N/i,                          roomId: 70, sectorId: 'obstetrique' },
  { re: /^MO2\s+Garde\s+N/i,                          roomId: 71, sectorId: 'obstetrique' },
  { re: /^PIQUETS/i,                                  roomId: 72, sectorId: 'obstetrique' },
  { re: /^OPHTALMOLOGIE/i,                            roomId: 73, sectorId: 'ophtalmo' },
]

// Clés canoniques des jours (formes longues)
const ALL_DAY_KEYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']
const WORKDAY_KEYS  = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI']
// Alias abréviés → clé canonique (le PDF peut utiliser SAM/DIM ou SAMEDI/DIMANCHE)
const DAY_ALIASES = { 'SAM': 'SAMEDI', 'DIM': 'DIMANCHE' }

// Retourne la clé canonique si le texte correspond à un jour (forme longue ou abrégée)
function matchDayKey(text) {
  const u = text.trim().toUpperCase()
  for (const key of ALL_DAY_KEYS) {
    if (u === key || u.startsWith(key + ' ')) return key
  }
  for (const [alias, canonical] of Object.entries(DAY_ALIASES)) {
    if (u === alias || u.startsWith(alias + ' ')) return canonical
  }
  return null
}

const FR_MONTHS = {
  JANVIER:1, FEVRIER:2, MARS:3, AVRIL:4, MAI:5, JUIN:6,
  JUILLET:7, AOUT:8, SEPTEMBRE:9, OCTOBRE:10, NOVEMBRE:11, DECEMBRE:12,
}

function normMonth(str) {
  return str.toUpperCase()
    .replace(/[ÉÈÊË]/g, 'E').replace(/[ÀÂÄA]/g, 'A')
    .replace(/[ÛÙÜ]/g, 'U').replace(/[ÎÏI]/g, 'I').replace(/[ÔÒÓ]/g, 'O')
}

function buildDate(dayNum, monthStr, refYear) {
  const month = FR_MONTHS[normMonth(monthStr)]
  if (!month) return null
  const d = new Date(refYear, month - 1, dayNum)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Remove all diacritics: é→E, è→E, ü→U, etc.
function deAccent(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

// Simple Levenshtein distance (capped at maxDist for performance)
function levenshtein(a, b, maxDist = 3) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[b.length]
}

function matchProfile(rawName, profiles) {
  if (!rawName || typeof rawName !== 'string') return null
  const name    = rawName.trim().toUpperCase().replace(/\s+/g, ' ')
  const nameDA  = deAccent(name)
  if (!name || name.length < 2) return null

  return profiles.find(p => {
    const up    = p.full_name.toUpperCase()
    const upDA  = deAccent(up)
    const parts   = up.split(' ')
    const partsDA = upDA.split(' ')

    // Exact match (with and without accents)
    if (parts[parts.length - 1] === name) return true
    if (partsDA[partsDA.length - 1] === nameDA) return true
    if (parts.length >= 2 && parts.slice(-2).join(' ') === name) return true
    if (partsDA.length >= 2 && partsDA.slice(-2).join(' ') === nameDA) return true
    if (parts.length >= 3 && parts.slice(-3).join(' ') === name) return true
    if (partsDA.length >= 3 && partsDA.slice(-3).join(' ') === nameDA) return true
    if (upDA.includes(nameDA)) return true

    // Fuzzy: compare nameDA against each part (for typos / encoding differences)
    // Only for tokens long enough to avoid false positives
    if (nameDA.length >= 6) {
      for (const part of partsDA) {
        if (part.length >= 6 && levenshtein(nameDA, part) <= 2) return true
      }
    }
    return false
  }) ?? null
}

// Words to skip — not a person's name
const SKIP_WORDS = new Set([
  'GYN', 'OBST', 'GYN/OBST', 'PRÉS', 'PRES', 'PRÉSENTIEL', 'PRESENTIEL',
  'TÉLEC', 'TELEC', 'ONCOSENO', 'ONCOSÉNO', 'INFO', 'PÉRI', 'PERI',
  'TARDIF', 'SENIOR', 'HEURE', 'DA', 'VINCI', 'PAS', 'DE', 'FERME', 'FERMÉ',
  'PIQUET', 'GARDE', 'SOIR', 'JOUR', 'NUIT', 'ISA', 'CDC', 'CHU',
  'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAM', 'DIM', 'SAMEDI', 'DIMANCHE',
])

function shouldSkip(str) {
  if (!str) return true
  const s = str.trim()
  if (!s || s === '/' || s === '-' || s === '–' || s === 'Ø') return true
  if (/^\d/.test(s)) return true
  if (/^PAS\s+DE/i.test(s)) return true
  if (/^FERME/i.test(s)) return true
  if (/^ISA/i.test(s)) return true
  if (/^[A-Z0-9]{1,2}$/.test(s)) return true    // Too short / initials only
  if (/\d{1,2}[Hh]/.test(s)) return true         // Contains a time like "7H", "16H"
  if (/^\d{5}$/.test(s)) return true             // Phone extension like "32727"
  return false
}

// Extract potential names from a text string
// Returns array of uppercase tokens that look like names
function extractNames(str) {
  if (shouldSkip(str)) return []
  // Split on spaces / slashes / "+" / "et"
  const tokens = str.split(/[\s/+&]+/)
  const results = []
  for (const tok of tokens) {
    const t = tok.trim()
    if (!t || t.length < 3) continue
    if (/\d/.test(t)) continue           // contains digits
    if (/[Hh]\d/.test(t)) continue      // time fragment
    if (SKIP_WORDS.has(t.toUpperCase())) continue
    results.push(t)
  }
  return results
}

async function parsePDF(file, profiles) {
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const content = await page.getTextContent()

  const items = content.items
    .filter(item => item.str && item.str.trim())
    .map(item => ({
      str: item.str.trim(),
      x: Math.round(item.transform[4] * 10) / 10,
      y: Math.round(item.transform[5] * 10) / 10,
      fontName: item.fontName ?? '',
    }))

  if (items.length === 0) return { error: 'PDF vide ou non lisible.' }

  const refYear = new Date().getFullYear()

  // --- Detect column headers ---
  // Headers are items like "LUNDI 6 AVRIL", "MARDI 7 AVRIL", etc.
  // Also possibly split: item "LUNDI", another "6", another "AVRIL"
  const colCenters = {}  // dayKey → x
  const colDates   = {}  // dayKey → dateStr

  for (const key of ALL_DAY_KEYS) {
    // Cherche tous les items correspondant à ce jour (forme longue ou abrégée)
    const matches = items.filter(it => matchDayKey(it.str) === key)
    if (matches.length === 0) continue

    // Prendre l'occurrence la plus haute (y max = haut de page en coord PDF)
    const topmost = matches.reduce((a, b) => a.y > b.y ? a : b)
    colCenters[key] = topmost.x

    // Extraire la date depuis le texte de l'item
    const text = topmost.str.toUpperCase()
    const m = text.match(/(\d{1,2})\s+([A-ZÉÈÊÀÛÔÙÎ]+)/)
    if (m) {
      const dateStr = buildDate(parseInt(m[1]), m[2], refYear)
      if (dateStr) { colDates[key] = dateStr; continue }
    }

    // Fallback : chercher date dans les items proches (même y ±5)
    const nearby = items.filter(it =>
      Math.abs(it.y - topmost.y) <= 5 &&
      Math.abs(it.x - topmost.x) < 60
    )
    const combined = nearby.map(it => it.str.toUpperCase()).join(' ')
    const m2 = combined.match(/(\d{1,2})\s+([A-ZÉÈÊÀÛÔÙÎ]+)/)
    if (m2) {
      const dateStr = buildDate(parseInt(m2[1]), m2[2], refYear)
      if (dateStr) colDates[key] = dateStr
    }
  }

  const foundDays = ALL_DAY_KEYS.filter(k => colCenters[k] != null)
  if (foundDays.length === 0) {
    return { error: 'Impossible de détecter les colonnes (LUNDI/SAM…). Vérifiez que le fichier est bien le planning Maternité.' }
  }

  // Fallback : calculer les dates SAM/DIM depuis VENDREDI ou JEUDI si non extraites du texte
  // (le PDF peut afficher "SAM 11" sans mois, ce qui empêche l'extraction directe)
  const weekdayOrder = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI']
  const offsets = { LUNDI: 0, MARDI: 1, MERCREDI: 2, JEUDI: 3, VENDREDI: 4, SAMEDI: 5, DIMANCHE: 6 }
  // Trouver une date de référence (n'importe quel jour de semaine détecté avec date)
  let refMonday = null
  for (const key of weekdayOrder) {
    if (colDates[key]) {
      const d = new Date(colDates[key] + 'T12:00:00')
      d.setDate(d.getDate() - offsets[key]) // revenir au lundi
      refMonday = d
      break
    }
  }
  if (refMonday) {
    for (const key of ['SAMEDI', 'DIMANCHE']) {
      if (colCenters[key] && !colDates[key]) {
        const d = new Date(refMonday)
        d.setDate(refMonday.getDate() + offsets[key])
        colDates[key] = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      }
    }
  }

  // Sort found days by x
  const sortedDays = foundDays.slice().sort((a, b) => colCenters[a] - colCenters[b])
  const firstColX   = colCenters[sortedDays[0]]
  const labelThreshold = firstColX - 8

  // Column x-boundaries (midpoints between adjacent columns)
  const colBounds = {} // dayKey → { xMin, xMax }
  for (let i = 0; i < sortedDays.length; i++) {
    const key  = sortedDays[i]
    const cx   = colCenters[key]
    const prev = i > 0 ? colCenters[sortedDays[i - 1]] : -Infinity
    const next = i < sortedDays.length - 1 ? colCenters[sortedDays[i + 1]] : Infinity
    colBounds[key] = {
      xMin: i === 0 ? labelThreshold : (cx + prev) / 2,
      xMax: i === sortedDays.length - 1 ? Infinity : (cx + next) / 2,
    }
  }

  // Header y (topmost of all day-key items found)
  const headerY = Math.max(...foundDays.map(k => {
    const it = items.find(it2 => {
      const u = it2.str.toUpperCase().trim()
      return (u === k || u.startsWith(k + ' ')) && Math.abs(it2.x - colCenters[k]) < 5
    })
    return it?.y ?? 0
  }))

  // --- Group items into rows by y (±5px tolerance) ---
  const rows = []
  for (const item of items) {
    const existing = rows.find(r => Math.abs(r.y - item.y) <= 5)
    if (existing) existing.items.push(item)
    else rows.push({ y: item.y, items: [item] })
  }
  rows.sort((a, b) => b.y - a.y) // top-to-bottom

  // --- Find stop y (SOUHAITS / REMARQUES or MATERNITE effectif section) ---
  const stopY = (() => {
    for (const row of rows) {
      if (row.y >= headerY - 2) continue
      const labelItems = row.items.filter(it => it.x < labelThreshold)
      const label = labelItems.map(it => it.str).join(' ').trim()
      if (/^SOUHAITS/i.test(label) || /^MATERNITE/i.test(label) || /^MATERNITÉ/i.test(label)) {
        return row.y
      }
    }
    return -Infinity
  })()

  // --- Build label lookup: for each row y, what is the label text? ---
  // Some labels span multiple items at the same y (e.g. "MG1" + "7H-16H" + "32731")
  function getLabelAtY(rowY) {
    const labelItems = rows
      .find(r => Math.abs(r.y - rowY) <= 5)
      ?.items.filter(it => it.x < labelThreshold) ?? []
    return labelItems.map(it => it.str).join(' ').trim()
  }

  // --- Find y positions of all row definitions ---
  const rowPositions = [] // { rowDef, rowY }
  for (const row of rows) {
    if (row.y >= headerY - 2) continue
    if (row.y <= stopY) continue
    const label = getLabelAtY(row.y)
    if (!label) continue
    for (const rowDef of PDF_ROWS) {
      if (rowDef.re.test(label)) {
        if (!rowPositions.find(rp => rp.rowDef === rowDef)) {
          rowPositions.push({ rowDef, rowY: row.y })
        }
        break
      }
    }
  }
  rowPositions.sort((a, b) => b.rowY - a.rowY) // top-to-bottom

  // --- Extract assignments ---
  const assignments = []
  const unmatched   = []

  for (let ri = 0; ri < rowPositions.length; ri++) {
    const { rowDef, rowY } = rowPositions[ri]
    // y range: from rowY down to next row's y (exclusive) or stopY
    const nextRowY = ri < rowPositions.length - 1 ? rowPositions[ri + 1].rowY : stopY
    // items in this row's y range (inclusive rowY, exclusive nextRowY)
    const rangeItems = items.filter(it =>
      it.y <= rowY + 5 &&
      it.y > nextRowY + 5
    )

    for (const key of foundDays) {
      const date = colDates[key]
      if (!date) continue
      const { xMin, xMax } = colBounds[key]
      const cellItems = rangeItems.filter(it => it.x >= xMin && it.x < xMax)

      let names = []

      if (rowDef.mcConsult) {
        // MC Consult: name is embedded in multi-line cell like "gyn LAZEYRAS"
        // Look for any token that matches a profile, prioritising bold
        for (const it of cellItems) {
          if (shouldSkip(it.str)) continue
          // Try each word in this item
          const tokens = it.str.split(/\s+/)
          for (const tok of tokens) {
            if (tok.length < 3) continue
            if (SKIP_WORDS.has(tok.toUpperCase())) continue
            if (/\d/.test(tok)) continue
            const prof = matchProfile(tok, profiles)
            if (prof) { names.push(tok); break }
          }
          if (names.length > 0) break
        }
      } else {
        // Regular row: items at the same y as rowY (±5)
        const sameYItems = cellItems.filter(it => Math.abs(it.y - rowY) <= 5)
        // Combine text from same-y items in the cell
        const cellText = sameYItems.map(it => it.str).join(' ')
        names = extractNames(cellText)
      }

      for (const name of names) {
        if (shouldSkip(name)) continue
        const prof = matchProfile(name, profiles)
        const rowLabel = PDF_ROWS.find(r => r.roomId === rowDef.roomId)?.re.source ?? String(rowDef.roomId)
        if (prof) {
          assignments.push({ roomId: rowDef.roomId, sectorId: rowDef.sectorId, date, userId: prof.id, profileName: prof.full_name })
        } else {
          unmatched.push({ name, rowLabel: getLabelAtY(rowY), date })
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set()
  const deduped = assignments.filter(a => {
    const key = `${a.userId}-${a.roomId}-${a.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const weekDates = Object.values(colDates).filter(Boolean).sort()
  const weekLabel = weekDates.length > 0
    ? `Sem. du ${new Date(weekDates[0] + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null

  return { assignments: deduped, unmatched, weekLabel, colDates, foundDays }
}

export default function ImportPlanningPDFModal({ profiles, theme, onClose, onImported }) {
  const T = theme ?? WARM
  const { profile: currentProfile } = useAuth()
  const fileRef = useRef(null)
  const [parsing,   setParsing]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)

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
    setError(null)
    try {
      const dates   = [...new Set(result.assignments.map(a => a.date))]
      const roomIds = [...new Set(result.assignments.map(a => a.roomId))]

      const { error: delErr } = await supabase
        .from('assignments').delete()
        .in('date', dates).in('room_id', roomIds)
      if (delErr) throw new Error(`Suppression : ${delErr.message}`)

      const rows = result.assignments.map(a => ({
        user_id:     a.userId,
        room_id:     a.roomId,
        date:        a.date,
        assigned_by: currentProfile?.id ?? null,
      }))
      const { error: insErr } = await supabase.from('assignments').insert(rows)
      if (insErr) throw new Error(`Insertion : ${insErr.message}`)

      // Sauvegarder un snapshot par (secteur, semaine) pour permettre le retour à l'origine
      const snapsByKey = {}
      for (const a of result.assignments) {
        const monday = formatDateKey(getMonday(new Date(a.date + 'T12:00:00')))
        const key = `${a.sectorId}||${monday}`
        if (!snapsByKey[key]) snapsByKey[key] = { sectorId: a.sectorId, weekDate: monday, entries: {} }
        if (!snapsByKey[key].entries[a.date]) snapsByKey[key].entries[a.date] = []
        const prof = profiles.find(p => p.id === a.userId)
        snapsByKey[key].entries[a.date].push({
          room_id: a.roomId, user_id: a.userId,
          full_name: prof?.full_name ?? '', grade: prof?.grade ?? '', profession: prof?.profession ?? '',
        })
      }
      for (const { sectorId, weekDate, entries } of Object.values(snapsByKey)) {
        await supabase.from('planning_snapshots').upsert(
          { week_date: weekDate, unit_id: sectorId, snapshot: entries },
          { onConflict: 'week_date,unit_id' }
        )
      }

      onImported()
    } catch (err) {
      setError(`Erreur d'import : ${err.message}`)
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: T.cardHead, borderColor: T.border }}>
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: T.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: T.text }}>
              Import planning PDF
            </h2>
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }} className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
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
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
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
              {result.weekLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <Check size={15} className="text-green-600 flex-shrink-0" />
                  <span style={{ color: T.text }}>{result.weekLabel}</span>
                </div>
              )}

              <div className="rounded-xl px-3 py-2.5 text-sm space-y-1"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <p style={{ color: T.text }}>
                  <span className="font-bold">{result.assignments.length}</span> affectation(s) détectée(s)
                </p>
                <p style={{ color: T.text }}>
                  <span className="font-bold">{[...new Set(result.assignments.map(a => a.date))].length}</span> jour(s)
                </p>
              </div>

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
