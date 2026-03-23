import { useState } from 'react'
import { X, Search } from 'lucide-react'

const GRADE_LABELS = {
  cadre: 'Cadre',
  chef_clinique: 'CDC',
  interne: 'Interne',
  iade: 'ISA',
}

export default function AssignModal({ roomId, profiles, assignments, today, onAssign, onClose }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

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

  const cadres   = filtered.filter(p => p.profession === 'medecin' && p.grade === 'cadre')
  const cdcs     = filtered.filter(p => p.profession === 'medecin' && p.grade === 'chef_clinique')
  const internes = filtered.filter(p => p.profession === 'medecin' && p.grade === 'interne')
  const autresMed = filtered.filter(p => p.profession === 'medecin' && !['cadre','chef_clinique','interne'].includes(p.grade))
  const infirmiers = filtered.filter(p => p.profession === 'infirmier')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-800 border border-gray-700 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-white">Affecter à la Salle {roomId}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sélectionnez un membre du personnel</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-4 py-3 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'medecin', label: 'Med' },
              { value: 'infirmier', label: 'ISA' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">Aucun personnel disponible</p>
          ) : (
            <div className="space-y-4">
              {(filter === 'all' || filter === 'medecin') && (
                <>
                  {[
                    { label: 'Cadres',  list: cadres },
                    { label: 'CDC',     list: cdcs },
                    { label: 'Internes',list: internes },
                    { label: 'Médecins',list: autresMed },
                  ].filter(s => s.list.length > 0).map(section => (
                    <div key={section.label}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{section.label}</p>
                      <div className="space-y-1">
                        {section.list.map(p => (
                          <button
                            key={p.id}
                            onClick={() => onAssign(p.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-700 active:bg-gray-600 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-red-300 font-bold text-sm flex-shrink-0">
                              {p.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">Dr. {p.full_name}</p>
                              <p className="text-xs text-gray-400">{GRADE_LABELS[p.grade] ?? p.grade}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {infirmiers.length > 0 && (filter === 'all' || filter === 'infirmier') && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Infirmiers (ISA)
                  </p>
                  <div className="space-y-1">
                    {infirmiers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => onAssign(p.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-700 active:bg-gray-600 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold text-sm flex-shrink-0">
                          {p.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.full_name}</p>
                          <p className="text-xs text-gray-400">ISA</p>
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
    </div>
  )
}
