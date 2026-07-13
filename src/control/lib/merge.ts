import type { PcBoard, PcRow } from './types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Combina cambios concurrentes a nivel de celda para edición colaborativa.
 *
 * Parte del estado del SERVIDOR (lo más reciente) y le aplica encima solo los
 * cambios que hizo este cliente respecto a su `base` (el estado que tenía cuando
 * cargó/guardó por última vez). Así, dos usuarios editando celdas distintas no se
 * pisan; si ambos editan la MISMA celda, gana quien reintenta (este cliente).
 *
 * - Celdas: se aplican las que `local` cambió respecto a `base`.
 * - Filas: añadidas por local se agregan; borradas por local se quitan.
 * - Columnas / título / descripción / vista pública: si local las cambió respecto
 *   a base, prevalece local; si no, se conserva lo del servidor.
 */
export function mergeBoards(server: PcBoard, base: PcBoard, local: PcBoard): PcBoard {
  const baseRowById = new Map(base.rows.map((r) => [r.id, r]))
  const localRowById = new Map(local.rows.map((r) => [r.id, r]))

  // Copia mutable de las filas del servidor.
  const result = new Map<string, PcRow>(server.rows.map((r) => [r.id, { ...r, cells: { ...r.cells } }]))

  // Filas borradas por local (existían en base, ya no en local).
  for (const r of base.rows) {
    if (!localRowById.has(r.id)) result.delete(r.id)
  }

  // Filas añadidas o celdas editadas por local.
  for (const lr of local.rows) {
    const br = baseRowById.get(lr.id)
    if (!br) {
      // Fila nueva creada por local.
      result.set(lr.id, { ...lr, cells: { ...lr.cells } })
      continue
    }
    let target = result.get(lr.id)
    if (!target) {
      // El servidor la borró pero local la conserva/editó: la reintroducimos.
      result.set(lr.id, { ...lr, cells: { ...lr.cells } })
      continue
    }
    // Aplica solo las celdas que local cambió respecto a base.
    const colIds = new Set<string>([...Object.keys(lr.cells), ...Object.keys(br.cells)])
    for (const colId of colIds) {
      if (!eq(lr.cells[colId], br.cells[colId])) {
        target.cells[colId] = lr.cells[colId] ?? null
      }
    }
  }

  // Orden de filas: respeta el de local para las que existan; añade al final las
  // que solo estén en el servidor.
  const ordered: PcRow[] = []
  const seen = new Set<string>()
  for (const lr of local.rows) {
    const row = result.get(lr.id)
    if (row && !seen.has(lr.id)) { ordered.push(row); seen.add(lr.id) }
  }
  for (const sr of server.rows) {
    const row = result.get(sr.id)
    if (row && !seen.has(sr.id)) { ordered.push(row); seen.add(sr.id) }
  }

  const pick = <K extends keyof PcBoard>(field: K): PcBoard[K] =>
    eq(local[field], base[field]) ? server[field] : local[field]

  const localColsChanged = !eq(local.columns, base.columns)

  return {
    ...server,
    columns: localColsChanged ? local.columns : server.columns,
    rows: ordered,
    title: pick('title'),
    description: pick('description'),
    publicView: pick('publicView'),
    // Conserva metadatos de sesión del cliente.
    access: local.access,
    isOwner: local.isOwner,
    shareEnabled: server.shareEnabled,
    shareToken: local.shareToken,
    collaborators: local.collaborators,
    updatedAt: server.updatedAt,
  }
}
