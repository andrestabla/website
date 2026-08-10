/**
 * Documento por páginas: modelo libre de contenido para cotizaciones que deben
 * replicar exactamente una propuesta diagramada. Cada página del documento es
 * una hoja del visor, y su contenido son bloques tipados que el builder edita.
 *
 * Si la cotización trae `content.pages`, el visor renderiza estas páginas en
 * lugar del esquema fijo de secciones. Convive con las cotizaciones que usan
 * el esquema clásico.
 */
import React, { useEffect } from 'react'
import type { QuoteItem, QuoteTotals } from './pricing'

/** Hoja del documento: 900 × 1273 px = proporción A4 exacta (210 × 297 mm). */
export const SHEET_W = 900
export const SHEET_H = 1273

/**
 * Ajusta el contenido de cada hoja para que quepa en su alto: si una página
 * excede la caja, se reduce proporcionalmente (con un piso, para no volverla
 * ilegible). Así lo que se ve en pantalla es lo que sale impreso.
 */
export function useFitPages(deps: unknown[] = []) {
  useEffect(() => {
    const fit = () => {
      const sheets = Array.from(document.querySelectorAll<HTMLElement>('.qv-sheet-in'))

      /**
       * Cuánto sobresale el contenido por debajo del límite útil de la hoja.
       * Se mide con la geometría real de los bloques: scrollHeight no delata
       * el desborde cuando la caja tiene alto fijo, y los márgenes del último
       * bloque tampoco entran en esa cuenta.
       */
      const excess = (el: HTMLElement) => {
        const sheet = el.parentElement
        if (!sheet) return { over: 0, avail: 0, content: 0 }
        const cs = getComputedStyle(sheet)
        const rect = sheet.getBoundingClientRect()
        const top = rect.top + parseFloat(cs.paddingTop)
        const limit = rect.bottom - parseFloat(cs.paddingBottom)
        let bottom = top
        el.querySelectorAll<HTMLElement>(':scope > *').forEach((child) => {
          const r = child.getBoundingClientRect()
          if (r.height > 0 && r.bottom > bottom) bottom = r.bottom
        })
        return { over: bottom - limit, avail: limit - top, content: bottom - top }
      }

      // primera pasada: escala según el desborde medido
      sheets.forEach((el) => {
        el.style.setProperty('--fit', '1')
        const { over, avail, content } = excess(el)
        if (over > 0 && content > 0) {
          el.style.setProperty('--fit', String(Math.max(0.62, (avail / content) - 0.01)))
        }
      })

      // pasadas siguientes: al reducir, el texto vuelve a componerse y las
      // alturas cambian; se corrige hasta que ninguna hoja sobresalga.
      for (let pass = 0; pass < 3; pass++) {
        let ajustada = false
        sheets.forEach((el) => {
          const current = parseFloat(el.style.getPropertyValue('--fit') || '1')
          const { over, avail, content } = excess(el)
          if (over > 0.5 && content > 0) {
            const next = current * ((avail / content) - 0.012)
            el.style.setProperty('--fit', String(Math.max(0.55, next)))
            ajustada = true
          }
        })
        if (!ajustada) break
      }
    }
    fit()
    const t = window.setTimeout(fit, 400)
    window.addEventListener('resize', fit)
    const imgs = Array.from(document.querySelectorAll('.qv-sheet-in img'))
    imgs.forEach((i) => i.addEventListener('load', fit))
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', fit)
      imgs.forEach((i) => i.removeEventListener('load', fit))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export type Align = 'left' | 'center' | 'right' | 'justify'

export type DocBlock =
  | { type: 'lede'; text: string; align?: Align }
  | { type: 'p'; text: string; align?: Align }
  | { type: 'h3'; text: string; align?: Align }
  | { type: 'list'; items: string[]; align?: Align }
  | { type: 'box'; title?: string; body: string; align?: Align }
  | { type: 'note'; text: string; align?: Align }
  | { type: 'table'; headers?: string[]; rows: string[][]; firstCol?: 'key' | 'plain'; colAlign?: Align[] }
  | { type: 'cards'; cols?: 2 | 3; items: Array<{ tag?: string; title: string; body: string; foot?: string }> }
  | { type: 'phase'; id: string; name: string; when?: string; defs: Array<{ term: string; desc: string; strong?: boolean }> }
  | { type: 'img'; url: string; caption?: string; wide?: boolean }
  | { type: 'invoice'; note?: string }
  | { type: 'payments'; items: Array<{ pct: string; label: string }> }
  | { type: 'toc'; note?: string }
  | { type: 'team'; items: Array<{ role: string; dedication?: string; functions: string[] }> }
  | { type: 'letterhead'; date?: string; addressee?: string; subject?: string; salutation?: string }
  | {
      type: 'timeline'
      segments: Array<{ label?: string; weight: number; tone?: 'cyan' | 'deep' | 'gold' }>
      marks?: string[]
      note?: string
    }
  | {
      type: 'gantt'
      cols: string[]
      rows: Array<{ label: string; from: number; to: number; tone?: 'cyan' | 'deep' | 'gold'; bold?: boolean }>
      note?: string
    }

export type DocPage = {
  id: string
  num?: string
  kicker?: string
  title?: string
  /** Excluye la página del índice automático (p. ej. la continuación de un capítulo). */
  tocHidden?: boolean
  blocks: DocBlock[]
}

/** Divide en párrafos por línea en blanco, como el editor. */
const paras = (text: string) => String(text || '').split(/\n{2,}/).filter(Boolean)

/**
 * Marcas de texto que el builder inserta al dar formato sobre la selección:
 *   **negrita** · *cursiva* · `monoespaciada` · [texto](url)
 * Se resuelven a nodos de React (nunca a HTML crudo).
 */
const RICH = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|[\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/|www\.)[^\s,;)\]\[]+)/g

/** Destino seguro: correo → mailto, dominio suelto → https, nunca ruta relativa. */
function href(url: string): string {
  const u = url.trim()
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(u)) return `mailto:${u}`
  return `https://${u.replace(/^\/+/, '')}`
}

export function rich(text: string): React.ReactNode {
  const parts = String(text || '').split(RICH)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) return <a key={i} href={href(link[2])} target="_blank" rel="noreferrer">{link[1]}</a>
    // correo o URL escrita directamente en el texto
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(part) || /^(https?:\/\/|www\.)/i.test(part)) {
      return <a key={i} href={href(part)} target="_blank" rel="noreferrer">{part}</a>
    }
    return <span key={i}>{part}</span>
  })
}

/** Dentro de un párrafo, cada salto de línea se respeta como tal. */
function lines(text: string): React.ReactNode {
  const ls = String(text || '').split('\n')
  return ls.map((l, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {rich(l)}
    </React.Fragment>
  ))
}

/** Estilo de alineación del bloque (si el autor la definió). */
const al = (a?: Align) => (a ? { textAlign: a } as React.CSSProperties : undefined)

/**
 * Un párrafo puede contener viñetas: las líneas que empiezan con «- » se
 * agrupan en una lista y el resto sigue como texto corrido.
 */
function Prose({ text, align }: { text: string; align?: Align }) {
  const out: React.ReactNode[] = []
  let bullets: string[] = []
  const flush = (key: string) => {
    if (!bullets.length) return
    out.push(
      <ul className="qv-deliv one" style={al(align)} key={`ul-${key}`}>
        {bullets.map((b, i) => <li key={i}>{rich(b)}</li>)}
      </ul>,
    )
    bullets = []
  }
  paras(text).forEach((block, bi) => {
    const rows = block.split('\n')
    const allBullets = rows.every((l) => /^\s*[-·•]\s+/.test(l))
    if (allBullets) {
      bullets.push(...rows.map((l) => l.replace(/^\s*[-·•]\s+/, '')))
      return
    }
    flush(String(bi))
    out.push(<p style={al(align)} key={bi}>{lines(block)}</p>)
  })
  flush('end')
  return <>{out}</>
}

export function DocBlockView({
  block,
  items,
  totals,
  money,
  pages = [],
}: {
  block: DocBlock
  items: QuoteItem[]
  totals: QuoteTotals
  money: (n: number) => string
  pages?: DocPage[]
}) {
  switch (block.type) {
    case 'lede':
      return <>{paras(block.text).map((t, i) => <p className="qv-lede" style={al(block.align)} key={i}>{lines(t)}</p>)}</>

    case 'p':
      return <Prose text={block.text} align={block.align} />

    case 'h3':
      return <h3 className="qv-subtitle" style={al(block.align)}>{rich(block.text)}</h3>

    case 'list':
      return (
        <ul className="qv-deliv one" style={al(block.align)}>
          {block.items.filter(Boolean).map((it, i) => <li key={i}>{rich(it)}</li>)}
        </ul>
      )

    case 'box':
      return (
        <div className="qv-scopebox" style={al(block.align)}>
          {block.title && <div className="sb-h">{rich(block.title)}</div>}
          <Prose text={block.body} />
        </div>
      )

    case 'note':
      return <p className="qv-note" style={al(block.align)}>{rich(block.text)}</p>

    case 'table':
      return (
        <div className="qv-tablewrap">
          <table className="qv-table doc">
            {block.headers?.length ? (
              <thead><tr>{block.headers.map((h, i) => (
                <th key={i} style={al(block.colAlign?.[i])}>{h}</th>
              ))}</tr></thead>
            ) : null}
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={al(block.colAlign?.[ci])}
                      className={ci === 0 && block.firstCol !== 'plain' ? 'tb-k' : undefined}>{rich(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'cards':
      return (
        <div className={`qv-fronts${block.cols === 3 ? ' three' : ''}`}>
          {block.items.map((card, i) => (
            <div className="qv-front" key={i}>
              {card.tag && <div className="f-n">{card.tag}</div>}
              <h3>{rich(card.title)}</h3>
              <Prose text={card.body} />
              {card.foot && <div className="f-o">{rich(card.foot)}</div>}
            </div>
          ))}
        </div>
      )

    case 'phase':
      return (
        <div className="qv-fase">
          <div className="h">
            <span className="id">{block.id}</span>
            <b>{block.name}</b>
            {block.when && <span className="when">{block.when}</span>}
          </div>
          <dl>
            {block.defs.map((d, i) => (
              <div className="dpair" key={i}>
                <dt>{d.term}</dt>
                <dd className={d.strong ? 'pf' : undefined}>{rich(d.desc)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

    case 'img':
      return (
        <figure className={`qv-shot${block.wide ? ' wide' : ''}`}>
          <img src={block.url} alt={block.caption || ''} loading="lazy" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      )

    case 'invoice': {
      const gravados = items.filter((i) => i.on !== false)
      return (
        <>
          <div className="qv-tablewrap">
            <table className="qv-inv">
              <thead><tr><th>Concepto</th><th style={{ textAlign: 'right' }}>Valor {totals ? '' : ''}COP</th></tr></thead>
              <tbody>
                {gravados.map((item) => (
                  <tr key={item.code}>
                    <td className="c">
                      {item.name}
                      {item.summary && <span className="sub">{item.summary}</span>}
                    </td>
                    <td className="r">{money(item.price)}</td>
                  </tr>
                ))}
                <tr className="tot">
                  <td className="lab">Valor total de la propuesta</td>
                  <td className="r"><span className="big">{money(totals.total)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {block.note && <p className="qv-note">{rich(block.note)}</p>}
        </>
      )
    }

    case 'payments':
      return (
        <div className="qv-pay">
          {block.items.map((p, i) => (
            <div className="p" key={i}>
              <div className="pc">{p.pct}</div>
              <div className="pl">{rich(p.label)}</div>
            </div>
          ))}
        </div>
      )

    case 'toc': {
      // Índice automático: páginas con título, sin las ocultas y sin repetir
      // el mismo capítulo cuando continúa en varias páginas.
      const entries = pages.filter((p, i, all) => {
        if (!p.title || p.tocHidden) return false
        const prev = all.slice(0, i).filter((x) => x.title && !x.tocHidden).pop()
        return !(prev && prev.title === p.title && prev.num === p.num)
      })
      return (
        <>
          <ul className="qv-toc">
            {entries.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`}>
                  <span className="n">{p.num || '·'}</span>
                  <span className="t">{p.title}</span>
                  <span className="d" />
                  {/* número de hoja: la portada es la 1 */}
                  <span className="p">{String(pages.indexOf(p) + 2).padStart(2, '0')}</span>
                </a>
              </li>
            ))}
          </ul>
          {block.note && <p className="qv-note">{block.note}</p>}
        </>
      )
    }

    case 'team':
      return (
        <ul className="qv-team">
          {block.items.map((member, i) => (
            <li key={i}>
              <div className="tm-head">
                <span className="tm-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{member.role}</h4>
                  {member.dedication && <div className="tm-resp">{member.dedication}</div>}
                </div>
              </div>
              <ul className="tm-fns">
                {member.functions.filter(Boolean).map((f, k) => <li key={k}>{rich(f)}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      )

    case 'timeline': {
      // Banda de periodos proporcionales con hitos debajo (el último a la derecha).
      const segs = block.segments || []
      const tone = (t?: string) => (t === 'gold' ? 'is-gold' : t === 'deep' ? 'is-deep' : 'is-cyan')
      const cols = segs.map((x) => `${Math.max(0.001, x.weight)}fr`).join(' ')
      const marks = block.marks || []
      return (
        <>
          <div className="qv-timeline">
            <div className="tl-row tl-labels" style={{ gridTemplateColumns: cols }}>
              {segs.map((sg, i) => (
                <span className={`tl-lab ${tone(sg.tone)}`} key={i}>{sg.label}</span>
              ))}
            </div>
            <div className="tl-row tl-bars" style={{ gridTemplateColumns: cols }}>
              {segs.map((sg, i) => <span className={`tl-bar ${tone(sg.tone)}`} key={i} />)}
            </div>
            <div className="tl-row tl-marks" style={{ gridTemplateColumns: `${cols} 0` }}>
              {marks.map((m, i) => (
                <span className={`tl-mark${i === marks.length - 1 && marks.length > segs.length ? ' is-end' : ''}`} key={i}>{m}</span>
              ))}
            </div>
          </div>
          {block.note && <p className="qv-note">{rich(block.note)}</p>}
        </>
      )
    }

    case 'gantt': {
      const n = block.cols.length || 1
      const tone = (t?: string) => (t === 'gold' ? 'is-gold' : t === 'deep' ? 'is-deep' : 'is-cyan')
      return (
        <>
          <div className="qv-gantt" style={{ ['--n' as string]: n }}>
            <div className="g-row g-head">
              <span className="g-lab" />
              {block.cols.map((c, i) => <span className="g-col" key={i}>{c}</span>)}
            </div>
            {block.rows.map((r, i) => (
              <div className="g-row" key={i}>
                <span className={`g-lab${r.bold ? ' is-bold' : ''}`}>{r.label}</span>
                {block.cols.map((_, c) => <span className="g-col" key={c} />)}
                <span
                  className={`g-bar ${tone(r.tone)}`}
                  style={{ gridColumn: `${Math.max(1, r.from) + 1} / ${Math.max(r.from, r.to) + 2}` }}
                />
              </div>
            ))}
          </div>
          {block.note && <p className="qv-note">{rich(block.note)}</p>}
        </>
      )
    }

    case 'letterhead':
      return (
        <div className="qv-letterhead">
          {block.date && <p className="lh-date">{block.date}</p>}
          {block.addressee && <p className="lh-addr">{block.addressee}</p>}
          {block.subject && <p className="lh-subject"><b>Asunto:</b> {block.subject}</p>}
          {block.salutation && <p className="lh-salutation">{block.salutation}</p>}
        </div>
      )

    default:
      return null
  }
}

export function DocPageView({
  page,
  client,
  items,
  totals,
  money,
  pages = [],
}: {
  page: DocPage
  client: string
  items: QuoteItem[]
  totals: QuoteTotals
  money: (n: number) => string
  pages?: DocPage[]
}) {
  return (
    <section className="qv-section" id={page.id} data-qsec={page.id}>
      <div className="qv-sheet-in">
      <div className="qv-rhead">
        <span className="r-l">Propuesta · {client}</span>
        <span className="r-r">Algoritmo&nbsp;T</span>
      </div>
      {(page.title || page.kicker) && (
        <div className="qv-sechead">
          <div className="sn">{page.num || '—'}</div>
          <div>
            {page.kicker && <div className="kicker">{page.kicker}</div>}
            {page.title && <h2>{page.title}</h2>}
          </div>
        </div>
      )}
      {page.blocks.map((block, i) => (
        <DocBlockView key={i} block={block} items={items} totals={totals} money={money} pages={pages} />
      ))}
      </div>
    </section>
  )
}
