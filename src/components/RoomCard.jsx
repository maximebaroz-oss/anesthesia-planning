import { useState, useRef } from 'react'
import { UserPlus, X, Lock, Unlock, Users, Phone, Clock, LogOut, MoreVertical } from 'lucide-react'

function isLate(timeStr) {
  if (!timeStr) return false
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  const target = new Date()
  target.setHours(h, m, 0, 0)
  return now > target
}

function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function getRoomStatus(roomId, closures, assignments) {
  if (closures.some(c => c.room_id === roomId)) return 'closed'
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const hasMedecin = roomAssignments.some(a => a.profiles?.profession === 'medecin')
  const hasInfirmier = roomAssignments.some(a => a.profiles?.profession === 'infirmier')
  if (hasMedecin && hasInfirmier) return 'complete'
  if (hasMedecin || hasInfirmier) return 'understaffed'
  return 'available'
}

const STATUS_CONFIG = {
  closed:       { dot: 'bg-slate-500',  text: 'text-slate-400',  label: 'Inactive'   },
  complete:     { dot: 'bg-green-400',  text: 'text-green-400',  label: 'Available'  },
  understaffed: { dot: 'bg-amber-400',  text: 'text-amber-400',  label: 'Delayed'    },
  available:    { dot: 'bg-green-400',  text: 'text-green-400',  label: 'Available'  },
}

function TimeInput({ value, onSave, placeholder = '--:--', editable = true, large = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const cls = large ? 'text-2xl font-bold text-white tracking-tight' : 'text-xs text-gray-400'

  if (!editable) {
    return <span className={cls}>{value ?? <span className="opacity-40">{placeholder}</span>}</span>
  }

  if (editing) {
    return (
      <input
        type="time"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(draft); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`bg-[#081328] border border-blue-500 rounded px-1 py-0.5 text-white focus:outline-none ${large ? 'w-20 text-xl' : 'w-16 text-xs'}`}
        autoFocus
      />
    )
  }

  return (
    <button onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className={`hover:opacity-70 transition-opacity ${cls}`}>
      {value ?? <span className="opacity-40">{placeholder}</span>}
    </button>
  )
}

function gradeLabel(grade) {
  if (grade === 'cadre') return 'Cadre'
  if (grade === 'chef_clinique') return 'CDC'
  if (grade === 'interne') return 'Interne'
  return ''
}

function TypeBadge({ isMedecin }) {
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
      isMedecin
        ? 'bg-[#1A2540] text-blue-300 border border-blue-800/50'
        : 'bg-[#1A2540] text-blue-300 border border-blue-800/50'
    }`}>
      {isMedecin ? 'MED' : 'ISA'}
    </span>
  )
}

function JoinConfirmModal({ onConfirm, onCancel }) {
  const [startTime, setStartTime] = useState(getCurrentTime())
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
      <div className="bg-[#0E1C2E] border border-[#1A3050] rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A3050]">
          <h3 className="text-white font-bold">Rejoindre la salle</h3>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Heure de début</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full bg-[#081328] border border-[#1A3050] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-[#1A2540] hover:bg-[#243050] text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
            Annuler
          </button>
          <button onClick={() => onConfirm(startTime)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <UserPlus size={14} /> Rejoindre
          </button>
        </div>
      </div>
    </div>
  )
}

function LeaveConfirmModal({ name, onConfirm, onCancel }) {
  const [endTime, setEndTime] = useState(getCurrentTime())
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
      <div className="bg-[#0E1C2E] border border-[#1A3050] rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A3050]">
          <h3 className="text-white font-bold">Quitter la salle ?</h3>
          {name && <p className="text-gray-500 text-xs mt-0.5">{name}</p>}
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Heure de fin</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full bg-[#081328] border border-[#1A3050] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-[#1A2540] hover:bg-[#243050] text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
            Annuler
          </button>
          <button onClick={() => onConfirm(endTime)} className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonRow({ a, isToday, currentProfile, canManage, onUpdateTime, onProfileClick, onMouseEnter, onMouseLeave, onRequestLeave }) {
  const endTime   = a.end_time?.slice(0, 5)   ?? null
  const startTime = a.start_time?.slice(0, 5) ?? null
  const personIsLate = isToday && endTime && isLate(endTime)
  const isMine    = a.user_id === currentProfile?.id
  const isMedecin = a.profiles?.profession === 'medecin'
  const isPresent = !!startTime

  return (
    <li className="flex items-center gap-2 min-w-0 bg-[#1A2540]/60 rounded-xl px-2.5 py-2">
      <TypeBadge isMedecin={isMedecin} />
      <button
        onClick={() => onProfileClick(a.profiles)}
        onMouseEnter={e => onMouseEnter(a.profiles, e)}
        onMouseLeave={onMouseLeave}
        className="flex-1 min-w-0 text-left"
      >
        <p className={`text-xs font-semibold truncate ${personIsLate ? 'text-red-300' : 'text-white hover:text-blue-300 transition-colors'}`}>
          {isMedecin ? `Dr. ${a.profiles?.full_name}` : a.profiles?.full_name}
        </p>
        {a.profiles?.grade && (
          <p className="text-xs text-gray-500">{gradeLabel(a.profiles.grade)}</p>
        )}
      </button>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <TimeInput value={startTime} placeholder="--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'start_time', v)} />
        <span className="text-gray-700 text-xs">→</span>
        <TimeInput value={endTime}   placeholder="--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'end_time',   v)} />
      </div>
      {isPresent && !personIsLate && (
        <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
          <span className="text-green-400 text-xs">✓</span>
        </div>
      )}
      {(isMine || canManage) && (
        <button onClick={() => onRequestLeave(a)} className="p-0.5 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
          <X size={11} />
        </button>
      )}
    </li>
  )
}

export default function RoomCard({
  roomId, roomName, assignments, closures, roomSchedule,
  currentProfile, isToday,
  onJoin, onLeave, onClose, onOpen, onAssign, onProfileClick,
  onUpdateTime, onUpdateRoomSchedule,
}) {
  const status          = getRoomStatus(roomId, closures, assignments)
  const isClosed        = status === 'closed'
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const medecins        = roomAssignments.filter(a => a.profiles?.profession === 'medecin')
  const infirmiers      = roomAssignments.filter(a => a.profiles?.profession === 'infirmier')
  const isAssigned      = roomAssignments.some(a => a.user_id === currentProfile?.id)
  const isAdmin         = currentProfile?.is_admin
  const canManage       = currentProfile?.is_admin || currentProfile?.grade === 'chef_clinique'
  const config          = STATUS_CONFIG[status]

  const closingTime = roomSchedule?.closing_time?.slice(0, 5) ?? null
  const openingTime = roomSchedule?.opening_time?.slice(0, 5) ?? null
  const roomIsLate  = isToday && closingTime && isLate(closingTime) && roomAssignments.length > 0 && !isClosed

  const [tooltip, setTooltip]             = useState(null)
  const timerRef                          = useRef(null)
  const [leaveTarget, setLeaveTarget]     = useState(null)
  const [showJoinConfirm, setShowJoinConfirm] = useState(false)
  const myAssignment = roomAssignments.find(a => a.user_id === currentProfile?.id)

  function handleMouseEnter(profile, e) {
    if (!profile?.phone) return
    const rect = e.currentTarget.getBoundingClientRect()
    timerRef.current = setTimeout(() => {
      setTooltip({ phone: profile.phone, top: rect.bottom + 6, left: rect.left })
    }, 1000)
  }
  function handleMouseLeave() { clearTimeout(timerRef.current); setTooltip(null) }
  function handleRequestLeave(a) {
    setLeaveTarget({ userId: a.user_id, assignmentId: a.id, name: a.profiles?.full_name })
  }
  async function handleConfirmLeave(endTime) {
    if (!leaveTarget) return
    if (endTime) await onUpdateTime(leaveTarget.assignmentId, 'end_time', endTime)
    await onLeave(roomId, leaveTarget.userId)
    setLeaveTarget(null)
  }

  return (
    <>
      {tooltip && (
        <div className="fixed z-50 bg-[#0E1C2E] border border-[#1A3050] text-white text-xs rounded-xl px-3 py-1.5 shadow-2xl pointer-events-none flex items-center gap-1.5"
          style={{ top: tooltip.top, left: tooltip.left }}>
          <Phone size={11} className="text-blue-400" /> {tooltip.phone}
        </div>
      )}
      {showJoinConfirm && (
        <JoinConfirmModal
          onConfirm={startTime => { onJoin(roomId, startTime); setShowJoinConfirm(false) }}
          onCancel={() => setShowJoinConfirm(false)}
        />
      )}
      {leaveTarget && (
        <LeaveConfirmModal
          name={leaveTarget.name}
          onConfirm={handleConfirmLeave}
          onCancel={() => setLeaveTarget(null)}
        />
      )}

      <div className={`rounded-2xl border shadow-xl overflow-hidden flex flex-col bg-[#0E1C2E] transition-colors ${
        roomIsLate ? 'border-red-500/50' : 'border-[#1A3050]'
      }`}>

        {/* ── En-tête ── */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
          <span className={`font-bold text-sm ${isClosed ? 'text-gray-500' : 'text-white'}`}>
            {roomName || `Salle ${roomId}`}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold flex items-center gap-1 ${config.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
            {isClosed && <Lock size={13} className="text-gray-600" />}
          </div>
        </div>

        {/* ── SHIFT SLOT ── */}
        {!isClosed && (
          <div className="px-3 pb-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Shift Slot</p>
            <div className={`flex items-center gap-1.5 ${roomIsLate ? 'text-red-400' : ''}`}>
              <TimeInput
                value={openingTime} placeholder="--:--" editable={canManage} large
                onSave={v => onUpdateRoomSchedule(roomId, 'opening_time', v)}
              />
              <span className={`text-xl font-bold ${roomIsLate ? 'text-red-400' : 'text-white'}`}> - </span>
              <TimeInput
                value={closingTime} placeholder="--:--" editable={canManage} large
                onSave={v => onUpdateRoomSchedule(roomId, 'closing_time', v)}
              />
              {roomIsLate && <span className="text-red-400 text-xs font-bold ml-1">⚠</span>}
            </div>
          </div>
        )}

        {/* ── Séparateur ── */}
        <div className="border-t border-[#1A3050]/70 mx-3" />

        {/* ── Personnel ── */}
        <div className="flex-1 px-3 py-3">
          {isClosed ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Lock size={24} className="text-gray-700 mb-2" />
              <p className="text-sm text-gray-600 font-medium">Salle fermée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Médecins */}
              {medecins.length === 0 ? (
                <div className="flex items-center gap-2 bg-[#1A2540]/40 rounded-xl px-2.5 py-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[#1A2540] text-blue-300 border border-blue-800/50">MED</span>
                  <span className="text-xs text-gray-600 italic">Aucun médecin</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {medecins.map(a => (
                    <PersonRow key={a.id} a={a}
                      isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                      onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                      onRequestLeave={handleRequestLeave}
                    />
                  ))}
                </ul>
              )}

              {/* ISA */}
              {infirmiers.length === 0 ? (
                <div className="flex items-center gap-2 bg-[#1A2540]/40 rounded-xl px-2.5 py-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[#1A2540] text-blue-300 border border-blue-800/50">ISA</span>
                  <span className="text-xs text-gray-600 italic">Aucun ISA</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {infirmiers.map(a => (
                    <PersonRow key={a.id} a={a}
                      isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                      onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                      onRequestLeave={handleRequestLeave}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="border-t border-[#1A3050]/70 px-3 pt-2.5 pb-3 space-y-2">
          {!isClosed ? (
            <>
              {!isAssigned ? (
                <button onClick={() => setShowJoinConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors tracking-wide">
                  <UserPlus size={15} /> JOIN ROOM
                </button>
              ) : (
                <button onClick={() => myAssignment && handleRequestLeave(myAssignment)}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A2540] hover:bg-[#243050] text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors border border-[#1A3050]">
                  <LogOut size={14} /> Me retirer
                </button>
              )}
              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => onAssign(roomId)}
                    className="flex-1 flex items-center justify-center gap-1 bg-[#1A2540] hover:bg-[#243050] text-gray-300 text-xs font-medium py-2 rounded-xl transition-colors border border-[#1A3050]">
                    <Users size={13} /> Assign Staff
                  </button>
                  {isAdmin && (
                    <button onClick={() => onClose(roomId)}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#1A2540] hover:bg-[#243050] text-gray-400 text-xs font-medium py-2 rounded-xl transition-colors border border-[#1A3050]">
                      <Lock size={13} /> Close Room
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            isAdmin && (
              <button onClick={() => onOpen(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#1A2540] hover:bg-[#243050] text-green-400 text-sm font-medium py-2.5 rounded-xl transition-colors border border-green-700/30">
                <Unlock size={14} /> Open Room Now
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}
