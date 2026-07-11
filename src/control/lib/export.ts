import * as XLSX from 'xlsx'
import type { PcCellValue, PcColumn, PcRow } from './types'

function cellToExcel(v: PcCellValue, col: PcColumn): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (col.type === 'checkbox') return v === true
  if (col.type === 'number') return typeof v === 'number' ? v : Number(v) || ''
  return String(v)
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Hoja'
  let n = base
  let i = 2
  while (used.has(n.toLowerCase())) n = `${base} ${i++}`.slice(0, 31)
  used.add(n.toLowerCase())
  return n
}

/** Exporta un tablero a .xlsx: hoja "Tablero" + "Datos de entrada" (+ hojas de metadatos). */
export function exportBoardToExcel(board: { title: string; columns: PcColumn[]; rows: PcRow[] }) {
  const { title, columns, rows } = board
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()

  // Hoja "Tablero"
  const headers = columns.map((c) => c.name)
  const aoa: (string | number | boolean)[][] = [headers, ...rows.map((r) => columns.map((c) => cellToExcel(r.cells[c.id], c)))]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), safeSheetName('Tablero', used))

  // Hoja "Datos de entrada": una columna por categoría (columna select)
  const selects = columns.filter((c) => c.type === 'select')
  if (selects.length) {
    const maxLen = Math.max(...selects.map((c) => c.options?.length || 0), 0)
    const deHeaders = selects.map((c) => c.name)
    const deRows: string[][] = []
    for (let i = 0; i < maxLen; i++) deRows.push(selects.map((c) => c.options?.[i]?.value || ''))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([deHeaders, ...deRows]), safeSheetName('Datos de entrada', used))

    // Hoja de metadatos por categoría (si tiene campos definidos)
    for (const c of selects) {
      const fields = c.optionFields || []
      if (!fields.length) continue
      const hdr = ['Valor', ...fields.map((f) => f.label)]
      const body = (c.options || []).map((o) => [o.value, ...fields.map((f) => o.meta?.[f.id] || '')])
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([hdr, ...body]), safeSheetName(c.name, used))
    }
  }

  XLSX.writeFile(wb, `${(title || 'tablero').replace(/[\\/?*[\]:]/g, ' ').slice(0, 80)}.xlsx`)
}
