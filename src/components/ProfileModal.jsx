import { useState } from 'react'
import { X, Phone, User, Edit2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { WARM } from '../config/theme'
import { GRADE_LABELS_FULL as GRADE_LABELS } from '../config/constants'

const PROFESSION_LABELS = {
  medecin: 'Médecin Anesthésiste (Med)',
  infirmier: 'Infirmier Anesthésiste (ISA)',
}

export default function ProfileModal({ profile, onClose }) {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)

  const canEdit = currentProfile?.id === profile.id || currentProfile?.is_admin

  async function savePhone() {
    setSaving(true)
    await supabase.from('profiles').update({ phone }).eq('id', profile.id)
    setSaving(false)
    setEditingPhone(false)
  }

  const isMedecin = profile.profession === 'medecin'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div style={{ background: WARM.cardBg, borderColor: WARM.border }}
        className="border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div style={{ background: WARM.cardHead, borderColor: WARM.border }}
          className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ background: WARM.surface }}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-base" style={{ color: WARM.accentBar }}>
                {profile.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight" style={{ color: WARM.text }}>
                {isMedecin ? `Dr. ${profile.full_name}` : profile.full_name}
              </h2>
              <p className="text-xs" style={{ color: WARM.textSub }}>
                {GRADE_LABELS[profile.grade] ?? profile.grade}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: WARM.textFaint }} className="hover:opacity-70 transition-opacity p-1.5">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: WARM.textFaint }}>Profession</p>
            <p className="text-sm" style={{ color: WARM.textSub }}>{PROFESSION_LABELS[profile.profession] ?? profile.profession}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: WARM.textFaint }}>Téléphone</p>
            {editingPhone ? (
              <div className="flex items-center gap-2">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: 06 12 34 56 78" autoFocus
                  style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                />
                <button onClick={savePhone} disabled={saving}
                  style={{ background: WARM.accentBar }}
                  className="text-white rounded-lg p-1.5 transition-opacity hover:opacity-80">
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={15} style={{ color: WARM.textFaint }} />
                  {phone ? (
                    <span className="text-sm font-medium" style={{ color: WARM.text }}>{phone}</span>
                  ) : (
                    <span className="text-sm italic" style={{ color: WARM.textFaint }}>Non renseigné</span>
                  )}
                </div>
                {canEdit && (
                  <button onClick={() => setEditingPhone(true)} style={{ color: WARM.textFaint }}
                    className="hover:opacity-70 transition-opacity p-1">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose}
            style={{ background: WARM.surface, color: WARM.textSub }}
            className="w-full text-sm font-medium py-2.5 rounded-xl hover:opacity-80 transition-opacity">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
