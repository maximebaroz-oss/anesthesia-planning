import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { SECTORS, SECTOR_STYLES } from '../config/sectors'

export default function SectorSelector({ onSelect }) {
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <div>
              <div className="font-bold text-sm text-white">Planning Bloc</div>
              <div className="text-gray-400 text-xs capitalize">{today}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <div className="text-right">
                <div className="text-sm font-medium text-white">{profile.full_name}</div>
                <div className="text-xs text-gray-400">{profile.grade}</div>
              </div>
            )}
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-white text-xl font-bold mb-1">Choisir un secteur</h2>
        <p className="text-gray-500 text-sm mb-6">Sélectionnez votre secteur pour accéder au planning</p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTORS.map(sector => {
            const style = SECTOR_STYLES[sector.color]
            const hasUnits = sector.units.length > 0
            return (
              <button
                key={sector.id}
                onClick={() => hasUnits && onSelect(sector)}
                disabled={!hasUnits}
                className={`relative bg-gray-800 border-2 rounded-2xl p-5 text-left transition-all ${
                  hasUnits
                    ? `${style.card} hover:bg-gray-750 active:scale-95 cursor-pointer`
                    : 'border-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${style.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {sector.name}
                </div>
                <div className="text-white font-bold text-lg">{sector.name}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {hasUnits
                    ? `${sector.units.length} unité${sector.units.length > 1 ? 's' : ''}`
                    : 'À venir'}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
