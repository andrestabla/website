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

// ── Utilidades de sección ───────────────────────────────────────────────────
function SectionHead({ num, kicker, title }: { num: string; kicker: string; title: string }) {
  return (
    <div className="qv-sechead">
      <div className="sn">{num}</div>
      <div>
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function ScopeBox({ title, body }: { title?: string; body?: string }) {
  if (!body) return null
  return (
    <div className="qv-scopebox">
      {title && <div className="sb-h">{title}</div>}
      <p>{body}</p>
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
  const architecture = content.architecture || {}
  const screens = content.screens || {}
  const screenItems: Array<{ url: string; caption: string; wide?: boolean }> = (screens.items || []).filter((s: any) => s?.url)
  const schedule = content.schedule || {}
  const scheduleGroups: Array<{ name: string; rows: Array<{ label: string; on: number[]; hito: number[] }> }> = schedule.groups || []
  const scheduleWeeks = Math.max(
    8,
    ...scheduleGroups.flatMap((g) => g.rows.flatMap((r) => [...(r.on || []), ...(r.hito || [])]))
  )
  const milestones: Array<{ name: string; week: string; criterion: string }> = content.milestones || []
  const team: Array<{ role: string; dedication: string; functions: string[] }> = content.team || []
  const guarantees: Array<{ concept: string; text: string }> = content.guarantees || []
  const categories = [...new Set(items.filter((i) => i.kind !== 'CORE').map((i) => i.category || 'Módulos'))]
  const core = items.filter((i) => i.kind === 'CORE')
  const active = items.filter((i) => i.kind !== 'CORE' && i.on)
  const offCodes = new Set(items.filter((i) => i.kind !== 'CORE' && !i.on).map((i) => i.code))
  const service = content.service || {}
  const serviceLevels: Array<{ name: string; desc: string }> = service.levels || []
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
            <SectionHead num={nextNum()} kicker="Presentación" title="Una propuesta que se lee y se configura" />
            <p className="qv-letter qv-drop">{content.intro}</p>
          </section>
        )}

        {/* Diagnóstico */}
        {(content.diagnosis?.lede || fronts.length > 0) && (
          <section className="qv-section" data-qsec="diagnostico">
            <SectionHead num={nextNum()} kicker="Diagnóstico" title="Lectura del reto" />
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
            <ScopeBox title={content.diagnosis?.note?.title} body={content.diagnosis?.note?.body} />
          </section>
        )}

        {/* Arquitectura */}
        {(architecture.lede || architecture.layers?.length) && (
          <section className="qv-section" data-qsec="arquitectura">
            <SectionHead num={nextNum()} kicker="Solución" title="Arquitectura de la solución" />
            {architecture.lede && <p className="qv-lede">{architecture.lede}</p>}
            {architecture.layers?.length > 0 && (
              <div className="qv-arch">
                {architecture.layers.map((layer: any, index: number) => (
                  <div className="ar" key={index}>
                    <div className="ar-n">{layer.name}</div>
                    <div className="ar-t">{layer.title}</div>
                    <div className="ar-d">{layer.desc}</div>
                  </div>
                ))}
              </div>
            )}
            {architecture.stack?.length > 0 && (
              <>
                <h3 className="qv-subtitle">Base tecnológica</h3>
                {architecture.stackNote && <p className="qv-compact">{architecture.stackNote}</p>}
                <div className="qv-tablewrap">
                  <table className="qv-stack">
                    <thead><tr><th>Componente</th><th>Tecnología</th><th>Qué aporta</th></tr></thead>
                    <tbody>
                      {architecture.stack.map((row: any, index: number) => (
                        <tr key={index}>
                          <td className="sk-c">{row.component}</td>
                          <td className="sk-t">{row.tech}</td>
                          <td>{row.what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <ScopeBox title={architecture.ownership?.title} body={architecture.ownership?.body} />
          </section>
        )}

        {/* Enfoque (texto libre, si no hay arquitectura estructurada) */}
        {content.approach && !architecture.lede && (
          <section className="qv-section" data-qsec="enfoque">
            <SectionHead num={nextNum()} kicker="Solución" title="Cómo lo resolvemos" />
            <p className="qv-letter">{content.approach}</p>
            {content.scopeNote && <ScopeBox title="Nota de alcance" body={content.scopeNote} />}
          </section>
        )}

        {/* La plataforma en pantalla */}
        {screenItems.length > 0 && (
          <section className="qv-section" data-qsec="pantallas">
            <SectionHead num={nextNum()} kicker="La plataforma en pantalla" title="Así se ve funcionando" />
            {screens.intro && <p className="qv-compact">{screens.intro}</p>}
            <div className="qv-shots">
              {screenItems.map((shot, index) => (
                <figure className={`qv-shot${shot.wide ? ' wide' : ''}`} key={index}>
                  <img src={shot.url} alt={shot.caption || `Captura ${index + 1}`} loading="lazy" />
                  {shot.caption && (
                    <figcaption><b>Fig. {String(index + 1).padStart(2, '0')}</b> {shot.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
            {screens.note && <p className="qv-shotnote">{screens.note}</p>}
          </section>
        )}

        {/* Núcleo + módulos */}
        <section className="qv-section" data-qsec="modulos">
          <SectionHead num={nextNum()} kicker="Alcance configurable" title="Núcleo y catálogo de módulos" />
          <span className="qv-livehint">Interactivo · toca cada interruptor y la propuesta se recalcula</span>

          {core.map((item) => (
            <article className="qv-mod core" key={item.code} style={{ marginBottom: 10 }}>
              <div className="md-top">
                <span className="md-c">{item.code}</span>
                <span className="qv-sw lock"><span className="tr" /><span className="lb">Siempre incluido</span></span>
              </div>
              <h3>{item.name}</h3>
              <p>{item.summary}</p>
              {Array.isArray((item.detail as any)?.entregables) && (item.detail as any).entregables.length > 0 && (
                <ul className="qv-deliv">
                  {(item.detail as any).entregables.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              )}
              <div className="md-f">
                <span className="md-e">{item.deliverables} entregables</span>
                <span className="md-p">{money(item.price)}</span>
              </div>
            </article>
          ))}
          {content.coreNote?.body && <ScopeBox title={content.coreNote.title} body={content.coreNote.body} />}

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
          <SectionHead num={nextNum()} kicker="Alcance elegido" title="Configurador de alcance" />
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
          {content.timelineNote && <ScopeBox title="Cómo leer el plazo" body={content.timelineNote} />}
        </section>

        {/* Cronograma */}
        {scheduleGroups.length > 0 && (
          <section className="qv-section" data-qsec="cronograma">
            <SectionHead num={nextNum()} kicker="Tiempos" title="Cronograma de ejecución" />
            {schedule.intro && <p className="qv-compact">{schedule.intro}</p>}
            <div className="qv-tablewrap">
              <table className="qv-crono">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    {Array.from({ length: scheduleWeeks }, (_, i) => <th key={i}>S{i + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {scheduleGroups.map((group, gi) => {
                    return [
                      <tr className="grp" key={`g-${gi}`}><td colSpan={scheduleWeeks + 1}>{group.name}</td></tr>,
                      ...group.rows.map((row, ri) => {
                        const code = rowModuleCode(row.label)
                        const off = code ? offCodes.has(code) : false
                        return (
                          <tr key={`g-${gi}-r-${ri}`} className={off ? 'off' : ''}>
                            <td>{row.label}</td>
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
              <span><i className="on" /> Construcción y pruebas</span>
              <span><i className="hito" /> Entrega y aprobación</span>
              {schedule.legend && <span className="txt">{schedule.legend}</span>}
            </div>
          </section>
        )}

        {/* Inversión */}
        <section className="qv-section" data-qsec="inversion">
          <SectionHead num={nextNum()} kicker="Inversión" title="Propuesta económica" />
          <p className="qv-compact">
            Valores en {currency === 'USD' ? 'dólares estadounidenses' : 'pesos colombianos'}. Las líneas
            atenuadas corresponden a módulos desactivados, que quedan fuera del total.
          </p>
          <div className="qv-tablewrap">
            <table className="qv-inv">
              <thead><tr><th>Componente</th><th>Entregables</th><th>Inversión ({currency})</th></tr></thead>
              <tbody>
                {core.map((item) => (
                  <tr key={item.code}>
                    <td className="ci">{item.name}</td>
                    <td className="cn">{item.deliverables}</td>
                    <td className="cv">{money(item.price)}</td>
                  </tr>
                ))}
                {categories.map((category) => [
                  <tr className="grp" key={`c-${category}`}><td colSpan={3}>Módulos · {category}</td></tr>,
                  ...items
                    .filter((i) => i.kind !== 'CORE' && (i.category || 'Módulos') === category)
                    .map((item) => (
                      <tr key={item.code} className={item.on ? '' : 'off'}>
                        <td className="ci">{item.code} · {item.name}</td>
                        <td className="cn">{item.deliverables}</td>
                        <td className="cv">{money(item.price)}</td>
                      </tr>
                    )),
                ])}
                <tr className="sub">
                  <td>Subtotal · núcleo + módulos activos</td>
                  <td className="cn">{totals.deliverables}</td>
                  <td className="cv">{money(totals.subtotal)}</td>
                </tr>
                <tr className="dto">
                  <td>Economía de escala · {totals.discountPct}% sobre módulos</td>
                  <td />
                  <td className="cv">{totals.discount ? `− ${money(totals.discount)}` : '—'}</td>
                </tr>
                <tr className="tot">
                  <td className="lab">Inversión total</td>
                  <td className="cn">{totals.moduleCount} módulos</td>
                  <td><span className="big">{money(totals.total)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {content.investmentNote && <p className="qv-note">{content.investmentNote}</p>}
        </section>

        {/* Plan de pagos */}
        <section className="qv-section" data-qsec="pagos">
          <SectionHead num={nextNum()} kicker="Condiciones" title="Plan de pagos e hitos" />
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
          {milestones.length > 0 && (
            <>
              <h3 className="qv-subtitle">Qué se aprueba en cada hito</h3>
              <div className="qv-tablewrap">
                <table className="qv-table">
                  <thead><tr><th>Hito</th><th>Semana</th><th style={{ textAlign: 'left' }}>Criterio de aprobación</th></tr></thead>
                  <tbody>
                    {milestones.map((m, i) => (
                      <tr key={i}>
                        <td className="t-m">{m.name}</td>
                        <td className="t-m">{m.week}</td>
                        <td className="t-h" style={{ textAlign: 'left', fontWeight: 400 }}>{m.criterion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {content.paymentsNote && <p className="qv-note">{content.paymentsNote}</p>}
        </section>

        {/* Servicio */}
        {service.includedMonths ? (
          <section className="qv-section" data-qsec="servicio">
            <SectionHead num={nextNum()} kicker="Después de la entrega" title="Servicio, soporte y renovación" />
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
            {serviceLevels.length > 0 && (
              <>
                <h3 className="qv-subtitle">Niveles de soporte</h3>
                {service.levelsIntro && <p className="qv-compact">{service.levelsIntro}</p>}
                <ul className="qv-deliv one">
                  {serviceLevels.map((level, i) => (
                    <li key={i}><b>{level.name}.</b> {level.desc}</li>
                  ))}
                </ul>
              </>
            )}
            {service.budgetNote?.body && <ScopeBox title={service.budgetNote.title} body={service.budgetNote.body} />}
            {service.note && <p className="qv-note">{service.note}</p>}
          </section>
        ) : null}

        {/* Equipo */}
        {team.length > 0 && (
          <section className="qv-section" data-qsec="equipo">
            <SectionHead num={nextNum()} kicker="Cómo trabajamos" title="Equipo y forma de trabajo" />
            {content.teamIntro && <p className="qv-lede">{content.teamIntro}</p>}
            <ul className="qv-team">
              {team.map((member, index) => (
                <li key={index}>
                  <div className="tm-head">
                    <span className="tm-n">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4>{member.role}</h4>
                      <div className="tm-resp">{member.dedication}</div>
                    </div>
                  </div>
                  <ul className="tm-fns">
                    {member.functions?.map((fn, i) => <li key={i}>{fn}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
            {content.workRhythm?.body && <ScopeBox title={content.workRhythm.title} body={content.workRhythm.body} />}
          </section>
        )}

        {/* Supuestos y exclusiones */}
        {(content.assumptions?.length || content.exclusions?.length || guarantees.length) ? (
          <section className="qv-section" data-qsec="condiciones">
            <SectionHead num={nextNum()} kicker="Letra clara" title="Supuestos y exclusiones" />
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
            {guarantees.length > 0 && (
              <>
                <h3 className="qv-subtitle">Garantía, propiedad y ampliación</h3>
                <div className="qv-tablewrap">
                  <table className="qv-table">
                    <thead><tr><th>Concepto</th><th style={{ textAlign: 'left' }}>Alcance</th></tr></thead>
                    <tbody>
                      {guarantees.map((g, i) => (
                        <tr key={i}>
                          <td className="t-m">{g.concept}</td>
                          <td className="t-h" style={{ textAlign: 'left', fontWeight: 400 }}>{g.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="qv-note">
              {content.finalNote || `Propuesta válida por ${quote.validDays} días. Este documento es interactivo: la configuración de módulos activa al momento de la firma constituye el alcance contractual.`}
            </p>
          </section>
        ) : null}
      </main>

      {/* Cierre */}
      <footer className="qv-back" data-qsec="cierre">
        <div className="qv-page">
          <div className="bk-q">
            {content.backQuote || <>Toda la operación de <em>{quote.clientName}</em> en un solo lugar.</>}
          </div>
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
