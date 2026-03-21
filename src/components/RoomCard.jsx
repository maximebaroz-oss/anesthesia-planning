import { UserPlus, X, Lock, Unlock, Users } from 'lucide-react'

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
    bg: 'bg-gray-100 border-gray-300',
    header: 'bg-gray-300',
    badge: 'bg-gray-500 text-white',
    label: 'Fermée',
    dot: 'bg-gray-500',
  },
  complete: {
    bg: 'bg-green-50 border-green-300',
    header: 'bg-green-500',
    badge: 'bg-green-600 text-white',
    label: 'Au complet',
    dot: 'bg-green-500',
  },
  understaffed: {
    bg: 'bg-orange-50 border-orange-300',
    header: 'bg-orange-400',
    badge: 'bg-orange-500 text-white',
    label: 'Incomplet',
    dot: 'bg-orange-400',
  },
  available: {
    bg: 'bg-white border-blue-200',
    header: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Disponible',
    dot: 'bg-blue-400',
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

  function gradeLabel(grade) {
    if (grade === 'cadre') return 'Cadre'
    if (grade === 'chef_clinique') return 'CCA'
    if (grade === 'interne') return 'Int.'
    return ''
  }

  return (
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
          <div className="text-center text-gray-400 py-4">
            <Lock size={24} className="mx-auto mb-1" />
            <p className="text-sm">Salle fermée</p>
          </div>
        ) : (
          <>
            {/* Médecins (MAR) */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MAR</span>
                <span className="text-xs text-gray-400">({medecins.length})</span>
              </div>
              {medecins.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun médecin</p>
              ) : (
                <ul className="space-y-1">
                  {medecins.map(a => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 truncate flex-1">
                        {a.profiles?.full_name}
                        {a.profiles?.grade && (
                          <span className="text-xs text-gray-400 ml-1">
                            {gradeLabel(a.profiles.grade)}
                          </span>
                        )}
                      </span>
                      {(a.user_id === currentProfile?.id || canManage) && (
                        <button
                          onClick={() => onLeave(roomId, a.user_id)}
                          className="ml-1 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
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
                <span className="text-xs text-gray-400">({infirmiers.length})</span>
              </div>
              {infirmiers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun infirmier</p>
              ) : (
                <ul className="space-y-1">
                  {infirmiers.map(a => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 truncate flex-1">
                        {a.profiles?.full_name}
                      </span>
                      {(a.user_id === currentProfile?.id || canManage) && (
                        <button
                          onClick={() => onLeave(roomId, a.user_id)}
                          className="ml-1 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
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
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium py-2 rounded-xl transition-colors"
              >
                <UserPlus size={15} />
                Me rejoindre
              </button>
            ) : (
              <button
                onClick={() => onLeave(roomId, currentProfile.id)}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 text-sm font-medium py-2 rounded-xl transition-colors"
              >
                <X size={15} />
                Me retirer
              </button>
            )}
            {canManage && (
              <button
                onClick={() => onAssign(roomId)}
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 rounded-xl transition-colors"
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
                ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300'
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
  )
}
