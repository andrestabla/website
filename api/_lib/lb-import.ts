/**
 * Learning Builder · abrir un paquete importado.
 *
 * Aquí vive lo que de verdad hace la importación: leer el manifiesto si lo
 * hay, decidir por dónde se entra, subir cada archivo conservando su ruta y
 * componer el guion de la copia fiel.
 *
 * Está separado del endpoint a propósito. El endpoint se ocupa de la sesión,
 * de los permisos y de recomponer los trozos de la subida; esto se ocupa del
 * paquete. Así lo puede ejercitar un script con un SCORM real sin inventarse
 * una sesión ni duplicar la lógica, que es la única forma de que lo que se
 * prueba sea lo que se ejecuta.
 */
import { contentTypeFor, isHtmlPath } from './lb-mirror-html.js'
import { lbFiles, lbResources, snapshot } from './lb-store.js'
import { resourceFolder, type LbBucket } from './lb-storage.js'
import { LbZipError, stripCommonRoot, unzip, type LbZipEntry } from './lb-unzip.js'
import { RISE_DATA_PATH, parseRise, riseLessonPath, riseLessons } from './lb-rise.js'
import { sanitizeMirror, type LbMirrorContent } from '../../src/learning/lib/mirror.js'
import { sanitizeFinal, type LbFinal, type LbPackagePage } from '../../src/learning/lib/final.js'
import { familyOf } from '../../src/learning/lib/content.js'
import { newLbId } from '../../src/learning/lib/common.js'

export { LbZipError }

// ── Lectura del manifiesto SCORM ─────────────────────────────────────────────

/**
 * Qué dice el imsmanifest: por dónde se entra, cómo se llama y qué versión de
 * SCORM declara. Se lee con expresiones regulares y no con un parser de XML
 * porque solo hacen falta tres datos y ninguno está anidado de forma
 * ambigua; si algo no aparece, se cae al reparto por convención.
 */
function readManifest(xml: string): { entry: string; title: string; version: string; titles: Map<string, string> } {
  const decode = (value: string) =>
    value
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&')

  const version = /<schemaversion[^>]*>([^<]+)</i.exec(xml)?.[1]?.trim() || ''
  const title = decode(/<organization\b[^>]*>[\s\S]*?<title[^>]*>([^<]*)</i.exec(xml)?.[1] || '').trim()

  // Cada <resource> declara su href; cada <item> apunta a uno y le pone nombre.
  const hrefById = new Map<string, string>()
  for (const match of xml.matchAll(/<resource\b([^>]*)>/gi)) {
    const attrs = match[1]
    const id = /identifier="([^"]+)"/i.exec(attrs)?.[1]
    const href = /href="([^"]+)"/i.exec(attrs)?.[1]
    if (id && href) hrefById.set(id, decode(href))
  }

  const titles = new Map<string, string>()
  let entry = ''
  for (const match of xml.matchAll(/<item\b([^>]*)>([\s\S]*?)<\/item>/gi)) {
    const ref = /identifierref="([^"]+)"/i.exec(match[1])?.[1]
    if (!ref) continue
    const href = hrefById.get(ref)
    if (!href) continue
    const itemTitle = decode(/<title[^>]*>([^<]*)</i.exec(match[2])?.[1] || '').trim()
    if (itemTitle) titles.set(href.split('?')[0], itemTitle)
    if (!entry) entry = href.split('?')[0]
  }
  if (!entry) entry = [...hrefById.values()][0]?.split('?')[0] || ''

  return { entry, title, version, titles }
}

function htmlTitle(bytes: Buffer): string {
  const head = bytes.subarray(0, 4000).toString('utf8')
  const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] || ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, 240)
}

/** Por dónde se entra cuando no hay manifiesto: la convención de siempre. */
function guessEntry(paths: string[]): string {
  const html = paths.filter(isHtmlPath)
  const preferred = ['index.html', 'index.htm', 'story.html', 'default.html']
  for (const candidate of preferred) {
    const found = html.find((path) => path.toLowerCase() === candidate.toLowerCase())
    if (found) return found
  }
  // Si no, la más superficial del árbol, y a igualdad la primera por nombre.
  return [...html].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0] || ''
}

/**
 * La página por la que se entra **al verla fuera de un LMS**.
 *
 * El manifiesto de un SCORM no apunta al contenido sino a su envoltorio: el
 * de Rise entra por `scormdriver/indexAPI.html`, que lo primero que hace es
 * buscar la API del LMS. Servido en un enlace público eso se queda en
 * «Loading course» para siempre. El contenido real está al lado, y es lo que
 * hay que abrir.
 *
 * El manifiesto no se toca: la exportación sigue entregando el paquete tal
 * cual, con su envoltorio, para que en el campus funcione como siempre.
 */
const DRIVERS = [/^scormdriver\//i, /indexapi\.html$/i, /^goodbye\.html$/i, /^blank\.html$/i]

function standaloneEntry(manifestEntry: string, paths: string[]): string {
  const known = new Set(paths)
  const usable = manifestEntry && known.has(manifestEntry) ? manifestEntry : ''
  if (usable && !DRIVERS.some((driver) => driver.test(usable))) return usable

  // Envoltorio: se busca el contenido que empaquetan las herramientas al uso.
  const inside = ['scormcontent/index.html', 'content/index.html', 'res/index.html', 'story_html5.html']
  for (const candidate of inside) {
    const found = paths.find((path) => path.toLowerCase() === candidate)
    if (found) return found
  }
  return guessEntry(paths.filter((path) => !DRIVERS.some((driver) => driver.test(path)))) || usable
}

async function storePackage(
  bucket: LbBucket,
  folder: string,
  entries: LbZipEntry[],
  maxFileBytes?: number
): Promise<Array<{ path: string; url: string; contentType: string; bytes: number }>> {
  const stored: Array<{ path: string; url: string; contentType: string; bytes: number }> = []
  for (const entry of entries) {
    const contentType = contentTypeFor(entry.path)
    const result = await bucket.put(`${folder}/pkg/${entry.path}`, entry.bytes, contentType, maxFileBytes)
    stored.push({ path: entry.path, url: result.url, contentType, bytes: result.bytes })
  }
  return stored
}


/** Lo que el paquete resultó ser, para contarlo en la respuesta. */
export type IngestResult = {
  /** Solo cuando el recurso es una pieza importada: su guion es el paquete. */
  content: LbMirrorContent | null
  /** La pieza final adjunta, para los demás tipos. */
  final: LbFinal | null
  files: number
  bytes: number
  kind: 'SCORM' | 'ZIP' | 'HTML'
}

/**
 * Abre el archivo, sube su contenido y deja el recurso apuntando a él. Lo
 * anterior se borra antes de subir lo nuevo: dos paquetes mezclados en la
 * misma carpeta dejarían archivos del viejo sirviéndose al nuevo.
 */
export async function ingestPackage(options: {
  archive: Buffer
  fileName: string
  resource: { id: string; title: string; code: string; kind: string; content: unknown }
  workspace: { code: string }
  bucket: LbBucket
  userId?: string
  /**
   * Tope por archivo dentro del paquete. Un Rise real trae videos de más de
   * 25 MB incrustados, así que quien sube desde un script lo levanta; dentro
   * de la función se deja el de siempre, que protege su memoria.
   */
  maxFileBytes?: number
}): Promise<IngestResult> {
  const { archive, fileName, resource, workspace, bucket, userId, maxFileBytes } = options
  const folder = resourceFolder(workspace.code, resource.code)

  const isZip = archive.length > 4 && archive.readUInt32LE(0) === 0x04034b50
  let entries: LbZipEntry[]
  if (isZip) {
    entries = stripCommonRoot(unzip(archive))
  } else {
    const single = /\.x?html?$/i.test(fileName)
    if (!single) throw new LbZipError('El archivo no es un ZIP ni un HTML.')
    entries = [{ path: 'index.html', bytes: archive }]
  }

  if (!entries.length) throw new LbZipError('El paquete está vacío.')
  const paths = entries.map((entry) => entry.path)
  if (!paths.some(isHtmlPath)) throw new LbZipError('El paquete no contiene ninguna página HTML.')

  const manifestEntry = entries.find((entry) => entry.path.toLowerCase() === 'imsmanifest.xml')
  const manifest = manifestEntry
    ? readManifest(manifestEntry.bytes.toString('utf8'))
    : { entry: '', title: '', version: '', titles: new Map<string, string>() }

  const entry = standaloneEntry(manifest.entry, paths)
  if (!entry) throw new LbZipError('No se encontró la página de entrada del paquete.')


  const previous = await lbFiles().findMany({ where: { resourceId: resource.id }, select: { path: true } })
  if (previous.length) {
    await bucket.remove(previous.map((file: any) => `${folder}/pkg/${file.path}`))
    await lbFiles().deleteMany({ where: { resourceId: resource.id } })
  }

  const stored = await storePackage(bucket, folder, entries, maxFileBytes)
  await lbFiles().createMany({
    data: stored.map((file) => ({
      resourceId: resource.id,
      path: file.path,
      url: file.url,
      contentType: file.contentType,
      bytes: file.bytes,
    })),
  })

  // Un Rise no tiene páginas: tiene lecciones, y sus archivos HTML son el
  // armazón del reproductor. Listar el armazón sería enseñar las tripas en
  // vez del contenido, así que las páginas son las lecciones.
  const riseFile = entries.find((candidate) => candidate.path === RISE_DATA_PATH)
  const rise = riseFile ? parseRise(riseFile.bytes.toString('utf8')) : null

  const pages: LbPackagePage[] = rise
    ? riseLessons(rise).map((lesson) => ({
        id: newLbId('pg'),
        path: riseLessonPath(lesson.id),
        title: lesson.title,
      }))
    : entries
        .filter((candidate) => isHtmlPath(candidate.path))
        .map((candidate) => ({
          id: newLbId('pg'),
          path: candidate.path,
          title: manifest.titles.get(candidate.path) || htmlTitle(candidate.bytes) || candidate.path,
        }))
        // La de entrada primero: es la que abre el visor y la que se edita antes.
        .sort((a, b) => (a.path === entry ? -1 : b.path === entry ? 1 : a.path.localeCompare(b.path)))

  const kind = isZip ? (manifestEntry ? 'SCORM' : 'ZIP') : 'HTML'
  const origin = {
    fileName,
    importedAt: new Date().toISOString(),
    bytes: archive.length,
    files: stored.length,
    manifestTitle: manifest.title,
    scormVersion: manifest.version,
  }
  const importMeta = { fileName, bytes: archive.length, files: stored.length, entry, scormVersion: manifest.version || null }

  await snapshot(resource.id, resource.content, 'import', userId, `Antes de importar «${fileName}»`)

  // Una pieza importada es su paquete: va en el guion. En cualquier otro tipo
  // el guion sigue siendo el guion y el paquete se adjunta como pieza final,
  // de modo que se puede seguir editando el uno sin perder la otra.
  if (familyOf(resource.kind) === 'mirror') {
    const previousContent = resource.content as any
    const content = sanitizeMirror({
      cover: {
        ...(previousContent && typeof previousContent === 'object' ? previousContent.cover : {}),
        title: previousContent?.cover?.title || manifest.title || htmlTitle(entries[0].bytes) || resource.title,
      },
      origin: { kind, fileName, importedAt: origin.importedAt, manifestTitle: manifest.title, scormVersion: manifest.version },
      entry,
      pages,
      // Las ediciones no sobreviven a un paquete nuevo: sus números apuntaban
      // a los nodos del anterior y caerían sobre textos distintos.
      edits: {},
    })
    await lbResources().update({
      where: { id: resource.id },
      data: { content: content as any, importMode: 'MIRROR', importMeta: importMeta as any },
    })
    return { content, final: null, files: stored.length, bytes: archive.length, kind }
  }

  const final = sanitizeFinal({ kind: 'PACKAGE', origin, entry, pages, edits: {} })
  await lbResources().update({
    where: { id: resource.id },
    data: { assets: final as any, importMeta: importMeta as any },
  })
  return { content: null, final, files: stored.length, bytes: archive.length, kind }
}
