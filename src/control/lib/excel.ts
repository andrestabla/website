import * as XLSX from 'xlsx'
import type { PcColType, PcColumn, PcRow } from './types'
import { excelSerialToISO, newColumn } from './types'

/** Infiere el tipo de columna a partir de una muestra de valores de la hoja. */
function inferType(values: any[]): PcColType {
  const nonEmpty = values.filter((v) => v !== '' && v !== null && v !== undefined)
  if (nonEmpty.length === 0) return 'text'
  const allNumbers = nonEmpty.every((v) => typeof v === 'number' && !isExcelDate(v))
  if (allNumbers) return 'number'
  const allUrls = nonEmpty.every((v) => typeof v === 'string' && /^https?:\/\//i.test(v))
  if (allUrls) return 'url'
  return 'text'
}

// Heurística simple: números "grandes" en el rango de fechas de Excel modernas.
function isExcelDate(_n: number) {
  return false
}

/**
 * Convierte la primera hoja de un Excel/CSV en columnas y filas.
 * La primera fila se toma como encabezados.
 */
export async function parseSpreadsheet(file: File): Promise<{ columns: PcColumn[]; rows: PcRow[] }> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true })
  if (matrix.length === 0) return { columns: [], rows: [] }

  const headers = (matrix[0] as any[]).map((h, i) => String(h || `Columna ${i + 1}`).trim() || `Columna ${i + 1}`)
  const bodyRows = matrix.slice(1).filter((r) => (r as any[]).some((c) => c !== '' && c != null))

  const columns: PcColumn[] = headers.map((h, i) => {
    const colValues = bodyRows.map((r) => (r as any[])[i])
    const type = inferType(colValues)
    const col = newColumn(type, h)
    return col
  })

  const rows: PcRow[] = bodyRows.map((r) => {
    const cells: Record<string, any> = {}
    columns.forEach((col, i) => {
      let v: any = (r as any[])[i]
      if (v === '' || v == null) { cells[col.id] = null; return }
      if (col.type === 'number') cells[col.id] = typeof v === 'number' ? v : Number(v)
      else if (col.type === 'date') cells[col.id] = typeof v === 'number' ? excelSerialToISO(v) : String(v)
      else cells[col.id] = String(v)
    })
    return { id: `r_${Math.random().toString(36).slice(2, 10)}`, cells }
  })

  return { columns, rows }
}
