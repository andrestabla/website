/**
 * Visor público de cotizaciones — /c/:publicId (+ ?d=<token de destinatario>).
 *
 * El cliente lee la propuesta con la identidad Algoritmo T, prende y apaga
 * módulos y ve la inversión recalcularse en vivo. Cada interacción se reporta a
 * /api/quotes/track: aperturas, tiempo, secciones alcanzadas, módulos tocados.
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
import './quote-viewer.css'

type PublicQuote = {
  publicId: string
  status: string
  clientName: string
  sector?: string | null
  title: string
  subtitle?: string | null
  currency: string
  content: any
  pricing: { items: QuoteItem[] }
  discountScale?: DiscountTier[] | null
  validDays: number
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

// ── Componente ──────────────────────────────────────────────────────────────
export default function QuoteViewer() {
  const { publicId } = useParams<{ publicId: string }>()
  const [search] = useSearchParams()
  const recipientToken = search.get('d') || ''

  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [quote, setQuote] = useState<PublicQuote | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [preview, setPreview] = useState(false)
  const [items, setItems] = useState<QuoteItem[]>([])
  const initialOn = useRef<Map<string, boolean>>(new Map())

  const track = useTracker(publicId, recipientToken, state === 'ready' && !preview)

  // Tipografía mono de la identidad (el sitio solo carga Inter).
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  useEffect(() => {
    if (!publicId) return
    let cancelled = false
    ;(async () => {
      try {
        const url = `/api/quotes/public?id=${encodeURIComponent(publicId)}${recipientToken ? `&d=${encodeURIComponent(recipientToken)}` : ''}`
        const res = await fetch(url)
        const payload = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || !payload?.ok) {
          setState(res.status === 404 ? 'notfound' : 'error')
          return
        }
        const q: PublicQuote = payload.quote
        setQuote(q)
        setPreview(payload.preview === true)
        setRecipientName(payload.recipient?.name || '')
        const loaded: QuoteItem[] = Array.isArray(q.pricing?.items) ? q.pricing.items : []
        setItems(loaded)
        initialOn.current = new Map(loaded.map((i) => [i.code, i.kind === 'CORE' ? true : i.on]))
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [publicId, recipientToken])

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

  const scale = quote?.discountScale?.length ? quote.discountScale : DEFAULT_DISCOUNT_SCALE
  const totals = useMemo(() => computeTotals(items, { scale }), [items, scale])
  const currency = quote?.currency || 'COP'
  const money = useCallback((n: number) => formatMoney(n, currency), [currency])

  const toggle = (code: string) => {
    // El track va FUERA del updater: React puede ejecutar el updater dos veces
    // (StrictMode) y duplicaría el evento.
    const current = items.find((i) => i.code === code)
    if (!current || current.kind === 'CORE') return
    track({ type: 'toggle', moduleCode: code, value: current.on ? 'off' : 'on' })
    setItems((prev) => prev.map((i) => (i.code === code && i.kind !== 'CORE' ? { ...i, on: !i.on } : i)))
  }

  const applyPreset = (name: 'sugerida' | 'completa' | 'nucleo') => {
    track({ type: 'preset', value: name })
    setItems((prev) =>
      prev.map((i) => {
        if (i.kind === 'CORE') return i
        if (name === 'completa') return { ...i, on: true }
        if (name === 'nucleo') return { ...i, on: false }
        return { ...i, on: initialOn.current.get(i.code) ?? i.on }
      })
    )
  }

  const printPdf = () => {
    track({ type: 'pdf' })
    window.print()
  }

  if (state === 'loading') return <div className="qv-status">Cargando cotización…</div>
  if (state === 'notfound') return <div className="qv-status">Esta cotización ya no está disponible.</div>
  if (state === 'error' || !quote) return <div className="qv-status">Hubo un problema al cargar. Intenta de nuevo.</div>

  const content = quote.content || {}
  const fronts: Array<{ title: string; body: string; needs: string }> = content.diagnosis?.fronts || []
  const categories = [...new Set(items.filter((i) => i.kind !== 'CORE').map((i) => i.category || 'Módulos'))]
  const core = items.filter((i) => i.kind === 'CORE')
  const active = items.filter((i) => i.kind !== 'CORE' && i.on)
  const service = content.service || {}
  const signature = content.signature || {}
  let sectionNumber = 0
  const nextNum = () => String(++sectionNumber).padStart(2, '0')

  return (
    <div className="qv">
      <div className="qv-bar">
        <span className="b-brand">Algoritmo&nbsp;T</span>
        <div className="b-total">
          <div className="t-l">Inversión · {totals.moduleCount} módulos</div>
          <div className="t-v">{money(totals.total)}</div>
        </div>
        <button className="qv-pdfbtn" onClick={printPdf}>↓ PDF</button>
      </div>

      {/* Portada */}
      <header className="qv-cover" data-qsec="portada">
        <div className="qv-page">
          {preview && <span className="qv-preview-flag">Vista previa · sin publicar</span>}
          <div className="kick">
            Propuesta técnica y económica · documento interactivo
            {recipientName ? ` · preparada para ${recipientName}` : ''}
          </div>
          <h1>{quote.title}</h1>
          <div className="rule" />
          {quote.subtitle && <p className="sub">{quote.subtitle}</p>}
          <div className="meta">
            <div className="m"><div className="ml">Cliente</div><div className="mv">{quote.clientName}</div></div>
            <div className="m"><div className="ml">Duración</div><div className="mv">{totals.weeks} semanas desde el kickoff</div></div>
            <div className="m"><div className="ml">Alcance</div><div className="mv">Núcleo + {totals.moduleCount} módulos · {totals.deliverables} entregables</div></div>
            <div className="m"><div className="ml">Inversión</div><div className="mv">{money(totals.total)} {currency}</div></div>
          </div>
          <div className="tagline">Soluciones digitales con <b>sentido humano</b></div>
        </div>
      </header>

      <main className="qv-page">
        {/* Presentación */}
        {content.intro && (
          <section className="qv-section" data-qsec="presentacion">
            <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Presentación</div><h2>Una propuesta que se lee y se configura</h2></div></div>
            <p className="qv-letter qv-drop">{content.intro}</p>
          </section>
        )}

        {/* Diagnóstico */}
        {(content.diagnosis?.lede || fronts.length > 0) && (
          <section className="qv-section" data-qsec="diagnostico">
            <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Diagnóstico</div><h2>Lectura del reto</h2></div></div>
            {content.diagnosis?.lede && <p className="qv-lede">{content.diagnosis.lede}</p>}
            {fronts.length > 0 && (
              <div className="qv-fronts">
                {fronts.map((front, index) => (
                  <div className="qv-front" key={index}>
                    <div className="f-n">Frente {String(index + 1).padStart(2, '0')}</div>
                    <h3>{front.title}</h3>
                    <p>{front.body}</p>
                    {front.needs && <div className="f-o">Necesita: <b>{front.needs}</b></div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Enfoque */}
        {content.approach && (
          <section className="qv-section" data-qsec="enfoque">
            <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Solución</div><h2>Cómo lo resolvemos</h2></div></div>
            <p className="qv-letter">{content.approach}</p>
            {content.scopeNote && (
              <div className="qv-scopebox"><div className="sb-h">Nota de alcance</div><p>{content.scopeNote}</p></div>
            )}
          </section>
        )}

        {/* Núcleo + módulos */}
        <section className="qv-section" data-qsec="modulos">
          <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Alcance configurable</div><h2>Núcleo y catálogo de módulos</h2></div></div>
          <span className="qv-livehint">Interactivo · toca cada interruptor y la propuesta se recalcula</span>

          {core.map((item) => (
            <article className="qv-mod core" key={item.code} style={{ marginBottom: 10 }}>
              <div className="md-top">
                <span className="md-c">{item.code}</span>
                <span className="qv-sw lock"><span className="tr" /><span className="lb">Siempre incluido</span></span>
              </div>
              <h3>{item.name}</h3>
              <p>{item.summary}</p>
              <div className="md-f">
                <span className="md-e">{item.deliverables} entregables</span>
                <span className="md-p">{money(item.price)}</span>
              </div>
            </article>
          ))}

          {categories.map((category) => (
            <div key={category}>
              <div className="qv-cat-label">Módulos · {category}</div>
              <div className="qv-mods">
                {items
                  .filter((i) => i.kind !== 'CORE' && (i.category || 'Módulos') === category)
                  .map((item) => (
                    <article className={`qv-mod${item.on ? '' : ' is-off'}`} key={item.code}>
                      <div className="md-top">
                        <span className="md-c">{item.code}</span>
                        <label className="qv-sw">
                          <input type="checkbox" checked={item.on} onChange={() => toggle(item.code)} />
                          <span className="tr" />
                          <span className="lb">{item.on ? 'Incluido' : 'Excluido'}</span>
                        </label>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.summary}</p>
                      <div className="md-f">
                        <span className="md-e">{item.deliverables} entregables</span>
                        <span className="md-p">{money(item.price)}</span>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}

          <div className="qv-presets">
            <span className="pr-l">Escenarios</span>
            <button onClick={() => applyPreset('sugerida')}>Configuración sugerida</button>
            <button onClick={() => applyPreset('completa')}>Plataforma completa</button>
            <button onClick={() => applyPreset('nucleo')}>Solo núcleo</button>
          </div>
        </section>

        {/* Configurador */}
        <section className="qv-section" data-qsec="configurador">
          <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Alcance elegido</div><h2>Configurador de alcance</h2></div></div>
          <div className="qv-cfg">
            <div className="qv-cfg-sum">
              <div className="cs-h">Configuración actual · {totals.moduleCount} de {items.filter((i) => i.kind !== 'CORE').length} módulos</div>
              <ul className="qv-cfg-list">
                {core.map((item) => (
                  <li className="core" key={item.code}><span>{item.name} · obligatorio</span><span className="cl-v">{money(item.price)}</span></li>
                ))}
                {active.length === 0 && <li className="cl-empty">Sin módulos adicionales seleccionados.</li>}
                {active.map((item) => (
                  <li key={item.code}><span>{item.code} · {item.name}</span><span className="cl-v">{money(item.price)}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="qv-cfg-tot">
                <div className="ct-k">Inversión resultante</div>
                <div className="ct-row"><span>Núcleo de la plataforma</span><b>{money(totals.core)}</b></div>
                <div className="ct-row"><span>Módulos seleccionados</span><b>{money(totals.modules)}</b></div>
                <div className="ct-row dto"><span>Economía de escala {totals.discountPct}%</span><b>{totals.discount ? `− ${money(totals.discount)}` : '—'}</b></div>
                <div className="ct-big">
                  <div className="cb-l">Inversión total · {currency}</div>
                  <div className="cb-v">{money(totals.total)}</div>
                  {service.includedMonths ? (
                    <div className="cb-s">Incluye {service.includedMonths} meses de infraestructura<br />y soporte de niveles 2, 3 y 4</div>
                  ) : null}
                </div>
              </div>
              <div className="qv-cfg-meta">
                <div><div className="cm-l">Módulos</div><div className="cm-v">{totals.moduleCount}</div></div>
                <div><div className="cm-l">Entregables</div><div className="cm-v">{totals.deliverables}</div></div>
                <div><div className="cm-l">Semanas</div><div className="cm-v">{totals.weeks}</div></div>
              </div>
            </div>
          </div>

          <div className="qv-escala">
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
          </div>
          {content.timelineNote && (
            <div className="qv-scopebox"><div className="sb-h">Cómo leer el plazo</div><p>{content.timelineNote}</p></div>
          )}
        </section>

        {/* Plan de pagos */}
        <section className="qv-section" data-qsec="pagos">
          <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Condiciones</div><h2>Plan de pagos e hitos</h2></div></div>
          <div className="qv-tablewrap">
            <table className="qv-table">
              <thead><tr><th>Momento</th><th>Hito habilitante</th><th>%</th><th>Valor ({currency})</th></tr></thead>
              <tbody>
                {totals.payments.map((payment, index) => {
                  const labels = [
                    ['A la firma', 'Kickoff y arranque: contrato firmado, accesos entregados e infraestructura provisionada'],
                    ['Hito 01', 'Núcleo en producción: el equipo del cliente ya entra y navega con sus usuarios'],
                    ['Hito 02', 'Módulos de operación entregados y probados con datos reales'],
                    ['Hito 03', 'Puesta en marcha: datos migrados, pruebas aprobadas y equipo capacitado'],
                  ]
                  const [moment, description] = labels[index] || [`Pago ${index + 1}`, '']
                  return (
                    <tr key={index}>
                      <td className="t-m">{moment}</td>
                      <td className="t-h">{description}</td>
                      <td className="t-m">{payment.pct}%</td>
                      <td className="t-v">{money(payment.amount)}</td>
                    </tr>
                  )
                })}
                <tr className="tot"><td className="lab" colSpan={2}>Inversión total</td><td className="t-m">100%</td><td className="t-v">{money(totals.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Servicio */}
        {service.includedMonths ? (
          <section className="qv-section" data-qsec="servicio">
            <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Después de la entrega</div><h2>Servicio, soporte y renovación</h2></div></div>
            <div className="qv-tablewrap">
              <table className="qv-table">
                <thead><tr><th>Periodo</th><th>Qué cubre</th><th>Valor</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="t-m">Meses 1–{service.includedMonths}</td>
                    <td className="t-h">Infraestructura y soporte 2, 3 y 4<span>Aplicación, base de datos, almacenamiento y servicios de IA, con monitoreo, respaldos y atención de incidentes.</span></td>
                    <td className="t-v" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>Incluido</td>
                  </tr>
                  {service.renewalPrice ? (
                    <tr>
                      <td className="t-m">Mes {service.includedMonths + 1} en adelante</td>
                      <td className="t-h">Renovación anual del servicio<span>Mismo alcance del primer año, con mantenimiento evolutivo menor y ajuste anual por IPC.</span></td>
                      <td className="t-v">{money(service.renewalPrice)} / año</td>
                    </tr>
                  ) : null}
                  {service.exitPrice ? (
                    <tr>
                      <td className="t-m">Salida del servicio</td>
                      <td className="t-h">Traslado de la operación al cliente o a un tercero<span>Entrega de infraestructura, credenciales y documentación, con acompañamiento durante la migración.</span></td>
                      <td className="t-v">{money(service.exitPrice)} por una vez</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Supuestos y exclusiones */}
        {(content.assumptions?.length || content.exclusions?.length) ? (
          <section className="qv-section" data-qsec="condiciones">
            <div className="qv-sechead"><div className="sn">{nextNum()}</div><div><div className="kicker">Letra clara</div><h2>Supuestos y exclusiones</h2></div></div>
            <div className="qv-twocol">
              {content.assumptions?.length ? (
                <div className="qv-tcbox">
                  <h3>Lo que asumimos</h3>
                  <ul>{content.assumptions.map((text: string, i: number) => <li key={i}>{text}</li>)}</ul>
                </div>
              ) : null}
              {content.exclusions?.length ? (
                <div className="qv-tcbox warn">
                  <h3>Lo que queda fuera</h3>
                  <ul>{content.exclusions.map((text: string, i: number) => <li key={i}>{text}</li>)}</ul>
                </div>
              ) : null}
            </div>
            <p className="qv-note">
              Propuesta válida por {quote.validDays} días. Este documento es interactivo: la configuración
              de módulos activa al momento de la firma constituye el alcance contractual.
            </p>
          </section>
        ) : null}
      </main>

      {/* Cierre */}
      <footer className="qv-back" data-qsec="cierre">
        <div className="qv-page">
          <div className="bk-q">Toda la operación de <em>{quote.clientName}</em> en un solo lugar.</div>
          <div className="bk-tag">Soluciones digitales con sentido humano.</div>
          <div className="sig">
            <div className="nm">{signature.name || 'Algoritmo T'}</div>
            {signature.role && <div className="rl">{signature.role}</div>}
            <div className="ct">
              {signature.email && <a href={`mailto:${signature.email}`}>{signature.email}</a>}
              {signature.email && signature.phone ? ' · ' : ''}
              {signature.phone || ''}
              <br />
              <a href="https://www.algoritmot.com">www.algoritmot.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
