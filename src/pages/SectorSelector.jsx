import { useState } from 'react'
import { ArrowLeft, ChevronRight, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ImportPlanningModal from '../components/ImportPlanningModal'

const UNIT_STYLES = {
  duhb:   { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#1D4ED8' },
  extop:  { bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B', text: '#475569' },
  unicat: { bg: '#FFF7ED', border: '#FED7AA', dot: '#F97316', text: '#C2410C' },
  bocha:  { bg: '#FAF5FF', border: '#E9D5FF', dot: '#A855F7', text: '#7E22CE' },
}

// Unités supportant l'import global de tous leurs secteurs
const UNIT_IMPORTS = new Set(['unicat'])

export default function SectorSelector({ unit, onSelect, onBack }) {
  const s = UNIT_STYLES[unit.id] ?? UNIT_STYLES.unicat
  const [showImport, setShowImport] = useState(false)
  const [profiles, setProfiles] = useState([])

  async function openUnitImport() {
    if (profiles.length === 0) {
      const { data } = await supabase.from('profiles').select('*').eq('profession', 'medecin')
      setProfiles(data ?? [])
    }
    setShowImport(true)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4F8' }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                <span className="text-xs font-semibold" style={{ color: s.text }}>{unit.name}</span>
              </div>
              <div className="text-slate-700 font-bold text-sm mt-0.5">Choisir un secteur</div>
            </div>
          </div>

          {UNIT_IMPORTS.has(unit.id) && (
            <button onClick={openUnitImport}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
              style={{ background: s.dot }}>
              <FileSpreadsheet size={14} />
              Import {unit.name}
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-slate-700 text-xl font-bold mb-1">{unit.name}</h2>
        <p className="text-slate-400 text-sm mb-6">Sélectionnez un secteur</p>

        <div className="space-y-3">
          {unit.sectors.map(sector => (
            <button key={sector.id} onClick={() => onSelect(sector)}
              style={{ background: s.bg, borderColor: s.border }}
              className="w-full border-2 rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all hover:shadow-md active:scale-98 hover:brightness-95">
              <div>
                <div className="font-bold text-base text-slate-800">{sector.name}</div>
                <div className="text-xs mt-0.5 font-medium" style={{ color: s.text }}>{unit.name}</div>
              </div>
              <ChevronRight size={20} style={{ color: s.dot }} />
            </button>
          ))}
        </div>
      </main>

      {showImport && (
        <ImportPlanningModal
          profiles={profiles}
          unit={unit}
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
