import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const GRADE_LABELS = {
  cadre: 'Cadre',
  chef_clinique: 'Chef de clinique',
  interne: 'Interne',
  iade: 'IADE',
}

export default function Header() {
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="bg-blue-800 text-white px-4 py-3 shadow-md sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="font-bold text-sm leading-tight">Planning Bloc</div>
            <div className="text-blue-200 text-xs capitalize">{today}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">{profile.full_name}</div>
              <div className="text-xs text-blue-300">
                {GRADE_LABELS[profile.grade] ?? profile.grade}
                {profile.is_admin && <span className="ml-1 text-yellow-300">★</span>}
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-blue-700 active:bg-blue-900 transition-colors"
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
