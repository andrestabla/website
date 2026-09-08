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
const MAX_VALUE = 8000
const MAX_SEGMENTS = 12

export function parseRef(ref: string): { scope: 'quote' | 'content'; path: string[] } | null {
  const parts = String(ref || '').trim().split('.')
  if (parts.length < 2 || parts.length > MAX_SEGMENTS) return null
  const [scope, ...path] = parts
  const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])
  if (!path.every((p) => /^[A-Za-z0-9_-]{1,40}$/.test(p) && !FORBIDDEN.has(p))) return null
  if (scope === 'quote') return path.length === 1 && QUOTE_FIELDS.has(path[0]) ? { scope, path } : null
  if (scope === 'content') return { scope, path }
  return null
}

/**
 * Aplica ediciones sobre una copia del contenido. Devuelve qué cambió y los
 * campos de la cotización a actualizar. Una referencia inválida se ignora.
 */
export function applyFieldEdits(content: any, edits: FieldEdit[]) {
  const next = structuredClone(content ?? {})
  const quoteData: Record<string, string> = {}
  const applied: string[] = []

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

    // content.*: recorrer creando solo objetos intermedios que ya existan
    let node: any = next
    let ok = true
    for (let i = 0; i < parsed.path.length - 1; i++) {
      const key = parsed.path[i]
      const child = Array.isArray(node) ? node[Number(key)] : node[key]
      if (child === undefined || child === null) {
        // se crean objetos intermedios solo en las ramas de estructura libre
        // (cover.duration, sections.diagnostico.title, labels.front)
        const free = ['cover', 'sections', 'labels'].includes(parsed.path[0])
        if (!Array.isArray(node) && (free || (i === 0 && parsed.path.length === 2))) { node[key] = {}; node = node[key]; continue }
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
      if (!Number.isInteger(idx) || idx < 0 || idx >= node.length) continue
      node[idx] = value
    } else {
      node[leaf] = value
    }
    applied.push(edit.ref)
  }

  return { content: next, quoteData, applied }
}
