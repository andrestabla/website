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
import { LbZipError, ingestPackage } from '../_lib/lb-import.js'
import { lbFiles, lbResources, loadResource, snapshot } from '../_lib/lb-store.js'
import { resourceFolder, workspaceBucket } from '../_lib/lb-storage.js'
import { familyOf } from '../../src/learning/lib/content.js'
import { sanitizeMirror, type LbMirrorContent } from '../../src/learning/lib/mirror.js'

type VercelRequest = any
type VercelResponse = any

/** Lo que cabe recomponer en memoria dentro de una función sin apurarla. */
const MAX_PACKAGE_BYTES = 60 * 1024 * 1024
const MAX_PARTS = 40

function staging(folder: string, uploadId: string): string {
  return `${folder}/.subiendo/${uploadId}`
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

    try {
      const result = await ingestPackage({
        archive,
        fileName,
        resource,
        workspace,
        bucket,
        userId: check.session.userId,
      })
      return res.status(200).json({ ok: true, ...result, storage: bucket.source })
    } catch (error) {
      // Un paquete que no se puede abrir es culpa del archivo, no del servidor:
      // su mensaje va dirigido a quien lo subió.
      if (error instanceof LbZipError) return res.status(400).json({ ok: false, error: error.message })
      throw error
    }
  } catch (error: any) {
    console.error('api/learning/import error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
