import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Folder, FolderPlus, File, FileText, FileSpreadsheet, Presentation,
  Image, Upload, Search, Trash2, Edit3, Share2, Eye,
  MessageSquare, ClipboardList, Sparkles, X, ChevronRight, ChevronDown,
  Download, Check, AlertCircle, Loader2, Plus, Tag,
  BarChart2, User, Mail, FolderEdit, Archive, MoveRight
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = {
  id: string; name: string; slug: string; path: string; parentId: string | null
  level: number; description: string | null; icon: string | null; color: string | null
  sortOrder: number; permissions: unknown[]; createdAt: string; children?: Category[]
}

type DocumentItem = {
  id: string; title: string; description: string | null; keywords: string[]
  fileName: string; originalName: string; mimeType: string; size: number
  r2Key: string; publicUrl: string | null; categoryId: string; status: string
  version: number; uploadedBy: string; uploadedByName: string | null; aiProcessed: boolean
  metadata: Record<string, unknown>; createdAt: string; updatedAt: string
  category?: { id: string; name: string; path: string; color: string | null }
  _count?: { comments: number; reviews: number; shares: number }
}

type Comment = {
  id: string; documentId: string; userId: string; userName: string | null; content: string
  parentId: string | null; createdAt: string; replies?: Comment[]
}

type Review = {
  id: string; documentId: string; requestedBy: string; requestedByName: string | null
  assignedTo: string | null; assignedToName: string | null; status: string
  dueDate: string | null; notes: string | null; resolution: string | null; createdAt: string
}

type ShareRecord = {
  id: string; shareToken: string; recipientEmail: string; recipientName: string | null
  sentByName: string | null; subject: string | null; viewCount: number; createdAt: string
  expiresAt: string | null; events: { id: string; eventType: string; createdAt: string }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getMimeIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText size={18} className="text-red-500" />
  if (mimeType.startsWith('image/')) return <Image size={18} className="text-blue-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet size={18} className="text-green-500" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation size={18} className="text-orange-500" />
  if (mimeType.includes('word') || mimeType.includes('msword')) return <FileText size={18} className="text-blue-400" />
  return <File size={18} className="text-zinc-400" />
}

function getMimeLabel(mimeType: string) {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'Imagen'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PowerPoint'
  if (mimeType.includes('word') || mimeType.includes('msword')) return 'Word'
  if (mimeType === 'text/csv') return 'CSV'
  if (mimeType === 'text/plain') return 'Texto'
  return 'Archivo'
}

function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>()
  flat.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: Category[] = []
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryNode({
  node, selectedId, onSelect, onAdd, onEdit, onDelete, onMove, depth = 0
}: {
  node: Category; selectedId: string | null; onSelect: (c: Category) => void
  onAdd: (parent: Category) => void; onEdit: (c: Category) => void
  onDelete: (c: Category) => void; onMove: (c: Category) => void; depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isSelected = selectedId === node.id

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm select-none ${isSelected ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800 text-zinc-300'}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node)}
      >
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="p-0.5 rounded hover:bg-zinc-600 text-zinc-500 flex-shrink-0"
        >
          {hasChildren
            ? (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
            : <span className="w-3.5 block" />}
        </button>
        {isSelected || expanded
          ? <FolderOpen size={14} className={node.color ? '' : 'text-amber-400'} style={node.color ? { color: node.color } : {}} />
          : <Folder size={14} className={node.color ? '' : 'text-amber-400'} style={node.color ? { color: node.color } : {}} />}
        <span className="flex-1 truncate">{node.name}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {node.level < 4 && (
            <button onClick={e => { e.stopPropagation(); onAdd(node) }} className="p-0.5 rounded hover:bg-zinc-600 text-zinc-500">
              <FolderPlus size={12} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(node) }} className="p-0.5 rounded hover:bg-zinc-600 text-zinc-500" title="Editar">
            <FolderEdit size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMove(node) }} className="p-0.5 rounded hover:bg-zinc-600 text-zinc-500" title="Mover a...">
            <MoveRight size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(node) }} className="p-0.5 rounded hover:bg-zinc-600 text-red-500" title="Eliminar">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <CategoryNode key={child.id} node={child} selectedId={selectedId}
              onSelect={onSelect} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    ACTIVE: { label: 'Activo', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    DRAFT: { label: 'Borrador', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    UNDER_REVIEW: { label: 'En revisión', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    ARCHIVED: { label: 'Archivado', class: 'bg-zinc-600/10 text-zinc-500 border-zinc-600/20' },
  }
  const s = map[status] ?? { label: status, class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.class}`}>{s.label}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ManageDocuments() {
  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMime, setFilterMime] = useState('')
  const [loading, setLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)

  // Panel modes: null | 'viewer' | 'metadata' | 'comments' | 'review' | 'share' | 'analytics'
  const [panel, setPanel] = useState<string | null>(null)

  // Modal modes
  const [catModal, setCatModal] = useState<{ mode: 'create' | 'edit'; parent?: Category; cat?: Category } | null>(null)
  const [uploadModal, setUploadModal] = useState(false)

  // Sub-data for selected doc
  const [comments, setComments] = useState<Comment[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [subLoading, setSubLoading] = useState(false)

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving' | 'ai' | 'done'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Inline editing
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editKeywords, setEditKeywords] = useState('')
  const [saving, setSaving] = useState(false)

  // Comment compose
  const [newComment, setNewComment] = useState('')

  // Share form
  const [shareEmail, setShareEmail] = useState('')
  const [shareName, setShareName] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [sendingShare, setSendingShare] = useState(false)

  // Review form
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewAssignee, setReviewAssignee] = useState('')
  const [reviewDue, setReviewDue] = useState('')
  const [sendingReview, setSendingReview] = useState(false)

  // AI
  const [aiLoading, setAiLoading] = useState(false)

  // Move modals
  const [moveCatModal, setMoveCatModal] = useState<Category | null>(null)
  const [moveDocModal, setMoveDocModal] = useState<DocumentItem | null>(null)

  // Feedback messages
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load categories ──
  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/documents/categories')
      const data = await res.json()
      if (data.ok) setCategories(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Load documents ──
  const loadDocuments = useCallback(async () => {
    setDocsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('categoryId', selectedCategory.id)
      if (search) params.set('search', search)
      if (filterStatus) params.set('status', filterStatus)
      if (filterMime) params.set('mimeGroup', filterMime)
      params.set('page', String(page))
      params.set('limit', '24')
      const res = await fetch(`/api/admin/documents?${params}`)
      const data = await res.json()
      if (data.ok) { setDocuments(data.data); setTotal(data.total) }
    } finally {
      setDocsLoading(false)
    }
  }, [selectedCategory, search, filterStatus, filterMime, page])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadDocuments() }, [loadDocuments])

  // ── Load sub-data when panel changes ──
  useEffect(() => {
    if (!selectedDoc || !panel) return
    const id = selectedDoc.id
    setSubLoading(true)
    const loaders: Record<string, () => Promise<void>> = {
      comments: async () => {
        const r = await fetch(`/api/admin/documents/comments?id=${id}`)
        const d = await r.json()
        if (d.ok) setComments(d.data)
      },
      review: async () => {
        const r = await fetch(`/api/admin/documents/review?id=${id}`)
        const d = await r.json()
        if (d.ok) setReviews(d.data)
      },
      analytics: async () => {
        const r = await fetch(`/api/admin/documents/share?id=${id}`)
        const d = await r.json()
        if (d.ok) setShares(d.data)
      },
      share: async () => {
        const r = await fetch(`/api/admin/documents/share?id=${id}`)
        const d = await r.json()
        if (d.ok) setShares(d.data)
      },
    }
    const loader = loaders[panel]
    if (loader) loader().finally(() => setSubLoading(false))
    else setSubLoading(false)
  }, [panel, selectedDoc])

  // ── Category tree ──
  const tree = buildTree(categories)

  // ── Category CRUD ──
  async function handleSaveCategory(name: string, description: string, color: string) {
    if (!catModal) return
    const body = catModal.mode === 'create'
      ? { name, description, color, parentId: catModal.parent?.id }
      : { id: catModal.cat?.id, name, description, color }
    const res = await fetch('/api/admin/documents/categories', {
      method: catModal.mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.ok) { loadCategories(); setCatModal(null); showToast(catModal.mode === 'create' ? 'Categoría creada' : 'Categoría actualizada') }
    else showToast(data.error || 'Error', 'err')
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return
    const res = await fetch('/api/admin/documents/categories', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cat.id }),
    })
    const data = await res.json()
    if (data.ok) { loadCategories(); if (selectedCategory?.id === cat.id) setSelectedCategory(null); showToast('Categoría eliminada') }
    else showToast(data.error || 'Error', 'err')
  }

  async function handleMoveCategory(cat: Category, newParentId: string | null) {
    const res = await fetch('/api/admin/documents/categories', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, action: 'move', newParentId }),
    })
    const data = await res.json()
    if (data.ok) { loadCategories(); setMoveCatModal(null); showToast('Categoría movida') }
    else showToast(data.error || 'Error', 'err')
  }

  async function handleMoveDocument(doc: DocumentItem, newCategoryId: string) {
    const res = await fetch(`/api/admin/documents/manage?id=${doc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: newCategoryId }),
    })
    const data = await res.json()
    if (data.ok) { loadDocuments(); setMoveDocModal(null); showToast('Documento movido') }
    else showToast(data.error || 'Error', 'err')
  }

  // ── Upload flow (server-side via base64) ──
  async function handleUpload() {
    if (!uploadFile || !uploadCategory) return
    setUploading(true); setUploadError(''); setUploadStep('uploading')
    try {
      // Step 1: Get Presigned URL
      const presignRes = await fetch('/api/admin/documents/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type,
          size: uploadFile.size,
          categoryId: uploadCategory
        })
      })
      const presignData = await presignRes.json()
      if (!presignData.ok) throw new Error(presignData.error || 'Error al autorizar subida')

      const { presignedUrl, key, publicUrl } = presignData.data

      // Step 2: Direct Upload to R2
      const uploadToR2Res = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadFile.type },
        body: uploadFile
      })
      if (!uploadToR2Res.ok) throw new Error('Error al subir el archivo directamente a R2')

      // Step 3: Save to DB
      setUploadStep('saving')
      const saveRes = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle || uploadFile.name,
          originalName: uploadFile.name,
          mimeType: uploadFile.type,
          size: uploadFile.size,
          r2Key: key,
          publicUrl,
          categoryId: uploadCategory
        }),
      })
      const saveData = await saveRes.json()
      if (!saveData.ok) throw new Error(saveData.error || 'Error al guardar registro')

      // Step 4: AI
      setUploadStep('ai')
      await fetch(`/api/admin/documents/ai-process?id=${saveData.data.id}`, { method: 'POST' }).catch(() => {})

      setUploadStep('done')
      setTimeout(() => {
        setUploadModal(false); setUploadFile(null); setUploadTitle(''); setUploadCategory(''); setUploadStep('idle')
        loadDocuments(); showToast('Documento subido correctamente')
      }, 800)
    } catch (e: any) {
      console.error('Upload flow error:', e)
      setUploadError(e.message || 'Error al subir')
      setUploadStep('idle')
    } finally {
      setUploading(false)
    }
  }

  // ── Metadata save ──
  async function handleSaveMetadata() {
    if (!selectedDoc) return
    setSaving(true)
    const res = await fetch(`/api/admin/documents/manage?id=${selectedDoc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDesc,
        keywords: editKeywords.split(',').map(k => k.trim()).filter(Boolean),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.ok) {
      setSelectedDoc(data.data)
      loadDocuments()
      showToast('Guardado')
    } else showToast(data.error || 'Error', 'err')
  }

  // ── AI processing ──
  async function handleAiProcess() {
    if (!selectedDoc) return
    setAiLoading(true)
    const res = await fetch(`/api/admin/documents/ai-process?id=${selectedDoc.id}`, { method: 'POST' })
    const data = await res.json()
    setAiLoading(false)
    if (data.ok) {
      setSelectedDoc(data.data)
      setEditTitle(data.data.title || '')
      setEditDesc(data.data.description || '')
      setEditKeywords((data.data.keywords || []).join(', '))
      loadDocuments()
      showToast('Metadatos extraídos por IA')
    } else showToast(data.error || 'Error de IA', 'err')
  }

  // ── Delete document ──
  async function handleDeleteDoc(doc: DocumentItem) {
    if (!confirm(`¿${doc.status === 'ARCHIVED' ? 'Eliminar permanentemente' : 'Archivar'} "${doc.title}"?`)) return
    const res = await fetch(`/api/admin/documents/manage?id=${doc.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.ok) {
      loadDocuments()
      if (selectedDoc?.id === doc.id) { setSelectedDoc(null); setPanel(null) }
      showToast(data.message || 'Documento eliminado')
    } else showToast(data.error || 'Error', 'err')
  }

  // ── Comment send ──
  async function handleSendComment() {
    if (!selectedDoc || !newComment.trim()) return
    const res = await fetch(`/api/admin/documents/comments?id=${selectedDoc.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    })
    const data = await res.json()
    if (data.ok) {
      setComments(prev => [...prev, data.data])
      setNewComment('')
    } else showToast(data.error || 'Error', 'err')
  }

  // ── Review request ──
  async function handleRequestReview() {
    if (!selectedDoc) return
    setSendingReview(true)
    const res = await fetch(`/api/admin/documents/review?id=${selectedDoc.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToName: reviewAssignee, notes: reviewNotes, dueDate: reviewDue || undefined }),
    })
    const data = await res.json()
    setSendingReview(false)
    if (data.ok) {
      setReviews(prev => [data.data, ...prev])
      setReviewNotes(''); setReviewAssignee(''); setReviewDue('')
      loadDocuments()
      showToast('Revisión solicitada')
    } else showToast(data.error || 'Error', 'err')
  }

  // ── Share send ──
  async function handleSendShare() {
    if (!selectedDoc || !shareEmail) return
    setSendingShare(true)
    const res = await fetch(`/api/admin/documents/share?id=${selectedDoc.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: shareEmail, recipientName: shareName, message: shareMsg }),
    })
    const data = await res.json()
    setSendingShare(false)
    if (data.ok) {
      setShares(prev => [data.data, ...prev])
      setShareEmail(''); setShareName(''); setShareMsg('')
      showToast('Documento enviado')
    } else showToast(data.error || 'Error', 'err')
  }

  // ── Select doc and open panel ──
  function openDoc(doc: DocumentItem, mode: string) {
    setSelectedDoc(doc)
    setEditTitle(doc.title)
    setEditDesc(doc.description || '')
    setEditKeywords((doc.keywords || []).join(', '))
    setPanel(mode)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-8 md:-m-12 h-[calc(100vh-6rem)] flex bg-zinc-950 text-white overflow-hidden">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {toast.type === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* ── Left: Category tree ── */}
        <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Categorías</h2>
            <button
              onClick={() => setCatModal({ mode: 'create' })}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white"
              title="Nueva categoría raíz"
            >
              <FolderPlus size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs">
                <Folder size={24} className="mx-auto mb-2 opacity-50" />
                Sin categorías.<br />Crea una para empezar.
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm mb-1 ${!selectedCategory ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
                >
                  <FolderOpen size={14} className="text-zinc-400" />
                  Todos los documentos
                </button>
                {tree.map(node => (
                  <CategoryNode key={node.id} node={node} selectedId={selectedCategory?.id ?? null}
                    onSelect={setSelectedCategory}
                    onAdd={parent => setCatModal({ mode: 'create', parent })}
                    onEdit={cat => setCatModal({ mode: 'edit', cat })}
                    onDelete={handleDeleteCategory}
                    onMove={cat => setMoveCatModal(cat)}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Center: Document list ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 flex-wrap bg-zinc-900/50">
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-white truncate">
                {selectedCategory ? (
                  <span className="flex items-center gap-2">
                    <Folder size={15} className="text-amber-400 flex-shrink-0" />
                    {selectedCategory.name}
                    <span className="text-zinc-500 text-sm font-normal truncate">{selectedCategory.path}</span>
                  </span>
                ) : 'Gestor Documental'}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">{total} documento{total !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Buscar documentos..."
                  className="bg-zinc-800 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-500 w-52 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none">
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="DRAFT">Borrador</option>
                <option value="UNDER_REVIEW">En revisión</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
              <select value={filterMime} onChange={e => { setFilterMime(e.target.value); setPage(1) }}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none">
                <option value="">Todos los tipos</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="powerpoint">PowerPoint</option>
                <option value="image">Imágenes</option>
                <option value="text">Texto / CSV</option>
              </select>
              <button onClick={() => setUploadModal(true)}
                className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-md text-sm font-medium hover:bg-zinc-100">
                <Upload size={14} />
                Subir documento
              </button>
            </div>
          </div>

          {/* Document grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {docsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-zinc-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <FileText size={40} className="mb-3 opacity-40" />
                <p className="text-sm">No hay documentos{selectedCategory ? ` en "${selectedCategory.name}"` : ''}</p>
                <button onClick={() => setUploadModal(true)} className="mt-4 text-xs text-zinc-400 underline">
                  Subir el primero
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map(doc => (
                  <div key={doc.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors group flex flex-col gap-3"
                  >
                    {/* Doc header */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        {getMimeIcon(doc.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                        <p className="text-xs text-zinc-500">{getMimeLabel(doc.mimeType)} · {formatBytes(doc.size)}</p>
                      </div>
                    </div>
                    {/* Description */}
                    {doc.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{doc.description}</p>
                    )}
                    {/* Keywords */}
                    {doc.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.keywords.slice(0, 3).map(k => (
                          <span key={k} className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{k}</span>
                        ))}
                        {doc.keywords.length > 3 && <span className="text-xs text-zinc-600">+{doc.keywords.length - 3}</span>}
                      </div>
                    )}
                    {/* Meta */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.status} />
                        {doc.aiProcessed && (
                          <span title="Procesado con IA"><Sparkles size={12} className="text-purple-400" /></span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600">{formatDate(doc.createdAt)}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 border-t border-zinc-800 pt-2 -mx-1">
                      {doc.publicUrl && (
                        <button onClick={() => openDoc(doc, 'viewer')} title="Ver"
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white text-xs">
                          <Eye size={13} /> Ver
                        </button>
                      )}
                      <button onClick={() => openDoc(doc, 'metadata')} title="Editar"
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white text-xs">
                        <Edit3 size={13} /> Editar
                      </button>
                      <button onClick={() => openDoc(doc, 'share')} title="Compartir"
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white text-xs">
                        <Share2 size={13} /> Enviar
                      </button>
                      <button onClick={() => setMoveDocModal(doc)} title="Mover a..."
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-white">
                        <MoveRight size={13} />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc)} title="Archivar/Eliminar"
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400">
                        <Archive size={13} />
                      </button>
                    </div>
                    {/* Stats */}
                    {doc._count && (
                      <div className="flex items-center gap-3 text-xs text-zinc-600">
                        <span className="flex items-center gap-1"><MessageSquare size={11} />{doc._count.comments}</span>
                        <span className="flex items-center gap-1"><ClipboardList size={11} />{doc._count.reviews}</span>
                        <span className="flex items-center gap-1"><Share2 size={11} />{doc._count.shares}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Pagination */}
            {total > 24 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700">
                  Anterior
                </button>
                <span className="text-sm text-zinc-500">Pág. {page} / {Math.ceil(total / 24)}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 24)}
                  className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700">
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Panel ── */}
        {panel && selectedDoc && (
          <div className={`${panel === 'viewer' ? 'w-[55vw] max-w-5xl' : 'w-96'} flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-900 transition-all duration-300 ease-in-out`}>
            {/* Panel tabs */}
            <div className="flex items-center gap-0.5 px-3 pt-3 pb-0 border-b border-zinc-800 overflow-x-auto">
              {[
                { key: 'viewer', icon: <Eye size={13} />, label: 'Ver', show: !!selectedDoc.publicUrl },
                { key: 'metadata', icon: <Edit3 size={13} />, label: 'Metadatos', show: true },
                { key: 'comments', icon: <MessageSquare size={13} />, label: 'Comentarios', show: true },
                { key: 'review', icon: <ClipboardList size={13} />, label: 'Revisión', show: true },
                { key: 'share', icon: <Share2 size={13} />, label: 'Compartir', show: true },
                { key: 'analytics', icon: <BarChart2 size={13} />, label: 'Analítica', show: true },
              ].filter(t => t.show).map(t => (
                <button key={t.key} onClick={() => setPanel(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${panel === t.key ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {t.icon}{t.label}
                </button>
              ))}
              <button onClick={() => { setPanel(null); setSelectedDoc(null) }} className="ml-auto p-1.5 rounded hover:bg-zinc-800 text-zinc-500 flex-shrink-0">
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── Viewer panel ── */}
              {panel === 'viewer' && selectedDoc.publicUrl && (
                <div className="flex flex-col h-full">
                  <div className="p-3 flex items-center gap-2 border-b border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{selectedDoc.title}</p>
                      <p className="text-xs text-zinc-500">{getMimeLabel(selectedDoc.mimeType)}</p>
                    </div>
                    <a href={selectedDoc.publicUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800">
                      <Download size={12} /> Descargar
                    </a>
                  </div>
                  {selectedDoc.mimeType === 'application/pdf' ? (
                    <iframe src={selectedDoc.publicUrl} className="flex-1 w-full border-none" title={selectedDoc.title} />
                  ) : selectedDoc.mimeType.startsWith('image/') ? (
                    <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950">
                      <img src={selectedDoc.publicUrl} alt={selectedDoc.title} className="max-w-full max-h-full object-contain rounded" />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                      <FileText size={40} className="text-zinc-600" />
                      <p className="text-sm text-zinc-400">Vista previa no disponible</p>
                      <a href={selectedDoc.publicUrl} download className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-700">
                        <Download size={14} /> Descargar archivo
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── Metadata panel ── */}
              {panel === 'metadata' && (
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Metadatos</h3>
                    <button onClick={handleAiProcess} disabled={aiLoading}
                      className="flex items-center gap-1.5 text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 disabled:opacity-50">
                      {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {aiLoading ? 'Procesando...' : 'Extraer con IA'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Título</label>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Descripción</label>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Tag size={11} />Palabras clave (separadas por coma)</label>
                      <input value={editKeywords} onChange={e => setEditKeywords(e.target.value)}
                        placeholder="marketing, ventas, q1"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                    </div>
                    <button onClick={handleSaveMetadata} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-md text-sm font-medium hover:bg-zinc-100 disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                  {/* File info */}
                  <div className="border-t border-zinc-800 pt-4 flex flex-col gap-2 text-xs text-zinc-500">
                    <div className="flex justify-between"><span>Tipo</span><span>{getMimeLabel(selectedDoc.mimeType)}</span></div>
                    <div className="flex justify-between"><span>Tamaño</span><span>{formatBytes(selectedDoc.size)}</span></div>
                    <div className="flex justify-between"><span>Subido por</span><span>{selectedDoc.uploadedByName || '-'}</span></div>
                    <div className="flex justify-between"><span>Fecha</span><span>{formatDate(selectedDoc.createdAt)}</span></div>
                    <div className="flex justify-between"><span>Categoría</span><span className="truncate ml-4 text-right">{selectedDoc.category?.name}</span></div>
                    <div className="flex justify-between"><span>Estado</span><StatusBadge status={selectedDoc.status} /></div>
                    <div className="flex justify-between"><span>IA</span><span>{selectedDoc.aiProcessed ? '✓ Procesado' : 'Pendiente'}</span></div>
                  </div>
                </div>
              )}

              {/* ── Comments panel ── */}
              {panel === 'comments' && (
                <div className="flex flex-col h-full">
                  <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                    {subLoading ? (
                      <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-zinc-500" /></div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-zinc-600 text-sm">
                        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                        Sin comentarios aún
                      </div>
                    ) : comments.map(c => (
                      <div key={c.id} className="bg-zinc-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-white">{c.userName || 'Usuario'}</span>
                          <span className="text-xs text-zinc-500">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{c.content}</p>
                        {c.replies && c.replies.length > 0 && (
                          <div className="mt-2 pl-3 border-l border-zinc-700 flex flex-col gap-2">
                            {c.replies.map(r => (
                              <div key={r.id}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-medium text-zinc-300">{r.userName || 'Usuario'}</span>
                                  <span className="text-xs text-zinc-600">{formatDate(r.createdAt)}</span>
                                </div>
                                <p className="text-xs text-zinc-400">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-zinc-800">
                    <div className="flex gap-2">
                      <input value={newComment} onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                        placeholder="Escribe un comentario..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                      <button onClick={handleSendComment} disabled={!newComment.trim()}
                        className="px-3 py-2 bg-zinc-700 rounded-md text-white hover:bg-zinc-600 disabled:opacity-40">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Review panel ── */}
              {panel === 'review' && (
                <div className="p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-white">Flujo de revisión</h3>
                  {/* New review form */}
                  <div className="bg-zinc-800 rounded-lg p-3 flex flex-col gap-3">
                    <p className="text-xs font-medium text-zinc-300">Solicitar revisión</p>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Asignar a</label>
                      <input value={reviewAssignee} onChange={e => setReviewAssignee(e.target.value)}
                        placeholder="Nombre del revisor"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Fecha límite</label>
                      <input type="date" value={reviewDue} onChange={e => setReviewDue(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Notas</label>
                      <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={2}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none resize-none" />
                    </div>
                    <button onClick={handleRequestReview} disabled={sendingReview}
                      className="flex items-center justify-center gap-2 bg-zinc-700 text-white py-2 rounded text-sm hover:bg-zinc-600 disabled:opacity-50">
                      {sendingReview ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />}
                      {sendingReview ? 'Enviando...' : 'Solicitar revisión'}
                    </button>
                  </div>
                  {/* Review history */}
                  {subLoading ? (
                    <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-zinc-500" /></div>
                  ) : reviews.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-zinc-400">Historial</p>
                      {reviews.map(r => {
                        const statusMap: Record<string, string> = {
                          PENDING: 'Pendiente', IN_REVIEW: 'En revisión', APPROVED: 'Aprobado',
                          REJECTED: 'Rechazado', CHANGES_REQUESTED: 'Cambios solicitados'
                        }
                        const colorMap: Record<string, string> = {
                          PENDING: 'text-amber-400', IN_REVIEW: 'text-blue-400',
                          APPROVED: 'text-emerald-400', REJECTED: 'text-red-400', CHANGES_REQUESTED: 'text-orange-400'
                        }
                        return (
                          <div key={r.id} className="bg-zinc-800 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-medium ${colorMap[r.status] || 'text-zinc-400'}`}>{statusMap[r.status] || r.status}</span>
                              <span className="text-zinc-600">{formatDate(r.createdAt)}</span>
                            </div>
                            {r.assignedToName && <p className="text-zinc-400"><User size={10} className="inline mr-1" />{r.assignedToName}</p>}
                            {r.notes && <p className="text-zinc-400 mt-1">{r.notes}</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Share panel ── */}
              {panel === 'share' && (
                <div className="p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-white">Enviar por correo</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Email del destinatario *</label>
                      <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} type="email"
                        placeholder="usuario@empresa.com"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Nombre (opcional)</label>
                      <input value={shareName} onChange={e => setShareName(e.target.value)}
                        placeholder="Juan García"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Mensaje (opcional)</label>
                      <textarea value={shareMsg} onChange={e => setShareMsg(e.target.value)} rows={3}
                        placeholder="Te comparto este documento..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none" />
                    </div>
                    <button onClick={handleSendShare} disabled={sendingShare || !shareEmail}
                      className="flex items-center justify-center gap-2 bg-white text-black py-2 rounded-md text-sm font-medium hover:bg-zinc-100 disabled:opacity-50">
                      {sendingShare ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      {sendingShare ? 'Enviando...' : 'Enviar documento'}
                    </button>
                  </div>
                  {/* Sent shares */}
                  {shares.length > 0 && (
                    <div className="border-t border-zinc-800 pt-4">
                      <p className="text-xs font-medium text-zinc-400 mb-2">Enviados recientemente</p>
                      <div className="flex flex-col gap-2">
                        {shares.slice(0, 5).map(s => (
                          <div key={s.id} className="bg-zinc-800 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-zinc-200 font-medium">{s.recipientEmail}</span>
                              <span className="text-zinc-600">{formatDate(s.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-500">
                              <span className="flex items-center gap-1"><Eye size={10} />{s.viewCount} vis.</span>
                              <span className="flex items-center gap-1">
                                <Mail size={10} />
                                {s.events.filter(e => e.eventType === 'EMAIL_OPENED').length} abiertos
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Analytics panel ── */}
              {panel === 'analytics' && (
                <div className="p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-white">Analítica de compartidos</h3>
                  {subLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-zinc-500" /></div>
                  ) : shares.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-sm">
                      <BarChart2 size={24} className="mx-auto mb-2 opacity-40" />
                      Sin datos de envíos aún
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Envíos', value: shares.length },
                          { label: 'Visitas', value: shares.reduce((a, s) => a + s.viewCount, 0) },
                          { label: 'Aperturas', value: shares.reduce((a, s) => a + s.events.filter(e => e.eventType === 'EMAIL_OPENED').length, 0) },
                        ].map(m => (
                          <div key={m.label} className="bg-zinc-800 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-white">{m.value}</p>
                            <p className="text-xs text-zinc-500">{m.label}</p>
                          </div>
                        ))}
                      </div>
                      {/* Per-recipient */}
                      <div className="flex flex-col gap-2">
                        {shares.map(s => (
                          <div key={s.id} className="bg-zinc-800 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-zinc-200">{s.recipientName || s.recipientEmail}</p>
                                <p className="text-zinc-500">{s.recipientEmail}</p>
                              </div>
                              <div className="text-right text-zinc-500">
                                <p>{formatDate(s.createdAt)}</p>
                                {s.expiresAt && <p className="text-amber-400">Vence: {formatDate(s.expiresAt)}</p>}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {s.events.slice(0, 5).map(ev => {
                                const evMap: Record<string, { label: string; color: string }> = {
                                  EMAIL_SENT: { label: 'Email enviado', color: 'text-zinc-400' },
                                  EMAIL_OPENED: { label: 'Email abierto', color: 'text-blue-400' },
                                  DOCUMENT_VIEWED: { label: 'Documento visto', color: 'text-emerald-400' },
                                  DOCUMENT_DOWNLOADED: { label: 'Descargado', color: 'text-purple-400' },
                                }
                                const ev2 = evMap[ev.eventType] ?? { label: ev.eventType, color: 'text-zinc-400' }
                                return (
                                  <div key={ev.id} className="flex items-center justify-between">
                                    <span className={ev2.color}>{ev2.label}</span>
                                    <span className="text-zinc-600">{formatDate(ev.createdAt)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Category modal ── */}
        {catModal && <CategoryModal
          mode={catModal.mode}
          parent={catModal.parent}
          existing={catModal.cat}
          onSave={handleSaveCategory}
          onClose={() => setCatModal(null)}
        />}

        {/* ── Move category modal ── */}
        {moveCatModal && (
          <MoveModal
            title={`Mover carpeta "${moveCatModal.name}" a...`}
            categories={categories}
            excludeId={moveCatModal.id}
            currentId={moveCatModal.parentId}
            allowRoot
            onConfirm={newParentId => handleMoveCategory(moveCatModal, newParentId)}
            onClose={() => setMoveCatModal(null)}
          />
        )}

        {/* ── Move document modal ── */}
        {moveDocModal && (
          <MoveModal
            title={`Mover "${moveDocModal.title}" a...`}
            categories={categories}
            currentId={moveDocModal.categoryId}
            onConfirm={newId => handleMoveDocument(moveDocModal, newId!)}
            onClose={() => setMoveDocModal(null)}
          />
        )}

        {/* ── Upload modal ── */}
        {uploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Subir documento</h2>
                <button onClick={() => { if (!uploading) { setUploadModal(false); setUploadFile(null); setUploadStep('idle'); setUploadError('') } }}
                  className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setUploadTitle(f.name.replace(/\.[^.]+$/, '')) } }}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadFile ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    {getMimeIcon(uploadFile.type)}
                    <p className="text-sm font-medium text-white">{uploadFile.name}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(uploadFile.size)}</p>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto mb-3 text-zinc-600" />
                    <p className="text-sm text-zinc-400">Arrastra un archivo o <span className="text-white underline">selecciona</span></p>
                    <p className="text-xs text-zinc-600 mt-1">PDF, Word, Excel, PowerPoint, imágenes (máx. 50 MB)</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.png,.jpg,.jpeg,.webp,.gif,.zip"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setUploadTitle(f.name.replace(/\.[^.]+$/, '')) } }} />
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Título del documento</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Categoría *</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                  <option value="">Seleccionar categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{'│ '.repeat(c.level)}{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Progress */}
              {uploading && (
                <div className="flex flex-col gap-2">
                  {[
                    { step: 'uploading', label: 'Subiendo archivo a R2...' },
                    { step: 'saving', label: 'Guardando en base de datos...' },
                    { step: 'ai', label: 'Extrayendo metadatos con IA...' },
                    { step: 'done', label: '¡Documento listo!' },
                  ].map(s => (
                    <div key={s.step} className={`flex items-center gap-2 text-sm ${uploadStep === s.step ? 'text-white' : ['uploading', 'saving', 'ai', 'done'].indexOf(uploadStep) > ['uploading', 'saving', 'ai', 'done'].indexOf(s.step) ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {uploadStep === s.step ? <Loader2 size={14} className="animate-spin" /> : ['uploading', 'saving', 'ai', 'done'].indexOf(uploadStep) > ['uploading', 'saving', 'ai', 'done'].indexOf(s.step) ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                      {s.label}
                    </div>
                  ))}
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  <AlertCircle size={14} /> {uploadError}
                </div>
              )}

              {!uploading && (
                <button onClick={handleUpload} disabled={!uploadFile || !uploadCategory}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50">
                  <Upload size={15} /> Subir documento
                </button>
              )}
            </div>
          </div>
        )}

    </div>
  )
}

// ── Move Modal ────────────────────────────────────────────────────────────────

function MoveModal({
  title, categories, excludeId, currentId, allowRoot = false, onConfirm, onClose
}: {
  title: string
  categories: Category[]
  excludeId?: string | null
  currentId?: string | null
  allowRoot?: boolean
  onConfirm: (newParentId: string | null) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string | null>(currentId ?? null)

  const valid = categories.filter(c => {
    if (excludeId && (c.id === excludeId || c.path.startsWith(categories.find(x => x.id === excludeId)?.path + '/'))) return false
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400"><X size={18} /></button>
        </div>
        <div className="bg-zinc-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          {allowRoot && (
            <button
              onClick={() => setSelected(null)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-zinc-700 ${selected === null ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}
            >
              <FolderOpen size={14} className="text-zinc-400" />
              Raíz (sin categoría padre)
            </button>
          )}
          {valid.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-zinc-700/50 last:border-0 ${selected === c.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}
              style={{ paddingLeft: `${12 + c.level * 16}px` }}
            >
              <Folder size={13} className={c.color ? '' : 'text-amber-400'} style={c.color ? { color: c.color } : {}} />
              <span className="truncate">{c.name}</span>
              {selected === c.id && <Check size={13} className="ml-auto text-emerald-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800">Cancelar</button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected === currentId && !allowRoot}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-50"
          >
            Mover aquí
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Modal ────────────────────────────────────────────────────────────

function CategoryModal({
  mode, parent, existing, onSave, onClose
}: {
  mode: 'create' | 'edit'; parent?: Category; existing?: Category
  onSave: (name: string, description: string, color: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(existing?.name || '')
  const [desc, setDesc] = useState(existing?.description || '')
  const [color, setColor] = useState(existing?.color || '#f59e0b')
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#ec4899', '#6b7280']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {mode === 'create' ? `Nueva categoría${parent ? ` en "${parent.name}"` : ''}` : `Editar "${existing?.name}"`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400"><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Descripción</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800">Cancelar</button>
          <button onClick={() => onSave(name, desc, color)} disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-50">
            {mode === 'create' ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
