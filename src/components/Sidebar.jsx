import { useEffect, useState } from 'react'
import { X, User, Users, Stethoscope, Phone, Edit2, Check, MapPin, Search, BookUser } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ROOM_NAMES, GRADE_LABELS, getISOWeek } from '../config/constants'
import { WARM } from '../config/theme'

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function ProfilePanel({ selectedDate, T }) {
  const { profile: currentProfile } = useAuth()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(currentProfile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [todayRoom, setTodayRoom] = useState(null)
  const [allAssignments, setAllAssignments] = useState([])

  const isMed = currentProfile?.profession === 'medecin'
  const accentColor = isMed ? '#DC2626' : '#2563EB'
  const accentBg = isMed ? '#FEF2F2' : '#EFF6FF'
  const accentBorder = isMed ? '#FECACA' : '#BFDBFE'

  useEffect(() => {
    if (!currentProfile) return
    const monday = getMondayOf(selectedDate)
    Promise.all([
      supabase.from('assignments').select('room_id, start_time, date')
        .eq('user_id', currentProfile.id).eq('date', selectedDate).limit(1),
      supabase.from('assignments').select('room_id, date, start_time')
        .eq('user_id', currentProfile.id).gte('date', monday).order('date'),
    ]).then(([{ data: today }, { data: all }]) => {
      setTodayRoom(today?.[0] ?? null)
      setAllAssignments(all ?? [])
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
          <p className="font-bold truncate" style={{ color: T.text }}>{displayName}</p>
          <p className="text-xs" style={{ color: T.textSub }}>{gradeLabel} · {isMed ? 'Médecin' : 'ISA'}</p>
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

      {/* Mon planning */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textFaint }}>Mon planning</p>
        {allAssignments.length === 0 ? (
          <p className="text-sm italic" style={{ color: T.textFaint }}>Aucune affectation importée</p>
        ) : (() => {
          const byWeek = {}
          allAssignments.forEach(a => {
            const w = getISOWeek(a.date)
            if (!byWeek[w]) byWeek[w] = []
            byWeek[w].push(a)
          })
          return (
            <div className="space-y-4">
              {Object.entries(byWeek).sort(([a],[b]) => +a - +b).map(([week, entries]) => (
                <div key={week}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: T.accentBar }}>Semaine {week}</p>
                  <div className="space-y-1.5">
                    {entries.map((a, i) => {
                      const d = new Date(a.date + 'T00:00:00')
                      const dayLabel = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
                      const dayNum = d.getDate()
                      const isSelected = a.date === selectedDate
                      const rName = ROOM_NAMES[a.room_id] ?? `Salle ${a.room_id}`
                      return (
                        <div key={i} className="rounded-lg px-3 py-2 flex items-center gap-2"
                          style={{
                            background: isSelected ? accentBg : T.surface,
                            border: `1px solid ${isSelected ? accentBorder : T.border}`,
                          }}>
                          <span className="text-xs font-bold w-7 flex-shrink-0"
                            style={{ color: isSelected ? accentColor : T.textSub }}>{dayLabel}</span>
                          <span className="text-xs" style={{ color: T.textFaint }}>{dayNum}</span>
                          <span className="text-xs font-medium ml-2 flex-1 truncate"
                            style={{ color: isSelected ? accentColor : T.text }}>{rName}</span>
                          {a.start_time && (
                            <span className="text-xs flex-shrink-0" style={{ color: T.textFaint }}>✓ {a.start_time.slice(0,5)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Téléphone */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textFaint }}>Téléphone</p>
        {editingPhone ? (
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              style={{ background: T.surface, borderColor: T.border, color: T.text }}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
              autoFocus
            />
            <button onClick={savePhone} disabled={saving}
              style={{ background: T.accentBar }}
              className="text-white rounded-lg p-2 transition-colors">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingPhone(false)}
              style={{ color: T.textFaint }}
              className="rounded-lg p-2 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingPhone(true)}
            style={{ background: T.surface, borderColor: T.border }}
            className="w-full flex items-center gap-2 p-3 border rounded-xl transition-colors text-left hover:opacity-80">
            <Phone size={15} style={{ color: T.textFaint }} className="flex-shrink-0" />
            {phone ? (
              <span className="text-sm" style={{ color: T.textSub }}>{phone}</span>
            ) : (
              <span className="text-sm italic" style={{ color: T.textFaint }}>Cliquer pour ajouter</span>
            )}
            <Edit2 size={12} style={{ color: T.textFaint }} className="ml-auto flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  )
}

function StaffRow({ p, profession, canEdit, isMe, T }) {
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
        onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = T.surfaceHov }}
        onMouseLeave={e => { if (!isMe) e.currentTarget.style.background = '' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs flex-1 truncate font-medium" style={{ color: isMe ? myColor : T.text }}>
          {isMed ? `Dr. ${p.full_name}` : p.full_name}
          {isMe && <span className="ml-1 text-xs font-bold">(moi)</span>}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: T.textFaint }}>{GRADE_LABELS[p.grade] ?? ''}</span>
        <button
          onClick={() => { setShowPhone(v => !v); setEditing(false) }}
          className="p-2 -mr-1 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
          style={{ color: phone ? T.accentBar : T.textFaint }}
        >
          <Phone size={14} />
        </button>
      </div>

      {showPhone && (
        <div className="px-4 pb-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="06 12 34 56 78" autoFocus
                style={{ background: T.surface, borderColor: T.border, color: T.text }}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <button onClick={savePhone} disabled={saving}
                style={{ background: T.accentBar }}
                className="text-white rounded-lg p-2 transition-colors touch-manipulation flex-shrink-0">
                <Check size={14} />
              </button>
              <button onClick={() => setEditing(false)} style={{ color: T.textFaint }}
                className="rounded-lg p-2 transition-colors touch-manipulation flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {phone
                ? <span className="text-sm font-medium" style={{ color: T.text }}>{phone}</span>
                : <span className="text-sm italic" style={{ color: T.textFaint }}>Non renseigné</span>
              }
              {canEdit && (
                <button onClick={() => setEditing(true)}
                  className="ml-3 p-1.5 rounded-md touch-manipulation flex-shrink-0"
                  style={{ color: T.textFaint }}>
                  <Edit2 size={14} />
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

function StaffList({ profession, T }) {
  const { profile: currentProfile } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('profession', profession).order('full_name')
      .then(({ data }) => { setStaff(data ?? []); setLoading(false) })
  }, [profession])

  if (loading) return <p className="text-sm text-center py-4 italic" style={{ color: T.textFaint }}>Chargement...</p>

  if (profession === 'infirmier') {
    return (
      <div className="space-y-1">
        {staff.map(p => (
          <StaffRow key={p.id} p={p} profession={profession} T={T}
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
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.accentBar }}>{section.label}</p>
          <div className="space-y-0.5">
            {section.list.map(p => (
              <StaffRow key={p.id} p={p} profession={profession} T={T}
                isMe={p.id === currentProfile?.id}
                canEdit={currentProfile?.is_admin || currentProfile?.id === p.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SearchPanel({ selectedDate, T }) {
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
      return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
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
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textFaint }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); setWeekAssignments([]) }}
          placeholder="Nom du médecin ou ISA..."
          style={{ background: T.surface, borderColor: T.border, color: T.text }}
          className="w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {!selected && filtered.length > 0 && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: T.border }}>
          {filtered.map(p => {
            const isMedP = p.profession === 'medecin'
            return (
              <button key={p.id} onClick={() => selectProfile(p)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity border-b last:border-0"
                style={{ background: T.surface, borderColor: T.border }}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMedP ? 'bg-red-400' : 'bg-blue-400'}`} />
                <span className="text-xs flex-1 truncate" style={{ color: T.text }}>
                  {isMedP ? `Dr. ${p.full_name}` : p.full_name}
                </span>
                <span className="text-xs" style={{ color: T.textFaint }}>{GRADE_LABELS[p.grade] ?? ''}</span>
              </button>
            )
          })}
        </div>
      )}

      {!selected && query.length >= 2 && filtered.length === 0 && (
        <p className="text-xs text-center italic py-2" style={{ color: T.textFaint }}>Aucun résultat</p>
      )}

      {selected && (
        <div className="space-y-3">
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMed ? 'bg-red-400' : 'bg-blue-400'}`} />
            <span className="text-sm font-semibold" style={{ color: accentColor }}>
              {isMed ? `Dr. ${selected.full_name}` : selected.full_name}
            </span>
            <span className="text-xs ml-auto" style={{ color: T.textFaint }}>{GRADE_LABELS[selected.grade] ?? ''}</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.textFaint }}>Semaine</p>

          {loading ? (
            <p className="text-xs italic text-center py-2" style={{ color: T.textFaint }}>Chargement...</p>
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
                      background: isToday ? accentBg : T.surface,
                      border: `1px solid ${isToday ? accentBorder : T.border}`
                    }}>
                    <div className="w-14 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: isToday ? accentColor : T.textSub }}>
                        {dayLabels[i]}
                      </span>
                      <span className="text-xs ml-1" style={{ color: T.textFaint }}>
                        {dayNum} {monthNames[d.getMonth()]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {dayAssignments.length === 0 ? (
                        <span className="text-xs italic" style={{ color: T.textFaint }}>—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {dayAssignments.map((a, j) => (
                            <span key={j} className="text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{ background: isToday ? accentBorder : T.cardHead, color: isToday ? accentColor : T.textSub }}>
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

// ─── Annuaire GSM ────────────────────────────────────────────────────────────
function tel(raw) {
  if (!raw) return null
  // Prendre le premier numéro si plusieurs séparés par / ou -
  const first = String(raw).split(/[\/\-]/)[0].trim()
  return first.replace(/[\s.]/g, '')
}

const CONTACTS = [
  { section: 'Médecins-chefs & Adjoints', entries: [
    { name: 'ABIDI Nour', phone: '32 047' },
    { name: 'AL KHOURY AL KALLAB Rita', phone: '32 114' },
    { name: 'ALBU Gergely', phone: '32 052' },
    { name: 'ALDENKORTT Florence', phone: '32 173' },
    { name: 'BOLLEN PINTO Bernardo', phone: '32 125' },
    { name: 'BONHOMME Fanny', phone: '32 175' },
    { name: 'BOUREZG Ali', phone: '32099' },
    { name: 'DUMONT Lionel', phone: '38041' },
    { name: 'EICHENBERGER Alain-Stéphane', phone: '32 060' },
    { name: 'ELIA Nadia', phone: '32148' },
    { name: 'ELLENBERGER Christoph', phone: '33 460' },
    { name: 'FALCIOLA Véronique', phone: '32 934' },
    { name: 'FOURNIER Roxane', phone: '32 058' },
    { name: 'GOVAERTS Amaury', phone: '32 079' },
    { name: 'HAGERMAN Andres', phone: '32 076' },
    { name: 'HALLER Guy', phone: '32 174' },
    { name: 'JAKUS Lien', phone: '32 127' },
    { name: 'KIVRAK Selin', phone: '32 135' },
    { name: 'LAHOUD Marie-José', phone: '32 071' },
    { name: 'LEPOT Ariane', phone: '32 170' },
    { name: 'MAILLARD Julien', phone: '32 091' },
    { name: 'PAVLOVIC Gordana', phone: '32 098' },
    { name: 'REHBERG Benno', phone: '32 132' },
    { name: 'ROHRER Marcel', phone: '32 067' },
    { name: 'SAVOLDELLI Georges', phone: '32 088' },
    { name: 'SCHIFFER Eduardo', phone: '32 069' },
    { name: 'SCHNEIDER Alexis', phone: '32 112' },
    { name: 'SCHORER Raoul', phone: '32 038' },
    { name: 'SUPPAN Mélanie', phone: '32 734' },
    { name: 'VUTSKITS Laszlo', phone: '33 462' },
    { name: 'WHITE Marion', phone: '32143' },
    { name: 'ZOCCATELLI Davide', phone: '32 171' },
  ]},
  { section: 'Chefs de clinique', entries: [
    { name: 'AL CHAMMAS Monique', phone: '39954' },
    { name: 'ALTUN Sahra', phone: '36487' },
    { name: 'ANDREOLETTI Hulda', phone: '39952' },
    { name: 'BARDINI Claire', phone: '30977' },
    { name: 'BAROZ Maxime', phone: '32042' },
    { name: 'BAUMGARTNER Mélanie', phone: '39950' },
    { name: 'BECKMANN Tal', phone: '32147' },
    { name: 'BENVENUTI Claudia', phone: '32083' },
    { name: 'BERTIN Christophe', phone: '32070' },
    { name: 'BETELLO Marco', phone: '32 080' },
    { name: 'BEZZI Martina', phone: '38543' },
    { name: 'BOECHER Lena', phone: '32 145' },
    { name: 'BRUNET Timothée', phone: '32 130' },
    { name: 'BUFFAT Anaïs', phone: '32176' },
    { name: 'BURCHAM TIZZONI Pamela', phone: '34078' },
    { name: 'CAMPANA Mathieu', phone: '32 064' },
    { name: 'CAMPICHE Sarah', phone: '37705' },
    { name: 'CHEVALLEY Benjamin', phone: '32066' },
    { name: 'COMPOSTO Valeria', phone: '32124' },
    { name: 'DA COSTA RODRIGUES Joao', phone: '32040' },
    { name: 'DARAN-STEFANI Alexandra', phone: '30268' },
    { name: 'DEL PUPPO Lola', phone: '30975' },
    { name: 'DE MAZIERES Julie', phone: '32096' },
    { name: 'DE VALENCE Timothée', phone: '39741' },
    { name: 'FARKAS Katalin', phone: '32 048' },
    { name: 'FAVRE Melody', phone: '39759' },
    { name: 'FIKRI Jalal', phone: '32028' },
    { name: 'FOLLONIER David', phone: '38450' },
    { name: 'FROIDEVAUX Mathias', phone: '33672' },
    { name: 'FUBINI Pietro', phone: '37292' },
    { name: 'GARCIA Vincent', phone: '36834' },
    { name: 'GAZARIAN Corinne', phone: '39933' },
    { name: 'GIARRIZZO Andrea', phone: '32118' },
    { name: 'GLAUSER Amandine', phone: '38432' },
    { name: 'GRANGE Elliot', phone: '32140' },
    { name: 'IBSEN Arni', phone: '32 024' },
    { name: 'IMOBERSTEG Nathalie', phone: '32051' },
    { name: 'KEHOE Samuel', phone: '39955' },
    { name: 'KOEGEL Jérémie', phone: '32116' },
    { name: 'KRATZER Marie', phone: '32074' },
    { name: 'MANGOLD Samuel', phone: '30 976' },
    { name: 'MANOVA Ekaterina', phone: '32 039' },
    { name: 'MICKLIZT Nadine', phone: '32034' },
    { name: 'MIDEZ Remy', phone: '32 027' },
    { name: 'NOIRMAIN Caroline', phone: '32 077' },
    { name: 'OUNG Caroline', phone: '32938' },
    { name: 'PEDROSO BARROS DE BRITO Marina', phone: '32139' },
    { name: 'PERRET Laurélie', phone: '38374' },
    { name: 'PHAM Minh Hoan', phone: '32 043' },
    { name: 'POZZA Silvia', phone: '36466' },
    { name: 'PUTZU Alessandro', phone: '39935' },
    { name: 'RAIS Gaël', phone: '32 178' },
    { name: 'SASTRE Sabine', phone: '32 053' },
    { name: 'SCHAEFER Aubry', phone: '32021' },
    { name: 'SCHOPFER Léonore', phone: '32719' },
    { name: 'SEIDENBERG Ruth', phone: '38547' },
    { name: 'SHEKA Mootii', phone: '32111' },
    { name: 'SOLLANDER Fanny', phone: '38451' },
    { name: 'SOUMAILLE-REYNAUD Marine', phone: '32730' },
    { name: 'SUTER Manuel', phone: '32094' },
    { name: 'TOMALA Simon', phone: '32134' },
    { name: 'ULAJ Artida', phone: '32177' },
    { name: 'WYSSA Damien', phone: '30 974' },
  ]},
  { section: 'Internes', entries: [
    { name: 'AHMED SUGULLE Mohamed', phone: '36639' },
    { name: 'AL GHABOUR Yara', phone: '32075' },
    { name: 'BATARDON Jérôme', phone: '30978' },
    { name: 'BOVO Nicolas', phone: '32095' },
    { name: 'BROCCO-AEBERHARD Anne-Lise', phone: '36652' },
    { name: 'BUCHS Elisa', phone: '32093' },
    { name: 'BURGAN Ryan', phone: '32141' },
    { name: 'CAHEN Daphne', phone: '32929' },
    { name: 'CHATELAIN Jean-Baptiste', phone: '38055' },
    { name: 'CHENG Mylène', phone: '32732' },
    { name: 'CHRISTEN Liv', phone: '39362' },
    { name: 'CIBOTTO Cédric', phone: '32122' },
    { name: 'COMTE Virginie', phone: '38452' },
    { name: 'DALLA POLA Angelica', phone: '36653' },
    { name: 'DUBOIS Natacha', phone: '33965' },
    { name: 'DUNAND Alexandra', phone: '32087' },
    { name: 'EZE Randy', phone: '38499' },
    { name: 'FARO BARROS Daniel', phone: '32059' },
    { name: 'FERNANDES Mariana', phone: '32065' },
    { name: 'GALLI Noemi', phone: '32061' },
    { name: 'GEISSMANN Prune', phone: '32936' },
    { name: 'GERCEKCI Cenan', phone: '36465' },
    { name: 'GIBONI Laurie', phone: '39739' },
    { name: 'GLAIZOT Lucie', phone: '32927' },
    { name: 'GRECO Lorenzo', phone: '32136' },
    { name: 'GRUNDHEBER Matis', phone: '32126' },
    { name: 'HIRSCHEL Tiffany', phone: '32172' },
    { name: 'KREYENBUHL BAPTISTA Viktor', phone: '32117' },
    { name: 'LAPAIRE Arnaud', phone: '36576' },
    { name: 'LAURENCET Matthieu', phone: '32068' },
    { name: 'LAZEYRAS Joaquim', phone: '32738' },
    { name: 'LEVY Camille', phone: '37903' },
    { name: 'MEHMETI Fortesa', phone: '39777' },
    { name: 'MESSAR-SPLINTER Camélia', phone: '32035' },
    { name: 'PAGURA Angelina', phone: '32718' },
    { name: 'PARK Chae Hyun', phone: '36468' },
    { name: 'PASCHE Christopher', phone: '32129' },
    { name: 'PASCHOUD Catherine', phone: '32931' },
    { name: 'PENATI Monica', phone: '32029' },
    { name: 'PFEIFFLE Natacha', phone: '38448' },
    { name: 'PRAPLAN Guillaume', phone: '36467' },
    { name: 'PREGERNIG Andreas', phone: '38053' },
    { name: 'REY-MILLET Quentin', phone: '38054' },
    { name: 'ROMELLI Timothy', phone: '32062' },
    { name: 'SAUDAN Margaux', phone: '36530' },
    { name: 'SAUVIN Margot', phone: '38449' },
    { name: 'SCHUTZBACH Kevin', phone: '36548' },
    { name: 'SHIBIB Ali', phone: '32073' },
    { name: 'STURNY Ludovic', phone: '32110' },
    { name: 'SUDY Roberta', phone: '36469' },
    { name: 'SYPNIEWSKA Paulina', phone: '32 149' },
    { name: 'TAFER Noah', phone: '36640' },
    { name: 'VALITON Vivian', phone: '30287' },
    { name: 'VIONNET Aurore', phone: '39740' },
  ]},
  { section: 'Bips d\'urgence & fonction', entries: [
    { name: 'Senior hors bloc', phone: '33 501' },
    { name: 'Senior répondant Julliard', phone: '35919' },
    { name: 'Chef de clinique BOU', phone: '33 500' },
    { name: 'Médecin interne Ortho', phone: '33 510' },
    { name: 'Médecin interne BOU', phone: '32 724' },
    { name: 'Médecin de garde Maternité', phone: '32 722' },
    { name: 'Médecin garde 2 Maternité', phone: '32 725' },
    { name: 'CDC jour Gynéco', phone: '32 731' },
    { name: 'CDC jour Obstétrique', phone: '32 727' },
    { name: 'Garde de jour Ophtalmo', phone: '34 033' },
    { name: 'Médecin de garde Pédiatrie', phone: '32 030' },
    { name: 'Médecin répondant BOCHA', phone: '32 729' },
    { name: 'Senior BOU', phone: '32 737' },
    { name: 'Médecin cadre Prévost', phone: '39016' },
    { name: 'Sénior répondant Hors-Bloc', phone: '36638' },
    { name: 'CDC SINPI', phone: '32 733' },
    { name: 'Médecin SSPI OPERA', phone: '32937' },
    { name: 'SSPI SIA-GH', phone: '39717' },
    { name: 'Méd. soins intermédiaires 6e étage', phone: '32 078' },
    { name: 'Médecin répondant Radiologie', phone: '30458' },
    { name: 'Médecin répondant Antalgie post-op', phone: '32 723' },
    { name: 'Méd. répondant Méd. Interventionnelle', phone: '32 717' },
    { name: 'Médecin répondant bloc 3e étage', phone: '32 044' },
    { name: 'Urgence DIG salle 11 / consultation', phone: '32 736' },
    { name: 'Médecin répondant Neurochirurgie', phone: '31 881' },
    { name: 'Médecin répondant Neurochirurgie GIBOR', phone: '31 882' },
    { name: 'Numéro fixe GIBOR', phone: '27 237' },
    { name: 'Médecin ortho électif OPERA', phone: '32 735' },
    { name: 'Médecin répondant VVC ETO cardioversion', phone: '32045' },
    { name: 'Garde Hélico (interne)', phone: '53797' },
    { name: 'Garde Hélico (externe)', phone: '0227980000' },
  ]},
  { section: 'Salles & Infirmiers', entries: [
    { name: 'GARDE BOU 1', phone: '32 783' },
    { name: 'GARDE BOU 2', phone: '32 763' },
    { name: 'GARDE BOU 3', phone: '32 784' },
    { name: 'GARDE MAT', phone: '32 757' },
    { name: 'GARDE PED', phone: '32 768' },
    { name: 'EXTOP TRAUMA ORTHO', phone: '32 771' },
    { name: 'EXTOP ORTHO', phone: '34 158' },
    { name: 'ORL Salle 2', phone: '38 687' },
    { name: 'ORL Salle 3', phone: '31857' },
    { name: 'ORL Salle 4', phone: '36684' },
    { name: 'ORL Salle 5', phone: '37854' },
    { name: 'ANTALGIE', phone: '34 434' },
    { name: 'OPERA CVT', phone: '34 159' },
    { name: 'CARDIO TAVI (Hors-Bloc)', phone: '32 238' },
    { name: 'NEURO', phone: '34 188' },
    { name: 'GIBOR', phone: '31 931' },
    { name: 'PHARMACIE', phone: '34 163' },
    { name: 'ENDO GASTRO (Hors-Bloc)', phone: '34 186' },
    { name: 'ENDO COLO (Hors-Bloc)', phone: '38 018' },
    { name: 'PNEUMO salle 7 (Hors-Bloc)', phone: '33 706' },
    { name: 'ENDOSCOPIE (Trois-Chênes)', phone: '30 778' },
    { name: 'SOINS DENTAIRE (Belle-Idée)', phone: '55 433' },
    { name: 'NEURO RADIO RX1 (Hors-Bloc)', phone: '34 165' },
    { name: 'NEURO RADIO RX2 (Hors-Bloc)', phone: '34 164' },
    { name: 'BOCHA UROLOGIE', phone: '30 335' },
    { name: 'BOCHA DIG', phone: '32 883' },
    { name: 'BOCHA ORTHO', phone: '31 859' },
    { name: 'VVC', phone: '39 816' },
    { name: 'JULLIARD salle 11', phone: '30 299' },
    { name: 'OPERA DIG', phone: '34 160' },
    { name: 'OPHTALMOLOGIE', phone: '34 182' },
    { name: 'GYNECOLOGIE', phone: '34 181' },
    { name: 'ANTALGIE PEDIATRIQUE', phone: '34 175' },
    { name: 'IRM / RADIO PEDIATRIE', phone: '34 177' },
    { name: 'POOL', phone: '32759' },
    { name: 'IRH SSPI Opéra', phone: '33734' },
    { name: 'SINPI', phone: '34884' },
    { name: 'AS PREVOST', phone: '34 156' },
    { name: 'AS BOU', phone: '34 036' },
    { name: 'AS BOCHA', phone: '34 167' },
    { name: 'AS HORS-BLOC', phone: '33 431' },
    { name: 'AS JULLIARD', phone: '34 157' },
    { name: 'AS SINPI', phone: '30 166' },
    { name: 'AS EXTOP', phone: '30 488' },
    { name: 'AS ORL', phone: '34 166' },
    { name: 'AS MAT/OPHTALMO', phone: '32 569' },
    { name: 'AS PEDIATRIE', phone: '34 176' },
    { name: 'SSPI OPERA', phone: '27 658' },
    { name: 'SSPI ORL', phone: '53426' },
    { name: 'SSPI BOCHA', phone: '31565' },
    { name: 'PCL DESK', phone: '27 972' },
    { name: 'PCL SALON', phone: '27 933' },
    { name: 'SSPI PEDIATRIE', phone: '53 703' },
    { name: 'SSPI GYNECOLOGIE', phone: '24 549' },
  ]},
  { section: 'Administratif & DMA', entries: [
    { name: 'BEAUVERD Eliane', phone: '27 402' },
    { name: 'VILLANT Florence', phone: '27 430' },
    { name: 'ITEN LE HYARIC Myriam', phone: '27 411' },
    { name: 'EL JAZIRI Firdaws', phone: '36544' },
    { name: 'Consultation antalgie — LE SEAUX Valérie', phone: '29933' },
    { name: 'BULA Grégoire (ARS-IRES)', phone: '31229' },
    { name: 'BRUNHOSA Laetitia (Soins-IRES)', phone: '27611' },
    { name: 'RUDAZ Myriam', phone: '27 421' },
    { name: 'Coordination IRES', phone: '32 778' },
    { name: 'DONGOIS Emmanuelle (EXTOP/ORL/Antalgie)', phone: '32 228' },
    { name: 'LECHAPPE Vincent (PED/GYN/Obst/Opht)', phone: '32 227' },
    { name: 'RICHARD Marie (DIG/URO/SSPI)', phone: '32225' },
    { name: 'LUISE Stéphane (DIG/URO/SSPI)', phone: '32979' },
    { name: 'BENMAMAS Dalila (BOCHA/Hors-Bloc)', phone: '32 226' },
    { name: 'BARNET Laurence (BOU/CVT/NEURO/GIBOR)', phone: '30 164' },
    { name: 'FONTAINE IAMPIERI Carole (SINPI)', phone: '37946' },
    { name: 'DOURERADJAM R. (chargé formation)', phone: '32 224' },
    { name: 'CANOVA Amandine (chargé de formation)', phone: '37602' },
    { name: 'GHANNOO Ehsaan (inf. spécialiste)', phone: '39305' },
    { name: 'ALBANEL Xavier (inf. expert)', phone: '37245' },
    { name: 'PIQUET IRES (week-end & jours fériés)', phone: '0794774218' },
    { name: 'TEXIER Isabelle (Cheffe secrétariats)', phone: '30449' },
    { name: 'MENOUD Jean-François (Resp. soins)', phone: '27610' },
    { name: 'FANCELLO Enzo (Administrateur)', phone: '27408' },
    { name: 'POURRET Max-Olivier (Resp. RH)', phone: '27503' },
    { name: 'ROTH Cinthia (Assistante Dpt)', phone: '30246' },
    { name: 'LAROCHE Thierry (Chef de projet DMA)', phone: '32222' },
    { name: 'IZAMBAYI Rissa (Séc. LEGO)', phone: '23024' },
  ]},
  { section: 'Médecins associés & consultants', entries: [
    { name: 'BALMER Christian', phone: '0787187713' },
    { name: 'CHATELLARD Ghislaine', phone: '32 055' },
  ]},
]

function ContactsPanel({ T }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const filtered = q.length < 2
    ? CONTACTS
    : CONTACTS.map(s => ({
        ...s,
        entries: s.entries.filter(e => e.name.toLowerCase().includes(q) || e.phone?.replace(/\s/g,'').includes(q))
      })).filter(s => s.entries.length > 0)

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textFaint }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un nom ou numéro..."
          style={{ background: T.surface, borderColor: T.border, color: T.text }}
          className="w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {filtered.map(section => (
        <div key={section.section}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1.5 sticky top-0 py-1"
            style={{ color: T.accentBar, background: T.pageBg }}>
            {section.section}
          </p>
          <div className="space-y-0.5">
            {section.entries.map((e, i) => {
              const cleaned = tel(e.phone)
              return (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5"
                  style={{ background: T.surface }}>
                  <span className="text-xs flex-1 truncate pr-2" style={{ color: T.text }}>{e.name}</span>
                  {cleaned ? (
                    <a href={`tel:${cleaned}`}
                      className="flex items-center gap-1 text-xs font-mono font-medium flex-shrink-0 px-2 py-1 rounded-lg touch-manipulation"
                      style={{ color: T.accentBar, background: T.cardHead }}>
                      <Phone size={10} />
                      {e.phone}
                    </a>
                  ) : (
                    <span className="text-xs italic flex-shrink-0" style={{ color: T.textFaint }}>—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const MENU_ITEMS = [
  { id: 'profil',    label: 'Mon profil',   icon: User },
  { id: 'recherche', label: 'Recherche',    icon: Search },
  { id: 'medecins',  label: 'Med',          icon: Stethoscope },
  { id: 'isa',       label: 'ISA',          icon: Users },
  { id: 'contacts',  label: 'GSM',          icon: BookUser },
]

export default function Sidebar({ open, onClose, selectedDate, theme }) {
  const T = theme ?? WARM
  const [activeItem, setActiveItem] = useState('profil')

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      <div style={{ background: T.pageBg, borderColor: T.border }}
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] border-r z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: T.border }}>
          <span className="font-bold text-lg" style={{ color: T.text }}>Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: T.textSub }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: T.border }}>
          {MENU_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                style={isActive
                  ? { color: T.text, borderBottomColor: T.accentBar, background: T.surface }
                  : { color: T.textFaint }}
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
          {activeItem === 'profil'    && <ProfilePanel selectedDate={selectedDate} T={T} />}
          {activeItem === 'recherche' && <SearchPanel  selectedDate={selectedDate} T={T} />}
          {activeItem === 'medecins'  && <StaffList profession="medecin"    T={T} />}
          {activeItem === 'isa'       && <StaffList profession="infirmier"  T={T} />}
          {activeItem === 'contacts'  && <ContactsPanel T={T} />}
        </div>
      </div>
    </>
  )
}
