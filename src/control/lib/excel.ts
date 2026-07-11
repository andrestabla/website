import * as XLSX from 'xlsx'
import type { PcColType, PcColumn, PcRow } from './types'
import { excelSerialToISO, newColumn, newOptionField, PC_OPTION_COLORS } from './types'

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

// ── Importar / actualizar "Datos de entrada" desde Excel ─────────────────────

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

function nameMatches(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return false
  return na === nb || na.startsWith(nb) || nb.startsWith(na)
}

export type DatosImportSummary = { categories: number; options: number; fields: number; matchedCategories: string[] }

/**
 * Actualiza las categorías (columnas select) y sus entradas a partir de un Excel.
 * - La hoja "Datos de entrada" (o la primera si no existe): cada columna es una
 *   categoría; sus valores se agregan como opciones. Si la hoja se llama "datos de
 *   entrada", las categorías que no existan se crean; si es un fallback, solo se
 *   actualizan las categorías ya existentes.
 * - Cualquier hoja cuyo primer encabezado sea "Valor" se toma como tabla de
 *   metadatos de la categoría con ese nombre: las demás columnas son campos de
 *   metadatos y cada fila asigna value → metadatos.
 * Merge NO destructivo: nunca elimina opciones ni campos existentes.
 */
export function importDatosEntradaFromWorkbook(
  wbData: ArrayBuffer | Uint8Array,
  currentColumns: PcColumn[]
): { columns: PcColumn[]; summary: DatosImportSummary } {
  const wb = XLSX.read(wbData, { type: wbData instanceof Uint8Array ? 'buffer' : 'array' })
  const cols: PcColumn[] = currentColumns.map((c) => ({
    ...c,
    options: c.options ? c.options.map((o) => ({ ...o, meta: o.meta ? { ...o.meta } : undefined })) : c.options,
    optionFields: c.optionFields ? [...c.optionFields] : c.optionFields,
  }))
  const summary: DatosImportSummary = { categories: 0, options: 0, fields: 0, matchedCategories: [] }

  const findSelect = (name: string) => cols.find((c) => c.type === 'select' && nameMatches(c.name, name))
  const ensureSelect = (name: string): PcColumn => {
    let c = findSelect(name)
    if (!c) {
      c = newColumn('select', name.trim() || 'Categoría')
      cols.push(c)
      summary.categories++
    }
    if (!c.options) c.options = []
    if (!c.optionFields) c.optionFields = []
    if (!summary.matchedCategories.includes(c.name)) summary.matchedCategories.push(c.name)
    return c
  }
  const addOption = (c: PcColumn, value: string) => {
    let opt = c.options!.find((o) => o.value === value)
    if (!opt) {
      opt = { value, color: PC_OPTION_COLORS[c.options!.length % PC_OPTION_COLORS.length] }
      c.options!.push(opt)
      summary.options++
    }
    return opt
  }

  // Hoja de opciones
  const optionsSheetName =
    wb.SheetNames.find((n) => norm(n).includes('datos de entrada') || norm(n).includes('entrada')) || wb.SheetNames[0]
  const createMissing = optionsSheetName ? norm(optionsSheetName).includes('entrada') : false

  if (optionsSheetName) {
    const aoa = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[optionsSheetName], { header: 1, defval: '', raw: true })
    const headers = (aoa[0] as any[]) || []
    headers.forEach((h, ci) => {
      const name = String(h ?? '').trim()
      if (!name) return
      const target = createMissing ? ensureSelect(name) : findSelect(name)
      if (!target) return // fallback: no crear categorías desde una hoja que no es "Datos de entrada"
      if (!target.options) target.options = []
      if (!summary.matchedCategories.includes(target.name)) summary.matchedCategories.push(target.name)
      const seen = new Set(target.options.map((o) => o.value))
      for (let r = 1; r < aoa.length; r++) {
        const v = String((aoa[r] as any[])?.[ci] ?? '').trim()
        if (v && !seen.has(v)) { seen.add(v); addOption(target, v) }
      }
    })
  }

  // Hojas de metadatos (primer encabezado = "Valor")
  for (const sheetName of wb.SheetNames) {
    if (sheetName === optionsSheetName) continue
    const aoa = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1, defval: '', raw: true })
    const headers = (aoa[0] as any[]) || []
    if (norm(headers[0]) !== 'valor') continue
    const cat = ensureSelect(sheetName)
    const fieldLabels = headers.slice(1).map((h) => String(h ?? '').trim()).filter(Boolean)
    const fieldIds: string[] = fieldLabels.map((label) => {
      let f = cat.optionFields!.find((x) => norm(x.label) === norm(label))
      if (!f) { f = newOptionField(label); cat.optionFields!.push(f); summary.fields++ }
      return f.id
    })
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r] as any[]
      const value = String(row?.[0] ?? '').trim()
      if (!value) continue
      const opt = addOption(cat, value)
      fieldIds.forEach((fid, k) => {
        const cell = String(row?.[k + 1] ?? '').trim()
        if (cell) { opt.meta = { ...(opt.meta || {}), [fid]: cell } }
      })
    }
  }

  return { columns: cols, summary }
}

/** Envuelve el import para un File del navegador. */
export async function importDatosEntradaFromFile(file: File, currentColumns: PcColumn[]) {
  const buf = await file.arrayBuffer()
  return importDatosEntradaFromWorkbook(buf, currentColumns)
}
