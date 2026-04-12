import { useState, useRef, useEffect } from 'react'
import { UserPlus, X, Lock, Unlock, Phone, Clock, LogOut, CheckCircle, ChevronDown } from 'lucide-react'
import { getCurrentTime, formatLastFirst, isNightOrWE } from '../config/constants'
import { WARM, SKY } from '../config/theme'

function isLate(timeStr) {
  if (!timeStr) return false
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  const target = new Date()
  target.setHours(h, m, 0, 0)
  return now > target
}

function getRoomStatus(roomId, closures, assignments, noISA = false) {
  if (closures.some(c => c.room_id === roomId)) return 'closed'
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const hasMedecin   = roomAssignments.some(a => a.profiles?.profession === 'medecin')
  const hasInfirmier = roomAssignments.some(a => a.profiles?.profession === 'infirmier')
  if (noISA) {
    if (hasMedecin) return 'complete'
    return 'available'
  }
  if (hasMedecin && hasInfirmier) return 'complete'
  if (hasMedecin || hasInfirmier) return 'understaffed'
  return 'available'
}

const STATUS_CONFIG = {
  closed:       { dot: 'bg-stone-400',  label: 'Fermée'     },
  complete:     { dot: 'bg-green-500',  label: 'Complet'    },
  understaffed: { dot: 'bg-orange-400', label: 'Incomplet'  },
  available:    { dot: 'bg-amber-400',  label: 'Disponible' },
}


function TimeInput({ value, onSave, placeholder = '--:--', editable = true, large = false, theme }) {
  const T = theme ?? WARM
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value ?? '')

  const cls = large ? 'text-2xl font-bold tracking-tight' : 'text-xs'
  const style = large ? { color: T.text } : { color: T.textSub }

  if (!editable)
    return <span className={cls} style={style}>{value ?? <span style={{ color: T.textFaint }}>{placeholder}</span>}</span>

  if (editing)
    return (
      <input type="time" value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(draft); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{ background: T.surface, borderColor: T.accentBar, color: T.text }}
        className={`border rounded px-1 py-0.5 focus:outline-none ${large ? 'w-20 text-xl' : 'w-16 text-xs'}`}
        autoFocus
      />
    )

  return (
    <button onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className={`hover:opacity-60 transition-opacity ${cls}`} style={style}>
      {value ?? <span style={{ color: T.textFaint }}>{placeholder}</span>}
    </button>
  )
}

function gradeLabel(grade) {
  if (grade === 'adjoint')      return 'Adjoint'
  if (grade === 'chef_clinique') return 'CDC'
  if (grade === 'interne')      return 'Interne'
  return ''
}

function TypeBadge({ isMedecin, theme }) {
  const T = theme ?? WARM
  return (
    <span style={{
      background: T.surface,
      borderColor: isMedecin ? '#FCA5A5' : '#93C5FD',
      color: isMedecin ? '#DC2626' : '#2563EB',
    }} className="text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0">
      {isMedecin ? 'MED' : 'ISA'}
    </span>
  )
}

function JoinConfirmModal({ onConfirm, onCancel, theme }) {
  const T = theme ?? WARM
  const [startTime, setStartTime] = useState(getCurrentTime())
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div style={{ borderColor: T.border, color: T.text }} className="px-5 py-4 border-b font-bold">
          Rejoindre la salle
        </div>
        <div className="px-5 py-4">
          <label style={{ color: T.textSub }} className="text-xs font-semibold uppercase tracking-widest block mb-2">
            Heure de début
          </label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{ background: T.surface, borderColor: T.border, color: T.text }}
            className="w-full border rounded-xl px-3 py-2.5 focus:outline-none" />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel}
            style={{ background: T.surface, color: T.textSub }}
            className="flex-1 text-sm font-medium py-2.5 rounded-xl hover:opacity-80 transition-opacity">
            Annuler
          </button>
          <button onClick={() => onConfirm(startTime)}
            style={{ background: T.accentBar }}
            className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
            <UserPlus size={14} /> Rejoindre
          </button>
        </div>
      </div>
    </div>
  )
}

function LeaveConfirmModal({ name, onConfirm, onCancel, theme }) {
  const T = theme ?? WARM
  const [endTime, setEndTime] = useState(getCurrentTime())
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div style={{ background: T.cardBg, borderColor: T.border }}
        className="border rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div style={{ borderColor: T.border }} className="px-5 py-4 border-b">
          <p style={{ color: T.text }} className="font-bold">Quitter la salle ?</p>
          {name && <p style={{ color: T.textSub }} className="text-xs mt-0.5">{name}</p>}
        </div>
        <div className="px-5 py-4">
          <label style={{ color: T.textSub }} className="text-xs font-semibold uppercase tracking-widest block mb-2">
            Heure de fin
          </label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={{ background: T.surface, borderColor: T.border, color: T.text }}
            className="w-full border rounded-xl px-3 py-2.5 focus:outline-none" />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onCancel}
            style={{ background: T.surface, color: T.textSub }}
            className="flex-1 text-sm font-medium py-2.5 rounded-xl hover:opacity-80 transition-opacity">
            Annuler
          </button>
          <button onClick={() => onConfirm(endTime)}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonRow({ a, isToday, currentProfile, canManage, onUpdateTime, onProfileClick, onMouseEnter, onMouseLeave, onRequestLeave, theme }) {
  const T = theme ?? WARM
  const endTime      = a.end_time?.slice(0, 5)   ?? null
  const startTime    = a.start_time?.slice(0, 5) ?? null
  const personIsLate = isToday && endTime && isLate(endTime)
  const isMine       = a.user_id === currentProfile?.id
  const isMedecin    = a.profiles?.profession === 'medecin'
  const isValidated  = !!startTime
  const isSenior     = ['adjoint', 'chef_clinique'].includes(a.profiles?.grade)
  const canValidate  = !!currentProfile

  const borderColor = isValidated
    ? (isMedecin ? '#86EFAC' : '#93C5FD')
    : T.border
  const borderCls = isValidated && isSenior ? 'border-4' : 'border'

  return (
    <li style={{ background: T.surface, borderColor }}
      className={`rounded-xl px-2.5 py-2 space-y-1 ${borderCls}`}>
      <div className="flex items-center gap-2 min-w-0">
        <TypeBadge isMedecin={isMedecin} theme={theme} />
        <button onClick={() => onProfileClick(a.profiles)}
          onMouseEnter={e => onMouseEnter(a.profiles, e)} onMouseLeave={onMouseLeave}
          className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-semibold ${personIsLate ? 'text-red-500' : ''}`}
            style={personIsLate ? {} : { color: T.text }}>
            {isMedecin ? `Dr. ${formatLastFirst(a.profiles?.full_name)}` : formatLastFirst(a.profiles?.full_name)}
          </p>
          {a.profiles?.grade && (
            <p className="text-xs leading-none" style={{ color: T.textFaint }}>{gradeLabel(a.profiles.grade)}</p>
          )}
        </button>

        {!isValidated && canValidate && (
          <button
            onClick={() => onUpdateTime(a.id, 'start_time', getCurrentTime())}
            title="Valider la présence"
            style={{ color: isMedecin ? '#16A34A' : '#2563EB' }}
            className="p-0.5 hover:opacity-70 transition-opacity flex-shrink-0">
            <CheckCircle size={14} />
          </button>
        )}

        {(isMine || canManage) && (
          <button onClick={() => onRequestLeave(a)}
            style={{ color: T.textFaint }}
            className="p-0.5 hover:text-red-500 transition-colors flex-shrink-0">
            <X size={11} />
          </button>
        )}
      </div>

      {isValidated && (
        <div className="flex items-center gap-1 pl-8">
          <Clock size={9} style={{ color: T.textFaint }} className="flex-shrink-0" />
          <TimeInput value={startTime} placeholder="--:--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'start_time', v)} theme={theme} />
          <span style={{ color: T.textFaint }} className="text-xs">→</span>
          <TimeInput value={endTime}   placeholder="--:--" editable={isMine || canManage} onSave={v => onUpdateTime(a.id, 'end_time',   v)} theme={theme} />
          {!personIsLate && (
            <div className="ml-1 w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600" style={{ fontSize: '9px' }}>✓</span>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default function RoomCard({
  roomId, roomName, assignments, closures, roomSchedule,
  currentProfile, isToday,
  onJoin, onLeave, onClose, onOpen, onAssign, onProfileClick,
  onUpdateTime, onUpdateRoomSchedule,
  noISA = false,
  theme,
}) {
  const T = theme ?? WARM

  const status          = getRoomStatus(roomId, closures, assignments, noISA)
  const isClosed        = status === 'closed'
  const GRADE_SORT = { adjoint: 0, chef_clinique: 1, interne: 2, consultant: 3, iade: 4 }
  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const medecins        = roomAssignments
    .filter(a => a.profiles?.profession === 'medecin')
    .sort((a, b) => (GRADE_SORT[a.profiles?.grade] ?? 9) - (GRADE_SORT[b.profiles?.grade] ?? 9))
  const infirmiers      = roomAssignments.filter(a => a.profiles?.profession === 'infirmier')
  const isAssigned      = roomAssignments.some(a => a.user_id === currentProfile?.id)
  const isAdmin         = currentProfile?.is_admin
  const canManage       = currentProfile?.is_admin || currentProfile?.grade === 'chef_clinique'
  const config          = STATUS_CONFIG[status]

  const closingTime = roomSchedule?.closing_time?.slice(0, 5) ?? null
  const openingTime = roomSchedule?.opening_time?.slice(0, 5) ?? null
  const roomIsLate  = isToday && closingTime && isLate(closingTime) && roomAssignments.length > 0 && !isClosed

  const hasMedecin = medecins.length > 0
  const [collapsed, setCollapsed] = useState(!hasMedecin || isClosed)

  useEffect(() => {
    if (hasMedecin) setCollapsed(false)
  }, [hasMedecin])

  const [tooltip,         setTooltip]         = useState(null)
  const timerRef                              = useRef(null)
  const [leaveTarget,     setLeaveTarget]     = useState(null)
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
        <div style={{ background: T.cardBg, borderColor: T.border, top: tooltip.top, left: tooltip.left, color: T.text }}
          className="fixed z-50 border text-xs rounded-xl px-3 py-1.5 shadow-xl pointer-events-none flex items-center gap-1.5">
          <Phone size={11} style={{ color: T.accentBar }} /> {tooltip.phone}
        </div>
      )}
      {showJoinConfirm && (
        <JoinConfirmModal
          theme={theme}
          onConfirm={st => { onJoin(roomId, st); setShowJoinConfirm(false) }}
          onCancel={() => setShowJoinConfirm(false)}
        />
      )}
      {leaveTarget && (
        <LeaveConfirmModal theme={theme} name={leaveTarget.name} onConfirm={handleConfirmLeave} onCancel={() => setLeaveTarget(null)} />
      )}

      <div style={{
        background: T.cardBg,
        borderColor: roomIsLate ? '#EF4444' : T.border,
        boxShadow: '0 2px 12px rgba(180,130,60,0.08)',
      }} className="rounded-2xl border overflow-hidden flex flex-col">

        {/* En-tête */}
        <div style={{ background: isNightOrWE(roomName) ? T.accentBar + '28' : T.cardHead, borderColor: T.border }}
          className="px-3 pt-3 pb-2.5 flex items-center justify-between gap-2 border-b cursor-pointer select-none"
          onClick={() => setCollapsed(v => !v)}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={{ background: T.accentBar }} className="w-0.5 h-4 rounded-full flex-shrink-0" />
            <span className="font-bold text-sm" style={{ color: isClosed ? T.textFaint : T.text }}>
              {roomSchedule?.activity ?? roomName ?? `Salle ${roomId}`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-3.5 h-3.5 rounded-full ${config.dot}`} />
            {isClosed && <Lock size={13} style={{ color: T.textFaint }} />}
            <ChevronDown size={14} style={{ color: T.textFaint, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
          </div>
        </div>

        {!collapsed && (<>
        {/* Horaire salle */}
        {!isClosed && (
          <div className="px-3 pt-2.5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: T.textFaint }}>Horaire</p>
            <div className="flex items-center gap-1.5">
              <TimeInput value={openingTime} placeholder="--:--" editable={canManage} large theme={theme}
                onSave={v => onUpdateRoomSchedule(roomId, 'opening_time', v)} />
              <span className="text-xl font-bold" style={{ color: roomIsLate ? '#EF4444' : T.text }}> - </span>
              <TimeInput value={closingTime} placeholder="--:--" editable={canManage} large theme={theme}
                onSave={v => onUpdateRoomSchedule(roomId, 'closing_time', v)} />
              {roomIsLate && <span className="text-red-500 text-xs font-bold ml-1">⚠</span>}
            </div>
          </div>
        )}

        {/* Séparateur */}
        <div style={{ borderColor: T.border }} className="border-t mx-3" />

        {/* Personnel */}
        <div className="flex-1 px-3 py-3">
          {isClosed ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Lock size={24} style={{ color: T.textFaint }} className="mb-2" />
              <p className="text-sm font-medium" style={{ color: T.textFaint }}>Salle fermée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Médecins */}
              <div className="space-y-1.5">
                {medecins.map(a => (
                  <PersonRow key={a.id} a={a} theme={theme}
                    isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                    onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                    onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                    onRequestLeave={handleRequestLeave} />
                ))}
                {canManage ? (
                  <button onClick={() => onAssign(roomId, 'medecin')}
                    style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                    className="w-6 h-6 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity text-sm font-bold flex-shrink-0">
                    +
                  </button>
                ) : medecins.length === 0 ? (
                  <span className="text-xs italic" style={{ color: T.textFaint }}>Aucun médecin</span>
                ) : null}
              </div>

              {/* ISA — masqué si noISA */}
              {!noISA && (
                <div className="space-y-1.5">
                  {infirmiers.map(a => (
                    <PersonRow key={a.id} a={a} theme={theme}
                      isToday={isToday} currentProfile={currentProfile} canManage={canManage}
                      onUpdateTime={onUpdateTime} onProfileClick={onProfileClick}
                      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                      onRequestLeave={handleRequestLeave} />
                  ))}
                  {canManage ? (
                    <button onClick={() => onAssign(roomId, 'infirmier')}
                      style={{ borderColor: '#93C5FD', color: '#2563EB' }}
                      className="w-6 h-6 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity text-sm font-bold flex-shrink-0">
                      +
                    </button>
                  ) : infirmiers.length === 0 ? (
                    <span className="text-xs italic" style={{ color: T.textFaint }}>Aucun ISA</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ borderColor: T.border }} className="border-t px-3 pt-2.5 pb-3 space-y-2">
          {!isClosed ? (
            <>
              {!isAssigned ? (
                <button onClick={() => setShowJoinConfirm(true)}
                  style={{ background: T.accentBar }}
                  className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                  <UserPlus size={15} /> Rejoindre
                </button>
              ) : (
                <button onClick={() => myAssignment && handleRequestLeave(myAssignment)}
                  style={{ background: T.surface, borderColor: T.border, color: T.textSub }}
                  className="w-full flex items-center justify-center gap-2 border text-sm font-medium py-2.5 rounded-xl hover:opacity-80 transition-opacity">
                  <LogOut size={14} /> Me retirer
                </button>
              )}
              {isAdmin && (
                <button onClick={() => onClose(roomId)}
                  style={{ background: T.surface, borderColor: T.border, color: T.textFaint }}
                  className="flex items-center justify-center border p-2 rounded-xl hover:opacity-80 transition-opacity">
                  <Lock size={16} />
                </button>
              )}
            </>
          ) : (
            isAdmin && (
              <button onClick={() => onOpen(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium py-2.5 rounded-xl transition-colors border border-green-200">
                <Unlock size={14} /> Ouvrir la salle
              </button>
            )
          )}
        </div>
        </>)}
      </div>
    </>
  )
}
