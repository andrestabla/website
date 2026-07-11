import crypto from 'node:crypto'

export const PC_COL_TYPES = ['text', 'longtext', 'number', 'date', 'select', 'url', 'checkbox'] as const
export type PcColType = (typeof PC_COL_TYPES)[number]

const MAX_COLUMNS = 60
const MAX_ROWS = 5000
const MAX_OPTIONS = 200
const MAX_CELL_LEN = 20000

function rid(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

export function sanitizeColumns(input: unknown): any[] {
  if (!Array.isArray(input)) return []
  return input.slice(0, MAX_COLUMNS).map((raw: any) => {
    const type: PcColType = PC_COL_TYPES.includes(raw?.type) ? raw.type : 'text'
    const col: any = {
      id: String(raw?.id || rid('c')).slice(0, 40),
      name: String(raw?.name ?? 'Columna').slice(0, 120),
      type,
    }
    if (type === 'select') {
      const opts = Array.isArray(raw?.options) ? raw.options : []
      col.options = opts
        .slice(0, MAX_OPTIONS)
        .map((o: any) =>
          typeof o === 'string'
            ? { value: o.slice(0, 200) }
            : { value: String(o?.value ?? '').slice(0, 200), ...(o?.color ? { color: String(o.color).slice(0, 20) } : {}) }
        )
        .filter((o: any) => o.value !== '')
    }
    const width = Number(raw?.width)
    if (Number.isFinite(width) && width > 0) col.width = Math.min(Math.round(width), 800)
    return col
  })
}

function coerceCell(value: unknown, type: PcColType): string | number | boolean | null {
  if (value === null || value === undefined || value === '') return type === 'checkbox' ? false : null
  if (type === 'checkbox') return value === true || value === 'true' || value === 1 || value === '1'
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return String(value).slice(0, MAX_CELL_LEN)
}

export function sanitizeRows(input: unknown, columns: any[]): any[] {
  if (!Array.isArray(input)) return []
  const typeByCol = new Map<string, PcColType>(columns.map((c) => [c.id, c.type]))
  return input.slice(0, MAX_ROWS).map((raw: any) => {
    const cells: Record<string, any> = {}
    const rawCells = raw?.cells && typeof raw.cells === 'object' ? raw.cells : {}
    for (const [colId, type] of typeByCol) {
      cells[colId] = coerceCell(rawCells[colId], type)
    }
    return { id: String(raw?.id || rid('r')).slice(0, 40), cells }
  })
}
