/**
 * Learning Builder · importar un SCORM o un HTML y dejarlo editable.
 *
 *   op=begin   → abre una subida por trozos
 *   op=part    → recibe un trozo
 *   op=ingest  → recompone el archivo, lo abre y publica sus páginas
 *   op=clear   → borra el paquete y deja el recurso vacío
 *
 * La subida va por trozos porque un paquete real pesa decenas de megas y el
 * cuerpo de una función serverless no llega a cinco. Cada trozo se guarda
 * suelto en el almacenamiento y solo al final se juntan: así ninguna petición
 * se acerca al límite y una subida interrumpida no deja nada a medias en la
 * base de datos, solo unos trozos huérfanos que el siguiente intento pisa.
 *
 * Lo que se guarda son los archivos tal cual venían, con sus rutas relativas
 * intactas. Esa es la promesa del modo copia fiel: lo que se publica es el
 * original, no una interpretación suya.
 */
import crypto from 'node:crypto'
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { contentTypeFor, isHtmlPath } from '../_lib/lb-mirror-html.js'
import { lbFiles, lbResources, loadResource, snapshot } from '../_lib/lb-store.js'
import { resourceFolder, workspaceBucket, type LbBucket } from '../_lib/lb-storage.js'
import { LbZipError, stripCommonRoot, unzip, type LbZipEntry } from '../_lib/lb-unzip.js'
import { familyOf } from '../../src/learning/lib/content.js'
import { sanitizeMirror, type LbMirrorContent, type LbMirrorPage } from '../../src/learning/lib/mirror.js'
import { newLbId } from '../../src/learning/lib/common.js'

type VercelRequest = any
type VercelResponse = any

/** Lo que cabe recomponer en memoria dentro de una función sin apurarla. */
const MAX_PACKAGE_BYTES = 60 * 1024 * 1024
const MAX_PARTS = 40

function staging(folder: string, uploadId: string): string {
  return `${folder}/.subiendo/${uploadId}`
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')
  const resourceId = String(body.resourceId || '')

  try {
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)
    if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace } = loaded

    const check = await guard(req, resource.workspaceId, 'resource.edit', gate.session)
    if (!check.ok) return denied(res, check)

    if (familyOf(resource.kind) !== 'mirror') {
      return res.status(400).json({ ok: false, error: 'Solo las piezas importadas admiten un paquete original.' })
    }

    const bucket = await workspaceBucket(workspace)
    const folder = resourceFolder(workspace.code, resource.code)

    // ── Abrir la subida ──
    if (op === 'begin') {
      const bytes = Number(body.bytes || 0)
      if (!Number.isFinite(bytes) || bytes <= 0) {
        return res.status(400).json({ ok: false, error: 'Falta el tamaño del archivo' })
      }
      if (bytes > MAX_PACKAGE_BYTES) {
        return res.status(400).json({
          ok: false,
          error: `El paquete pesa ${(bytes / 1024 / 1024).toFixed(1)} MB; el máximo admitido es ${MAX_PACKAGE_BYTES / 1024 / 1024} MB.`,
        })
      }
      return res.status(200).json({ ok: true, uploadId: crypto.randomUUID(), maxPartBytes: 2 * 1024 * 1024 })
    }

    // ── Recibir un trozo ──
    if (op === 'part') {
      const uploadId = String(body.uploadId || '').replace(/[^a-f0-9-]/gi, '')
      const index = Number(body.index)
      const base64 = String(body.data || '')
      if (!uploadId) return res.status(400).json({ ok: false, error: 'Falta el identificador de la subida' })
      if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) {
        return res.status(400).json({ ok: false, error: 'Trozo fuera de rango' })
      }
      if (!base64) return res.status(400).json({ ok: false, error: 'Trozo vacío' })
      const chunk = Buffer.from(base64, 'base64')
      await bucket.put(
        `${staging(folder, uploadId)}/${String(index).padStart(3, '0')}`,
        chunk,
        'application/octet-stream'
      )
      return res.status(200).json({ ok: true, index, bytes: chunk.length })
    }

    // ── Borrar el paquete ──
    if (op === 'clear') {
      const files = await lbFiles().findMany({ where: { resourceId: resource.id }, select: { id: true, path: true } })
      await bucket.remove(files.map((file: any) => `${folder}/pkg/${file.path}`))
      await lbFiles().deleteMany({ where: { resourceId: resource.id } })
      const empty: LbMirrorContent = sanitizeMirror({ cover: { title: resource.title } })
      await snapshot(resource.id, resource.content, 'import', check.session.userId, 'Antes de borrar el paquete')
      await lbResources().update({
        where: { id: resource.id },
        data: { content: empty as any, importMode: null, importMeta: null },
      })
      return res.status(200).json({ ok: true, content: empty })
    }

    if (op !== 'ingest') return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })

    // ── Recomponer, abrir y publicar ──
    const uploadId = String(body.uploadId || '').replace(/[^a-f0-9-]/gi, '')
    const parts = Number(body.parts || 0)
    const fileName = String(body.fileName || 'paquete.zip').slice(0, 300)
    if (!uploadId || !Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
      return res.status(400).json({ ok: false, error: 'La subida no está completa' })
    }

    const chunks: Buffer[] = []
    for (let index = 0; index < parts; index += 1) {
      chunks.push(await bucket.get(`${staging(folder, uploadId)}/${String(index).padStart(3, '0')}`))
    }
    const archive = Buffer.concat(chunks)
    // Los trozos ya no hacen falta; si el borrado falla no es grave, pero
    // dejarlos costaría almacenamiento en cada intento.
    void bucket
      .remove(Array.from({ length: parts }, (_, i) => `${staging(folder, uploadId)}/${String(i).padStart(3, '0')}`))
      .catch(() => undefined)

    const isZip = archive.length > 4 && archive.readUInt32LE(0) === 0x04034b50
    let entries: LbZipEntry[]
    if (isZip) {
      try {
        entries = stripCommonRoot(unzip(archive))
      } catch (error) {
        if (error instanceof LbZipError) return res.status(400).json({ ok: false, error: error.message })
        throw error
      }
    } else {
      // Un HTML suelto es un paquete de un solo archivo.
      const single = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm')
      if (!single) {
        return res.status(400).json({ ok: false, error: 'El archivo no es un ZIP ni un HTML.' })
      }
      entries = [{ path: 'index.html', bytes: archive }]
    }

    if (!entries.length) return res.status(400).json({ ok: false, error: 'El paquete está vacío.' })
    const paths = entries.map((entry) => entry.path)
    if (!paths.some(isHtmlPath)) {
      return res.status(400).json({ ok: false, error: 'El paquete no contiene ninguna página HTML.' })
    }

    const manifestEntry = entries.find((entry) => entry.path.toLowerCase() === 'imsmanifest.xml')
    const manifest = manifestEntry
      ? readManifest(manifestEntry.bytes.toString('utf8'))
      : { entry: '', title: '', version: '', titles: new Map<string, string>() }

    const entry = (manifest.entry && paths.includes(manifest.entry) ? manifest.entry : '') || guessEntry(paths)
    if (!entry) return res.status(400).json({ ok: false, error: 'No se encontró la página de entrada del paquete.' })

    // Lo anterior se borra antes de subir lo nuevo: dos paquetes mezclados en
    // la misma carpeta dejarían archivos del viejo sirviéndose al nuevo.
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
    const previousContent = resource.content
    const content = sanitizeMirror({
      // Se conserva lo que ya hubiera escrito el equipo en la portada.
      cover: {
        ...(previousContent && typeof previousContent === 'object' ? (previousContent as any).cover : {}),
        title:
          (previousContent as any)?.cover?.title || manifest.title || htmlTitle(entries[0].bytes) || resource.title,
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
      // Las ediciones no sobreviven a un paquete nuevo: sus números apuntaban
      // a los nodos del anterior y caerían sobre textos distintos.
      edits: {},
    })

    await snapshot(resource.id, previousContent, 'import', check.session.userId, `Antes de importar «${fileName}»`)
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

    return res.status(200).json({
      ok: true,
      content,
      files: stored.length,
      bytes: archive.length,
      storage: bucket.source,
      dropped: entries.length - stored.length,
    })
  } catch (error: any) {
    console.error('api/learning/import error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
