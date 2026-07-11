import type { ReactNode } from 'react'

/** Render inline: **negrita**, *itálica*, `código`, [texto](url). */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] != null) nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[2]}</strong>)
    else if (m[3] != null) nodes.push(<code key={`${keyPrefix}-c${i}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]">{m[3]}</code>)
    else if (m[4] != null) nodes.push(<a key={`${keyPrefix}-a${i}`} href={m[5]} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{m[4]}</a>)
    else if (m[6] != null) nodes.push(<em key={`${keyPrefix}-i${i}`}>{m[6]}</em>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Renderizador Markdown mínimo (títulos, listas, tablas, párrafos) para los informes. */
export function Markdown({ text }: { text: string }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  const isTableSep = (s: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s)
  const splitRow = (s: string) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    // Título
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const cls = level === 1 ? 'text-2xl font-black text-[#12203a] mt-6 mb-2' : level === 2 ? 'text-lg font-bold text-[#1b3a86] border-l-[3px] border-indigo-600 pl-2.5 mt-6 mb-2' : 'text-[15px] font-bold text-slate-800 mt-4 mb-1.5'
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as any
      blocks.push(<Tag key={key++} className={cls}>{inline(h[2], `h${key}`)}</Tag>)
      i++
      continue
    }

    // Regla horizontal
    if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={key++} className="my-4 border-slate-200" />); i++; continue }

    // Tabla
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(splitRow(lines[i])); i++ }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-500">{header.map((c, j) => <th key={j} className="border-b border-slate-200 py-1.5 pr-3">{inline(c, `th${key}-${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-b border-slate-100">{r.map((c, j) => <td key={j} className="py-1.5 pr-3 align-top">{inline(c, `td${key}-${ri}-${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    // Lista (viñetas o numerada)
    const bullet = /^\s*([-*+])\s+(.*)$/.exec(line)
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (bullet || ordered) {
      const isOrdered = !!ordered
      const items: string[] = []
      while (i < lines.length) {
        const b = /^\s*([-*+])\s+(.*)$/.exec(lines[i])
        const o = /^\s*\d+\.\s+(.*)$/.exec(lines[i])
        if (isOrdered && o) items.push(o[1])
        else if (!isOrdered && b) items.push(b[2])
        else break
        i++
      }
      const ListTag = (isOrdered ? 'ol' : 'ul') as any
      blocks.push(
        <ListTag key={key++} className={`my-2 space-y-1 pl-5 text-[13.5px] leading-relaxed text-slate-700 ${isOrdered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => <li key={j}>{inline(it, `li${key}-${j}`)}</li>)}
        </ListTag>
      )
      continue
    }

    // Párrafo (agrupa líneas contiguas)
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*+]\s|\s*\d+\.\s|\s*(-{3,}|_{3,})\s*$)/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      para.push(lines[i]); i++
    }
    blocks.push(<p key={key++} className="my-2 text-[13.5px] leading-relaxed text-slate-700">{inline(para.join(' '), `p${key}`)}</p>)
  }

  return <div className="markdown">{blocks}</div>
}
