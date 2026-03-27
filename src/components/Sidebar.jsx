import { useEffect, useState } from 'react'
import { X, User, Users, Stethoscope, Phone, Edit2, Check, Clock, MapPin, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const WARM = {
  bg: '#FAF7F2',
  surface: '#F0EBE1',
  cardHead: '#E8E0D4',
  border: '#DDD0B8',
  text: '#2D1E08',
  textMid: '#6B5C48',
  textFaint: '#9E9489',
  accentBar: '#8A7560',
  hover: '#E2DED8',
}

const GRADE_LABELS = {
  adjoint: 'Adj.',
  chef_clinique: 'CDC',
  interne: 'Int.',
  consultant: 'Cons.',
  iade: 'ISA',
}

const ROOM_NAMES = {
  1: 'Gastro 4', 2: 'Gastro 5', 3: 'Broncho 7', 4: 'Radio 11',
  5: 'Radio 12', 6: 'Neuro-radio 13', 7: 'Cardio 17', 8: 'Tardif', 9: 'Consultation',
  10: 'Viscérale 10', 11: 'Urg Viscérale 11', 12: 'Viscérale 12', 13: 'Uro 13', 14: 'Viscérale 14',
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

  if (loading) return <p className="text-sm text-center py-4 italic" style={{ color: WARM.textFaint }}>Chargement...</p>
  if (history.length === 0) return <p className="text-sm text-center py-4 italic" style={{ color: WARM.textFaint }}>Aucune présence enregistrée</p>

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
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: WARM.textFaint }}>{weekLabel}</p>
              <div className="space-y-1.5">
                {entries.map((h, i) => {
                  const d = new Date(h.date + 'T00:00:00')
                  const dayName = DAY_NAMES_FR[d.getDay()]
                  const dateStr = `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`
                  const start = h.start_time?.slice(0, 5) ?? '--:--'
                  const end = h.end_time?.slice(0, 5) ?? '--:--'
                  const roomName = ROOM_NAMES[h.room_id] ?? `Salle ${h.room_id}`
                  return (
                    <div key={i} className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                      style={{ background: WARM.surface, border: `1px solid ${WARM.border}` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold w-8 flex-shrink-0" style={{ color: WARM.text }}>{dayName}</span>
                        <span className="text-xs" style={{ color: WARM.textMid }}>{dateStr}</span>
                        <span className="text-xs truncate" style={{ color: WARM.textFaint }}>{roomName}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock size={10} style={{ color: WARM.textFaint }} />
                        <span className="text-xs" style={{ color: WARM.textMid }}>{start} → {end}</span>
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

function getWeekDates(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 5 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
  })
}

function ProfilePanel({ selectedDate }) {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(currentProfile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [todayRoom, setTodayRoom] = useState(null)
  const [weekAssignments, setWeekAssignments] = useState([])

  const isMed = currentProfile?.profession === 'medecin'
  const accentColor = isMed ? '#DC2626' : '#2563EB'
  const accentBg = isMed ? '#FEF2F2' : '#EFF6FF'
  const accentBorder = isMed ? '#FECACA' : '#BFDBFE'

  useEffect(() => {
    if (!currentProfile || !selectedDate) return
    const weekDates = getWeekDates(selectedDate)
    Promise.all([
      supabase.from('assignments').select('room_id, start_time, date')
        .eq('user_id', currentProfile.id).eq('date', selectedDate).limit(1),
      supabase.from('assignments').select('room_id, date, start_time')
        .eq('user_id', currentProfile.id).in('date', weekDates).order('date'),
    ]).then(([{ data: today }, { data: week }]) => {
      if (today && today.length > 0) setTodayRoom(today[0])
      else setTodayRoom(null)
      setWeekAssignments(week ?? [])
    })
  }, [currentProfile?.id, selectedDate])

  async function savePhone() {
    setSaving(true)
    await supabase.from('profiles').update({ phone }).eq('id', currentProfile.id)
    setSaving(false)
    setEditingPhone(false)
  }

  if (!currentProfile) return null

  const initials = currentProfile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const displayName = isMed ? `Dr. ${currentProfile.full_name}` : currentProfile.full_name
  const gradeLabel = GRADE_LABELS[currentProfile.grade] ?? currentProfile.grade
  const roomName = todayRoom ? (ROOM_NAMES[todayRoom.room_id] ?? `Salle ${todayRoom.room_id}`) : null

  return (
    <div className="space-y-5">
      {/* Carte identité */}
      <div className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: accentBg, border: `2px solid ${accentBorder}` }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 text-white"
          style={{ background: accentColor }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ color: WARM.text }}>{displayName}</p>
          <p className="text-xs" style={{ color: WARM.textMid }}>{gradeLabel} · {isMed ? 'Médecin' : 'ISA'}</p>
          {roomName && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} style={{ color: accentColor }} />
              <span className="text-xs font-medium" style={{ color: accentColor }}>
                {roomName}
                {todayRoom?.start_time ? ` · validé ${todayRoom.start_time.slice(0, 5)}` : ' · non validé'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ma semaine */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: WARM.textFaint }}>Ma semaine</p>
        {weekAssignments.length === 0 ? (
          <p className="text-sm italic" style={{ color: WARM.textFaint }}>Aucune affectation cette semaine</p>
        ) : (
          <div className="space-y-1.5">
            {getWeekDates(selectedDate).map(dateStr => {
              const asgn = weekAssignments.filter(a => a.date === dateStr)
              const d = new Date(dateStr + 'T00:00:00')
              const dayLabel = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
              const dayNum = d.getDate()
              const isToday = dateStr === selectedDate
              if (asgn.length === 0) return (
                <div key={dateStr} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: WARM.surface, border: `1px solid ${WARM.border}`, opacity: 0.5 }}>
                  <span className="text-xs font-bold w-7 flex-shrink-0" style={{ color: WARM.textFaint }}>{dayLabel}</span>
                  <span className="text-xs" style={{ color: WARM.textFaint }}>{dayNum}</span>
                  <span className="text-xs italic ml-auto" style={{ color: WARM.textFaint }}>—</span>
                </div>
              )
              return asgn.map((a, i) => {
                const roomName = ROOM_NAMES[a.room_id] ?? `Salle ${a.room_id}`
                return (
                  <div key={`${dateStr}-${i}`} className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{
                      background: isToday ? accentBg : WARM.surface,
                      border: `1px solid ${isToday ? accentBorder : WARM.border}`,
                    }}>
                    <span className="text-xs font-bold w-7 flex-shrink-0" style={{ color: isToday ? accentColor : WARM.textMid }}>{dayLabel}</span>
                    <span className="text-xs" style={{ color: WARM.textFaint }}>{dayNum}</span>
                    <span className="text-xs font-medium ml-2 flex-1 truncate" style={{ color: isToday ? accentColor : WARM.text }}>{roomName}</span>
                    {a.start_time && (
                      <span className="text-xs flex-shrink-0" style={{ color: WARM.textFaint }}>✓ {a.start_time.slice(0,5)}</span>
                    )}
                  </div>
                )
              })
            })}
          </div>
        )}
      </div>

      {/* Téléphone */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: WARM.textFaint }}>Téléphone</p>
        {editingPhone ? (
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
              autoFocus
            />
            <button onClick={savePhone} disabled={saving}
              style={{ background: WARM.accentBar }}
              className="text-white rounded-lg p-2 transition-colors">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingPhone(false)}
              style={{ color: WARM.textFaint }}
              className="rounded-lg p-2 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingPhone(true)}
            style={{ background: WARM.surface, borderColor: WARM.border }}
            className="w-full flex items-center gap-2 p-3 border rounded-xl transition-colors text-left hover:opacity-80">
            <Phone size={15} style={{ color: WARM.textFaint }} className="flex-shrink-0" />
            {phone ? (
              <span className="text-sm" style={{ color: WARM.textMid }}>{phone}</span>
            ) : (
              <span className="text-sm italic" style={{ color: WARM.textFaint }}>Cliquer pour ajouter</span>
            )}
            <Edit2 size={12} style={{ color: WARM.textFaint }} className="ml-auto flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Historique */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: WARM.textFaint }}>Historique des présences</p>
        <PresenceHistory />
      </div>
    </div>
  )
}

function StaffRow({ p, profession, canEdit, isMe }) {
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

  const isMed = profession === 'medecin'
  const dot = isMed ? 'bg-red-400' : 'bg-blue-400'
  const myBg = isMed ? '#FEF2F2' : '#EFF6FF'
  const myBorder = isMed ? '#FECACA' : '#BFDBFE'
  const myColor = isMed ? '#DC2626' : '#2563EB'

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
        style={isMe
          ? { background: myBg, border: `1px solid ${myBorder}` }
          : {}}
        onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = WARM.hover }}
        onMouseLeave={e => { if (!isMe) e.currentTarget.style.background = '' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs flex-1 truncate font-medium" style={{ color: isMe ? myColor : '#2A2318' }}>
          {isMed ? `Dr. ${p.full_name}` : p.full_name}
          {isMe && <span className="ml-1 text-xs font-bold">(moi)</span>}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: '#9E9489' }}>{GRADE_LABELS[p.grade] ?? ''}</span>
        <button
          onClick={() => { setShowPhone(v => !v); setEditing(false) }}
          className="p-0.5 rounded transition-colors flex-shrink-0"
          style={{ color: phone ? '#6B5C48' : '#B8B0A4' }}
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
                style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
                className="flex-1 border rounded-md px-2 py-1 text-xs focus:outline-none"
              />
              <button onClick={savePhone} disabled={saving}
                style={{ background: WARM.accentBar }}
                className="text-white rounded-md p-1 transition-colors">
                <Check size={11} />
              </button>
              <button onClick={() => setEditing(false)} style={{ color: '#9E9489' }} className="rounded-md p-1">
                <X size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md px-2 py-1" style={{ background: WARM.surface }}>
              {phone
                ? <span className="text-xs" style={{ color: WARM.textMid }}>{phone}</span>
                : <span className="text-xs italic" style={{ color: '#B8B0A4' }}>Non renseigné</span>
              }
              {canEdit && (
                <button onClick={() => setEditing(true)} className="ml-2" style={{ color: '#9E9489' }}>
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

  if (loading) return <p className="text-sm text-center py-4 italic" style={{ color: WARM.textFaint }}>Chargement...</p>

  if (profession === 'infirmier') {
    return (
      <div className="space-y-1">
        {staff.map(p => (
          <StaffRow key={p.id} p={p} profession={profession}
            isMe={p.id === currentProfile?.id}
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
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: WARM.accentBar }}>{section.label}</p>
          <div className="space-y-0.5">
            {section.list.map(p => (
              <StaffRow key={p.id} p={p} profession={profession}
                isMe={p.id === currentProfile?.id}
                canEdit={currentProfile?.is_admin || currentProfile?.id === p.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SearchPanel({ selectedDate }) {
  const [query, setQuery] = useState('')
  const [allProfiles, setAllProfiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [weekAssignments, setWeekAssignments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, profession, grade').order('full_name')
      .then(({ data }) => setAllProfiles(data ?? []))
  }, [])

  const filtered = query.length >= 2
    ? allProfiles.filter(p => p.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function getWeekDays() {
    const base = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
    const monday = new Date(base)
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
    return Array.from({ length: 5 }, (_, i) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      return day.toISOString().split('T')[0]
    })
  }

  useEffect(() => {
    if (!selected) return
    const days = getWeekDays()
    setLoading(true)
    supabase.from('assignments')
      .select('date, room_id, start_time')
      .eq('user_id', selected.id)
      .gte('date', days[0])
      .lte('date', days[4])
      .order('date')
      .then(({ data }) => { setWeekAssignments(data ?? []); setLoading(false) })
  }, [selected?.id, selectedDate])

  function selectProfile(p) {
    setSelected(p)
    setQuery(p.full_name)
  }

  const isMed = selected?.profession === 'medecin'
  const accentColor = isMed ? '#DC2626' : '#2563EB'
  const accentBg = isMed ? '#FEF2F2' : '#EFF6FF'
  const accentBorder = isMed ? '#FECACA' : '#BFDBFE'
  const weekDays = getWeekDays()
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: WARM.textFaint }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); setWeekAssignments([]) }}
          placeholder="Nom du médecin ou ISA..."
          style={{ background: WARM.surface, borderColor: WARM.border, color: WARM.text }}
          className="w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Suggestions */}
      {!selected && filtered.length > 0 && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: WARM.border }}>
          {filtered.map(p => {
            const isMedP = p.profession === 'medecin'
            return (
              <button key={p.id} onClick={() => selectProfile(p)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity border-b last:border-0"
                style={{ background: WARM.surface, borderColor: WARM.border }}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMedP ? 'bg-red-400' : 'bg-blue-400'}`} />
                <span className="text-xs flex-1 truncate" style={{ color: WARM.text }}>
                  {isMedP ? `Dr. ${p.full_name}` : p.full_name}
                </span>
                <span className="text-xs" style={{ color: WARM.textFaint }}>{GRADE_LABELS[p.grade] ?? ''}</span>
              </button>
            )
          })}
        </div>
      )}

      {!selected && query.length >= 2 && filtered.length === 0 && (
        <p className="text-xs text-center italic py-2" style={{ color: WARM.textFaint }}>Aucun résultat</p>
      )}

      {/* Week schedule for selected person */}
      {selected && (
        <div className="space-y-3">
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMed ? 'bg-red-400' : 'bg-blue-400'}`} />
            <span className="text-sm font-semibold" style={{ color: accentColor }}>
              {isMed ? `Dr. ${selected.full_name}` : selected.full_name}
            </span>
            <span className="text-xs ml-auto" style={{ color: WARM.textFaint }}>{GRADE_LABELS[selected.grade] ?? ''}</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: WARM.textFaint }}>Semaine</p>

          {loading ? (
            <p className="text-xs italic text-center py-2" style={{ color: WARM.textFaint }}>Chargement...</p>
          ) : (
            <div className="space-y-1.5">
              {weekDays.map((dateStr, i) => {
                const dayAssignments = weekAssignments.filter(a => a.date === dateStr)
                const isToday = dateStr === selectedDate
                const d = new Date(dateStr + 'T00:00:00')
                const dayNum = d.getDate()
                const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'août', 'sep', 'oct', 'nov', 'déc']

                return (
                  <div key={dateStr}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                      background: isToday ? accentBg : WARM.surface,
                      border: `1px solid ${isToday ? accentBorder : WARM.border}`
                    }}>
                    <div className="w-14 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: isToday ? accentColor : WARM.textMid }}>
                        {dayLabels[i]}
                      </span>
                      <span className="text-xs ml-1" style={{ color: WARM.textFaint }}>
                        {dayNum} {monthNames[d.getMonth()]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {dayAssignments.length === 0 ? (
                        <span className="text-xs italic" style={{ color: WARM.textFaint }}>—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {dayAssignments.map((a, j) => (
                            <span key={j} className="text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{ background: isToday ? accentBorder : WARM.cardHead, color: isToday ? accentColor : WARM.textMid }}>
                              {ROOM_NAMES[a.room_id] ?? `Salle ${a.room_id}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {dayAssignments.some(a => a.start_time) && (
                      <Check size={12} style={{ color: accentColor }} className="flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MENU_ITEMS = [
  { id: 'profil',    label: 'Mon profil',   icon: User },
  { id: 'recherche', label: 'Recherche',    icon: Search },
  { id: 'medecins',  label: 'Med',          icon: Stethoscope },
  { id: 'isa',       label: 'ISA',          icon: Users },
]

export default function Sidebar({ open, onClose, selectedDate }) {
  const [activeItem, setActiveItem] = useState('profil')

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      <div style={{ background: WARM.bg, borderColor: WARM.border }}
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] border-r z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: WARM.border }}>
          <span className="font-bold text-lg" style={{ color: WARM.text }}>Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: WARM.textMid }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: WARM.border }}>
          {MENU_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                style={isActive
                  ? { color: WARM.text, borderBottomColor: WARM.accentBar, background: WARM.surface }
                  : { color: WARM.textFaint }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'border-b-2' : 'hover:opacity-80'
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
          {activeItem === 'profil' && <ProfilePanel selectedDate={selectedDate} />}
          {activeItem === 'recherche' && <SearchPanel selectedDate={selectedDate} />}
          {activeItem === 'medecins' && <StaffList profession="medecin" />}
          {activeItem === 'isa' && <StaffList profession="infirmier" />}
        </div>
      </div>
    </>
  )
}
