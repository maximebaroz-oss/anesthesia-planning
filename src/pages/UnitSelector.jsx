import { ArrowLeft, ChevronRight } from 'lucide-react'
import { SECTOR_STYLES } from '../config/sectors'

export default function UnitSelector({ sector, onSelect, onBack }) {
  const style = SECTOR_STYLES[sector.color]

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                {sector.name}
              </span>
            </div>
            <div className="text-white font-bold text-sm mt-0.5">Choisir un secteur</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-white text-xl font-bold mb-1">{sector.name}</h2>
        <p className="text-gray-500 text-sm mb-6">Sélectionnez un secteur</p>

        <div className="space-y-3">
          {sector.units.map(unit => (
            <button
              key={unit.id}
              onClick={() => onSelect(unit)}
              className={`w-full bg-gray-800 border-2 ${style.card} rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all hover:bg-gray-750 active:scale-98`}
            >
              <div>
                <div className="text-white font-bold text-base">{unit.name}</div>
                <div className={`text-xs mt-0.5 ${style.badge.split(' ')[1]}`}>{sector.name}</div>
              </div>
              <ChevronRight size={20} className="text-gray-500" />
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
