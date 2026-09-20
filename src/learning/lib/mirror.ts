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
import { coverAnchors, pick, sanitizeCover, str, type LbAnchorTarget, type LbIssue } from './common.js'
import { packageEditCount, safePath, sanitizePackage, type LbPackage, type LbPackagePage } from './final.js'

// La ruta y las páginas son las mismas que las de cualquier pieza final: el
// modo copia fiel no es más que un recurso cuyo guion ES su paquete.
export { safePath }
export type LbMirrorPage = LbPackagePage

export const LB_MIRROR_ORIGINS = ['SCORM', 'HTML', 'ZIP'] as const
export type LbMirrorOrigin = (typeof LB_MIRROR_ORIGINS)[number]

export const LB_MIRROR_ORIGIN_LABEL: Record<LbMirrorOrigin, string> = {
  SCORM: 'Paquete SCORM',
  HTML: 'Página HTML',
  ZIP: 'Sitio comprimido',
}

export type LbMirrorContent = LbPackage & {
  cover: LbCover
  origin: {
    kind: LbMirrorOrigin
    fileName: string
    importedAt: string
    /** Qué dijo el imsmanifest, cuando lo había. */
    manifestTitle?: string
    scormVersion?: string
  }
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

export function sanitizeMirror(value: unknown): LbMirrorContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const rawOrigin = (raw.origin && typeof raw.origin === 'object' ? raw.origin : {}) as Record<string, unknown>

  const origin: LbMirrorContent['origin'] = {
    kind: pick(rawOrigin.kind, LB_MIRROR_ORIGINS, 'HTML'),
    fileName: str(rawOrigin.fileName, 300),
    importedAt: str(rawOrigin.importedAt, 40),
  }
  const manifestTitle = str(rawOrigin.manifestTitle, 300); if (manifestTitle) origin.manifestTitle = manifestTitle
  const scormVersion = str(rawOrigin.scormVersion, 40); if (scormVersion) origin.scormVersion = scormVersion

  return { ...sanitizePackage(raw), cover: sanitizeCover(raw.cover), origin }
}

export function scaffoldMirror(title: string): LbMirrorContent {
  return {
    cover: { title },
    origin: { kind: 'HTML', fileName: '', importedAt: '' },
    entry: '',
    pages: [],
    patches: {},
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

/**
 * Las directivas no entran aquí a propósito: una copia fiel conserva la línea
 * gráfica del paquete original, que es justo lo que el cliente quiere
 * mantener. Exigirle la del workspace sería contradecir el modo.
 */
export function validateMirror(content: LbMirrorContent): LbIssue[] {
  const issues: LbIssue[] = []
  if (!content.pages.length) {
    issues.push({
      level: 'error',
      message: 'Todavía no se ha subido el paquete. Sube el SCORM, el ZIP o el HTML en la pestaña Guion.',
    })
    return issues
  }
  if (!content.entry) {
    issues.push({ level: 'error', message: 'El paquete no dice por dónde se abre.' })
  }
  if (!content.cover.title) {
    issues.push({ level: 'warning', message: 'La pieza no tiene título propio; se usará el del archivo.' })
  }
  return issues
}

// ── Utilidades ───────────────────────────────────────────────────────────────

export function mirrorEditCount(content: LbMirrorContent): number {
  return packageEditCount(content)
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
