import { useEffect, useState, useCallback, useMemo } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import RoomCard from '../components/RoomCard'
import AssignModal from '../components/AssignModal'
import ProfileModal from '../components/ProfileModal'
import Sidebar from '../components/Sidebar'

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
  const [assignModalRoom, setAssignModalRoom] = useState(null)
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
    if (!canManage || !assignModalRoom) return
    const { data: existing } = await supabase
      .from('assignments').select('id')
      .eq('user_id', userId).eq('room_id', assignModalRoom).eq('date', selectedDate)
      .maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: userId,
        room_id: assignModalRoom,
        date: selectedDate,
        assigned_by: profile.id,
        start_time: getCurrentTime(),
      })
    }
    setAssignModalRoom(null)
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
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header sector={sector} unit={unit} onBack={onBack} onMenuOpen={() => setSidebarOpen(true)} />

      {/* Sélecteur semaine/jour */}
      <div className="border-b px-4 py-3" style={{ background: '#FAF7F2', borderColor: '#DDD0B8' }}>
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWindow(-1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: '#8B7355' }}>
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
                      ? { background: '#D97706', color: '#fff' }
                      : containsToday
                        ? { background: '#FBF5EA', color: '#B45309', border: '1px solid #DDD0B8' }
                        : { background: '#EDE0C8', color: '#8B7355' }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80">
                    S{weekNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => shiftWindow(1)} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: '#8B7355' }}>
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
                    ? { background: '#D97706', color: '#fff' }
                    : isToday
                      ? { background: '#FBF5EA', color: '#B45309', border: '1px solid #DDD0B8' }
                      : { color: isPast ? '#C9B89A' : '#8B7355' }}
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
      <div className="border-b px-4 py-2" style={{ background: '#FAF7F2', borderColor: '#DDD0B8' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm" style={{ color: '#8B7355' }}>
          <span className="capitalize">{selectedDayLabel} — <span className="font-semibold" style={{ color: '#2D1E08' }}>{totalAssigned}</span> affecté(s)</span>
          <button onClick={fetchData} className="flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ color: '#B45309' }}>
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Grille */}
      <main className="flex-1 px-3 py-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center" style={{ color: '#8B7355' }}>
              <RefreshCw size={28} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Chargement...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROOMS.map(roomId => (
              <RoomCard
                key={roomId}
                roomId={roomId}
                roomName={ROOM_NAMES[roomId]}
                assignments={assignments}
                closures={closures}
                roomSchedule={roomSchedules.find(s => s.room_id === roomId) ?? null}
                currentProfile={profile}
                isToday={selectedDate === todayStr}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onClose={handleClose}
                onOpen={handleOpen}
                onAssign={(id) => setAssignModalRoom(id)}
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

      {assignModalRoom && (
        <AssignModal
          roomId={assignModalRoom}
          profiles={allProfiles}
          assignments={assignments}
          today={selectedDate}
          onAssign={handleAssign}
          onClose={() => setAssignModalRoom(null)}
        />
      )}
    </div>
  )
}
