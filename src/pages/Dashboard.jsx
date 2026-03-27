import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, ChevronDown, X, FileSpreadsheet, CalendarOff, CalendarCheck, Users } from 'lucide-react'
import ImportPlanningModal from '../components/ImportPlanningModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import RoomCard, { WARM as WARM_THEME, SKY as SKY_THEME } from '../components/RoomCard'
import AssignModal from '../components/AssignModal'
import ProfileModal from '../components/ProfileModal'
import Sidebar from '../components/Sidebar'

const WARM = {
  cardBg:    '#F5F3F0',
  cardHead:  '#EAE7E2',
  border:    '#CEC8BF',
  borderAlt: '#B8B0A4',
  surface:   '#E2DED8',
  accent:    '#6B5C48',
  accentBar: '#8A7560',
  text:      '#2A2318',
  textSub:   '#6B5F52',
  textFaint: '#9E9489',
}

function SupervisorCard({ date, allProfiles, canManage, unitId, unitLabel, theme }) {
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
      .eq('date', date).eq('unit_id', unitId).maybeSingle()
      .then(({ data }) => {
        setSupervisor(data?.profiles ?? null)
        setLoading(false)
      })
  }, [date, unitId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function assignSupervisor(profile) {
    await supabase.from('supervisors').upsert(
      { date, unit_id: unitId, user_id: profile.id, assigned_by: currentProfile?.id },
      { onConflict: 'date,unit_id' }
    )
    setSupervisor(profile)
    setOpen(false)
    setSearch('')
  }

  async function removeSupervisor() {
    await supabase.from('supervisors').delete().eq('date', date).eq('unit_id', unitId)
    setSupervisor(null)
  }

  const medecins = allProfiles.filter(p => p.profession === 'medecin' &&
    (p.grade === 'adjoint' || p.grade === 'chef_clinique'))
  const filtered = medecins.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ background: T.cardBg, borderColor: T.border, boxShadow: '0 2px 12px rgba(180,130,60,0.08)' }}
      className="rounded-2xl border overflow-visible mb-4 col-span-full">
      <div style={{ background: T.cardHead, borderColor: T.border }}
        className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b">
        <span style={{ background: T.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
        <ShieldCheck size={14} style={{ color: T.accentBar }} />
        <span className="font-bold text-sm" style={{ color: T.text }}>Superviseur {unitLabel}</span>
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
                  Dr. {supervisor.full_name}
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
                      <div style={{ background: T.surface }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: T.accentBar, color: '#fff' }}>
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium">Dr. {p.full_name}</span>
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

// Salles sans ISA
const NO_ISA_ROOMS = new Set([9, 15, 16, 17])

const UNIT_ROOMS = {
  'hors-bloc': [1, 2, 3, 4, 5, 6, 7, 8, 9],
  'julliard':  [10, 11, 12, 13, 14, 15, 16, 17],
}

const ROOM_NAMES = {
  // Hors Bloc (HB)
  1: 'Gastro 4',
  2: 'Gastro 5',
  3: 'Broncho 7',
  4: 'Radio 11',
  5: 'Radio 12',
  6: 'Neuro-radio 13',
  7: 'Cardio 17',
  8: 'Tardif',
  9: 'Consultation',
  // Julliard
  10: 'Viscérale 10',
  11: 'Urg Viscérale 11',
  12: 'Viscérale 12',
  13: 'Uro 13',
  14: 'Viscérale 14',
  15: 'Consultation',
  16: 'Visite J+1',
  17: 'Consultation greffe',
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
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function SouhaitsCard({ date, unitId, canEdit, theme }) {
  const T = theme
  const [note, setNote] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!date || !unitId) return
    supabase.from('day_notes').select('*').eq('date', date).eq('unit_id', unitId).maybeSingle()
      .then(({ data }) => setNote(data ?? null))
  }, [date, unitId])

  async function save() {
    const { data } = await supabase.from('day_notes').upsert(
      { date, unit_id: unitId, content: draft },
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

function EffectifModal({ assignments, allProfiles, rooms, roomNames, unitId, dateLabel, selectedDate, canManage, currentProfile, theme, onClose, onRefresh }) {
  const T = theme
  const [adding, setAdding] = useState(null)
  const [presence, setPresence] = useState([])
  const unitAssignments = assignments.filter(a => rooms.includes(a.room_id))
  const medecins   = allProfiles.filter(p => p.profession === 'medecin')
  const infirmiers = allProfiles.filter(p => p.profession === 'infirmier')

  useEffect(() => {
    if (!selectedDate || !unitId) return
    supabase.from('unit_presence').select('user_id')
      .eq('date', selectedDate).eq('unit_id', unitId)
      .then(({ data }) => setPresence(data?.map(r => r.user_id) ?? []))
  }, [selectedDate, unitId])

  function getAssignments(userId) { return unitAssignments.filter(a => a.user_id === userId) }
  function isPresent(userId) { return presence.includes(userId) }
  function getRoomName(roomId) { return roomNames[roomId] ?? `Salle ${roomId}` }

  async function removeUser(userId) {
    await supabase.from('assignments').delete()
      .eq('user_id', userId).eq('date', selectedDate).in('room_id', rooms)
    await supabase.from('unit_presence').delete()
      .eq('user_id', userId).eq('date', selectedDate).eq('unit_id', unitId)
    setPresence(p => p.filter(id => id !== userId))
    onRefresh()
  }

  async function addPresenceOnly() {
    if (!adding?.userId) return
    await supabase.from('unit_presence').upsert(
      { date: selectedDate, unit_id: unitId, user_id: adding.userId, added_by: currentProfile?.id },
      { onConflict: 'date,unit_id,user_id' }
    )
    setPresence(p => [...p, adding.userId])
    setAdding(null)
    onRefresh()
  }

  async function addAssignment() {
    if (!adding?.userId || !adding?.roomId) return
    await supabase.from('unit_presence').upsert(
      { date: selectedDate, unit_id: unitId, user_id: adding.userId, added_by: currentProfile?.id },
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

export default function Dashboard({ sector, unit, onBack }) {
  const { profile } = useAuth()
  const ROOMS = UNIT_ROOMS[unit?.id] ?? UNIT_ROOMS['hors-bloc']
  const unitLabel = unit?.name ?? 'HB'
  const T = unit?.id === 'julliard' ? SKY_THEME : WARM_THEME
  const [assignments, setAssignments] = useState([])
  const [closures, setClosures] = useState([])
  const [roomSchedules, setRoomSchedules] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [dayClosed, setDayClosed] = useState(false)
  const [weekDayClosures, setWeekDayClosures] = useState([]) // dates fermées de la semaine
  const [assignModal, setAssignModal] = useState(null) // { roomId, profession }
  const [showImport, setShowImport] = useState(false)
  const [showEffectif, setShowEffectif] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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
    return getWeekDays(weeks[selectedWeekIndex])
  }, [weeks, selectedWeekIndex])

  function handleWeekSelect(index) {
    setSelectedWeekIndex(index)
    const days = getWeekDays(weeks[index])
    const todayInWeek = days.find(d => formatDateKey(d) === todayStr)
    setSelectedDate(todayInWeek ? todayStr : formatDateKey(days[0]))
  }

  function shiftWindow(direction) {
    const newStart = new Date(windowStart)
    newStart.setDate(windowStart.getDate() + direction * 7)
    setWindowStart(newStart)
    setSelectedWeekIndex(0)
    const days = getWeekDays(newStart)
    const todayInWeek = days.find(d => formatDateKey(d) === todayStr)
    setSelectedDate(todayInWeek ? todayStr : formatDateKey(days[0]))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const unitId = unit?.id ?? 'hors-bloc'
    const weekDates = selectedWeekDays.map(d => formatDateKey(d))
    const [{ data: asgn }, { data: cls }, { data: profs }, { data: scheds }, { data: dayCls }, { data: weekCls }] = await Promise.all([
      supabase.from('assignments').select('id, user_id, room_id, date, assigned_by, start_time, end_time, profiles!assignments_user_id_fkey(*)').eq('date', selectedDate),
      supabase.from('room_closures').select('*').eq('date', selectedDate),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('room_schedules').select('*').eq('date', selectedDate),
      supabase.from('day_closures').select('*').eq('date', selectedDate).eq('unit_id', unitId).maybeSingle(),
      supabase.from('day_closures').select('date').eq('unit_id', unitId).in('date', weekDates),
    ])
    setAssignments(asgn ?? [])
    setClosures(cls ?? [])
    setAllProfiles(profs ?? [])
    setRoomSchedules(scheds ?? [])
    setDayClosed(!!dayCls)
    setWeekDayClosures((weekCls ?? []).map(r => r.date))
    setLoading(false)
  }, [selectedDate, selectedWeekDays, unit?.id])

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
      { date: selectedDate, unit_id: unit?.id ?? 'hors-bloc', label: 'Jour férié', closed_by: profile.id },
      { onConflict: 'date,unit_id' }
    )
    await fetchData()
  }

  async function handleOpenDay() {
    if (!profile?.is_admin && profile?.grade !== 'chef_clinique') return
    await supabase.from('day_closures').delete()
      .eq('date', selectedDate).eq('unit_id', unit?.id ?? 'hors-bloc')
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

  const totalAssigned = new Set(assignments.map(a => a.user_id)).size

  const selectedDayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.pageBg }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} selectedDate={selectedDate} />
      <Header sector={sector} unit={unit} onBack={onBack} onMenuOpen={() => setSidebarOpen(true)} />

      {/* Sélecteur semaine/jour */}
      <div className="border-b px-4 py-3" style={{ background: T.cardHead, borderColor: T.border }}>
        <div className="max-w-4xl mx-auto space-y-3">
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
                <button key={i} onClick={() => setSelectedDate(dateStr)}
                  style={isSelected
                    ? { background: T.accentBar, color: '#fff' }
                    : isToday
                      ? { background: T.cardHead, color: T.accent, border: `1px solid ${T.border}` }
                      : { color: isPast ? T.textFaint : T.textSub }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 flex flex-col items-center gap-0.5 relative">
                  <span className="text-xs uppercase tracking-wide">{DAY_NAMES[i]}</span>
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
      <div className="border-b px-4 py-2" style={{ background: T.cardHead, borderColor: T.border }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm" style={{ color: T.textSub }}>
          <span className="capitalize">{selectedDayLabel} — <span className="font-semibold" style={{ color: T.text }}>{totalAssigned}</span> affecté(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEffectif(true)}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
              style={{ background: T.surface, color: T.accent }}>
              <Users size={13} />
              Effectif
            </button>
            {(profile?.is_admin || profile?.grade === 'chef_clinique') && (
              <button onClick={dayClosed ? handleOpenDay : handleCloseDay}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: dayClosed ? '#FEE2E2' : T.surface, color: dayClosed ? '#DC2626' : T.accent }}>
                {dayClosed ? <CalendarCheck size={13} /> : <CalendarOff size={13} />}
                {dayClosed ? 'Réouvrir' : 'Jour férié'}
              </button>
            )}
            {(profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique') && (
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: T.surface, color: T.accent }}>
                <FileSpreadsheet size={13} />
                Import
              </button>
            )}
            <button onClick={fetchData} className="flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ color: T.accent }}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SupervisorCard
              date={selectedDate}
              allProfiles={allProfiles}
              canManage={profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'}
              unitId={unit?.id ?? 'hors-bloc'}
              unitLabel={unitLabel}
              theme={T}
            />
            {ROOMS.map(roomId => (
              <RoomCard
                key={roomId}
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
            ))}
            {unit?.id === 'julliard' && (
              <SouhaitsCard
                date={selectedDate}
                unitId="julliard"
                canEdit={profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'}
                theme={T}
              />
            )}
          </div>
        )}
      </main>

      {showEffectif && (
        <EffectifModal
          assignments={assignments}
          allProfiles={allProfiles}
          rooms={ROOMS}
          roomNames={ROOM_NAMES}
          unitId={unit?.id ?? 'hors-bloc'}
          dateLabel={selectedDayLabel}
          selectedDate={selectedDate}
          canManage={profile?.is_admin || profile?.grade === 'chef_clinique' || profile?.grade === 'adjoint'}
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
          unit={unit}
          onClose={() => setShowImport(false)}
          onImported={() => { fetchData(); setShowImport(false) }}
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
          onAssign={handleAssign}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
