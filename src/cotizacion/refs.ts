/**
 * Edición por referencia en el navegador: espejo de api/_lib/quote-fields.ts.
 * El editor del visor trabaja sobre una copia local de la cotización y solo
 * al guardar la envía completa; por eso aplica aquí las mismas reglas que el
 * servidor (hojas de texto, ramas libres, campos de línea).
 */
import type { QuoteItem } from './pricing'

export type Draft = {
  title: string
  subtitle: string | null
  clientName: string
  sector: string | null
  content: any
  items: QuoteItem[]
}

const QUOTE_FIELDS = new Set(['title', 'subtitle', 'clientName', 'sector'])
const ITEM_FIELDS = new Set(['name', 'summary', 'category', 'unit', 'price', 'qty', 'deliverables', 'weeks'])
const ITEM_NUMERIC = new Set(['price', 'qty', 'deliverables', 'weeks'])
const FREE_BRANCHES = new Set(['cover', 'sections', 'labels', 'paymentLabels', 'screens', 'signature', 'cobrand', 'schedule', 'service', 'brand'])
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])

const toNumber = (text: string) => Number(String(text).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))

/** Aplica una edición sobre una copia del borrador. Devuelve null si la referencia no es válida. */
export function applyRef(draft: Draft, ref: string, rawValue: string): Draft | null {
  const parts = String(ref || '').split('.')
  if (parts.length < 2 || parts.length > 12) return null
  const [scope, ...path] = parts
  if (!path.every((p) => /^[A-Za-z0-9_-]{1,40}$/.test(p) && !FORBIDDEN.has(p))) return null
  const value = String(rawValue ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 8000)

  if (scope === 'quote') {
    if (path.length !== 1 || !QUOTE_FIELDS.has(path[0])) return null
    if (!value && (path[0] === 'title' || path[0] === 'clientName')) return null
    return { ...draft, [path[0]]: value.slice(0, 400) } as Draft
  }

  if (scope === 'item') {
    const [code, field] = path
    if (path.length !== 2 || !ITEM_FIELDS.has(field)) return null
    const items = draft.items.map((i) => ({ ...i }))
    const target = items.find((i) => String(i.code).toUpperCase() === code.toUpperCase())
    if (!target) return null
    if (field === 'name' && !value) return null
    if (ITEM_NUMERIC.has(field)) {
      const n = toNumber(value)
      if (!Number.isFinite(n) || n < 0) return null
      ;(target as any)[field] = field === 'qty' ? Math.min(999, Math.max(1, Math.round(n))) : field === 'weeks' ? n : Math.round(n)
    } else {
      ;(target as any)[field] = field === 'unit' ? (value.slice(0, 40) || null) : value.slice(0, field === 'summary' ? 900 : 160)
    }
    return { ...draft, items }
  }

  if (scope !== 'content') return null
  const content = structuredClone(draft.content ?? {})
  const free = FREE_BRANCHES.has(path[0])
  let node: any = content
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const nextKey = path[i + 1]
    let child = Array.isArray(node) ? node[Number(key)] : node[key]
    if (child === undefined || child === null) {
      if (!(free || (i === 0 && path.length === 2))) return null
      child = /^\d+$/.test(nextKey) ? [] : {}
      if (Array.isArray(node)) {
        const idx = Number(key)
        if (!Number.isInteger(idx) || idx < 0 || idx > 40) return null
        while (node.length < idx) node.push({})
        node[idx] = child
      } else {
        node[key] = child
      }
      node = child
      continue
    }
    if (typeof child !== 'object') return null
    node = child
  }
  const leaf = path[path.length - 1]
  const current = Array.isArray(node) ? node[Number(leaf)] : node[leaf]
  if (current !== undefined && current !== null && typeof current !== 'string') return null
  if (Array.isArray(node)) {
    const idx = Number(leaf)
    if (!Number.isInteger(idx) || idx < 0 || idx > 40) return null
    if (idx >= node.length && !free) return null
    while (node.length < idx) node.push('')
    node[idx] = value
  } else {
    node[leaf] = value
  }
  return { ...draft, content }
}
