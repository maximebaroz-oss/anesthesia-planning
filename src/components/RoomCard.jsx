import { useState, useRef } from 'react'
import { UserPlus, X, Lock, Unlock, Users, Phone, Clock, LogOut } from 'lucide-react'

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
  closed:       { badge: 'bg-slate-700 text-slate-300',                                      dot: 'bg-slate-500', label: 'Inactive'    },
  complete:     { badge: 'bg-green-500/20 text-green-400 border border-green-500/30',        dot: 'bg-green-500', label: 'Au complet'  },
  understaffed: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',        dot: 'bg-amber-500', label: 'Incomplet'   },
  available:    { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',           dot: 'bg-blue-500',  label: 'Disponible'  },
}

function TimeInput({ value, onSave, placeholder = '--:--', editable = true, large = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const cls = large
    ? 'text-base font-bold text-white'
    : 'text-xs text-gray-300'

  if (!editable) {
    return <span className={cls}>{value ?? <span className="text-gray-600">{placeholder}</span>}</span>
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
        className={`bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-white focus:outline-none ${large ? 'w-20 text-base' : 'w-16 text-xs'}`}
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className={`hover:text-blue-400 transition-colors ${cls}`}
    >
      {value ?? <span className="text-gray-600">{placeholder}</span>}
    </button>
  )
}

function gradeLabel(grade) {
  if (grade === 'cadre') return 'Cadre'
  if (grade === 'chef_clinique') return 'CDC'
  if (grade === 'interne') return 'Int.'
  return ''
}

function JoinConfirmModal({ onConfirm, onCancel }) {
  const [startTime, setStartTime] = useState(getCurrentTime())
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-sm">Rejoindre la salle</h3>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Heure de début</label>
          <input
            type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-sm">Quitter la salle ?</h3>
          {name && <p className="text-gray-500 text-xs mt-0.5">{name}</p>}
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Heure de fin</label>
          <input
            type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
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

  return (
    <li className="flex items-center gap-1.5 min-w-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMedecin ? 'bg-red-400' : 'bg-blue-400'}`} />
      <button
        onClick={() => onProfileClick(a.profiles)}
        onMouseEnter={e => onMouseEnter(a.profiles, e)}
        onMouseLeave={onMouseLeave}
        className={`text-xs truncate flex-1 text-left transition-colors ${personIsLate ? 'text-red-300' : 'text-gray-200 hover:text-white'}`}
      >
        {isMedecin ? `Dr. ${a.profiles?.full_name}` : a.profiles?.full_name}
        {a.profiles?.grade && <span className="text-gray-600 ml-1">{gradeLabel(a.profiles.grade)}</span>}
      </button>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <TimeInput value={startTime} placeholder="--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'start_time', v)} />
        <span className="text-gray-700 text-xs">→</span>
        <TimeInput value={endTime}   placeholder="--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'end_time',   v)} />
      </div>
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
  const status         = getRoomStatus(roomId, closures, assignments)
  const isClosed       = status === 'closed'
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const medecins       = roomAssignments.filter(a => a.profiles?.profession === 'medecin')
  const infirmiers     = roomAssignments.filter(a => a.profiles?.profession === 'infirmier')
  const isAssigned     = roomAssignments.some(a => a.user_id === currentProfile?.id)
  const isAdmin        = currentProfile?.is_admin
  const canManage      = currentProfile?.is_admin || currentProfile?.grade === 'chef_clinique'
  const config         = STATUS_CONFIG[status]

  const closingTime  = roomSchedule?.closing_time?.slice(0, 5)  ?? null
  const openingTime  = roomSchedule?.opening_time?.slice(0, 5)  ?? null
  const roomIsLate   = isToday && closingTime && isLate(closingTime) && roomAssignments.length > 0 && !isClosed

  const [tooltip, setTooltip]           = useState(null)
  const timerRef                        = useRef(null)
  const [leaveTarget, setLeaveTarget]   = useState(null)
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
        <div className="fixed z-50 bg-gray-800 border border-gray-700 text-white text-xs rounded-xl px-3 py-1.5 shadow-xl pointer-events-none flex items-center gap-1.5"
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

      <div className={`rounded-2xl border shadow-md overflow-hidden flex flex-col bg-gray-900 transition-colors ${
        roomIsLate ? 'border-red-500/40' : 'border-gray-700/50'
      }`}>

        {/* ── En-tête ── */}
        <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
          <span className="text-white font-bold text-sm leading-tight">{roomName || `Salle ${roomId}`}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${config.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>

        {/* ── Horaire salle ── */}
        {!isClosed && (
          <div className="px-3 pb-2.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Horaire salle</p>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className={roomIsLate ? 'text-red-500' : 'text-gray-600'} />
              <TimeInput
                value={openingTime} placeholder="--:--" editable={canManage} large
                onSave={v => onUpdateRoomSchedule(roomId, 'opening_time', v)}
              />
              <span className="text-gray-600 text-sm font-bold">–</span>
              <TimeInput
                value={closingTime} placeholder="--:--" editable={canManage} large
                onSave={v => onUpdateRoomSchedule(roomId, 'closing_time', v)}
              />
              {roomIsLate && <span className="text-red-400 text-xs font-bold">⚠</span>}
            </div>
          </div>
        )}

        {/* ── Séparateur ── */}
        <div className="border-t border-gray-800" />

        {/* ── Personnel ── */}
        <div className="flex-1 px-3 py-2.5">
          {isClosed ? (
            <div className="flex flex-col items-center justify-center py-5 text-center">
              <Lock size={22} className="text-gray-700 mb-2" />
              <p className="text-xs text-gray-600">Salle fermée</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Med <span className="text-gray-700 font-normal">({medecins.length})</span>
                </p>
                {medecins.length === 0
                  ? <p className="text-xs text-gray-700 italic">Aucun médecin</p>
                  : <ul className="space-y-1.5">
                      {medecins.map(a => (
                        <PersonRow key={a.id} a={a}
                          isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                          onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                          onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                          onRequestLeave={handleRequestLeave}
                        />
                      ))}
                    </ul>
                }
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  ISA <span className="text-gray-700 font-normal">({infirmiers.length})</span>
                </p>
                {infirmiers.length === 0
                  ? <p className="text-xs text-gray-700 italic">Aucun ISA</p>
                  : <ul className="space-y-1.5">
                      {infirmiers.map(a => (
                        <PersonRow key={a.id} a={a}
                          isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                          onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                          onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                          onRequestLeave={handleRequestLeave}
                        />
                      ))}
                    </ul>
                }
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="border-t border-gray-800 px-3 pt-2.5 pb-3 space-y-2">
          {!isClosed ? (
            <>
              {!isAssigned ? (
                <button onClick={() => setShowJoinConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  <UserPlus size={15} /> Rejoindre
                </button>
              ) : (
                <button onClick={() => myAssignment && handleRequestLeave(myAssignment)}
                  className="w-full flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors border border-gray-700">
                  <LogOut size={14} /> Me retirer
                </button>
              )}

              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => onAssign(roomId)}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium py-2 rounded-xl transition-colors border border-gray-700/80">
                    <Users size={13} /> Affecter
                  </button>
                  {isAdmin && (
                    <button onClick={() => onClose(roomId)}
                      className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs font-medium py-2 rounded-xl transition-colors border border-gray-700/80">
                      <Lock size={13} /> Fermer
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            isAdmin && (
              <button onClick={() => onOpen(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-green-900/20 hover:bg-green-900/40 text-green-400 text-sm font-medium py-2.5 rounded-xl transition-colors border border-green-700/30">
                <Unlock size={14} /> Ouvrir la salle
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}
