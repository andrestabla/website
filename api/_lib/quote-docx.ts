/**
 * Genera el .docx de una cotización a partir de sus páginas (content.pages),
 * de modo que el Word siempre diga lo mismo que la vista online. Conserva la
 * línea gráfica: lockup Algoritmo T, navy en títulos, dorado en antetítulos,
 * tablas con cabecera oscura, fichas de fase y capturas embebidas.
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, Header, Footer,
  PageNumber, TabStopType, TabStopPosition,
} from 'docx'

const NAVY = '1A2D5A'
const CYAN = '0B6F88'
const GOLD = 'A87A14'
const INK = '1B2026'
const MUTED = '6F7680'
const LINE = 'E3DDCE'
const PAPER = 'F7F4EE'
const FONT = 'Inter'
const MARK_URL = '/assets/algoritmot-mark.png'


/** Quita las marcas de formato del texto plano (**, *, `, [x](y)). */
const plain = (t: string) =>
  String(t || '')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

/** Convierte **negrita** y *cursiva* en runs con formato. */
function runs(text: string, opts: { size?: number; color?: string; bold?: boolean } = {}) {
  const size = opts.size ?? 21
  const out: TextRun[] = []
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g)
  for (const p of parts) {
    if (!p) continue
    if (p.startsWith('**') && p.endsWith('**')) {
      out.push(new TextRun({ text: p.slice(2, -2), bold: true, size, color: opts.color ?? INK, font: FONT }))
    } else if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      out.push(new TextRun({ text: p.slice(1, -1), italics: true, size, color: opts.color ?? INK, font: FONT }))
    } else if (p.startsWith('`') && p.endsWith('`')) {
      out.push(new TextRun({ text: p.slice(1, -1), size: size - 1, color: CYAN, font: 'JetBrains Mono' }))
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p)
      out.push(new TextRun({
        text: link ? link[1] : p,
        size, bold: opts.bold, color: link ? CYAN : (opts.color ?? INK), font: FONT,
      }))
    }
  }
  return out
}

const P = (text: string, o: { size?: number; color?: string; bold?: boolean; after?: number; align?: any } = {}) =>
  new Paragraph({
    children: runs(text, o),
    spacing: { after: o.after ?? 130, line: 300 },
    alignment: o.align,
  })

const cellPara = (text: string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
  new Paragraph({ children: runs(text, { size: o.size ?? 19, bold: o.bold, color: o.color }), spacing: { before: 60, after: 60, line: 280 } })

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}
const hairline = { style: BorderStyle.SINGLE, size: 2, color: LINE }

/* ── Bloques → párrafos de Word ─────────────────────────────────────────── */
function blockToDocx(b: any, assets: Map<string, Buffer>): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  switch (b.type) {
    case 'lede':
      plain(b.text).split(/\n{2,}/).forEach((t: string) =>
        out.push(P(t, { size: 23, color: '3B424B', after: 160 })))
      break

    case 'p':
      String(b.text || '').split(/\n{2,}/).forEach((para: string) => {
        const lines = para.split('\n')
        const bullets = lines.every((l) => /^\s*[-·•]\s+/.test(l))
        if (bullets) {
          lines.forEach((l) =>
            out.push(new Paragraph({
              children: runs(l.replace(/^\s*[-·•]\s+/, '')),
              bullet: { level: 0 }, spacing: { after: 70, line: 290 },
            })))
        } else {
          lines.forEach((l, i) => out.push(P(l, { after: i === lines.length - 1 ? 130 : 20 })))
        }
      })
      break

    case 'h3':
      out.push(new Paragraph({
        children: runs(plain(b.text), { size: 24, bold: true, color: NAVY }),
        spacing: { before: 200, after: 90 }, keepNext: true,
      }))
      break

    case 'list':
      b.items.filter(Boolean).forEach((it: string) =>
        out.push(new Paragraph({ children: runs(it), bullet: { level: 0 }, spacing: { after: 70, line: 290 } })))
      break

    case 'box':
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 18, color: GOLD } },
        rows: [new TableRow({
          children: [new TableCell({
            shading: { type: ShadingType.CLEAR, fill: PAPER },
            margins: { top: 160, bottom: 160, left: 220, right: 200 },
            children: [
              ...(b.title ? [new Paragraph({ children: runs(plain(b.title), { size: 18, bold: true, color: GOLD }), spacing: { after: 70 } })] : []),
              ...plain(b.body).split(/\n{2,}/).map((t: string) => P(t, { size: 20, after: 60 })),
            ],
          })],
        })],
      }))
      out.push(new Paragraph({ text: '', spacing: { after: 130 } }))
      break

    case 'note':
      out.push(P(plain(b.text), { size: 17, color: MUTED, after: 150 }))
      break

    case 'table': {
      const headers: string[] = b.headers || []
      const rows: string[][] = b.rows || []
      const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1)
      const trs: TableRow[] = []
      if (headers.length) {
        trs.push(new TableRow({
          tableHeader: true,
          children: Array.from({ length: cols }, (_, i) => new TableCell({
            shading: { type: ShadingType.CLEAR, fill: NAVY },
            margins: { top: 90, bottom: 90, left: 130, right: 130 },
            children: [cellPara(plain(headers[i] || ''), { bold: true, color: 'FFFFFF', size: 17 })],
          })),
        }))
      }
      rows.forEach((r, ri) => trs.push(new TableRow({
        children: Array.from({ length: cols }, (_, ci) => new TableCell({
          shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: PAPER } : undefined,
          margins: { top: 90, bottom: 90, left: 130, right: 130 },
          children: [cellPara(plain(r[ci] || ''), ci === 0 && b.firstCol !== 'plain' ? { bold: true } : {})],
        })),
      })))
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: hairline, bottom: hairline, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
        rows: trs,
      }))
      out.push(new Paragraph({ text: '', spacing: { after: 150 } }))
      break
    }

    case 'cards':
      b.items.forEach((c: any) => {
        out.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { ...noBorders, top: { style: BorderStyle.SINGLE, size: 12, color: CYAN }, bottom: hairline, left: hairline, right: hairline },
          rows: [new TableRow({
            children: [new TableCell({
              margins: { top: 140, bottom: 140, left: 200, right: 200 },
              children: [
                ...(c.tag ? [new Paragraph({ children: runs(plain(c.tag), { size: 16, bold: true, color: GOLD }), spacing: { after: 50 } })] : []),
                new Paragraph({ children: runs(plain(c.title), { size: 22, bold: true, color: NAVY }), spacing: { after: 70 } }),
                ...plain(c.body).split(/\n{2,}/).map((t: string) => P(t, { size: 19, after: 50 })),
                ...(c.foot ? [P(plain(c.foot), { size: 18, color: CYAN, after: 0 })] : []),
              ],
            })],
          })],
        }))
        out.push(new Paragraph({ text: '', spacing: { after: 110 } }))
      })
      break

    case 'phase': {
      const defs: any[] = b.defs || []
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: hairline, bottom: hairline, left: hairline, right: hairline, insideHorizontal: noBorders.top, insideVertical: noBorders.left },
        rows: [
          new TableRow({
            children: [new TableCell({
              columnSpan: 2, shading: { type: ShadingType.CLEAR, fill: PAPER },
              margins: { top: 120, bottom: 100, left: 180, right: 180 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: `${plain(b.id)}  `, bold: true, size: 18, color: CYAN, font: 'JetBrains Mono' }),
                  new TextRun({ text: plain(b.name), bold: true, size: 23, color: INK, font: FONT }),
                  ...(b.when ? [new TextRun({ text: `\t${plain(b.when)}`, size: 17, color: GOLD, font: 'JetBrains Mono' })] : []),
                ],
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              })],
            })],
          }),
          ...defs.map((d) => new TableRow({
            children: [
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 180, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: plain(d.term).toUpperCase(), size: 15, color: MUTED, font: 'JetBrains Mono' })] })],
              }),
              new TableCell({
                margins: { top: 80, bottom: 80, left: 60, right: 180 },
                children: [cellPara(plain(d.desc), d.strong ? { color: CYAN } : {})],
              }),
            ],
          })),
        ],
      }))
      out.push(new Paragraph({ text: '', spacing: { after: 130 } }))
      break
    }

    case 'img': {
      const data = assets.get(String(b.url || ''))
      if (data) {
        out.push(new Paragraph({
          children: [new ImageRun({ data, transformation: { width: 600, height: Math.round(600 * ratioOf(data)) } } as any)],
          alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
        }))
        if (b.caption) out.push(P(plain(b.caption), { size: 16, color: MUTED, align: AlignmentType.CENTER, after: 170 }))
      }
      break
    }

    case 'timeline':
      out.push(P((b.segments || []).map((sg: any) => plain(sg.label)).join('  ·  '), { size: 18, bold: true, color: CYAN, after: 50 }))
      out.push(P((b.marks || []).join('  →  '), { size: 17, color: MUTED, after: 150 }))
      if (b.note) out.push(P(plain(b.note), { size: 17, color: MUTED }))
      break

    case 'gantt': {
      const rows: any[] = b.rows || []
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: hairline, bottom: hairline, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, fill: NAVY }, margins: { top: 80, bottom: 80, left: 130, right: 130 }, children: [cellPara('Fase', { bold: true, color: 'FFFFFF', size: 17 })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, fill: NAVY }, margins: { top: 80, bottom: 80, left: 130, right: 130 }, children: [cellPara('Periodo', { bold: true, color: 'FFFFFF', size: 17 })] }),
            ],
          }),
          ...rows.map((r) => new TableRow({
            children: [
              new TableCell({ margins: { top: 70, bottom: 70, left: 130, right: 130 }, children: [cellPara(plain(r.label), r.bold ? { bold: true, color: GOLD } : {})] }),
              new TableCell({ margins: { top: 70, bottom: 70, left: 130, right: 130 }, children: [cellPara(rangeLabel(b.cols || [], r.from, r.to), { color: MUTED })] }),
            ],
          })),
        ],
      }))
      out.push(new Paragraph({ text: '', spacing: { after: 120 } }))
      if (b.note) out.push(P(plain(b.note), { size: 17, color: MUTED, after: 150 }))
      break
    }

    case 'letterhead':
      if (b.date) out.push(P(plain(b.date), { size: 18, color: MUTED, after: 200 }))
      if (b.addressee) String(b.addressee).split('\n').forEach((l: string, i: number) =>
        out.push(P(l, { after: 20, bold: i === 1 })))
      if (b.subject) out.push(new Paragraph({
        children: [new TextRun({ text: 'Asunto: ', bold: true, size: 21, font: FONT }), ...runs(plain(b.subject))],
        spacing: { before: 200, after: 180, line: 300 },
      }))
      if (b.salutation) out.push(P(plain(b.salutation), { after: 170 }))
      break

    case 'team':
      (b.items || []).forEach((m: any) => {
        out.push(new Paragraph({
          children: [
            new TextRun({ text: plain(m.role), bold: true, size: 22, color: NAVY, font: FONT }),
            ...(m.dedication ? [new TextRun({ text: `\t${plain(m.dedication)}`, size: 17, color: MUTED, font: 'JetBrains Mono' })] : []),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 160, after: 60 }, keepNext: true,
        }))
        ;(m.functions || []).filter(Boolean).forEach((f: string) =>
          out.push(new Paragraph({ children: runs(plain(f), { size: 19 }), bullet: { level: 0 }, spacing: { after: 50, line: 285 } })))
      })
      out.push(new Paragraph({ text: '', spacing: { after: 120 } }))
      break

    case 'payments':
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: hairline, bottom: hairline, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
        rows: (b.items || []).map((p: any) => new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, margins: { top: 110, bottom: 110, left: 130, right: 100 }, children: [cellPara(plain(p.pct), { bold: true, color: CYAN, size: 24 })] }),
            new TableCell({ margins: { top: 110, bottom: 110, left: 60, right: 130 }, children: [cellPara(plain(p.label))] }),
          ],
        })),
      }))
      out.push(new Paragraph({ text: '', spacing: { after: 150 } }))
      break

    case 'toc':
      // el índice se arma más abajo con los títulos reales de las páginas
      break

    default:
      break
  }
  return out
}

function rangeLabel(cols: string[], from: number, to: number) {
  const a = cols[Math.max(0, (from || 1) - 1)] || ''
  const b = cols[Math.max(0, (to || 1) - 1)] || ''
  return a === b ? a : `${a} – ${b}`
}

/** Proporción alto/ancho de un PNG, leída de su cabecera. */
function ratioOf(buf: Buffer): number {
  try {
    if (buf.slice(1, 4).toString() === 'PNG') {
      const w = buf.readUInt32BE(16)
      const h = buf.readUInt32BE(20)
      if (w && h) return h / w
    }
  } catch { /* proporción por defecto */ }
  return 0.55
}



/* ── Documento completo ─────────────────────────────────────────────────── */

export type DocxQuote = {
  title: string
  subtitle?: string | null
  clientName: string
  validDays?: number
  totalFinal: number
  content: any
  pricing: any
}

const money = (n: number) => `$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

/** Descarga las imágenes del documento (capturas y marca) desde el propio sitio. */
async function loadAssets(urls: string[], baseUrl: string): Promise<Map<string, Buffer>> {
  const map = new Map<string, Buffer>()
  await Promise.all(urls.map(async (u) => {
    try {
      const res = await fetch(new URL(u, baseUrl).toString())
      if (res.ok) map.set(u, Buffer.from(await res.arrayBuffer()))
    } catch { /* una captura ausente no debe romper el documento */ }
  }))
  return map
}

export async function buildQuoteDocx(quote: DocxQuote, baseUrl: string): Promise<Buffer> {
  const content = quote.content || {}
  const pages: any[] = content.pages || []
  const items: any[] = quote.pricing?.items || []

  const imgUrls = pages.flatMap((p: any) => (p.blocks || []).filter((b: any) => b.type === 'img').map((b: any) => String(b.url)))
  const assets = await loadAssets([...new Set([...imgUrls, MARK_URL])], baseUrl)
  const markPng = assets.get(MARK_URL) || null

  const brandRun = (size: number) => ([
    new TextRun({ text: 'ALGORITMO', bold: true, size, color: NAVY, font: 'JetBrains Mono' }),
    ...(markPng
      ? [new ImageRun({ data: markPng, transformation: { width: size / 1.6, height: size / 1.6 } } as any)]
      : [new TextRun({ text: '  T', bold: true, size, color: GOLD, font: 'JetBrains Mono' })]),
  ])

  const body: (Paragraph | Table)[] = []

  /* Portada */
  body.push(new Paragraph({ children: brandRun(26), spacing: { after: 1200 } }))
  body.push(P('PROPUESTA TÉCNICA Y ECONÓMICA', { size: 18, bold: true, color: GOLD, after: 140 }))
  body.push(new Paragraph({ children: [new TextRun({ text: quote.title, bold: true, size: 52, color: NAVY, font: FONT })], spacing: { after: 260 } }))
  if (quote.subtitle) body.push(P(quote.subtitle, { size: 22, color: MUTED, after: 400 }))
  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: hairline, bottom: hairline, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
    rows: [
      ['Cliente', quote.clientName],
      ['Inversión', `${money(quote.totalFinal)} COP`],
      ['Validez', `${quote.validDays ?? 30} días`],
    ].map(([k, v]) => new TableRow({
      children: [
        new TableCell({ width: { size: 26, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 0, right: 120 }, children: [cellPara(k, { color: MUTED, size: 17 })] }),
        new TableCell({ margins: { top: 100, bottom: 100, left: 0, right: 0 }, children: [cellPara(v, { bold: true })] }),
      ],
    })),
  }))

  /* Páginas */
  pages.forEach((pg: any) => {
    body.push(new Paragraph({ text: '', pageBreakBefore: true }))
    if (pg.kicker || pg.title) {
      body.push(new Paragraph({
        children: [
          ...(pg.num && pg.num !== '—' ? [new TextRun({ text: `${pg.num}  `, bold: true, size: 30, color: GOLD, font: 'JetBrains Mono' })] : []),
          ...(pg.kicker ? [new TextRun({ text: String(pg.kicker).toUpperCase(), size: 17, color: CYAN, font: 'JetBrains Mono' })] : []),
        ],
        spacing: { after: 60 },
      }))
      body.push(new Paragraph({
        children: [new TextRun({ text: pg.title || '', bold: true, size: 34, color: NAVY, font: FONT })],
        spacing: { after: 200 }, heading: HeadingLevel.HEADING_1,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
      }))
    }
    ;(pg.blocks || []).forEach((b: any) => {
      if (b.type === 'toc') {
        const entries = pages.filter((p: any, k: number, all: any[]) => {
          if (!p.title || p.tocHidden) return false
          const prev = all.slice(0, k).filter((x: any) => x.title && !x.tocHidden).pop()
          return !(prev && prev.title === p.title && prev.num === p.num)
        })
        body.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: noBorders.top, bottom: noBorders.bottom, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
          rows: entries.map((e: any) => new TableRow({
            children: [
              new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, margins: { top: 90, bottom: 90, left: 0, right: 60 }, children: [cellPara(e.num || '·', { bold: true, color: CYAN, size: 17 })] }),
              new TableCell({ margins: { top: 90, bottom: 90, left: 0, right: 60 }, children: [cellPara(e.title, { bold: true })] }),
              new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, margins: { top: 90, bottom: 90, left: 0, right: 0 }, children: [cellPara(String(pages.indexOf(e) + 2), { color: MUTED, size: 17 })] }),
            ],
          })),
        }))
        body.push(new Paragraph({ text: '', spacing: { after: 150 } }))
        return
      }
      if (b.type === 'invoice') {
        body.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: hairline, bottom: hairline, left: noBorders.left, right: noBorders.right, insideHorizontal: hairline, insideVertical: noBorders.left },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ shading: { type: ShadingType.CLEAR, fill: NAVY }, margins: { top: 90, bottom: 90, left: 130, right: 130 }, children: [cellPara('Concepto', { bold: true, color: 'FFFFFF', size: 17 })] }),
                new TableCell({ shading: { type: ShadingType.CLEAR, fill: NAVY }, margins: { top: 90, bottom: 90, left: 130, right: 130 }, children: [cellPara('Valor COP', { bold: true, color: 'FFFFFF', size: 17 })] }),
              ],
            }),
            ...items.map((it: any) => new TableRow({
              children: [
                new TableCell({
                  margins: { top: 110, bottom: 110, left: 130, right: 130 },
                  children: [cellPara(it.name, { bold: true }), ...(it.summary ? [cellPara(it.summary, { color: MUTED, size: 17 })] : [])],
                }),
                new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, margins: { top: 110, bottom: 110, left: 130, right: 130 }, children: [cellPara(money(it.price), { bold: true })] }),
              ],
            })),
            new TableRow({
              children: [
                new TableCell({ margins: { top: 130, bottom: 130, left: 130, right: 130 }, children: [cellPara('Valor total de la propuesta', { bold: true, size: 24, color: NAVY })] }),
                new TableCell({ margins: { top: 130, bottom: 130, left: 130, right: 130 }, children: [cellPara(money(quote.totalFinal), { bold: true, size: 26, color: NAVY })] }),
              ],
            }),
          ],
        }))
        body.push(new Paragraph({ text: '', spacing: { after: 140 } }))
        if (b.note) body.push(P(plain(b.note), { size: 17, color: MUTED, after: 160 }))
        return
      }
      blockToDocx(b, assets).forEach((el) => body.push(el))
    })
  })

  /* Contraportada */
  const sig = content.signature || {}
  body.push(new Paragraph({ text: '', pageBreakBefore: true }))
  body.push(new Paragraph({ children: brandRun(24), spacing: { after: 400 } }))
  body.push(new Paragraph({
    children: [new TextRun({ text: plain(content.backQuote || 'Gracias.'), bold: true, size: 34, color: NAVY, font: FONT })],
    spacing: { after: 200 },
  }))
  body.push(P('Soluciones digitales con sentido humano', { size: 18, bold: true, color: GOLD, after: 300 }))
  body.push(P(sig.name || '', { bold: true, after: 20 }))
  body.push(P(sig.role || '', { size: 19, color: MUTED, after: 20 }))
  body.push(P(`${sig.email || ''} · ${sig.phone || ''}`, { size: 19, color: MUTED, after: 20 }))
  body.push(P('www.algoritmot.com', { size: 19, color: CYAN }))

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21, color: '333840' }, paragraph: { spacing: { line: 300 } } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `Propuesta · ${quote.clientName}`, size: 15, color: MUTED, font: 'JetBrains Mono' }),
              new TextRun({ text: '\tALGORITMO T', size: 15, color: NAVY, font: 'JetBrains Mono', bold: true }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: LINE, space: 6 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'Algoritmo T', size: 14, color: MUTED, font: 'JetBrains Mono' }),
              new TextRun({ text: '\tpág. ', size: 14, color: MUTED, font: 'JetBrains Mono' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED, font: 'JetBrains Mono' }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          })],
        }),
      },
      children: body,
    }],
  })

  return Packer.toBuffer(doc) as unknown as Promise<Buffer>
}
