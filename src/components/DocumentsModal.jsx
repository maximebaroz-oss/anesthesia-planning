import { useState, useEffect, useRef } from 'react'
import { X, Upload, FileText, Presentation, Trash2, Download, BookOpen, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { WARM } from '../config/theme'

const TABS = [
  { id: 'protocols', label: 'Protocoles / Guidelines', icon: BookOpen, accept: '.pdf', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'hot_topics', label: 'Hot Topics',             icon: Flame,    accept: '.pdf,.pptx,.ppt', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
]

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FileIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText size={18} className="flex-shrink-0" style={{ color: '#DC2626' }} />
  if (ext === 'pptx' || ext === 'ppt') return <Presentation size={18} className="flex-shrink-0" style={{ color: '#EA580C' }} />
  return <FileText size={18} className="flex-shrink-0" style={{ color: '#64748B' }} />
}

export default function DocumentsModal({ unit, theme, onClose, initialTab }) {
  const T = theme ?? WARM
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab ?? 'protocols')
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const tab = TABS.find(t => t.id === activeTab)

  useEffect(() => { fetchDocs() }, [activeTab, unit?.id])

  async function fetchDocs() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('unit_documents')
      .select('*, profiles(full_name)')
      .eq('unit_id', unit?.id)
      .eq('type', activeTab)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDocs(data ?? [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop().toLowerCase()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${unit?.id}/${activeTab}/${Date.now()}_${safeName}`

    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('unit_documents').insert({
      unit_id: unit?.id,
      type: activeTab,
      name: file.name,
      file_path: path,
      file_url: publicUrl,
      file_size: file.size,
      uploaded_by: profile?.id,
    })
    if (dbErr) setError(dbErr.message)
    else fetchDocs()
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(doc) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('unit_documents').delete().eq('id', doc.id)
    fetchDocs()
  }

  const canDelete = profile?.is_admin || profile?.grade === 'adjoint' || profile?.grade === 'chef_clinique'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: T.pageBg, maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: T.border }}>
          <div>
            <div className="font-bold text-base" style={{ color: T.text }}>Documents</div>
            <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>{unit?.name}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors touch-manipulation"
            style={{ color: T.textSub }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: T.border }}>
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors touch-manipulation"
                style={isActive
                  ? { color: t.color, borderBottom: `2px solid ${t.color}`, background: t.bg }
                  : { color: T.textFaint }}>
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.id === 'protocols' ? 'Protocoles' : 'Hot Topics'}</span>
              </button>
            )
          })}
        </div>

        {/* Upload zone */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <input ref={inputRef} type="file" accept={tab.accept} onChange={handleUpload}
            className="hidden" id="doc-upload" />
          <label htmlFor="doc-upload"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors touch-manipulation"
            style={{ borderColor: uploading ? tab.color : T.border, background: uploading ? tab.bg : T.surface, color: uploading ? tab.color : T.textFaint }}>
            <Upload size={16} />
            <span className="text-sm font-medium">
              {uploading ? 'Upload en cours...' : `Ajouter un fichier (${tab.accept.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()})`}
            </span>
          </label>
          {error && <p className="text-xs mt-2 text-red-500">{error}</p>}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <p className="text-sm text-center py-8 italic" style={{ color: T.textFaint }}>Chargement...</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">{activeTab === 'protocols' ? '📋' : '🔥'}</div>
              <p className="text-sm italic" style={{ color: T.textFaint }}>Aucun document pour l'instant</p>
            </div>
          ) : docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <FileIcon name={doc.name} />
              <div className="flex-1 min-w-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium truncate block hover:underline"
                  style={{ color: T.text }}>{doc.name}</a>
                <div className="text-xs mt-0.5" style={{ color: T.textFaint }}>
                  {doc.profiles?.full_name && <span>Dr. {doc.profiles.full_name} · </span>}
                  {formatDate(doc.created_at)}
                  {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                </div>
              </div>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download
                className="p-1.5 rounded-lg touch-manipulation flex-shrink-0"
                style={{ color: T.textFaint }}>
                <Download size={15} />
              </a>
              {canDelete && (
                <button onClick={() => handleDelete(doc)}
                  className="p-1.5 rounded-lg touch-manipulation flex-shrink-0"
                  style={{ color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
