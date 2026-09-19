/**
 * Learning Builder · identificadores jerárquicos.
 *
 * El workspace es la raíz: recibe un código corto y estable (UNICAFAM) y cada
 * recurso cuelga de él (UNICAFAM-OVA-001). Con leer el código de un recurso se
 * sabe de qué cliente es y de qué tipo, sin consultar nada.
 *
 * El código convive con dos identificadores que no sustituye:
 *  · `id` (cuid) — la clave interna, la que viaja en las llamadas del API.
 *  · `publicId` — el token no adivinable del enlace público. Deliberadamente
 *    aparte: si el enlace abierto fuera UNICAFAM-OVA-002 se podría recorrer la
 *    biblioteca de un cliente contando hacia arriba.
 */

/** Prefijo de tres letras por tipo de recurso. */
const KIND_PREFIX: Record<string, string> = {
  OVA: 'OVA',
  LECTURA: 'LEC',
  INTERACTIVE: 'INT',
  PODCAST: 'POD',
  VIDEO: 'VID',
  ROUTE: 'RUT',
  IMPORT: 'IMP',
}

/** Código raíz a partir del nombre o el slug del workspace. */
export function workspaceCodeFrom(source: string, taken: Set<string> = new Set()): string {
  const base =
    source
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12) || 'WS'
  if (!taken.has(base)) return base
  for (let attempt = 2; attempt < 100; attempt++) {
    const candidate = `${base.slice(0, 10)}${attempt}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base.slice(0, 8)}${Date.now().toString(36).toUpperCase().slice(-4)}`
}

/**
 * Siguiente código libre de un recurso dentro de su workspace. La numeración
 * es por tipo, así que se lee de corrido: UNICAFAM-OVA-001, UNICAFAM-LEC-004.
 */
export function resourceCodeFor(workspaceCode: string, kind: string, taken: Set<string>): string {
  const prefix = `${workspaceCode}-${KIND_PREFIX[kind] || 'REC'}`
  for (let n = 1; n < 1000; n++) {
    const candidate = `${prefix}-${String(n).padStart(3, '0')}`
    if (!taken.has(candidate)) return candidate
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

/** Los códigos que ya usa un workspace, para no repetir al crear. */
export async function takenResourceCodes(db: any, workspaceId: string): Promise<Set<string>> {
  const rows = await db.findMany({ where: { workspaceId }, select: { code: true } })
  return new Set<string>(rows.map((row: any) => row.code).filter(Boolean))
}
