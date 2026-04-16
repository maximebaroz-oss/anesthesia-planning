import { useState, useEffect } from 'react'
import { Menu, Flame, FileSpreadsheet, FileText, X, LogOut, Phone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { UNITS } from '../config/sectors'
import { GRADE_LABELS } from '../config/constants'
import Sidebar from '../components/Sidebar'
import DocumentsModal from '../components/DocumentsModal'
import ImportPlanningModal from '../components/ImportPlanningModal'
import ImportPlanningPDFModal from '../components/ImportPlanningPDFModal'
import ImportGSMModal from '../components/ImportGSMModal'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'

// excel = import Excel, pdf = import PDF
const IMPORT_SECTORS = [
  { label: 'Hors-Bloc',  type: 'sector', mode: 'excel', id: 'hors-bloc',    color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Julliard',   type: 'sector', mode: 'excel', id: 'julliard',      color: '#0EA5E9', bg: '#F0F9FF' },
  { label: 'BOU',        type: 'sector', mode: 'excel', id: 'bou',           color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Traumato',   type: 'sector', mode: 'excel', id: 'traumatologie', color: '#6B7280', bg: '#F9FAFB' },
  { label: 'Prévost',    type: 'sector', mode: 'excel', id: 'prevost',       color: '#EC4899', bg: '#FDF2F8' },
]
const IMPORT_UNITS = [
  { label: 'DU HB',      type: 'unit', mode: 'excel', id: 'duhb',       color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'EXTOP',      type: 'unit', mode: 'excel', id: 'extop',      color: '#64748B', bg: '#F8FAFC' },
  { label: 'UNICAT',     type: 'unit', mode: 'excel', id: 'unicat',     color: '#F97316', bg: '#FFF7ED' },
  { label: 'SINPI',      type: 'unit', mode: 'excel', id: 'sinpi',      color: '#D08888', bg: '#FAF0EF' },
  { label: 'Maternité',  type: 'unit', mode: 'pdf',   id: 'maternite',  color: '#22C55E', bg: '#F0FFF4' },
  { label: 'Pédiatrie',  type: 'unit', mode: 'excel', id: 'pediatrie',  color: '#CA8A04', bg: '#FEFCE8' },
  { label: 'AMOPA',      type: 'unit', mode: 'excel', id: 'amopa',      color: '#A855F7', bg: '#FAF5FF' },
]

function GlobalImportModal({ onClose }) {
  const [profiles, setProfiles] = useState([])
  const [active, setActive] = useState(null)
  const [showGSM, setShowGSM] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data ?? []))
  }, [])

  if (showGSM) return <ImportGSMModal onClose={() => setShowGSM(false)} />

  if (active?.mode === 'pdf') {
    return (
      <ImportPlanningPDFModal
        profiles={profiles}
        onClose={() => setActive(null)}
        onImported={() => setActive(null)}
      />
    )
  }

  if (active) {
    return (
      <ImportPlanningModal
        profiles={profiles}
        sector={active.type === 'sector' ? { id: active.id, name: active.label } : undefined}
        unit={active.type === 'unit'   ? { id: active.id, name: active.label } : undefined}
        theme={WARM}
        onClose={() => setActive(null)}
        onImported={() => setActive(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: WARM.cardBg, borderColor: WARM.border }}
        className="border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div style={{ background: WARM.cardHead, borderColor: WARM.border }}
          className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={17} style={{ color: WARM.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: WARM.text }}>Import global</h2>
          </div>
          <button onClick={onClose} style={{ color: WARM.textFaint }}
            className="p-1.5 hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Bouton GSM — pleine largeur */}
          <button onClick={() => setShowGSM(true)}
            style={{ background: '#F0FFF4', borderColor: '#6EE7B7' }}
            className="border rounded-xl px-4 py-3 text-left hover:opacity-80 transition-opacity active:scale-95 flex items-center gap-3">
            <div style={{ background: '#D1FAE5' }} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone size={15} style={{ color: '#059669' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#065F46' }}>Import GSM</p>
              <p className="text-xs" style={{ color: '#6EE7B7' === '#6EE7B7' ? '#047857' : '#047857' }}>
                Mettre à jour les numéros depuis un fichier Excel
              </p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: WARM.textSub }}>Unités</p>
              <div className="flex flex-col gap-2">
                {IMPORT_UNITS.map(t => (
                  <button key={t.id} onClick={() => setActive(t)}
                    style={{ background: t.bg, borderColor: t.color + '55' }}
                    className="border rounded-xl px-3 py-2.5 text-left hover:opacity-80 transition-opacity active:scale-95">
                    <div className="flex items-center gap-2">
                      {t.mode === 'pdf'
                        ? <FileText size={12} style={{ color: t.color }} />
                        : <FileSpreadsheet size={12} style={{ color: t.color }} />}
                      <span className="text-sm font-semibold" style={{ color: t.color }}>{t.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: WARM.textSub }}>Secteurs</p>
              <div className="flex flex-col gap-2">
                {IMPORT_SECTORS.map(t => (
                  <button key={t.id} onClick={() => setActive(t)}
                    style={{ background: t.bg, borderColor: t.color + '55' }}
                    className="border rounded-xl px-3 py-2.5 text-left hover:opacity-80 transition-opacity active:scale-95">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={12} style={{ color: t.color }} />
                      <span className="text-sm font-semibold" style={{ color: t.color }}>{t.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Palette bloc opératoire — pastels cliniques
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

export default function UnitSelector({ onSelect }) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hotTopicsUnit, setHotTopicsUnit] = useState(null)
  const [showGlobalImport, setShowGlobalImport] = useState(false)

  const canImport = profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const todayKey = new Date().toISOString().slice(0, 10)

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
          <div className="flex items-center gap-2">
            {canImport && (
              <button onClick={() => setShowGlobalImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold touch-manipulation transition-opacity hover:opacity-80"
                style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', color: '#16A34A' }}>
                <FileSpreadsheet size={13} />
                Import
              </button>
            )}
            <button onClick={() => setHotTopicsUnit({ id: 'global', name: 'Hot Topics' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold touch-manipulation transition-opacity hover:opacity-80"
              style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626' }}>
              <Flame size={13} />
              Hot Topics
            </button>
            <button onClick={signOut}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors touch-manipulation"
              title="Déconnexion">
              <LogOut size={20} />
            </button>
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors touch-manipulation">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        selectedDate={todayKey} theme={WARM} />

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-slate-700 text-xl font-bold mb-1">Choisir une unité</h2>
        <p className="text-slate-400 text-sm mb-6">Sélectionnez votre unité pour accéder au planning</p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {UNITS.map(unit => {
            const s = UNIT_STYLES[unit.id] ?? UNIT_STYLES.unicat
            const hasSectors = unit.sectors.length > 0
            return (
              <div key={unit.id}>
                <button
                  onClick={() => hasSectors && onSelect(unit)}
                  disabled={!hasSectors}
                  style={hasSectors
                    ? { background: s.bg, borderColor: s.border }
                    : { background: '#F8FAFC', borderColor: '#E2E8F0' }}
                  className={`w-full border-2 rounded-2xl p-5 text-left transition-all ${
                    hasSectors
                      ? 'hover:shadow-md active:scale-95 cursor-pointer hover:brightness-95'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: hasSectors ? s.dot : '#CBD5E1' }} />
                    <span className="text-xs font-semibold" style={{ color: hasSectors ? s.text : '#94A3B8' }}>
                      {unit.name}
                    </span>
                  </div>
                  <div className="font-bold text-lg" style={{ color: hasSectors ? '#1E293B' : '#94A3B8' }}>
                    {unit.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: hasSectors ? s.text : '#94A3B8' }}>
                    {hasSectors
                      ? `${unit.sectors.length} secteur${unit.sectors.length > 1 ? 's' : ''}`
                      : 'À venir'}
                  </div>
                </button>

              </div>
            )
          })}
        </div>
      </main>

      {hotTopicsUnit && (
        <DocumentsModal unit={hotTopicsUnit} theme={WARM} initialTab="hot_topics"
          onClose={() => setHotTopicsUnit(null)} />
      )}

      {showGlobalImport && (
        <GlobalImportModal onClose={() => setShowGlobalImport(false)} />
      )}
    </div>
  )
}
