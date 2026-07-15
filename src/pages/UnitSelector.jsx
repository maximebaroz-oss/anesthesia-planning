import { useState, useEffect, useRef } from 'react'
import { Menu, Flame, FileSpreadsheet, FileText, X, LogOut, Phone, Upload, Loader, Users, AlertTriangle, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '../contexts/AuthContext'
import { UNITS } from '../config/sectors'
import { GRADE_LABELS } from '../config/constants'
import Sidebar from '../components/Sidebar'
import DocumentsModal from '../components/DocumentsModal'
import ImportPlanningModal from '../components/ImportPlanningModal'
import ImportPlanningPDFModal from '../components/ImportPlanningPDFModal'
import ImportGSMModal from '../components/ImportGSMModal'
import ImportProfilesModal from '../components/ImportProfilesModal'
import { supabase } from '../lib/supabase'
import { WARM } from '../config/theme'

// Noms lisibles pour l'affichage après détection
const UNIT_NAMES   = { duhb:'DUHB', extop:'EXTOP', unicat:'UNICAT', sinpi:'SINPI', maternite:'Maternité', pediatrie:'Pédiatrie', amopa:'AMOPA' }
const SECTOR_NAMES = { 'hors-bloc':'Hors Bloc', 'julliard':'Julliard', 'bou':'BOU', 'traumatologie':'Traumatologie', 'prevost':'Prévost', 'sinpi':'SINPI', 'extop':'EXTOP', 'bocha-amopa':'BOCHA', 'orl-maxfa-plastie':'ORL/MAX-FA/Plastie', 'antalgie':'Antalgie' }

// Extrait tout le texte brut de toutes les feuilles du classeur
function allSheetText(wb) {
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name]
    if (!ws) return ''
    return Object.entries(ws)
      .filter(([k]) => !k.startsWith('!'))
      .map(([, c]) => String(c?.v ?? ''))
      .join(' ')
  }).join(' ').toLowerCase()
}

// Détecte automatiquement l'unité/secteur depuis le classeur Excel
function detectFromWorkbook(wb) {
  const sheets = wb.SheetNames.map(n => n.toUpperCase().trim())
  const text   = allSheetText(wb)

  // SINPI : onglet HEBDO_REMPLI
  if (sheets.some(n => n.includes('HEBDO')))
    return { unitId: 'sinpi', sectorId: 'sinpi' }

  // AMOPA : onglet "semaine"
  if (sheets.some(n => n.includes('SEMAINE'))) {
    if (text.includes('antalgie'))           return { unitId: 'amopa', sectorId: 'antalgie' }
    if (text.includes('belle-id') || text.includes('belle id') || text.includes('orl'))
                                             return { unitId: 'amopa', sectorId: 'orl-maxfa-plastie' }
    if (text.includes('bocha'))              return { unitId: 'amopa', sectorId: 'bocha-amopa' }
    return { unitId: 'amopa', sectorId: null }
  }

  // DUHB : onglets HB + DU (ou juste DU)
  const hasHB = sheets.some(n => n === 'HB')
  const hasDU = sheets.some(n => n === 'DU')
  if (hasHB && hasDU)  return { unitId: 'duhb',  sectorId: null }
  if (hasDU)           return { unitId: 'duhb',  sectorId: 'julliard' }

  // UNICAT : onglet Feuil1
  // ⚠ Vérifie D'ABORD que ce n'est pas une liste GSM/personnel (même onglet "Feuil1")
  if (sheets.some(n => n.startsWith('FEUIL'))) {
    // Fichier liste GSM/personnel : contient "med-chef" ou ("adjoints" + "internes")
    if (text.includes('med-chef') ||
        (text.includes('adjoint') && text.includes('interne') && text.includes('administratif'))) {
      return { type: 'gsm' }
    }
    return { unitId: 'unicat', sectorId: null }
  }

  // Onglet HB seul : Hors-Bloc ou EXTOP
  if (hasHB) {
    if (text.includes('extop') || text.includes('consult box') || text.includes('tardif cadre'))
                         return { unitId: 'extop',  sectorId: 'extop' }
    if (text.includes('gastro') || text.includes('broncho'))
                         return { unitId: 'duhb',   sectorId: 'hors-bloc' }
  }

  // Détection par contenu brut (fallback)
  if (text.includes('sinpi') || text.includes('sspi'))      return { unitId: 'sinpi',  sectorId: 'sinpi' }
  if (text.includes('antalgie'))                            return { unitId: 'amopa',  sectorId: 'antalgie' }
  if (text.includes('belle-id') || text.includes('belle id')) return { unitId: 'amopa', sectorId: 'orl-maxfa-plastie' }
  if (text.includes('bocha'))                               return { unitId: 'amopa',  sectorId: 'bocha-amopa' }
  if (text.includes('gastro') || text.includes('broncho'))  return { unitId: 'duhb',   sectorId: 'hors-bloc' }
  if (text.includes('extop') || text.includes('consult box')) return { unitId: 'extop', sectorId: 'extop' }

  return null // non détecté
}

// ─── Groupes de slots pour l'import (un slot = une case à remplir) ─────────────
const IMPORT_GROUPS = [
  {
    id: 'sinpi', label: 'SINPI',
    style: { bg: '#FAF0EF', border: '#DDA0A0', dot: '#B06060', text: '#804040', active: '#C07070' },
    slots: [{ id: 'sinpi', label: 'SINPI', unitId: 'sinpi', sectorId: 'sinpi' }],
  },
  {
    id: 'duhb', label: 'DUHB',
    style: { bg: '#EFF6FF', border: '#93C5FD', dot: '#3B82F6', text: '#1D4ED8', active: '#60A5FA' },
    slots: [
      { id: 'duhb-julliard', label: 'Julliard',  unitId: 'duhb', sectorId: 'julliard'  },
      { id: 'duhb-horsboc',  label: 'Hors-Bloc', unitId: 'duhb', sectorId: 'hors-bloc' },
    ],
  },
  {
    id: 'extop', label: 'EXTOP',
    style: { bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B', text: '#334155', active: '#94A3B8' },
    slots: [{ id: 'extop', label: 'EXTOP', unitId: 'extop', sectorId: 'extop' }],
  },
  {
    id: 'unicat', label: 'UNICAT',
    style: { bg: '#FFF7ED', border: '#FDBA74', dot: '#F97316', text: '#9A3412', active: '#FB923C' },
    slots: [
      { id: 'unicat', label: 'UNICAT', unitId: 'unicat', sectorId: null },
    ],
  },
  {
    id: 'maternite', label: 'Maternité',
    style: { bg: '#F0FFF4', border: '#6EE7B7', dot: '#059669', text: '#065F46', active: '#34D399' },
    slots: [{ id: 'maternite', label: 'Maternité', unitId: 'maternite', sectorId: null }],
  },
  {
    id: 'pediatrie', label: 'Pédiatrie',
    style: { bg: '#FEFCE8', border: '#FDE047', dot: '#CA8A04', text: '#713F12', active: '#FACC15' },
    slots: [{ id: 'pediatrie', label: 'Pédiatrie', unitId: 'pediatrie', sectorId: null }],
  },
  {
    id: 'amopa', label: 'AMOPA',
    style: { bg: '#FDF4FF', border: '#E879F9', dot: '#A21CAF', text: '#701A75', active: '#D946EF' },
    slots: [
      { id: 'amopa-bocha',    label: 'BOCHA',       unitId: 'amopa', sectorId: 'bocha-amopa'       },
      { id: 'amopa-orl',      label: 'ORL/MAX-FA',  unitId: 'amopa', sectorId: 'orl-maxfa-plastie' },
      { id: 'amopa-antalgie', label: 'Antalgie',    unitId: 'amopa', sectorId: 'antalgie'          },
    ],
  },
  {
    id: '_data', label: 'Données',
    style: { bg: '#EFF6FF', border: '#93C5FD', dot: '#2563EB', text: '#1E40AF', active: '#3B82F6' },
    slots: [
      { id: 'gsm',       label: 'GSM',       type: 'gsm',       unitId: null, sectorId: null },
      { id: 'personnel', label: 'Personnel', type: 'personnel', unitId: null, sectorId: null },
    ],
  },
]

// ─── Carte de slot (drop zone individuelle) ─────────────────────────────────────
function SlotCard({ slot, style, assigned, detecting, onFile, onRemove }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await onFile(slot, file)
  }

  const isPdf    = assigned?.mode === 'pdf'
  const hasWarn  = !!assigned?.warning

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
      onDrop={handleDrop}
      onClick={() => !assigned && !detecting && inputRef.current?.click()}
      style={{
        background:   assigned || dragOver ? style.bg   : '#FAFAFA',
        borderColor:  dragOver             ? style.active
                      : assigned           ? style.border
                      : '#E5E7EB',
        borderWidth:  '1.5px',
        borderStyle:  assigned ? 'solid' : 'dashed',
        minHeight:    '56px',
      }}
      className="rounded-xl flex items-center p-2.5 gap-2 transition-all cursor-pointer hover:opacity-80 active:scale-95 select-none">

      {detecting ? (
        <div className="w-full flex items-center justify-center gap-1.5 py-0.5">
          <Loader size={12} style={{ color: style.dot }} className="animate-spin" />
          <span className="text-xs font-medium" style={{ color: style.dot }}>…</span>
        </div>
      ) : assigned ? (
        <>
          <div className="flex-shrink-0" style={{ color: hasWarn ? '#D97706' : style.dot }}>
            {isPdf ? <FileText size={14} /> : <FileSpreadsheet size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight"
               style={{ color: hasWarn ? '#92400E' : style.text }}>
              {assigned.file.name.replace(/\.(xlsx?|xls|pdf|csv)$/i, '')}
            </p>
            {hasWarn && (
              <p className="text-xs truncate leading-tight" style={{ color: '#D97706' }}>
                ⚠ {assigned.warning}
              </p>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); onRemove(slot.id) }}
            className="flex-shrink-0 rounded-full p-0.5 hover:opacity-60 transition-opacity"
            style={{ color: style.dot }}>
            <X size={11} />
          </button>
        </>
      ) : (
        <div className="w-full flex flex-col items-center justify-center gap-0.5 py-0.5">
          <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>{slot.label}</span>
          <span className="text-[10px]" style={{ color: '#D1D5DB' }}>Excel · PDF</span>
        </div>
      )}

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf"
        className="hidden" onChange={async e => {
          const file = e.target.files?.[0]
          if (file) await onFile(slot, file)
          e.target.value = ''
        }} />
    </div>
  )
}

// ─── Modal principal ─────────────────────────────────────────────────────────────
function GlobalImportModal({ onClose }) {
  const T = WARM
  const [profiles,  setProfiles]  = useState([])

  // Étape 1 : staging (grille de slots)
  const [slots,     setSlots]     = useState({})    // slotId → { file, mode, warning }
  const [detecting, setDetecting] = useState(null)  // slotId en cours d'analyse

  // Étape 2 : traitement en file
  const [step,      setStep]      = useState('stage')
  const [queue,     setQueue]     = useState([])
  const [queueIdx,  setQueueIdx]  = useState(0)

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data ?? []))
  }, [])

  // ── Assigner un fichier à un slot ──────────────────────────────────────────
  async function handleFileDrop(slot, file) {
    setDetecting(slot.id)
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    let mode    = isPdf ? 'pdf' : 'excel'
    let warning = null

    // Vérifie que le fichier Excel correspond bien au secteur attendu
    if (!isPdf && slot.unitId) {
      try {
        const buf      = await file.arrayBuffer()
        const wb       = XLSX.read(buf, { type: 'array' })
        const detected = detectFromWorkbook(wb)
        if (detected?.type === 'gsm') {
          warning = 'Semble être une liste GSM'
        } else if (detected?.unitId && detected.unitId !== slot.unitId) {
          warning = `Semble être ${UNIT_NAMES[detected.unitId] ?? detected.unitId}`
        }
      } catch { /* silencieux */ }
    }

    setSlots(prev => ({ ...prev, [slot.id]: { file, mode, warning } }))
    setDetecting(null)
  }

  function removeSlot(slotId) {
    setSlots(prev => { const n = { ...prev }; delete n[slotId]; return n })
  }

  // ── Valider → construire la file et passer en mode traitement ──────────────
  function handleValidate() {
    const allSlots = IMPORT_GROUPS.flatMap(g => g.slots)
    const q = []
    for (const slot of allSlots) {
      const a = slots[slot.id]
      if (!a) continue
      if (slot.type === 'gsm')       q.push({ mode: 'gsm',       file: a.file })
      else if (slot.type === 'personnel') q.push({ mode: 'personnel', file: a.file })
      else q.push({ mode: a.mode, unitId: slot.unitId, sectorId: slot.sectorId, file: a.file })
    }
    setQueue(q)
    setQueueIdx(0)
    setStep('process')
  }

  function next() {
    const ni = queueIdx + 1
    if (ni < queue.length) setQueueIdx(ni)
    else onClose()
  }

  // ── Traitement de la file (étape 2) ────────────────────────────────────────
  if (step === 'process' && queue[queueIdx]) {
    const cur   = queue[queueIdx]
    const total = queue.length
    const label = total > 1 ? `${queueIdx + 1} / ${total}` : null

    if (cur.mode === 'pdf')
      return <>{label && <QueueBadge label={label} />}
        <ImportPlanningPDFModal profiles={profiles} preloadedFile={cur.file}
          theme={T} onClose={next} onImported={next} /></>

    if (cur.mode === 'gsm')
      return <>{label && <QueueBadge label={label} />}
        <ImportGSMModal preloadedFile={cur.file} onClose={next} /></>

    if (cur.mode === 'personnel')
      return <>{label && <QueueBadge label={label} />}
        <ImportProfilesModal preloadedFile={cur.file} onClose={next} /></>

    const unit   = cur.unitId   ? { id: cur.unitId,   name: UNIT_NAMES[cur.unitId]     } : undefined
    const sector = cur.sectorId ? { id: cur.sectorId, name: SECTOR_NAMES[cur.sectorId] } : undefined
    return <>{label && <QueueBadge label={label} />}
      <ImportPlanningModal profiles={profiles} unit={unit} sector={sector}
        preloadedFile={cur.file} theme={T} onClose={next} onImported={next} /></>
  }

  const assignedCount = Object.keys(slots).length
  const warnCount     = Object.values(slots).filter(s => s.warning).length

  // ── Rendu étape staging (grille de slots) ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
      <div style={{ background: T.cardBg, borderColor: T.border, maxHeight: '90vh' }}
        className="border rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* Header */}
        <div style={{ background: T.cardHead, borderColor: T.border }}
          className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={17} style={{ color: T.accentBar }} />
            <h2 className="font-bold text-base" style={{ color: T.text }}>Import</h2>
          </div>
          <button onClick={onClose} style={{ color: T.textFaint }}
            className="p-1.5 hover:opacity-70 transition-opacity">
            <X size={18} />
          </button>
        </div>

        {/* Grille de slots — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
          style={{ overflowY: 'auto' }}>
          {IMPORT_GROUPS.map(group => (
            <div key={group.id}>
              {/* En-tête de groupe */}
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ background: group.style.dot }}
                  className="w-2 h-2 rounded-full flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: group.style.text }}>
                  {group.label}
                </span>
                {group.id === '_data' && (
                  <span className="text-xs" style={{ color: T.textFaint }}>· GSM, listes de personnel</span>
                )}
              </div>

              {/* Grille de slots */}
              <div className={`grid gap-2 ${
                group.slots.length === 1 ? 'grid-cols-1' :
                group.slots.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {group.slots.map(slot => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    style={group.style}
                    assigned={slots[slot.id]}
                    detecting={detecting === slot.id}
                    onFile={handleFileDrop}
                    onRemove={removeSlot}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Padding bas */}
          <div className="h-2" />
        </div>

        {/* Footer — validation */}
        <div style={{ borderColor: T.border, background: T.cardHead }}
          className="border-t px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {assignedCount === 0 ? (
              <p className="text-xs" style={{ color: T.textFaint }}>
                Glissez ou cliquez sur une case pour assigner un fichier
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: T.text }}>
                  {assignedCount} fichier{assignedCount > 1 ? 's' : ''} prêt{assignedCount > 1 ? 's' : ''}
                </span>
                {warnCount > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#D97706' }}>
                    <AlertTriangle size={11} />
                    {warnCount} avertissement{warnCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleValidate}
            disabled={assignedCount === 0}
            style={{ background: T.accentBar }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">
            <Check size={14} />
            Valider{assignedCount > 0 ? ` (${assignedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// Badge flottant en haut pendant le traitement d'une file de fichiers
function QueueBadge({ label }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold text-white"
        style={{ background: '#1E293B' }}>
        <FileSpreadsheet size={12} />
        Fichier {label}
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
