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

type Mode = 'select' | 'edit'
type Focus = { ref: string; label: string; text: string }
type Msg = { role: 'user' | 'assistant'; text: string; changes?: string[] }
type Hover = { pi: number; bi: number; top: number; left: number; width: number } | null

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
}

export function EditorPanel(props: EditorProps) {
  const { publicId, pages, sections, dirty, preview, onPreview, onApplyRef, onPages, onSections, onSave, onDiscard, onReload } = props
  const [mode, setMode] = useState<Mode>('edit')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [sideOpen, setSideOpen] = useState(true)
  const [hover, setHover] = useState<Hover>(null)
  const [addMenu, setAddMenu] = useState<{ pi: number; bi: number } | null>(null) // bi = -1: al inicio
  const [pageMenu, setPageMenu] = useState<number | null>(null) // insertar plantilla después de la página N (-1 al inicio)
  const [saveModal, setSaveModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgTarget = useRef<string>('')
  const hoverTimer = useRef<number>(0)
  const isPaged = pages.length > 0

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, busy])
  const flash = useCallback((text: string) => { setStatus(text); window.setTimeout(() => setStatus(''), 2500) }, [])
  const clearSelectedClass = () => document.querySelectorAll('.qv-ref-selected').forEach((el) => el.classList.remove('qv-ref-selected'))

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
      const [pi, bi] = (block.dataset.block || '').split(':').map(Number)
      const r = block.getBoundingClientRect()
      setHover((prev) => (prev && prev.pi === pi && prev.bi === bi && Math.abs(prev.top - (r.top + window.scrollY)) < 2 ? prev : { pi, bi, top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width }))
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
  const moveBlock = (pi: number, bi: number, dir: -1 | 1) => {
    const blocks = [...pages[pi].blocks]
    const j = bi + dir
    if (j < 0 || j >= blocks.length) return
    ;[blocks[bi], blocks[j]] = [blocks[j], blocks[bi]]
    setBlocks(pi, blocks)
  }
  const removeBlock = (pi: number, bi: number) => {
    const b = pages[pi].blocks[bi]
    if (!confirm(`¿Eliminar este bloque (${BLOCK_LABEL[b.type] || b.type})?`)) return
    setBlocks(pi, pages[pi].blocks.filter((_, i) => i !== bi))
    setHover(null)
  }
  const duplicateBlock = (pi: number, bi: number) => {
    const blocks = [...pages[pi].blocks]
    blocks.splice(bi + 1, 0, structuredClone(blocks[bi]))
    setBlocks(pi, blocks)
  }
  const addBlock = (pi: number, afterBi: number, type: string) => {
    const blocks = [...pages[pi].blocks]
    const fresh = structuredClone(EMPTY[type] || EMPTY.p) as Block
    if (fresh.type === 'p' || fresh.type === 'lede' || fresh.type === 'h3' || fresh.type === 'note') fresh.text = fresh.text || 'Escribe aquí…'
    if (fresh.type === 'list') fresh.items = ['Primer punto']
    if (fresh.type === 'box') { fresh.title = 'Título de la caja'; fresh.body = 'Texto de la caja' }
    if (fresh.type === 'table') { fresh.headers = ['Columna 1', 'Columna 2']; fresh.rows = [['Celda', 'Celda']] }
    if (fresh.type === 'img') { fresh.url = '/assets/algoritmot-mark.svg'; fresh.caption = 'Haz clic en la imagen para reemplazarla' }
    blocks.splice(afterBi + 1, 0, fresh)
    setBlocks(pi, blocks)
    setAddMenu(null)
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

  const hoverBlock = hover && pages[hover.pi]?.blocks[hover.bi]

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
          </div>
          <div className={`qv-side-state${dirty ? ' is-dirty' : ''}`}>{dirty ? '● Cambios sin guardar' : '○ Todo guardado'}{status ? ` · ${status}` : ''}</div>

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
                        <button onClick={() => setAddMenu({ pi, bi: pg.blocks.length - 1 })} title="Agregar bloque al final">＋</button>
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
      {hover && hoverBlock && mode === 'edit' && (
        <div className="qv-blockbar" style={{ top: hover.top - 30, left: Math.max(8, hover.left + hover.width - 250) }}>
          <span className="qv-blockbar-type">{BLOCK_LABEL[hoverBlock.type] || hoverBlock.type}{blockPreview(hoverBlock) ? ` · ${blockPreview(hoverBlock)}` : ''}</span>
          <button onClick={() => moveBlock(hover.pi, hover.bi, -1)} title="Subir">↑</button>
          <button onClick={() => moveBlock(hover.pi, hover.bi, 1)} title="Bajar">↓</button>
          <button onClick={() => duplicateBlock(hover.pi, hover.bi)} title="Duplicar">⧉</button>
          <button onClick={() => setAddMenu({ pi: hover.pi, bi: hover.bi })} title="Agregar bloque debajo">＋</button>
          <button className="danger" onClick={() => removeBlock(hover.pi, hover.bi)} title="Eliminar">✕</button>
        </div>
      )}

      {/* ── menú de tipos de bloque ── */}
      {addMenu && (
        <div className="qv-addmenu-wrap" onClick={() => setAddMenu(null)}>
          <div className="qv-addmenu" onClick={(e) => e.stopPropagation()}>
            <div className="qv-addmenu-head">Agregar bloque en «{pages[addMenu.pi]?.title || pages[addMenu.pi]?.id}»{addMenu.bi >= 0 ? ` después del bloque ${addMenu.bi + 1}` : ' al inicio'}</div>
            <div className="qv-addmenu-grid">
              {BLOCK_TYPES.map(([type, label]) => (
                <button key={type} onClick={() => addBlock(addMenu.pi, addMenu.bi, type)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
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
