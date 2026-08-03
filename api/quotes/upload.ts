/**
 * Cotizador — subida de imágenes (capturas de pantalla de la propuesta) a R2.
 * Privado: requiere el módulo COTIZADOR. Devuelve la URL pública.
 */
import { quoteSessionState } from '../_lib/quotes.js'
import { uploadImageToR2 } from '../_lib/r2.js'

type VercelRequest = any
type VercelResponse = any

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }
export const maxDuration = 30

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const raw = String(body.fileBase64 || body.base64 || '')
    if (!raw) return res.status(400).json({ ok: false, error: 'Falta el archivo' })
    const base64 = raw.includes(',') ? raw.split(',').pop()! : raw

    const result = await uploadImageToR2({
      buffer: Buffer.from(base64, 'base64'),
      contentType: String(body.contentType || body.mimeType || 'image/png'),
      filename: String(body.filename || body.fileName || 'captura'),
      folder: 'cotizador',
      uploadedBy: session.username,
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (error: any) {
    console.error('quotes/upload error:', error)
    return res.status(400).json({ ok: false, error: error?.message || 'No se pudo subir la imagen' })
  }
}
