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
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BLOCK_TYPES, EMPTY, type Page, type Block } from '../cotizador/PagesEditor'
import { IconPicker } from './IconPicker'
import { PAGE_TEMPLATES, templatesByCategory } from './pageTemplates'
import { useDialogs } from '../cotizador/ui/dialogs'
import { DIAGRAM_LABELS, type DiagramKind } from './DocPages'

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
  | { kind: 'items'; loc: Loc }
  | { kind: 'diagram'; target: AddTarget }
  | { kind: 'merge'; pi: number }
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
      case 'span': {
        // fragmento con estilo propio → {{clases}}texto{{/}}
        if (el.classList.contains('qs-inline')) {
          const classes = Array.from(el.classList).filter((c) => c.startsWith('qs-') && c !== 'qs-inline').map((c) => c.slice(3))
          const t = inner()
          return classes.length && t.trim() ? `{{${classes.join(' ')}}}${t}{{/}}` : t
        }
        return inner()
      }
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
  const { confirm, dialogs } = useDialogs()
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
  /** Selección de texto viva al abrir el diálogo de estilo: permite aplicar solo al fragmento. */
  const savedRange = useRef<{ range: Range; el: HTMLElement; text: string } | null>(null)
  const captureSelection = () => {
    const sel = window.getSelection()
    savedRange.current = null
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const el = (range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)?.closest('[data-ref]') as HTMLElement | null
    if (!el || el.closest('.qv-editor, .qv-side')) return
    savedRange.current = { range: range.cloneRange(), el, text: range.toString() }
  }
  /** Envuelve el fragmento seleccionado con las clases de estilo y guarda el texto del campo. */
  const applyFragmentStyle = (classes: string[]) => {
    const saved = savedRange.current
    if (!saved) return false
    const span = document.createElement('span')
    span.className = ['qs-inline', ...classes.map((c) => `qs-${c}`)].join(' ')
    try {
      saved.range.surroundContents(span)
    } catch {
      const frag = saved.range.extractContents()
      span.appendChild(frag)
      saved.range.insertNode(span)
    }
    const value = domToMarks(saved.el)
    saved.el.dataset.orig = value
    savedRange.current = null
    return onApplyRef(saved.el.dataset.ref || '', value)
  }
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
  const removePage = async (pi: number) => {
    if (!(await confirm(`¿Eliminar la página «${pages[pi].title || pages[pi].id}» con sus ${pages[pi].blocks.length} bloques?`, { title: 'Eliminar página', okLabel: 'Eliminar', danger: true }))) return
    onPages(pages.filter((_, i) => i !== pi))
  }
  const duplicatePage = (pi: number) => {
    const copy = structuredClone(pages[pi]) as Page
    copy.id = uid(`${pages[pi].id}-copia`)
    onPages([...pages.slice(0, pi + 1), copy, ...pages.slice(pi + 1)])
    scrollToPage(copy.id)
  }
  const addPage = (templateId: string, after: number) => {
    const tpl = PAGE_TEMPLATES.find((t) => t.id === templateId) ?? PAGE_TEMPLATES[PAGE_TEMPLATES.length - 1]
    const page = tpl.make(after + 2)
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
  const removeBlock = async (loc: Loc) => {
    const { list, idx, pi, bi, ci } = locate(loc)
    const b = list[idx]
    if (!b) return
    setHover(null)
    if (!(await confirm(`¿Eliminar este bloque (${BLOCK_LABEL[b.type] || b.type})?`, { title: 'Eliminar bloque', okLabel: 'Eliminar', danger: true }))) return
    writeList(pi, bi, ci, list.filter((_, i) => i !== idx))
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
  /**
   * Lleva una página entera (numeral, antetítulo, título y bloques) dentro de
   * otra página: el encabezado se vuelve un bloque de sección numerada y los
   * bloques van detrás. Así dos numerales comparten una hoja.
   */
  const mergePageInto = (pi: number, targetPi: number, after: number) => {
    if (pi === targetPi) return
    const src = pages[pi]
    const head: Block = { type: 'sechead', num: src.num || '', kicker: src.kicker || '', title: src.title || '' }
    const moved = [head, ...src.blocks]
    const next = pages.map((p) => ({ ...p, blocks: [...p.blocks] }))
    const target = next[targetPi]
    target.blocks.splice(Math.min(after + 1, target.blocks.length), 0, ...moved)
    next.splice(pi, 1)
    onPages(next)
    setDialog(null)
    scrollToPage(target.id)
  }
  /** Rango de una sección dentro de la página: desde su encabezado hasta el siguiente encabezado. */
  const sectionRange = (pi: number, bi: number) => {
    const blocks = pages[pi]?.blocks || []
    let end = bi + 1
    while (end < blocks.length && blocks[end].type !== 'sechead') end += 1
    return { start: bi, end }
  }
  /** Saca una sección numerada de la página a una página propia, justo después. */
  const splitSectionToPage = (loc: Loc) => {
    if (loc.ci !== undefined) return
    const blocks = pages[loc.pi].blocks
    const head = blocks[loc.bi] as any
    if (head?.type !== 'sechead') return
    const { start, end } = sectionRange(loc.pi, loc.bi)
    const fresh: Page = { id: uid(`${pages[loc.pi].id}-${String(head.title || 'seccion').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`), num: head.num || '', kicker: head.kicker || '', title: head.title || '', blocks: blocks.slice(start + 1, end) }
    const next = pages.map((p) => ({ ...p, blocks: [...p.blocks] }))
    next[loc.pi].blocks.splice(start, end - start)
    next.splice(loc.pi + 1, 0, fresh)
    onPages(next)
    setHover(null)
    scrollToPage(fresh.id)
  }
  /** Mueve una sección completa (encabezado y bloques) a otra lista. */
  const moveSectionTo = (loc: Loc, target: AddTarget) => {
    const { start, end } = sectionRange(loc.pi, loc.bi)
    const chunk = pages[loc.pi].blocks.slice(start, end)
    const next = pages.map((p) => ({ ...p, blocks: [...p.blocks] }))
    next[loc.pi].blocks.splice(start, end - start)
    let at = target.after + 1
    if (target.pi === loc.pi && target.ci === undefined && start < at) at -= end - start
    if (target.ci !== undefined && target.bi !== undefined) {
      const grid: any = next[target.pi].blocks[target.bi]
      grid.cells = grid.cells.map((c: Block[]) => [...c])
      grid.cells[target.ci].splice(Math.min(at, grid.cells[target.ci].length), 0, ...chunk)
    } else {
      next[target.pi].blocks.splice(Math.min(at, next[target.pi].blocks.length), 0, ...chunk)
    }
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
    if (!(await confirm(`¿Restaurar la versión del ${when}? El estado actual queda guardado como otra versión.`, { title: 'Restaurar versión', okLabel: 'Restaurar' }))) return
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
    if (type === 'diagram') { setDialog({ kind: 'diagram', target }); setAddMenu(null); return }
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
    if (!(await confirm('El documento pasa a componerse por páginas libres: cada sección actual se vuelve una página con bloques que puedes mover, editar y borrar. Los cambios sin guardar se guardan antes.', { title: 'Pasar a páginas libres', okLabel: 'Convertir' }))) return
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
        {dialogs}
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
      {dialogs}

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
            <button disabled={!dirty} onClick={() => { void confirm('¿Descartar los cambios sin guardar?', { title: 'Descartar cambios', okLabel: 'Descartar', danger: true }).then((ok) => { if (ok) void onDiscard() }) }}>Descartar</button>
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
                        <button onClick={() => setDialog({ kind: 'merge', pi })} title="Llevar esta sección completa (numeral, título y bloques) dentro de otra página">⇢</button>
                        <button className="danger" onClick={() => void removePage(pi)} title="Eliminar página">✕</button>
                      </div>
                    </div>
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

      {pageMenu !== null && <TemplateMenu onPick={(id) => addPage(id, pageMenu)} onClose={() => setPageMenu(null)} />}

      {/* ── barra flotante sobre el bloque ── */}
      {hover && hoverBlock && hoverTarget && mode === 'edit' && (
        <div className="qv-blockbar" style={{ top: hover.top - 30, left: Math.max(8, hover.left + hover.width - 290) }}>
          <span className="qv-blockbar-type">{BLOCK_LABEL[hoverBlock.type] || hoverBlock.type}{blockPreview(hoverBlock) ? ` · ${blockPreview(hoverBlock)}` : ''}</span>
          {!['img', 'toc', 'button', 'icon', 'grid'].includes(hoverBlock.type) && <button onMouseDown={(e) => { e.preventDefault(); captureSelection() }} onClick={() => setDialog({ kind: 'style', loc: hover })} title="Estilo: tamaño, color, peso, fondo · a todo el bloque o al fragmento seleccionado">Aa</button>}
          {['table', 'gantt', 'cards', 'team', 'htimeline', 'vtimeline', 'payments', 'phase', 'list', 'timeline', 'invoice', 'diagram'].includes(hoverBlock.type) && <button onClick={() => setDialog({ kind: 'items', loc: hover })} title="Agregar o quitar filas, columnas, tarjetas, miembros o hitos">⋯</button>}
          {hoverBlock.type === 'grid' && <button onClick={() => setDialog({ kind: 'gridSettings', loc: hover })} title="Columnas">⚙</button>}
          {hoverBlock.type === 'sechead' && hover.ci === undefined && <button onClick={() => splitSectionToPage(hover)} title="Separar esta sección en una página propia">⤴</button>}
          {hoverBlock.type === 'icon' && <button onClick={() => setDialog({ kind: 'icon', loc: hover })} title="Cambiar ícono, tamaño o color">⚙</button>}
          {hoverBlock.type === 'button' && <button onClick={() => setDialog({ kind: 'button', loc: hover })} title="Texto, enlace y estilo">⚙</button>}
          <button onClick={() => moveBlock(hover, -1)} title="Subir">↑</button>
          <button onClick={() => moveBlock(hover, 1)} title="Bajar">↓</button>
          <button onClick={() => duplicateBlock(hover)} title="Duplicar">⧉</button>
          <button onClick={() => setDialog({ kind: 'move', loc: hover })} title="Mover a otra página, cuadrícula o celda">⇄</button>
          <button onClick={() => setAddMenu(hoverTarget)} title="Agregar bloque debajo">＋</button>
          <button className="danger" onClick={() => void removeBlock(hover)} title="Eliminar">✕</button>
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
        <StyleDialog
          block={blockAt(dialog.loc) as any}
          selection={savedRange.current?.text || ''}
          onClose={() => { savedRange.current = null; setDialog(null) }}
          onSave={(patch) => { updateBlock(dialog.loc, patch as Partial<Block>); setDialog(null) }}
          onSaveFragment={(classes) => { if (!applyFragmentStyle(classes)) flash('No se pudo aplicar al fragmento'); setDialog(null) }}
        />
      )}
      {dialog?.kind === 'items' && (
        <ItemsDialog block={blockAt(dialog.loc) as any} onClose={() => setDialog(null)} onChange={(patch) => updateBlock(dialog.loc, patch as Partial<Block>)} />
      )}
      {dialog?.kind === 'move' && (
        <MoveDialog pages={pages} loc={dialog.loc} isSection={blockAt(dialog.loc)?.type === 'sechead' && dialog.loc.ci === undefined}
          onClose={() => setDialog(null)} onMove={(target, whole) => (whole ? moveSectionTo(dialog.loc, target) : moveTo(dialog.loc, target))} />
      )}
      {dialog?.kind === 'merge' && (
        <MergeDialog pages={pages} pi={dialog.pi} onClose={() => setDialog(null)} onMerge={(targetPi, after) => mergePageInto(dialog.pi, targetPi, after)} />
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
      {dialog?.kind === 'diagram' && (
        <DiagramDialog onClose={() => setDialog(null)} onPick={(kind) => insertBlock(dialog.target, diagramSeed(kind))} />
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

function StyleDialog({ block, selection, onSave, onSaveFragment, onClose }: { block: any; selection?: string; onSave: (patch: Record<string, unknown>) => void; onSaveFragment?: (classes: string[]) => void; onClose: () => void }) {
  const isTable = block?.type === 'table'
  const isText = ['lede', 'p', 'h3', 'note', 'list', 'box'].includes(block?.type)
  const [scope, setScope] = useState<'block' | 'fragment'>(selection ? 'fragment' : 'block')
  const [size, setSize] = useState<string>(block?.style?.size || (isTable ? block?.fontSize : '') || 'md')
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
    if (scope === 'fragment' && onSaveFragment) {
      const classes: string[] = []
      if (size && size !== 'md') classes.push(`size-${size}`)
      if (color) classes.push(`color-${color}`)
      if (weight) classes.push(`w-${weight}`)
      if (bg && bg !== 'none') classes.push(`bg-${bg}`)
      if (italic) classes.push('italic')
      if (upper) classes.push('upper')
      onSaveFragment(classes)
      return
    }
    const style: Record<string, unknown> = {}
    if (size && size !== 'md') style.size = size
    if (color) style.color = color
    if (weight) style.weight = weight
    if (bg && bg !== 'none') style.bg = bg
    if (isText && italic) style.italic = true
    if (isText && upper) style.uppercase = true
    const patch: Record<string, unknown> = { style: Object.keys(style).length ? style : undefined }
    if (isText) patch.align = align === 'left' ? undefined : align
    if (block?.type === 'list') patch.marker = marker === 'bullet' ? undefined : marker
    if (isTable) { patch.tableStyle = tableStyle; patch.firstCol = firstCol; patch.fontSize = undefined }
    onSave(patch)
  }
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{isTable ? 'Estilo de la tabla' : isText ? 'Estilo del texto' : 'Estilo del bloque'}</h3>
        {selection && (
          <div className="row" style={{ marginBottom: 6 }}>
            <button className={scope === 'fragment' ? 'is-active' : ''} onClick={() => setScope('fragment')}>Solo el fragmento «{selection.slice(0, 28)}{selection.length > 28 ? '…' : ''}»</button>
            <button className={scope === 'block' ? 'is-active' : ''} onClick={() => setScope('block')}>Todo el bloque</button>
          </div>
        )}
        {isTable && scope === 'block' && (
          <>
            <label>Apariencia de la tabla</label>
            <select value={tableStyle} onChange={(e) => setTableStyle(e.target.value)}>
              <option value="default">Estándar</option><option value="striped">Filas alternadas</option><option value="minimal">Mínima (solo líneas)</option><option value="navy">Cabecera azul marino</option><option value="compact">Compacta</option>
            </select>
            <label>Primera columna</label>
            <select value={firstCol} onChange={(e) => setFirstCol(e.target.value)}><option value="key">Destacada</option><option value="plain">Normal</option></select>
          </>
        )}
        {(!isText && scope === 'block') ? (
          <>
            <div className="row">
              <div><label>Tamaño del texto</label><select value={size} onChange={(e) => setSize(e.target.value)}><option value="xs">Muy pequeño</option><option value="sm">Pequeño</option><option value="md">Normal</option><option value="lg">Grande</option><option value="xl">Muy grande</option><option value="xxl">Titular</option></select></div>
              <div><label>Color del texto</label><select value={color} onChange={(e) => setColor(e.target.value)}><option value="">Por defecto</option><option value="ink">Tinta</option><option value="navy">Azul marino</option><option value="cyan">Cian</option><option value="gold">Dorado</option><option value="muted">Gris</option><option value="white">Blanco</option></select></div>
            </div>
            <div className="row">
              <div><label>Peso</label><select value={weight} onChange={(e) => setWeight(e.target.value)}><option value="">Por defecto</option><option value="bold">Negrita</option><option value="normal">Normal</option></select></div>
              <div><label>Fondo</label><select value={bg} onChange={(e) => setBg(e.target.value)}><option value="none">Sin fondo</option><option value="soft">Suave</option><option value="cyan">Cian</option><option value="gold">Dorado</option><option value="navy">Azul marino (texto blanco)</option></select></div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748b' }}>Aplica a todos los textos del bloque. Para un solo texto, selecciónalo en la página y vuelve a pulsar «Aa».</p>
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

/** Esquema de arranque por tipo, con contenido demo editable. */
function diagramSeed(kind: DiagramKind): Block {
  const it = (label: string, desc = '', tone: 'cyan' | 'deep' | 'gold' = 'cyan', children: string[] = []) => ({ label, desc, tone, children })
  const seeds: Record<DiagramKind, Block> = {
    process: { type: 'diagram', kind, title: 'Proceso', items: [it('Diagnóstico', 'Punto de partida'), it('Diseño', 'Qué se construye'), it('Construcción', 'En producción', 'deep'), it('Apropiación', 'Equipo formado', 'deep'), it('Mejora', 'Soporte y evolución', 'gold')] },
    cycle: { type: 'diagram', kind, title: 'Ciclo de mejora', center: 'Mejora continua', items: [it('Planear'), it('Hacer', '', 'deep'), it('Verificar', '', 'deep'), it('Actuar', '', 'gold')] },
    pyramid: { type: 'diagram', kind, title: 'Pirámide', items: [it('Visión', 'Hacia dónde vamos', 'gold'), it('Estrategia', 'Cómo llegamos', 'deep'), it('Procesos', 'Qué hacemos cada día'), it('Datos y tecnología', 'Lo que sostiene todo')] },
    matrix: { type: 'diagram', kind, title: 'Matriz de priorización', axes: { x: ['Menor esfuerzo', 'Mayor esfuerzo'], y: ['Mayor valor', 'Menor valor'] }, items: [it('Ganancias rápidas', 'Hacer primero', 'gold'), it('Apuestas mayores', 'Planear con cuidado', 'deep'), it('Relleno', 'Solo si sobra tiempo'), it('Descartar', 'No vale el esfuerzo')] },
    mindmap: { type: 'diagram', kind, title: 'Mapa mental', center: 'Transformación digital', items: [it('Personas', '', 'cyan', ['Roles', 'Competencias']), it('Procesos', '', 'deep', ['Mapeo BPMN', 'Automatización']), it('Datos', '', 'gold', ['Tableros', 'Indicadores']), it('Tecnología', '', 'cyan', ['Plataforma', 'IA'])] },
    conceptmap: { type: 'diagram', kind, title: 'Mapa conceptual', center: 'Learning Analytics', items: [it('Tablero', 'se muestra en', 'cyan', ['Dirección', 'Programa', 'Aula']), it('Indicadores', 'se define con', 'deep', ['Permanencia', 'Riesgo', 'Avance']), it('LMS', 'lee datos del', 'gold', ['Sesiones', 'Entregas'])] },
    synoptic: { type: 'diagram', kind, center: 'Producción de un curso', items: [it('Diseño', '', 'cyan', ['Ruta de aprendizaje', 'Guiones']), it('Producción', '', 'deep', ['Recursos digitales', 'Actividades']), it('Montaje', '', 'deep', ['Aula en el LMS', 'Navegación']), it('Calidad', '', 'gold', ['Rúbrica QM', 'Informe'])] },
    causeeffect: { type: 'diagram', kind, title: 'Causa y efecto', center: 'Deserción temprana', items: [it('Personas', '', 'cyan', ['Sin acompañamiento', 'Carga laboral']), it('Procesos', '', 'deep', ['Alertas tardías', 'Reportes manuales']), it('Tecnología', '', 'gold', ['Datos dispersos', 'Sin tablero']), it('Contenido', '', 'cyan', ['Actividades poco claras', 'Sin retroalimentación'])] },
  }
  return seeds[kind]
}

function DiagramDialog({ onPick, onClose }: { onPick: (kind: DiagramKind) => void; onClose: () => void }) {
  const hints: Record<DiagramKind, string> = {
    process: 'Pasos encadenados de izquierda a derecha.', cycle: 'Etapas que se repiten alrededor de un centro.', pyramid: 'Niveles apilados, de la base a la cima.', matrix: 'Cuatro cuadrantes con dos ejes.',
    mindmap: 'Idea central con ramas y subramas.', conceptmap: 'Conceptos unidos por relaciones nombradas.', synoptic: 'Tema, grupos y detalles con llaves.', causeeffect: 'Espina de pescado: causas por categoría y efecto.',
  }
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo esquema</h3>
        <p>Elige el tipo. Llega con contenido demo; los textos se editan en la página y con «⋯» se agregan o quitan elementos.</p>
        <div className="qv-addmenu-grid">
          {(Object.keys(DIAGRAM_LABELS) as DiagramKind[]).map((k) => (
            <button key={k} onClick={() => onPick(k)}><b>{DIAGRAM_LABELS[k]}</b><br /><span style={{ fontSize: 11, color: '#64748b' }}>{hints[k]}</span></button>
          ))}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  )
}

type Kid = string | { label: string; children?: Kid[] }
const kidLabel = (k: Kid) => (typeof k === 'string' ? k : k.label)
const kidKids = (k: Kid): Kid[] => (typeof k === 'string' ? [] : k.children || [])

/** Árbol de subniveles de un elemento de esquema: agregar o quitar niveles por ítem, por separado. */
function KidTree({ list, depth, onChange }: { list: Kid[]; depth: number; onChange: (next: Kid[]) => void }) {
  const setAt = (k: number, value: Kid) => onChange(list.map((c, i) => (i === k ? value : c)))
  return (
    <div className="qv-kidtree" style={{ marginLeft: depth > 1 ? 14 : 0 }}>
      {list.map((c, k) => (
        <div key={k} className="qv-kid">
          <div className="qv-kid-row">
            <span className="qv-kid-label" title={kidLabel(c)}>{'·'.repeat(depth)} {kidLabel(c).slice(0, 40) || '(sin texto)'}</span>
            {depth < 4 && <button onClick={() => setAt(k, { label: kidLabel(c), children: [...kidKids(c), 'Nuevo subnivel'] })} title="Agregar un subnivel a este ítem">＋ subnivel</button>}
            <button onClick={() => onChange(list.filter((_, i) => i !== k))} title="Quitar este ítem y sus subniveles">✕</button>
          </div>
          {kidKids(c).length > 0 && (
            <KidTree list={kidKids(c)} depth={depth + 1} onChange={(children) => setAt(k, children.length ? { label: kidLabel(c), children } : kidLabel(c))} />
          )}
        </div>
      ))}
      <button className="qv-kid-add" onClick={() => onChange([...list, depth === 1 ? 'Nuevo detalle' : 'Nuevo subnivel'])}>＋ {depth === 1 ? 'Detalle' : 'Ítem en este nivel'}</button>
    </div>
  )
}

/** Selector de índice (fila, tarjeta, hito…) para los diálogos de elementos. */
function Sel({ n, value, set, label }: { n: number; value: number; set: (v: number) => void; label: string }) {
  return (
    <select value={Math.min(value, Math.max(0, n - 1))} onChange={(e) => set(Number(e.target.value))}>
      {Array.from({ length: n }, (_, i) => <option key={i} value={i}>{label} {i + 1}</option>)}
    </select>
  )
}

/**
 * Agregar o quitar elementos de un bloque compuesto: filas y columnas de
 * tablas y cronogramas, tarjetas, miembros del equipo, hitos de las líneas de
 * tiempo, pagos, filas de fase, ítems de lista, segmentos y conceptos.
 */
function ItemsDialog({ block, onChange, onClose }: { block: any; onChange: (patch: Record<string, unknown>) => void; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const [colIdx, setColIdx] = useState(0)
  if (!block) return null
  const t = block.type
  const tone = (i: number) => (['cyan', 'deep', 'gold'] as const)[i % 3]
  let body: React.ReactNode = null
  let title = 'Elementos del bloque'

  if (t === 'table') {
    const rows: string[][] = block.rows || []
    const headers: string[] = block.headers || []
    const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1)
    title = 'Filas y columnas de la tabla'
    body = (
      <>
        <p>{rows.length} filas · {cols} columnas. Edita el texto de cada celda directamente en la página.</p>
        <div className="row">
          <button onClick={() => onChange({ rows: [...rows, Array.from({ length: cols }, () => 'Celda')] })}>＋ Fila al final</button>
          <button onClick={() => onChange({ headers: headers.length ? [...headers, `Columna ${cols + 1}`] : headers, rows: rows.map((r) => [...r, '']) })}>＋ Columna al final</button>
        </div>
        <label>Eliminar fila</label>
        <div className="row"><Sel n={rows.length} value={idx} set={setIdx} label="Fila" /><button disabled={rows.length <= 1} onClick={() => onChange({ rows: rows.filter((_, i) => i !== idx) })}>Eliminar fila</button></div>
        <label>Eliminar columna</label>
        <div className="row"><Sel n={cols} value={colIdx} set={setColIdx} label="Columna" /><button disabled={cols <= 1} onClick={() => onChange({ headers: headers.filter((_, i) => i !== colIdx), rows: rows.map((r) => r.filter((_, i) => i !== colIdx)), colAlign: Array.isArray(block.colAlign) ? block.colAlign.filter((_: unknown, i: number) => i !== colIdx) : undefined })}>Eliminar columna</button></div>
        <label>Encabezados</label>
        <div className="row">
          <button onClick={() => onChange({ headers: headers.length ? [] : Array.from({ length: cols }, (_, i) => `Columna ${i + 1}`) })}>{headers.length ? 'Quitar encabezados' : 'Agregar encabezados'}</button>
          <button onClick={() => onChange({ rows: [Array.from({ length: cols }, () => 'Celda'), ...rows] })}>＋ Fila al inicio</button>
        </div>
      </>
    )
  } else if (t === 'gantt') {
    const cols: string[] = block.cols || []
    const rows: any[] = block.rows || []
    title = 'Periodos y barras del cronograma'
    body = (
      <>
        <p>{cols.length} periodos · {rows.length} barras. Las etiquetas se editan en la página; aquí se ajustan los periodos de cada barra.</p>
        <div className="row">
          <button onClick={() => onChange({ cols: [...cols, `${cols.length + 1}`] })}>＋ Periodo</button>
          <button disabled={cols.length <= 1} onClick={() => onChange({ cols: cols.slice(0, -1), rows: rows.map((r) => ({ ...r, from: Math.min(r.from, cols.length - 1), to: Math.min(r.to, cols.length - 1) })) })}>− Último periodo</button>
        </div>
        <div className="qv-versions">
          {rows.map((r, i) => (
            <div className="qv-version" key={i} style={{ gap: 6 }}>
              <input value={r.label || ''} onChange={(e) => onChange({ rows: rows.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} style={{ flex: 1 }} />
              <input type="number" min={1} max={cols.length} value={r.from ?? 1} onChange={(e) => onChange({ rows: rows.map((x, k) => (k === i ? { ...x, from: Number(e.target.value) } : x)) })} style={{ width: 56 }} title="Desde" />
              <input type="number" min={1} max={cols.length} value={r.to ?? 1} onChange={(e) => onChange({ rows: rows.map((x, k) => (k === i ? { ...x, to: Number(e.target.value) } : x)) })} style={{ width: 56 }} title="Hasta" />
              <select value={r.tone || 'cyan'} onChange={(e) => onChange({ rows: rows.map((x, k) => (k === i ? { ...x, tone: e.target.value } : x)) })} style={{ width: 90 }}><option value="cyan">Cian</option><option value="deep">Profundo</option><option value="gold">Dorado</option></select>
              <button onClick={() => onChange({ rows: rows.filter((_, k) => k !== i) })} title="Eliminar">✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ rows: [...rows, { label: 'Nueva actividad', from: 1, to: Math.max(1, Math.min(2, cols.length)), tone: 'cyan' }] })}>＋ Barra</button>
      </>
    )
  } else if (t === 'cards') {
    const items: any[] = block.items || []
    title = 'Tarjetas'
    body = (
      <>
        <p>{items.length} tarjetas en {block.cols || 2} columnas. Los textos se editan en la página.</p>
        <div className="row">
          <button onClick={() => onChange({ items: [...items, { tag: `${String(items.length + 1).padStart(2, '0')}`, title: 'Nueva tarjeta', body: 'Texto de la tarjeta.', foot: '' }] })}>＋ Tarjeta</button>
          <select value={block.cols || 2} onChange={(e) => onChange({ cols: Number(e.target.value) })}><option value={2}>2 columnas</option><option value={3}>3 columnas</option></select>
        </div>
        <label>Eliminar tarjeta</label>
        <div className="row"><Sel n={items.length} value={idx} set={setIdx} label="Tarjeta" /><button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar</button></div>
      </>
    )
  } else if (t === 'team') {
    const items: any[] = block.items || []
    title = 'Miembros del equipo'
    body = (
      <>
        <p>{items.length} roles. Los textos se editan en la página; aquí se agregan roles y responsabilidades.</p>
        <button onClick={() => onChange({ items: [...items, { role: 'Nuevo rol', dedication: 'Dedicación', functions: ['Responsabilidad principal.'] }] })}>＋ Miembro</button>
        <label>Miembro</label>
        <div className="row"><Sel n={items.length} value={idx} set={setIdx} label="Rol" /><button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar miembro</button></div>
        <div className="row">
          <button onClick={() => onChange({ items: items.map((m, i) => (i === idx ? { ...m, functions: [...(m.functions || []), 'Nueva responsabilidad.'] } : m)) })}>＋ Responsabilidad</button>
          <button disabled={!(items[idx]?.functions?.length > 1)} onClick={() => onChange({ items: items.map((m, i) => (i === idx ? { ...m, functions: (m.functions || []).slice(0, -1) } : m)) })}>− Última responsabilidad</button>
        </div>
      </>
    )
  } else if (t === 'htimeline' || t === 'vtimeline') {
    const items: any[] = block.items || []
    title = 'Hitos de la línea de tiempo'
    body = (
      <>
        <p>{items.length} hitos. Título, fecha y descripción se editan en la página.</p>
        <div className="row">
          <button onClick={() => onChange({ items: [...items, { title: 'Nuevo hito', date: '', desc: '', tone: tone(items.length) }] })}>＋ Hito al final</button>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0, margin: 0 }}><input type="checkbox" checked={block.numbered !== false} onChange={(e) => onChange({ numbered: e.target.checked })} style={{ width: 'auto' }} /> Numerar</label>
        </div>
        <label>Hito</label>
        <div className="row"><Sel n={items.length} value={idx} set={setIdx} label="Hito" /><button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar hito</button></div>
        <div className="row">
          <button onClick={() => onChange({ items: [...items.slice(0, idx + 1), { title: 'Nuevo hito', date: '', desc: '', tone: tone(idx + 1) }, ...items.slice(idx + 1)] })}>＋ Insertar después</button>
          <select value={items[idx]?.tone || 'cyan'} onChange={(e) => onChange({ items: items.map((x, i) => (i === idx ? { ...x, tone: e.target.value } : x)) })}><option value="cyan">Cian</option><option value="deep">Profundo</option><option value="gold">Dorado</option></select>
        </div>
        <div className="row">
          <button disabled={idx === 0} onClick={() => { const n = [...items]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; onChange({ items: n }); setIdx(idx - 1) }}>↑ Subir</button>
          <button disabled={idx >= items.length - 1} onClick={() => { const n = [...items]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; onChange({ items: n }); setIdx(idx + 1) }}>↓ Bajar</button>
        </div>
      </>
    )
  } else if (t === 'payments') {
    const items: any[] = block.items || []
    title = 'Pagos'
    body = (
      <>
        <p>{items.length} pagos. Porcentaje y descripción se editan en la página.</p>
        <button onClick={() => onChange({ items: [...items, { pct: '0 %', label: 'Nuevo pago' }] })}>＋ Pago</button>
        <label>Eliminar pago</label>
        <div className="row"><Sel n={items.length} value={idx} set={setIdx} label="Pago" /><button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar</button></div>
      </>
    )
  } else if (t === 'phase') {
    const defs: any[] = block.defs || []
    title = 'Filas de la fase'
    body = (
      <>
        <p>{defs.length} filas (término y descripción).</p>
        <button onClick={() => onChange({ defs: [...defs, { term: 'Término', desc: 'Descripción.' }] })}>＋ Fila</button>
        <label>Eliminar fila</label>
        <div className="row"><Sel n={defs.length} value={idx} set={setIdx} label="Fila" /><button disabled={defs.length <= 1} onClick={() => onChange({ defs: defs.filter((_, i) => i !== idx) })}>Eliminar</button></div>
      </>
    )
  } else if (t === 'list') {
    const items: string[] = block.items || []
    title = 'Ítems de la lista'
    body = (
      <>
        <p>{items.length} ítems.</p>
        <button onClick={() => onChange({ items: [...items, 'Nuevo punto'] })}>＋ Ítem</button>
        <label>Eliminar ítem</label>
        <div className="row"><Sel n={items.length} value={idx} set={setIdx} label="Ítem" /><button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar</button></div>
      </>
    )
  } else if (t === 'timeline') {
    const segs: any[] = block.segments || []
    const marks: string[] = block.marks || []
    title = 'Segmentos e hitos de la banda'
    body = (
      <>
        <div className="row">
          <button onClick={() => onChange({ segments: [...segs, { label: `Etapa ${segs.length + 1}`, weight: 1, tone: tone(segs.length) }] })}>＋ Segmento</button>
          <button disabled={segs.length <= 1} onClick={() => onChange({ segments: segs.slice(0, -1) })}>− Último segmento</button>
        </div>
        <div className="row">
          <button onClick={() => onChange({ marks: [...marks, 'Hito'] })}>＋ Hito</button>
          <button disabled={marks.length <= 1} onClick={() => onChange({ marks: marks.slice(0, -1) })}>− Último hito</button>
        </div>
        <label>Peso del segmento (ancho proporcional)</label>
        <div className="row"><Sel n={segs.length} value={idx} set={setIdx} label="Segmento" /><input type="number" min={1} value={segs[idx]?.weight ?? 1} onChange={(e) => onChange({ segments: segs.map((x, i) => (i === idx ? { ...x, weight: Math.max(1, Number(e.target.value)) } : x)) })} /></div>
      </>
    )
  } else if (t === 'diagram') {
    const items: any[] = block.items || []
    const kinds = Object.keys(DIAGRAM_LABELS) as DiagramKind[]
    const withChildren = ['mindmap', 'conceptmap', 'synoptic', 'causeeffect'].includes(block.kind)
    title = `Elementos del esquema · ${DIAGRAM_LABELS[block.kind as DiagramKind] || block.kind}`
    body = (
      <>
        <p>{items.length} elementos. Los textos se editan en la página.</p>
        <label>Tipo de esquema</label>
        <select value={block.kind} onChange={(e) => onChange({ kind: e.target.value })}>{kinds.map((k) => <option key={k} value={k}>{DIAGRAM_LABELS[k]}</option>)}</select>
        <div className="row">
          <button disabled={block.kind === 'matrix' && items.length >= 4} onClick={() => onChange({ items: [...items, { label: 'Nuevo elemento', desc: '', tone: tone(items.length), children: withChildren ? ['Detalle'] : [] }] })}>＋ Elemento</button>
          <Sel n={items.length} value={idx} set={setIdx} label="Elemento" />
        </div>
        <div className="row">
          <button disabled={items.length <= 1} onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })}>Eliminar elemento</button>
          <select value={items[idx]?.tone || 'cyan'} onChange={(e) => onChange({ items: items.map((x, i) => (i === idx ? { ...x, tone: e.target.value } : x)) })}><option value="cyan">Cian</option><option value="deep">Profundo</option><option value="gold">Dorado</option></select>
        </div>
        {withChildren && (
          <>
            <label>Jerarquía del elemento {idx + 1} · «{String(items[idx]?.label || '').slice(0, 30)}»</label>
            <p style={{ margin: '0 0 6px', fontSize: 11.5, color: '#64748b' }}>Cada ítem puede tener sus propios subniveles (hasta cuatro). Los textos se editan en la página.</p>
            <KidTree
              list={items[idx]?.children || []}
              depth={1}
              onChange={(children) => onChange({ items: items.map((x, i) => (i === idx ? { ...x, children } : x)) })}
            />
          </>
        )}
        <div className="row">
          <button disabled={idx === 0} onClick={() => { const n = [...items]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; onChange({ items: n }); setIdx(idx - 1) }}>↑ Subir</button>
          <button disabled={idx >= items.length - 1} onClick={() => { const n = [...items]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; onChange({ items: n }); setIdx(idx + 1) }}>↓ Bajar</button>
        </div>
      </>
    )
  } else if (t === 'invoice') {
    const rows: any[] = block.rows || []
    title = 'Conceptos de la tabla de inversión'
    body = (
      <>
        <p>{rows.length ? `${rows.length} conceptos propios.` : 'Sin conceptos propios: la tabla se arma con las líneas de la cotización.'}</p>
        <button onClick={() => onChange({ rows: [...rows, { concept: 'Nuevo concepto', detail: '', amount: '$ 0' }] })}>＋ Concepto propio</button>
        {rows.length > 0 && (
          <>
            <label>Eliminar concepto</label>
            <div className="row"><Sel n={rows.length} value={idx} set={setIdx} label="Concepto" /><button onClick={() => onChange({ rows: rows.filter((_, i) => i !== idx) })}>Eliminar</button></div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body}
        <div className="qv-modal-actions"><button className="primary" onClick={onClose}>Listo</button></div>
      </div>
    </div>
  )
}

function MergeDialog({ pages, pi, onMerge, onClose }: { pages: Page[]; pi: number; onMerge: (targetPi: number, after: number) => void; onClose: () => void }) {
  const others = pages.map((p, i) => ({ p, i })).filter((x) => x.i !== pi)
  const [targetPi, setTargetPi] = useState(others[0]?.i ?? -1)
  const target = pages[targetPi]
  if (!target) return null
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Llevar la sección a otra página</h3>
        <p>«{pages[pi].num || '—'} · {pages[pi].title || pages[pi].id}» entra completa en la página elegida: su numeral, antetítulo y título se vuelven un encabezado de sección y sus {pages[pi].blocks.length} bloques van detrás. La página de origen desaparece.</p>
        <label>Página de destino</label>
        <select value={targetPi} onChange={(e) => setTargetPi(Number(e.target.value))}>
          {others.map(({ p, i }) => <option key={p.id} value={i}>{p.num || '—'} · {p.title || p.id}</option>)}
        </select>
        <label>Posición</label>
        <div className="qv-versions">
          <div className="qv-version"><div>Al inicio de la página</div><button onClick={() => onMerge(targetPi, -1)}>Mover aquí</button></div>
          {target.blocks.map((b, bi) => (
            <div className="qv-version" key={bi}><div>Después del bloque {bi + 1} ({BLOCK_LABEL[b.type] || b.type})</div><button onClick={() => onMerge(targetPi, bi)}>Mover aquí</button></div>
          ))}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  )
}

function MoveDialog({ pages, loc, isSection, onMove, onClose }: { pages: Page[]; loc: Loc; isSection?: boolean; onMove: (target: AddTarget, wholeSection: boolean) => void; onClose: () => void }) {
  const [pi, setPi] = useState(loc.pi)
  const [whole, setWhole] = useState(!!isSection)
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
        <h3>{whole ? 'Mover la sección completa' : 'Mover elemento'}</h3>
        {isSection && (
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} style={{ width: 'auto' }} /> Mover toda la sección (el encabezado y sus bloques hasta el siguiente encabezado)
          </label>
        )}
        <label>Página</label>
        <select value={pi} onChange={(e) => setPi(Number(e.target.value))}>
          {pages.map((p, i) => <option key={p.id} value={i}>{p.num || '—'} · {p.title || p.id}</option>)}
        </select>
        <label>Destino</label>
        <div className="qv-versions">
          {options.map((o) => (
            <div className="qv-version" key={o.key}>
              <div>{o.label}</div>
              <button onClick={() => onMove(o.target, whole)}>Mover aquí</button>
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

/** Banco de páginas plantilla: agrupado por momento de la propuesta, con búsqueda. */
function TemplateMenu({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const groups = templatesByCategory()
    .map((g) => ({ ...g, items: g.items.filter((t) => !term || `${t.label} ${t.description} ${t.category}`.toLowerCase().includes(term)) }))
    .filter((g) => g.items.length)
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-tplbank" onClick={(e) => e.stopPropagation()}>
        <h3>Insertar página del banco</h3>
        <p>Páginas A4 completas, con contenido demo construido sobre las propuestas de la casa. Sirven tal cual o editándolas; la IA las adapta al cliente si se lo pides.</p>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: carta, cronograma, inversión, riesgos, FAQ…" />
        <div className="qv-tplbank-list">
          {groups.map((g) => (
            <div key={g.category} className="qv-tplbank-group">
              <div className="qv-tplbank-cat">{g.category}</div>
              {g.items.map((t) => (
                <button key={t.id} onClick={() => onPick(t.id)}>
                  <b>{t.label}</b>
                  <span>{t.description}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p>Sin resultados para «{q}».</p>}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cancelar</button></div>
      </div>
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
