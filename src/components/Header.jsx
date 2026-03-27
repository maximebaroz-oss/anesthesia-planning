import { LogOut, ArrowLeft, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { GRADE_LABELS_FULL as GRADE_LABELS } from '../config/constants'

export default function Header({ sector, unit, onBack, onMenuOpen }) {
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <header style={{ background: '#F0EDE8', borderColor: '#CEC8BF' }}
      className="border-b text-white px-4 py-3 shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <button onClick={onMenuOpen}
              style={{ color: '#6B5F52' }}
              className="p-1.5 rounded-lg hover:bg-[#F5EDE0] transition-colors">
              <Menu size={20} />
            </button>
          )}
          {onBack && (
            <button onClick={onBack}
              style={{ color: '#6B5F52' }}
              className="p-1.5 rounded-lg hover:bg-[#F5EDE0] transition-colors mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide" style={{ color: '#6B5C48' }}>Planning Bloc</span>
              {sector && <span style={{ color: '#B8B0A4' }} className="text-xs"> · </span>}
              {sector && <span className="text-xs" style={{ color: '#6B5F52' }}>{sector.name}</span>}
              {unit   && <span style={{ color: '#B8B0A4' }} className="text-xs"> › </span>}
              {unit   && <span className="text-xs font-semibold" style={{ color: '#2A2318' }}>{unit.name}</span>}
            </div>
            <div className="text-xs capitalize" style={{ color: '#9E9489' }}>{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight" style={{ color: '#2A2318' }}>
                {profile.profession === 'medecin' ? `Dr. ${profile.full_name}` : profile.full_name}
              </div>
              <div className="text-xs" style={{ color: '#6B5F52' }}>
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1" style={{ color: '#8A7560' }}>★</span>}
              </div>
            </div>
          )}
          <button onClick={signOut}
            style={{ color: '#6B5F52' }}
            className="p-2 rounded-lg hover:bg-[#F5EDE0] transition-colors"
            title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
