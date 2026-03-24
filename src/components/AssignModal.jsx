import { useState } from 'react'
import { X, Search } from 'lucide-react'

const GRADE_LABELS = {
  adjoint: 'Adj.',
  chef_clinique: 'CDC',
  interne: 'Int.',
  consultant: 'Cons.',
  iade: 'ISA',
}

export default function AssignModal({ roomId, roomName, profiles, assignments, today, defaultFilter, onAssign, onClose }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(defaultFilter ?? 'all')

  const alreadyInRoom = assignments
    .filter(a => a.room_id === roomId)
    .map(a => a.user_id)

  const filtered = profiles.filter(p => {
    if (alreadyInRoom.includes(p.id)) return false
    if (filter === 'medecin' && p.profession !== 'medecin') return false
    if (filter === 'infirmier' && p.profession !== 'infirmier') return false
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const medSections = [
    { label: 'Adjoints',    list: filtered.filter(p => p.profession === 'medecin' && p.grade === 'adjoint') },
    { label: 'CDC',         list: filtered.filter(p => p.profession === 'medecin' && p.grade === 'chef_clinique') },
    { label: 'Internes',    list: filtered.filter(p => p.profession === 'medecin' && p.grade === 'interne') },
    { label: 'Consultants', list: filtered.filter(p => p.profession === 'medecin' && p.grade === 'consultant') },
    { label: 'Médecins',    list: filtered.filter(p => p.profession === 'medecin' && !['adjoint','chef_clinique','interne','consultant'].includes(p.grade)) },
  ].filter(s => s.list.length > 0)
  const infirmiers = filtered.filter(p => p.profession === 'infirmier')

  const title = defaultFilter === 'medecin' ? 'Affecter un médecin'
              : defaultFilter === 'infirmier' ? 'Affecter un ISA'
              : 'Affecter du personnel'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-800 border border-gray-700 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-white text-sm">{title}</h2>
            <p className="text-xs text-gray-500">{roomName ?? `Salle ${roomId}`}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Search + filter (filter tabs only if not locked to one profession) */}
        <div className="px-3 py-2 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..." autoFocus
              className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {!defaultFilter && (
            <div className="flex gap-1.5">
              {[{ value: 'all', label: 'Tous' }, { value: 'medecin', label: 'Med' }, { value: 'infirmier', label: 'ISA' }].map(opt => (
                <button key={opt.value} onClick={() => setFilter(opt.value)}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List — compact */}
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">Aucun personnel disponible</p>
          ) : (
            <div className="space-y-3">
              {(filter === 'all' || filter === 'medecin') && medSections.map(section => (
                <div key={section.label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 px-1">{section.label}</p>
                  <div>
                    {section.list.map(p => (
                      <button key={p.id} onClick={() => onAssign(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-sm text-white truncate flex-1">Dr. {p.full_name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{GRADE_LABELS[p.grade] ?? ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {infirmiers.length > 0 && (filter === 'all' || filter === 'infirmier') && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 px-1">ISA</p>
                  <div>
                    {infirmiers.map(p => (
                      <button key={p.id} onClick={() => onAssign(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-sm text-white truncate">{p.full_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
