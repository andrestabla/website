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
import { DynamicIcon } from 'lucide-react/dynamic'
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

      // editando, la letra no se reduce: la hoja crece y se marca la que desborda
      const editing = document.body.classList.contains('qv-mode-select') || document.body.classList.contains('qv-mode-edit')
      if (editing) {
        sheets.forEach((el) => {
          el.style.setProperty('--fit', '1')
          const { over } = excess(el)
          const sheet = el.parentElement
          if (!sheet) return
          sheet.classList.toggle('is-overflow', over > 0.5)
          sheet.style.setProperty('--over', over > 0.5 ? `${Math.round(over)} px` : '')
        })
        return
      }
      sheets.forEach((el) => el.parentElement?.classList.remove('is-overflow'))

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
    // al entrar o salir del modo de edición (clase en body) se recalcula
    const modes = new MutationObserver(fit)
    modes.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', fit)
      imgs.forEach((i) => i.removeEventListener('load', fit))
      modes.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export type Align = 'left' | 'center' | 'right' | 'justify'
export type TableMerge = { r: number; c: number; cs: number; rs: number }

/** Celdas tapadas por una combinación (no se pintan) y tamaño de cada origen. */
export function mergeMap(merges: TableMerge[] | undefined) {
  const covered = new Set<string>()
  const origin = new Map<string, TableMerge>()
  for (const m of merges || []) {
    origin.set(`${m.r}:${m.c}`, m)
    for (let dr = 0; dr < m.rs; dr++) for (let dc = 0; dc < m.cs; dc++) if (dr || dc) covered.add(`${m.r + dr}:${m.c + dc}`)
  }
  return { covered, origin }
}

/** Estilo visual editable de un bloque de texto. */
export type BlockStyle = { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'; color?: 'ink' | 'navy' | 'cyan' | 'gold' | 'muted' | 'white'; weight?: 'bold' | 'normal'; bg?: 'none' | 'soft' | 'cyan' | 'gold' | 'navy'; italic?: string | boolean; uppercase?: string | boolean }
/** Clases CSS que aplican el estilo de un bloque. */
export const styleClass = (st?: BlockStyle) => {
  if (!st) return ''
  const c: string[] = []
  if (st.size) c.push(`qs-size-${st.size}`)
  if (st.color) c.push(`qs-color-${st.color}`)
  if (st.weight) c.push(`qs-w-${st.weight}`)
  if (st.bg && st.bg !== 'none') c.push(`qs-bg-${st.bg}`)
  if (st.italic === true || st.italic === 'true') c.push('qs-italic')
  if (st.uppercase === true || st.uppercase === 'true') c.push('qs-upper')
  return c.length ? ` ${c.join(' ')}` : ''
}

/** Bloques cuyo texto se escala y tiñe desde el envoltorio (los de texto llevan su propia clase). */
const TEXT_BLOCKS = new Set(['lede', 'p', 'h3', 'note', 'list', 'box'])
export const wrapperStyleClass = (block: DocBlock) => {
  const st = (block as { style?: BlockStyle }).style
  if (!st || TEXT_BLOCKS.has(block.type)) return ''
  const c: string[] = []
  if (st.size) c.push(`qs-scale-${st.size}`)
  if (st.color) c.push(`qs-tint-${st.color}`)
  if (st.weight === 'bold') c.push('qs-tint-bold')
  if (st.bg && st.bg !== 'none') c.push(`qs-bg-${st.bg}`)
  return c.length ? ` ${c.join(' ')}` : ''
}

export type DocBlock =
  | { type: 'lede'; text: string; align?: Align; style?: BlockStyle }
  | { type: 'p'; text: string; align?: Align; style?: BlockStyle }
  | { type: 'h3'; text: string; align?: Align; style?: BlockStyle }
  | { type: 'list'; items: string[]; align?: Align; style?: BlockStyle; marker?: 'number' | 'check' }
  | { type: 'box'; title?: string; body: string; align?: Align; style?: BlockStyle }
  | { type: 'note'; text: string; align?: Align; style?: BlockStyle }
  | { type: 'table'; headers?: string[]; rows: string[][]; firstCol?: 'key' | 'plain'; colAlign?: Align[]; tableStyle?: 'default' | 'striped' | 'minimal' | 'navy' | 'compact'; fontSize?: 'xs' | 'sm' | 'md'; /** celdas combinadas: origen (fila r, columna c) que abarca cs columnas y rs filas */ merges?: TableMerge[]; /** ancho de cada columna en % (null = automático) */ colWidths?: Array<number | null> }
  | { type: 'cards'; cols?: 2 | 3; items: Array<{ tag?: string; title: string; body: string; foot?: string }> }
  | { type: 'phase'; id: string; name: string; when?: string; defs: Array<{ term: string; desc: string; strong?: boolean }> }
  | { type: 'img'; url: string; caption?: string; wide?: boolean; /** marco de la imagen: recorta la subida a esa proporción */ aspect?: 'square' | 'landscape' | 'wide' | 'portrait' }
  | {
      type: 'invoice'
      note?: string
      /** Filas propias; si no hay, se arma con los conceptos de la cotización. */
      rows?: Array<{ concept: string; detail?: string; amount: string }>
      totalLabel?: string
      total?: string
    }
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
  /** Cuadrícula de 2 a 6 columnas; cada celda es una lista de elementos. */
  | { type: 'grid'; cols: number; cells: DocBlock[][]; gap?: 'sm' }
  | { type: 'icon'; name: string; size?: number; color?: 'navy' | 'cyan' | 'gold' | 'muted'; label?: string; align?: Align }
  | { type: 'button'; label: string; url?: string; style?: 'primary' | 'outline'; align?: Align }
  /** Líneas de tiempo con hitos; se agregan o quitan desde el editor. */
  | { type: 'htimeline'; items: Array<{ title: string; date?: string; desc?: string; tone?: 'cyan' | 'deep' | 'gold' }>; numbered?: boolean }
  | { type: 'vtimeline'; items: Array<{ title: string; date?: string; desc?: string; tone?: 'cyan' | 'deep' | 'gold' }>; numbered?: boolean }
  | { type: 'signature'; name: string; role?: string; org?: string; email?: string; phone?: string; place?: string; date?: string; note?: string; imageUrl?: string; accept?: boolean }
  /** Encabezado de sección numerada dentro de la página: permite dos numerales en una hoja. */
  | { type: 'sechead'; num?: string; kicker?: string; title: string }
  /** Esquema personalizable: proceso, ciclo, pirámide, matriz, mapa mental, mapa conceptual, cuadro sinóptico o causa-efecto. */
  | { type: 'diagram'; kind: DiagramKind; title?: string; center?: string; items: Array<{ label: string; desc?: string; children?: DiagramKid[]; tone?: 'cyan' | 'deep' | 'gold'; /** ancho fijado a mano, en px */ w?: number }>; axes?: { x?: string[]; y?: string[] }; align?: Align; width?: 'full' | 'wide' | 'medium' | 'narrow'; /** ancho del nodo central, en px */ centerW?: number }
  /** Espacio vertical entre elementos, en píxeles. */
  | { type: 'spacer'; height: number }

/** Hijo de un elemento de esquema: texto, o nodo con subniveles propios. */
export type DiagramKid = string | { label: string; children?: DiagramKid[] }

export type DiagramKind = 'process' | 'cycle' | 'pyramid' | 'matrix' | 'mindmap' | 'conceptmap' | 'synoptic' | 'causeeffect'
export const DIAGRAM_LABELS: Record<DiagramKind, string> = {
  process: 'Proceso', cycle: 'Ciclo', pyramid: 'Pirámide', matrix: 'Matriz 2×2', mindmap: 'Mapa mental', conceptmap: 'Mapa conceptual', synoptic: 'Cuadro sinóptico', causeeffect: 'Causa-efecto',
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
const RICH = /(\{\{[a-z0-9 -]+\}\}[\s\S]*?\{\{\/\}\}|\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|[\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/|www\.)[^\s,;)\]\[]+)/g
/** Clases de estilo permitidas en un fragmento: {{color-cyan size-lg}}…{{/}} */
const INLINE_CLASS = /^(color-(ink|navy|cyan|gold|muted|white)|size-(xs|sm|md|lg|xl|xxl)|w-(bold|normal)|italic|upper|bg-(soft|cyan|gold|navy))$/

/** Destino seguro: correo → mailto, dominio suelto → https, nunca ruta relativa. */
function href(url: string): string {
  const u = url.trim()
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(u)) return `mailto:${u}`
  return `https://${u.replace(/^\/+/, '')}`
}

/**
 * Marcas de fragmento duplicadas o sobrantes por una edición antigua:
 * {{a}}{{a}}x{{/}}{{/}} → {{a}}x{{/}}; un {{/}} de más se descarta.
 */
export function normalizeMarks(text: string): string {
  let t = String(text || '')
  if (!t.includes('{{')) return t
  t = t.replace(/(\{\{[a-z0-9 -]+\}\})(?:\1)+/g, '$1')
  const opens = (t.match(/\{\{[a-z0-9 -]+\}\}/g) || []).length
  let closes = (t.match(/\{\{\/\}\}/g) || []).length
  while (closes > opens) { t = t.replace(/\{\{\/\}\}(?![\s\S]*\{\{\/\}\})/, ''); closes-- }
  return t
}

export function rich(text: string): React.ReactNode {
  const parts = normalizeMarks(text).split(RICH)
  return parts.map((part, i) => {
    if (!part) return null
    // fragmento con estilo propio (color, tamaño, peso, fondo): se anida con el resto de marcas
    const styled = /^\{\{([a-z0-9 -]+)\}\}([\s\S]*?)\{\{\/\}\}$/.exec(part)
    if (styled) {
      const classes = styled[1].split(/\s+/).filter((c) => INLINE_CLASS.test(c)).map((c) => `qs-${c}`).join(' ')
      return <span key={i} className={`qs-inline ${classes}`}>{rich(styled[2])}</span>
    }
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{rich(part.slice(2, -2))}</b>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{rich(part.slice(1, -1))}</em>
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
  refBase,
  bpath,
}: {
  block: DocBlock
  items: QuoteItem[]
  totals: QuoteTotals
  money: (n: number) => string
  pages?: DocPage[]
  /** Referencia del bloque (content.pages.N.blocks.M) para el editor en sitio. */
  refBase?: string
  /** Posición del bloque para la barra del editor: "P:B" o "P:B:C:I" dentro de una cuadrícula. */
  bpath?: string
}) {
  // data-ref de un campo del bloque; sin refBase el visor es de solo lectura
  const r = (field: string) => (refBase ? { 'data-ref': `${refBase}.${field}` } : {})
  switch (block.type) {
    case 'lede':
      return <div className={`qv-styled${styleClass(block.style)}`} {...r('text')}>{paras(block.text).map((t, i) => <p className="qv-lede" style={al(block.align)} key={i}>{lines(t)}</p>)}</div>

    case 'p':
      return <div className={`qv-styled${styleClass(block.style)}`} {...r('text')}><Prose text={block.text} align={block.align} /></div>

    case 'h3':
      return <h3 className={`qv-subtitle qv-styled${styleClass(block.style)}`} style={al(block.align)} {...r('text')}>{rich(block.text)}</h3>

    case 'list': {
      const Tag = block.marker === 'number' ? 'ol' : 'ul'
      return (
        <Tag className={`qv-deliv one qv-styled${styleClass(block.style)}${block.marker === 'number' ? ' is-numbered' : block.marker === 'check' ? ' is-check' : ''}`} style={al(block.align)}>
          {block.items.map((it, i) => (it ? <li key={i} {...r(`items.${i}`)}>{rich(it)}</li> : null))}
        </Tag>
      )
    }

    case 'box':
      return (
        <div className={`qv-scopebox qv-styled${styleClass(block.style)}`} style={al(block.align)}>
          {block.title && <div className="sb-h" {...r('title')}>{rich(block.title)}</div>}
          <div {...r('body')}><Prose text={block.body} /></div>
        </div>
      )

    case 'note':
      return <p className={`qv-note qv-styled${styleClass(block.style)}`} style={al(block.align)} {...r('text')}>{rich(block.text)}</p>

    case 'table': {
      const { covered, origin } = mergeMap(block.merges)
      const nCols = Math.max(block.headers?.length || 0, ...block.rows.map((row) => row.length), 1)
      const widths = Array.isArray(block.colWidths) && block.colWidths.some((w) => typeof w === 'number') ? block.colWidths : null
      // tirador para arrastrar el ancho de la columna (solo en el editor); va en la cabecera o, si no hay, en la primera fila
      const grip = (ci: number) => (refBase && ci < nCols - 1 ? <span className="qv-col-grip" data-col-grip={ci} contentEditable={false} aria-hidden="true" /> : null)
      return (
        <div className="qv-tablewrap">
          <table className={`qv-table doc${block.tableStyle && block.tableStyle !== 'default' ? ` ts-${block.tableStyle}` : ''}${block.fontSize ? ` qs-size-${block.fontSize}` : ''}${widths ? ' has-widths' : ''}`}>
            {widths && <colgroup>{Array.from({ length: nCols }, (_, i) => <col key={i} style={typeof widths[i] === 'number' ? { width: `${widths[i]}%` } : undefined} />)}</colgroup>}
            {block.headers?.length ? (
              <thead><tr>{block.headers.map((h, i) => (
                <th key={i} style={al(block.colAlign?.[i])} className={refBase ? 'has-grip' : undefined}><span {...r(`headers.${i}`)}>{h}</span>{grip(i)}</th>
              ))}</tr></thead>
            ) : null}
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    if (covered.has(`${ri}:${ci}`)) return null
                    const m = origin.get(`${ri}:${ci}`)
                    return (
                      <td key={ci} style={al(block.colAlign?.[ci])} data-cell={`${ri}:${ci}`}
                        colSpan={m && m.cs > 1 ? m.cs : undefined} rowSpan={m && m.rs > 1 ? m.rs : undefined}
                        className={[ci === 0 && block.firstCol !== 'plain' ? 'tb-k' : '', m ? 'tb-merged' : '', refBase && !block.headers?.length && ri === 0 ? 'has-grip' : ''].filter(Boolean).join(' ') || undefined}>
                        <span {...r(`rows.${ri}.${ci}`)}>{rich(cell)}</span>{!block.headers?.length && ri === 0 && !m ? grip(ci) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'cards':
      return (
        <div className={`qv-fronts${block.cols === 3 ? ' three' : ''}`}>
          {block.items.map((card, i) => (
            <div className="qv-front" key={i}>
              {card.tag && <div className="f-n" {...r(`items.${i}.tag`)}>{card.tag}</div>}
              <h3 {...r(`items.${i}.title`)}>{rich(card.title)}</h3>
              <div {...r(`items.${i}.body`)}><Prose text={card.body} /></div>
              {card.foot && <div className="f-o" {...r(`items.${i}.foot`)}>{rich(card.foot)}</div>}
            </div>
          ))}
        </div>
      )

    case 'phase':
      return (
        <div className="qv-fase">
          <div className="h">
            <span className="id" {...r('id')}>{block.id}</span>
            <b {...r('name')}>{block.name}</b>
            {block.when && <span className="when" {...r('when')}>{block.when}</span>}
          </div>
          <dl>
            {block.defs.map((d, i) => (
              <div className="dpair" key={i}>
                <dt {...r(`defs.${i}.term`)}>{d.term}</dt>
                <dd className={d.strong ? 'pf' : undefined} {...r(`defs.${i}.desc`)}>{rich(d.desc)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

    case 'img':
      return (
        <figure className={`qv-shot${block.wide ? ' wide' : ''}${block.aspect ? ` qv-shot-${block.aspect}` : ''}`}>
          <img src={block.url} alt={block.caption || ''} loading="lazy" {...(refBase ? { 'data-img-ref': `${refBase}.url` } : {})} />
          {(block.caption || refBase) && <figcaption {...r('caption')}>{block.caption || ''}</figcaption>}
        </figure>
      )

    case 'invoice': {
      // Filas propias del bloque (editables) o, si no hay, los conceptos de la cotización.
      const rows = block.rows?.length
        ? block.rows
        : items.filter((i) => i.on !== false).map((i) => ({
            concept: i.name, detail: i.summary, amount: money(i.price),
          }))
      return (
        <>
          <div className="qv-tablewrap">
            <table className="qv-inv">
              <thead><tr><th>Concepto</th><th style={{ textAlign: 'right' }}>Valor COP</th></tr></thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="c">
                      <span {...(block.rows?.length ? r(`rows.${i}.concept`) : {})}>{rich(row.concept)}</span>
                      {row.detail && <span className="sub" {...(block.rows?.length ? r(`rows.${i}.detail`) : {})}>{rich(row.detail)}</span>}
                    </td>
                    <td className="r" {...(block.rows?.length ? r(`rows.${i}.amount`) : {})}>{row.amount}</td>
                  </tr>
                ))}
                <tr className="tot">
                  <td className="lab" {...r('totalLabel')}>{block.totalLabel || 'Valor total de la propuesta'}</td>
                  <td className="r"><span className="big" {...r('total')}>{block.total || money(totals.total)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {block.note && <p className="qv-note" {...r('note')}>{rich(block.note)}</p>}
        </>
      )
    }

    case 'payments':
      return (
        <div className="qv-pay">
          {block.items.map((p, i) => (
            <div className="p" key={i}>
              <div className="pc" {...r(`items.${i}.pct`)}>{p.pct}</div>
              <div className="pl" {...r(`items.${i}.label`)}>{rich(p.label)}</div>
            </div>
          ))}
        </div>
      )

    case 'toc': {
      // Índice automático: páginas con título, sin las ocultas y sin repetir
      // el mismo capítulo cuando continúa en varias páginas.
      const entries: Array<{ key: string; href: string; num: string; title: string; sheet: number }> = []
      pages.forEach((p, i, all) => {
        const sheet = i + 2 // la portada es la hoja 1
        if (p.title && !p.tocHidden) {
          const prev = all.slice(0, i).filter((x) => x.title && !x.tocHidden).pop()
          if (!(prev && prev.title === p.title && prev.num === p.num)) entries.push({ key: p.id, href: `#${p.id}`, num: p.num || '·', title: p.title, sheet })
        }
        // secciones numeradas dentro de la misma hoja
        p.blocks.forEach((b, bi) => { if (b.type === 'sechead' && b.title) entries.push({ key: `${p.id}-s${bi}`, href: `#${p.id}`, num: b.num || '·', title: b.title, sheet }) })
      })
      return (
        <>
          <ul className="qv-toc">
            {entries.map((e) => (
              <li key={e.key}>
                <a href={e.href}>
                  <span className="n">{e.num}</span>
                  <span className="t">{e.title}</span>
                  <span className="d" />
                  <span className="p">{String(e.sheet).padStart(2, '0')}</span>
                </a>
              </li>
            ))}
          </ul>
          {block.note && <p className="qv-note" {...r('note')}>{block.note}</p>}
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
                  <h4 {...r(`items.${i}.role`)}>{member.role}</h4>
                  {member.dedication && <div className="tm-resp" {...r(`items.${i}.dedication`)}>{member.dedication}</div>}
                </div>
              </div>
              <ul className="tm-fns">
                {member.functions.map((f, k) => (f ? <li key={k} {...r(`items.${i}.functions.${k}`)}>{rich(f)}</li> : null))}
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
                <span className={`tl-lab ${tone(sg.tone)}`} key={i} {...r(`segments.${i}.label`)}>{sg.label}</span>
              ))}
            </div>
            <div className="tl-row tl-bars" style={{ gridTemplateColumns: cols }}>
              {segs.map((sg, i) => <span className={`tl-bar ${tone(sg.tone)}`} key={i} />)}
            </div>
            <div className="tl-row tl-marks" style={{ gridTemplateColumns: `${cols} 0` }}>
              {marks.map((m, i) => (
                <span className={`tl-mark${i === marks.length - 1 && marks.length > segs.length ? ' is-end' : ''}`} key={i} {...r(`marks.${i}`)}>{m}</span>
              ))}
            </div>
          </div>
          {block.note && <p className="qv-note" {...r('note')}>{rich(block.note)}</p>}
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
              {block.cols.map((c, i) => <span className="g-col" key={i} {...r(`cols.${i}`)}>{c}</span>)}
            </div>
            {block.rows.map((row, i) => (
              <div className="g-row" key={i}>
                <span className={`g-lab${row.bold ? ' is-bold' : ''}`} {...r(`rows.${i}.label`)}>{row.label}</span>
                {block.cols.map((_, c) => <span className="g-col" key={c} />)}
                <span
                  className={`g-bar ${tone(row.tone)}`}
                  style={{ gridColumn: `${Math.max(1, row.from) + 1} / ${Math.max(row.from, row.to) + 2}` }}
                />
              </div>
            ))}
          </div>
          {block.note && <p className="qv-note" {...r('note')}>{rich(block.note)}</p>}
        </>
      )
    }

    case 'grid': {
      const cells: DocBlock[][] = Array.isArray(block.cells) ? block.cells : []
      return (
        <div className={`qv-grid${block.gap === 'sm' ? ' gap-sm' : ''}`} style={{ gridTemplateColumns: `repeat(${Math.min(6, Math.max(2, block.cols || 2))}, minmax(0, 1fr))` }}>
          {cells.map((cell, ci) => (
            <div className="qv-grid-cell" key={ci} {...(bpath ? { 'data-cell': `${bpath}:${ci}` } : {})}>
              {cell.map((inner, ii) => (
                bpath ? (
                  <div className={`qv-block qv-block-nested${wrapperStyleClass(inner)}`} data-block={`${bpath}:${ci}:${ii}`} key={ii}>
                    <DocBlockView block={inner} items={items} totals={totals} money={money} pages={pages}
                      refBase={refBase ? `${refBase}.cells.${ci}.${ii}` : undefined} bpath={`${bpath}:${ci}:${ii}`} />
                  </div>
                ) : (
                  <div className={`qv-block${wrapperStyleClass(inner)}`} key={ii}><DocBlockView block={inner} items={items} totals={totals} money={money} pages={pages} /></div>
                )
              ))}
              {bpath && <button type="button" className="qv-cell-add" data-cell-add={`${bpath}:${ci}`}>＋ Elemento</button>}
            </div>
          ))}
        </div>
      )
    }

    case 'icon':
      return (
        <div className={`qv-icon tone-${block.color || 'navy'}`} style={al(block.align)}>
          <span className="qv-icon-glyph"><DynamicIcon name={block.name as never} size={block.size || 40} strokeWidth={1.75} /></span>
          {(block.label || refBase) && <span className="qv-icon-label" {...r('label')}>{block.label || ''}</span>}
        </div>
      )

    case 'button':
      return (
        <div className="qv-btnwrap" style={al(block.align)}>
          <a className={`qv-btn ${block.style || 'primary'}`} href={block.url || '#'} target="_blank" rel="noreferrer" {...r('label')}>{block.label}</a>
        </div>
      )

    case 'htimeline': {
      const items = block.items || []
      return (
        <div className="qv-htl" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
          {items.map((it, i) => (
            <div className={`qv-htl-item tone-${it.tone || 'cyan'}`} key={i}>
              <div className="qv-htl-dot">{block.numbered === false ? '' : i + 1}</div>
              {(it.date || refBase) && <div className="qv-htl-date" {...r(`items.${i}.date`)}>{it.date || ''}</div>}
              <div className="qv-htl-title" {...r(`items.${i}.title`)}>{rich(it.title)}</div>
              {(it.desc || refBase) && <div className="qv-htl-desc" {...r(`items.${i}.desc`)}>{rich(it.desc || '')}</div>}
            </div>
          ))}
        </div>
      )
    }

    case 'vtimeline': {
      const items = block.items || []
      return (
        <ol className="qv-vtl">
          {items.map((it, i) => (
            <li className={`qv-vtl-item tone-${it.tone || 'cyan'}`} key={i}>
              <div className="qv-vtl-dot">{block.numbered === false ? '' : i + 1}</div>
              <div className="qv-vtl-body">
                <div className="qv-vtl-head">
                  <span className="qv-vtl-title" {...r(`items.${i}.title`)}>{rich(it.title)}</span>
                  {(it.date || refBase) && <span className="qv-vtl-date" {...r(`items.${i}.date`)}>{it.date || ''}</span>}
                </div>
                {(it.desc || refBase) && <div className="qv-vtl-desc" {...r(`items.${i}.desc`)}>{rich(it.desc || '')}</div>}
              </div>
            </li>
          ))}
        </ol>
      )
    }

    case 'signature':
      return (
        <div className={`qv-sign${block.accept ? ' is-accept' : ''}`}>
          {block.accept && <div className="qv-sign-accept" {...r('note')}>{block.note || 'Aceptación de la propuesta'}</div>}
          <div className="qv-sign-line">
            {block.imageUrl
              ? <img src={block.imageUrl} alt="Firma" {...(refBase ? { 'data-img-ref': `${refBase}.imageUrl` } : {})} />
              : <span className="qv-sign-blank" title="Clic para subir la firma" {...(refBase ? { 'data-img-ref': `${refBase}.imageUrl` } : {})} />}
          </div>
          <div className="qv-sign-name" {...r('name')}>{block.name}</div>
          {(block.role || refBase) && <div className="qv-sign-role" {...r('role')}>{block.role || ''}</div>}
          {(block.org || refBase) && <div className="qv-sign-org" {...r('org')}>{block.org || ''}</div>}
          <div className="qv-sign-contact">
            {(block.email || refBase) && <span {...r('email')}>{block.email || ''}</span>}
            {block.email && block.phone ? ' · ' : ''}
            {(block.phone || refBase) && <span {...r('phone')}>{block.phone || ''}</span>}
          </div>
          {(block.place || block.date || refBase) && (
            <div className="qv-sign-when"><span {...r('place')}>{block.place || ''}</span>{block.place && block.date ? ', ' : ''}<span {...r('date')}>{block.date || ''}</span></div>
          )}
          {!block.accept && (block.note || refBase) && <div className="qv-sign-note" {...r('note')}>{block.note || ''}</div>}
        </div>
      )

    case 'diagram': {
      const widths = { full: '100%', wide: '80%', medium: '60%', narrow: '45%' }
      const w = widths[block.width || 'full']
      const margin = block.align === 'center' ? '0 auto' : block.align === 'right' ? '0 0 0 auto' : '0'
      return <div className="qv-dg-wrap" style={{ width: w, margin }}><Diagram block={block} r={r} /></div>
    }

    case 'spacer':
      return <div className="qv-spacer" style={{ height: Math.max(4, block.height || 24) }} aria-hidden="true">{refBase ? <span className="qv-spacer-tag">Espacio · {block.height || 24} px</span> : null}</div>

    case 'sechead':
      return (
        <div className="qv-sechead qv-sechead-inline">
          <div className="sn" {...r('num')}>{block.num || '—'}</div>
          <div>
            {(block.kicker || refBase) && <div className="kicker" {...r('kicker')}>{block.kicker || ''}</div>}
            <h2 {...r('title')}>{block.title}</h2>
          </div>
        </div>
      )

    case 'letterhead':
      return (
        <div className="qv-letterhead">
          {block.date && <p className="lh-date" {...r('date')}>{block.date}</p>}
          {block.addressee && <p className="lh-addr" {...r('addressee')}>{block.addressee}</p>}
          {block.subject && <p className="lh-subject"><b>Asunto:</b> <span {...r('subject')}>{block.subject}</span></p>}
          {block.salutation && <p className="lh-salutation" {...r('salutation')}>{block.salutation}</p>}
        </div>
      )

    default:
      return null
  }
}

/** Esquemas dibujados con CSS y SVG; cada texto lleva su referencia editable. */
function Diagram({ block, r }: { block: Extract<DocBlock, { type: 'diagram' }>; r: (field: string) => { 'data-ref'?: string } }) {
  const items = block.items || []
  const toneCls = (t?: string) => `tone-${t || 'cyan'}`
  /** Subniveles de un elemento, anidados; cada texto lleva su referencia. */
  const kids = (list: DiagramKid[] | undefined, prefix: string): React.ReactNode =>
    list && list.length ? (
      <ul>
        {list.map((c, k) => (
          typeof c === 'string'
            ? <li key={k} {...r(`${prefix}.${k}`)}>{rich(c)}</li>
            : <li key={k}><span {...r(`${prefix}.${k}.label`)}>{rich(c.label)}</span>{kids(c.children, `${prefix}.${k}.children`)}</li>
        ))}
      </ul>
    ) : null
  const title = (block.title || r('title')['data-ref']) ? <div className="qv-dg-title" {...r('title')}>{block.title || ''}</div> : null
  /** Caja redimensionable en el editor: ancho fijado por el autor y marca para capturar el arrastre. */
  const box = (i: number, extra?: React.CSSProperties) => ({ 'data-dg-item': String(i), style: { ...(extra || {}), ...(items[i]?.w ? { width: items[i].w } : {}) } })
  const centerBox = (extra?: React.CSSProperties) => ({ 'data-dg-center': '1', style: { ...(extra || {}), ...(block.centerW ? { width: block.centerW } : {}) } })
  const cols = (list: typeof items) => list.map((it) => (it.w ? `${it.w}px` : 'minmax(0, 1fr)')).join(' ') || 'minmax(0, 1fr)'

  if (block.kind === 'process') {
    return (
      <div className="qv-dg qv-dg-process">
        {title}
        <div className="qv-dg-steps" style={{ gridTemplateColumns: cols(items) }}>
          {items.map((it, i) => (
            <div className={`qv-dg-step ${toneCls(it.tone)}`} key={i} {...box(i)}>
              <div className="qv-dg-step-n">{i + 1}</div>
              <div className="qv-dg-step-l" {...r(`items.${i}.label`)}>{rich(it.label)}</div>
              {(it.desc || r('x')['data-ref']) && <div className="qv-dg-step-d" {...r(`items.${i}.desc`)}>{rich(it.desc || '')}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.kind === 'cycle') {
    const n = Math.max(1, items.length)
    const R = 118
    return (
      <div className="qv-dg qv-dg-cycle">
        {title}
        <div className="qv-dg-ring">
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle cx="160" cy="160" r={R} fill="none" stroke="#d3cab6" strokeWidth="2" strokeDasharray="6 6" />
            {items.map((_, i) => {
              const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2
              return <polygon key={i} points="0,-6 10,0 0,6" fill="#14b8c8" transform={`translate(${160 + Math.cos(a) * R} ${160 + Math.sin(a) * R}) rotate(${(a * 180) / Math.PI + 90})`} />
            })}
          </svg>
          {block.center !== undefined && (block.center || r('x')['data-ref']) && <div className="qv-dg-center" {...centerBox()} {...r('center')}>{rich(block.center || '')}</div>}
          {items.map((it, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2
            return (
              <div className={`qv-dg-node ${toneCls(it.tone)}`} key={i} {...box(i, { left: `${50 + Math.cos(a) * 37}%`, top: `${50 + Math.sin(a) * 37}%` })}>
                <b {...r(`items.${i}.label`)}>{rich(it.label)}</b>
                {it.desc && <span {...r(`items.${i}.desc`)}>{rich(it.desc)}</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (block.kind === 'pyramid') {
    const n = Math.max(1, items.length)
    return (
      <div className="qv-dg qv-dg-pyramid">
        {title}
        {items.map((it, i) => (
          <div className={`qv-dg-level ${toneCls(it.tone)}`} key={i} {...box(i, { width: `${40 + (60 * (i + 1)) / n}%` })}>
            <b {...r(`items.${i}.label`)}>{rich(it.label)}</b>
            {(it.desc || r('x')['data-ref']) && <span {...r(`items.${i}.desc`)}>{rich(it.desc || '')}</span>}
          </div>
        ))}
      </div>
    )
  }

  if (block.kind === 'matrix') {
    const ax = block.axes?.x || ['', '']
    const ay = block.axes?.y || ['', '']
    const q = [0, 1, 2, 3].map((i) => items[i] || { label: '', desc: '' })
    return (
      <div className="qv-dg qv-dg-matrix">
        {title}
        <div className="qv-dg-matrix-grid">
          <div className="qv-dg-axis-y"><span {...r('axes.y.0')}>{ay[0] || ''}</span><span {...r('axes.y.1')}>{ay[1] || ''}</span></div>
          <div className="qv-dg-quads">
            {q.map((it, i) => (
              <div className={`qv-dg-quad ${toneCls(items[i]?.tone)}`} key={i} {...box(i)}>
                <b {...r(`items.${i}.label`)}>{rich(it.label || '')}</b>
                <span {...r(`items.${i}.desc`)}>{rich(it.desc || '')}</span>
              </div>
            ))}
          </div>
          <div className="qv-dg-axis-x"><span {...r('axes.x.0')}>{ax[0] || ''}</span><span {...r('axes.x.1')}>{ax[1] || ''}</span></div>
        </div>
      </div>
    )
  }

  if (block.kind === 'mindmap' || block.kind === 'conceptmap') {
    const left = items.filter((_, i) => i % 2 === 0)
    const right = items.filter((_, i) => i % 2 === 1)
    const branch = (it: (typeof items)[number], i: number) => (
      <div className={`qv-dg-branch ${toneCls(it.tone)}`} key={i} {...box(i)}>
        <div className="qv-dg-branch-h">
          {block.kind === 'conceptmap' && (it.desc || r('x')['data-ref']) && <em className="qv-dg-link" {...r(`items.${i}.desc`)}>{it.desc || ''}</em>}
          <b {...r(`items.${i}.label`)}>{rich(it.label)}</b>
        </div>
        {kids(it.children, `items.${i}.children`)}
      </div>
    )
    return (
      <div className={`qv-dg qv-dg-map is-${block.kind}`}>
        {title}
        <div className="qv-dg-map-grid">
          <div className="qv-dg-side">{left.map((it) => branch(it, items.indexOf(it)))}</div>
          <div className="qv-dg-core" {...centerBox()} {...r('center')}>{rich(block.center || 'Idea central')}</div>
          <div className="qv-dg-side">{right.map((it) => branch(it, items.indexOf(it)))}</div>
        </div>
      </div>
    )
  }

  if (block.kind === 'synoptic') {
    return (
      <div className="qv-dg qv-dg-synoptic">
        <div className="qv-dg-syn-root" {...centerBox()} {...r('center')}>{rich(block.center || block.title || 'Tema')}</div>
        <div className="qv-dg-syn-brace" aria-hidden="true" />
        <div className="qv-dg-syn-groups">
          {items.map((it, i) => (
            <div className={`qv-dg-syn-group ${toneCls(it.tone)}`} key={i}>
              <b {...box(i)} {...r(`items.${i}.label`)}>{rich(it.label)}</b>
              {(it.children || []).length > 0 && (
                <>
                  <div className="qv-dg-syn-brace small" aria-hidden="true" />
                  {kids(it.children, `items.${i}.children`)}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // causa-efecto (espina de pescado)
  const top = items.filter((_, i) => i % 2 === 0)
  const bottom = items.filter((_, i) => i % 2 === 1)
  const bone = (it: (typeof items)[number], i: number) => (
    <div className={`qv-dg-bone ${toneCls(it.tone)}`} key={i} {...box(i)}>
      <b {...r(`items.${i}.label`)}>{rich(it.label)}</b>
      {kids(it.children, `items.${i}.children`)}
    </div>
  )
  return (
    <div className="qv-dg qv-dg-fish">
      {title}
      <div className="qv-dg-fish-row top" style={{ gridTemplateColumns: cols(top) }}>{top.map((it) => bone(it, items.indexOf(it)))}</div>
      <div className="qv-dg-spine"><span className="qv-dg-effect" {...centerBox()} {...r('center')}>{rich(block.center || 'Efecto')}</span></div>
      <div className="qv-dg-fish-row bottom" style={{ gridTemplateColumns: cols(bottom) }}>{bottom.map((it) => bone(it, items.indexOf(it)))}</div>
    </div>
  )
}

export function DocPageView({
  page,
  client,
  items,
  totals,
  money,
  pages = [],
  head,
  cobrand,
  pageIndex,
  headLeft,
  headRight,
  pageFooter,
}: {
  page: DocPage
  client: string
  items: QuoteItem[]
  totals: QuoteTotals
  money: (n: number) => string
  pages?: DocPage[]
  /** Índice en content.pages: activa las referencias editables de la página. */
  pageIndex?: number
  /** Textos de la cabecera corrida (content.labels.rheadLeft / rheadRight). */
  headLeft?: string
  headRight?: string
  /** Texto del pie de hoja antes del número (content.labels.pageFooter). */
  pageFooter?: string
  /** Línea superior de la hoja. Con cobranding lleva las dos marcas. */
  head?: string
  /** Marca del aliado en la cabecera corrida (versión para fondo claro). */
  cobrand?: { name?: string; logoDark?: string }
}) {
  const base = pageIndex !== undefined ? `content.pages.${pageIndex}` : undefined
  const ref = (field: string) => (base ? { 'data-ref': `${base}.${field}` } : {})
  return (
    <section className="qv-section" id={page.id} data-qsec={page.id} data-head={head || undefined} data-foot={pageFooter || 'Algoritmo T — pág.'}>
      <div className="qv-sheet-in">
      {base && <div className="qv-sfoot"><span data-ref="content.labels.pageFooter">{pageFooter || 'Algoritmo T — pág.'}</span> <b /></div>}
      <div className="qv-rhead">
        <span className="r-l" {...(base ? { 'data-ref': 'content.labels.rheadLeft' } : {})}>{headLeft || `Propuesta · ${client}`}</span>
        <span className="r-r">
          <span {...(base ? { 'data-ref': 'content.labels.rheadRight' } : {})}>{headRight || 'Algoritmo\u00a0T'}</span>
          {cobrand && (cobrand.logoDark || cobrand.name) && (
            <>
              <i className="cb-sep" aria-hidden="true" />
              {cobrand.logoDark
                ? <img className="cb-logo" src={cobrand.logoDark} alt={cobrand.name || 'Aliado'} {...(base ? { 'data-img-ref': 'content.cobrand.logoDark' } : {})} />
                : <span {...(base ? { 'data-ref': 'content.cobrand.name' } : {})}>{cobrand.name}</span>}
            </>
          )}
        </span>
      </div>
      {(page.title || page.kicker) && (
        <div className="qv-sechead">
          <div className="sn" {...ref('num')}>{page.num || '—'}</div>
          <div>
            {page.kicker && <div className="kicker" {...ref('kicker')}>{page.kicker}</div>}
            {page.title && <h2 {...ref('title')}>{page.title}</h2>}
          </div>
          {base && <button type="button" className="qv-page-add qv-page-add-top" data-page-add={`${pageIndex}:-1`} title="Agregar un elemento al inicio de la página">＋</button>}
        </div>
      )}
      {base && !(page.title || page.kicker) && <button type="button" className="qv-page-add" data-page-add={`${pageIndex}:-1`}>＋ Agregar elemento al inicio</button>}
      {page.blocks.map((block, i) => (
        base ? (
          <div className={`qv-block${wrapperStyleClass(block)}`} data-block={`${pageIndex}:${i}`} key={i}>
            <DocBlockView block={block} items={items} totals={totals} money={money} pages={pages} refBase={`${base}.blocks.${i}`} bpath={`${pageIndex}:${i}`} />
          </div>
        ) : wrapperStyleClass(block) ? (
          <div className={`qv-block${wrapperStyleClass(block)}`} key={i}>
            <DocBlockView block={block} items={items} totals={totals} money={money} pages={pages} />
          </div>
        ) : (
          <DocBlockView key={i} block={block} items={items} totals={totals} money={money} pages={pages} />
        )
      ))}
      {base && <button type="button" className="qv-page-add" data-page-add={`${pageIndex}:${page.blocks.length - 1}`}>＋ Agregar elemento{page.blocks.length ? ' al final' : ''}</button>}
      </div>
    </section>
  )
}
