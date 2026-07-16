import { useEffect, useRef, useState } from 'react'
import { X, User, Users, Stethoscope, Phone, Edit2, Check, MapPin, Search, BookUser, Calendar, ChevronUp, Trash2, Plus, UserPlus, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ROOM_NAMES, GRADE_LABELS, getISOWeek, getMonday, formatDateKey, formatLastFirst, getLastName } from '../config/constants'
import { WARM } from '../config/theme'
import ContactsModal, { findGsmPhone } from './ContactsModal'
import ImportProfilesModal from './ImportProfilesModal'

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_SHORT  = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

function MiniPlanning({ userId, T }) {
  const [rows, setRows] = useState(null) // null = loading

  useEffect(() => {
    const monday = getMonday(new Date())
    const from   = formatDateKey(monday)
    const end    = new Date(monday)
    end.setDate(monday.getDate() + 27)
    const to = formatDateKey(end)

    supabase.from('assignments')
      .select('date, room_id')
      .eq('user_id', userId)
      .gte('date', from).lte('date', to)
      .order('date')
      .then(({ data }) => {
        if (!data) { setRows([]); return }
        const byDate = {}
        for (const a of data) {
          if (!byDate[a.date]) byDate[a.date] = []
          byDate[a.date].push(a.room_id)
        }
        setRows(
          Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, roomIds]) => {
              const d = new Date(date + 'T12:00:00')
              const dayIdx = (d.getDay() + 6) % 7
              const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
              return {
                date,
                label: `${DAY_SHORT[dayIdx] ?? DAY_NAMES_FR[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
                rooms: roomIds.map(id => ROOM_NAMES[id] ?? `S.${id}`),
              }
            })
        )
      })
  }, [userId])

  if (rows === null)
    return <p className="text-xs italic px-3 py-2" style={{ color: T.textFaint }}>Chargement…</p>
  if (rows.length === 0)
    return <p className="text-xs italic px-3 py-2" style={{ color: T.textFaint }}>Aucune affectation (4 sem.)</p>

  return (
    <div className="max-h-52 overflow-y-auto pb-1">
      {rows.map((row, i) => {
        const prevDate = i > 0 ? new Date(rows[i - 1].date + 'T12:00:00') : null
        const currDate = new Date(row.date + 'T12:00:00')
        const weekChanged = prevDate && getISOWeek(currDate) !== getISOWeek(prevDate)
        return (
          <div key={row.date}>
            {weekChanged && (
              <div className="mx-2 my-1 border-t-2" style={{ borderColor: T.border }} />
            )}
            <div className="flex items-start gap-2 px-3 py-1.5"
              style={{ background: i % 2 === 0 ? T.surface : 'transparent' }}>
              <span className="text-xs font-semibold flex-shrink-0 w-20" style={{ color: T.textSub }}>{row.label}</span>
              <span className="text-xs" style={{ color: T.text }}>{row.rooms.join(', ')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
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
    const monday = formatDateKey(getMonday(new Date(selectedDate + 'T00:00:00')))
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

const MED_GRADES = [
  { value: 'adjoint',      label: 'Adjoint' },
  { value: 'chef_clinique',label: 'Chef de clinique' },
  { value: 'interne',      label: 'Interne' },
  { value: 'consultant',   label: 'Consultant' },
]
const ISA_GRADES = [
  { value: 'iade', label: 'ISA' },
]

function StaffRow({ p, profession, canEdit, canManage, isMe, T, onRefresh }) {
  const [showPhone, setShowPhone] = useState(false)
  const [showPlan,  setShowPlan]  = useState(false)
  const [editMode,  setEditMode]  = useState(false)   // édition nom+grade
  const [editingPhone, setEditingPhone] = useState(false)

  // Phone state
  const [phone, setPhone]   = useState(p.phone ?? '')
  // Edit state
  const [name,  setName]    = useState(p.full_name)
  const [grade, setGrade]   = useState(p.grade ?? '')
  const [saving, setSaving] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)

  const gsmPhone = !phone ? findGsmPhone(p.full_name) : null
  const isMed = profession === 'medecin'
  const dot   = isMed ? 'bg-red-400' : 'bg-blue-400'
  const myBg     = isMed ? '#FEF2F2' : '#EFF6FF'
  const myBorder = isMed ? '#FECACA' : '#BFDBFE'
  const myColor  = isMed ? '#DC2626' : '#2563EB'
  const gradeOptions = isMed ? MED_GRADES : ISA_GRADES

  async function savePhone() {
    setSaving(true)
    await supabase.from('profiles').update({ phone }).eq('id', p.id)
    setSaving(false)
    setEditingPhone(false)
  }

  async function saveProfile() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: name.trim(), grade }).eq('id', p.id)
    setSaving(false)
    setEditMode(false)
    onRefresh?.()
  }

  async function deleteProfile() {
    setSaving(true)
    await supabase.from('profiles').delete().eq('id', p.id)
    setSaving(false)
    onRefresh?.()
  }

  function togglePlan() {
    setShowPlan(v => !v)
    setShowPhone(false)
    setEditMode(false)
    setDelConfirm(false)
  }

  if (editMode) {
    return (
      <div className="rounded-xl border p-3 mb-1" style={{ background: T.surface, borderColor: T.border }}>
        <div className="flex flex-col gap-2">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Nom complet"
            style={{ background: T.cardBg, borderColor: T.border, color: T.text }}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none w-full"
            autoFocus
          />
          <select
            value={grade} onChange={e => setGrade(e.target.value)}
            style={{ background: T.cardBg, borderColor: T.border, color: T.text }}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none w-full">
            {gradeOptions.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {delConfirm ? (
              <>
                <button onClick={deleteProfile} disabled={saving}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80"
                  style={{ background: '#DC2626' }}>
                  Supprimer définitivement
                </button>
                <button onClick={() => setDelConfirm(false)} disabled={saving}
                  style={{ color: T.textFaint, background: T.cardBg, border: `1px solid ${T.border}` }}
                  className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70">
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button onClick={saveProfile} disabled={saving || !name.trim()}
                  style={{ background: T.accentBar }}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-40">
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button onClick={() => { setDelConfirm(true) }} disabled={saving}
                  style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity">
                  <Trash2 size={13} />
                </button>
                <button onClick={() => setEditMode(false)} disabled={saving}
                  style={{ color: T.textFaint, background: T.cardBg, border: `1px solid ${T.border}` }}
                  className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70">
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer"
        style={isMe
          ? { background: myBg, border: `1px solid ${myBorder}` }
          : showPlan ? { background: T.surface } : {}}
        onMouseEnter={e => { if (!isMe && !showPlan) e.currentTarget.style.background = T.surfaceHov }}
        onMouseLeave={e => { if (!isMe && !showPlan) e.currentTarget.style.background = '' }}
        onClick={togglePlan}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs flex-1 truncate font-medium" style={{ color: isMe ? myColor : T.text }}>
          {isMed ? `Dr. ${formatLastFirst(p.full_name)}` : formatLastFirst(p.full_name)}
          {isMe && <span className="ml-1 text-xs font-bold">(moi)</span>}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: T.textFaint }}>{GRADE_LABELS[p.grade] ?? ''}</span>
        {showPlan
          ? <ChevronUp size={14} className="flex-shrink-0" style={{ color: T.textFaint }} />
          : <Calendar size={14} className="flex-shrink-0" style={{ color: T.textFaint }} />
        }
        {canManage && (
          <button
            onClick={e => { e.stopPropagation(); setEditMode(true); setShowPhone(false); setShowPlan(false) }}
            className="p-2 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
            style={{ color: T.textFaint }}
            title="Modifier">
            <Edit2 size={13} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setShowPhone(v => !v); setShowPlan(false) }}
          className="p-2 -mr-1 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
          style={{ color: phone ? T.accentBar : T.textFaint }}
        >
          <Phone size={14} />
        </button>
      </div>

      {showPlan && (
        <div className="mt-1 mb-2 rounded-xl overflow-hidden border" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b" style={{ background: T.cardHead, borderColor: T.border }}>
            <Calendar size={11} style={{ color: T.textFaint }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.textFaint }}>Planning — 4 semaines</span>
          </div>
          <MiniPlanning userId={p.id} T={T} />
        </div>
      )}

      {showPhone && (
        <div className="px-4 pb-1">
          {editingPhone ? (
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
              <button onClick={() => setEditingPhone(false)} style={{ color: T.textFaint }}
                className="rounded-lg p-2 transition-colors touch-manipulation flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {phone ? (
                <a href={`tel:${phone.replace(/\s/g,'')}`} className="text-sm font-medium" style={{ color: T.accentBar }}>{phone}</a>
              ) : gsmPhone ? (
                <a href={`tel:${gsmPhone.replace(/\s/g,'')}`} className="text-sm font-medium" style={{ color: T.accentBar }}>{gsmPhone} <span className="text-xs font-normal opacity-60">annuaire</span></a>
              ) : (
                <span className="text-sm italic" style={{ color: T.textFaint }}>Non renseigné</span>
              )}
              {canEdit && (
                <button onClick={() => setEditingPhone(true)}
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

function AddPersonForm({ profession, T, onDone }) {
  const gradeOptions = profession === 'medecin' ? MED_GRADES : ISA_GRADES
  const [name,  setName]  = useState('')
  const [grade, setGrade] = useState(gradeOptions[0].value)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('profiles').insert({
      full_name:  name.trim(),
      grade,
      profession,
    })
    setSaving(false)
    if (err) {
      if (err.code === '23502' || err.code === '23503' || err.message?.includes('foreign key')) {
        setError('Impossible : les profils nécessitent un compte Supabase Auth. Utilisez l\'import Excel.')
      } else {
        setError(err.message)
      }
    } else {
      onDone()
    }
  }

  return (
    <div className="rounded-xl border p-3 mb-3" style={{ background: T.surface, borderColor: T.border }}>
      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: T.text }}>
        <UserPlus size={12} style={{ color: T.accentBar }} />
        Nouveau {profession === 'medecin' ? 'médecin' : 'ISA'}
      </p>
      <div className="flex flex-col gap-2">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Prénom Nom"
          style={{ background: T.cardBg, borderColor: T.border, color: T.text }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none w-full"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <select
          value={grade} onChange={e => setGrade(e.target.value)}
          style={{ background: T.cardBg, borderColor: T.border, color: T.text }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none w-full">
          {gradeOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        {error && <p className="text-xs text-red-600 leading-tight">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleAdd} disabled={saving || !name.trim()}
            style={{ background: T.accentBar }}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg text-white hover:opacity-80 disabled:opacity-40">
            {saving ? '…' : 'Ajouter'}
          </button>
          <button onClick={() => onDone()} disabled={saving}
            style={{ color: T.textFaint, border: `1px solid ${T.border}` }}
            className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70">
            <X size={13} />
          </button>
        </div>
      </div>
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
  const canManage = currentProfile?.is_admin
  const [staff,       setStaff]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [importFile,  setImportFile]  = useState(null)  // fichier Excel → ouvre ImportProfilesModal
  const importRef = useRef(null)

  function load() {
    setLoading(true)
    supabase.from('profiles').select('*').eq('profession', profession)
      .then(({ data }) => {
        const sorted = (data ?? []).slice().sort((a, b) =>
          getLastName(a.full_name).localeCompare(getLastName(b.full_name), 'fr')
        )
        setStaff(sorted)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [profession])

  const knownGrades = MED_SECTIONS.map(s => s.grade)
  const autres = staff.filter(p => !knownGrades.includes(p.grade))
  const allSections = [
    ...MED_SECTIONS.map(s => ({ label: s.label, list: staff.filter(p => p.grade === s.grade) })),
    ...(autres.length > 0 ? [{ label: 'Autres', list: autres }] : []),
  ].filter(s => s.list.length > 0)

  if (loading) return <p className="text-sm text-center py-4 italic" style={{ color: T.textFaint }}>Chargement...</p>

  const addBtn = canManage && !showAdd && (
    <div className="flex gap-2 mb-3">
      <button
        onClick={() => setShowAdd(true)}
        style={{ color: T.accentBar, border: `1px dashed ${T.border}` }}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:opacity-70 transition-opacity">
        <Plus size={13} /> Ajouter
      </button>
      <button
        onClick={() => importRef.current?.click()}
        style={{ color: T.accentBar, border: `1px dashed ${T.border}` }}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:opacity-70 transition-opacity">
        <FileSpreadsheet size={13} /> Import Excel
      </button>
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) setImportFile(f); e.target.value = '' }} />
    </div>
  )

  const searchBar = (
    <div className="relative mb-3">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textFaint }} />
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher..."
        style={{ background: T.surface, borderColor: T.border, color: T.text }}
        className="w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none"
      />
    </div>
  )

  const importModal = importFile && (
    <ImportProfilesModal
      preloadedFile={importFile}
      onClose={() => { setImportFile(null); load() }}
    />
  )

  if (profession === 'infirmier') {
    const filtered = search ? staff.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase())) : staff
    return (
      <>
        {importModal}
        <div>
          {showAdd && <AddPersonForm profession={profession} T={T} onDone={() => { setShowAdd(false); load() }} />}
          {addBtn}
          {searchBar}
          <div className="space-y-1">
            {filtered.map(p => (
              <StaffRow key={p.id} p={p} profession={profession} T={T}
                isMe={p.id === currentProfile?.id}
                canEdit={currentProfile?.is_admin || currentProfile?.id === p.id}
                canManage={canManage}
                onRefresh={load} />
            ))}
          </div>
        </div>
      </>
    )
  }

  const sections = search
    ? allSections.map(s => ({ ...s, list: s.list.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.list.length > 0)
    : allSections

  return (
    <>
      {importModal}
      <div>
        {showAdd && <AddPersonForm profession={profession} T={T} onDone={() => { setShowAdd(false); load() }} />}
        {addBtn}
        {searchBar}
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.label}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.accentBar }}>{section.label}</p>
              <div className="space-y-0.5">
                {sections.length === 0 ? null : section.list.map(p => (
                  <StaffRow key={p.id} p={p} profession={profession} T={T}
                    isMe={p.id === currentProfile?.id}
                    canEdit={currentProfile?.is_admin || currentProfile?.id === p.id}
                    canManage={canManage}
                    onRefresh={load} />
                ))}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <p className="text-xs text-center italic py-2" style={{ color: T.textFaint }}>Aucun résultat</p>
          )}
        </div>
      </div>
    </>
  )
}


const MENU_ITEMS = [
  { id: 'profil',   label: 'Mon profil', icon: User },
  { id: 'medecins', label: 'Med',        icon: Stethoscope },
  { id: 'isa',      label: 'ISA',        icon: Users },
  { id: 'contacts', label: 'GSM',        icon: BookUser },
]

export default function Sidebar({ open, onClose, selectedDate, theme }) {
  const T = theme ?? WARM
  const [activeItem, setActiveItem] = useState('profil')
  const [showContacts, setShowContacts] = useState(false)

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
                onClick={() => item.id === 'contacts' ? setShowContacts(true) : setActiveItem(item.id)}
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
          {activeItem === 'profil'   && <ProfilePanel selectedDate={selectedDate} T={T} />}
          {activeItem === 'medecins' && <StaffList profession="medecin"   T={T} />}
          {activeItem === 'isa'      && <StaffList profession="infirmier" T={T} />}
        </div>
      </div>

      {showContacts && (
        <ContactsModal theme={T} onClose={() => setShowContacts(false)} />
      )}
    </>
  )
}
