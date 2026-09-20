/**
 * Learning Builder · la pieza final de un recurso.
 *
 * Un recurso tiene dos caras. El **guion** es lo que se edita y lo que la
 * revisión comprueba: lecciones y bloques, escenas, planos, intervenciones.
 * La **pieza final** es lo que se le entregó al cliente: el HTML producido con
 * sus imágenes, el paquete Rise, el MP4 con sus subtítulos.
 *
 * Mientras no haya pieza final, el recurso se publica desde su guion. En
 * cuanto la hay, manda ella — y se sirve tal cual salió de producción, byte a
 * byte, porque cualquier reinterpretación deja de verse igual. Esa es la
 * única forma honesta de prometer fidelidad: no recrear, servir.
 *
 * La capa de edición sigue funcionando encima (ver lb-mirror-html.ts): se
 * corrige el texto número N de la página P sin tocar el archivo original.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import { ident, num, safeUrl, str } from './common.js'

/** Una página HTML dentro del paquete. */
export type LbPackagePage = {
  id: string
  /** Ruta dentro del paquete: index.html, res/tema2.html… */
  path: string
  title: string
}

/**
 * Lo que hace falta para servir un paquete: por dónde se entra, qué páginas
 * tiene y qué textos se han corregido. Lo comparten la pieza importada —cuyo
 * guion ES su paquete— y la pieza final de cualquier otro tipo.
 */
export type LbPackage = {
  /**
   * El archivo que abre la pieza publicada. No tiene por qué ser una de las
   * páginas: un Rise abre por su reproductor y se edita por lecciones, que
   * no son archivos.
   */
  entry: string
  /** Las unidades editables: páginas del sitio, o lecciones del Rise. */
  pages: LbPackagePage[]
  /** `edits[ruta][índice de nodo] = texto nuevo`. Lo demás se sirve intacto. */
  edits: Record<string, Record<string, string>>
}

export const LB_FINAL_KINDS = ['PACKAGE', 'MEDIA'] as const
export type LbFinalKind = (typeof LB_FINAL_KINDS)[number]

export type LbFinal = LbPackage & {
  /** PACKAGE: sitio HTML con sus archivos · MEDIA: un solo archivo reproducible. */
  kind: LbFinalKind
  origin: {
    fileName: string
    importedAt: string
    bytes: number
    files: number
    /** Cuando el paquete traía imsmanifest. */
    scormVersion?: string
    manifestTitle?: string
  }
  /** Solo MEDIA: el archivo servido y, si lo hay, su pista de subtítulos. */
  media?: {
    url: string
    contentType: string
    captionsUrl?: string
    posterUrl?: string
    seconds?: number
  }
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

function sanitizePage(value: unknown): LbPackagePage | null {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const path = safePath(raw.path)
  if (!path) return null
  return { id: ident(raw.id, 'pg'), path, title: str(raw.title, 240) || path }
}

export function sanitizePackage(value: unknown): LbPackage {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

  const pages: LbPackagePage[] = []
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

  return { entry: safePath(raw.entry) || pages[0]?.path || '', pages, edits }
}

/**
 * La pieza final guardada en `LbResource.assets`. Devuelve null cuando no hay
 * ninguna, que es el caso normal mientras el recurso está en producción.
 */
export function sanitizeFinal(value: unknown): LbFinal | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const kind: LbFinalKind = raw.kind === 'MEDIA' ? 'MEDIA' : 'PACKAGE'

  const rawOrigin = (raw.origin && typeof raw.origin === 'object' ? raw.origin : {}) as Record<string, unknown>
  const origin: LbFinal['origin'] = {
    fileName: str(rawOrigin.fileName, 300),
    importedAt: str(rawOrigin.importedAt, 40),
    bytes: num(rawOrigin.bytes, 0, 0, Number.MAX_SAFE_INTEGER),
    files: num(rawOrigin.files, 0, 0, 100_000),
  }
  const scormVersion = str(rawOrigin.scormVersion, 40); if (scormVersion) origin.scormVersion = scormVersion
  const manifestTitle = str(rawOrigin.manifestTitle, 300); if (manifestTitle) origin.manifestTitle = manifestTitle

  const base = sanitizePackage(raw)

  if (kind === 'MEDIA') {
    const rawMedia = (raw.media && typeof raw.media === 'object' ? raw.media : {}) as Record<string, unknown>
    const url = safeUrl(rawMedia.url)
    // Un MEDIA sin archivo no es nada: se descarta entero.
    if (!url) return null
    const media: NonNullable<LbFinal['media']> = {
      url,
      contentType: str(rawMedia.contentType, 120) || 'application/octet-stream',
    }
    const captionsUrl = safeUrl(rawMedia.captionsUrl); if (captionsUrl) media.captionsUrl = captionsUrl
    const posterUrl = safeUrl(rawMedia.posterUrl); if (posterUrl) media.posterUrl = posterUrl
    if (rawMedia.seconds !== undefined) media.seconds = num(rawMedia.seconds, 0, 0, 360000)
    return { ...base, kind, origin, media }
  }

  // Un PACKAGE sin páginas o sin entrada no sirve para nada.
  if (!base.pages.length || !base.entry) return null
  return { ...base, kind, origin }
}

// ── Utilidades ───────────────────────────────────────────────────────────────

export function packageEditCount(value: LbPackage | null | undefined): number {
  if (!value) return 0
  return Object.values(value.edits).reduce((total, page) => total + Object.keys(page).length, 0)
}

export function pageAt(value: LbPackage | null | undefined, path: string): LbPackagePage | null {
  if (!value) return null
  const wanted = safePath(path)
  if (!wanted) return value.pages[0] || null
  return value.pages.find((page) => page.path === wanted) || null
}

/** Texto corto del estado de la pieza final, para la ficha y la biblioteca. */
export function describeFinal(final: LbFinal | null): string {
  if (!final) return 'Sin pieza final'
  if (final.kind === 'MEDIA') {
    const mb = final.origin.bytes ? ` · ${(final.origin.bytes / 1024 / 1024).toFixed(1)} MB` : ''
    return `Archivo final${final.media?.captionsUrl ? ' con subtítulos' : ''}${mb}`
  }
  const edits = packageEditCount(final)
  return `Paquete de ${final.origin.files} archivo(s)${edits ? ` · ${edits} texto(s) editado(s)` : ''}`
}
