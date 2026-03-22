import { useState } from 'react'
import { X, Phone, User, Edit2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const GRADE_LABELS = {
  cadre: 'Cadre',
  chef_clinique: 'Chef de clinique',
  interne: 'Interne',
  iade: 'IADE',
}

const PROFESSION_LABELS = {
  medecin: 'Médecin Anesthésiste (MA)',
  infirmier: 'Infirmier Anesthésiste (IADE)',
}

export default function ProfileModal({ profile, onClose }) {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)

  const canEdit = currentProfile?.id === profile.id || currentProfile?.is_admin

  async function savePhone() {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', profile.id)
    setSaving(false)
    setEditingPhone(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">
                {profile.full_name}
              </h2>
              <p className="text-blue-100 text-xs">
                {GRADE_LABELS[profile.grade] ?? profile.grade}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">

          {/* Profession */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Profession
            </p>
            <p className="text-sm text-gray-800">
              {PROFESSION_LABELS[profile.profession] ?? profile.profession}
            </p>
          </div>

          {/* Téléphone */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Téléphone
            </p>
            {editingPhone ? (
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: 06 12 34 56 78"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={savePhone}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={15} className="text-gray-400" />
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">
                      Non renseigné
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setEditingPhone(true)}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
