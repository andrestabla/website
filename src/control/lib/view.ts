import type { PcColumn, PcRow, PcFilter, PcView } from './types'

export type { PcFilter, PcSort, PcView } from './types'

export const emptyView: PcView = { search: '', filters: [], sort: null }

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  return String(v)
}

function matchesFilter(row: PcRow, f: PcFilter): boolean {
  const raw = row.cells[f.colId]
  if (f.kind === 'in') {
    if (f.values.length === 0) return true
    return f.values.includes(cellText(raw))
  }
  if (f.kind === 'contains') {
    if (!f.value) return true
    return cellText(raw).toLowerCase().includes(f.value.toLowerCase())
  }
  if (f.kind === 'range') {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(n)) return f.min === undefined && f.max === undefined
    if (f.min !== undefined && n < f.min) return false
    if (f.max !== undefined && n > f.max) return false
    return true
  }
  return true
}

/** Aplica búsqueda + filtros + orden y devuelve las filas visibles (no muta). */
export function applyView(rows: PcRow[], columns: PcColumn[], view: PcView): PcRow[] {
  const search = view.search.trim().toLowerCase()
  const colIds = new Set(columns.map((c) => c.id))
  const filters = view.filters.filter((f) => colIds.has(f.colId))
  let out = rows.filter((r) => {
    if (search) {
      const hit = columns.some((c) => cellText(r.cells[c.id]).toLowerCase().includes(search))
      if (!hit) return false
    }
    return filters.every((f) => matchesFilter(r, f))
  })

  if (view.sort) {
    const { colId, dir } = view.sort
    const col = columns.find((c) => c.id === colId)
    const mult = dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = a.cells[colId]
      const vb = b.cells[colId]
      const ea = va === null || va === undefined || va === ''
      const eb = vb === null || vb === undefined || vb === ''
      if (ea && eb) return 0
      if (ea) return 1 // vacíos al final
      if (eb) return -1
      if (col?.type === 'number') return ((Number(va) || 0) - (Number(vb) || 0)) * mult
      return cellText(va).localeCompare(cellText(vb), 'es') * mult
    })
  }
  return out
}
