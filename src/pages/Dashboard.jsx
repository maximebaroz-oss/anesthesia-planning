import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import RoomCard from '../components/RoomCard'
import AssignModal from '../components/AssignModal'
import ProfileModal from '../components/ProfileModal'

const ROOMS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const ROOM_NAMES = {
  1: 'Gastro 4',
  2: 'Gastro 5',
  3: 'Broncho 7',
  4: 'Radio 11',
  5: 'Radio 12',
  6: 'Radio 13',
  7: 'Cardio 17',
  8: 'ETO/Cardioversion/VVC',
  9: 'IRM/Scanner',
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [closures, setClosures] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [assignModalRoom, setAssignModalRoom] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const today = getToday()

  const fetchData = useCallback(async () => {
    const [{ data: asgn }, { data: cls }, { data: profs }] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, profiles!assignments_user_id_fkey(*)')
        .eq('date', today),
      supabase
        .from('room_closures')
        .select('*')
        .eq('date', today),
      supabase
        .from('profiles')
        .select('*')
        .order('full_name'),
    ])
    setAssignments(asgn ?? [])
    setClosures(cls ?? [])
    setAllProfiles(profs ?? [])
    setLoading(false)
  }, [today])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_closures' },
        () => fetchData()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchData])

  async function handleJoin(roomId) {
    if (!profile) return
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .eq('user_id', profile.id)
      .eq('room_id', roomId)
      .eq('date', today)
      .maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: profile.id,
        room_id: roomId,
        date: today,
        assigned_by: profile.id,
      })
    }
    await fetchData()
  }

  async function handleLeave(roomId, userId) {
    await supabase
      .from('assignments')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .eq('date', today)
    await fetchData()
  }

  async function handleClose(roomId) {
    if (!profile?.is_admin) return
    await supabase
      .from('assignments')
      .delete()
      .eq('room_id', roomId)
      .eq('date', today)
    await supabase.from('room_closures').upsert({
      room_id: roomId,
      date: today,
      closed_by: profile.id,
    })
    await fetchData()
  }

  async function handleOpen(roomId) {
    if (!profile?.is_admin) return
    await supabase
      .from('room_closures')
      .delete()
      .eq('room_id', roomId)
      .eq('date', today)
    await fetchData()
  }

  async function handleAssign(userId) {
    const canManage = profile?.is_admin || profile?.grade === 'chef_clinique'
    if (!canManage || !assignModalRoom) return
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('room_id', assignModalRoom)
      .eq('date', today)
      .maybeSingle()
    if (!existing) {
      await supabase.from('assignments').insert({
        user_id: userId,
        room_id: assignModalRoom,
        date: today,
        assigned_by: profile.id,
      })
    }
    setAssignModalRoom(null)
    await fetchData()
  }

  const totalAssigned = new Set(assignments.map(a => a.user_id)).size

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />

      {/* Stats bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <span>
            <span className="font-semibold text-white">{totalAssigned}</span> personnel affecté
          </span>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Room grid */}
      <main className="flex-1 px-3 py-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center text-gray-500">
              <RefreshCw size={28} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Chargement des salles...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROOMS.map(roomId => (
              <RoomCard
                key={roomId}
                roomId={roomId}
                roomName={ROOM_NAMES[roomId]}
                assignments={assignments}
                closures={closures}
                currentProfile={profile}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onClose={handleClose}
                onOpen={handleOpen}
                onAssign={(id) => setAssignModalRoom(id)}
                onProfileClick={(p) => setSelectedProfile(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Assign modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      {assignModalRoom && (
        <AssignModal
          roomId={assignModalRoom}
          profiles={allProfiles}
          assignments={assignments}
          today={today}
          onAssign={handleAssign}
          onClose={() => setAssignModalRoom(null)}
        />
      )}
    </div>
  )
}
