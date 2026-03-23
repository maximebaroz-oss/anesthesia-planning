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
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <header style={{ background: '#150D04', borderColor: '#3D2A1060' }}
      className="border-b text-white px-4 py-3 shadow-xl sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <button onClick={onMenuOpen}
              style={{ '--hover-bg': '#2D1E08' }}
              className="p-1.5 rounded-lg hover:bg-[#2D1E08] text-stone-500 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
          )}
          {onBack && (
            <button onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-[#2D1E08] text-stone-500 hover:text-white transition-colors mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-400 text-sm tracking-wide">Planning Bloc</span>
              {sector && <span className="text-stone-700 text-xs">|</span>}
              {sector && <span className="text-xs text-stone-500">{sector.name}</span>}
              {unit   && <span className="text-stone-600 text-xs">/</span>}
              {unit   && <span className="text-xs text-stone-400">{unit.name}</span>}
            </div>
            <div className="text-stone-600 text-xs capitalize">{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight text-white">
                {profile.profession === 'medecin' ? `Dr. ${profile.full_name}` : profile.full_name}
              </div>
              <div className="text-xs text-stone-500">
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1 text-amber-400">★</span>}
              </div>
            </div>
          )}
          <button onClick={signOut}
            className="p-2 rounded-lg hover:bg-[#2D1E08] transition-colors text-stone-500 hover:text-white"
            title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
