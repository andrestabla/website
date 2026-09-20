/**
 * Learning Builder · volver a empaquetar una pieza importada.
 *
 * Lo que sale es el paquete que entró: los mismos archivos, con las mismas
 * rutas, byte a byte. La única diferencia es que cada página HTML lleva
 * añadida en su cabecera la capa que aplica las ediciones, con las ediciones
 * escritas dentro — así el ZIP funciona descomprimido en un disco, subido a un
 * campus o abierto sin conexión, sin depender de esta plataforma para nada.
 *
 * Si el original era un SCORM, su imsmanifest se respeta: reescribirlo sería
 * romper justo lo que el cliente quiere conservar. Solo se añade un manifiesto
 * cuando el paquete no traía ninguno.
 */
import { injectEditsOnly, injectMirrorLayer, isHtmlPath } from './lb-mirror-html.js'
import { RISE_DATA_PATH, encodeRise, parseRise, riseWithEdits } from './lb-rise.js'
import { createZip, type ZipEntry } from './lb-zip.js'
import { safeFileName, scormIdentifier } from './lb-scorm.js'
import { escapeHtml } from '../../src/learning/lib/render-ova.js'
import type { LbBucket } from './lb-storage.js'
import type { LbPackage } from '../../src/learning/lib/final.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'

/** Manifiesto mínimo para un paquete que no traía el suyo. */
function wrapperManifest(options: { identifier: string; title: string; entry: string; files: string[] }): string {
  const { identifier, title, entry, files } = options
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeHtml(identifier)}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${escapeHtml(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true"><title>${escapeHtml(title)}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="${escapeHtml(entry)}">
${files.map((file) => `      <file href="${escapeHtml(file)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>`
}

export async function buildMirrorPackage(options: {
  pkg: LbPackage
  directives: LbDirectives
  bucket: LbBucket
  /** Prefijo de las claves del paquete en el almacenamiento. */
  folder: string
  files: Array<{ path: string }>
  title: string
  publicId: string
  /** scorm añade manifiesto si falta; html entrega el sitio tal cual. */
  format: 'scorm' | 'html'
}): Promise<{ buffer: Buffer; fileName: string }> {
  const { pkg, directives, bucket, folder, files, title, publicId, format } = options

  const entries: ZipEntry[] = []
  let hasManifest = false

  for (const file of files) {
    const bytes = await bucket.get(`${folder}/pkg/${file.path}`)
    if (file.path.toLowerCase() === 'imsmanifest.xml') hasManifest = true

    // En un Rise el contenido vive en sus datos, no en sus HTML: es ahí donde
    // hay que meter las correcciones para que el paquete descargado las lleve.
    if (file.path === RISE_DATA_PATH) {
      const data = parseRise(bytes.toString('utf8'))
      entries.push({
        path: file.path,
        data: data ? Buffer.from(encodeRise(riseWithEdits(data, pkg.edits, injectEditsOnly)), 'utf8') : bytes,
      })
      continue
    }

    if (!isHtmlPath(file.path)) {
      entries.push({ path: file.path, data: bytes })
      continue
    }

    // Dentro del ZIP los archivos ya están unos junto a otros, así que el
    // <base> es la propia carpeta de la página: «./». Y no hay visor al que
    // desviar los enlaces, porque todas las páginas viajan dentro.
    const depth = file.path.split('/').length - 1
    entries.push({
      path: file.path,
      data: injectMirrorLayer(bytes.toString('utf8'), {
        baseHref: './',
        packageRoot: depth ? '../'.repeat(depth) : './',
        edits: pkg.edits[file.path] || {},
      }),
    })
  }

  if (format === 'scorm' && !hasManifest) {
    entries.unshift({
      path: 'imsmanifest.xml',
      data: wrapperManifest({
        identifier: scormIdentifier(directives.exports.scormPrefix, title, publicId),
        title,
        entry: pkg.entry,
        files: files.map((file) => file.path),
      }),
    })
  }

  return {
    buffer: createZip(entries),
    fileName: `${safeFileName(title)}-${format === 'scorm' ? 'SCORM12' : 'HTML'}.zip`,
  }
}
