import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, ChevronDown, X, FileSpreadsheet } from 'lucide-react'
import ImportPlanningModal from '../components/ImportPlanningModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import RoomCard from '../components/RoomCard'
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

function SupervisorCard({ date, allProfiles, canManage }) {
  const { profile: currentProfile } = useAuth()
  const [supervisor, setSupervisor] = useState(null)   // profile object or null
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)

  // Fetch supervisor for this date
  useEffect(() => {
    setLoading(true)
    supabase.from('supervisors').select('user_id, profiles!supervisors_user_id_fkey(*)').eq('date', date).maybeSingle()
      .then(({ data }) => {
        setSupervisor(data?.profiles ?? null)
        setLoading(false)
      })
  }, [date])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function assignSupervisor(profile) {
    await supabase.from('supervisors').upsert(
      { date, user_id: profile.id, assigned_by: currentProfile?.id },
      { onConflict: 'date' }
    )
    setSupervisor(profile)
    setOpen(false)
    setSearch('')
  }

  async function removeSupervisor() {
    await supabase.from('supervisors').delete().eq('date', date)
    setSupervisor(null)
  }

  const medecins = allProfiles.filter(p => p.profession === 'medecin' &&
    (p.grade === 'adjoint' || p.grade === 'chef_clinique'))
  const filtered = medecins.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ background: WARM.cardBg, borderColor: WARM.border, boxShadow: '0 2px 12px rgba(180,130,60,0.08)' }}
      className="rounded-2xl border overflow-visible mb-4 col-span-full">
      <div style={{ background: WARM.cardHead, borderColor: WARM.border }}
        className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b">
        <span style={{ background: WARM.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
        <ShieldCheck size={14} style={{ color: WARM.accentBar }} />
        <span className="font-bold text-sm" style={{ color: WARM.text }}>Superviseur HB</span>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        {loading ? (
          <span className="text-sm italic" style={{ color: WARM.textFaint }}>Chargement...</span>
        ) : supervisor ? (
          <>
            <div style={{ background: WARM.surface, borderColor: WARM.border }}
              className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2 border">
              <div style={{ background: WARM.accentBar }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {supervisor.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: WARM.text }}>
                  Dr. {supervisor.full_name}
                </p>
                <p className="text-xs" style={{ color: WARM.textFaint }}>
                  {supervisor.grade === 'adjoint' ? 'Adjoint' : 'Chef de clinique'}
                </p>
              </div>
            </div>
            {canManage && (
              <button onClick={removeSupervisor}
                style={{ color: WARM.textFaint }}
                className="p-1.5 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <span className="text-sm italic" style={{ color: WARM.textFaint }}>Aucun superviseur assigné</span>
        )}

        {canManage && (
          <div className="relative flex-shrink-0" ref={dropRef}>
            <button onClick={() => { setOpen(v => !v); setSearch('') }}
              style={{ background: WARM.accentBar }}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
              {supervisor ? 'Changer' : 'Assigner'}
              <ChevronDown size={14} />
            </button>

            {open && (
              <div style={{ background: WARM.cardBg, borderColor: WARM.border }}
                className="absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b" style={{ borderColor: WARM.border }}>
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border focus:outline-none placeholder-gray-400"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: WARM.textFaint }}>Aucun résultat</p>
                  ) : filtered.map(p => (
                    <button key={p.id} onClick={() => assignSupervisor(p)}
                      style={{ color: WARM.text }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-70 transition-opacity flex items-center gap-2">
                      <div style={{ background: WARM.surface }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: WARM.accentBar, color: '#fff' }}>
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium">Dr. {p.full_name}</span>
                        <span className="text-xs ml-1.5" style={{ color: WARM.textFaint }}>
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

const ROOMS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const ROOM_NAMES = {
  1: 'Gastro 4',
  2: 'Gastro 5',
  3: 'Broncho 7',
  4: 'Radio 11',
  5: 'Radio 12',
  6: 'Neuro-radio 13',
  7: 'Cardio 17',
  8: 'Tardif',
  9: 'IRM/Scanner',
}

// Horaires par défaut — salle 8 (Tardif) : pas d'ouverture, fermeture 19h
const DEFAULT_SCHEDULES = {
  1: { opening_time: '07:00', closing_time: '16:00' },
  2: { opening_time: '07:00', closing_time: '16:00' },
  3: { opening_time: '07:00', closing_time: '16:00' },
  4: { opening_time: '07:00', closing_time: '16:00' },
  5: { opening_time: '07:00', closing_time: '16:00' },
  6: { opening_time: '07:00', closing_time: '16:00' },
  7: { opening_time: '07:00', closing_time: '16:00' },
  8: { opening_time: null,    closing_time: '19:00' },
  9: { opening_time: '07:00', closing_time: '16:00' },
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0]
}

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function Dashboard({ sector, unit, onBack }) {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [closures, setClosures] = useState([])
  const [roomSchedules, setRoomSchedules] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [assignModal, setAssignModal] = useState(null) // { roomId, profession }
  const [showImport, setShowImport] = useState(false)
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
    const [{ data: asgn }, { data: cls }, { data: profs }, { data: scheds }] = await Promise.all([
      supabase.from('assignments').select('id, user_id, room_id, date, assigned_by, start_time, end_time, profiles!assignments_user_id_fkey(*)').eq('date', selectedDate),
      supabase.from('room_closures').select('*').eq('date', selectedDate),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('room_schedules').select('*').eq('date', selectedDate),
    ])
    setAssignments(asgn ?? [])
    setClosures(cls ?? [])
    setAllProfiles(profs ?? [])
    setRoomSchedules(scheds ?? [])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_closures' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_schedules' }, () => fetchData())
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
    <div className="min-h-screen flex flex-col" style={{ background: '#EDEAE5' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header sector={sector} unit={unit} onBack={onBack} onMenuOpen={() => setSidebarOpen(true)} />

      {/* Sélecteur semaine/jour */}
      <div className="border-b px-4 py-3" style={{ background: '#F0EDE8', borderColor: '#CEC8BF' }}>
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWindow(-1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: '#6B5F52' }}>
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
                      ? { background: '#8A7560', color: '#fff' }
                      : containsToday
                        ? { background: '#EAE7E2', color: '#6B5C48', border: '1px solid #CEC8BF' }
                        : { background: '#E2DED8', color: '#6B5F52' }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80">
                    S{weekNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => shiftWindow(1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: '#6B5F52' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex gap-1.5">
            {selectedWeekDays.map((day, i) => {
              const dateStr = formatDateKey(day)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === todayStr
              const isPast = dateStr < todayStr
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)}
                  style={isSelected
                    ? { background: '#8A7560', color: '#fff' }
                    : isToday
                      ? { background: '#EAE7E2', color: '#6B5C48', border: '1px solid #CEC8BF' }
                      : { color: isPast ? '#B8B0A4' : '#6B5F52' }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 flex flex-col items-center gap-0.5">
                  <span className="text-xs uppercase tracking-wide">{DAY_NAMES[i]}</span>
                  <span className="text-sm font-bold">{day.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Barre info */}
      <div className="border-b px-4 py-2" style={{ background: '#F0EDE8', borderColor: '#CEC8BF' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm" style={{ color: '#6B5F52' }}>
          <span className="capitalize">{selectedDayLabel} — <span className="font-semibold" style={{ color: '#2A2318' }}>{totalAssigned}</span> affecté(s)</span>
          <button onClick={fetchData} className="flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ color: '#6B5C48' }}>
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Grille */}
      <main className="flex-1 px-3 py-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center" style={{ color: '#6B5F52' }}>
              <RefreshCw size={28} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Chargement...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SupervisorCard
              date={selectedDate}
              allProfiles={allProfiles}
              canManage={profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'}
            />
            {ROOMS.map(roomId => (
              <RoomCard
                key={roomId}
                roomId={roomId}
                roomName={ROOM_NAMES[roomId]}
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
              />
            ))}
          </div>
        )}
      </main>

      {selectedProfile && (
        <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
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
