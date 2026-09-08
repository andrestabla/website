/**
 * Cotizador — edición directa por referencia.
 *
 * El visor marca cada texto editable con una referencia (`content.intro`,
 * `content.pages.3.blocks.2.text`, `quote.title`…). El modo edición escribe
 * sobre esa referencia y la IA la recibe como «elemento seleccionado».
 * Aquí se valida y se aplica: solo hojas de texto, solo dentro de `content`
 * o de los cuatro campos de portada de la cotización.
 */

export type FieldEdit = { ref: string; value: string }

const QUOTE_FIELDS = new Set(['title', 'subtitle', 'clientName', 'sector'])
/** Campos de texto de una línea de la cotización (item.<CODIGO>.<campo>). */
const ITEM_FIELDS = new Set(['name', 'summary', 'category', 'unit', 'price', 'qty', 'deliverables', 'weeks'])
const ITEM_NUMERIC = new Set(['price', 'qty', 'deliverables', 'weeks'])
/** «$ 13.500.000» → 13500000; «4» → 4. */
const toNumber = (text: string) => Number(String(text).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
/** Ramas de content donde se crean objetos y arreglos intermedios al escribir. */
const FREE_BRANCHES = new Set(['cover', 'sections', 'labels', 'paymentLabels', 'screens', 'signature', 'cobrand', 'schedule', 'service', 'brand'])
const MAX_VALUE = 8000
const MAX_SEGMENTS = 12

export function parseRef(ref: string): { scope: 'quote' | 'content' | 'item'; path: string[] } | null {
  const parts = String(ref || '').trim().split('.')
  if (parts.length < 2 || parts.length > MAX_SEGMENTS) return null
  const [scope, ...path] = parts
  const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])
  if (!path.every((p) => /^[A-Za-z0-9_-]{1,40}$/.test(p) && !FORBIDDEN.has(p))) return null
  if (scope === 'quote') return path.length === 1 && QUOTE_FIELDS.has(path[0]) ? { scope, path } : null
  if (scope === 'item') return path.length === 2 && ITEM_FIELDS.has(path[1]) ? { scope, path } : null
  if (scope === 'content') return { scope, path }
  return null
}

/**
 * Aplica ediciones sobre una copia del contenido. Devuelve qué cambió y los
 * campos de la cotización a actualizar. Una referencia inválida se ignora.
 */
export function applyFieldEdits(content: any, edits: FieldEdit[], items: any[] = []) {
  const next = structuredClone(content ?? {})
  const nextItems = items.map((i) => ({ ...i }))
  const quoteData: Record<string, string> = {}
  const applied: string[] = []
  let itemsChanged = false

  for (const edit of edits.slice(0, 60)) {
    const parsed = parseRef(edit?.ref)
    if (!parsed) continue
    const value = typeof edit.value === 'string' ? edit.value.replace(/\r\n?/g, '\n').trim().slice(0, MAX_VALUE) : ''

    if (parsed.scope === 'quote') {
      if (!value && (parsed.path[0] === 'title' || parsed.path[0] === 'clientName')) continue
      quoteData[parsed.path[0]] = value.slice(0, 400)
      applied.push(edit.ref)
      continue
    }

    if (parsed.scope === 'item') {
      const [code, field] = parsed.path
      const target = nextItems.find((i) => String(i.code).toUpperCase() === code.toUpperCase())
      if (!target) continue
      if (field === 'name' && !value) continue
      if (ITEM_NUMERIC.has(field)) {
        const n = toNumber(value)
        if (!Number.isFinite(n) || n < 0) continue
        target[field] = field === 'qty' ? Math.min(999, Math.max(1, Math.round(n))) : field === 'weeks' ? n : Math.round(n)
      } else {
        target[field] = field === 'unit' ? (value.slice(0, 40) || null) : value.slice(0, field === 'summary' ? 900 : 160)
      }
      itemsChanged = true
      applied.push(edit.ref)
      continue
    }

    // content.*: recorrer el camino; en las ramas libres se crean los tramos que falten
    const free = FREE_BRANCHES.has(parsed.path[0])
    let node: any = next
    let ok = true
    for (let i = 0; i < parsed.path.length - 1; i++) {
      const key = parsed.path[i]
      const nextKey = parsed.path[i + 1]
      let child = Array.isArray(node) ? node[Number(key)] : node[key]
      if (child === undefined || child === null) {
        if (free || (i === 0 && parsed.path.length === 2)) {
          child = /^\d+$/.test(nextKey) ? [] : {}
          if (Array.isArray(node)) {
            const idx = Number(key)
            if (!Number.isInteger(idx) || idx < 0 || idx > 40) { ok = false; break }
            while (node.length < idx) node.push({})
            node[idx] = child
          } else {
            node[key] = child
          }
          node = child
          continue
        }
        ok = false
        break
      }
      if (typeof child !== 'object') { ok = false; break }
      node = child
    }
    if (!ok) continue
    const leaf = parsed.path[parsed.path.length - 1]
    const current = Array.isArray(node) ? node[Number(leaf)] : node[leaf]
    if (current !== undefined && current !== null && typeof current !== 'string') continue
    if (Array.isArray(node)) {
      const idx = Number(leaf)
      if (!Number.isInteger(idx) || idx < 0 || idx > 40) continue
      if (idx >= node.length && !free) continue
      while (node.length < idx) node.push('')
      node[idx] = value
    } else {
      node[leaf] = value
    }
    applied.push(edit.ref)
  }

  return { content: next, quoteData, applied, items: itemsChanged ? nextItems : null }
}
