// ── Tipos del módulo Project Control ────────────────────────────────────────

export type PcColType = 'text' | 'longtext' | 'number' | 'date' | 'select' | 'url' | 'checkbox' | 'comments'

/** Definición de un campo de metadatos para una categoría (columna select). */
export type PcOptionField = { id: string; label: string }

/** Una entrada de "datos de entrada": el valor visible + color + metadatos. */
export type PcOption = { value: string; color?: string; meta?: Record<string, string> }

/** Una entrada de una columna tipo "comentarios": texto + fecha de publicación. */
export type PcComment = { id: string; text: string; at: string; author?: string }

/** Cómo se rinde/computa el valor de una columna tipo fórmula. */
export type PcBehaviorRender = 'progress' | 'number' | 'text'
export type PcBehavior = {
  mode: 'formula'
  /** Descripción en prosa de cómo calcular el valor; la IA la opera. */
  prompt: string
  render?: PcBehaviorRender
  /** Columna cuyo valor (un enlace) la IA debe leer para calcular. */
  sourceColumnId?: string
}

export type PcColumn = {
  id: string
  name: string
  type: PcColType
  options?: PcOption[]
  /** Esquema de metadatos de la categoría (solo aplica a columnas select). */
  optionFields?: PcOptionField[]
  /** Comportamiento avanzado (columna calculada por IA). */
  behavior?: PcBehavior
  /** Si se muestra en el resumen de la vista tarjetas (lo decide el admin). */
  card?: boolean
  width?: number
}

export type PcCellValue = string | number | boolean | null | PcComment[]

export type PcRow = {
  id: string
  cells: Record<string, PcCellValue>
}

// ── Filtros / orden (vista) ──────────────────────────────────────────────────
export type PcFilter =
  | { colId: string; kind: 'in'; values: string[] } // columnas select
  | { colId: string; kind: 'contains'; value: string } // texto/url
  | { colId: string; kind: 'range'; min?: number; max?: number } // número
export type PcSort = { colId: string; dir: 'asc' | 'desc' } | null
export type PcView = { search: string; filters: PcFilter[]; sort: PcSort }

// ── Vista pública fijada por el propietario ──────────────────────────────────
export type PcAnalyticsConfig = { groupId: string; secondaryId: string; metric: 'count' | 'sum' | 'avg'; valueColId: string }
export type PcPublicView = { tab: 'grid' | 'analitica'; gridView?: PcView; gridMode?: 'table' | 'cards'; analytics?: PcAnalyticsConfig }

export type PcBoard = {
  id: string
  title: string
  description: string
  columns: PcColumn[]
  rows: PcRow[]
  shareEnabled: boolean
  shareToken: string | null
  publicView?: PcPublicView | null
  access: 'owner' | 'EDIT' | 'VIEW'
  isOwner: boolean
  collaborators: { userId: string; role: 'VIEW' | 'EDIT' }[]
  /** Marca de tiempo de la última modificación (para concurrencia optimista). */
  updatedAt?: string
}

export type PcBoardSummary = {
  id: string
  title: string
  description: string
  columnsCount: number
  rowsCount: number
  shareEnabled: boolean
  updatedAt: string
  role: 'owner' | 'VIEW' | 'EDIT'
}

export const PC_COL_TYPE_LABELS: Record<PcColType, string> = {
  text: 'Texto',
  longtext: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista (dropdown)',
  url: 'Enlace',
  checkbox: 'Casilla',
  comments: 'Comentarios',
}

// Paleta para opciones de columnas tipo lista (badges).
export const PC_OPTION_COLORS = [
  '#e0e7ff', // indigo
  '#dcfce7', // green
  '#fef9c3', // yellow
  '#fee2e2', // red
  '#ffedd5', // orange
  '#e0f2fe', // sky
  '#f3e8ff', // purple
  '#f1f5f9', // slate
] as const

let counter = 0
function uid(prefix: string) {
  counter += 1
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${counter.toString(36)}`
}

export function newColumn(type: PcColType = 'text', name = 'Nueva columna'): PcColumn {
  const col: PcColumn = { id: uid('c'), name, type }
  if (type === 'select') { col.options = []; col.optionFields = [] }
  return col
}

export function newOptionField(label = 'Nuevo dato'): PcOptionField {
  return { id: uid('f'), label }
}

export function newComment(text: string, author?: string): PcComment {
  return { id: uid('cm'), text, at: new Date().toISOString(), ...(author ? { author } : {}) }
}

export function newRow(columns: PcColumn[]): PcRow {
  const cells: Record<string, PcCellValue> = {}
  for (const c of columns) cells[c.id] = c.type === 'checkbox' ? false : c.type === 'comments' ? [] : null
  return { id: uid('r'), cells }
}

/** Convierte un número de serie de Excel (base 1899-12-30) a ISO (yyyy-mm-dd). */
export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
