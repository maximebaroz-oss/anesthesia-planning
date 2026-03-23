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
  closed:      { bg: 'bg-gray-900 border-gray-700',    header: 'bg-gray-700',    badge: 'bg-gray-600 text-gray-300',    label: 'Fermée' },
  complete:    { bg: 'bg-gray-800 border-green-700',   header: 'bg-green-700',   badge: 'bg-green-600 text-white',      label: 'Au complet' },
  understaffed:{ bg: 'bg-gray-800 border-orange-600',  header: 'bg-orange-600',  badge: 'bg-orange-500 text-white',     label: 'Incomplet' },
  available:   { bg: 'bg-gray-800 border-gray-600',    header: 'bg-blue-700',    badge: 'bg-blue-900 text-blue-300',    label: 'Disponible' },
}

function TimeInput({ value, onSave, placeholder = '--:--', editable = true }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  if (!editable) {
    return <span className="text-xs text-gray-500">{value ?? placeholder}</span>
  }

  if (editing) {
    return (
      <input
        type="time"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
        className="w-16 bg-gray-900 border border-blue-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className="text-xs text-gray-400 hover:text-blue-400 transition-colors underline decoration-dashed underline-offset-2"
    >
      {value ?? placeholder}
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
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">Rejoindre la salle</h3>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Heure de début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors">
            Annuler
          </button>
          <button onClick={() => onConfirm(startTime)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
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
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">Quitter la salle ?</h3>
          {name && <p className="text-gray-400 text-xs mt-0.5">{name}</p>}
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Heure de fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors">
            Annuler
          </button>
          <button onClick={() => onConfirm(endTime)} className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonRow({ a, isToday, currentProfile, canManage, roomId, onUpdateTime, onLeave, onProfileClick, onMouseEnter, onMouseLeave, onRequestLeave }) {
  const endTime = a.end_time?.slice(0, 5) ?? null
  const startTime = a.start_time?.slice(0, 5) ?? null
  const personIsLate = isToday && endTime && isLate(endTime)
  const isMine = a.user_id === currentProfile?.id
  const isMedecin = a.profiles?.profession === 'medecin'

  return (
    <li className="flex items-center justify-between gap-1">
      <button
        onClick={() => onProfileClick(a.profiles)}
        onMouseEnter={(e) => onMouseEnter(a.profiles, e)}
        onMouseLeave={onMouseLeave}
        className={`text-sm truncate flex-1 text-left transition-colors flex items-center gap-1.5 ${
          personIsLate ? 'text-red-400 hover:text-red-300' : 'text-gray-200 hover:text-blue-400'
        }`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMedecin ? 'bg-red-500' : 'bg-blue-400'}`} />
        {a.profiles?.full_name}
        {a.profiles?.grade && (
          <span className="text-xs text-gray-500 ml-1">{gradeLabel(a.profiles.grade)}</span>
        )}
      </button>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Clock size={10} className="text-gray-600" />
        <TimeInput
          value={startTime}
          placeholder="début"
          editable={isMine || canManage}
          onSave={v => onUpdateTime(a.id, 'start_time', v)}
        />
        <span className="text-gray-600 text-xs">→</span>
        <TimeInput
          value={endTime}
          placeholder="fin"
          editable={isMine || canManage}
          onSave={v => onUpdateTime(a.id, 'end_time', v)}
        />
      </div>

      {(a.user_id === currentProfile?.id || canManage) && (
        <button
          onClick={() => onRequestLeave(a)}
          className="ml-0.5 p-1 rounded-full text-gray-600 hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
        >
          <X size={12} />
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
  const status = getRoomStatus(roomId, closures, assignments)
  const isClosed = status === 'closed'
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const medecins = roomAssignments.filter(a => a.profiles?.profession === 'medecin')
  const infirmiers = roomAssignments.filter(a => a.profiles?.profession === 'infirmier')

  const isAssigned = roomAssignments.some(a => a.user_id === currentProfile?.id)
  const isAdmin = currentProfile?.is_admin
  const canManage = currentProfile?.is_admin || currentProfile?.grade === 'chef_clinique'

  const closingTime = roomSchedule?.closing_time?.slice(0, 5) ?? null
  const openingTime = roomSchedule?.opening_time?.slice(0, 5) ?? null
  const roomIsLate = isToday && closingTime && isLate(closingTime) && roomAssignments.length > 0 && !isClosed

  const [tooltip, setTooltip] = useState(null)
  const timerRef = useRef(null)
  const [leaveTarget, setLeaveTarget] = useState(null)
  const [showJoinConfirm, setShowJoinConfirm] = useState(false)

  function handleMouseEnter(profile, e) {
    if (!profile?.phone) return
    const rect = e.currentTarget.getBoundingClientRect()
    timerRef.current = setTimeout(() => {
      setTooltip({ phone: profile.phone, top: rect.bottom + 6, left: rect.left })
    }, 1000)
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current)
    setTooltip(null)
  }

  function handleRequestLeave(a) {
    setLeaveTarget({ userId: a.user_id, assignmentId: a.id, name: a.profiles?.full_name })
  }

  async function handleConfirmLeave(endTime) {
    if (!leaveTarget) return
    if (endTime) await onUpdateTime(leaveTarget.assignmentId, 'end_time', endTime)
    await onLeave(roomId, leaveTarget.userId)
    setLeaveTarget(null)
  }

  const myAssignment = roomAssignments.find(a => a.user_id === currentProfile?.id)

  const config = STATUS_CONFIG[status]
  const headerBg = roomIsLate ? 'bg-red-700' : config.header

  return (
    <>
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg pointer-events-none flex items-center gap-1.5"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <Phone size={11} />
          {tooltip.phone}
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

      <div className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col ${config.bg} ${roomIsLate ? 'border-red-700' : ''}`}>
        {/* Header */}
        <div className={`${headerBg} px-3 py-2`}>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm">{roomName || `Salle ${roomId}`}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
          </div>
          {!isClosed && (
            <div className="flex items-center gap-1 mt-1">
              <Clock size={10} className="text-white/60" />
              <TimeInput
                value={openingTime}
                placeholder="ouv."
                editable={canManage}
                onSave={v => onUpdateRoomSchedule(roomId, 'opening_time', v)}
              />
              <span className="text-white/60 text-xs">-</span>
              <TimeInput
                value={closingTime}
                placeholder="ferm."
                editable={canManage}
                onSave={v => onUpdateRoomSchedule(roomId, 'closing_time', v)}
              />
              {roomIsLate && <span className="text-red-300 text-xs font-bold ml-1">⚠ Dépassé</span>}
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 px-3 pt-3 pb-2 space-y-3">
          {isClosed ? (
            <div className="text-center text-gray-500 py-4">
              <Lock size={24} className="mx-auto mb-1" />
              <p className="text-sm">Salle fermée</p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Med</span>
                  <span className="text-xs text-gray-600">({medecins.length})</span>
                </div>
                {medecins.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">Aucun médecin</p>
                ) : (
                  <ul className="space-y-1.5">
                    {medecins.map(a => (
                      <PersonRow
                        key={a.id} a={a}
                        isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                        roomId={roomId} onUpdateTime={onUpdateTime} onLeave={onLeave}
                        onProfileClick={onProfileClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                        onRequestLeave={handleRequestLeave}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ISA</span>
                  <span className="text-xs text-gray-600">({infirmiers.length})</span>
                </div>
                {infirmiers.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">Aucun infirmier</p>
                ) : (
                  <ul className="space-y-1.5">
                    {infirmiers.map(a => (
                      <PersonRow
                        key={a.id} a={a}
                        isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                        roomId={roomId} onUpdateTime={onUpdateTime} onLeave={onLeave}
                        onProfileClick={onProfileClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                        onRequestLeave={handleRequestLeave}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 space-y-2">
          {!isClosed && (
            <>
              {!isAssigned ? (
                <button onClick={() => setShowJoinConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl transition-colors">
                  <UserPlus size={15} /> Rejoindre
                </button>
              ) : (
                <button onClick={() => myAssignment && handleRequestLeave(myAssignment)}
                  className="w-full flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors">
                  <X size={15} /> Me retirer
                </button>
              )}
              {canManage && (
                <button onClick={() => onAssign(roomId)}
                  className="w-full flex items-center justify-center gap-1.5 bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-200 text-sm font-medium py-2 rounded-xl transition-colors">
                  <Users size={15} /> Affecter
                </button>
              )}
            </>
          )}

          {isAdmin && (
            <button onClick={() => isClosed ? onOpen(roomId) : onClose(roomId)}
              className={`w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-colors ${
                isClosed
                  ? 'bg-green-900/40 hover:bg-green-900/60 text-green-400 border border-green-700'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-400 border border-gray-600'
              }`}>
              {isClosed ? <><Unlock size={15} /> Ouvrir</> : <><Lock size={15} /> Fermer la salle</>}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
