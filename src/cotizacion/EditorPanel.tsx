/**
 * Editor del documento sobre la vista pública (?editor=1, sesión del dueño).
 *
 * Funciona como un constructor de páginas:
 *  - Barra lateral izquierda: páginas del documento (agregar desde plantilla,
 *    subir, bajar, duplicar, borrar) o, en el esquema clásico, sus secciones
 *    (mostrar u ocultar) y el paso a páginas libres.
 *  - Sobre cada bloque de una página aparece una barra: mover, duplicar,
 *    borrar y agregar un bloque nuevo (texto, imagen, tabla, fases…).
 *  - Los textos se editan en el sitio; las imágenes se reemplazan con un clic.
 *  - Todo se aplica sobre una copia local: «Guardar cambios» confirma y
 *    envía; «Vista previa» muestra el documento limpio; «Descartar» vuelve
 *    a lo guardado.
 *  - Panel derecho: la IA, que recibe el elemento señalado y aplica cambios en
 *    el servidor (guarda antes lo pendiente).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { BLOCK_TYPES, EMPTY, TEMPLATES, type Page, type Block } from '../cotizador/PagesEditor'
import { IconPicker } from './IconPicker'

type Mode = 'select' | 'edit'
type Focus = { ref: string; label: string; text: string }
type Msg = { role: 'user' | 'assistant'; text: string; changes?: string[] }
/** Posición de un bloque: en la página (pi, bi) o dentro de una celda de cuadrícula (pi, bi, ci, ii). */
type Loc = { pi: number; bi: number; ci?: number; ii?: number }
type Hover = (Loc & { top: number; left: number; width: number }) | null
/** Destino de un bloque nuevo: después del índice `after` de la lista de la página o de la celda. */
type AddTarget = { pi: number; bi?: number; ci?: number; after: number }
type Dialog =
  | { kind: 'grid'; target: AddTarget }
  | { kind: 'icon'; target?: AddTarget; loc?: Loc }
  | { kind: 'button'; target?: AddTarget; loc?: Loc }
  | { kind: 'ai'; target: AddTarget }
  | { kind: 'gridSettings'; loc: Loc }
  | { kind: 'style'; loc: Loc }
  | { kind: 'move'; loc: Loc }
  | { kind: 'versions' }
  | null

const parseLoc = (raw: string): Loc | null => {
  const n = raw.split(':').map(Number)
  if (n.some((x) => !Number.isInteger(x))) return null
  if (n.length === 2) return { pi: n[0], bi: n[1] }
  if (n.length === 4) return { pi: n[0], bi: n[1], ci: n[2], ii: n[3] }
  return null
}

export const LEGACY_SECTIONS: Array<[string, string]> = [
  ['presentacion', 'Presentación'], ['diagnostico', 'Diagnóstico'], ['arquitectura', 'Método / Arquitectura'], ['enfoque', 'Enfoque'],
  ['pantallas', 'Capturas'], ['modulos', 'Líneas / módulos'], ['configurador', 'Configurador'], ['cronograma', 'Cronograma'],
  ['inversion', 'Inversión'], ['pagos', 'Plan de pagos'], ['servicio', 'Servicio'], ['equipo', 'Equipo'], ['condiciones', 'Condiciones'], ['cierre', 'Contraportada'],
]

const post = async (path: string, body: Record<string, unknown>) => {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await res.json().catch(() => null)
  if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `Error ${res.status}`)
  return payload
}

/** Etiqueta legible de una referencia, para el chip del panel. */
function labelFor(ref: string): string {
  const p = ref.split('.')
  if (p[0] === 'quote') return { title: 'Título de la portada', subtitle: 'Bajada de la portada', clientName: 'Cliente', sector: 'Sector' }[p[1]] || p[1]
  if (p[0] === 'item') return `Línea ${p[1]} · ${p[2]}`
  if (p[1] === 'cover') return `Portada · ${{ kicker: 'antetítulo', duration: 'duración', scope: 'alcance', investment: 'inversión', tagline: 'lema' }[p[2]] || p[2]}`
  if (p[1] === 'sections') return `Sección ${p[2]} · ${p[3]}`
  if (p[1] === 'labels') return `Rótulo · ${p[2]}`
  if (p[1] === 'pages') {
    const page = `Página ${Number(p[2]) + 1}`
    if (p[3] === 'title') return `${page} · título`
    if (p[3] === 'kicker') return `${page} · antetítulo`
    if (p[3] === 'num') return `${page} · número`
    if (p[3] === 'blocks') return `${page} · bloque ${Number(p[4]) + 1}${p[5] && p[5] !== 'text' ? ` · ${p.slice(5).join('.')}` : ''}`
    return page
  }
  const names: Record<string, string> = {
    intro: 'Carta', diagnosis: 'Diagnóstico', architecture: 'Método / arquitectura', approach: 'Enfoque', scopeNote: 'Nota de alcance',
    screens: 'Capturas', schedule: 'Cronograma', milestones: 'Hitos', investmentNote: 'Nota de inversión', paymentsNote: 'Nota de pagos',
    service: 'Servicio', teamIntro: 'Equipo · intro', team: 'Equipo', workRhythm: 'Ritmo de trabajo', assumptions: 'Supuestos',
    exclusions: 'Exclusiones', guarantees: 'Garantías', finalNote: 'Nota final', backQuote: 'Cierre', signature: 'Firma', coreNote: 'Nota del núcleo',
    timelineNote: 'Nota del plazo', paymentLabels: 'Plan de pagos', brand: 'Marca', cobrand: 'Aliado',
  }
  const rest = p.slice(2).join('.')
  return `${names[p[1]] || p[1]}${rest ? ` · ${rest}` : ''}`
}

/** DOM editado → texto con las marcas que entiende el visor. */
function domToMarks(root: Element): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, ' ')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const inner = () => Array.from(el.childNodes).map(walk).join('')
    switch (tag) {
      case 'br': return '\n'
      case 'b': case 'strong': { const t = inner().trim(); return t ? `**${t}**` : '' }
      case 'em': case 'i': { const t = inner().trim(); return t ? `*${t}*` : '' }
      case 'code': { const t = inner().trim(); return t ? `\`${t}\`` : '' }
      case 'a': {
        const t = inner().trim()
        const href = el.getAttribute('href') || ''
        if (!t) return ''
        if (!href || href.replace(/^mailto:/, '') === t || href === t) return t
        return `[${t}](${href})`
      }
      case 'li': return `- ${inner().trim()}\n`
      case 'ul': case 'ol': return `\n${inner()}\n`
      case 'p': case 'div': case 'h1': case 'h2': case 'h3': case 'h4': case 'figcaption': case 'dd': case 'dt': case 'td': case 'th':
        return `${inner()}\n\n`
      default: return inner()
    }
  }
  return walk(root).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '')
}

const blockPreview = (b: Block) => {
  const raw = b.text ?? b.body ?? b.caption ?? b.name ?? (Array.isArray(b.items) ? (typeof b.items[0] === 'string' ? b.items[0] : b.items[0]?.title || b.items[0]?.label) : '') ?? ''
  return String(raw || '').slice(0, 40)
}
const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_TYPES)

export type EditorProps = {
  publicId: string
  quoteTitle: string
  published: boolean
  pages: Page[]
  sections: Record<string, { hidden?: boolean; title?: string; kicker?: string }>
  dirty: boolean
  preview: boolean
  onPreview: (on: boolean) => void
  onApplyRef: (ref: string, value: string) => boolean
  onPages: (next: Page[]) => void
  onSections: (next: Record<string, { hidden?: boolean; title?: string; kicker?: string }>) => void
  onSave: () => Promise<void>
  onDiscard: () => Promise<void>
  onReload: () => Promise<void>
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function EditorPanel(props: EditorProps) {
  const { publicId, pages, sections, dirty, preview, onPreview, onApplyRef, onPages, onSections, onSave, onDiscard, onReload, onUndo, onRedo, canUndo, canRedo } = props
  const [mode, setMode] = useState<Mode>('edit')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [sideOpen, setSideOpen] = useState(true)
  const [hover, setHover] = useState<Hover>(null)
  const [addMenu, setAddMenu] = useState<AddTarget | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [pageMenu, setPageMenu] = useState<number | null>(null) // insertar plantilla después de la página N (-1 al inicio)
  const [saveModal, setSaveModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [versions, setVersions] = useState<Array<{ id: string; reason: string; label?: string | null; title: string; createdByName?: string | null; createdAt: string }>>([])
  const [versionsBusy, setVersionsBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgTarget = useRef<string>('')
  const hoverTimer = useRef<number>(0)
  const pagesRef = useRef<Page[]>(pages)
  pagesRef.current = pages
  const isPaged = pages.length > 0

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, busy])
  const flash = useCallback((text: string) => { setStatus(text); window.setTimeout(() => setStatus(''), 2500) }, [])
  const clearSelectedClass = () => document.querySelectorAll('.qv-ref-selected').forEach((el) => el.classList.remove('qv-ref-selected'))

  // atajos: Esc cierra; Ctrl/Cmd+S guarda; Ctrl/Cmd+Z deshace; Ctrl/Cmd+Shift+Z rehace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (addMenu) setAddMenu(null)
        if (pageMenu !== null) setPageMenu(null)
        if (dialog) setDialog(null)
        if (saveModal && !saving) setSaveModal(false)
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const editing = (e.target as HTMLElement)?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName || '')
      if (e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) setSaveModal(true) }
      if (e.key.toLowerCase() === 'z' && !editing) { e.preventDefault(); if (e.shiftKey) onRedo?.(); else onUndo?.() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [addMenu, pageMenu, dialog, saveModal, saving, dirty, onUndo, onRedo])

  // avisar antes de cerrar con cambios sin guardar
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  // clases del cuerpo: modo activo y barra lateral
  useEffect(() => {
    document.body.classList.toggle('qv-mode-select', !preview && mode === 'select')
    document.body.classList.toggle('qv-mode-edit', !preview && mode === 'edit')
    document.body.classList.toggle('qv-has-side', !preview && sideOpen)
    return () => { document.body.classList.remove('qv-mode-select', 'qv-mode-edit', 'qv-has-side') }
  }, [mode, preview, sideOpen])

  // ── señalar ──
  useEffect(() => {
    if (preview || mode !== 'select') return
    const onClick = (e: MouseEvent) => {
      const img = (e.target as Element).closest('[data-img-ref]') as HTMLElement | null
      const target = img || ((e.target as Element).closest('[data-ref]') as HTMLElement | null)
      if (!target || target.closest('.qv-editor, .qv-side, .qv-blockbar')) return
      e.preventDefault(); e.stopPropagation()
      clearSelectedClass()
      target.classList.add('qv-ref-selected')
      if (img) {
        const ref = img.dataset.imgRef || ''
        setFocus({ ref, label: `Imagen · ${labelFor(ref)}`, text: (img as HTMLImageElement).getAttribute('alt') || (img as HTMLImageElement).src })
        return
      }
      const ref = target.dataset.ref || ''
      setFocus({ ref, label: labelFor(ref), text: domToMarks(target).slice(0, 6000) })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [mode, preview])

  // ── editar en sitio (sobre la copia local) ──
  useEffect(() => {
    if (preview || mode !== 'edit') {
      document.querySelectorAll<HTMLElement>('[data-ref][contenteditable]').forEach((el) => { el.removeAttribute('contenteditable'); delete el.dataset.orig })
      return
    }
    const enable = () => {
      document.querySelectorAll<HTMLElement>('[data-ref]').forEach((el) => {
        if (el.closest('.qv-editor, .qv-side') || el.getAttribute('contenteditable') === 'true') return
        el.setAttribute('contenteditable', 'true')
        el.dataset.orig = domToMarks(el)
      })
    }
    enable()
    const onBlur = (e: FocusEvent) => {
      const el = (e.target as Element)?.closest?.('[data-ref][contenteditable]') as HTMLElement | null
      if (!el) return
      const value = domToMarks(el)
      if (value === el.dataset.orig) return
      el.dataset.orig = value
      if (!onApplyRef(el.dataset.ref || '', value)) flash('Ese campo no admite ese valor')
    }
    const onKey = (e: KeyboardEvent) => {
      const el = (e.target as Element)?.closest?.('[data-ref][contenteditable]') as HTMLElement | null
      if (!el) return
      if (e.key === 'Escape') el.blur()
      if (e.key === 'Enter' && !e.shiftKey && /^(H1|H2|H3|H4|TD|TH|SPAN|LI|FIGCAPTION|DT|DD|B)$/.test(el.tagName)) { e.preventDefault(); el.blur() }
    }
    const onImgClick = (e: MouseEvent) => {
      const cellAdd = (e.target as Element).closest('[data-cell-add]') as HTMLElement | null
      if (cellAdd) {
        e.preventDefault(); e.stopPropagation()
        const n = (cellAdd.dataset.cellAdd || '').split(':').map(Number)
        if (n.length === 3) {
          const cell = (pagesRef.current[n[0]]?.blocks[n[1]] as any)?.cells?.[n[2]]
          setAddMenu({ pi: n[0], bi: n[1], ci: n[2], after: Array.isArray(cell) ? cell.length - 1 : -1 })
        }
        return
      }
      // un enlace dentro de un texto editable se edita, no navega
      if ((e.target as Element).closest('[data-ref] a, a[data-ref]') && !(e.target as Element).closest('.qv-editor, .qv-side')) e.preventDefault()
      const img = (e.target as Element).closest('[data-img-ref]') as HTMLElement | null
      if (!img || img.closest('.qv-editor, .qv-side')) return
      e.preventDefault(); e.stopPropagation()
      imgTarget.current = img.dataset.imgRef || ''
      fileRef.current?.click()
    }
    document.addEventListener('click', onImgClick, true)
    document.addEventListener('focusout', onBlur)
    document.addEventListener('keydown', onKey)
    const observer = new MutationObserver(() => enable())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('click', onImgClick, true)
      document.removeEventListener('focusout', onBlur)
      document.removeEventListener('keydown', onKey)
      observer.disconnect()
    }
  }, [mode, preview, onApplyRef, flash])

  // ── barra de bloque al pasar el ratón ──
  useEffect(() => {
    if (preview || !isPaged) { setHover(null); return }
    const onMove = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('.qv-blockbar, .qv-editor, .qv-side, .qv-addmenu')) { window.clearTimeout(hoverTimer.current); return }
      const block = t.closest('[data-block]') as HTMLElement | null
      window.clearTimeout(hoverTimer.current)
      if (!block) { hoverTimer.current = window.setTimeout(() => setHover(null), 250); return }
      const loc = parseLoc(block.dataset.block || '')
      if (!loc) return
      const r = block.getBoundingClientRect()
      setHover((prev) => (prev && prev.pi === loc.pi && prev.bi === loc.bi && prev.ci === loc.ci && prev.ii === loc.ii && Math.abs(prev.top - (r.top + window.scrollY)) < 2 ? prev : { ...loc, top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width }))
    }
    document.addEventListener('mousemove', onMove)
    return () => { document.removeEventListener('mousemove', onMove); window.clearTimeout(hoverTimer.current) }
  }, [preview, isPaged, pages])

  // ── imágenes ──
  const replaceImage = async (file: File | undefined) => {
    const ref = imgTarget.current
    if (!file || !ref) return
    if (file.size > 4 * 1024 * 1024) { flash('La imagen supera 4 MB'); return }
    setStatus('Subiendo imagen…')
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
        reader.readAsDataURL(file)
      })
      const up = await post('/api/quotes/upload', { fileBase64, filename: file.name, contentType: file.type })
      onApplyRef(ref, up.url)
      flash('Imagen reemplazada · guarda para publicarla')
    } catch (e) {
      flash(`No se reemplazó: ${(e as Error).message}`)
    } finally {
      imgTarget.current = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── operaciones sobre páginas y bloques (copia local) ──
  const uid = (base: string) => {
    const ids = new Set(pages.map((p) => p.id))
    let id = base
    while (ids.has(id)) id = `${base}-${Math.random().toString(36).slice(2, 5)}`
    return id
  }
  const scrollToPage = (id: string) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  const movePage = (pi: number, dir: -1 | 1) => {
    const j = pi + dir
    if (j < 0 || j >= pages.length) return
    const next = [...pages]; [next[pi], next[j]] = [next[j], next[pi]]
    onPages(next)
  }
  const removePage = (pi: number) => {
    if (!confirm(`¿Eliminar la página «${pages[pi].title || pages[pi].id}» con sus ${pages[pi].blocks.length} bloques?`)) return
    onPages(pages.filter((_, i) => i !== pi))
  }
  const duplicatePage = (pi: number) => {
    const copy = structuredClone(pages[pi]) as Page
    copy.id = uid(`${pages[pi].id}-copia`)
    onPages([...pages.slice(0, pi + 1), copy, ...pages.slice(pi + 1)])
    scrollToPage(copy.id)
  }
  const addPage = (templateId: string, after: number) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
    const page = tpl.make(pages.length + 1)
    page.id = uid(page.id)
    const at = after + 1
    onPages([...pages.slice(0, at), page, ...pages.slice(at)])
    setPageMenu(null)
    scrollToPage(page.id)
  }
  const setBlocks = (pi: number, blocks: Block[]) => onPages(pages.map((p, i) => (i === pi ? { ...p, blocks } : p)))
  /** Lista donde vive un bloque: la de la página o la de una celda de cuadrícula. */
  const listAt = (pi: number, bi?: number, ci?: number): Block[] => {
    if (ci === undefined || bi === undefined) return pages[pi]?.blocks ?? []
    const grid = pages[pi]?.blocks[bi] as any
    return Array.isArray(grid?.cells?.[ci]) ? grid.cells[ci] : []
  }
  const writeList = (pi: number, bi: number | undefined, ci: number | undefined, list: Block[]) => {
    if (ci === undefined || bi === undefined) { setBlocks(pi, list); return }
    const blocks = [...pages[pi].blocks]
    const grid = { ...(blocks[bi] as any) }
    const cells = Array.isArray(grid.cells) ? grid.cells.map((c: Block[]) => [...c]) : []
    while (cells.length <= ci) cells.push([])
    cells[ci] = list
    blocks[bi] = { ...grid, cells }
    setBlocks(pi, blocks)
  }
  /** Índice del bloque dentro de su lista y la lista misma, según su posición. */
  const locate = (loc: Loc) => (loc.ci !== undefined && loc.ii !== undefined
    ? { list: listAt(loc.pi, loc.bi, loc.ci), idx: loc.ii, pi: loc.pi, bi: loc.bi, ci: loc.ci }
    : { list: listAt(loc.pi), idx: loc.bi, pi: loc.pi, bi: undefined as number | undefined, ci: undefined as number | undefined })
  const blockAt = (loc: Loc): Block | undefined => locate(loc).list[locate(loc).idx]
  const moveBlock = (loc: Loc, dir: -1 | 1) => {
    const { list, idx, pi, bi, ci } = locate(loc)
    const next = [...list]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    writeList(pi, bi, ci, next)
  }
  const removeBlock = (loc: Loc) => {
    const { list, idx, pi, bi, ci } = locate(loc)
    const b = list[idx]
    if (!b || !confirm(`¿Eliminar este bloque (${BLOCK_LABEL[b.type] || b.type})?`)) return
    writeList(pi, bi, ci, list.filter((_, i) => i !== idx))
    setHover(null)
  }
  const duplicateBlock = (loc: Loc) => {
    const { list, idx, pi, bi, ci } = locate(loc)
    const next = [...list]
    next.splice(idx + 1, 0, structuredClone(next[idx]))
    writeList(pi, bi, ci, next)
  }
  const updateBlock = (loc: Loc, patch: Partial<Block>) => {
    const { list, idx, pi, bi, ci } = locate(loc)
    const next = [...list]
    next[idx] = { ...next[idx], ...patch } as Block
    writeList(pi, bi, ci, next)
  }
  /** Mueve un bloque a otra lista: nivel de página, celda de una cuadrícula u otra página. */
  const moveTo = (loc: Loc, target: AddTarget) => {
    const src = locate(loc)
    const block = src.list[src.idx]
    if (!block) return
    if (block.type === 'grid' && target.ci !== undefined) { flash('Una cuadrícula no va dentro de otra'); return }
    let next = pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => (b.type === 'grid' ? { ...b, cells: (b as any).cells.map((c: Block[]) => [...c]) } : b)) }))
    const getList = (pi: number, bi?: number, ci?: number): Block[] => (ci === undefined || bi === undefined ? next[pi].blocks : ((next[pi].blocks[bi] as any).cells[ci] as Block[]))
    // quitar del origen
    const srcList = getList(loc.pi, loc.ci !== undefined ? loc.bi : undefined, loc.ci)
    srcList.splice(src.idx, 1)
    // insertar en el destino (si es la misma lista y el destino está después, el índice baja uno)
    const sameList = loc.pi === target.pi && (loc.ci === undefined ? target.ci === undefined : (target.ci === loc.ci && target.bi === loc.bi))
    let at = target.after + 1
    if (sameList && src.idx < at) at -= 1
    const dstList = getList(target.pi, target.bi, target.ci)
    dstList.splice(Math.min(at, dstList.length), 0, block)
    next = next.map((p) => ({ ...p, blocks: [...p.blocks] }))
    onPages(next)
    setDialog(null)
    setHover(null)
  }
  const loadVersions = async () => {
    setVersionsBusy(true)
    try {
      const payload = await post('/api/quotes/manage', { op: 'versions', publicId })
      setVersions(payload.versions || [])
    } catch (e) { flash((e as Error).message) } finally { setVersionsBusy(false) }
  }
  const restoreVersion = async (id: string, when: string) => {
    if (!confirm(`¿Restaurar la versión del ${when}? El estado actual queda guardado como otra versión.`)) return
    setVersionsBusy(true)
    try {
      if (dirty) await onSave()
      await post('/api/quotes/manage', { op: 'restore', publicId, versionId: id })
      await onReload()
      setDialog(null)
      flash('Versión restaurada')
    } catch (e) { flash(`No se restauró: ${(e as Error).message}`) } finally { setVersionsBusy(false) }
  }
  const insertBlock = (target: AddTarget, fresh: Block) => {
    const list = [...listAt(target.pi, target.bi, target.ci)]
    list.splice(target.after + 1, 0, fresh)
    writeList(target.pi, target.bi, target.ci, list)
    setAddMenu(null)
    setDialog(null)
  }
  const addBlock = (target: AddTarget, type: string) => {
    if (type === 'grid') { setDialog({ kind: 'grid', target }); setAddMenu(null); return }
    if (type === 'icon') { setDialog({ kind: 'icon', target }); setAddMenu(null); return }
    if (type === 'button') { setDialog({ kind: 'button', target }); setAddMenu(null); return }
    if (type === 'ai') { setDialog({ kind: 'ai', target }); setAddMenu(null); return }
    const fresh = structuredClone(EMPTY[type] || EMPTY.p) as Block
    if (fresh.type === 'p' || fresh.type === 'lede' || fresh.type === 'h3' || fresh.type === 'note') fresh.text = fresh.text || 'Escribe aquí…'
    if (fresh.type === 'list') fresh.items = ['Primer punto']
    if (fresh.type === 'box') { fresh.title = 'Título de la caja'; fresh.body = 'Texto de la caja' }
    if (fresh.type === 'table') { fresh.headers = ['Columna 1', 'Columna 2']; fresh.rows = [['Celda', 'Celda']] }
    if (fresh.type === 'img') { fresh.url = '/assets/algoritmot-mark.svg'; fresh.caption = 'Haz clic en la imagen para reemplazarla' }
    insertBlock(target, fresh)
  }
  /** Elemento IA: se pide al asistente que cree el bloque en ese lugar exacto. */
  const askAiElement = async (target: AddTarget, kind: string, prompt: string) => {
    const page = pages[target.pi]
    const where = target.ci !== undefined && target.bi !== undefined
      ? `dentro de la cuadrícula que es el bloque ${target.bi + 1} de la página "${page.title || page.id}" (id ${page.id}), en la celda ${target.ci + 1}`
      : `en la página "${page?.title || page?.id}" (id ${page?.id}), ${target.after >= 0 ? `después del bloque ${target.after + 1}` : 'al inicio'}`
    const kinds: Record<string, string> = { text: 'un bloque de texto (p o lede)', list: 'un bloque de viñetas', table: 'una tabla', cards: 'tarjetas', image: 'una imagen (media kind generate o search)', diagram: 'un esquema (media kind diagram, SVG)', icon: 'un ícono con rótulo (icon)' }
    setDialog(null)
    setDraft('')
    const text = `Crea ${kinds[kind] || 'un bloque'} ${where}. Contenido pedido: ${prompt}`
    setMessages((prev) => [...prev, { role: 'user', text }])
    setBusy(true)
    try {
      if (dirty) await onSave()
      const payload = await post('/api/quotes/chat', { publicId, message: text, focus: { ref: `content.pages.${target.pi}`, label: `Página ${target.pi + 1}`, text: page?.title || '' } })
      setMessages((prev) => [...prev, { role: 'assistant', text: payload.reply, changes: payload.changes }])
      await onReload()
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `No se pudo crear: ${(e as Error).message}` }])
    } finally {
      setBusy(false)
      setPanelOpen(true)
    }
  }

  // ── guardar / descartar / vista previa ──
  const doSave = async () => {
    setSaving(true)
    try { await onSave(); setSaveModal(false); flash('Cambios guardados') } catch (e) { flash(`No se guardó: ${(e as Error).message}`) } finally { setSaving(false) }
  }
  const convert = async () => {
    if (!confirm('El documento pasa a componerse por páginas libres: cada sección actual se vuelve una página con bloques que puedes mover, editar y borrar. Los cambios sin guardar se guardan antes. ¿Continuar?')) return
    setConverting(true)
    try {
      if (dirty) await onSave()
      const payload = await post('/api/quotes/manage', { op: 'to-pages', publicId })
      await onReload()
      flash(`${payload.pagesCount} páginas creadas`)
    } catch (e) { flash(`No se convirtió: ${(e as Error).message}`) } finally { setConverting(false) }
  }

  // ── chat con la IA ──
  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setBusy(true)
    setMessages((prev) => [...prev, { role: 'user', text: focus ? `[${focus.label}] ${text}` : text }])
    try {
      if (dirty) await onSave()
      const payload = await post('/api/quotes/chat', { publicId, message: text, focus: focus || undefined })
      setMessages((prev) => [...prev, { role: 'assistant', text: payload.reply, changes: payload.changes }])
      await onReload()
      clearSelectedClass()
      setFocus(null)
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `No se pudo aplicar: ${(e as Error).message}` }])
    } finally {
      setBusy(false)
    }
  }

  const btn = (active: boolean) => ({
    padding: '5px 9px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? '#4f46e5' : '#cbd5e1'}`, background: active ? '#eef2ff' : '#fff', color: active ? '#3730a3' : '#475569',
  } as const)

  // ── vista previa: solo una píldora flotante ──
  if (preview) {
    return (
      <div className="qv-editor qv-editor-pill">
        <b>Vista previa</b>
        {dirty && <span className="qv-editor-dirty">cambios sin guardar</span>}
        <button onClick={() => onPreview(false)}>Volver a editar</button>
        <button className="primary" disabled={!dirty} onClick={() => setSaveModal(true)}>Guardar cambios</button>
        {saveModal && <SaveModal title={props.quoteTitle} published={props.published} saving={saving} onCancel={() => setSaveModal(false)} onConfirm={doSave} />}
      </div>
    )
  }

  const hoverBlock = hover ? blockAt(hover) : undefined
  const hoverTarget: AddTarget | null = hover
    ? (hover.ci !== undefined && hover.ii !== undefined ? { pi: hover.pi, bi: hover.bi, ci: hover.ci, after: hover.ii } : { pi: hover.pi, after: hover.bi })
    : null

  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={(e) => void replaceImage(e.target.files?.[0])} />

      {/* ── barra lateral: páginas o secciones ── */}
      {sideOpen ? (
        <aside className="qv-side">
          <div className="qv-side-head">
            <b>{isPaged ? `Páginas · ${pages.length}` : 'Secciones'}</b>
            <button onClick={() => setSideOpen(false)} title="Ocultar la barra">‹</button>
          </div>
          <div className="qv-side-actions">
            <button className="primary" disabled={!dirty || saving} onClick={() => setSaveModal(true)}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            <button onClick={() => onPreview(true)} title="Ver el documento limpio, tal como lo verá el cliente">Vista previa</button>
            <button disabled={!dirty} onClick={() => { if (confirm('¿Descartar los cambios sin guardar?')) void onDiscard() }}>Descartar</button>
            <button onClick={() => { setDialog({ kind: 'versions' }); void loadVersions() }} title="Versiones guardadas de esta cotización">Historial</button>
          </div>
          <div className={`qv-side-state${dirty ? ' is-dirty' : ''}`}>
            <span>{dirty ? '● Cambios sin guardar' : '○ Todo guardado'}{status ? ` · ${status}` : ''}</span>
            <span className="qv-side-hist">
              <button onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">↶</button>
              <button onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">↷</button>
            </span>
          </div>

          {isPaged ? (
            <>
              <ol className="qv-side-pages">
                {pageMenu === -1 && <TemplateMenu onPick={(id) => addPage(id, -1)} onClose={() => setPageMenu(null)} />}
                {pages.map((pg, pi) => (
                  <li key={pg.id}>
                    <div className="qv-side-page">
                      <button className="qv-side-title" onClick={() => scrollToPage(pg.id)} title="Ir a la página">
                        <span className="n">{pg.num || '—'}</span>
                        <span className="t">{pg.title || pg.id}{pg.tocHidden ? ' ↳' : ''}</span>
                        <span className="c">{pg.blocks.length}</span>
                      </button>
                      <div className="qv-side-ops">
                        <button onClick={() => movePage(pi, -1)} disabled={pi === 0} title="Subir">↑</button>
                        <button onClick={() => movePage(pi, 1)} disabled={pi === pages.length - 1} title="Bajar">↓</button>
                        <button onClick={() => duplicatePage(pi)} title="Duplicar">⧉</button>
                        <button onClick={() => setAddMenu({ pi, after: pg.blocks.length - 1 })} title="Agregar bloque al final">＋</button>
                        <button onClick={() => setPageMenu(pi)} title="Insertar página después">＋pág</button>
                        <button className="danger" onClick={() => removePage(pi)} title="Eliminar página">✕</button>
                      </div>
                    </div>
                    {pageMenu === pi && <TemplateMenu onPick={(id) => addPage(id, pi)} onClose={() => setPageMenu(null)} />}
                  </li>
                ))}
              </ol>
              <div className="qv-side-foot">
                <button onClick={() => setPageMenu(pages.length - 1)}>＋ Agregar página al final</button>
                <button onClick={() => setPageMenu(-1)}>＋ Al inicio</button>
              </div>
            </>
          ) : (
            <>
              <ul className="qv-side-pages">
                {LEGACY_SECTIONS.map(([id, name]) => {
                  const hidden = sections[id]?.hidden === true
                  return (
                    <li key={id}>
                      <div className="qv-side-page">
                        <button className={`qv-side-title${hidden ? ' is-hidden' : ''}`} onClick={() => document.querySelector(`[data-qsec="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                          <span className="t">{sections[id]?.title || name}</span>
                        </button>
                        <div className="qv-side-ops">
                          <button onClick={() => onSections({ ...sections, [id]: { ...(sections[id] || {}), hidden: !hidden } })} title={hidden ? 'Mostrar' : 'Ocultar'}>{hidden ? '◌' : '●'}</button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="qv-side-foot">
                <p>Este documento usa el esquema clásico: las secciones se muestran u ocultan, y sus textos se editan en el sitio. Para mover, agregar o borrar páginas y bloques, pásalo a páginas libres.</p>
                <button className="primary" disabled={converting} onClick={() => void convert()}>{converting ? 'Convirtiendo…' : 'Pasar a páginas libres'}</button>
              </div>
            </>
          )}
        </aside>
      ) : (
        <button className="qv-side-fab" onClick={() => setSideOpen(true)} title="Mostrar páginas">☰ Páginas{dirty ? ' ●' : ''}</button>
      )}

      {/* ── barra flotante sobre el bloque ── */}
      {hover && hoverBlock && hoverTarget && mode === 'edit' && (
        <div className="qv-blockbar" style={{ top: hover.top - 30, left: Math.max(8, hover.left + hover.width - 290) }}>
          <span className="qv-blockbar-type">{BLOCK_LABEL[hoverBlock.type] || hoverBlock.type}{blockPreview(hoverBlock) ? ` · ${blockPreview(hoverBlock)}` : ''}</span>
          {['lede', 'p', 'h3', 'note', 'list', 'box', 'table'].includes(hoverBlock.type) && <button onClick={() => setDialog({ kind: 'style', loc: hover })} title="Estilo: tamaño, color, peso, fondo">Aa</button>}
          {hoverBlock.type === 'grid' && <button onClick={() => setDialog({ kind: 'gridSettings', loc: hover })} title="Columnas">⚙</button>}
          {hoverBlock.type === 'icon' && <button onClick={() => setDialog({ kind: 'icon', loc: hover })} title="Cambiar ícono, tamaño o color">⚙</button>}
          {hoverBlock.type === 'button' && <button onClick={() => setDialog({ kind: 'button', loc: hover })} title="Texto, enlace y estilo">⚙</button>}
          <button onClick={() => moveBlock(hover, -1)} title="Subir">↑</button>
          <button onClick={() => moveBlock(hover, 1)} title="Bajar">↓</button>
          <button onClick={() => duplicateBlock(hover)} title="Duplicar">⧉</button>
          <button onClick={() => setDialog({ kind: 'move', loc: hover })} title="Mover a otra página, cuadrícula o celda">⇄</button>
          <button onClick={() => setAddMenu(hoverTarget)} title="Agregar bloque debajo">＋</button>
          <button className="danger" onClick={() => removeBlock(hover)} title="Eliminar">✕</button>
        </div>
      )}

      {/* ── menú de tipos de bloque ── */}
      {addMenu && (
        <div className="qv-addmenu-wrap" onClick={() => setAddMenu(null)}>
          <div className="qv-addmenu" onClick={(e) => e.stopPropagation()}>
            <div className="qv-addmenu-head">
              Agregar en «{pages[addMenu.pi]?.title || pages[addMenu.pi]?.id}»
              {addMenu.ci !== undefined ? ` · celda ${addMenu.ci + 1} de la cuadrícula` : addMenu.after >= 0 ? ` · después del bloque ${addMenu.after + 1}` : ' · al inicio'}
            </div>
            <div className="qv-addmenu-grid">
              <button className="is-ai" onClick={() => addBlock(addMenu, 'ai')}>✦ Elemento IA</button>
              {BLOCK_TYPES.filter(([type]) => !(addMenu.ci !== undefined && type === 'grid')).map(([type, label]) => (
                <button key={type} onClick={() => addBlock(addMenu, type)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {dialog?.kind === 'grid' && (
        <GridDialog onClose={() => setDialog(null)} onPick={(cols) => insertBlock(dialog.target, { type: 'grid', cols, cells: Array.from({ length: cols }, () => []) } as Block)} />
      )}
      {dialog?.kind === 'gridSettings' && (
        <GridDialog current={(blockAt(dialog.loc) as any)?.cols} onClose={() => setDialog(null)} onPick={(cols) => {
          const b = blockAt(dialog.loc) as any
          const cells: Block[][] = Array.isArray(b?.cells) ? [...b.cells] : []
          while (cells.length < cols) cells.push([])
          // al reducir columnas, los elementos de las celdas sobrantes pasan a la última
          const kept = cells.slice(0, cols)
          const extra = cells.slice(cols).flat()
          if (extra.length) kept[cols - 1] = [...kept[cols - 1], ...extra]
          updateBlock(dialog.loc, { cols, cells: kept } as Partial<Block>)
          setDialog(null)
        }} />
      )}
      {dialog?.kind === 'icon' && (
        <IconDialog
          initial={dialog.loc ? (blockAt(dialog.loc) as any) : undefined}
          onClose={() => setDialog(null)}
          onSave={(patch) => {
            if (dialog.loc) updateBlock(dialog.loc, patch as Partial<Block>)
            else if (dialog.target) insertBlock(dialog.target, { type: 'icon', size: 40, color: 'navy', label: '', ...patch } as Block)
            setDialog(null)
          }}
        />
      )}
      {dialog?.kind === 'button' && (
        <ButtonDialog
          initial={dialog.loc ? (blockAt(dialog.loc) as any) : undefined}
          onClose={() => setDialog(null)}
          onSave={(patch) => {
            if (dialog.loc) updateBlock(dialog.loc, patch as Partial<Block>)
            else if (dialog.target) insertBlock(dialog.target, { type: 'button', style: 'primary', align: 'left', ...patch } as Block)
            setDialog(null)
          }}
        />
      )}
      {dialog?.kind === 'style' && (
        <StyleDialog block={blockAt(dialog.loc) as any} onClose={() => setDialog(null)} onSave={(patch) => { updateBlock(dialog.loc, patch as Partial<Block>); setDialog(null) }} />
      )}
      {dialog?.kind === 'move' && (
        <MoveDialog pages={pages} loc={dialog.loc} onClose={() => setDialog(null)} onMove={(target) => moveTo(dialog.loc, target)} />
      )}
      {dialog?.kind === 'versions' && (
        <div className="qv-modal-wrap" onClick={() => setDialog(null)}>
          <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Historial de versiones</h3>
            <p>Cada guardado, turno de la IA o restauración deja una versión. Restaurar vuelve el documento a ese punto y guarda el actual como otra versión.</p>
            <div className="qv-versions">
              {versionsBusy && versions.length === 0 && <p>Cargando…</p>}
              {!versionsBusy && versions.length === 0 && <p>Todavía no hay versiones guardadas.</p>}
              {versions.map((v) => {
                const when = new Date(v.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                const reason: Record<string, string> = { EDITOR: 'Editor', AI: 'Asistente IA', FIELDS: 'Edición en sitio', PAGES: 'Paso a páginas', RESTORE: 'Restauración', TEMPLATE: 'Plantilla' }
                return (
                  <div className="qv-version" key={v.id}>
                    <div>
                      <b>{when}</b> · {reason[v.reason] || v.reason}{v.createdByName ? ` · ${v.createdByName}` : ''}
                      {v.label && <div className="qv-version-label">{v.label}</div>}
                    </div>
                    <button disabled={versionsBusy} onClick={() => void restoreVersion(v.id, when)}>Restaurar</button>
                  </div>
                )
              })}
            </div>
            <div className="qv-modal-actions"><button onClick={() => setDialog(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
      {dialog?.kind === 'ai' && (
        <AiDialog onClose={() => setDialog(null)} onAsk={(kind, prompt) => void askAiElement(dialog.target, kind, prompt)} />
      )}

      {saveModal && <SaveModal title={props.quoteTitle} published={props.published} saving={saving} onCancel={() => setSaveModal(false)} onConfirm={doSave} />}

      {/* ── panel de la IA ── */}
      {panelOpen ? (
        <div className="qv-editor">
          <div className="qv-editor-head">
            <b>✦ Asistente IA</b>
            <span className="qv-editor-status">{busy ? 'Aplicando…' : ''}</span>
            <button onClick={() => setPanelOpen(false)} aria-label="Minimizar">–</button>
          </div>
          <div className="qv-editor-modes">
            <button style={btn(mode === 'edit')} onClick={() => { setMode('edit'); clearSelectedClass(); setFocus(null) }} title="Edita cualquier texto en el sitio; clic en una imagen la reemplaza">Editar</button>
            <button style={btn(mode === 'select')} onClick={() => setMode('select')} title="Señala un elemento y pídele el cambio a la IA">Señalar para la IA</button>
          </div>
          <p className="qv-editor-hint">
            {mode === 'edit' && 'Escribe sobre cualquier texto. Pasa el ratón por un bloque para moverlo, duplicarlo, borrarlo o agregar otro debajo.'}
            {mode === 'select' && (focus ? 'Escribe qué cambiar en el elemento señalado.' : 'Haz clic sobre un texto o una imagen para señalarlo; la IA lo recibe como contexto.')}
          </p>
          {focus && (
            <div className="qv-editor-focus">
              <span>{focus.label}</span>
              <em>{focus.text.slice(0, 90)}{focus.text.length > 90 ? '…' : ''}</em>
              <button onClick={() => { clearSelectedClass(); setFocus(null) }} aria-label="Quitar selección">×</button>
            </div>
          )}
          <div className="qv-editor-msgs" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`qv-editor-msg ${m.role}`}>
                {m.text}
                {m.changes && m.changes.length > 0 && <div className="qv-editor-changes">{m.changes.map((c, k) => <span key={k}>{c}</span>)}</div>}
              </div>
            ))}
            {busy && <div className="qv-editor-msg assistant">Redactando y aplicando…</div>}
          </div>
          <div className="qv-editor-compose">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              placeholder={focus ? 'Qué cambiar aquí… (Enter envía)' : 'Pide un cambio, una página nueva, una imagen o un esquema… (Enter envía)'}
            />
            <button onClick={() => void send()} disabled={busy || !draft.trim()}>Enviar</button>
          </div>
          {dirty && <p className="qv-editor-hint" style={{ margin: '0 12px 10px' }}>Al enviar a la IA se guardan primero tus cambios pendientes.</p>}
        </div>
      ) : (
        <button className="qv-editor qv-editor-fab" onClick={() => setPanelOpen(true)} title="Abrir el asistente">✦ IA</button>
      )}
    </>
  )
}

function StyleDialog({ block, onSave, onClose }: { block: any; onSave: (patch: Record<string, unknown>) => void; onClose: () => void }) {
  const isTable = block?.type === 'table'
  const [size, setSize] = useState<string>(isTable ? block?.fontSize || 'md' : block?.style?.size || 'md')
  const [color, setColor] = useState<string>(block?.style?.color || '')
  const [weight, setWeight] = useState<string>(block?.style?.weight || '')
  const [bg, setBg] = useState<string>(block?.style?.bg || 'none')
  const [italic, setItalic] = useState<boolean>(block?.style?.italic === true || block?.style?.italic === 'true')
  const [upper, setUpper] = useState<boolean>(block?.style?.uppercase === true || block?.style?.uppercase === 'true')
  const [align, setAlign] = useState<string>(block?.align || 'left')
  const [marker, setMarker] = useState<string>(block?.marker || 'bullet')
  const [tableStyle, setTableStyle] = useState<string>(block?.tableStyle || 'default')
  const [firstCol, setFirstCol] = useState<string>(block?.firstCol || 'key')
  const apply = () => {
    if (isTable) { onSave({ tableStyle, fontSize: size, firstCol }); return }
    const style: Record<string, unknown> = {}
    if (size && size !== 'md') style.size = size
    if (color) style.color = color
    if (weight) style.weight = weight
    if (bg && bg !== 'none') style.bg = bg
    if (italic) style.italic = true
    if (upper) style.uppercase = true
    const patch: Record<string, unknown> = { style: Object.keys(style).length ? style : undefined, align: align === 'left' ? undefined : align }
    if (block?.type === 'list') patch.marker = marker === 'bullet' ? undefined : marker
    onSave(patch)
  }
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{isTable ? 'Estilo de la tabla' : 'Estilo del texto'}</h3>
        {isTable ? (
          <>
            <label>Apariencia</label>
            <select value={tableStyle} onChange={(e) => setTableStyle(e.target.value)}>
              <option value="default">Estándar</option><option value="striped">Filas alternadas</option><option value="minimal">Mínima (solo líneas)</option><option value="navy">Cabecera azul marino</option><option value="compact">Compacta</option>
            </select>
            <div className="row">
              <div><label>Tamaño de letra</label><select value={size} onChange={(e) => setSize(e.target.value)}><option value="xs">Muy pequeña</option><option value="sm">Pequeña</option><option value="md">Normal</option></select></div>
              <div><label>Primera columna</label><select value={firstCol} onChange={(e) => setFirstCol(e.target.value)}><option value="key">Destacada</option><option value="plain">Normal</option></select></div>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <div><label>Tamaño</label><select value={size} onChange={(e) => setSize(e.target.value)}><option value="xs">Muy pequeño</option><option value="sm">Pequeño</option><option value="md">Normal</option><option value="lg">Grande</option><option value="xl">Muy grande</option><option value="xxl">Titular</option></select></div>
              <div><label>Color</label><select value={color} onChange={(e) => setColor(e.target.value)}><option value="">Por defecto</option><option value="ink">Tinta</option><option value="navy">Azul marino</option><option value="cyan">Cian</option><option value="gold">Dorado</option><option value="muted">Gris</option><option value="white">Blanco</option></select></div>
            </div>
            <div className="row">
              <div><label>Peso</label><select value={weight} onChange={(e) => setWeight(e.target.value)}><option value="">Por defecto</option><option value="bold">Negrita</option><option value="normal">Normal</option></select></div>
              <div><label>Fondo</label><select value={bg} onChange={(e) => setBg(e.target.value)}><option value="none">Sin fondo</option><option value="soft">Suave</option><option value="cyan">Cian</option><option value="gold">Dorado</option><option value="navy">Azul marino (texto blanco)</option></select></div>
            </div>
            <div className="row">
              <div><label>Alineación</label><select value={align} onChange={(e) => setAlign(e.target.value)}><option value="left">Izquierda</option><option value="center">Centrado</option><option value="right">Derecha</option><option value="justify">Justificado</option></select></div>
              {block?.type === 'list' ? (
                <div><label>Marcador</label><select value={marker} onChange={(e) => setMarker(e.target.value)}><option value="bullet">Viñeta</option><option value="number">Numerada</option><option value="check">Chulos</option></select></div>
              ) : <div />}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}><input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} style={{ width: 'auto' }} /> Cursiva</label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} style={{ width: 'auto' }} /> Mayúsculas</label>
            </div>
          </>
        )}
        <div className="qv-modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={apply}>Aplicar</button>
        </div>
      </div>
    </div>
  )
}

function MoveDialog({ pages, loc, onMove, onClose }: { pages: Page[]; loc: Loc; onMove: (target: AddTarget) => void; onClose: () => void }) {
  const [pi, setPi] = useState(loc.pi)
  const page = pages[pi]
  const options: Array<{ key: string; label: string; target: AddTarget }> = []
  if (page) {
    options.push({ key: 'top', label: 'Nivel de página · al inicio', target: { pi, after: -1 } })
    page.blocks.forEach((b, bi) => {
      const isSelf = pi === loc.pi && loc.ci === undefined && bi === loc.bi
      if (!isSelf) options.push({ key: `b${bi}`, label: `Nivel de página · después del bloque ${bi + 1} (${BLOCK_LABEL[b.type] || b.type})`, target: { pi, after: bi } })
      if (b.type === 'grid' && !(pi === loc.pi && loc.ci === undefined && bi === loc.bi)) {
        const cells: Block[][] = (b as any).cells || []
        cells.forEach((cell, ci) => options.push({ key: `g${bi}c${ci}`, label: `Cuadrícula (bloque ${bi + 1}) · celda ${ci + 1}${cell.length ? ` · al final de ${cell.length} elemento(s)` : ' · vacía'}`, target: { pi, bi, ci, after: cell.length - 1 } }))
      }
    })
  }
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Mover elemento</h3>
        <label>Página</label>
        <select value={pi} onChange={(e) => setPi(Number(e.target.value))}>
          {pages.map((p, i) => <option key={p.id} value={i}>{p.num || '—'} · {p.title || p.id}</option>)}
        </select>
        <label>Destino</label>
        <div className="qv-versions">
          {options.map((o) => (
            <div className="qv-version" key={o.key}>
              <div>{o.label}</div>
              <button onClick={() => onMove(o.target)}>Mover aquí</button>
            </div>
          ))}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  )
}

function GridDialog({ current, onPick, onClose }: { current?: number; onPick: (cols: number) => void; onClose: () => void }) {
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{current ? 'Columnas de la cuadrícula' : 'Nueva cuadrícula'}</h3>
        <p>Elige cuántas columnas. En cada celda se agregan elementos: texto, imagen, ícono, botón, tabla…</p>
        <div className="qv-addmenu-grid">
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} className={n === current ? 'is-active' : ''} onClick={() => onPick(n)}>{n} columnas</button>
          ))}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  )
}

function IconDialog({ initial, onSave, onClose }: { initial?: { name?: string; size?: number; color?: string; label?: string; align?: string }; onSave: (patch: Record<string, unknown>) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name || 'sparkles')
  const [size, setSize] = useState(initial?.size || 40)
  const [color, setColor] = useState(initial?.color || 'navy')
  const [label, setLabel] = useState(initial?.label || '')
  const [align, setAlign] = useState(initial?.align || 'left')
  const [picking, setPicking] = useState(!initial)
  if (picking) return <IconPicker value={name} onPick={(n) => { setName(n); setPicking(false) }} onClose={() => (initial ? setPicking(false) : onClose())} />
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Ícono</h3>
        <label>Ícono</label>
        <button onClick={() => setPicking(true)} style={{ width: '100%', textAlign: 'left' }}>{name} · cambiar…</button>
        <div className="row">
          <div><label>Tamaño</label><select value={size} onChange={(e) => setSize(Number(e.target.value))}>{[24, 32, 40, 56, 72, 96, 128].map((n) => <option key={n} value={n}>{n} px</option>)}</select></div>
          <div><label>Color</label><select value={color} onChange={(e) => setColor(e.target.value)}><option value="navy">Azul marino</option><option value="cyan">Cian</option><option value="gold">Dorado</option><option value="muted">Gris</option></select></div>
        </div>
        <label>Rótulo (opcional)</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Texto junto al ícono" />
        <label>Alineación</label>
        <select value={align} onChange={(e) => setAlign(e.target.value)}><option value="left">Izquierda</option><option value="center">Centrado</option></select>
        <div className="qv-modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => onSave({ name, size, color, label, align })}>Aplicar</button>
        </div>
      </div>
    </div>
  )
}

function ButtonDialog({ initial, onSave, onClose }: { initial?: { label?: string; url?: string; style?: string; align?: string }; onSave: (patch: Record<string, unknown>) => void; onClose: () => void }) {
  const [label, setLabel] = useState(initial?.label || 'Ver más')
  const [url, setUrl] = useState(initial?.url || 'https://')
  const [style, setStyle] = useState(initial?.style || 'primary')
  const [align, setAlign] = useState(initial?.align || 'left')
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Botón con enlace</h3>
        <label>Texto</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
        <label>Enlace (https://, mailto: o tel:)</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <div className="row">
          <div><label>Estilo</label><select value={style} onChange={(e) => setStyle(e.target.value)}><option value="primary">Relleno</option><option value="outline">Contorno</option></select></div>
          <div><label>Alineación</label><select value={align} onChange={(e) => setAlign(e.target.value)}><option value="left">Izquierda</option><option value="center">Centrado</option><option value="right">Derecha</option></select></div>
        </div>
        <div className="qv-modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={!label.trim()} onClick={() => onSave({ label: label.trim(), url: url.trim(), style, align })}>Aplicar</button>
        </div>
      </div>
    </div>
  )
}

function AiDialog({ onAsk, onClose }: { onAsk: (kind: string, prompt: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState('text')
  const [prompt, setPrompt] = useState('')
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>✦ Elemento IA</h3>
        <p>La IA crea el elemento en este lugar de la página con lo que le pidas. Los cambios pendientes se guardan antes.</p>
        <label>Qué crear</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="text">Texto (párrafo o entradilla)</option>
          <option value="list">Viñetas</option>
          <option value="table">Tabla</option>
          <option value="cards">Tarjetas</option>
          <option value="icon">Ícono con rótulo</option>
          <option value="image">Imagen (buscar o generar)</option>
          <option value="diagram">Esquema (SVG)</option>
        </select>
        <label>Qué debe decir o mostrar</label>
        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej.: las cuatro fases de producción del diplomado, con una frase por fase" />
        <div className="qv-modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={!prompt.trim()} onClick={() => onAsk(kind, prompt.trim())}>Crear con IA</button>
        </div>
      </div>
    </div>
  )
}

function TemplateMenu({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div className="qv-tplmenu">
      <div className="qv-tplmenu-head">Insertar página <button onClick={onClose} aria-label="Cerrar">×</button></div>
      {TEMPLATES.map((t) => <button key={t.id} onClick={() => onPick(t.id)}>{t.label}</button>)}
    </div>
  )
}

function SaveModal({ title, published, saving, onCancel, onConfirm }: { title: string; published: boolean; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="qv-modal-wrap" onClick={onCancel}>
      <div className="qv-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Guardar cambios</h3>
        <p>Se guardan todos los cambios hechos en «{title}».{published ? ' La cotización está publicada: quien tenga el enlace verá la nueva versión de inmediato.' : ' La cotización sigue en borrador hasta que la publiques desde el builder.'}</p>
        <div className="qv-modal-actions">
          <button onClick={onCancel} disabled={saving}>Seguir editando</button>
          <button className="primary" onClick={onConfirm} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
