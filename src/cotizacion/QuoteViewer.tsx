/**
 * Visor público de cotizaciones — /c/:publicId (+ ?d=<token de destinatario>).
 *
 * Réplica web completa de la propuesta editorial de Algoritmo T: portada,
 * carta, diagnóstico, arquitectura, capturas de la plataforma, catálogo de
 * módulos interactivo, configurador, cronograma, inversión, plan de pagos,
 * servicio, equipo, condiciones y cierre. Cada sección se muestra solo si la
 * cotización trae su contenido. Toda interacción se reporta a /api/quotes/track.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  computeTotals,
  formatMoney,
  DEFAULT_DISCOUNT_SCALE,
  type DiscountTier,
  type QuoteItem,
} from './pricing'
import { DocPageView, useFitPages, type DocPage } from './DocPages'
import { EditorPanel } from './EditorPanel'
import { applyRef } from './refs'
import './quote-viewer.css'

type PublicQuote = {
  publicId: string
  status: string
  template?: string
  templateKind?: 'MODULAR' | 'UNIDADES'
  clientName: string
  sector?: string | null
  title: string
  subtitle?: string | null
  currency: string
  content: any
  pricing: { items: QuoteItem[] }
  discountScale?: DiscountTier[] | null
  validDays: number
  publishedAt?: string | null
}

// ── Identidad del visitante (métricas) ──────────────────────────────────────
function stableId(storage: Storage, key: string) {
  let id = storage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    storage.setItem(key, id)
  }
  return id
}

/** Cola de eventos: agrupa y despacha cada pocos segundos; sendBeacon al salir. */
function useTracker(publicId: string | undefined, recipientToken: string, enabled: boolean) {
  const queue = useRef<Array<Record<string, unknown>>>([])
  const ids = useRef<{ visitorId: string; sessionId: string } | null>(null)

  if (!ids.current && typeof window !== 'undefined') {
    try {
      ids.current = {
        visitorId: stableId(window.localStorage, 'qv_visitor'),
        sessionId: stableId(window.sessionStorage, 'qv_session'),
      }
    } catch {
      ids.current = { visitorId: 'anon', sessionId: 'anon' }
    }
  }

  const flush = useCallback(
    (useBeacon = false) => {
      if (!enabled || !publicId || queue.current.length === 0) return
      const payload = JSON.stringify({
        publicId,
        recipientToken: recipientToken || undefined,
        visitorId: ids.current?.visitorId,
        sessionId: ids.current?.sessionId,
        referrer: document.referrer || undefined,
        events: queue.current.splice(0, 50),
      })
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/quotes/track', new Blob([payload], { type: 'application/json' }))
      } else {
        void fetch('/api/quotes/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => undefined)
      }
    },
    [enabled, publicId, recipientToken]
  )

  const track = useCallback(
    (event: Record<string, unknown>) => {
      if (!enabled) return
      queue.current.push(event)
      if (queue.current.length >= 12) flush()
    },
    [enabled, flush]
  )

  useEffect(() => {
    if (!enabled || !publicId) return
    const interval = window.setInterval(() => flush(), 5000)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', () => flush(true))
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onHide)
      flush(true)
    }
  }, [enabled, publicId, flush])

  return track
}

// ── Utilidades de sección ───────────────────────────────────────────────────
type SectionOverride = { kicker?: string; title?: string; hidden?: boolean }

/**
 * Cabecera de una sección del esquema clásico. `kicker` y `title` son los
 * textos por defecto; content.sections.<id> los sobreescribe y, con el editor,
 * cada uno lleva su referencia para señalarlo o editarlo en sitio.
 */
function SectionHead({ id, num, kicker, title, client, override, editor, headLeft, headRight }: {
  id: string; num: string; kicker: string; title: string; client?: string; override?: SectionOverride; editor?: boolean
  headLeft?: string; headRight?: string
}) {
  const r = (f: string) => (editor ? { 'data-ref': `content.sections.${id}.${f}` } : {})
  const lr = (k: string) => (editor ? { 'data-ref': `content.labels.${k}` } : {})
  return (
    <>
      {client && (
        <div className="qv-rhead">
          <span className="r-l" {...lr('rheadLeft')}>{headLeft || `Propuesta · ${client}`}</span>
          <span className="r-r" {...lr('rheadRight')}>{headRight || 'Algoritmo\u00a0T'}</span>
        </div>
      )}
      <div className="qv-sechead">
        <div className="sn" {...r('num')}>{(override as any)?.num || num}</div>
        <div>
          <div className="kicker" {...r('kicker')}>{override?.kicker || kicker}</div>
          <h2 {...r('title')}>{override?.title || title}</h2>
        </div>
      </div>
    </>
  )
}

function ScopeBox({ title, body, refBase }: { title?: string; body?: string; refBase?: string }) {
  if (!body) return null
  const r = (f: string) => (refBase ? { 'data-ref': `${refBase}.${f}` } : {})
  return (
    <div className="qv-scopebox">
      {title && <div className="sb-h" {...r('title')}>{title}</div>}
      <p {...r('body')}>{body}</p>
    </div>
  )
}

/** Si la etiqueta de una fila del cronograma empieza por un código de módulo apagado, la fila se atenúa. */
function rowModuleCode(label: string): string | null {
  const match = /^([A-Z]\d{2})\s*·/.exec(label)
  return match ? match[1] : null
}

// ── Componente ──────────────────────────────────────────────────────────────
export default function QuoteViewer() {
  const { publicId } = useParams<{ publicId: string }>()
  const [search] = useSearchParams()
  const recipientToken = search.get('d') || ''
  // ?editor=1: panel de edición con IA sobre el documento (requiere sesión del dueño)
  const editor = search.get('editor') === '1'

  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [quote, setQuote] = useState<PublicQuote | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [preview, setPreview] = useState(false)
  const [items, setItems] = useState<QuoteItem[]>([])
  const initialOn = useRef<Map<string, boolean>>(new Map())
  // editor: lo guardado (para saber si hay cambios) y la vista previa limpia
  const baseline = useRef<string>('')
  const [editorPreview, setEditorPreview] = useState(false)
  const snapshot = (q: PublicQuote | null, its: QuoteItem[]) =>
    JSON.stringify({ t: q?.title, s: q?.subtitle, c: q?.clientName, se: q?.sector, content: q?.content, items: its })

  const track = useTracker(publicId, recipientToken, state === 'ready' && !preview)

  // Tipografía mono de la identidad (el sitio solo carga Inter).
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!publicId) return
    try {
      const url = `/api/quotes/public?id=${encodeURIComponent(publicId)}${recipientToken ? `&d=${encodeURIComponent(recipientToken)}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        if (!silent) setState(res.status === 404 ? 'notfound' : 'error')
        return
      }
      const q: PublicQuote = payload.quote
      setQuote(q)
      setPreview(payload.preview === true)
      setRecipientName(payload.recipient?.name || '')
      const loaded: QuoteItem[] = Array.isArray(q.pricing?.items) ? q.pricing.items : []
      setItems(loaded)
      baseline.current = snapshot(q, loaded)
      if (!silent) initialOn.current = new Map(loaded.map((i) => [i.code, i.kind === 'CORE' ? true : i.on]))
      setState('ready')
    } catch {
      if (!silent) setState('error')
    }
  }, [publicId, recipientToken])

  useEffect(() => { void load() }, [load])

  // Título del documento. El SEO global del sitio (SiteSEO) escribe el suyo al
  // hidratar el CMS; se reafirma un par de veces para ganar esa carrera.
  useEffect(() => {
    if (state !== 'ready' || !quote) return
    const apply = () => { document.title = `${quote.title} · Algoritmo T` }
    apply()
    const t1 = window.setTimeout(apply, 1500)
    const t2 = window.setTimeout(apply, 4000)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [state, quote])

  // Apertura + latidos de permanencia.
  useEffect(() => {
    if (state !== 'ready' || preview) return
    track({ type: 'view' })
    const started = Date.now()
    const beat = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        track({ type: 'heartbeat', durationMs: Date.now() - started })
      }
    }, 20_000)
    return () => window.clearInterval(beat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, preview])

  // Secciones alcanzadas. `seen` vive en un ref: sobrevive al doble montaje de
  // StrictMode y evita eventos repetidos. Umbral bajo, porque una sección más
  // alta que el viewport nunca llega a tener un 35 % visible a la vez.
  const seenSections = useRef(new Set<string>())
  useEffect(() => {
    if (state !== 'ready') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-qsec')
          if (entry.isIntersecting && id && !seenSections.current.has(id)) {
            seenSections.current.add(id)
            track({ type: 'section', sectionId: id })
          }
        }
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('[data-qsec]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [state, track])

  const isService = quote?.templateKind
    ? quote.templateKind === 'UNIDADES'
    : quote?.template === 'SERVICIO' // cotizaciones anteriores al registro de plantillas
  const scale = quote?.discountScale?.length ? quote.discountScale : DEFAULT_DISCOUNT_SCALE
  const flatScale = scale.every((tier: DiscountTier) => tier.pct === 0)
  useFitPages([state, items.length, quote?.content])

  // ── editor: edición local, historial (deshacer/rehacer), guardado y descarte ──
  const dirty = !!quote && editor && snapshot(quote, items) !== baseline.current
  const history = useRef<Array<{ quote: PublicQuote; items: QuoteItem[] }>>([])
  const future = useRef<Array<{ quote: PublicQuote; items: QuoteItem[] }>>([])
  // tamaño del historial como estado: las refs no se leen durante el render
  const [hist, setHist] = useState({ undo: 0, redo: 0 })
  const syncHist = () => setHist({ undo: history.current.length, redo: future.current.length })
  const remember = useCallback(() => {
    if (!quote) return
    history.current.push({ quote, items })
    if (history.current.length > 60) history.current.shift()
    future.current = []
    syncHist()
  }, [quote, items])
  const onUndo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev || !quote) return
    future.current.push({ quote, items })
    setQuote(prev.quote); setItems(prev.items); syncHist()
  }, [quote, items])
  const onRedo = useCallback(() => {
    const next = future.current.pop()
    if (!next || !quote) return
    history.current.push({ quote, items })
    setQuote(next.quote); setItems(next.items); syncHist()
  }, [quote, items])
  const onApplyRef = useCallback((ref: string, value: string) => {
    if (!quote) return false
    const next = applyRef({ title: quote.title, subtitle: quote.subtitle ?? null, clientName: quote.clientName, sector: quote.sector ?? null, content: quote.content, items }, ref, value)
    if (!next) return false
    remember()
    setQuote({ ...quote, title: next.title, subtitle: next.subtitle, clientName: next.clientName, sector: next.sector, content: next.content })
    setItems(next.items)
    return true
  }, [quote, items, remember])
  const onPages = useCallback((pages: DocPage[]) => { remember(); setQuote((q) => (q ? { ...q, content: { ...q.content, pages } } : q)) }, [remember])
  const onSections = useCallback((sections: any) => { remember(); setQuote((q) => (q ? { ...q, content: { ...q.content, sections } } : q)) }, [remember])
  const saveDraft = useCallback(async () => {
    if (!quote) return
    const res = await fetch('/api/quotes/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'update', publicId: quote.publicId, title: quote.title, subtitle: quote.subtitle ?? '', clientName: quote.clientName, sector: quote.sector ?? '', content: quote.content, items }),
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `Error ${res.status}`)
    history.current = []; future.current = []; setHist({ undo: 0, redo: 0 })
    await load(true)
  }, [quote, items, load])

  const paymentSplit: number[] | undefined =
    Array.isArray(quote?.content?.paymentSplit) && quote.content.paymentSplit.length
      ? quote.content.paymentSplit
      : undefined
  const totals = useMemo(
    () => computeTotals(items, { scale, minWeeks: isService ? 2 : 4, paymentSplit }),
    [items, scale, isService, paymentSplit]
  )
  const currency = quote?.currency || 'COP'
  const money = useCallback((n: number) => formatMoney(n, currency), [currency])

  const toggle = (code: string) => {
    // El track va FUERA del updater: React puede ejecutar el updater dos veces
    // (StrictMode) y duplicaría el evento.
    if ((quote?.content?.modulesSelectable ?? true) === false) return
    const current = items.find((i) => i.code === code)
    if (!current || current.kind === 'CORE' || current.selectable === false) return
    track({ type: 'toggle', moduleCode: code, value: current.on ? 'off' : 'on' })
    setItems((prev) => prev.map((i) => (i.code === code && i.kind !== 'CORE' ? { ...i, on: !i.on } : i)))
  }

  const setQty = (code: string, qty: number) => {
    const clamped = Math.min(999, Math.max(1, Math.round(qty) || 1))
    const current = items.find((i) => i.code === code)
    if (!current || (current.qty ?? 1) === clamped) return
    track({ type: 'qty', moduleCode: code, value: String(clamped) })
    setItems((prev) => prev.map((i) => (i.code === code ? { ...i, qty: clamped } : i)))
  }

  const applyPreset = (name: 'sugerida' | 'completa' | 'nucleo') => {
    track({ type: 'preset', value: name })
    setItems((prev) =>
      prev.map((i) => {
        if (i.kind === 'CORE' || i.selectable === false) return i
        if (name === 'completa') return { ...i, on: true }
        if (name === 'nucleo') return { ...i, on: false }
        return { ...i, on: initialOn.current.get(i.code) ?? i.on }
      })
    )
  }

  // Antes de imprimir, toda imagen del documento debe estar descargada y
  // decodificada: si el visitante pide el PDF sin haber hecho scroll, las
  // capturas aún no cargadas saldrían en blanco. Tope de espera por si
  // alguna imagen remota no responde.
  const [printing, setPrinting] = useState(false)
  const printPdf = async () => {
    if (printing) return
    track({ type: 'pdf' })
    setPrinting(true)
    try {
      // Se espera la DESCARGA (evento load), no img.decode(): en Chromium el
      // decode() de PNG grandes ya pintados puede no resolver nunca.
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('.qv img'))
      await Promise.race([
        Promise.all(
          images.map((img) => {
            img.loading = 'eager'
            if (img.complete && img.naturalWidth > 0) return Promise.resolve()
            return new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            })
          })
        ),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ])
    } finally {
      setPrinting(false)
    }
    window.print()
  }

  if (state === 'loading') return <div className="qv-status">Cargando cotización…</div>
  if (state === 'notfound') return <div className="qv-status">Esta cotización ya no está disponible.</div>
  if (state === 'error' || !quote) return <div className="qv-status">Hubo un problema al cargar. Intenta de nuevo.</div>

  const content = quote.content || {}
  const docPages: DocPage[] = Array.isArray(content.pages) ? content.pages : []
  // Portada: lo escrito en content.cover manda sobre lo calculado.
  const cover: { kicker?: string; duration?: string; scope?: string; investment?: string; tagline?: string } = content.cover || {}
  // Con el editor activo, cada texto lleva su referencia para señalarlo o editarlo en sitio.
  const R = (ref: string) => (editor ? { 'data-ref': ref } : {})
  // Estructura del esquema clásico: títulos, antetítulos y visibilidad de cada
  // sección (content.sections.<id>) y rótulos fijos del documento (content.labels).
  const sections: Record<string, SectionOverride> = content.sections && typeof content.sections === 'object' ? content.sections : {}
  const labels: Record<string, string> = content.labels && typeof content.labels === 'object' ? content.labels : {}
  const sec = (id: string): SectionOverride => sections[id] || {}
  const show = (id: string) => sec(id).hidden !== true
  const L = (key: string, def: string) => labels[key] || def
  const lab = (key: string) => R(`content.labels.${key}`)
  const head = (id: string, num: string, kicker: string, title: string) => (
    <SectionHead id={id} client={quote.clientName} num={num} kicker={kicker} title={title} override={sec(id)} editor={editor}
      headLeft={labels.rheadLeft} headRight={labels.rheadRight} />
  )
  // imagen reemplazable en el modo edición (clic → subir a R2 → guardar la URL)
  const IMG = (ref: string) => (editor ? { 'data-img-ref': ref } : {})
  const brandLogo: string = content.brand?.logo || '/assets/algoritmot-mark.svg'
  const pageFooter = L('pageFooter', 'Algoritmo T — pág.')
  // pie de hoja editable (con el editor sustituye al pseudoelemento de CSS)
  const sfoot = editor ? <div className="qv-sfoot"><span {...lab('pageFooter')}>{pageFooter}</span> <b /></div> : null
  const selectable = content.modulesSelectable !== false
  const itemsNoun: string = content.itemsNoun || 'Módulos'
  const canMove = (i: QuoteItem) => selectable && i.kind !== 'CORE' && i.selectable !== false

  // Cotización-documento: la pieza vive en su propio HTML; aquí solo se
  // enmarca a pantalla completa para conservar la URL /c/:id y sus métricas.
  if (content.documentUrl) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff' }}>
        {preview && <span className="qv-preview-flag" style={{ position: 'absolute', top: 10, right: 12, zIndex: 2 }}>Vista previa · sin publicar</span>}
        <iframe src={content.documentUrl} title={quote.title} style={{ width: '100%', height: '100%', border: 0 }} />
      </div>
    )
  }

  const fronts: Array<{ title: string; body: string; needs: string }> = content.diagnosis?.fronts || []
  const architecture = content.architecture || {}
  const screens = content.screens || {}
  const screenItems: Array<{ url: string; caption: string; wide?: boolean }> = (screens.items || []).filter((s: any) => s?.url)
  const schedule = content.schedule || {}
  const scheduleGroups: Array<{ name: string; rows: Array<{ label: string; on: number[]; hito: number[] }> }> = schedule.groups || []
  const scheduleWeeks = Math.max(
    6,
    ...scheduleGroups.flatMap((g) => g.rows.flatMap((r) => [...(r.on || []), ...(r.hito || [])]))
  )
  const milestones: Array<{ name: string; week: string; criterion: string }> = content.milestones || []
  const team: Array<{ role: string; dedication: string; functions: string[] }> = content.team || []
  const guarantees: Array<{ concept: string; text: string }> = content.guarantees || []
  const categories = [...new Set(items.filter((i) => i.kind !== 'CORE' && (canMove(i) || i.on)).map((i) => i.category || 'Módulos'))]
  const core = items.filter((i) => i.kind === 'CORE')
  const active = items.filter((i) => i.kind !== 'CORE' && i.on)
  const offCodes = new Set(items.filter((i) => i.kind !== 'CORE' && !i.on).map((i) => i.code))
  const service = content.service || {}
  const serviceLevels: Array<{ name: string; desc: string }> = service.levels || []
  // Filas propias de la tabla de servicio (editables en el builder); sin ellas,
  // la tabla se arma con includedMonths / renewalPrice / exitPrice.
  const serviceRows: Array<{ period: string; title: string; desc?: string; value: string }> | null =
    Array.isArray(service.rows) && service.rows.length ? service.rows : null
  const signature = content.signature || {}
  // Cobranding: una propuesta presentada con un aliado lleva las dos marcas en
  // portada, cabecera corrida y contraportada. `logoLight` es la versión para
  // fondos oscuros (portada y cierre); `logoDark`, la de fondos claros.
  const cobrand: { name?: string; logoLight?: string; logoDark?: string; role?: string; url?: string } =
    content.cobrand && (content.cobrand.name || content.cobrand.logoDark || content.cobrand.logoLight)
      ? content.cobrand
      : {}
  const hasCobrand = !!(cobrand.name || cobrand.logoDark || cobrand.logoLight)
  const headLine = `Propuesta técnica y económica · Algoritmo T${hasCobrand && cobrand.name ? ` · ${cobrand.name}` : ''}`
  let sectionNumber = 0
  const nextNum = () => String(++sectionNumber).padStart(2, '0')

  return (
    <div className={`qv${docPages.length ? ' is-paged' : ''}${editor ? ' is-editor' : ''}`}>
      <div className="qv-bar">
        <span className="b-brand"><img src={brandLogo} alt="" {...IMG('content.brand.logo')} /><span {...lab('barBrand')}>{L('barBrand', 'Algoritmo\u00a0T')}</span></span>
        <div className="b-total">
          <div className="t-l"><span {...lab('barInvestment')}>{L('barInvestment', 'Inversión')}</span>{!isService && totals.moduleCount > 0 ? ` · ${totals.moduleCount} ${itemsNoun.toLowerCase()}` : ''}</div>
          <div className="t-v" {...lab('barTotal')}>{L('barTotal', money(totals.total))}</div>
        </div>
        <button className="qv-pdfbtn" onClick={() => { void printPdf() }} disabled={printing}>
          {printing ? 'Preparando…' : <span {...lab('pdfButton')}>{L('pdfButton', '↓ PDF')}</span>}
        </button>
        {content.docxUrl && (
          <a className="qv-docxbtn" href={content.docxUrl} download>↓ Word</a>
        )}
      </div>

      {/* Portada */}
      <header className="qv-cover" data-qsec="portada">
        <div className="qv-page">
          <div className="cv-top">
            <span className="brandmark">
              <b {...lab('brandName')}>{L('brandName', 'Algoritmo')}</b><img src={brandLogo} alt="Algoritmo T" {...IMG('content.brand.logo')} />
              {hasCobrand && (
                <>
                  <i className="cb-sep" aria-hidden="true" />
                  {cobrand.logoLight
                    ? <img className="cb-logo" src={cobrand.logoLight} alt={cobrand.name || 'Aliado'} {...IMG('content.cobrand.logoLight')} />
                    : <b className="cb-name" {...R('content.cobrand.name')}>{cobrand.name}</b>}
                </>
              )}
            </span>
            <span className="cv-idx" {...lab('coverIndex')}>{L('coverIndex', `PROPUESTA · ${new Date(quote.publishedAt || Date.now()).getFullYear()}`)}</span>
          </div>
          {hasCobrand && cobrand.role && <div className="cv-cobrand-role" {...R('content.cobrand.role')}>{cobrand.role}</div>}
          {preview && <span className="qv-preview-flag">Vista previa · sin publicar</span>}
          <div className="kick" {...R('content.cover.kicker')}>
            {cover.kicker || 'Propuesta técnica y económica'}
            {recipientName ? ` · preparada para ${recipientName}` : ''}
          </div>
          <h1 {...R('quote.title')}>{quote.title}</h1>
          <div className="rule" />
          {(quote.subtitle || editor) && <p className="sub" {...R('quote.subtitle')}>{quote.subtitle || ''}</p>}
          <div className="meta">
            <div className="m"><div className="ml" {...lab('coverClient')}>{L('coverClient', 'Cliente')}</div><div className="mv" {...R('quote.clientName')}>{quote.clientName}</div></div>
            <div className="m"><div className="ml" {...lab('coverDuration')}>{L('coverDuration', 'Duración')}</div><div className="mv" {...R('content.cover.duration')}>{cover.duration || `${totals.weeks} semanas desde el kickoff`}</div></div>
            <div className="m"><div className="ml" {...lab('coverScope')}>{L('coverScope', 'Alcance')}</div><div className="mv" {...R('content.cover.scope')}>{cover.scope || (isService ? `${totals.moduleCount} ${totals.moduleCount === 1 ? 'línea' : 'líneas'} de servicio · ${totals.deliverables} entregables` : totals.moduleCount > 0 ? `Núcleo + ${totals.moduleCount} ${itemsNoun.toLowerCase()} · ${totals.deliverables} entregables` : `${items.filter((i) => i.kind === 'CORE').length} componentes · ${totals.deliverables} entregables`)}</div></div>
            {/* formatMoney ya antepone "USD" en dólares; solo COP necesita el sufijo */}
            <div className="m"><div className="ml" {...lab('coverInvestment')}>{L('coverInvestment', 'Inversión')}</div><div className="mv" {...R('content.cover.investment')}>{cover.investment || <>{money(totals.total)}{currency === 'USD' ? '' : ` ${currency}`}</>}</div></div>
          </div>
          <div className="tagline" {...R('content.cover.tagline')}>{cover.tagline || <>Soluciones digitales con <b>sentido humano</b></>}</div>
        </div>
      </header>

      <main className="qv-page">
        {docPages.length > 0 ? (
          docPages.map((page, pi) => (
            <DocPageView key={page.id} page={page} client={quote.clientName}
              items={items} totals={totals} money={money} pages={docPages}
              pageIndex={editor ? pi : undefined}
              headLeft={labels.rheadLeft} headRight={labels.rheadRight} pageFooter={pageFooter}
              head={headLine} cobrand={hasCobrand ? { name: cobrand.name, logoDark: cobrand.logoDark } : undefined} />
          ))
        ) : (
        <>
        {/* Presentación */}
        {show('presentacion') && (content.intro || content.letterhead) && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="presentacion">
            {sfoot}{head('presentacion', nextNum(), 'Presentación', 'Una propuesta que se lee y se configura')}
            {content.letterhead && (
              <div className="qv-letterhead">
                {content.letterhead.date && <p className="lh-date">{content.letterhead.date}</p>}
                {content.letterhead.addressee && <p className="lh-addr">{content.letterhead.addressee}</p>}
                {content.letterhead.subject && <p className="lh-subject"><b>Asunto:</b> {content.letterhead.subject}</p>}
                {content.letterhead.salutation && <p className="lh-salutation">{content.letterhead.salutation}</p>}
              </div>
            )}
            {content.intro && <p className="qv-letter qv-drop" {...R('content.intro')}>{content.intro}</p>}
          </section>
        )}

        {/* Diagnóstico */}
        {show('diagnostico') && (content.diagnosis?.lede || fronts.length > 0) && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="diagnostico">
            {sfoot}{head('diagnostico', nextNum(), 'Diagnóstico', 'Lectura del reto')}
            {content.diagnosis?.lede && <p className="qv-lede" {...R('content.diagnosis.lede')}>{content.diagnosis.lede}</p>}
            {fronts.length > 0 && (
              <div className="qv-fronts">
                {fronts.map((front, index) => (
                  <div className="qv-front" key={index}>
                    <div className="f-n"><span {...lab('front')}>{L('front', 'Frente')}</span> {String(index + 1).padStart(2, '0')}</div>
                    <h3 {...R(`content.diagnosis.fronts.${index}.title`)}>{front.title}</h3>
                    <p {...R(`content.diagnosis.fronts.${index}.body`)}>{front.body}</p>
                    {front.needs && <div className="f-o"><span {...lab('needs')}>{L('needs', 'Necesita:')}</span> <b {...R(`content.diagnosis.fronts.${index}.needs`)}>{front.needs}</b></div>}
                  </div>
                ))}
              </div>
            )}
            <ScopeBox title={content.diagnosis?.note?.title} body={content.diagnosis?.note?.body} refBase={editor ? 'content.diagnosis.note' : undefined} />
          </section>
        )}

        {/* Arquitectura */}
        {show('arquitectura') && (architecture.lede || architecture.layers?.length) && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="arquitectura">
            {sfoot}{head('arquitectura', nextNum(), isService ? 'Método' : 'Solución', isService ? 'Cómo lo hacemos' : 'Arquitectura de la solución')}
            {architecture.lede && <p className="qv-lede" {...R('content.architecture.lede')}>{architecture.lede}</p>}
            {architecture.layers?.length > 0 && (
              <div className="qv-arch">
                {architecture.layers.map((layer: any, index: number) => (
                  <div className="ar" key={index}>
                    <div className="ar-n" {...R(`content.architecture.layers.${index}.name`)}>{layer.name}</div>
                    <div className="ar-t" {...R(`content.architecture.layers.${index}.title`)}>{layer.title}</div>
                    <div className="ar-d" {...R(`content.architecture.layers.${index}.desc`)}>{layer.desc}</div>
                  </div>
                ))}
              </div>
            )}
            {architecture.stack?.length > 0 && (
              <>
                <h3 className="qv-subtitle" {...lab('stackTitle')}>{L('stackTitle', 'Base tecnológica')}</h3>
                {architecture.stackNote && <p className="qv-compact" {...R('content.architecture.stackNote')}>{architecture.stackNote}</p>}
                <div className="qv-tablewrap">
                  <table className="qv-stack">
                    <thead><tr>{(architecture.stackHeaders?.length === 3 ? architecture.stackHeaders : ['Componente', 'Tecnología', 'Qué aporta']).map((h: string) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {architecture.stack.map((row: any, index: number) => (
                        <tr key={index}>
                          <td className="sk-c" {...R(`content.architecture.stack.${index}.component`)}>{row.component}</td>
                          <td className="sk-t" {...R(`content.architecture.stack.${index}.tech`)}>{row.tech}</td>
                          <td {...R(`content.architecture.stack.${index}.what`)}>{row.what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <ScopeBox title={architecture.ownership?.title} body={architecture.ownership?.body} refBase={editor ? 'content.architecture.ownership' : undefined} />
          </section>
        )}

        {/* Enfoque y alcance en palabras (complementa la arquitectura) */}
        {show('enfoque') && content.approach && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="enfoque">
            {sfoot}{head('enfoque', nextNum(), architecture.lede ? 'Alcance y método' : 'Solución', architecture.lede ? 'Qué comprende el trabajo' : 'Cómo lo resolvemos')}
            <p className="qv-letter" {...R('content.approach')}>{content.approach}</p>
            {content.scopeNote && <div className="qv-scopebox"><div className="sb-h" {...lab('scopeNoteTitle')}>{L('scopeNoteTitle', 'Nota de alcance')}</div><p {...R('content.scopeNote')}>{content.scopeNote}</p></div>}
          </section>
        )}

        {/* La plataforma en pantalla */}
        {show('pantallas') && screenItems.length > 0 && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="pantallas">
            {sfoot}{head('pantallas', nextNum(), 'La plataforma en pantalla', 'Así se ve funcionando')}
            {screens.intro && <p className="qv-compact" {...R('content.screens.intro')}>{screens.intro}</p>}
            <div className="qv-shots">
              {screenItems.map((shot, index) => (
                <figure className={`qv-shot${shot.wide ? ' wide' : ''}`} key={index}>
                  {/* Carga ansiosa: las capturas forman parte del documento y deben
                      estar listas aunque se imprima sin recorrer la página. */}
                  <img src={shot.url} alt={shot.caption || `Captura ${index + 1}`} loading="eager" decoding="async" {...IMG(`content.screens.items.${index}.url`)} />
                  {shot.caption && (
                    <figcaption><b>Fig. {String(index + 1).padStart(2, '0')}</b> <span {...R(`content.screens.items.${index}.caption`)}>{shot.caption}</span></figcaption>
                  )}
                </figure>
              ))}
            </div>
            {screens.note && <p className="qv-shotnote" {...R('content.screens.note')}>{screens.note}</p>}
          </section>
        )}

        {/* Núcleo + módulos */}
        {show('modulos') && (
        <section className="qv-section" data-foot={pageFooter} data-qsec="modulos">
          {sfoot}{head('modulos', nextNum(), 'Alcance configurable', isService ? 'Servicios incluidos' : 'Núcleo y catálogo de módulos')}
          {selectable && (
          <span className="qv-livehint" {...lab('livehint')}>
            {L('livehint', isService
              ? 'Interactivo · ajusta cantidades y líneas, y la propuesta se recalcula'
              : 'Interactivo · toca cada interruptor y la propuesta se recalcula')}
          </span>
          )}

          {core.map((item) => (
            <article className="qv-mod core" key={item.code} style={{ marginBottom: 10 }}>
              <div className="md-top">
                <span className="md-c">{item.code}</span>
                <span className="qv-sw lock"><span className="tr" /><span className="lb" {...lab('alwaysIncluded')}>{L('alwaysIncluded', 'Siempre incluido')}</span></span>
              </div>
              <h3 {...R(`item.${item.code}.name`)}>{item.name}</h3>
              <p {...R(`item.${item.code}.summary`)}>{item.summary}</p>
              {Array.isArray((item.detail as any)?.entregables) && (item.detail as any).entregables.length > 0 && (
                <ul className="qv-deliv">
                  {(item.detail as any).entregables.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              )}
              <div className="md-f">
                <span className="md-e"><span {...R(`item.${item.code}.deliverables`)}>{item.deliverables}</span> <span {...lab('deliverablesWord')}>{L('deliverablesWord', 'entregables')}</span></span>
                <span className="md-p" {...R(`item.${item.code}.price`)}>{money(item.price)}</span>
              </div>
            </article>
          ))}
          {content.coreNote?.body && <ScopeBox title={content.coreNote.title} body={content.coreNote.body} refBase={editor ? 'content.coreNote' : undefined} />}

          {categories.map((category) => (
            <div key={category}>
              <div className="qv-cat-label"><span {...R('content.itemsNoun')}>{itemsNoun}</span> · {category}</div>
              <div className="qv-mods">
                {items
                  .filter((i) => i.kind !== 'CORE' && (i.category || 'Módulos') === category && (canMove(i) || i.on))
                  .map((item) => (
                    <article className={`qv-mod${item.on ? '' : ' is-off'}`} key={item.code}>
                      <div className="md-top">
                        <span className="md-c">{item.code}</span>
                        {canMove(item) ? (
                          <label className="qv-sw">
                            <input type="checkbox" checked={item.on} onChange={() => toggle(item.code)} />
                            <span className="tr" />
                            <span className="lb">{item.on ? L('includedLabel', 'Incluido') : L('excludedLabel', 'Excluido')}</span>
                          </label>
                        ) : (
                          <span className="qv-sw"><span className="lb" {...lab('includedLabel')}>{L('includedLabel', 'Incluido')}</span></span>
                        )}
                      </div>
                      <h3 {...R(`item.${item.code}.name`)}>{item.name}</h3>
                      <p {...R(`item.${item.code}.summary`)}>{item.summary}</p>
                      {canMove(item) && item.unit && item.on && (
                        <div className="qv-qty">
                          <span className="q-l"><span {...lab('qtyLabel')}>{L('qtyLabel', 'Cantidad de')}</span> <span {...R(`item.${item.code}.unit`)}>{item.unit}</span>s</span>
                          <button onClick={() => setQty(item.code, (item.qty ?? 1) - 1)} aria-label="Menos">−</button>
                          <input
                            type="number" min={1} max={999} value={item.qty ?? 1}
                            onChange={(e) => setQty(item.code, Number(e.target.value))}
                          />
                          <button onClick={() => setQty(item.code, (item.qty ?? 1) + 1)} aria-label="Más">+</button>
                        </div>
                      )}
                      <div className="md-f">
                        <span className="md-e"><span {...R(`item.${item.code}.deliverables`)}>{item.deliverables}</span> <span {...lab('deliverablesWord')}>{L('deliverablesWord', 'entregables')}</span>{item.unit ? ` por ${item.unit}` : ''}</span>
                        <span className="md-p">
                          {(item.qty ?? 1) > 1 ? `${item.qty} × ` : ''}<span {...R(`item.${item.code}.price`)}>{money(item.price)}</span>{item.unit ? ` / ${item.unit}` : ''}
                        </span>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}

          {selectable && (
          <div className="qv-presets">
            <span className="pr-l" {...lab('presets')}>{L('presets', 'Escenarios')}</span>
            <button onClick={() => applyPreset('sugerida')} {...lab('presetSuggested')}>{L('presetSuggested', 'Configuración sugerida')}</button>
            <button onClick={() => applyPreset('completa')} {...lab('presetFull')}>{L('presetFull', 'Plataforma completa')}</button>
            <button onClick={() => applyPreset('nucleo')} {...lab('presetCore')}>{L('presetCore', 'Solo núcleo')}</button>
          </div>
          )}
        </section>
        )}

        {/* Configurador */}
        {show('configurador') && (
        <section className="qv-section" data-foot={pageFooter} data-qsec="configurador">
          {sfoot}{head('configurador', nextNum(), 'Alcance elegido', 'Configurador de alcance')}
          <div className="qv-cfg">
            <div className="qv-cfg-sum">
              <div className="cs-h"><span {...lab('cfgCurrent')}>{L('cfgCurrent', 'Configuración actual')}</span> · <span {...lab('cfgCount')}>{L('cfgCount', `${totals.moduleCount} de ${items.filter((i) => i.kind !== 'CORE').length} ${itemsNoun.toLowerCase()}`)}</span></div>
              <ul className="qv-cfg-list">
                {core.map((item) => (
                  <li className="core" key={item.code}><span>{item.name} · <span {...lab('mandatoryWord')}>{L('mandatoryWord', 'obligatorio')}</span></span><span className="cl-v">{money(item.price)}</span></li>
                ))}
                {active.length === 0 && <li className="cl-empty">Sin {itemsNoun.toLowerCase()} adicionales seleccionados.</li>}
                {active.map((item) => (
                  <li key={item.code}>
                    <span>{item.code} · <span {...R(`item.${item.code}.name`)}>{item.name}</span>{(item.qty ?? 1) > 1 ? <> × <span {...R(`item.${item.code}.qty`)}>{item.qty}</span></> : ''}</span>
                    <span className="cl-v">{money(item.price * (item.qty ?? 1))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="qv-cfg-tot">
                <div className="ct-k" {...lab('cfgResult')}>{L('cfgResult', 'Inversión resultante')}</div>
                {core.length > 0 && <div className="ct-row"><span {...lab('coreRow')}>{L('coreRow', 'Núcleo de la plataforma')}</span><b>{money(totals.core)}</b></div>}
                <div className="ct-row"><span {...lab('modulesRow')}>{L('modulesRow', `${itemsNoun} seleccionados`)}</span><b {...lab('cfgModulesAmount')}>{L('cfgModulesAmount', money(totals.modules))}</b></div>
                {!flatScale && <div className="ct-row dto"><span>Economía de escala {totals.discountPct}%</span><b>{totals.discount ? `− ${money(totals.discount)}` : '—'}</b></div>}
                <div className="ct-big">
                  <div className="cb-l"><span {...lab('totalLabel')}>{L('totalLabel', 'Inversión total')}</span> · {currency}</div>
                  <div className="cb-v" {...lab('cfgTotalAmount')}>{L('cfgTotalAmount', money(totals.total))}</div>
                  {service.includedMonths ? (
                    <div className="cb-s" {...lab('cfgIncludes')}>{L('cfgIncludes', `Incluye ${service.includedMonths} meses de infraestructura y soporte de niveles 2, 3 y 4`)}</div>
                  ) : null}
                </div>
              </div>
              <div className="qv-cfg-meta">
                <div><div className="cm-l" {...lab('cmModules')}>{L('cmModules', itemsNoun)}</div><div className="cm-v" {...lab('cmModulesValue')}>{L('cmModulesValue', String(totals.moduleCount))}</div></div>
                <div><div className="cm-l" {...lab('cmDeliverables')}>{L('cmDeliverables', 'Entregables')}</div><div className="cm-v" {...lab('cmDeliverablesValue')}>{L('cmDeliverablesValue', String(totals.deliverables))}</div></div>
                <div><div className="cm-l" {...lab('cmWeeks')}>{L('cmWeeks', 'Semanas')}</div><div className="cm-v" {...lab('cmWeeksValue')}>{L('cmWeeksValue', String(totals.weeks))}</div></div>
              </div>
            </div>
          </div>

          {!flatScale && <div className="qv-escala">
            {scale.map((tier, index) => {
              const from = index === 0 ? 0 : scale[index - 1].upTo + 1
              const label = tier.upTo >= 90
                ? `${from}+ módulos`
                : index === 0
                  ? `Hasta ${tier.upTo} módulos`
                  : `${from}–${tier.upTo} módulos`
              return (
                <span key={index} className={tier.pct === totals.discountPct ? 'base' : ''}>
                  {label} · <b>{tier.pct === 0 ? 'sin descuento' : `${tier.pct}%`}</b>
                </span>
              )
            })}
          </div>}
          {content.timelineNote && <div className="qv-scopebox"><div className="sb-h" {...lab('timelineNoteTitle')}>{L('timelineNoteTitle', 'Cómo leer el plazo')}</div><p {...R('content.timelineNote')}>{content.timelineNote}</p></div>}
        </section>
        )}

        {/* Cronograma */}
        {show('cronograma') && scheduleGroups.length > 0 && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="cronograma">
            {sfoot}{head('cronograma', nextNum(), 'Tiempos', 'Cronograma de ejecución')}
            {schedule.intro && <p className="qv-compact" {...R('content.schedule.intro')}>{schedule.intro}</p>}
            <div className="qv-tablewrap">
              <table className="qv-crono">
                <thead>
                  <tr>
                    <th {...lab('activity')}>{L('activity', 'Actividad')}</th>
                    {Array.from({ length: scheduleWeeks }, (_, i) => <th key={i}>{i === 0 ? <><span {...lab('weekPrefix')}>{L('weekPrefix', 'S')}</span>1</> : `${L('weekPrefix', 'S')}${i + 1}`}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {scheduleGroups.map((group, gi) => {
                    return [
                      <tr className="grp" key={`g-${gi}`}><td colSpan={scheduleWeeks + 1} {...R(`content.schedule.groups.${gi}.name`)}>{group.name}</td></tr>,
                      ...group.rows.map((row, ri) => {
                        const code = rowModuleCode(row.label)
                        const off = code ? offCodes.has(code) : false
                        return (
                          <tr key={`g-${gi}-r-${ri}`} className={off ? 'off' : ''}>
                            <td {...R(`content.schedule.groups.${gi}.rows.${ri}.label`)}>{row.label}</td>
                            {Array.from({ length: scheduleWeeks }, (_, w) => {
                              const week = w + 1
                              const cls = row.hito?.includes(week) ? 'gbar hito' : row.on?.includes(week) ? 'gbar on' : 'gbar'
                              return <td key={w}><div className={cls} /></td>
                            })}
                          </tr>
                        )
                      }),
                    ]
                  })}
                </tbody>
              </table>
            </div>
            <div className="qv-crono-legend">
              <span><i className="on" /> <span {...lab('legendOn')}>{L('legendOn', 'Construcción y pruebas')}</span></span>
              <span><i className="hito" /> <span {...lab('legendHito')}>{L('legendHito', 'Entrega y aprobación')}</span></span>
              {schedule.legend && <span className="txt" {...R('content.schedule.legend')}>{schedule.legend}</span>}
            </div>
          </section>
        )}

        {/* Inversión */}
        {show('inversion') && (
        <section className="qv-section" data-foot={pageFooter} data-qsec="inversion">
          {sfoot}{head('inversion', nextNum(), 'Inversión', 'Propuesta económica')}
          <p className="qv-compact" {...lab('investmentIntro')}>
            {L('investmentIntro', `Valores en ${currency === 'USD' ? 'dólares estadounidenses' : 'pesos colombianos'}.${selectable ? ` Las líneas atenuadas corresponden a ${itemsNoun.toLowerCase()} desactivados, que quedan fuera del total.` : ''}`)}
          </p>
          <div className="qv-tablewrap">
            <table className="qv-inv">
              <thead><tr><th {...lab('invComponent')}>{L('invComponent', 'Componente')}</th><th {...lab('invDeliverables')}>{L('invDeliverables', 'Entregables')}</th><th><span {...lab('invInvestment')}>{L('invInvestment', 'Inversión')}</span> ({currency})</th></tr></thead>
              <tbody>
                {core.map((item) => (
                  <tr key={item.code}>
                    <td className="ci" {...R(`item.${item.code}.name`)}>{item.name}</td>
                    <td className="cn" {...R(`item.${item.code}.deliverables`)}>{item.deliverables}</td>
                    <td className="cv" {...R(`item.${item.code}.price`)}>{money(item.price)}</td>
                  </tr>
                ))}
                {categories.map((category) => [
                  <tr className="grp" key={`c-${category}`}><td colSpan={3}>{itemsNoun} · {category}</td></tr>,
                  ...items
                    .filter((i) => i.kind !== 'CORE' && (i.category || 'Módulos') === category)
                    .map((item) => (
                      <tr key={item.code} className={item.on ? '' : 'off'}>
                        <td className="ci">{item.code} · <span {...R(`item.${item.code}.name`)}>{item.name}</span>{(item.qty ?? 1) > 1 ? <> × <span {...R(`item.${item.code}.qty`)}>{item.qty}</span></> : ''}</td>
                        <td className="cn">{(item.deliverables ?? 0) * (item.qty ?? 1)}</td>
                        <td className="cv">{(item.qty ?? 1) > 1 ? money(item.price * (item.qty ?? 1)) : <span {...R(`item.${item.code}.price`)}>{money(item.price)}</span>}</td>
                      </tr>
                    )),
                ])}
                <tr className="sub">
                  <td {...lab('subtotalRow')}>{L('subtotalRow', core.length ? `Subtotal · núcleo + ${itemsNoun.toLowerCase()} activos` : `Subtotal · ${itemsNoun.toLowerCase()} activos`)}</td>
                  <td className="cn">{totals.deliverables}</td>
                  <td className="cv">{money(totals.subtotal)}</td>
                </tr>
                {!flatScale && (
                <tr className="dto">
                  <td {...lab('discountRow')}>{L('discountRow', `Economía de escala · ${totals.discountPct}% sobre ${itemsNoun.toLowerCase()}`)}</td>
                  <td />
                  <td className="cv">{totals.discount ? `− ${money(totals.discount)}` : '—'}</td>
                </tr>
                )}
                <tr className="tot">
                  <td className="lab" {...lab('totalLabel')}>{L('totalLabel', 'Inversión total')}</td>
                  <td className="cn" {...lab('invTotalCount')}>{L('invTotalCount', `${totals.moduleCount} ${itemsNoun.toLowerCase()}`)}</td>
                  <td><span className="big" {...lab('invTotalAmount')}>{L('invTotalAmount', money(totals.total))}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {content.investmentNote && <p className="qv-note" {...R('content.investmentNote')}>{content.investmentNote}</p>}
        </section>
        )}

        {/* Plan de pagos */}
        {show('pagos') && (
        <section className="qv-section" data-foot={pageFooter} data-qsec="pagos">
          {sfoot}{head('pagos', nextNum(), 'Condiciones', 'Plan de pagos e hitos')}
          <div className="qv-tablewrap">
            <table className="qv-table">
              <thead><tr><th {...lab('payMoment')}>{L('payMoment', 'Momento')}</th><th {...lab('payMilestone')}>{L('payMilestone', 'Hito habilitante')}</th><th>%</th><th><span {...lab('payValue')}>{L('payValue', 'Valor')}</span> ({currency})</th></tr></thead>
              <tbody>
                {totals.payments.map((payment, index) => {
                  // content.paymentLabels acompaña a content.paymentSplit: una
                  // entrada { moment, milestone } por pago, en el mismo orden.
                  const custom: Array<{ moment?: string; milestone?: string }> = Array.isArray(content.paymentLabels)
                    ? content.paymentLabels
                    : []
                  const labels = [
                    ['A la firma', 'Kickoff y arranque: contrato firmado, accesos entregados e infraestructura provisionada'],
                    ['Hito 01', 'Núcleo en producción: el equipo del cliente ya entra y navega con sus usuarios'],
                    ['Hito 02', 'Módulos de operación entregados y probados con datos reales'],
                    ['Hito 03', 'Puesta en marcha: datos migrados, pruebas aprobadas y equipo capacitado'],
                  ]
                  const fallback = labels[index] || [`Pago ${index + 1}`, '']
                  const moment = custom[index]?.moment || fallback[0]
                  const description = custom[index]?.milestone || fallback[1]
                  return (
                    <tr key={index}>
                      <td className="t-m" {...R(`content.paymentLabels.${index}.moment`)}>{moment}</td>
                      <td className="t-h" {...R(`content.paymentLabels.${index}.milestone`)}>{description}</td>
                      <td className="t-m" {...lab(`payPct${index}`)}>{L(`payPct${index}`, `${payment.pct}%`)}</td>
                      <td className="t-v" {...lab(`payAmount${index}`)}>{L(`payAmount${index}`, money(payment.amount))}</td>
                    </tr>
                  )
                })}
                <tr className="tot"><td className="lab" colSpan={2} {...lab('totalLabel')}>{L('totalLabel', 'Inversión total')}</td><td className="t-m">100%</td><td className="t-v" {...lab('payTotalAmount')}>{L('payTotalAmount', money(totals.total))}</td></tr>
              </tbody>
            </table>
          </div>
          {milestones.length > 0 && (
            <>
              <h3 className="qv-subtitle" {...lab('milestonesTitle')}>{L('milestonesTitle', 'Qué se aprueba en cada hito')}</h3>
              <div className="qv-tablewrap">
                <table className="qv-table">
                  <thead><tr><th {...lab('msHito')}>{L('msHito', 'Hito')}</th><th {...lab('msWeek')}>{L('msWeek', 'Semana')}</th><th style={{ textAlign: 'left' }} {...lab('msCriterion')}>{L('msCriterion', 'Criterio de aprobación')}</th></tr></thead>
                  <tbody>
                    {milestones.map((m, i) => (
                      <tr key={i}>
                        <td className="t-m" {...R(`content.milestones.${i}.name`)}>{m.name}</td>
                        <td className="t-m" {...R(`content.milestones.${i}.week`)}>{m.week}</td>
                        <td className="t-h" style={{ textAlign: 'left', fontWeight: 400 }} {...R(`content.milestones.${i}.criterion`)}>{m.criterion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {content.paymentsNote && <p className="qv-note" {...R('content.paymentsNote')}>{content.paymentsNote}</p>}
        </section>
        )}

        {/* Servicio */}
        {show('servicio') && (service.includedMonths || serviceRows) ? (
          <section className="qv-section" data-foot={pageFooter} data-qsec="servicio">
            {sfoot}{head('servicio', nextNum(), 'Después de la entrega', 'Servicio, soporte y renovación')}
            <div className="qv-tablewrap">
              <table className="qv-table">
                <thead><tr><th {...lab('svcPeriod')}>{L('svcPeriod', 'Periodo')}</th><th {...lab('svcCovers')}>{L('svcCovers', 'Qué cubre')}</th><th {...lab('svcValue')}>{L('svcValue', 'Valor')}</th></tr></thead>
                <tbody>
                  {serviceRows ? (
                    serviceRows.map((row, i) => (
                      <tr key={i}>
                        <td className="t-m" {...R(`content.service.rows.${i}.period`)}>{row.period}</td>
                        <td className="t-h"><span {...R(`content.service.rows.${i}.title`)}>{row.title}</span>{row.desc ? <span {...R(`content.service.rows.${i}.desc`)}>{row.desc}</span> : null}</td>
                        <td className="t-v" style={/^incluido$/i.test(row.value.trim()) ? { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' } : undefined}>
                          {row.value}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="t-m" {...lab('svcIncludedPeriod')}>{L('svcIncludedPeriod', `Meses 1–${service.includedMonths}`)}</td>
                        <td className="t-h"><span {...lab('svcIncludedTitle')}>{L('svcIncludedTitle', 'Infraestructura y soporte 2, 3 y 4')}</span><span {...lab('svcIncludedDesc')}>{L('svcIncludedDesc', 'Aplicación, base de datos, almacenamiento y servicios de IA, con monitoreo, respaldos y atención de incidentes.')}</span></td>
                        <td className="t-v" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }} {...lab('svcIncludedValue')}>{L('svcIncludedValue', 'Incluido')}</td>
                      </tr>
                      {service.renewalPrice ? (
                        <tr>
                          <td className="t-m" {...lab('svcRenewalPeriod')}>{L('svcRenewalPeriod', `Mes ${service.includedMonths + 1} en adelante`)}</td>
                          <td className="t-h"><span {...lab('svcRenewalTitle')}>{L('svcRenewalTitle', 'Renovación anual del servicio')}</span><span {...lab('svcRenewalDesc')}>{L('svcRenewalDesc', 'Mismo alcance del primer año, con mantenimiento evolutivo menor y ajuste anual por IPC.')}</span></td>
                          <td className="t-v" {...lab('svcRenewalValue')}>{L('svcRenewalValue', `${money(service.renewalPrice)} / año`)}</td>
                        </tr>
                      ) : null}
                      {service.exitPrice ? (
                        <tr>
                          <td className="t-m" {...lab('svcExitPeriod')}>{L('svcExitPeriod', 'Salida del servicio')}</td>
                          <td className="t-h"><span {...lab('svcExitTitle')}>{L('svcExitTitle', 'Traslado de la operación al cliente o a un tercero')}</span><span {...lab('svcExitDesc')}>{L('svcExitDesc', 'Entrega de infraestructura, credenciales y documentación, con acompañamiento durante la migración.')}</span></td>
                          <td className="t-v" {...lab('svcExitValue')}>{L('svcExitValue', `${money(service.exitPrice)} por una vez`)}</td>
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {serviceLevels.length > 0 && (
              <>
                <h3 className="qv-subtitle" {...lab('levelsTitle')}>{L('levelsTitle', 'Niveles de soporte')}</h3>
                {service.levelsIntro && <p className="qv-compact" {...R('content.service.levelsIntro')}>{service.levelsIntro}</p>}
                <ul className="qv-deliv one">
                  {serviceLevels.map((level, i) => (
                    <li key={i}><b {...R(`content.service.levels.${i}.name`)}>{level.name}</b>. <span {...R(`content.service.levels.${i}.desc`)}>{level.desc}</span></li>
                  ))}
                </ul>
              </>
            )}
            {service.budgetNote?.body && <ScopeBox title={service.budgetNote.title} body={service.budgetNote.body} refBase={editor ? 'content.service.budgetNote' : undefined} />}
            {service.note && <p className="qv-note" {...R('content.service.note')}>{service.note}</p>}
          </section>
        ) : null}

        {/* Equipo */}
        {show('equipo') && team.length > 0 && (
          <section className="qv-section" data-foot={pageFooter} data-qsec="equipo">
            {sfoot}{head('equipo', nextNum(), 'Cómo trabajamos', 'Equipo y forma de trabajo')}
            {content.teamIntro && <p className="qv-lede" {...R('content.teamIntro')}>{content.teamIntro}</p>}
            <ul className="qv-team">
              {team.map((member, index) => (
                <li key={index}>
                  <div className="tm-head">
                    <span className="tm-n">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4 {...R(`content.team.${index}.role`)}>{member.role}</h4>
                      <div className="tm-resp" {...R(`content.team.${index}.dedication`)}>{member.dedication}</div>
                    </div>
                  </div>
                  <ul className="tm-fns">
                    {member.functions?.map((fn, i) => <li key={i} {...R(`content.team.${index}.functions.${i}`)}>{fn}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
            {content.workRhythm?.body && <ScopeBox title={content.workRhythm.title} body={content.workRhythm.body} refBase={editor ? 'content.workRhythm' : undefined} />}
          </section>
        )}

        {/* Supuestos y exclusiones */}
        {show('condiciones') && (content.assumptions?.length || content.exclusions?.length || guarantees.length) ? (
          <section className="qv-section" data-foot={pageFooter} data-qsec="condiciones">
            {sfoot}{head('condiciones', nextNum(), 'Letra clara', 'Supuestos y exclusiones')}
            <div className="qv-twocol">
              {content.assumptions?.length ? (
                <div className="qv-tcbox">
                  <h3 {...lab('assumptionsTitle')}>{L('assumptionsTitle', 'Lo que asumimos')}</h3>
                  <ul>{content.assumptions.map((text: string, i: number) => <li key={i} {...R(`content.assumptions.${i}`)}>{text}</li>)}</ul>
                </div>
              ) : null}
              {content.exclusions?.length ? (
                <div className="qv-tcbox warn">
                  <h3 {...lab('exclusionsTitle')}>{L('exclusionsTitle', 'Lo que queda fuera')}</h3>
                  <ul>{content.exclusions.map((text: string, i: number) => <li key={i} {...R(`content.exclusions.${i}`)}>{text}</li>)}</ul>
                </div>
              ) : null}
            </div>
            {guarantees.length > 0 && (
              <>
                <h3 className="qv-subtitle" {...lab('guaranteesTitle')}>{L('guaranteesTitle', 'Garantía, propiedad y ampliación')}</h3>
                <div className="qv-tablewrap">
                  <table className="qv-table">
                    <thead><tr><th {...lab('garConcept')}>{L('garConcept', 'Concepto')}</th><th style={{ textAlign: 'left' }} {...lab('garScope')}>{L('garScope', 'Alcance')}</th></tr></thead>
                    <tbody>
                      {guarantees.map((g, i) => (
                        <tr key={i}>
                          <td className="t-m" {...R(`content.guarantees.${i}.concept`)}>{g.concept}</td>
                          <td className="t-h" style={{ textAlign: 'left', fontWeight: 400 }} {...R(`content.guarantees.${i}.text`)}>{g.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="qv-note" {...R('content.finalNote')}>
              {content.finalNote || `Propuesta válida por ${quote.validDays} días.${selectable ? ` Este documento es interactivo: la configuración de ${itemsNoun.toLowerCase()} activa al momento de la firma constituye el alcance contractual.` : ''}`}
            </p>
          </section>
        ) : null}
        </>
        )}
      </main>

      {/* Cierre */}
      {show('cierre') && (
      <footer className="qv-back" data-qsec="cierre">
        <div className="qv-page">
          <div className="bk-top">
            <b {...lab('brandName')}>{L('brandName', 'Algoritmo')}</b><img src={brandLogo} alt="Algoritmo T" {...IMG('content.brand.logo')} />
            {hasCobrand && (
              <>
                <i className="cb-sep" aria-hidden="true" />
                {cobrand.logoLight
                  ? <img className="cb-logo" src={cobrand.logoLight} alt={cobrand.name || 'Aliado'} {...IMG('content.cobrand.logoLight')} />
                  : <b className="cb-name" {...R('content.cobrand.name')}>{cobrand.name}</b>}
              </>
            )}
          </div>
          <div className="bk-q" {...R('content.backQuote')}>
            {content.backQuote || <>Toda la operación de <em>{quote.clientName}</em> en un solo lugar.</>}
          </div>
          <div className="bk-tag" {...lab('backTagline')}>{L('backTagline', 'Soluciones digitales con sentido humano.')}</div>
          <div className="sig">
            <div className="nm" {...R('content.signature.name')}>{signature.name || 'Algoritmo T'}</div>
            {signature.role && <div className="rl" {...R('content.signature.role')}>{signature.role}</div>}
            <div className="ct">
              {(signature.email || editor) && <a href={`mailto:${signature.email || ''}`} {...R('content.signature.email')}>{signature.email || ''}</a>}
              {signature.email && signature.phone ? ' · ' : ' '}
              <span {...R('content.signature.phone')}>{signature.phone || ''}</span>
              <br />
              <a href="https://www.algoritmot.com" {...lab('backSite')}>{L('backSite', 'www.algoritmot.com')}</a>
            </div>
          </div>
        </div>
      </footer>
      )}

      {editor && (
        <EditorPanel
          publicId={quote.publicId}
          quoteTitle={quote.title}
          published={quote.status === 'PUBLISHED'}
          pages={docPages as any}
          sections={sections}
          dirty={dirty}
          preview={editorPreview}
          onPreview={setEditorPreview}
          onApplyRef={onApplyRef}
          onPages={onPages as any}
          onSections={onSections}
          onSave={saveDraft}
          onDiscard={() => { history.current = []; future.current = []; setHist({ undo: 0, redo: 0 }); return load(true) }}
          onReload={() => load(true)}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={hist.undo > 0}
          canRedo={hist.redo > 0}
        />
      )}
    </div>
  )
}
