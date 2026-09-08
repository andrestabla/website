/**
 * Panel de edición sobre la vista del documento (solo con ?editor=1 y sesión
 * del dueño). Tres modos:
 *  - Señalar: clic en cualquier texto marcado con data-ref y la IA recibe ese
 *    elemento como contexto («cambia esto»).
 *  - Editar: los mismos textos se vuelven editables en el sitio; al salir del
 *    campo se guardan por referencia (op set-fields).
 *  - Leer: sin interferir con el documento.
 * Cada texto lleva su referencia (`content.intro`, `content.pages.2.blocks.1.text`,
 * `quote.title`…) puesta por el visor; aquí no se conoce la estructura, solo
 * se lee y se escribe por referencia.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type Mode = 'read' | 'select' | 'edit'
type Focus = { ref: string; label: string; text: string }
type Msg = { role: 'user' | 'assistant'; text: string; changes?: string[] }

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
  if (p[1] === 'cover') return `Portada · ${{ kicker: 'antetítulo', duration: 'duración', scope: 'alcance', investment: 'inversión', tagline: 'lema' }[p[2]] || p[2]}`
  if (p[1] === 'pages') {
    const page = `Página ${Number(p[2]) + 1}`
    if (p[3] === 'title') return `${page} · título`
    if (p[3] === 'kicker') return `${page} · antetítulo`
    if (p[3] === 'blocks') return `${page} · bloque ${Number(p[4]) + 1}${p[5] && p[5] !== 'text' ? ` · ${p.slice(5).join('.')}` : ''}`
    return page
  }
  const names: Record<string, string> = {
    intro: 'Carta', diagnosis: 'Diagnóstico', architecture: 'Método / arquitectura', approach: 'Enfoque', scopeNote: 'Nota de alcance',
    screens: 'Capturas', schedule: 'Cronograma', milestones: 'Hitos', investmentNote: 'Nota de inversión', paymentsNote: 'Nota de pagos',
    service: 'Servicio', teamIntro: 'Equipo · intro', team: 'Equipo', workRhythm: 'Ritmo de trabajo', assumptions: 'Supuestos',
    exclusions: 'Exclusiones', guarantees: 'Garantías', finalNote: 'Nota final', backQuote: 'Cierre', signature: 'Firma', coreNote: 'Nota del núcleo',
    timelineNote: 'Nota del plazo', paymentLabels: 'Plan de pagos',
  }
  const rest = p.slice(2).join('.')
  return `${names[p[1]] || p[1]}${rest ? ` · ${rest}` : ''}`
}

/**
 * DOM editado → texto con las marcas que entiende el visor (**·**, *·*, `·`,
 * [t](u), viñetas «- » y párrafos separados por línea en blanco).
 */
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
  return walk(root)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
}

export function EditorPanel({ publicId, onReload }: { publicId: string; onReload: () => Promise<void> | void }) {
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<Mode>('select')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<Mode>(mode)
  modeRef.current = mode
  const fileRef = useRef<HTMLInputElement>(null)
  const imgTarget = useRef<string>('')

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, busy])

  const flash = (text: string) => { setStatus(text); window.setTimeout(() => setStatus(''), 2500) }

  const clearSelectedClass = () => document.querySelectorAll('.qv-ref-selected').forEach((el) => el.classList.remove('qv-ref-selected'))

  // ── señalar: hover + clic ──
  useEffect(() => {
    document.body.classList.toggle('qv-mode-select', mode === 'select')
    document.body.classList.toggle('qv-mode-edit', mode === 'edit')
    if (mode !== 'select') return
    const onClick = (e: MouseEvent) => {
      const img = (e.target as Element).closest('[data-img-ref]') as HTMLElement | null
      const target = img || ((e.target as Element).closest('[data-ref]') as HTMLElement | null)
      if (!target || target.closest('.qv-editor')) return
      e.preventDefault()
      e.stopPropagation()
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
  }, [mode])

  // ── editar en el sitio ──
  const saveEdits = useCallback(async (fields: Array<{ ref: string; value: string }>) => {
    try {
      await post('/api/quotes/manage', { op: 'set-fields', publicId, fields })
      flash('Guardado')
      await onReload()
    } catch (e) {
      flash(`No se guardó: ${(e as Error).message}`)
    }
  }, [publicId, onReload])

  useEffect(() => {
    if (mode !== 'edit') {
      document.querySelectorAll<HTMLElement>('[data-ref][contenteditable]').forEach((el) => {
        el.removeAttribute('contenteditable')
        delete el.dataset.orig
      })
      return
    }
    const enable = () => {
      document.querySelectorAll<HTMLElement>('[data-ref]').forEach((el) => {
        if (el.closest('.qv-editor') || el.getAttribute('contenteditable') === 'true') return
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
      void saveEdits([{ ref: el.dataset.ref || '', value }])
    }
    const onKey = (e: KeyboardEvent) => {
      const el = (e.target as Element)?.closest?.('[data-ref][contenteditable]') as HTMLElement | null
      if (!el) return
      if (e.key === 'Escape') { (el as HTMLElement).blur() }
      // Enter en un campo de una sola línea guarda en vez de partir el texto
      if (e.key === 'Enter' && !e.shiftKey && /^(H1|H2|H3|H4|TD|TH|SPAN|LI|FIGCAPTION|DT|DD)$/.test(el.tagName)) { e.preventDefault(); el.blur() }
    }
    const onImgClick = (e: MouseEvent) => {
      const img = (e.target as Element).closest('[data-img-ref]') as HTMLElement | null
      if (!img || img.closest('.qv-editor')) return
      e.preventDefault()
      e.stopPropagation()
      imgTarget.current = img.dataset.imgRef || ''
      fileRef.current?.click()
    }
    document.addEventListener('click', onImgClick, true)
    document.addEventListener('focusout', onBlur)
    document.addEventListener('keydown', onKey)
    // el documento se vuelve a pintar tras cada guardado: se reactivan los campos nuevos
    const observer = new MutationObserver(() => enable())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('click', onImgClick, true)
      document.removeEventListener('focusout', onBlur)
      document.removeEventListener('keydown', onKey)
      observer.disconnect()
    }
  }, [mode, saveEdits])

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
      await saveEdits([{ ref, value: up.url }])
    } catch (e) {
      flash(`No se reemplazó: ${(e as Error).message}`)
    } finally {
      imgTarget.current = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── chat con la IA ──
  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setBusy(true)
    setMessages((prev) => [...prev, { role: 'user', text: focus ? `[${focus.label}] ${text}` : text }])
    try {
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

  if (!open) {
    return (
      <button className="qv-editor qv-editor-fab" onClick={() => setOpen(true)} title="Abrir el editor con IA">✦ Editor</button>
    )
  }

  return (
    <div className="qv-editor">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={(e) => void replaceImage(e.target.files?.[0])} />
      <div className="qv-editor-head">
        <b>✦ Editor con IA</b>
        <span className="qv-editor-status">{busy ? 'Aplicando…' : status}</span>
        <button onClick={() => setOpen(false)} aria-label="Minimizar">–</button>
      </div>
      <div className="qv-editor-modes">
        <button style={btn(mode === 'select')} onClick={() => setMode('select')} title="Haz clic en un texto del documento y pídele a la IA cambiarlo">Señalar</button>
        <button style={btn(mode === 'edit')} onClick={() => { setMode('edit'); clearSelectedClass(); setFocus(null) }} title="Edita cualquier texto en el sitio; se guarda al salir del campo">Editar texto</button>
        <button style={btn(mode === 'read')} onClick={() => setMode('read')}>Leer</button>
      </div>
      <p className="qv-editor-hint">
        {mode === 'select' && (focus ? 'Escribe qué cambiar en el elemento señalado, o señala otro.' : 'Haz clic sobre un título, párrafo, celda o pie de imagen para señalarlo.')}
        {mode === 'edit' && 'Haz clic en cualquier texto y escribe: se guarda al salir del campo. Clic en una imagen la reemplaza (se sube a R2).'}
        {mode === 'read' && 'Pide cambios generales: la IA edita cualquier parte del documento, las líneas y las imágenes.'}
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
            {m.changes && m.changes.length > 0 && (
              <div className="qv-editor-changes">{m.changes.map((c, k) => <span key={k}>{c}</span>)}</div>
            )}
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
          placeholder={focus ? 'Qué cambiar aquí… (Enter envía)' : 'Pide un cambio, una imagen o un esquema… (Enter envía)'}
        />
        <button onClick={() => void send()} disabled={busy || !draft.trim()}>Enviar</button>
      </div>
    </div>
  )
}
