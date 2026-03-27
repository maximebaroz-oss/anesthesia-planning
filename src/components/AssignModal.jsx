import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { WARM } from '../config/theme'
import { GRADE_LABELS } from '../config/constants'

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div style={{ background: WARM.cardBg, borderColor: WARM.border }}
        className="border w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div style={{ background: WARM.cardHead, borderColor: WARM.border }}
          className="px-4 pt-3 pb-2.5 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-sm" style={{ color: WARM.text }}>{title}</h2>
            <p className="text-xs" style={{ color: WARM.textFaint }}>{roomName ?? `Salle ${roomId}`}</p>
          </div>
          <button onClick={onClose} style={{ color: WARM.textFaint }} className="p-1.5 rounded-full hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-3 py-2 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: WARM.textFaint }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..." autoFocus
              style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none placeholder-stone-400"
            />
          </div>
          {!defaultFilter && (
            <div className="flex gap-1.5">
              {[{ value: 'all', label: 'Tous' }, { value: 'medecin', label: 'Med' }, { value: 'infirmier', label: 'ISA' }].map(opt => (
                <button key={opt.value} onClick={() => setFilter(opt.value)}
                  style={filter === opt.value
                    ? { background: WARM.accentBar, color: '#fff' }
                    : { background: WARM.surface, color: WARM.textSub }}
                  className="flex-1 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80">
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {filtered.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: WARM.textFaint }}>Aucun personnel disponible</p>
          ) : (
            <div className="space-y-3">
              {(filter === 'all' || filter === 'medecin') && medSections.map(section => (
                <div key={section.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 px-1" style={{ color: WARM.accentBar }}>{section.label}</p>
                  <div>
                    {section.list.map(p => (
                      <button key={p.id} onClick={() => onAssign(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 text-left"
                        style={{ color: WARM.text }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">Dr. {p.full_name}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: WARM.textFaint }}>{GRADE_LABELS[p.grade] ?? ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {infirmiers.length > 0 && (filter === 'all' || filter === 'infirmier') && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 px-1" style={{ color: WARM.accentBar }}>ISA</p>
                  <div>
                    {infirmiers.map(p => (
                      <button key={p.id} onClick={() => onAssign(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 text-left"
                        style={{ color: WARM.text }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-sm truncate">{p.full_name}</span>
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
