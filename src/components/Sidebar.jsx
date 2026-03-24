import { useEffect, useState } from 'react'
import { X, User, Users, Stethoscope, Phone, Edit2, Check, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const GRADE_LABELS = {
  adjoint: 'Adj.',
  chef_clinique: 'CDC',
  interne: 'Int.',
  consultant: 'Cons.',
  iade: 'ISA',
}

const ROOM_NAMES = {
  1: 'Gastro 4', 2: 'Gastro 5', 3: 'Broncho 7', 4: 'Radio 11',
  5: 'Radio 12', 6: 'Neuro-radio 13', 7: 'Cardio 17', 8: 'Tardif', 9: 'IRM/Scanner',
}

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_NAMES_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'août', 'sep', 'oct', 'nov', 'déc']

function PresenceHistory() {
  const { profile: currentProfile } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProfile) return
    supabase.from('assignments')
      .select('date, start_time, end_time, room_id')
      .eq('user_id', currentProfile.id)
      .order('date', { ascending: false })
      .limit(60)
      .not('start_time', 'is', null)
      .then(({ data }) => { setHistory(data ?? []); setLoading(false) })
  }, [currentProfile?.id])

  if (loading) return <p className="text-gray-500 text-sm text-center py-4">Chargement...</p>
  if (history.length === 0) return <p className="text-gray-500 text-sm text-center py-4 italic">Aucune présence enregistrée</p>

  // Group by week (Monday as start)
  const byWeek = {}
  history.forEach(h => {
    const d = new Date(h.date + 'T00:00:00')
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toISOString().split('T')[0]
    if (!byWeek[key]) byWeek[key] = []
    byWeek[key].push(h)
  })

  return (
    <div className="space-y-5">
      {Object.entries(byWeek)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([weekStart, entries]) => {
          const monday = new Date(weekStart + 'T00:00:00')
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          const weekLabel = `${monday.getDate()} ${MONTH_NAMES_FR[monday.getMonth()]} — ${sunday.getDate()} ${MONTH_NAMES_FR[sunday.getMonth()]}`

          return (
            <div key={weekStart}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{weekLabel}</p>
              <div className="space-y-1.5">
                {entries.map((h, i) => {
                  const d = new Date(h.date + 'T00:00:00')
                  const dayName = DAY_NAMES_FR[d.getDay()]
                  const dateStr = `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`
                  const start = h.start_time?.slice(0, 5) ?? '--:--'
                  const end = h.end_time?.slice(0, 5) ?? '--:--'
                  const roomName = ROOM_NAMES[h.room_id] ?? `Salle ${h.room_id}`
                  return (
                    <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-300 w-8 flex-shrink-0">{dayName}</span>
                        <span className="text-xs text-gray-500">{dateStr}</span>
                        <span className="text-xs text-gray-600 truncate">{roomName}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock size={10} className="text-gray-600" />
                        <span className="text-xs text-blue-300">{start} → {end}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function ProfilePanel() {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(currentProfile?.phone ?? '')
  const [saving, setSaving] = useState(false)

  async function savePhone() {
    setSaving(true)
    await supabase.from('profiles').update({ phone }).eq('id', currentProfile.id)
    setSaving(false)
    setEditingPhone(false)
  }

  if (!currentProfile) return null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-xl">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
          currentProfile.profession === 'medecin' ? 'bg-red-900' : 'bg-blue-900'
        }`}>
          {currentProfile.full_name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-white">
            {currentProfile.profession === 'medecin' ? `Dr. ${currentProfile.full_name}` : currentProfile.full_name}
          </p>
          <p className="text-gray-400 text-xs">{GRADE_LABELS[currentProfile.grade] ?? currentProfile.grade}</p>
          <p className="text-gray-500 text-xs">{currentProfile.profession === 'medecin' ? 'Médecin (Med)' : 'Infirmier (ISA)'}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Téléphone</p>
        {editingPhone ? (
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={savePhone} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 transition-colors">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingPhone(false)} className="text-gray-500 hover:text-white rounded-lg p-2 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingPhone(true)} className="w-full flex items-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors text-left">
            <Phone size={15} className="text-gray-500 flex-shrink-0" />
            {phone ? (
              <span className="text-sm text-blue-400">{phone}</span>
            ) : (
              <span className="text-sm text-gray-500 italic">Cliquer pour ajouter</span>
            )}
            <Edit2 size={12} className="text-gray-600 ml-auto flex-shrink-0" />
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historique des présences</p>
        <PresenceHistory />
      </div>
    </div>
  )
}

function StaffRow({ p, profession, canEdit }) {
  const [showPhone, setShowPhone] = useState(false)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(p.phone ?? '')
  const [saving, setSaving] = useState(false)

  async function savePhone() {
    setSaving(true)
    await supabase.from('profiles').update({ phone }).eq('id', p.id)
    setSaving(false)
    setEditing(false)
  }

  const dot = profession === 'medecin' ? 'bg-red-400' : 'bg-blue-400'

  return (
    <div>
      <div className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-gray-700/50 transition-colors">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs text-gray-200 flex-1 truncate">
          {profession === 'medecin' ? `Dr. ${p.full_name}` : p.full_name}
        </span>
        <span className="text-xs text-gray-600 flex-shrink-0">{GRADE_LABELS[p.grade] ?? ''}</span>
        <button
          onClick={() => { setShowPhone(v => !v); setEditing(false) }}
          className={`p-0.5 rounded transition-colors flex-shrink-0 ${phone ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <Phone size={11} />
        </button>
      </div>

      {showPhone && (
        <div className="px-4 pb-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="06 12 34 56 78" autoFocus
                className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none"
              />
              <button onClick={savePhone} disabled={saving} className="bg-blue-600 text-white rounded-md p-1 transition-colors">
                <Check size={11} />
              </button>
              <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-white rounded-md p-1">
                <X size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-800 rounded-md px-2 py-1">
              {phone
                ? <span className="text-xs text-blue-300">{phone}</span>
                : <span className="text-xs text-gray-600 italic">Non renseigné</span>
              }
              {canEdit && (
                <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-blue-400 ml-2">
                  <Edit2 size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MED_SECTIONS = [
  { label: 'Adjoints',    grade: 'adjoint' },
  { label: 'CDC',         grade: 'chef_clinique' },
  { label: 'Internes',    grade: 'interne' },
  { label: 'Consultants', grade: 'consultant' },
]


function StaffList({ profession }) {
  const { profile: currentProfile } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('profession', profession).order('full_name')
      .then(({ data }) => { setStaff(data ?? []); setLoading(false) })
  }, [profession])

  if (loading) return <p className="text-gray-500 text-sm text-center py-4">Chargement...</p>

  if (profession === 'infirmier') {
    return (
      <div className="space-y-2">
        {staff.map(p => (
          <StaffRow key={p.id} p={p} profession={profession}
            canEdit={currentProfile?.is_admin || currentProfile?.id === p.id} />
        ))}
      </div>
    )
  }

  const knownGrades = MED_SECTIONS.map(s => s.grade)
  const autres = staff.filter(p => !knownGrades.includes(p.grade))
  const sections = [
    ...MED_SECTIONS.map(s => ({ label: s.label, list: staff.filter(p => p.grade === s.grade) })),
    ...(autres.length > 0 ? [{ label: 'Autres', list: autres }] : []),
  ].filter(s => s.list.length > 0)

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.label}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{section.label}</p>
          <div className="space-y-2">
            {section.list.map(p => (
              <StaffRow key={p.id} p={p} profession={profession}
                canEdit={currentProfile?.is_admin || currentProfile?.id === p.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const MENU_ITEMS = [
  { id: 'profil',   label: 'Mon profil',   icon: User },
  { id: 'medecins', label: 'Liste des Med', icon: Stethoscope },
  { id: 'isa',      label: 'Liste des ISA', icon: Users },
]

export default function Sidebar({ open, onClose }) {
  const [activeItem, setActiveItem] = useState('profil')

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      <div style={{ background: '#FAF7F2', borderColor: '#DDD0B8' }}
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] border-r z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#DDD0B8' }}>
          <span className="font-bold text-lg" style={{ color: '#2D1E08' }}>Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: '#8B7355' }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-800">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon size={18} />
                <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeItem === 'profil' && <ProfilePanel />}
          {activeItem === 'medecins' && <StaffList profession="medecin" />}
          {activeItem === 'isa' && <StaffList profession="infirmier" />}
        </div>
      </div>
    </>
  )
}
