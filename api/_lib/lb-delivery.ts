/**
 * Learning Builder · versiones entregadas del paquete (V1, V2, V3…).
 *
 * Una pieza producida se revisa, se ajusta y se vuelve a entregar. Para que
 * esa historia se pueda rastrear, subir un paquete nuevo puede abrir una
 * versión nueva en vez de pisar la anterior: los archivos de cada versión se
 * guardan en su propia carpeta del almacenamiento, sus filas de archivo llevan
 * su número, y la ficha de la versión (LbDelivery) guarda cómo quedó —sus
 * páginas y sus retoques— al cerrarse.
 *
 * La versión viva (LbResource.packageVersion) es la que se publica y la que se
 * revisa por defecto; su paquete sale del propio recurso, como siempre. Las
 * anteriores salen de su ficha.
 */
import { prisma } from './prisma.js'
import { deliverablePackage, familyOf, sanitizeResourceContent } from '../../src/learning/lib/content.js'
import { sanitizeFinal, type LbFinal, type LbPackage } from '../../src/learning/lib/final.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'

export const lbDeliveries = () => (prisma as any).lbDelivery

/**
 * Carpeta del almacenamiento de una versión. La V1 sigue en «…/pkg», donde
 * siempre han estado los paquetes, para no tener que mover nada de lo ya subido.
 */
export function pkgPrefix(folder: string, version: number): string {
  return version > 1 ? `${folder}/v${version}/pkg` : `${folder}/pkg`
}

/** La versión viva de un recurso, que en los anteriores a las versiones es la 1. */
export function liveVersion(resource: { packageVersion?: number | null }): number {
  const value = Number(resource?.packageVersion)
  return Number.isInteger(value) && value > 0 ? value : 1
}

/** Lo que se guarda de una versión al cerrarla: su paquete con los retoques. */
export function snapshotOf(resource: { kind: string; content: unknown; assets: unknown }) {
  return familyOf(resource.kind) === 'mirror' ? { content: resource.content } : { final: resource.assets }
}

/**
 * El paquete de una versión. La viva sale del recurso; una anterior, de la
 * ficha que se guardó al cerrarla. null si la versión no existe o no tiene
 * paquete que servir.
 */
export async function packageAt(
  loaded: { resource: any; content: any; final: any; directives: LbDirectives },
  asked?: number | null
): Promise<{ version: number; live: boolean; pkg: LbPackage } | null> {
  const live = liveVersion(loaded.resource)
  const version = asked && asked > 0 ? asked : live
  if (version === live) {
    const pkg = deliverablePackage(loaded.resource.kind, loaded.content, loaded.final)
    return pkg ? { version, live: true, pkg } : null
  }
  const delivery = await lbDeliveries().findUnique({
    where: { resourceId_version: { resourceId: loaded.resource.id, version } },
  })
  if (!delivery) return null
  const snap = (delivery.snapshot || {}) as { content?: unknown; final?: unknown }
  const kind = loaded.resource.kind
  const pkg =
    familyOf(kind) === 'mirror'
      ? deliverablePackage(kind, sanitizeResourceContent(kind, snap.content, loaded.directives), null)
      : deliverablePackage(kind, loaded.content, (() => {
          const final = sanitizeFinal(snap.final)
          // Una versión anterior se sirve aunque hoy la pieza final no se entregue.
          return final ? { ...final, deliver: true } : null
        })())
  return pkg ? { version, live: false, pkg } : null
}

/**
 * El archivo de una versión cuando la pieza es un medio —un MP4, un MP3— y no
 * un sitio. La viva sale del recurso; una anterior, de la ficha que se guardó
 * al cerrarla, que es donde quedó su URL.
 *
 * Un medio no se empaqueta para entregarlo: se descarga. Por eso esto devuelve
 * de dónde bajarlo y no un paquete que habría que armar en memoria, que con un
 * video de veintiséis megas es justo lo que no conviene hacer en una función.
 */
export async function mediaAt(
  loaded: { resource: any; final: LbFinal | null },
  asked?: number | null
): Promise<{ version: number; live: boolean; media: NonNullable<LbFinal['media']>; fileName: string } | null> {
  const live = liveVersion(loaded.resource)
  const version = asked && asked > 0 ? asked : live
  let final = loaded.final
  if (version !== live) {
    const delivery = await lbDeliveries().findUnique({
      where: { resourceId_version: { resourceId: loaded.resource.id, version } },
    })
    if (!delivery) return null
    final = sanitizeFinal((delivery.snapshot as { final?: unknown } | null)?.final)
  }
  if (!final || final.kind !== 'MEDIA' || !final.media?.url) return null
  return {
    version,
    live: version === live,
    media: final.media,
    fileName: final.origin?.fileName || final.entry || 'medio',
  }
}

/**
 * La versión pedida en una ruta de archivo: «~v/2/scormcontent/index.html».
 * Sin prefijo, la ruta es de la versión viva.
 */
export function splitVersionPath(path: string): { version: number | null; path: string } {
  const match = /^~v\/(\d{1,4})\/(.*)$/.exec(path)
  return match ? { version: Number(match[1]), path: match[2] } : { version: null, path }
}
