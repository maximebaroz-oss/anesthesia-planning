import { useState, useRef } from 'react'
import { UserPlus, X, Lock, Unlock, Users, Phone } from 'lucide-react'

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
  closed: {
    bg: 'bg-gray-900 border-gray-700',
    header: 'bg-gray-700',
    badge: 'bg-gray-600 text-gray-300',
    label: 'Fermée',
    dot: 'bg-gray-500',
    text: 'text-white',
    subtext: 'text-gray-400',
  },
  complete: {
    bg: 'bg-gray-800 border-green-700',
    header: 'bg-green-700',
    badge: 'bg-green-600 text-white',
    label: 'Au complet',
    dot: 'bg-green-500',
    text: 'text-white',
    subtext: 'text-gray-400',
  },
  understaffed: {
    bg: 'bg-gray-800 border-orange-600',
    header: 'bg-orange-600',
    badge: 'bg-orange-500 text-white',
    label: 'Incomplet',
    dot: 'bg-orange-400',
    text: 'text-white',
    subtext: 'text-gray-400',
  },
  available: {
    bg: 'bg-gray-800 border-gray-600',
    header: 'bg-blue-700',
    badge: 'bg-blue-900 text-blue-300',
    label: 'Disponible',
    dot: 'bg-blue-400',
    text: 'text-white',
    subtext: 'text-gray-400',
  },
}

export default function RoomCard({
  roomId,
  assignments,
  closures,
  currentProfile,
  onJoin,
  onLeave,
  onClose,
  onOpen,
  onAssign,
  onProfileClick,
}) {
  const status = getRoomStatus(roomId, closures, assignments)
  const config = STATUS_CONFIG[status]
  const isClosed = status === 'closed'

  const roomAssignments = assignments.filter(a => a.room_id === roomId)
  const medecins = roomAssignments.filter(a => a.profiles?.profession === 'medecin')
  const infirmiers = roomAssignments.filter(a => a.profiles?.profession === 'infirmier')

  const isAssigned = roomAssignments.some(a => a.user_id === currentProfile?.id)
  const isAdmin = currentProfile?.is_admin
  const canManage = currentProfile?.is_admin || currentProfile?.grade === 'chef_clinique'

  const [tooltip, setTooltip] = useState(null)
  const timerRef = useRef(null)

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

  function gradeLabel(grade) {
    if (grade === 'cadre') return 'Cadre'
    if (grade === 'chef_clinique') return 'CDC'
    if (grade === 'interne') return 'Int.'
    return ''
  }

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
    <div className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col ${config.bg}`}>
      {/* Header bar */}
      <div className={`${config.header} px-3 py-2 flex items-center justify-between`}>
        <span className="text-white font-bold text-base">Salle {roomId}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 pt-3 pb-2 space-y-3">
        {isClosed ? (
          <div className="text-center text-gray-500 py-4">
            <Lock size={24} className="mx-auto mb-1" />
            <p className="text-sm">Salle fermée</p>
          </div>
        ) : (
          <>
            {/* Médecins (MA) */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MA</span>
                <span className="text-xs text-gray-600">({medecins.length})</span>
              </div>
              {medecins.length === 0 ? (
                <p className="text-xs text-gray-600 italic">Aucun médecin</p>
              ) : (
                <ul className="space-y-1">
                  {medecins.map(a => (
                    <li key={a.id} className="flex items-center justify-between">
                      <button
                        onClick={() => onProfileClick(a.profiles)}
                        onMouseEnter={(e) => handleMouseEnter(a.profiles, e)}
                        onMouseLeave={handleMouseLeave}
                        className="text-sm text-gray-200 truncate flex-1 text-left hover:text-blue-400 transition-colors"
                      >
                        {a.profiles?.full_name}
                        {a.profiles?.grade && (
                          <span className="text-xs text-gray-500 ml-1">
                            {gradeLabel(a.profiles.grade)}
                          </span>
                        )}
                      </button>
                      {(a.user_id === currentProfile?.id || canManage) && (
                        <button
                          onClick={() => onLeave(roomId, a.user_id)}
                          className="ml-1 p-1 rounded-full text-gray-600 hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Infirmiers (IADE) */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IADE</span>
                <span className="text-xs text-gray-600">({infirmiers.length})</span>
              </div>
              {infirmiers.length === 0 ? (
                <p className="text-xs text-gray-600 italic">Aucun infirmier</p>
              ) : (
                <ul className="space-y-1">
                  {infirmiers.map(a => (
                    <li key={a.id} className="flex items-center justify-between">
                      <button
                        onClick={() => onProfileClick(a.profiles)}
                        onMouseEnter={(e) => handleMouseEnter(a.profiles, e)}
                        onMouseLeave={handleMouseLeave}
                        className="text-sm text-gray-200 truncate flex-1 text-left hover:text-blue-400 transition-colors"
                      >
                        {a.profiles?.full_name}
                      </button>
                      {(a.user_id === currentProfile?.id || canManage) && (
                        <button
                          onClick={() => onLeave(roomId, a.user_id)}
                          className="ml-1 p-1 rounded-full text-gray-600 hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </li>
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
              <button
                onClick={() => onJoin(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
              >
                <UserPlus size={15} />
                Me rejoindre
              </button>
            ) : (
              <button
                onClick={() => onLeave(roomId, currentProfile.id)}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors"
              >
                <X size={15} />
                Me retirer
              </button>
            )}
            {canManage && (
              <button
                onClick={() => onAssign(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-200 text-sm font-medium py-2 rounded-xl transition-colors"
              >
                <Users size={15} />
                Affecter
              </button>
            )}
          </>
        )}

        {isAdmin && (
          <button
            onClick={() => (isClosed ? onOpen(roomId) : onClose(roomId))}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-colors ${
              isClosed
                ? 'bg-green-900/40 hover:bg-green-900/60 text-green-400 border border-green-700'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-400 border border-gray-600'
            }`}
          >
            {isClosed ? (
              <>
                <Unlock size={15} /> Ouvrir la salle
              </>
            ) : (
              <>
                <Lock size={15} /> Fermer la salle
              </>
            )}
          </button>
        )}
      </div>
    </div>
    </>
  )
}
