/**
 * Learning Builder · pieza importada, copia fiel.
 *
 * Cuando llega un SCORM o un HTML ya hecho, convertirlo a bloques pierde lo
 * que el cliente pagó: su diagramación, sus estilos, sus interacciones. El
 * modo copia fiel no convierte nada — guarda el paquete tal cual y lo sirve
 * igual — y encima pone una capa de edición.
 *
 * Esa capa no toca la estructura: recorre el documento en orden y numera sus
 * nodos de texto, de modo que editar es sustituir el texto número N de la
 * página P. Como la estructura no cambia nunca, la numeración se mantiene
 * estable entre ediciones, y el original siempre queda intacto debajo: quitar
 * una edición devuelve la pieza a como llegó.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover } from './blocks.js'
import type { LbDirectives } from './directives.js'
import { coverAnchors, ident, pick, sanitizeCover, str, type LbAnchorTarget, type LbIssue } from './common.js'

export const LB_MIRROR_ORIGINS = ['SCORM', 'HTML', 'ZIP'] as const
export type LbMirrorOrigin = (typeof LB_MIRROR_ORIGINS)[number]

export const LB_MIRROR_ORIGIN_LABEL: Record<LbMirrorOrigin, string> = {
  SCORM: 'Paquete SCORM',
  HTML: 'Página HTML',
  ZIP: 'Sitio comprimido',
}

export type LbMirrorPage = {
  id: string
  /** Ruta dentro del paquete: index.html, res/tema2.html… */
  path: string
  title: string
  /** Cuántos nodos de texto encontró el importador: el tope de la numeración. */
  slots?: number
}

export type LbMirrorContent = {
  cover: LbCover
  origin: {
    kind: LbMirrorOrigin
    fileName: string
    importedAt: string
    /** Qué dijo el imsmanifest, cuando lo había. */
    manifestTitle?: string
    scormVersion?: string
  }
  /** Página por la que se entra. */
  entry: string
  pages: LbMirrorPage[]
  /**
   * Ediciones por página: `edits[ruta][índice de nodo] = texto nuevo`. Lo que
   * no esté aquí se sirve exactamente como llegó.
   */
  edits: Record<string, Record<string, string>>
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_PAGES = 300
const MAX_EDITS_PER_PAGE = 2000

/** Ruta dentro del paquete: relativa, sin subir de directorio ni salir a la red. */
export function safePath(value: unknown): string {
  const raw = str(value, 400).trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!raw || raw.includes('..') || /^[a-z]+:/i.test(raw)) return ''
  return raw
}

function sanitizePage(value: unknown): LbMirrorPage | null {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const path = safePath(raw.path)
  if (!path) return null
  const page: LbMirrorPage = {
    id: ident(raw.id, 'pg'),
    path,
    title: str(raw.title, 240) || path,
  }
  if (raw.slots !== undefined) {
    const slots = Number(raw.slots)
    if (Number.isFinite(slots) && slots >= 0) page.slots = Math.min(MAX_EDITS_PER_PAGE, Math.round(slots))
  }
  return page
}

export function sanitizeMirror(value: unknown): LbMirrorContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const rawOrigin = (raw.origin && typeof raw.origin === 'object' ? raw.origin : {}) as Record<string, unknown>

  const pages: LbMirrorPage[] = []
  for (const candidate of Array.isArray(raw.pages) ? (raw.pages as unknown[]).slice(0, MAX_PAGES) : []) {
    const page = sanitizePage(candidate)
    if (page) pages.push(page)
  }

  const known = new Set(pages.map((page) => page.path))
  const edits: Record<string, Record<string, string>> = {}
  const rawEdits = (raw.edits && typeof raw.edits === 'object' ? raw.edits : {}) as Record<string, unknown>
  for (const [rawKey, rawValue] of Object.entries(rawEdits)) {
    const path = safePath(rawKey)
    // Una edición sobre una página que ya no está en el paquete no se sirve
    // nunca: se descarta para que el guion no acumule restos invisibles.
    if (!path || !known.has(path) || !rawValue || typeof rawValue !== 'object') continue
    const page: Record<string, string> = {}
    for (const [slot, text] of Object.entries(rawValue as Record<string, unknown>).slice(0, MAX_EDITS_PER_PAGE)) {
      if (!/^\d{1,5}$/.test(slot)) continue
      page[slot] = str(text, 8000)
    }
    if (Object.keys(page).length) edits[path] = page
  }

  const entry = safePath(raw.entry) || pages[0]?.path || 'index.html'

  const origin: LbMirrorContent['origin'] = {
    kind: pick(rawOrigin.kind, LB_MIRROR_ORIGINS, 'HTML'),
    fileName: str(rawOrigin.fileName, 300),
    importedAt: str(rawOrigin.importedAt, 40),
  }
  const manifestTitle = str(rawOrigin.manifestTitle, 300); if (manifestTitle) origin.manifestTitle = manifestTitle
  const scormVersion = str(rawOrigin.scormVersion, 40); if (scormVersion) origin.scormVersion = scormVersion

  return { cover: sanitizeCover(raw.cover), origin, entry, pages, edits }
}

export function scaffoldMirror(title: string): LbMirrorContent {
  return {
    cover: { title },
    origin: { kind: 'HTML', fileName: '', importedAt: '' },
    entry: '',
    pages: [],
    edits: {},
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

export function validateMirror(content: LbMirrorContent, _directives: LbDirectives): LbIssue[] {
  const issues: LbIssue[] = []
  if (!content.pages.length) {
    issues.push({
      level: 'error',
      message: 'Todavía no se ha subido el paquete. Sube el SCORM, el ZIP o el HTML en la pestaña Guion.',
    })
    return issues
  }
  if (!content.pages.some((page) => page.path === content.entry)) {
    issues.push({ level: 'error', message: 'La página de entrada no está entre las del paquete.' })
  }
  if (!content.cover.title) {
    issues.push({ level: 'warning', message: 'La pieza no tiene título propio; se usará el del archivo.' })
  }
  return issues
}

// ── Utilidades ───────────────────────────────────────────────────────────────

export function mirrorEditCount(content: LbMirrorContent): number {
  return Object.values(content.edits).reduce((total, page) => total + Object.keys(page).length, 0)
}

export function mirrorAnchorTargets(content: LbMirrorContent): LbAnchorTarget[] {
  const targets = coverAnchors(content.cover)
  for (const page of content.pages) {
    targets.push({
      anchor: `lesson:${page.id}`,
      kind: 'lesson',
      label: page.title,
      preview: page.path,
      depth: 1,
    })
  }
  return targets
}
