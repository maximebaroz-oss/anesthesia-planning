import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, ChevronDown, X, FileSpreadsheet, FileText, CalendarOff, CalendarCheck, Users, BookOpen, Trash2, Undo2, Redo2 } from 'lucide-react'
import ImportPlanningModal from '../components/ImportPlanningModal'
import DocumentsModal from '../components/DocumentsModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import RoomCard from '../components/RoomCard'
import { WARM as WARM_THEME, SKY as SKY_THEME, AMBER as AMBER_THEME, SLATE as SLATE_THEME, BLUSH as BLUSH_THEME, FUCHSIA as FUCHSIA_THEME, PURPLE as PURPLE_THEME, HOTPINK as HOTPINK_THEME, ROSEWOOD as ROSEWOOD_THEME, SALMON as SALMON_THEME, YELLOW as YELLOW_THEME, LIME as LIME_THEME, MAUVE as MAUVE_THEME, SOFTGREEN as SOFTGREEN_THEME, GRAY as GRAY_THEME } from '../config/theme'
import { ROOM_NAMES, DAY_NAMES, DAY_NAMES_7, GRADE_LABELS, getCurrentTime, getMonday, getWeekDays, getFullWeekDays, getISOWeek, formatDateKey, formatLastFirst, getLastName } from '../config/constants'
import AssignModal from '../components/AssignModal'
import ProfileModal from '../components/ProfileModal'
import Sidebar from '../components/Sidebar'
import ImportPlanningPDFModal from '../components/ImportPlanningPDFModal'

const WARM = WARM_THEME

function SupervisorCard({ date, allProfiles, canManage, sectorId, sectorLabel, theme }) {
  const T = theme ?? WARM
  const { profile: currentProfile } = useAuth()
  const [supervisor, setSupervisor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)

  // Fetch supervisor for this date + unit
  useEffect(() => {
    setLoading(true)
    supabase.from('supervisors').select('user_id, profiles!supervisors_user_id_fkey(*)')
      .eq('date', date).eq('unit_id', sectorId).maybeSingle()
      .then(({ data }) => {
        setSupervisor(data?.profiles ?? null)
        setLoading(false)
      })
  }, [date, sectorId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function assignSupervisor(profile) {
    await supabase.from('supervisors').upsert(
      { date, unit_id: sectorId, user_id: profile.id, assigned_by: currentProfile?.id },
      { onConflict: 'date,unit_id' }
    )
    setSupervisor(profile)
    setOpen(false)
    setSearch('')
  }

  async function removeSupervisor() {
    await supabase.from('supervisors').delete().eq('date', date).eq('unit_id', sectorId)
    setSupervisor(null)
  }

  const medecins = allProfiles.filter(p => p.profession === 'medecin' &&
    (p.grade === 'adjoint' || p.grade === 'chef_clinique'))
  const filtered = medecins.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ background: T.cardBg, borderColor: T.border, boxShadow: '0 2px 12px rgba(180,130,60,0.08)' }}
      className="rounded-2xl border overflow-visible mb-3">
      <div style={{ background: T.cardHead, borderColor: T.border }}
        className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b">
        <span style={{ background: T.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
        <ShieldCheck size={14} style={{ color: T.accentBar }} />
        <span className="font-bold text-sm" style={{ color: T.text }}>Superviseur {sectorLabel}</span>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        {loading ? (
          <span className="text-sm italic" style={{ color: T.textFaint }}>Chargement...</span>
        ) : supervisor ? (
          <>
            <div style={{ background: T.surface, borderColor: T.border }}
              className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2 border">
              <div style={{ background: T.accentBar }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {supervisor.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  Dr. {formatLastFirst(supervisor.full_name)}
                </p>
                <p className="text-xs" style={{ color: T.textFaint }}>
                  {supervisor.grade === 'adjoint' ? 'Adjoint' : 'Chef de clinique'}
                </p>
              </div>
            </div>
            {canManage && (
              <button onClick={removeSupervisor}
                style={{ color: T.textFaint }}
                className="p-1.5 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <span className="text-sm italic" style={{ color: T.textFaint }}>Aucun superviseur assigné</span>
        )}

        {canManage && (
          <div className="relative flex-shrink-0" ref={dropRef}>
            <button onClick={() => { setOpen(v => !v); setSearch('') }}
              style={{ background: T.accentBar }}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
              {supervisor ? 'Changer' : 'Assigner'}
              <ChevronDown size={14} />
            </button>

            {open && (
              <div style={{ background: T.cardBg, borderColor: T.border }}
                className="absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b" style={{ borderColor: T.border }}>
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    style={{ background: T.surface, borderColor: T.border, color: T.text }}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border focus:outline-none placeholder-gray-400"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: T.textFaint }}>Aucun résultat</p>
                  ) : filtered.map(p => (
                    <button key={p.id} onClick={() => assignSupervisor(p)}
                      style={{ color: T.text }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-70 transition-opacity flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: T.accentBar, color: '#fff' }}>
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium">Dr. {formatLastFirst(p.full_name)}</span>
                        <span className="text-xs ml-1.5" style={{ color: T.textFaint }}>
                          {p.grade === 'adjoint' ? 'Adj.' : 'CDC'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PiquetCard({ date, assignments, allProfiles, canManage, theme, onRefresh }) {
  const T = theme ?? WARM
  const { profile: currentProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)

  const PIQUET_ROOM = 85
  const piquetAsgn = assignments.find(a => a.room_id === PIQUET_ROOM)
  const assignee   = piquetAsgn?.profiles ?? null

  useEffect(() => {
    function handleClick(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function assign(p) {
    if (piquetAsgn?.id) {
      await supabase.from('assignments').delete().eq('id', piquetAsgn.id)
    }
    await supabase.from('assignments').insert({
      date, room_id: PIQUET_ROOM, user_id: p.id, assigned_by: currentProfile?.id
    })
    setOpen(false); setSearch('')
    onRefresh?.()
  }

  async function remove() {
    if (piquetAsgn?.id) await supabase.from('assignments').delete().eq('id', piquetAsgn.id)
    onRefresh?.()
  }

  const options = allProfiles.filter(p =>
    p.profession === 'medecin' && p.grade === 'adjoint' &&
    (!search || p.full_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ background: T.cardBg, borderColor: T.border, boxShadow: '0 2px 12px rgba(180,130,60,0.08)' }}
      className="rounded-2xl border overflow-visible mb-3">
      <div style={{ background: T.cardHead, borderColor: T.border }}
        className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b">
        <span style={{ background: T.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
        <span className="font-bold text-sm" style={{ color: T.text }}>Piquet Adjoint</span>
      </div>
      <div className="px-4 py-3 flex items-center gap-3">
        {assignee ? (
          <>
            <div style={{ background: T.surface, borderColor: T.border }}
              className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2 border">
              <div style={{ background: T.accentBar }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {assignee.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>Dr. {formatLastFirst(assignee.full_name)}</p>
                <p className="text-xs" style={{ color: T.textFaint }}>Adjoint</p>
              </div>
            </div>
            {canManage && (
              <button onClick={remove} style={{ color: T.textFaint }}
                className="p-1.5 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <span className="flex-1 text-sm italic" style={{ color: T.textFaint }}>Aucun adjoint assigné</span>
        )}

        {canManage && (
          <div className="relative flex-shrink-0" ref={dropRef}>
            <button onClick={() => { setOpen(v => !v); setSearch('') }}
              style={{ background: T.accentBar }}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
              {assignee ? 'Changer' : 'Assigner'} <ChevronDown size={14} />
            </button>
            {open && (
              <div style={{ background: T.cardBg, borderColor: T.border }}
                className="absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b" style={{ borderColor: T.border }}>
                  <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..." style={{ background: T.surface, borderColor: T.border, color: T.text }}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border focus:outline-none placeholder-gray-400" />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {options.length === 0
                    ? <p className="text-xs text-center py-3" style={{ color: T.textFaint }}>Aucun résultat</p>
                    : options.map(p => (
                      <button key={p.id} onClick={() => assign(p)} style={{ color: T.text }}
                        className="w-full text-left px-3 py-2 text-sm hover:opacity-70 transition-opacity flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: T.accentBar, color: '#fff' }}>
                          {p.full_name.charAt(0)}
                        </div>
                        <span className="font-medium">Dr. {formatLastFirst(p.full_name)}</span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Salles sans ISA
const NO_ISA_ROOMS = new Set([9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  // SINPI
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85])

const SECTOR_ROOMS = {
  'hors-bloc':         [1, 2, 3, 4, 5, 6, 7, 8, 9],
  'julliard':          [10, 11, 12, 13, 14, 15, 16, 17],
  'bou':               [18, 19, 20, 21, 22],
  'traumatologie':     [23, 36, 37, 24],
  'prevost':           [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
  // Maternité
  'gyneco':            [57, 58, 59, 60, 61, 62, 63],
  'obstetrique':       [64, 65, 66, 67, 68, 69, 70, 71, 72],
  'ophtalmo':          [73],
  // SINPI
  'sinpi':             [74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85],
  // BOCHA (AMOPA)
  'bocha-amopa':       [38, 39, 40, 41, 42],
  'orl-maxfa-plastie': [43, 44, 45, 46, 47, 48, 49],
  'antalgie':          [50, 51, 52, 53, 54, 55, 56],
}


// Horaires par défaut — salle 8 (Tardif) : pas d'ouverture, fermeture 19h
const DEFAULT_SCHEDULES = {
  1:  { opening_time: '07:00', closing_time: '16:00' },
  2:  { opening_time: '07:00', closing_time: '16:00' },
  3:  { opening_time: '07:00', closing_time: '16:00' },
  4:  { opening_time: '07:00', closing_time: '16:00' },
  5:  { opening_time: '07:00', closing_time: '16:00' },
  6:  { opening_time: '07:00', closing_time: '16:00' },
  7:  { opening_time: '07:00', closing_time: '16:00' },
  8:  { opening_time: null,    closing_time: '19:00' },
  9:  { opening_time: '08:00', closing_time: '16:00' },
  // Julliard
  10: { opening_time: '07:00', closing_time: '16:00' },
  11: { opening_time: '07:00', closing_time: '19:00' },
  12: { opening_time: '07:00', closing_time: '16:00' },
  13: { opening_time: '07:00', closing_time: '17:00' },
  14: { opening_time: '07:00', closing_time: '19:00' },
  15: { opening_time: '08:00', closing_time: '16:00' },
  16: { opening_time: '08:00', closing_time: '16:00' },
  17: { opening_time: '08:00', closing_time: '16:00' },
  // BOU
  18: { opening_time: '07:00', closing_time: '15:00' },
  19: { opening_time: '12:00', closing_time: '20:00' },
  20: { opening_time: '07:00', closing_time: '17:00' },
  21: { opening_time: '09:30', closing_time: '19:30' },
  22: { opening_time: '07:00', closing_time: '17:00' },
  // Traumatologie
  23: { opening_time: '07:00', closing_time: '17:00' },
  24: { opening_time: '10:30', closing_time: '19:00' },
  36: { opening_time: '07:00', closing_time: '17:30' },
  37: { opening_time: '07:00', closing_time: '17:30' },
  // Prévost
  25: { opening_time: '07:00', closing_time: '17:00' },
  26: { opening_time: '07:00', closing_time: '17:00' },
  27: { opening_time: '07:00', closing_time: '17:00' },
  28: { opening_time: '07:00', closing_time: '17:00' },
  29: { opening_time: '07:00', closing_time: '17:00' },
  30: { opening_time: '07:00', closing_time: '17:00' },
  31: { opening_time: '07:00', closing_time: '17:00' },
  32: { opening_time: '12:30', closing_time: '19:00' },
  33: { opening_time: '12:30', closing_time: '19:00' },
  34: { opening_time: '08:00', closing_time: '16:00' },
  35: { opening_time: '08:00', closing_time: '16:00' },
  // BOCHA (AMOPA)
  38: { opening_time: '07:30', closing_time: '15:30' },
  39: { opening_time: '07:30', closing_time: '17:30' },
  40: { opening_time: '07:00', closing_time: '17:00' },
  41: { opening_time: '07:00', closing_time: '17:00' },
  42: { opening_time: '13:30', closing_time: '17:30' },
  // ORL/MAX-FA/Plastie (AMOPA)
  43: { opening_time: '07:30', closing_time: '16:00' },
  44: { opening_time: '07:30', closing_time: '16:00' },
  45: { opening_time: '07:00', closing_time: '17:00' },
  46: { opening_time: '07:00', closing_time: '17:00' },
  47: { opening_time: '07:00', closing_time: '17:00' },
  48: { opening_time: '11:00', closing_time: '19:00' },
  49: { opening_time: '07:30', closing_time: '16:00' },
  // Antalgie (AMOPA) — boxes chroniques sans horaire par défaut
  50: { opening_time: '09:00', closing_time: '19:00' },
  51: { opening_time: '09:00', closing_time: '19:00' },
  52: { opening_time: '09:00', closing_time: '19:00' },
  // rooms 53-56 (Antalgie chronique boxes) : pas d'horaire par défaut → null
  // Gynéco
  57: { opening_time: '07:00', closing_time: '16:00' },
  58: { opening_time: '07:00', closing_time: '17:00' },
  59: { opening_time: '07:00', closing_time: '16:00' },
  60: { opening_time: '12:00', closing_time: '20:00' },
  61: { opening_time: '09:00', closing_time: '19:00' },
  62: { opening_time: '07:00', closing_time: '17:00' },
  63: { opening_time: '07:00', closing_time: '17:00' },
  // Obstétrique
  64: { opening_time: '07:00', closing_time: '17:00' },
  65: { opening_time: '07:00', closing_time: '17:00' },
  66: { opening_time: '07:00', closing_time: '17:00' },
  67: { opening_time: '10:00', closing_time: '20:00' },
  68: { opening_time: '07:00', closing_time: '20:00' },
  69: { opening_time: '07:00', closing_time: '20:00' },
  70: { opening_time: '19:30', closing_time: '07:30' },
  71: { opening_time: '19:30', closing_time: '07:30' },
  // Ophtalmo
  73: { opening_time: '07:00', closing_time: '17:00' },
  // SINPI
  74: { opening_time: '07:00', closing_time: '16:00' },
  75: { opening_time: '07:00', closing_time: '16:00' },
  76: { opening_time: '07:00', closing_time: '16:00' },
  77: { opening_time: '13:00', closing_time: '22:00' },
  78: { opening_time: '11:00', closing_time: '21:00' },
  79: { opening_time: '07:00', closing_time: '17:00' },
  80: { opening_time: '12:00', closing_time: '22:00' },
  81: { opening_time: '21:30', closing_time: '07:30' },
  82: { opening_time: '07:00', closing_time: '19:30' },
  83: { opening_time: '07:00', closing_time: '17:00' },
  84: { opening_time: '19:00', closing_time: '07:30' },
  // 85 PA : pas d'horaire fixe
}



function SouhaitsCard({ date, sectorId, canEdit, theme }) {
  const T = theme
  const [note, setNote] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!date || !sectorId) return
    supabase.from('day_notes').select('*').eq('date', date).eq('unit_id', sectorId).maybeSingle()
      .then(({ data }) => setNote(data ?? null))
  }, [date, sectorId])

  async function save() {
    const { data } = await supabase.from('day_notes').upsert(
      { date, unit_id: sectorId, content: draft },
      { onConflict: 'date,unit_id' }
    ).select().maybeSingle()
    setNote(data)
    setEditing(false)
  }

  function startEdit() { setDraft(note?.content ?? ''); setEditing(true) }

  return (
    <div style={{ background: T.cardBg, borderColor: T.border, boxShadow: '0 2px 12px rgba(180,130,60,0.08)' }}
      className="rounded-2xl border overflow-hidden flex flex-col">
      <div style={{ background: T.cardHead, borderColor: T.border }}
        className="px-3 pt-3 pb-2.5 flex items-center justify-between gap-2 border-b">
        <div className="flex items-center gap-2">
          <span style={{ background: T.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
          <span className="font-bold text-sm" style={{ color: T.text }}>Souhait / Remarque</span>
        </div>
        {canEdit && !editing && (
          <button onClick={startEdit}
            className="text-xs px-2.5 py-1 rounded-lg font-medium hover:opacity-80 transition-opacity"
            style={{ background: T.surface, color: T.accent }}>
            Modifier
          </button>
        )}
      </div>
      <div className="px-3 py-3 flex-1">
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={4}
              placeholder="Saisir un souhait ou une remarque..."
              style={{ background: T.surface, borderColor: T.border, color: T.text }}
              className="w-full text-sm px-3 py-2 rounded-xl border resize-none focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: T.surface, color: T.textSub, border: `1px solid ${T.border}` }}>
                Annuler
              </button>
              <button onClick={save}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: T.accentBar }}>
                Enregistrer
              </button>
            </div>
          </div>
        ) : note?.content ? (
          <p className="text-sm whitespace-pre-wrap" style={{ color: T.text }}>{note.content}</p>
        ) : (
          <p className="text-sm italic" style={{ color: T.textFaint }}>
            {canEdit ? 'Cliquer sur Modifier pour ajouter une remarque.' : 'Aucune remarque pour ce jour.'}
          </p>
        )}
      </div>
    </div>
  )
}

function EffectifModal({ assignments, allProfiles, rooms, roomNames, sectorId, dateLabel, selectedDate, canManage, currentProfile, theme, onClose, onRefresh }) {
  const T = theme
  const [adding, setAdding] = useState(null)
  const [presence, setPresence] = useState([])
  const sectorAssignments = assignments.filter(a => rooms.includes(a.room_id))
  const medecins   = allProfiles.filter(p => p.profession === 'medecin')
  const infirmiers = allProfiles.filter(p => p.profession === 'infirmier')

  useEffect(() => {
    if (!selectedDate || !sectorId) return
    Promise.all([
      supabase.from('unit_presence').select('user_id').eq('date', selectedDate).eq('unit_id', sectorId),
      supabase.from('supervisors').select('user_id').eq('date', selectedDate).eq('unit_id', sectorId),
    ]).then(([pres, sup]) => {
      const ids = new Set([
        ...(pres.data?.map(r => r.user_id) ?? []),
        ...(sup.data?.map(r => r.user_id) ?? []),
      ])
      setPresence([...ids])
    })
  }, [selectedDate, sectorId])

  function getAssignments(userId) { return sectorAssignments.filter(a => a.user_id === userId) }
  function isPresent(userId) { return presence.includes(userId) }
  function getRoomName(roomId) { return roomNames[roomId] ?? `Salle ${roomId}` }

  async function removeUser(userId) {
    await supabase.from('assignments').delete()
      .eq('user_id', userId).eq('date', selectedDate).in('room_id', rooms)
    await supabase.from('unit_presence').delete()
      .eq('user_id', userId).eq('date', selectedDate).eq('unit_id', sectorId)
    setPresence(p => p.filter(id => id !== userId))
    onRefresh()
  }

  async function addPresenceOnly() {
    if (!adding?.userId) return
    await supabase.from('unit_presence').upsert(
      { date: selectedDate, unit_id: sectorId, user_id: adding.userId, added_by: currentProfile?.id },
      { onConflict: 'date,unit_id,user_id' }
    )
    setPresence(p => [...p, adding.userId])
    setAdding(null)
    onRefresh()
  }

  async function addAssignment() {
    if (!adding?.userId || !adding?.roomId) return
    await supabase.from('unit_presence').upsert(
      { date: selectedDate, unit_id: sectorId, user_id: adding.userId, added_by: currentProfile?.id },
      { onConflict: 'date,unit_id,user_id' }
    )
    const { data: existing } = await supabase.from('assignments').select('id')
      .eq('user_id', adding.userId).eq('room_id', adding.roomId).eq('date', selectedDate).maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: adding.userId, room_id: adding.roomId,
        date: selectedDate, assigned_by: currentProfile?.id,
      })
    }
    setAdding(null)
    onRefresh()
  }

  function PersonLine({ p }) {
    const asgns = getAssignments(p.id)
    const isMed = p.profession === 'medecin'
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ background: T.accentBar }}>
          {p.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
            {isMed ? `Dr. ${p.full_name}` : p.full_name}
          </p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {asgns.length > 0 ? asgns.map(a => (
              <span key={a.id} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: T.accentBar + '22', color: T.accent }}>
                {getRoomName(a.room_id)}
                {a.start_time && <span style={{ opacity: 0.7 }}> · ✓{a.start_time.slice(0,5)}</span>}
              </span>
            )) : (
              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: T.surface, color: T.textFaint }}>
                Présent
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <button onClick={() => removeUser(p.id)}
            className="p-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            style={{ color: T.textFaint }}>
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  function AddPanel({ profession }) {
    const pool = (profession === 'medecin' ? medecins : infirmiers)
      .filter(p => getAssignments(p.id).length === 0 && !isPresent(p.id))
    const search = adding?.search ?? ''
    const filtered = pool.filter(p => p.full_name.toUpperCase().includes(search.toUpperCase()))
    const isMed = profession === 'medecin'

    if (adding?.userId) {
      const person = allProfiles.find(p => p.id === adding.userId)
      return (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: T.border, background: T.surface }}>
          <p className="text-xs font-semibold" style={{ color: T.text }}>
            {isMed ? `Dr. ${person?.full_name}` : person?.full_name} :
          </p>
          <button onClick={addPresenceOnly}
            className="w-full text-xs py-2 rounded-lg font-semibold text-left px-3"
            style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.textSub }}>
            Juste présent (sans salle)
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            {rooms.map(roomId => (
              <button key={roomId} onClick={() => setAdding(a => ({ ...a, roomId }))}
                className="text-xs px-2 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 text-left"
                style={{
                  background: adding?.roomId === roomId ? T.accentBar : T.cardBg,
                  color: adding?.roomId === roomId ? '#fff' : T.text,
                  border: `1px solid ${T.border}`,
                }}>
                {getRoomName(roomId)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAdding(a => ({ ...a, userId: null, roomId: null }))}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: T.surface, color: T.textSub, border: `1px solid ${T.border}` }}>
              ← Retour
            </button>
            <button onClick={addAssignment} disabled={!adding?.roomId}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
              style={{ background: T.accentBar }}>
              Affecter
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: T.border, background: T.surface }}>
        <input autoFocus type="text" placeholder="Rechercher..." value={search}
          onChange={e => setAdding(a => ({ ...a, search: e.target.value }))}
          style={{ background: T.cardBg, borderColor: T.border, color: T.text }}
          className="w-full text-xs px-3 py-1.5 rounded-lg border focus:outline-none" />
        <div className="max-h-36 overflow-y-auto space-y-1">
          {filtered.length === 0
            ? <p className="text-xs italic text-center py-2" style={{ color: T.textFaint }}>Aucun résultat</p>
            : filtered.map(p => (
              <button key={p.id} onClick={() => setAdding(a => ({ ...a, userId: p.id }))}
                className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: T.text }}>
                {isMed ? `Dr. ${p.full_name}` : p.full_name}
              </button>
            ))
          }
        </div>
        <button onClick={() => setAdding(null)}
          className="text-xs w-full text-center" style={{ color: T.textFaint }}>Annuler</button>
      </div>
    )
  }

  function Section({ profession, color, dotColor, label }) {
    const visible = (profession === 'medecin' ? medecins : infirmiers)
      .filter(p => getAssignments(p.id).length > 0 || isPresent(p.id))
    const isAdding = adding?.profession === profession
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color }}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${dotColor}`} />
            {label} ({visible.length})
          </p>
          {canManage && !isAdding && (
            <button onClick={() => setAdding({ profession, search: '', userId: null, roomId: null })}
              className="w-5 h-5 rounded-full border flex items-center justify-center text-sm font-bold hover:opacity-70"
              style={{ borderColor: color, color }}>+</button>
          )}
        </div>
        <div className="space-y-1.5">
          {visible.map(p => <PersonLine key={p.id} p={p} />)}
          {visible.length === 0 && !isAdding && (
            <p className="text-sm italic" style={{ color: T.textFaint }}>Aucun présent</p>
          )}
          {isAdding && <AddPanel profession={profession} />}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div style={{ background: T.cardHead, borderColor: T.border }}
          className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: T.accentBar }} />
            <span className="font-bold text-sm" style={{ color: T.text }}>Effectif du jour</span>
            <span className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ background: T.surface, color: T.textSub }}>{dateLabel}</span>
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }} className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <Section profession="medecin"   color="#DC2626" dotColor="bg-red-500"  label="Médecins" />
          <Section profession="infirmier" color="#2563EB" dotColor="bg-blue-500" label="ISA" />
        </div>
      </div>
    </div>
  )
}

function QuickAssignModal({ date, dateLabel, allProfiles, rooms, roomNames, theme, onClose, onDone }) {
  const T = theme
  const { profile: currentProfile } = useAuth()
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] ?? null)
  const [search, setSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [saving, setSaving] = useState(false)

  const medecins = allProfiles.filter(p => p.profession === 'medecin')
  const filtered = search.length >= 1
    ? medecins.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : medecins

  async function handleAdd() {
    if (!selectedDoctor || !selectedRoom) return
    setSaving(true)
    const { data: existing } = await supabase.from('assignments').select('id')
      .eq('user_id', selectedDoctor.id).eq('room_id', selectedRoom).eq('date', date).maybeSingle()
    let insertedId = null
    if (!existing) {
      const { data: ins } = await supabase.from('assignments').insert({
        user_id: selectedDoctor.id,
        room_id: selectedRoom,
        date,
        assigned_by: currentProfile?.id,
        start_time: null,
      }).select('id').maybeSingle()
      insertedId = ins?.id ?? null
    }
    setSaving(false)
    onDone(insertedId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: T.cardHead, borderColor: T.border }}>
          <h2 className="font-bold text-base" style={{ color: T.text }}>Ajouter — {dateLabel}</h2>
          <button onClick={onClose} style={{ color: T.textFaint }} className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Salle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: T.textFaint }}>Salle</label>
            <select value={selectedRoom ?? ''} onChange={e => setSelectedRoom(Number(e.target.value))}
              style={{ background: T.surface, borderColor: T.border, color: T.text }}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {rooms.map(roomId => (
                <option key={roomId} value={roomId}>{roomNames[roomId] ?? `Salle ${roomId}`}</option>
              ))}
            </select>
          </div>

          {/* Médecin */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: T.textFaint }}>Médecin</label>
            {selectedDoctor ? (
              <div style={{ background: T.surface, borderColor: T.accentBar }}
                className="border-2 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: T.text }}>Dr. {selectedDoctor.full_name}</span>
                <button onClick={() => { setSelectedDoctor(null); setSearch('') }} style={{ color: T.textFaint }}
                  className="p-0.5 hover:opacity-70">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un médecin..."
                  style={{ background: T.surface, borderColor: T.border, color: T.text }}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-1.5"
                  autoFocus
                />
                <div className="border rounded-xl overflow-hidden max-h-44 overflow-y-auto" style={{ borderColor: T.border }}>
                  {filtered.slice(0, 10).map(p => (
                    <button key={p.id} onClick={() => setSelectedDoctor(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-70 transition-opacity border-b last:border-0"
                      style={{ background: T.surface, borderColor: T.border, color: T.text }}>
                      <span className="font-medium">Dr. {formatLastFirst(p.full_name)}</span>
                      <span className="text-xs ml-2" style={{ color: T.textFaint }}>
                        {GRADE_LABELS[p.grade] ?? ''}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            style={{ background: T.surface, color: T.textSub, border: `1px solid ${T.border}` }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity">
            Annuler
          </button>
          <button onClick={handleAdd} disabled={!selectedDoctor || !selectedRoom || saving}
            style={{ background: T.accentBar }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ unit, sector, onBack }) {
  const { profile } = useAuth()
  const canManage = profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'
  const ROOMS = SECTOR_ROOMS[sector?.id] ?? SECTOR_ROOMS['hors-bloc']
  // Secteurs avec gardes le week-end → vue 7 jours
  const isFullWeek = ['sinpi', 'obstetrique', 'gyneco', 'ophtalmo'].includes(sector?.id)
  const DAY_LABELS = isFullWeek ? DAY_NAMES_7 : DAY_NAMES

  // SINPI : salles différentes selon le jour de la semaine
  const SINPI_WEEKDAY_ROOMS = [76, 77, 78, 79, 80, 81]
  const SINPI_WEEKEND_ROOMS = [82, 83, 84]
  function getRoomsForDate(dateStr) {
    if (sector?.id !== 'sinpi') return ROOMS
    const dow = new Date(dateStr + 'T12:00:00').getDay() // 0=Dim, 6=Sam
    return (dow === 0 || dow === 6) ? SINPI_WEEKEND_ROOMS : SINPI_WEEKDAY_ROOMS
  }

  // SINPI : ordre de priorité des grades
  const SINPI_GRADE_ORDER = { adjoint: 0, chef_clinique: 1, interne: 2, consultant: 3, iade: 4 }
  function getSinpiGrade(roomId, asgns) {
    const a = asgns.find(x => x.room_id === roomId)
    return SINPI_GRADE_ORDER[a?.profiles?.grade] ?? 99
  }
  function sortSinpiRooms(roomIds, asgns) {
    return [...roomIds].sort((a, b) => getSinpiGrade(a, asgns) - getSinpiGrade(b, asgns))
  }
  function getSinpiGradeGroup(roomId, asgns) {
    const g = getSinpiGrade(roomId, asgns)
    if (g === 0) return 'adjoint'
    if (g === 1) return 'chef_clinique'
    if (g <= 4) return 'interne'
    return 'none'
  }
  const sectorLabel = sector?.name ?? 'HB'
  const T = sector?.id === 'julliard'         ? SKY_THEME
          : sector?.id === 'bou'              ? AMBER_THEME
          : sector?.id === 'traumatologie'    ? SLATE_THEME
          : sector?.id === 'prevost'          ? BLUSH_THEME
          : sector?.id === 'bocha-amopa'      ? PURPLE_THEME
          : sector?.id === 'orl-maxfa-plastie'? HOTPINK_THEME
          : sector?.id === 'antalgie'         ? ROSEWOOD_THEME
          : sector?.id === 'gyneco'           ? SOFTGREEN_THEME
          : sector?.id === 'obstetrique'      ? MAUVE_THEME
          : sector?.id === 'ophtalmo'         ? GRAY_THEME
          : unit?.id    === 'sinpi'           ? SALMON_THEME
          : unit?.id    === 'pediatrie'       ? YELLOW_THEME
          : WARM_THEME
  const [assignments, setAssignments] = useState([])
  const [closures, setClosures] = useState([])
  const [roomSchedules, setRoomSchedules] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [dayClosed, setDayClosed] = useState(false)
  const [weekDayClosures, setWeekDayClosures] = useState([]) // dates fermées de la semaine
  const [assignModal, setAssignModal] = useState(null) // { roomId, profession }
  const [showImport, setShowImport] = useState(false)
  const [showUnitImport, setShowUnitImport] = useState(false)
  const [showPDFImport, setShowPDFImport] = useState(false)
  const [showEffectif, setShowEffectif] = useState(false)
  const [showProtocols, setShowProtocols] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('week') // 'week' | 'day'
  const [weekAssignments, setWeekAssignments] = useState([])
  const [quickAssign, setQuickAssign] = useState(null) // { date, dateLabel }
  const [resetConfirm, setResetConfirm] = useState(null) // dateStr en attente de confirmation (vue semaine)
  const [dayResetConfirm, setDayResetConfirm] = useState(false) // confirmation reset jour actif
  const [undoStack, setUndoStack] = useState([]) // snapshots avant chaque action
  const [redoStack, setRedoStack] = useState([]) // snapshots pour redo

  const todayStr = formatDateKey(new Date())

  const [windowStart, setWindowStart] = useState(() => getMonday(new Date()))
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const weeks = useMemo(() => {
    return [0, 1, 2].map(i => {
      const monday = new Date(windowStart)
      monday.setDate(windowStart.getDate() + i * 7)
      return monday
    })
  }, [windowStart])

  const selectedWeekDays = useMemo(() => {
    return isFullWeek ? getFullWeekDays(weeks[selectedWeekIndex]) : getWeekDays(weeks[selectedWeekIndex])
  }, [weeks, selectedWeekIndex, isFullWeek])

  function handleWeekSelect(index) {
    setSelectedWeekIndex(index)
    const days = getWeekDays(weeks[index])
    const todayInWeek = days.find(d => formatDateKey(d) === todayStr)
    setSelectedDate(todayInWeek ? todayStr : formatDateKey(days[0]))
    setViewMode('week')
  }

  function shiftWindow(direction) {
    const newStart = new Date(windowStart)
    newStart.setDate(windowStart.getDate() + direction * 7)
    setWindowStart(newStart)
    setSelectedWeekIndex(0)
    const days = getWeekDays(newStart)
    const todayInWeek = days.find(d => formatDateKey(d) === todayStr)
    setSelectedDate(todayInWeek ? todayStr : formatDateKey(days[0]))
    setViewMode('week')
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const sectorId = sector?.id ?? 'hors-bloc'
    const weekDates = selectedWeekDays.map(d => formatDateKey(d))
    const [{ data: asgn }, { data: cls }, { data: profs }, { data: scheds }, { data: dayCls }, { data: weekCls }, { data: weekAsgn }] = await Promise.all([
      supabase.from('assignments').select('id, user_id, room_id, date, assigned_by, start_time, end_time, profiles!assignments_user_id_fkey(*)').eq('date', selectedDate),
      supabase.from('room_closures').select('*').eq('date', selectedDate),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('room_schedules').select('*').eq('date', selectedDate),
      supabase.from('day_closures').select('*').eq('date', selectedDate).eq('unit_id', sectorId).maybeSingle(),
      supabase.from('day_closures').select('date').eq('unit_id', sectorId).in('date', weekDates),
      supabase.from('assignments').select('id, user_id, date, room_id, start_time, end_time, profiles!assignments_user_id_fkey(full_name, profession, grade)').in('date', weekDates),
    ])
    setAssignments(asgn ?? [])
    setClosures(cls ?? [])
    setAllProfiles(profs ?? [])
    setRoomSchedules(scheds ?? [])
    setDayClosed(!!dayCls)
    setWeekDayClosures((weekCls ?? []).map(r => r.date))
    setWeekAssignments((weekAsgn ?? []).filter(a => ROOMS.includes(a.room_id)))
    setLoading(false)
  }, [selectedDate, selectedWeekDays, sector?.id])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_closures' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_schedules' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_closures' }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  // Vider les stacks undo/redo si on change de semaine ou de secteur
  useEffect(() => { setUndoStack([]); setRedoStack([]) }, [selectedWeekIndex, sector?.id])

  async function handleJoin(roomId, startTime) {
    if (!profile) return
    const { data: existing } = await supabase
      .from('assignments').select('id')
      .eq('user_id', profile.id).eq('room_id', roomId).eq('date', selectedDate)
      .maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: profile.id,
        room_id: roomId,
        date: selectedDate,
        assigned_by: profile.id,
        start_time: startTime ?? getCurrentTime(),
      })
    }
    await fetchData()
  }

  async function handleLeave(roomId, userId) {
    await supabase.from('assignments').delete()
      .eq('user_id', userId).eq('room_id', roomId).eq('date', selectedDate)
    await fetchData()
  }

  async function handleCloseDay() {
    if (!profile?.is_admin && profile?.grade !== 'chef_clinique') return
    await supabase.from('day_closures').upsert(
      { date: selectedDate, unit_id: sector?.id ?? 'hors-bloc', label: 'Jour férié', closed_by: profile.id },
      { onConflict: 'date,unit_id' }
    )
    await fetchData()
  }

  async function handleOpenDay() {
    if (!profile?.is_admin && profile?.grade !== 'chef_clinique') return
    await supabase.from('day_closures').delete()
      .eq('date', selectedDate).eq('unit_id', sector?.id ?? 'hors-bloc')
    await fetchData()
  }

  async function handleClose(roomId) {
    if (!profile?.is_admin) return
    await supabase.from('assignments').delete().eq('room_id', roomId).eq('date', selectedDate)
    await supabase.from('room_closures').insert({ room_id: roomId, date: selectedDate, closed_by: profile.id })
    await fetchData()
  }

  async function handleOpen(roomId) {
    if (!profile?.is_admin) return
    await supabase.from('room_closures').delete().eq('room_id', roomId).eq('date', selectedDate)
    await fetchData()
  }

  async function handleAssign(userId) {
    const canManage = profile?.is_admin || profile?.grade === 'chef_clinique'
    if (!canManage || !assignModal?.roomId) return
    const { data: existing } = await supabase
      .from('assignments').select('id')
      .eq('user_id', userId).eq('room_id', assignModal?.roomId).eq('date', selectedDate)
      .maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: userId,
        room_id: assignModal?.roomId,
        date: selectedDate,
        assigned_by: profile.id,
        start_time: getCurrentTime(),
      })
    }
    setAssignModal(null)
    await fetchData()
  }

  async function handleUpdateAssignmentTime(assignmentId, field, value) {
    await supabase.from('assignments').update({ [field]: value }).eq('id', assignmentId)
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, [field]: value } : a))
    fetchData()
  }

  async function handleUpdateRoomSchedule(roomId, field, value) {
    await supabase.from('room_schedules').upsert({
      room_id: roomId,
      date: selectedDate,
      [field]: value,
    }, { onConflict: 'room_id,date' })
    await fetchData()
  }

  function snapshotWeek() {
    return weekAssignments.map(a => ({
      user_id: a.user_id, room_id: a.room_id, date: a.date,
      start_time: a.start_time ?? null, end_time: a.end_time ?? null,
    }))
  }

  function pushUndo() {
    const snap = snapshotWeek()
    setUndoStack(prev => [...prev, snap])
    setRedoStack([])
  }

  async function applySnapshot(snap) {
    const weekDates = selectedWeekDays.map(d => formatDateKey(d))
    await supabase.from('assignments').delete().in('date', weekDates).in('room_id', ROOMS)
    if (snap.length > 0) await supabase.from('assignments').insert(snap)
    await fetchData()
  }

  async function handleUndo() {
    if (undoStack.length === 0) return
    const current = snapshotWeek()
    setRedoStack(prev => [...prev, current])
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    await applySnapshot(prev)
  }

  async function handleRedo() {
    if (redoStack.length === 0) return
    const current = snapshotWeek()
    setUndoStack(prev => [...prev, current])
    const next = redoStack[redoStack.length - 1]
    setRedoStack(s => s.slice(0, -1))
    await applySnapshot(next)
  }

  async function handleDeleteWeekAssignment(assignment) {
    pushUndo()
    await supabase.from('assignments').delete().eq('id', assignment.id)
    await fetchData()
  }

  async function handleResetDay(dateStr) {
    pushUndo()
    await supabase.from('assignments').delete().eq('date', dateStr).in('room_id', ROOMS)
    setResetConfirm(null)
    setDayResetConfirm(false)
    await fetchData()
  }

  const assignmentsByDate = useMemo(() => {
    const grouped = {}
    for (const a of weekAssignments) {
      if (!grouped[a.date]) grouped[a.date] = []
      grouped[a.date].push(a)
    }
    return grouped
  }, [weekAssignments])

  const totalAssigned = new Set(assignments.filter(a => ROOMS.includes(a.room_id)).map(a => a.user_id)).size

  const selectedDayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.pageBg }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} selectedDate={selectedDate} theme={T} />
      <Header unit={unit} sector={sector} onBack={onBack} onMenuOpen={() => setSidebarOpen(true)} theme={T} />

      {/* Sélecteur semaine/jour */}
      <div className="border-b px-4 py-3 overflow-x-hidden" style={{ background: T.cardHead, borderColor: T.border }}>
        <div className="max-w-4xl mx-auto space-y-3 w-full">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWindow(-1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: T.textSub }}>
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-1 gap-2">
              {weeks.map((monday, i) => {
                const weekNum = getISOWeek(monday)
                const isSelected = i === selectedWeekIndex
                const containsToday = getWeekDays(monday).some(d => formatDateKey(d) === todayStr)
                return (
                  <button key={i} onClick={() => handleWeekSelect(i)}
                    style={isSelected
                      ? { background: T.accentBar, color: '#fff' }
                      : containsToday
                        ? { background: T.cardHead, color: T.accent, border: `1px solid ${T.border}` }
                        : { background: T.surface, color: T.textSub }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80">
                    S{weekNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => shiftWindow(1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: T.textSub }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex gap-1.5">
            {selectedWeekDays.map((day, i) => {
              const dateStr = formatDateKey(day)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === todayStr
              const isPast = dateStr < todayStr
              const isDayClosed = weekDayClosures.includes(dateStr)
              return (
                <button key={i} onClick={() => { setSelectedDate(dateStr); setViewMode('day'); setDayResetConfirm(false) }}
                  style={isSelected
                    ? { background: T.accentBar, color: '#fff' }
                    : isToday
                      ? { background: T.cardHead, color: T.accent, border: `1px solid ${T.border}` }
                      : { color: isPast ? T.textFaint : T.textSub }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 flex flex-col items-center gap-0.5 relative">
                  <span className="text-xs uppercase tracking-wide">{DAY_LABELS[i]}</span>
                  <span className="text-sm font-bold">{day.getDate()}</span>
                  {isDayClosed && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Barre info */}
      <div className="border-b px-4 py-2 overflow-x-auto" style={{ background: T.cardHead, borderColor: T.border }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm min-w-max sm:min-w-0" style={{ color: T.textSub }}>
          <span className="capitalize shrink-0 mr-3">{selectedDayLabel} — <span className="font-semibold" style={{ color: T.text }}>{totalAssigned}</span> affecté(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEffectif(true)}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
              style={{ background: T.surface, color: T.accent }}>
              <Users size={13} />
              Effectif
            </button>
            <button onClick={() => setShowProtocols(true)}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
              style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
              <BookOpen size={13} />
              Protocoles
            </button>
            {(profile?.is_admin || profile?.grade === 'chef_clinique') && (
              <button onClick={dayClosed ? handleOpenDay : handleCloseDay}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: dayClosed ? '#FEE2E2' : T.surface, color: dayClosed ? '#DC2626' : T.accent }}>
                {dayClosed ? <CalendarCheck size={13} /> : <CalendarOff size={13} />}
                {dayClosed ? 'Réouvrir' : 'Jour férié'}
              </button>
            )}
            {canManage && (
              <>
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                  style={{ background: T.surface, color: T.accent }}>
                  <FileSpreadsheet size={13} />
                  Import
                </button>
                {['duhb', 'unicat', 'amopa', 'sinpi'].includes(unit?.id) && (
                  <button onClick={() => setShowUnitImport(true)}
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                    style={{ background: T.accentBar, color: '#fff' }}>
                    <FileSpreadsheet size={13} />
                    Import {unit?.name}
                  </button>
                )}
                {['gyneco', 'obstetrique', 'ophtalmo'].includes(sector?.id) && (
                  <button onClick={() => setShowPDFImport(true)}
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                    style={{ background: T.accentBar, color: '#fff' }}>
                    <FileText size={13} />
                    Import PDF
                  </button>
                )}
              </>
            )}
            {canManage && (
              dayResetConfirm ? (
                <button onClick={async () => { await handleResetDay(selectedDate); setDayResetConfirm(false) }}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  Confirmer ?
                </button>
              ) : (
                <button onClick={() => setDayResetConfirm(true)}
                  title="Vider toutes les affectations du jour"
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                  style={{ background: T.surface, color: T.textFaint }}>
                  <Trash2 size={13} />
                </button>
              )
            )}
            <button onClick={handleUndo} disabled={undoStack.length === 0}
              title="Annuler"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-25"
              style={{ color: T.accent }}>
              <Undo2 size={15} />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0}
              title="Rétablir"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-25"
              style={{ color: T.accent }}>
              <Redo2 size={15} />
            </button>
            <button onClick={fetchData} className="p-1.5 transition-opacity hover:opacity-70" style={{ color: T.accent }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grille */}
      <main className="flex-1 px-3 py-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center" style={{ color: T.textSub }}>
              <RefreshCw size={28} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Chargement...</p>
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {selectedWeekDays.map((day, i) => {
              const dateStr = formatDateKey(day)
              const isToday = dateStr === todayStr
              const isDayClosed = weekDayClosures.includes(dateStr)
              const dayAsgn = assignmentsByDate[dateStr] ?? []
              // Grouper par salle
              const dayRooms = new Set(getRoomsForDate(dateStr))
              const byRoom = {}
              for (const a of dayAsgn) {
                if (!dayRooms.has(a.room_id)) continue
                if (!byRoom[a.room_id]) byRoom[a.room_id] = { med: [], isa: [] }
                if (a.profiles?.profession === 'medecin') byRoom[a.room_id].med.push(a)
                else byRoom[a.room_id].isa.push(a)
              }
              const roomEntries = Object.entries(byRoom)
              const totalPeople = new Set(dayAsgn.map(a => a.user_id)).size
              const dayLabel = `${DAY_LABELS[i]} ${day.getDate()}`
              return (
                <div key={i}
                  style={{
                    background: T.cardBg,
                    borderColor: isToday ? T.accentBar : T.border,
                    boxShadow: '0 2px 12px rgba(180,130,60,0.08)',
                  }}
                  className="rounded-2xl border p-4 flex flex-col">
                  {/* Header jour — cliquable pour aller en vue jour */}
                  <div className="flex items-center justify-between mb-1 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => { setSelectedDate(dateStr); setViewMode('day'); setDayResetConfirm(false) }}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textSub }}>{DAY_LABELS[i]}</span>
                      <span className="text-xl font-bold" style={{ color: T.text }}>{day.getDate()}</span>
                    </div>
                    {isDayClosed
                      ? <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Fermé</span>
                      : isToday
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: T.accentBar, color: '#fff' }}>Aujourd'hui</span>
                        : totalPeople > 0
                          ? <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: T.surface, color: T.textSub }}>{totalPeople} pers.</span>
                          : null}
                  </div>
                  {/* Aperçu salles */}
                  <div className="flex-1 cursor-pointer" onClick={() => { setSelectedDate(dateStr); setViewMode('day'); setDayResetConfirm(false) }}>
                    {isDayClosed ? (
                      <p className="text-xs italic mt-2" style={{ color: T.textFaint }}>Journée fermée</p>
                    ) : roomEntries.length === 0 ? (
                      <p className="text-xs italic mt-2" style={{ color: T.textFaint }}>Aucune affectation</p>
                    ) : (() => {
                      const _go = { adjoint: 0, chef_clinique: 1, interne: 2, consultant: 3, iade: 4 }
                      const _gr = g => Math.min(...[...g.med, ...g.isa].map(a => _go[a.profiles?.grade] ?? 99), 99)
                      const _gk = g => { const n = _gr(g); return n === 0 ? 'adj' : n === 1 ? 'cdc' : 'other' }
                      const sorted = [...roomEntries].sort(([, a], [, b]) => _gr(a) - _gr(b))
                      return (
                        <div className="mt-2">
                          {sorted.slice(0, 12).map(([roomId, group], idx) => {
                            const curGrp = _gk(group)
                            const prevGrp = idx > 0 ? _gk(sorted[idx - 1][1]) : null
                            const showSep = prevGrp !== null && prevGrp !== curGrp
                            return (
                              <Fragment key={roomId}>
                                {showSep && (() => {
                                  const lbl = g => g === 'adj' ? 'Adj' : g === 'cdc' ? 'CDC' : 'Int'
                                  return (
                                    <div className="my-1">
                                      <div className="flex justify-end mb-0.5">
                                        <span className="text-xs font-bold" style={{ color: T.accentBar }}>{lbl(prevGrp)}</span>
                                      </div>
                                      <div className="border-t-2" style={{ borderColor: T.accentBar }} />
                                      <div className="flex justify-end mt-0.5">
                                        <span className="text-xs font-bold" style={{ color: T.accentBar }}>{lbl(curGrp)}</span>
                                      </div>
                                    </div>
                                  )
                                })()}
                                <div className="grid text-xs leading-tight mb-0.5"
                                  style={{ gridTemplateColumns: '100px 1fr' }}>
                                  <span className="font-medium truncate pr-1" style={{ color: T.textFaint }}>
                                    {ROOM_NAMES[Number(roomId)] ?? `S.${roomId}`}
                                  </span>
                                  <div className="flex flex-wrap gap-x-1.5">
                                    {[...group.med, ...group.isa].map(a => (
                                      <span key={a.id ?? a.user_id} className="flex items-center gap-0.5">
                                        <span className={a.profiles?.profession === 'medecin' ? 'font-semibold' : ''}
                                          style={{ color: a.profiles?.profession === 'medecin' ? T.text : T.textSub }}>
                                          {a.profiles?.profession === 'medecin' ? getLastName(a.profiles?.full_name) : (a.profiles?.full_name?.split(' ')[0] ?? '')}
                                        </span>
                                        {canManage && a.id && (
                                          <button onClick={e => { e.stopPropagation(); handleDeleteWeekAssignment(a) }}
                                            className="flex-shrink-0 hover:text-red-500 transition-colors"
                                            style={{ color: T.textFaint }}>
                                            <X size={9} />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </Fragment>
                            )
                          })}
                          {roomEntries.length > 12 && (
                            <p className="text-xs mt-1" style={{ color: T.textFaint }}>+{roomEntries.length - 12} salles…</p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  {/* Boutons action */}
                  {canManage && !isDayClosed && (
                    <div className="mt-3 flex gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); setQuickAssign({ date: dateStr, dateLabel: dayLabel }) }}
                        style={{ background: T.surface, borderColor: T.border, color: T.accentBar }}
                        className="flex-1 border rounded-xl py-1.5 text-xs font-bold hover:opacity-80 transition-opacity flex items-center justify-center gap-1">
                        + Ajouter
                      </button>
                      {resetConfirm === dateStr ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleResetDay(dateStr) }}
                          className="flex-shrink-0 border rounded-xl px-2.5 py-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: '#FEE2E2', borderColor: '#FECACA', color: '#DC2626' }}>
                          Confirmer ?
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setResetConfirm(dateStr) }}
                          title="Vider la journée"
                          style={{ background: T.surface, borderColor: T.border, color: T.textFaint }}
                          className="flex-shrink-0 border rounded-xl px-2.5 py-1.5 text-xs hover:opacity-80 transition-opacity">
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : dayClosed ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
              <CalendarOff size={36} className="text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg" style={{ color: T.text }}>Journée fermée</p>
              <p className="text-sm mt-1" style={{ color: T.textFaint }}>Jour férié — aucune salle active</p>
            </div>
            {(profile?.is_admin || profile?.grade === 'chef_clinique') && (
              <button onClick={handleOpenDay}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: T.surface, color: T.accent }}>
                <CalendarCheck size={15} /> Réouvrir cette journée
              </button>
            )}
          </div>
        ) : (
          <div>
            <SupervisorCard
              date={selectedDate}
              allProfiles={allProfiles}
              canManage={canManage}
              sectorId={sector?.id ?? 'hors-bloc'}
              sectorLabel={sectorLabel}
              theme={T}
            />
            {sector?.id === 'sinpi' && (
              <PiquetCard
                date={selectedDate}
                assignments={assignments}
                allProfiles={allProfiles}
                canManage={canManage}
                theme={T}
                onRefresh={fetchData}
              />
            )}
            {sector?.id === 'sinpi' ? (() => {
              const dayRooms = sortSinpiRooms(getRoomsForDate(selectedDate), assignments)
              // Group rooms by grade group
              const groups = []
              for (const roomId of dayRooms) {
                const grp = getSinpiGradeGroup(roomId, assignments)
                if (groups.length === 0 || groups[groups.length - 1].grp !== grp) {
                  groups.push({ grp, rooms: [] })
                }
                groups[groups.length - 1].rooms.push(roomId)
              }
              return (
                <div>
                  {groups.map((g, gi) => (
                    <Fragment key={g.grp + gi}>
                      {gi > 0 && (() => {
                        const lbl = grp => grp === 'adjoint' ? 'Adj' : grp === 'chef_clinique' ? 'CDC' : 'Int'
                        const prev = groups[gi - 1].grp
                        return (
                          <div className="my-3">
                            <div className="flex justify-end mb-1">
                              <span className="text-xs font-bold" style={{ color: T.accentBar }}>{lbl(prev)}</span>
                            </div>
                            <div className="border-t-2" style={{ borderColor: T.accentBar }} />
                            <div className="flex justify-end mt-1">
                              <span className="text-xs font-bold" style={{ color: T.accentBar }}>{lbl(g.grp)}</span>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="sm:columns-2 gap-3">
                        {g.rooms.map(roomId => (
                          <div key={roomId} className="break-inside-avoid mb-3">
                            <RoomCard
                              roomId={roomId}
                              roomName={ROOM_NAMES[roomId]}
                              noISA={NO_ISA_ROOMS.has(roomId)}
                              assignments={assignments}
                              closures={closures}
                              roomSchedule={roomSchedules.find(s => s.room_id === roomId) ?? DEFAULT_SCHEDULES[roomId] ?? null}
                              currentProfile={profile}
                              isToday={selectedDate === todayStr}
                              onJoin={handleJoin}
                              onLeave={handleLeave}
                              onClose={handleClose}
                              onOpen={handleOpen}
                              onAssign={(id, profession) => setAssignModal({ roomId: id, profession })}
                              onProfileClick={(p) => setSelectedProfile(p)}
                              onUpdateTime={handleUpdateAssignmentTime}
                              onUpdateRoomSchedule={handleUpdateRoomSchedule}
                              theme={T}
                            />
                          </div>
                        ))}
                      </div>
                    </Fragment>
                  ))}
                </div>
              )
            })() : (
              <div className="sm:columns-2 gap-3">
                {getRoomsForDate(selectedDate).map(roomId => (
                  <div key={roomId} className="break-inside-avoid mb-3">
                    <RoomCard
                      roomId={roomId}
                      roomName={ROOM_NAMES[roomId]}
                      noISA={NO_ISA_ROOMS.has(roomId)}
                      assignments={assignments}
                      closures={closures}
                      roomSchedule={roomSchedules.find(s => s.room_id === roomId) ?? DEFAULT_SCHEDULES[roomId] ?? null}
                      currentProfile={profile}
                      isToday={selectedDate === todayStr}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      onClose={handleClose}
                      onOpen={handleOpen}
                      onAssign={(id, profession) => setAssignModal({ roomId: id, profession })}
                      onProfileClick={(p) => setSelectedProfile(p)}
                      onUpdateTime={handleUpdateAssignmentTime}
                      onUpdateRoomSchedule={handleUpdateRoomSchedule}
                      theme={T}
                    />
                  </div>
                ))}
              </div>
            )}
            {['julliard', 'bou', 'traumatologie', 'prevost', 'bocha-amopa', 'orl-maxfa-plastie', 'antalgie', 'gyneco', 'obstetrique', 'ophtalmo'].includes(sector?.id) && (
              <SouhaitsCard
                date={selectedDate}
                sectorId={sector.id}
                canEdit={canManage}
                theme={T}
              />
            )}
          </div>
        )}
      </main>

      {quickAssign && (
        <QuickAssignModal
          date={quickAssign.date}
          dateLabel={quickAssign.dateLabel}
          allProfiles={allProfiles}
          rooms={ROOMS}
          roomNames={ROOM_NAMES}
          theme={T}
          onClose={() => setQuickAssign(null)}
          onDone={(insertedId) => { if (insertedId) pushUndo(); setQuickAssign(null); fetchData() }}
        />
      )}

      {showEffectif && (
        <EffectifModal
          assignments={assignments}
          allProfiles={allProfiles}
          rooms={ROOMS}
          roomNames={ROOM_NAMES}
          sectorId={sector?.id ?? 'hors-bloc'}
          dateLabel={selectedDayLabel}
          selectedDate={selectedDate}
          canManage={canManage}
          currentProfile={profile}
          theme={T}
          onClose={() => setShowEffectif(false)}
          onRefresh={fetchData}
        />
      )}

      {selectedProfile && (
        <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}

      {showImport && (
        <ImportPlanningModal
          profiles={allProfiles}
          sector={sector}
          theme={T}
          onClose={() => setShowImport(false)}
          onImported={() => { fetchData(); setShowImport(false) }}
        />
      )}

      {showUnitImport && (
        <ImportPlanningModal
          profiles={allProfiles}
          unit={unit}
          theme={T}
          onClose={() => setShowUnitImport(false)}
          onImported={() => { fetchData(); setShowUnitImport(false) }}
        />
      )}

      {showPDFImport && (
        <ImportPlanningPDFModal
          profiles={allProfiles}
          theme={T}
          onClose={() => setShowPDFImport(false)}
          onImported={() => { fetchData(); setShowPDFImport(false) }}
        />
      )}

      {showProtocols && (
        <DocumentsModal
          unit={unit}
          theme={T}
          initialTab="protocols"
          onClose={() => setShowProtocols(false)}
        />
      )}

      {assignModal?.roomId && (
        <AssignModal
          roomId={assignModal.roomId}
          roomName={ROOM_NAMES[assignModal.roomId]}
          profiles={allProfiles}
          assignments={assignments}
          today={selectedDate}
          defaultFilter={assignModal.profession}
          theme={T}
          onAssign={handleAssign}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
