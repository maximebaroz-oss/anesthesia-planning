import { LogOut, ArrowLeft, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const GRADE_LABELS = {
  cadre: 'Cadre',
  chef_clinique: 'Chef de clinique',
  interne: 'Interne',
  iade: 'ISA',
}

export default function Header({ sector, unit, onBack, onMenuOpen }) {
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="bg-[#0D1117] border-b border-gray-800 text-white px-4 py-3 shadow-lg sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <button
              onClick={onMenuOpen}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors mr-1"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-2xl">🏥</span>
          <div>
            <div className="flex items-center gap-1.5">
              {sector && <span className="text-xs font-bold text-gray-400">{sector.name}</span>}
              {sector && unit && <span className="text-gray-600 text-xs">/</span>}
              {unit && <span className="font-bold text-sm text-white">{unit.name}</span>}
              {!sector && <span className="font-bold text-sm text-white">Planning Bloc</span>}
            </div>
            <div className="text-gray-400 text-xs capitalize">{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight text-white">{profile.full_name}</div>
              <div className="text-xs text-gray-400">
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1 text-yellow-400">★</span>}
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors text-gray-400 hover:text-white"
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
