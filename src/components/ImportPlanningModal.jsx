import { useState, useRef } from 'react'
import { X, Upload, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

import { WARM, SKY } from '../config/theme'

// HB row index (0-based) → { roomId, label }
const HB_ROWS = [
  { rowIdx: 1, type: 'supervisor', label: 'Superviseur HB', roomId: null },
  { rowIdx: 2, type: 'assignment', label: 'Tardif',         roomId: 8 },
  { rowIdx: 3, type: 'assignment', label: 'Gastro 4',       roomId: 1 },
  { rowIdx: 4, type: 'assignment', label: 'Broncho 7',      roomId: 3 },
  { rowIdx: 5, type: 'assignment', label: 'Radio 11',       roomId: 4 },
  { rowIdx: 6, type: 'assignment', label: 'Radio 12',       roomId: 5 },
  { rowIdx: 7, type: 'assignment', label: 'Cardio 17',      roomId: 7 },
  { rowIdx: 9, type: 'assignment', label: 'Consultation',   roomId: 9 },
]

// BOU (Feuil1) row index (0-based) → { roomId, label, type }
const BOU_ROWS = [
  { rowIdx: 2,  type: 'supervisor', label: 'Superviseur BOU-Traumato', roomId: null },
  { rowIdx: 4,  type: 'assignment', label: 'BOU 1 (33501)',            roomId: 18 },
  { rowIdx: 5,  type: 'assignment', label: 'BOU 2 (33501)',            roomId: 19 },
  { rowIdx: 6,  type: 'assignment', label: 'BOU 1 (33500)',            roomId: 20 },
  { rowIdx: 7,  type: 'assignment', label: 'BOU 3 (32737)',            roomId: 21 },
  { rowIdx: 8,  type: 'assignment', label: 'Poly B Prévost',           roomId: 22 },
]

// Traumatologie (Feuil1) row index (0-based)
const TRAUMATO_ROWS = [
  { rowIdx: 2,  type: 'supervisor', label: 'Superviseur BOU-Traumato', roomId: null },
  { rowIdx: 10, type: 'assignment', label: 'CDC Traumato (33510)',     roomId: 23 },
  { rowIdx: 11, type: 'assignment', label: 'Interne Salle 7',          roomId: 36 },
  { rowIdx: 12, type: 'assignment', label: 'Interne Salle 8',          roomId: 37 },
  { rowIdx: 13, type: 'assignment', label: 'Tardif Traumato',          roomId: 24 },
]

// Prévost (Feuil1) row index (0-based)
const PREVOST_ROWS = [
  { rowIdx: 18, type: 'supervisor', label: 'Superviseur Prévost',      roomId: null },
  { rowIdx: 19, type: 'assignment', label: 'CVT Tardif',               roomId: 32 },
  { rowIdx: 20, type: 'assignment', label: 'NC Tardif',                roomId: 33 },
  { rowIdx: 21, type: 'assignment', label: 'NCH GIBOR',                roomId: 25 },
  { rowIdx: 22, type: 'assignment', label: 'NCH Salle 4 (hybride)',    roomId: 26 },
  { rowIdx: 23, type: 'assignment', label: 'NCH Salle 1',              roomId: 27 },
  { rowIdx: 24, type: 'assignment', label: 'CV Salle 5 (hybride)',     roomId: 28 },
  { rowIdx: 25, type: 'assignment', label: 'CV Salle 1',               roomId: 29 },
  { rowIdx: 26, type: 'assignment', label: 'THO Salle 2',              roomId: 30 },
  { rowIdx: 27, type: 'assignment', label: 'Cardio struct salle 5',    roomId: 31 },
  { rowIdx: 28, type: 'assignment', label: 'Consultation CVT',         roomId: 34 },
  { rowIdx: 29, type: 'assignment', label: 'Consultation NCh',         roomId: 35 },
]

// AMOPA — feuille "semaine", col D-H (indices 3-7) = Lun-Ven, col C ignorée (ISA)
const AMOPA_ORL_ROWS = [
  { rowIdx: 1, type: 'assignment', label: 'Senior 1',               roomId: 43, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 2, type: 'assignment', label: 'CDC 1',                  roomId: 44, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 3, type: 'assignment', label: 'Interne 1',              roomId: 45, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 4, type: 'assignment', label: 'Interne 2',              roomId: 46, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 5, type: 'assignment', label: 'Interne 3',              roomId: 47, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 6, type: 'assignment', label: 'Senior 2',               roomId: 48, sectorId: 'orl-maxfa-plastie' },
  { rowIdx: 8, type: 'assignment', label: 'Belle-idée CDC',         roomId: 49, sectorId: 'orl-maxfa-plastie' },
]
const AMOPA_BOCHA_ROWS = [
  { rowIdx: 13, type: 'assignment', label: 'Senior 1',  roomId: 38, sectorId: 'bocha-amopa' },
  { rowIdx: 14, type: 'assignment', label: 'Senior 2',  roomId: 39, sectorId: 'bocha-amopa' },
  { rowIdx: 15, type: 'assignment', label: 'Interne 1', roomId: 40, sectorId: 'bocha-amopa' },
  { rowIdx: 16, type: 'assignment', label: 'Interne 2', roomId: 41, sectorId: 'bocha-amopa' },
  { rowIdx: 17, type: 'assignment', label: 'CDC BOCHA', roomId: 42, sectorId: 'bocha-amopa' },
]
const AMOPA_ANTALGIE_ROWS = [
  { rowIdx: 27, type: 'supervisor', label: 'Superviseur Antalgie',            roomId: null, sectorId: 'antalgie' },
  { rowIdx: 21, type: 'assignment', label: 'Interne 1',                       roomId: 51,   sectorId: 'antalgie' },
  { rowIdx: 22, type: 'assignment', label: 'Interne 2',                       roomId: 52,   sectorId: 'antalgie' },
  { rowIdx: 23, type: 'assignment', label: 'Antalgie chronique box 1',        roomId: 53,   sectorId: 'antalgie' },
  { rowIdx: 24, type: 'assignment', label: 'Antalgie chronique box 7',        roomId: 54,   sectorId: 'antalgie' },
  { rowIdx: 25, type: 'assignment', label: 'Antalgie chronique box 8',        roomId: 55,   sectorId: 'antalgie' },
  { rowIdx: 26, type: 'assignment', label: 'Antalgie chronique box 3/BOCHA 4', roomId: 56, sectorId: 'antalgie' },
]
const ALL_AMOPA_ROWS = [...AMOPA_ORL_ROWS, ...AMOPA_BOCHA_ROWS, ...AMOPA_ANTALGIE_ROWS]

// DU (Julliard) row index (0-based) → { roomId, label, type }
const DU_ROWS = [
  { rowIdx: 1,  type: 'supervisor', label: 'Superviseur Julliard',  roomId: null },
  { rowIdx: 17, type: 'assignment', label: 'Visite J+1',            roomId: 16   },
  { rowIdx: 18, type: 'assignment', label: 'Consultation',          roomId: 15   },
  { rowIdx: 19, type: 'supervisor', label: 'Superviseur Julliard',  roomId: null },
  { rowIdx: 20, type: 'assignment', label: 'Consultation greffe',   roomId: 17   },
  { rowIdx: 21, type: 'day_note',   label: 'Souhait / Remarque',    roomId: null },
]

// Like matchProfile but matches any profession (médecin + ISA)
function matchProfileAny(excelName, profiles) {
  if (!excelName || typeof excelName !== 'string') return null
  const name = excelName.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!name) return null
  return profiles.find(p => {
    const up = p.full_name.toUpperCase()
    const parts = up.split(' ')
    if (parts[parts.length - 1] === name) return true
    if (parts.length >= 2 && parts.slice(-2).join(' ') === name) return true
    if (parts.length >= 3 && parts.slice(-3).join(' ') === name) return true
    if (up.includes(name)) return true
    return false
  }) ?? null
}

// SINPI (USPI) row definitions — Excel "HEBDO_REMPLI" sheet
// dayMode: 'weekday'=cols 3-7, 'weekend'=cols 8-9, 'all'=cols 3-9
const SINPI_ROWS = [
  { rowIdx: 2,  type: 'supervisor', label: 'Superviseur SINPI',  roomId: null, sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'med' },
  { rowIdx: 3,  type: 'assignment', label: 'Superviseur ISA',    roomId: 75,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 4,  type: 'assignment', label: 'SINPI AM 07h-16h',   roomId: 76,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 5,  type: 'assignment', label: 'SINPI PM 13h-22h',   roomId: 77,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 6,  type: 'assignment', label: 'SSPI 11h-21h',       roomId: 78,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 7,  type: 'assignment', label: 'SINPI AM 07h-17h',   roomId: 79,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 8,  type: 'assignment', label: 'SINPI PM 12h-22h',   roomId: 80,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 9,  type: 'assignment', label: 'Nuit 21h30-07h30',   roomId: 81,   sectorId: 'sinpi', dayMode: 'weekday', matchFn: 'any' },
  { rowIdx: 10, type: 'assignment', label: 'WE S1 07h-19h30',    roomId: 82,   sectorId: 'sinpi', dayMode: 'all',     matchFn: 'any' },
  { rowIdx: 11, type: 'assignment', label: 'WE S2 07h-17h',      roomId: 83,   sectorId: 'sinpi', dayMode: 'weekend', matchFn: 'any' },
  { rowIdx: 12, type: 'assignment', label: 'WE Nuit 19h-07h30',  roomId: 84,   sectorId: 'sinpi', dayMode: 'weekend', matchFn: 'any' },
  { rowIdx: 14, type: 'assignment', label: 'PA',                  roomId: 85,   sectorId: 'sinpi', dayMode: 'all',     matchFn: 'med' },
]

function parseSINPISheet(ws, rows, profiles) {
  const headerRow = rows[0] ?? []
  const year = new Date().getFullYear()

  // All day columns D-J (indices 3-9)
  const allDays = [3, 4, 5, 6, 7, 8, 9].map(colIdx => ({
    colIdx,
    header: String(headerRow[colIdx] ?? ''),
    date: parseDateFromHeader(String(headerRow[colIdx] ?? ''), year),
  })).filter(d => d.date)

  if (allDays.length === 0) return null

  const weekdayDays = allDays.filter(d => { const dow = new Date(d.date + 'T12:00:00').getDay(); return dow >= 1 && dow <= 5 })
  const weekendDays = allDays.filter(d => { const dow = new Date(d.date + 'T12:00:00').getDay(); return dow === 0 || dow === 6 })

  const entries = []
  for (const rowDef of SINPI_ROWS) {
    const days = rowDef.dayMode === 'weekend' ? weekendDays
               : rowDef.dayMode === 'weekday' ? weekdayDays
               : allDays

    for (const day of days) {
      const raw = String(rows[rowDef.rowIdx]?.[day.colIdx] ?? '').trim()
      if (!raw) continue
      const profile = rowDef.matchFn === 'any'
        ? matchProfileAny(raw, profiles)
        : matchProfile(raw, profiles)
      entries.push({
        date: day.date,
        dayLabel: day.header,
        rowLabel: rowDef.label,
        excelName: raw,
        profile,
        type: rowDef.type,
        roomId: rowDef.roomId,
        sectorId: rowDef.sectorId,
      })
    }
  }

  return { entries, weekLabel: String(headerRow[0] ?? '') }
}

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

const FR_MONTHS = {
  JANVIER:1, FEVRIER:2, 'FÉVRIER':2, MARS:3, AVRIL:4, MAI:5, JUIN:6,
  JUILLET:7, 'AOÛT':8, AOUT:8, SEPTEMBRE:9, OCTOBRE:10, NOVEMBRE:11, DECEMBRE:12, 'DÉCEMBRE':12,
}

function parseDateFromHeader(header, year) {
  if (!header) return null
  const s = String(header).trim().toUpperCase()
  // Format français : "LUNDI 30 MARS", "MERCREDI 1ER AVRIL", "24 MARS"
  const frMatch = s.match(/(\d{1,2})(?:ER|E)?\s+([A-ZÉÛÔÀÂÙÈ]+)/)
  if (frMatch) {
    const day = parseInt(frMatch[1])
    const month = FR_MONTHS[frMatch[2]]
    if (month) {
      const now = new Date()
      let y = year
      if (month < now.getMonth() + 1 - 1) y = year + 1
      const d = new Date(y, month - 1, day)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
  // Format DD.MM ou DD/MM (ex: "24.03", "LUN 24.03")
  const dmMatch = s.match(/(\d{1,2})[./](\d{1,2})/)
  if (dmMatch) {
    const day = parseInt(dmMatch[1])
    const month = parseInt(dmMatch[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const now = new Date()
      let y = year
      if (month < now.getMonth() + 1 - 1) y = year + 1
      const d = new Date(y, month - 1, day)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
  // Format YYYY-MM-DD (ISO)
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  return null
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

function parseHBSheet(ws, rows, profiles) {
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
    // Colonne grisée = jour férié
    if (isColumnGrayed(ws, day.colIdx)) {
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: 'Journée', excelName: '🔴 Jour férié',
        type: 'day_closure', roomId: null, profile: null,
      })
      continue
    }
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

// Vérifie si une colonne est grisée (= jour férié dans le fichier Excel)
function isColumnGrayed(ws, colIdx, headerRowIdx = 0) {
  const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c: colIdx })
  const cell = ws[cellRef]
  if (!cell?.s) return false
  const fill = cell.s.fill ?? {}
  const rgb = fill.fgColor?.rgb ?? fill.bgColor?.rgb
  if (!rgb || rgb.length < 6) return false
  const r = parseInt(rgb.slice(-6, -4), 16)
  const g = parseInt(rgb.slice(-4, -2), 16)
  const b = parseInt(rgb.slice(-2), 16)
  // Gris = R≈G≈B, pas blanc (255) et pas noir (<40)
  const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 80 && r < 230
  return isGray
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
  const grayedCols = new Set(days.filter(d => isColumnGrayed(ws, d.colIdx)).map(d => d.colIdx))

  for (const day of days) {
    // Colonne grisée = jour férié
    if (grayedCols.has(day.colIdx)) {
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: 'Journée', excelName: '🔴 Jour férié',
        type: 'day_closure', roomId: null, profile: null,
      })
      continue
    }

    // Rows définis (superviseur, affectations, souhait/remarque)
    for (const { rowIdx, type, label, roomId } of DU_ROWS) {
      const raw = String(rows[rowIdx]?.[day.colIdx] ?? '').trim()
      if (!raw) continue
      if (type === 'day_note') {
        entries.push({
          date: day.date, dayLabel: day.header,
          rowLabel: label, excelName: raw,
          type: 'day_note', roomId: null, profile: null, noteText: raw,
        })
      } else {
        entries.push({
          date: day.date, dayLabel: day.header,
          rowLabel: label, excelName: raw,
          profile: matchProfile(raw, profiles),
          type, roomId,
        })
      }
    }
  }

  // Effectif Julliard — toutes les lignes non traitées avec un nom dans les colonnes jours
  const handledRowIdxs = new Set(DU_ROWS.map(r => r.rowIdx))
  for (let rowIdx = 1; rowIdx < Math.min(rows.length, 25); rowIdx++) {
    if (handledRowIdxs.has(rowIdx)) continue
    const row = rows[rowIdx] ?? []
    const colA = String(row[0] ?? '').trim()
    // Ignorer les lignes de salles (col A = numéro de salle)
    const roomIdA = parseInt(colA)
    if (!isNaN(roomIdA) && roomIdA >= 9 && roomIdA <= 14) continue
    for (const day of days) {
      if (grayedCols.has(day.colIdx)) continue
      const raw = String(row[day.colIdx] ?? '').trim()
      if (!raw) continue
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: 'Effectif', excelName: raw,
        profile: matchProfile(raw, profiles),
        type: 'presence', roomId: null,
      })
    }
  }

  // Room schedule rows — salles 10-14 uniquement
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    const roomId = parseInt(String(row[0] ?? '').trim())
    if (isNaN(roomId) || roomId < 10 || roomId > 14) continue
    for (const day of days) {
      if (grayedCols.has(day.colIdx)) continue
      const cell = String(row[day.colIdx] ?? '').trim()
      const black = isCellBlack(ws, day.colIdx, rowIdx)
      if (!cell || black) {
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
          type: 'schedule', roomId, activity, closingTime, profile: null,
        })
      }
    }
  }

  return { entries, weekLabel: String(headerRow[0] ?? '') }
}

function parseBOUSheet(wb, feuil1Rows, profiles, sectorId = 'bou') {
  const SECTOR_ROWS = sectorId === 'traumatologie' ? TRAUMATO_ROWS
                   : sectorId === 'prevost'        ? PREVOST_ROWS
                   : BOU_ROWS
  // 1. Lire mois/année depuis HEBDO_REMPLI row 0 col 0 = "Semaine du 23 au 29 mars 2026"
  let month = new Date().getMonth() + 1
  let year  = new Date().getFullYear()
  let weekLabel = 'BOU'
  const hebdoWs = wb.Sheets['HEBDO_REMPLI']
  if (hebdoWs) {
    const hebdoRows = XLSX.utils.sheet_to_json(hebdoWs, { header: 1, defval: '', raw: false })
    const cell = String(hebdoRows[0]?.[0] ?? '')
    weekLabel = cell
    const lower = cell.toLowerCase()
    const yearMatch = lower.match(/(\d{4})/)
    if (yearMatch) year = parseInt(yearMatch[1])
    // Trouver le/les mois mentionnés (prendre le dernier = fin de semaine)
    let lastPos = -1
    for (const [name, num] of Object.entries(FR_MONTHS)) {
      const pos = lower.indexOf(name.toLowerCase())
      if (pos > lastPos) { lastPos = pos; month = num }
    }
  }

  // 2. Parser les jours depuis Feuil1 row 0 cols 1-5 (B-F) = "Lundi 23", "Mardi 24"…
  const headerRow = feuil1Rows[0] ?? []
  const days = []
  for (let colIdx = 1; colIdx <= 5; colIdx++) {
    const header = String(headerRow[colIdx] ?? '').trim()
    if (!header) continue
    const dayMatch = header.match(/(\d+)/)
    if (!dayMatch) continue
    const day = parseInt(dayMatch[1])
    // Pour les semaines chevauchant deux mois : si day est très petit, c'est le mois suivant
    const m = (days.length > 0 && day < days[days.length - 1].dayNum) ? (month % 12) + 1 : month
    const date = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    days.push({ colIdx, header, date, dayNum: day })
  }
  if (days.length === 0) return null

  const feuil1Ws = wb.Sheets['Feuil1'] ?? wb.Sheets[Object.keys(wb.Sheets)[1]]
  const entries = []
  const grayedCols = new Set(days.filter(d => isColumnGrayed(feuil1Ws, d.colIdx)).map(d => d.colIdx))

  for (const day of days) {
    if (grayedCols.has(day.colIdx)) {
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: 'Journée', excelName: '🔴 Jour férié',
        type: 'day_closure', roomId: null, profile: null,
      })
      continue
    }
    for (const { rowIdx, type, label, roomId } of SECTOR_ROWS) {
      const raw = String(feuil1Rows[rowIdx]?.[day.colIdx] ?? '')
        .trim().replace(/\s*\(.*?\)\s*/g, '').trim() // strip (AM) (PM)
      if (!raw) continue
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: label, excelName: raw,
        profile: matchProfile(raw, profiles),
        type, roomId, sectorId,
      })
    }
  }

  return { entries, weekLabel }
}

// AMOPA : feuille "semaine", semaine ISO en A0, jours Lun-Ven en cols D-H (indices 3-7)
function parseAMOPASheet(ws, rows, profiles) {
  const headerRow = rows[0] ?? []
  const weekNum = parseInt(String(headerRow[0] ?? '').trim())
  if (isNaN(weekNum)) return null
  const year = new Date().getFullYear()

  // Calcul du lundi de la semaine ISO
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const startW1 = new Date(jan4)
  startW1.setDate(jan4.getDate() - dow + 1)
  const monday = new Date(startW1)
  monday.setDate(startW1.getDate() + (weekNum - 1) * 7)

  // Colonnes Lundi–Vendredi : D=3, E=4, F=5, G=6, H=7
  const days = [0, 1, 2, 3, 4].map(i => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const colIdx = i + 3
    const header = String(headerRow[colIdx] ?? '').trim()
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return { colIdx, date, header }
  }).filter(d => d.header)

  if (days.length === 0) return null

  const AMOPA_SECTORS = ['orl-maxfa-plastie', 'bocha-amopa', 'antalgie']
  const entries = []

  for (const day of days) {
    if (isColumnGrayed(ws, day.colIdx)) {
      // Jour férié pour chaque secteur AMOPA
      for (const sid of AMOPA_SECTORS) {
        entries.push({ date: day.date, dayLabel: day.header, rowLabel: 'Journée',
          excelName: '🔴 Jour férié', type: 'day_closure', roomId: null, profile: null, sectorId: sid })
      }
      continue
    }
    for (const { rowIdx, type, label, roomId, sectorId } of ALL_AMOPA_ROWS) {
      const raw = String(rows[rowIdx]?.[day.colIdx] ?? '').trim()
      if (!raw || raw === '?') continue
      entries.push({
        date: day.date, dayLabel: day.header,
        rowLabel: label, excelName: raw,
        profile: matchProfile(raw, profiles),
        type, roomId, sectorId,
      })
    }
  }

  return { entries, weekLabel: `Semaine ${weekNum}` }
}

export default function ImportPlanningModal({ profiles, sector, unit, theme, onClose, onImported }) {
  const T = theme ?? WARM
  const { profile: currentProfile } = useAuth()
  const [step, setStep] = useState('upload')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const inputRef = useRef(null)

  // Modes d'import
  const isDuhbImport  = unit?.id === 'duhb'
  const isUnitImport  = unit?.id === 'unicat'
  const isAmopaImport = unit?.id === 'amopa'
  const isSinpiImport = unit?.id === 'sinpi' || sector?.id === 'sinpi'
  const isAmopaSector = ['bocha-amopa', 'orl-maxfa-plastie', 'antalgie'].includes(sector?.id)
  const isAmopaAny    = isAmopaImport || isAmopaSector
  const isJulliard    = sector?.id === 'julliard'
  const isFeuil1      = isUnitImport || ['bou', 'traumatologie', 'prevost'].includes(sector?.id)
  const sectorLabel   = isSinpiImport ? 'SINPI'
                      : isDuhbImport  ? 'DUHB'
                      : isUnitImport  ? 'UNICAT'
                      : isAmopaImport ? 'AMOPA'
                      : isJulliard    ? 'Julliard'
                      : isAmopaSector ? (sector?.name ?? 'AMOPA')
                      : isFeuil1      ? (sector?.name ?? 'BOU')
                      : 'HB'
  const sheetName     = isSinpiImport ? 'HEBDO_REMPLI'
                      : isAmopaAny    ? 'semaine'
                      : isJulliard    ? 'DU'
                      : isFeuil1      ? 'Feuil1'
                      : 'HB'

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellStyles: true })

      // Sélection de l'onglet selon le mode
      let targetSheet
      if (isSinpiImport) {
        targetSheet = wb.SheetNames.find(n => n.toUpperCase().includes('HEBDO'))
          ?? wb.SheetNames[0]
      } else if (isAmopaAny) {
        // Feuille "semaine" (avec éventuel espace en trop)
        targetSheet = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SEMAINE')
          ?? wb.SheetNames.find(n => n.trim().toUpperCase().includes('SEMAINE'))
      } else if (isFeuil1) {
        // BOU/Traumato/Prévost : 2ème onglet (peu importe son nom)
        targetSheet = wb.SheetNames[1] ?? wb.SheetNames[0]
      } else {
        targetSheet = wb.SheetNames.find(n => n.toUpperCase() === sheetName.toUpperCase())
          ?? wb.SheetNames.find(n => n.toUpperCase().includes(sheetName.toUpperCase()))
      }
      if (!targetSheet) {
        setError(`Onglet "${sheetName}" introuvable dans ce fichier. Onglets disponibles : ${wb.SheetNames.join(', ')}`)
        return
      }

      const ws = wb.Sheets[targetSheet]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })

      let result
      if (isSinpiImport) {
        result = parseSINPISheet(ws, rows, profiles)
      } else if (isAmopaAny) {
        result = parseAMOPASheet(ws, rows, profiles)
      } else if (isJulliard) {
        result = parseDUSheet(ws, rows, profiles)
      } else if (isDuhbImport) {
        // Import tout DUHB : HB (onglet courant) + Julliard (onglet DU)
        const hbResult = parseHBSheet(ws, rows, profiles)
        const hbEntries = (hbResult?.entries ?? []).map(e => ({ ...e, sectorId: 'hors-bloc' }))
        const duSheetName = wb.SheetNames.find(n => n.toUpperCase() === 'DU')
          ?? wb.SheetNames.find(n => n.toUpperCase().includes('DU'))
        const duEntries = []
        if (duSheetName) {
          const duWs = wb.Sheets[duSheetName]
          const duRows = XLSX.utils.sheet_to_json(duWs, { header: 1, defval: '', raw: false })
          const duResult = parseDUSheet(duWs, duRows, profiles)
          if (duResult) duEntries.push(...duResult.entries.map(e => ({ ...e, sectorId: 'julliard' })))
        }
        const allEntries = [...hbEntries, ...duEntries]
        result = allEntries.length > 0 ? { entries: allEntries, weekLabel: hbResult?.weekLabel ?? 'DUHB' } : null
      } else if (isUnitImport) {
        // Import tout UNICAT : fusionner BOU + Traumatologie + Prévost
        const bouResult     = parseBOUSheet(wb, rows, profiles, 'bou')
        const traumaResult  = parseBOUSheet(wb, rows, profiles, 'traumatologie')
        const prevostResult = parseBOUSheet(wb, rows, profiles, 'prevost')
        if (!bouResult) { result = null } else {
          const allEntries = [
            ...bouResult.entries,
            ...traumaResult?.entries ?? [],
            ...prevostResult?.entries ?? [],
          ]
          result = { entries: allEntries, weekLabel: bouResult.weekLabel }
        }
      } else if (isFeuil1) {
        result = parseBOUSheet(wb, rows, profiles, sector?.id)
      } else {
        result = parseHBSheet(ws, rows, profiles)
      }

      if (!result) {
        const headerRow = rows[0] ?? []
        const preview = headerRow.slice(0, 6).map((v, i) => `[${i}]=${JSON.stringify(v)}`).join(' ')
        setError(`Impossible de lire les dates dans l'onglet ${sheetName}. En-tête: ${preview}`)
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

    // 0. Jours fériés
    for (const entry of preview.entries.filter(e => e.type === 'day_closure')) {
      if (!entry.date) continue
      try {
        const { error } = await supabase.from('day_closures').upsert(
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'hors-bloc', label: 'Jour férié', closed_by: currentProfile?.id },
          { onConflict: 'date,unit_id' }
        )
        if (error) errors.push(`Jour férié ${entry.date}: ${error.message}`)
      } catch (e) { errors.push(e.message) }
    }

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
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'hors-bloc', user_id: entry.profile.id, assigned_by: currentProfile?.id },
          { onConflict: 'date,unit_id' }
        )
        if (error) errors.push(`Superviseur ${entry.date}: ${error.message}`)
        // Aussi marquer comme présent dans l'unité
        await supabase.from('unit_presence').upsert(
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'hors-bloc', user_id: entry.profile.id, added_by: currentProfile?.id },
          { onConflict: 'date,unit_id,user_id' }
        )
      } catch (e) { errors.push(e.message) }
    }

    // 3. Affectations + présence unité
    for (const entry of preview.entries.filter(e => e.type === 'assignment')) {
      if (!entry.date || !entry.profile || !entry.roomId) continue
      try {
        // Marquer comme présent dans l'unité
        await supabase.from('unit_presence').upsert(
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'hors-bloc', user_id: entry.profile.id, added_by: currentProfile?.id },
          { onConflict: 'date,unit_id,user_id' }
        )
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

    // 5. Présence effectif Julliard (noms sans salle spécifique)
    for (const entry of preview.entries.filter(e => e.type === 'presence')) {
      if (!entry.date || !entry.profile) continue
      try {
        await supabase.from('unit_presence').upsert(
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'julliard', user_id: entry.profile.id, added_by: currentProfile?.id },
          { onConflict: 'date,unit_id,user_id' }
        )
      } catch (e) { /* silencieux - doublons normaux */ }
    }

    // 6. Souhaits / Remarques → day_notes
    for (const entry of preview.entries.filter(e => e.type === 'day_note')) {
      if (!entry.date || !entry.noteText) continue
      try {
        const { error } = await supabase.from('day_notes').upsert(
          { date: entry.date, unit_id: entry.sectorId ?? sector?.id ?? 'julliard', content: entry.noteText },
          { onConflict: 'date,unit_id' }
        )
        if (error) errors.push(`Souhait/Remarque ${entry.date}: ${error.message}`)
      } catch (e) { errors.push(e.message) }
    }

    setImportErrors(errors)
    setStep('done')
    if (errors.length === 0) onImported?.()
  }

  const personEntries   = preview?.entries.filter(e => e.type !== 'schedule' && e.type !== 'closure' && e.type !== 'day_closure' && e.type !== 'day_note' && e.type !== 'presence') ?? []
  const presenceEntries = preview?.entries.filter(e => e.type === 'presence') ?? []
  const scheduleEntries = preview?.entries.filter(e => e.type === 'schedule') ?? []
  const closureEntries  = preview?.entries.filter(e => e.type === 'closure') ?? []
  const dayClosureEntries = preview?.entries.filter(e => e.type === 'day_closure') ?? []
  const dayNoteEntries  = preview?.entries.filter(e => e.type === 'day_note') ?? []
  const matchedCount    = personEntries.filter(e => e.profile).length
  const unmatchedCount  = personEntries.filter(e => e.excelName && !e.profile && e.type !== 'day_note').length
  const presenceMatchedCount = presenceEntries.filter(e => e.profile).length
  const presenceUnmatchedCount = presenceEntries.filter(e => e.excelName && !e.profile).length
  const dates = preview ? [...new Set(preview.entries.map(e => e.date))] : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div style={{ background: T.cardHead, borderColor: T.border }}
          className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} style={{ color: T.accentBar }} />
            <span className="font-bold text-sm" style={{ color: T.text }}>Import planning {sectorLabel}</span>
            {preview && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: T.surface, color: T.textSub }}>
                {preview.weekLabel}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }} className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* STEP: upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div style={{ background: T.surface, borderColor: T.border }}
                className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center">
                <Upload size={32} style={{ color: T.accentBar }} />
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: T.text }}>Sélectionner le planning Excel</p>
                <p className="text-sm mt-1" style={{ color: T.textFaint }}>
                  Fichier .xlsx avec un onglet «&nbsp;{sheetName}&nbsp;»
                </p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              <button onClick={() => inputRef.current?.click()}
                style={{ background: T.accentBar }}
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
              <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: T.surface }}>
                {matchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{matchedCount} affecté(s)</span>
                  </div>
                )}
                {presenceMatchedCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{presenceMatchedCount} effectif</span>
                  </div>
                )}
                {(unmatchedCount + presenceUnmatchedCount) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span className="text-sm text-amber-600">{unmatchedCount + presenceUnmatchedCount} non trouvé(s)</span>
                  </div>
                )}
                {scheduleEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{scheduleEntries.length} horaire(s)</span>
                  </div>
                )}
                {closureEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{closureEntries.length} fermeture(s)</span>
                  </div>
                )}
                {dayClosureEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{dayClosureEntries.length} jour(s) férié(s)</span>
                  </div>
                )}
                {dayNoteEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-sm font-semibold" style={{ color: T.text }}>{dayNoteEntries.length} remarque(s)</span>
                  </div>
                )}
                <span className="text-xs ml-auto" style={{ color: T.textFaint }}>{dates.length} jour(s)</span>
              </div>

              {/* Per-day tables */}
              <div className="space-y-4">
                {dates.map(date => {
                  const dayPerson  = personEntries.filter(e => e.date === date)
                  const daySched   = scheduleEntries.filter(e => e.date === date)
                  const dayClose   = closureEntries.filter(e => e.date === date)
                  const dayDayCls  = dayClosureEntries.filter(e => e.date === date)
                  const dayNotes   = dayNoteEntries.filter(e => e.date === date)
                  const allDay     = [...dayDayCls, ...dayPerson, ...daySched, ...dayClose, ...dayNotes]
                  const label     = allDay[0]?.dayLabel ?? date
                  return (
                    <div key={date}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-0.5"
                        style={{ color: T.accent }}>{label}</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.border }}>
                        {allDay.map((entry, i) => (
                          <div key={i}
                            style={{
                              borderColor: T.border,
                              background: i % 2 === 0 ? T.cardBg : T.surface,
                            }}
                            className={`flex items-center gap-3 px-3 py-2 text-xs ${i > 0 ? 'border-t' : ''}`}>
                            <span className="w-24 flex-shrink-0 font-medium" style={{ color: T.textFaint }}>
                              {entry.rowLabel}
                            </span>
                            <span className="w-28 flex-shrink-0 font-mono" style={{ color: T.textSub }}>
                              {entry.excelName}
                            </span>
                            <span style={{ color: T.textFaint }} className="flex-shrink-0">→</span>
                            {entry.type === 'day_closure' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                <span className="text-orange-600 font-medium">Jour férié — journée fermée</span>
                              </div>
                            ) : entry.type === 'closure' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-red-500 font-medium">Salle fermée</span>
                              </div>
                            ) : entry.type === 'schedule' ? (
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                                <span style={{ color: T.text }}>
                                  {entry.activity}
                                  {entry.closingTime && (
                                    <span style={{ color: T.textFaint }}> · ferme {entry.closingTime}</span>
                                  )}
                                </span>
                              </div>
                            ) : entry.type === 'day_note' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                <span className="italic" style={{ color: T.textSub }}>{entry.noteText}</span>
                              </div>
                            ) : entry.profile ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="font-medium" style={{ color: T.text }}>
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
                style={{ borderColor: T.surface, borderTopColor: T.accentBar }} />
              <p className="text-sm" style={{ color: T.textSub }}>Import en cours...</p>
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
                  <p className="font-semibold" style={{ color: T.text }}>Import terminé !</p>
                  <p className="text-sm" style={{ color: T.textSub }}>
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
                  <p className="text-xs text-center" style={{ color: T.textFaint }}>
                    Copiez ces messages pour diagnostiquer le problème Supabase.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'done') && (
          <div className="px-5 pb-4 pt-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: T.border }}>
            {step === 'preview' ? (
              <>
                <button onClick={() => { setStep('upload'); setPreview(null); setError(null) }}
                  style={{ background: T.surface, color: T.textSub }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity">
                  ← Retour
                </button>
                <button onClick={handleConfirm} disabled={matchedCount === 0 && scheduleEntries.length === 0 && presenceMatchedCount === 0}
                  style={{ background: T.accentBar }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                  Importer
                </button>
              </>
            ) : (
              <button onClick={onClose}
                style={{ background: T.accentBar }}
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
