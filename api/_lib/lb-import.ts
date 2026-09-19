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
import { sanitizeMirror, type LbMirrorContent, type LbMirrorPage } from '../../src/learning/lib/mirror.js'
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
  const preferred = ['index.html', 'index.htm', 'story.html', 'scormdriver/indexAPI.html', 'default.html']
  for (const candidate of preferred) {
    const found = html.find((path) => path.toLowerCase() === candidate.toLowerCase())
    if (found) return found
  }
  // Si no, la más superficial del árbol, y a igualdad la primera por nombre.
  return [...html].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0] || ''
}

async function storePackage(
  bucket: LbBucket,
  folder: string,
  entries: LbZipEntry[]
): Promise<Array<{ path: string; url: string; contentType: string; bytes: number }>> {
  const stored: Array<{ path: string; url: string; contentType: string; bytes: number }> = []
  for (const entry of entries) {
    const contentType = contentTypeFor(entry.path)
    const result = await bucket.put(`${folder}/pkg/${entry.path}`, entry.bytes, contentType)
    stored.push({ path: entry.path, url: result.url, contentType, bytes: result.bytes })
  }
  return stored
}


/** Lo que el paquete resultó ser, para contarlo en la respuesta. */
export type IngestResult = {
  content: LbMirrorContent
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
  resource: { id: string; title: string; code: string; content: unknown }
  workspace: { code: string }
  bucket: LbBucket
  userId?: string
}): Promise<IngestResult> {
  const { archive, fileName, resource, workspace, bucket, userId } = options
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

  const entry = (manifest.entry && paths.includes(manifest.entry) ? manifest.entry : '') || guessEntry(paths)
  if (!entry) throw new LbZipError('No se encontró la página de entrada del paquete.')

  const previous = await lbFiles().findMany({ where: { resourceId: resource.id }, select: { path: true } })
  if (previous.length) {
    await bucket.remove(previous.map((file: any) => `${folder}/pkg/${file.path}`))
    await lbFiles().deleteMany({ where: { resourceId: resource.id } })
  }

  const stored = await storePackage(bucket, folder, entries)
  await lbFiles().createMany({
    data: stored.map((file) => ({
      resourceId: resource.id,
      path: file.path,
      url: file.url,
      contentType: file.contentType,
      bytes: file.bytes,
    })),
  })

  const pages: LbMirrorPage[] = entries
    .filter((candidate) => isHtmlPath(candidate.path))
    .map((candidate) => ({
      id: newLbId('pg'),
      path: candidate.path,
      title: manifest.titles.get(candidate.path) || htmlTitle(candidate.bytes) || candidate.path,
    }))
    // La de entrada primero: es la que abre el visor y la que se edita antes.
    .sort((a, b) => (a.path === entry ? -1 : b.path === entry ? 1 : a.path.localeCompare(b.path)))

  const kind = isZip ? (manifestEntry ? 'SCORM' : 'ZIP') : 'HTML'
  const previousContent = resource.content as any
  const content = sanitizeMirror({
    // Se conserva lo que ya hubiera escrito el equipo en la portada.
    cover: {
      ...(previousContent && typeof previousContent === 'object' ? previousContent.cover : {}),
      title: previousContent?.cover?.title || manifest.title || htmlTitle(entries[0].bytes) || resource.title,
    },
    origin: {
      kind,
      fileName,
      importedAt: new Date().toISOString(),
      manifestTitle: manifest.title,
      scormVersion: manifest.version,
    },
    entry,
    pages,
    // Las ediciones no sobreviven a un paquete nuevo: sus números apuntaban a
    // los nodos del anterior y caerían sobre textos distintos.
    edits: {},
  })

  await snapshot(resource.id, previousContent, 'import', userId, `Antes de importar «${fileName}»`)
  await lbResources().update({
    where: { id: resource.id },
    data: {
      content: content as any,
      importMode: 'MIRROR',
      importMeta: {
        fileName,
        bytes: archive.length,
        files: stored.length,
        entry,
        scormVersion: manifest.version || null,
      } as any,
    },
  })

  return { content, files: stored.length, bytes: archive.length, kind }
}
