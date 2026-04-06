import { useState, useEffect } from 'react'
import { X, Phone, Edit2, Check, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { WARM } from '../config/theme'
import { GRADE_LABELS_FULL as GRADE_LABELS, ROOM_NAMES, getMonday, formatDateKey, formatLastFirst } from '../config/constants'
import { findGsmPhone } from './ContactsModal'

const PROFESSION_LABELS = {
  medecin: 'Médecin Anesthésiste (Med)',
  infirmier: 'Infirmier Anesthésiste (ISA)',
}

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const MONTH_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

export default function ProfileModal({ profile, onClose }) {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState(null) // [{ date, dayLabel, rooms }]

  useEffect(() => {
    // Fetch assignments for this profile over the next 4 weeks
    const monday = getMonday(new Date())
    const from = formatDateKey(monday)
    const end = new Date(monday)
    end.setDate(monday.getDate() + 27) // 4 weeks
    const to = formatDateKey(end)

    supabase.from('assignments')
      .select('date, room_id')
      .eq('user_id', profile.id)
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .then(({ data }) => {
        if (!data) { setSchedule([]); return }
        // Group by date
        const byDate = {}
        for (const a of data) {
          if (!byDate[a.date]) byDate[a.date] = []
          byDate[a.date].push(a.room_id)
        }
        const entries = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, roomIds]) => {
            const d = new Date(date + 'T12:00:00')
            const dayIdx = (d.getDay() + 6) % 7 // 0=Mon
            return {
              date,
              dayLabel: `${DAY_SHORT[dayIdx] ?? ''} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
              rooms: roomIds.map(id => ROOM_NAMES[id] ?? `Salle ${id}`),
            }
          })
        setSchedule(entries)
      })
  }, [profile.id])

  const canEdit = currentProfile?.id === profile.id || currentProfile?.is_admin
  const gsmPhone = !profile.phone ? findGsmPhone(profile.full_name) : null

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
                {isMedecin ? `Dr. ${formatLastFirst(profile.full_name)}` : formatLastFirst(profile.full_name)}
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
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-sm font-medium" style={{ color: WARM.accentBar }}>{phone}</a>
                  ) : gsmPhone ? (
                    <a href={`tel:${gsmPhone.replace(/\s/g, '')}`} className="text-sm font-medium" style={{ color: WARM.accentBar }}>
                      {gsmPhone} <span className="text-xs font-normal opacity-60">annuaire</span>
                    </a>
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

        {/* Planning section */}
        <div className="px-5 pb-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={13} style={{ color: WARM.textFaint }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: WARM.textFaint }}>
              Planning — 4 semaines
            </p>
          </div>
          {schedule === null ? (
            <p className="text-xs italic mb-3" style={{ color: WARM.textFaint }}>Chargement…</p>
          ) : schedule.length === 0 ? (
            <p className="text-xs italic mb-3" style={{ color: WARM.textFaint }}>Aucune affectation sur les 4 prochaines semaines.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 mb-3 pr-1">
              {schedule.map(entry => (
                <div key={entry.date}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2"
                  style={{ background: WARM.surface }}>
                  <span className="text-xs font-semibold flex-shrink-0 w-20" style={{ color: WARM.textSub }}>
                    {entry.dayLabel}
                  </span>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 min-w-0">
                    {entry.rooms.map((room, i) => (
                      <span key={i} className="text-xs font-medium" style={{ color: WARM.text }}>{room}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
