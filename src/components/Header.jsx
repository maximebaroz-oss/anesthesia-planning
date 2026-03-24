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
    <header style={{ background: '#FAF7F2', borderColor: '#DDD0B8' }}
      className="border-b text-white px-4 py-3 shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <button onClick={onMenuOpen}
              style={{ color: '#8B7355' }}
              className="p-1.5 rounded-lg hover:bg-[#F5EDE0] transition-colors">
              <Menu size={20} />
            </button>
          )}
          {onBack && (
            <button onClick={onBack}
              style={{ color: '#8B7355' }}
              className="p-1.5 rounded-lg hover:bg-[#F5EDE0] transition-colors mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide" style={{ color: '#B45309' }}>Planning Bloc</span>
              {sector && <span style={{ color: '#C9B89A' }} className="text-xs">|</span>}
              {sector && <span className="text-xs" style={{ color: '#8B7355' }}>{sector.name}</span>}
              {unit   && <span style={{ color: '#C9B89A' }} className="text-xs">/</span>}
              {unit   && <span className="text-xs" style={{ color: '#8B7355' }}>{unit.name}</span>}
            </div>
            <div className="text-xs capitalize" style={{ color: '#BFA98A' }}>{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight" style={{ color: '#2D1E08' }}>
                {profile.profession === 'medecin' ? `Dr. ${profile.full_name}` : profile.full_name}
              </div>
              <div className="text-xs" style={{ color: '#8B7355' }}>
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1" style={{ color: '#D97706' }}>★</span>}
              </div>
            </div>
          )}
          <button onClick={signOut}
            style={{ color: '#8B7355' }}
            className="p-2 rounded-lg hover:bg-[#F5EDE0] transition-colors"
            title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
