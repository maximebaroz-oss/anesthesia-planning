import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { SECTORS } from '../config/sectors'

// Palette bloc opératoire — pastels cliniques
const UNIT_STYLES = {
  duhb:   { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#1D4ED8' },
  extop:  { bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B', text: '#475569' },
  unicat: { bg: '#FFF7ED', border: '#FED7AA', dot: '#F97316', text: '#C2410C' },
  bocha:  { bg: '#FAF5FF', border: '#E9D5FF', dot: '#A855F7', text: '#7E22CE' },
}

const GRADE_LABELS = {
  cadre: 'Cadre', chef_clinique: 'CDC', interne: 'Interne', iade: 'ISA',
}

export default function SectorSelector({ onSelect }) {
  const { profile, signOut } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4F8' }}>

      {/* Header — blanc clinique */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">PB</span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800">Planning Bloc</div>
              <div className="text-slate-400 text-xs capitalize">{today}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">
                  {profile.profession === 'medecin' ? `Dr. ${profile.full_name}` : profile.full_name}
                </div>
                <div className="text-xs text-slate-400">{GRADE_LABELS[profile.grade] ?? profile.grade}</div>
              </div>
            )}
            <button onClick={signOut}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-slate-700 text-xl font-bold mb-1">Choisir une unité</h2>
        <p className="text-slate-400 text-sm mb-6">Sélectionnez votre unité pour accéder au planning</p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTORS.map(sector => {
            const s = UNIT_STYLES[sector.id] ?? UNIT_STYLES.unicat
            const hasUnits = sector.units.length > 0
            return (
              <button
                key={sector.id}
                onClick={() => hasUnits && onSelect(sector)}
                disabled={!hasUnits}
                style={hasUnits
                  ? { background: s.bg, borderColor: s.border }
                  : { background: '#F8FAFC', borderColor: '#E2E8F0' }}
                className={`border-2 rounded-2xl p-5 text-left transition-all ${
                  hasUnits
                    ? 'hover:shadow-md active:scale-95 cursor-pointer hover:brightness-95'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                {/* Indicateur couleur */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: hasUnits ? s.dot : '#CBD5E1' }} />
                  <span className="text-xs font-semibold" style={{ color: hasUnits ? s.text : '#94A3B8' }}>
                    {sector.name}
                  </span>
                </div>

                <div className="font-bold text-lg" style={{ color: hasUnits ? '#1E293B' : '#94A3B8' }}>
                  {sector.name}
                </div>
                <div className="text-xs mt-1" style={{ color: hasUnits ? s.text : '#94A3B8' }}>
                  {hasUnits
                    ? `${sector.units.length} secteur${sector.units.length > 1 ? 's' : ''}`
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
