import { useEffect, useState } from 'react'
import { X, User, Users, Stethoscope, Phone, Edit2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const GRADE_LABELS = {
  cadre: 'Cadre',
  chef_clinique: 'Chef de clinique',
  interne: 'Interne',
  iade: 'ISA',
}

function ProfilePanel({ onClose }) {
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
        <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {currentProfile.full_name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-bold">{currentProfile.full_name}</p>
          <p className="text-gray-400 text-xs">{GRADE_LABELS[currentProfile.grade] ?? currentProfile.grade}</p>
          <p className="text-gray-500 text-xs">{currentProfile.profession === 'medecin' ? 'Médecin (MA)' : 'Infirmier (ISA)'}</p>
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
            <button
              onClick={savePhone}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 transition-colors"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setEditingPhone(false)}
              className="text-gray-500 hover:text-white rounded-lg p-2 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-xl">
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-gray-500" />
              {phone ? (
                <a href={`tel:${phone}`} className="text-sm text-blue-400 hover:underline">{phone}</a>
              ) : (
                <span className="text-sm text-gray-500 italic">Non renseigné</span>
              )}
            </div>
            <button onClick={() => setEditingPhone(true)} className="text-gray-500 hover:text-blue-400 p-1 transition-colors">
              <Edit2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StaffList({ profession }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('profession', profession).order('full_name')
      .then(({ data }) => { setStaff(data ?? []); setLoading(false) })
  }, [profession])

  if (loading) return <p className="text-gray-500 text-sm text-center py-4">Chargement...</p>

  return (
    <div className="space-y-2">
      {staff.map(p => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              profession === 'medecin' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'
            }`}>
              {p.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{p.full_name}</p>
              <p className="text-gray-500 text-xs">{GRADE_LABELS[p.grade] ?? p.grade}</p>
            </div>
          </div>
          {p.phone && (
            <a href={`tel:${p.phone}`} className="text-gray-500 hover:text-blue-400 transition-colors p-1">
              <Phone size={15} />
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

const MENU_ITEMS = [
  { id: 'profil',   label: 'Mon profil',       icon: User },
  { id: 'medecins', label: 'Liste des MA',      icon: Stethoscope },
  { id: 'isa',      label: 'Liste des ISA',     icon: Users },
]

export default function Sidebar({ open, onClose }) {
  const [activeItem, setActiveItem] = useState('profil')

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-gray-900 border-r border-gray-700 z-50 flex flex-col transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <span className="text-white font-bold text-lg">Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex border-b border-gray-700">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeItem === 'profil' && <ProfilePanel />}
          {activeItem === 'medecins' && <StaffList profession="medecin" />}
          {activeItem === 'isa' && <StaffList profession="infirmier" />}
        </div>
      </div>
    </>
  )
}
