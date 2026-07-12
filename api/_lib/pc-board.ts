import crypto from 'node:crypto'

export const PC_COL_TYPES = ['text', 'longtext', 'number', 'date', 'select', 'url', 'checkbox', 'comments'] as const
export type PcColType = (typeof PC_COL_TYPES)[number]

const MAX_COLUMNS = 60
const MAX_ROWS = 5000
const MAX_OPTIONS = 200
const MAX_CELL_LEN = 20000
const MAX_COMMENTS = 500

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
      // Esquema de metadatos de la categoría.
      const fields = Array.isArray(raw?.optionFields) ? raw.optionFields : []
      col.optionFields = fields
        .slice(0, 40)
        .map((f: any) => ({ id: String(f?.id || rid('f')).slice(0, 40), label: String(f?.label ?? 'Dato').slice(0, 120) }))
      const fieldIds = new Set<string>(col.optionFields.map((f: any) => f.id))

      const opts = Array.isArray(raw?.options) ? raw.options : []
      col.options = opts
        .slice(0, MAX_OPTIONS)
        .map((o: any) => {
          if (typeof o === 'string') return { value: o.slice(0, 200) }
          const out: any = { value: String(o?.value ?? '').slice(0, 200) }
          if (o?.color) out.color = String(o.color).slice(0, 20)
          if (o?.meta && typeof o.meta === 'object') {
            const meta: Record<string, string> = {}
            for (const [k, v] of Object.entries(o.meta)) {
              if (fieldIds.has(k) && v != null && v !== '') meta[k] = String(v).slice(0, 2000)
            }
            if (Object.keys(meta).length) out.meta = meta
          }
          return out
        })
        .filter((o: any) => o.value !== '')
    }
    // Comportamiento (columna calculada por IA)
    if (raw?.behavior && raw.behavior.mode === 'formula') {
      const render = ['progress', 'number', 'text'].includes(raw.behavior.render) ? raw.behavior.render : 'text'
      const b: any = { mode: 'formula', prompt: String(raw.behavior.prompt ?? '').slice(0, 4000), render }
      if (raw.behavior.sourceColumnId) b.sourceColumnId = String(raw.behavior.sourceColumnId).slice(0, 40)
      col.behavior = b
    }

    if (raw?.card === true || raw?.card === false) col.card = raw.card

    const width = Number(raw?.width)
    if (Number.isFinite(width) && width > 0) col.width = Math.min(Math.round(width), 800)
    return col
  })
}

function coerceComments(value: unknown): any[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, MAX_COMMENTS)
    .map((c: any) => {
      if (!c || typeof c !== 'object') return null
      const text = String(c.text ?? '').slice(0, MAX_CELL_LEN)
      if (!text) return null
      const at = typeof c.at === 'string' ? c.at.slice(0, 40) : new Date().toISOString()
      const out: any = { id: String(c.id || `cm_${crypto.randomBytes(5).toString('hex')}`).slice(0, 40), text, at }
      if (c.author) out.author = String(c.author).slice(0, 120)
      return out
    })
    .filter(Boolean)
}

function coerceCell(value: unknown, type: PcColType): any {
  if (type === 'comments') return coerceComments(value)
  if (value === null || value === undefined || value === '') return type === 'checkbox' ? false : null
  if (type === 'checkbox') return value === true || value === 'true' || value === 1 || value === '1'
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return String(value).slice(0, MAX_CELL_LEN)
}

/** Sanitiza la vista pública fijada por el propietario. Devuelve null si no aplica. */
export function sanitizePublicView(input: unknown): any {
  if (!input || typeof input !== 'object') return null
  const v = input as any
  const tab = v.tab === 'analitica' ? 'analitica' : 'grid'
  const out: any = { tab }
  if (v.gridMode === 'cards' || v.gridMode === 'table') out.gridMode = v.gridMode

  if (v.gridView && typeof v.gridView === 'object') {
    const gv = v.gridView
    const filters = Array.isArray(gv.filters)
      ? gv.filters
          .filter((f: any) => f && typeof f.colId === 'string' && ['in', 'contains', 'range'].includes(f.kind))
          .slice(0, 40)
          .map((f: any) => {
            const base: any = { colId: String(f.colId).slice(0, 40), kind: f.kind }
            if (f.kind === 'in') base.values = (Array.isArray(f.values) ? f.values : []).slice(0, 200).map((x: any) => String(x).slice(0, 200))
            else if (f.kind === 'contains') base.value = String(f.value ?? '').slice(0, 200)
            else { if (Number.isFinite(Number(f.min))) base.min = Number(f.min); if (Number.isFinite(Number(f.max))) base.max = Number(f.max) }
            return base
          })
      : []
    const sort = gv.sort && typeof gv.sort === 'object' && typeof gv.sort.colId === 'string'
      ? { colId: String(gv.sort.colId).slice(0, 40), dir: gv.sort.dir === 'desc' ? 'desc' : 'asc' }
      : null
    out.gridView = { search: String(gv.search ?? '').slice(0, 200), filters, sort }
  }

  if (v.analytics && typeof v.analytics === 'object') {
    const a = v.analytics
    out.analytics = {
      groupId: String(a.groupId ?? '').slice(0, 40),
      secondaryId: String(a.secondaryId ?? '').slice(0, 40),
      metric: ['count', 'sum', 'avg'].includes(a.metric) ? a.metric : 'count',
      valueColId: String(a.valueColId ?? '').slice(0, 40),
    }
  }
  return out
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
