/**
 * Acceso a datasets factorizados (columnas categóricas como índices + diccionarios).
 * Estructura: { columns, dicts: {col: labels[]}, data: {col: number[]}, n }.
 */
export type Factorized = {
  columns: string[]
  dicts: Record<string, string[]>
  data: Record<string, number[]>
  n: number
}

export type Filters = Record<string, number> // col -> índice seleccionado (-1 = todos)

export function isCategorical(ds: Factorized, col: string): boolean {
  return !!ds.dicts[col]
}

export function labelIndex(ds: Factorized, col: string, label: string): number {
  return ds.dicts[col]?.indexOf(label) ?? -1
}

/** Máscara booleana según filtros activos; `exclude` omite un filtro (para sugerencias contextuales). */
export function buildMask(ds: Factorized, filters: Filters, exclude?: string): Uint8Array {
  const active = Object.entries(filters).filter(([c, v]) => v >= 0 && c !== exclude)
  const mask = new Uint8Array(ds.n).fill(1)
  for (let i = 0; i < ds.n; i++) {
    for (const [c, v] of active) {
      if (ds.data[c][i] !== v) {
        mask[i] = 0
        break
      }
    }
  }
  return mask
}

export function totalMask(mask: Uint8Array): number {
  let t = 0
  for (let i = 0; i < mask.length; i++) t += mask[i]
  return t
}

export type Count = { label: string; value: number }

export function countBy(ds: Factorized, col: string, mask: Uint8Array): Count[] {
  const arr = ds.data[col]
  const dic = ds.dicts[col]
  const out = new Array(dic.length).fill(0)
  for (let i = 0; i < ds.n; i++) if (mask[i]) out[arr[i]]++
  return dic.map((label, k) => ({ label, value: out[k] })).filter((d) => d.value > 0)
}

export function distinctCount(ds: Factorized, col: string, mask: Uint8Array): number {
  const s = new Set<number>()
  const arr = ds.data[col]
  for (let i = 0; i < ds.n; i++) if (mask[i]) s.add(arr[i])
  return s.size
}

export function countLabel(ds: Factorized, col: string, label: string, mask: Uint8Array): number {
  const k = labelIndex(ds, col, label)
  if (k < 0) return 0
  const arr = ds.data[col]
  let t = 0
  for (let i = 0; i < ds.n; i++) if (mask[i] && arr[i] === k) t++
  return t
}

export const sortDesc = (a: Count[]): Count[] => a.slice().sort((x, y) => y.value - x.value)
export const topN = (a: Count[], n: number): Count[] => sortDesc(a).slice(0, n)

/** Media de una columna numérica agrupada por una categórica (respeta la máscara). */
export function meanBy(ds: Factorized, groupCol: string, valCol: string, mask: Uint8Array): Count[] {
  const g = ds.data[groupCol]
  const v = ds.data[valCol]
  const dic = ds.dicts[groupCol]
  const sum = new Float64Array(dic.length)
  const cnt = new Float64Array(dic.length)
  for (let i = 0; i < ds.n; i++) {
    if (!mask[i]) continue
    sum[g[i]] += v[i]
    cnt[g[i]]++
  }
  return dic.map((label, k) => ({ label, value: cnt[k] ? sum[k] / cnt[k] : 0 })).filter((_, k) => cnt[k] > 0)
}

export function meanAll(ds: Factorized, valCol: string, mask: Uint8Array): number {
  const v = ds.data[valCol]
  let s = 0
  let c = 0
  for (let i = 0; i < ds.n; i++) if (mask[i]) { s += v[i]; c++ }
  return c ? s / c : 0
}

/** Reconstruye filas (para exportar CSV) a partir de la máscara. */
export function rowsToCsv(ds: Factorized, mask: Uint8Array): string {
  const cols = ds.columns
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [cols.join(',')]
  for (let i = 0; i < ds.n; i++) {
    if (!mask[i]) continue
    const row = cols.map((c) => (isCategorical(ds, c) ? ds.dicts[c][ds.data[c][i]] : ds.data[c][i]))
    lines.push(row.map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}
