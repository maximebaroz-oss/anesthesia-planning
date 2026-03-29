import { LogOut, ArrowLeft, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { GRADE_LABELS_FULL as GRADE_LABELS } from '../config/constants'
import { WARM } from '../config/theme'

export default function Header({ unit, sector, onBack, onMenuOpen, theme }) {
  const T = theme ?? WARM
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <header style={{ background: T.cardHead, borderColor: T.border }}
      className="border-b px-4 py-3 shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <button onClick={onMenuOpen}
              style={{ color: T.textSub }}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity">
              <Menu size={20} />
            </button>
          )}
          {onBack && (
            <button onClick={onBack}
              style={{ color: T.textSub }}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide" style={{ color: T.text }}>Planning Bloc</span>
              {unit   && <span style={{ color: T.textFaint }} className="text-xs"> · </span>}
              {unit   && <span className="text-xs" style={{ color: T.textSub }}>{unit.name}</span>}
              {sector && <span style={{ color: T.textFaint }} className="text-xs"> › </span>}
              {sector && <span className="text-xs font-semibold" style={{ color: T.text }}>{sector.name}</span>}
            </div>
            <div className="text-xs capitalize" style={{ color: T.textFaint }}>{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight" style={{ color: T.text }}>
                {profile.profession === 'medecin' ? `Dr. ${profile.full_name}` : profile.full_name}
              </div>
              <div className="text-xs" style={{ color: T.textSub }}>
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1" style={{ color: T.accentBar }}>★</span>}
              </div>
            </div>
          )}
          <button onClick={signOut}
            style={{ color: T.textSub }}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
