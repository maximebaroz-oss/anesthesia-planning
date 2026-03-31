import { useState } from 'react'
import { ArrowLeft, ChevronRight, FileSpreadsheet, Menu, BookOpen, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ImportPlanningModal from '../components/ImportPlanningModal'
import DocumentsModal from '../components/DocumentsModal'
import Sidebar from '../components/Sidebar'
import { WARM } from '../config/theme'

const UNIT_STYLES = {
  duhb:   { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#1D4ED8' },
  extop:  { bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B', text: '#475569' },
  unicat: { bg: '#FFF7ED', border: '#FED7AA', dot: '#F97316', text: '#C2410C' },
  bocha:  { bg: '#F7EEFF', border: '#D8AAFF', dot: '#B040FF', text: '#7A00CC' },
  sinpi:    { bg: '#FAF0EF', border: '#E0B0B0', dot: '#D08888', text: '#904040' },
  maternite:{ bg: '#EFFFEF', border: '#88EE88', dot: '#22CC44', text: '#006600' },
  pediatrie:{ bg: '#FFFDE0', border: '#FFE840', dot: '#CCA800', text: '#806000' },
  amopa:    { bg: '#FDF0FF', border: '#E490F0', dot: '#CC00CC', text: '#7A0090' },
}

// Couleurs spécifiques par secteur (remplace la couleur de l'unité si défini)
const SECTOR_STYLES = {
  'gyneco':            { bg: '#F0FAF0', border: '#9AD89A', dot: '#55AA55', text: '#2A7A2A' },
  'obstetrique':       { bg: '#F5F0FA', border: '#C0B0D0', dot: '#A078CC', text: '#6040A0', gradient: 'linear-gradient(135deg, #FFD6E8 0%, #D6E8FF 100%)' },
  'ophtalmo':          { bg: '#F4F4F6', border: '#C8C8CE', dot: '#777788', text: '#444450' },
  'bocha-amopa':       { bg: '#F7EEFF', border: '#D8AAFF', dot: '#B040FF', text: '#7A00CC' },
  'orl-maxfa-plastie': { bg: '#FFF0F8', border: '#FFB0DD', dot: '#FF3399', text: '#AA005A' },
  'antalgie':          { bg: '#FAF0F0', border: '#E0B8C0', dot: '#C87888', text: '#88404C' },
}

// Unités supportant l'import global de tous leurs secteurs
const UNIT_IMPORTS = new Set(['duhb', 'unicat', 'amopa'])

export default function SectorSelector({ unit, onSelect, onBack }) {
  const s = UNIT_STYLES[unit.id] ?? UNIT_STYLES.unicat
  const [showImport, setShowImport] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showDocs, setShowDocs] = useState(null) // 'protocols' | 'hot_topics'
  const todayKey = new Date().toISOString().slice(0, 10)

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

          <div className="flex items-center gap-2">
            {UNIT_IMPORTS.has(unit.id) && (
              <button onClick={openUnitImport}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-80 touch-manipulation"
                style={{ background: s.dot }}>
                <FileSpreadsheet size={14} />
                Import {unit.name}
              </button>
            )}
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors touch-manipulation">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-slate-700 text-xl font-bold mb-1">{unit.name}</h2>
        <p className="text-slate-400 text-sm mb-4">Sélectionnez un secteur</p>

        {/* Boutons documents */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setShowDocs('protocols')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm touch-manipulation"
            style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8' }}>
            <BookOpen size={15} />
            Protocoles / Guidelines
          </button>
          <button onClick={() => setShowDocs('hot_topics')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm touch-manipulation"
            style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626' }}>
            <Flame size={15} />
            Hot Topics
          </button>
        </div>

        <div className="space-y-3">
          {unit.sectors.map(sector => {
            const sc = SECTOR_STYLES[sector.id] ?? s
            return (
              <button key={sector.id} onClick={() => onSelect(sector)}
                style={{ background: sc.gradient ?? sc.bg, borderColor: sc.border }}
                className="w-full border-2 rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all hover:shadow-md active:scale-98 hover:brightness-95">
                <div>
                  <div className="font-bold text-base text-slate-800">{sector.name}</div>
                  <div className="text-xs mt-0.5 font-medium" style={{ color: sc.text }}>{unit.name}</div>
                </div>
                <ChevronRight size={20} style={{ color: sc.dot }} />
              </button>
            )
          })}
        </div>
      </main>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        selectedDate={todayKey} theme={WARM} />

      {showDocs && (
        <DocumentsModal unit={unit} theme={WARM} onClose={() => setShowDocs(null)}
          initialTab={showDocs} />
      )}

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
