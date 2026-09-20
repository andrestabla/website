/**
 * Learning Builder · subir una imagen a la pieza.
 *
 *   op=image → guarda la imagen en el almacenamiento del workspace y
 *              devuelve su URL, lista para colgarla de un retoque.
 *
 * Va al bucket del cliente cuando el workspace tiene el suyo, igual que todo
 * lo demás: una imagen que el editor sube pasa a formar parte del material
 * del cliente y no tiene por qué acabar en la cuenta de la plataforma.
 *
 * No se reutiliza el subidor de imágenes del panel: aquel escribe siempre en
 * el R2 de la plataforma y con una ruta suya. Aquí la ruta cuelga del recurso
 * para que borrarlo se lleve también sus imágenes.
 */
import crypto from 'node:crypto'
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { contentTypeFor } from '../_lib/lb-mirror-html.js'
import { loadResource } from '../_lib/lb-store.js'
import { resourceFolder, workspaceBucket } from '../_lib/lb-storage.js'

type VercelRequest = any
type VercelResponse = any

/** Lo que un editor sube de una vez; por encima, que la optimice antes. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const resourceId = String(body.resourceId || '')

  try {
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)
    if (String(body.op || '') !== 'image') {
      return res.status(400).json({ ok: false, error: `Operación desconocida: ${body.op}` })
    }
    if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace } = loaded

    const check = await guard(req, resource.workspaceId, 'resource.edit', gate.session)
    if (!check.ok) return denied(res, check)

    // Llega como data URL desde el selector de archivos del navegador.
    const dataUrl = String(body.dataUrl || '')
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl)
    if (!match) return res.status(400).json({ ok: false, error: 'La imagen no llegó en el formato esperado' })

    const contentType = match[1].toLowerCase()
    if (!ALLOWED.has(contentType)) {
      return res.status(400).json({ ok: false, error: `Tipo de imagen no admitido: ${contentType}` })
    }
    const bytes = Buffer.from(match[2], 'base64')
    if (!bytes.length) return res.status(400).json({ ok: false, error: 'La imagen está vacía' })
    if (bytes.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        ok: false,
        error: `La imagen pesa ${(bytes.length / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      })
    }

    const name = String(body.fileName || 'imagen')
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'imagen'
    const ext = contentType === 'image/svg+xml' ? 'svg' : contentType.split('/')[1]
    // El azar del nombre evita que la caché del navegador devuelva la anterior.
    const key = `${resourceFolder(workspace.code, resource.code)}/media/${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const bucket = await workspaceBucket(workspace)
    const stored = await bucket.put(key, bytes, contentTypeFor(key) || contentType, MAX_IMAGE_BYTES)

    return res.status(200).json({ ok: true, url: stored.url, bytes: stored.bytes, storage: bucket.source })
  } catch (error: any) {
    console.error('api/learning/media error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
