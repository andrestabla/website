/**
 * Cotizador — subida de imágenes (capturas de pantalla de la propuesta) a R2.
 * Privado: requiere el módulo COTIZADOR. Devuelve la URL pública.
 */
import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'
import { quoteSessionState } from '../_lib/quotes.js'
import { uploadImageToR2 } from '../_lib/r2.js'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations, applyServerEnv } from '../_lib/integrations.js'

/** Subida directa del navegador a R2 (URL firmada): imágenes grandes sin pasar por la función. */
const PRESIGN_MIME: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }
const PRESIGN_MAX = 25 * 1024 * 1024

async function presign(body: any, username: string) {
  const contentType = String(body.contentType || '').trim().toLowerCase()
  const ext = PRESIGN_MIME[contentType]
  if (!ext) throw new Error(`Tipo de imagen no soportado: ${contentType || 'desconocido'}`)
  if (Number(body.size) > PRESIGN_MAX) throw new Error('La imagen supera 25 MB')
  const snapshot = await (prisma as any).cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const r2 = applyServerEnv(sanitizeIntegrations(snapshot?.data ?? {})).r2
  if (!r2.enabled || r2.status !== 'configured') throw new Error('La integración con R2 no está habilitada en Integraciones')
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) throw new Error('Credenciales de R2 incompletas')
  const safeBase = String(body.filename || 'imagen').replace(/\.[a-zA-Z0-9]+$/, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'imagen'
  const key = `cotizador/${new Date().toISOString().slice(0, 10)}/${safeBase}-${crypto.randomUUID()}.${ext}`
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' })
  const signed = await aws.sign(new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`), {
    method: 'PUT', aws: { signQuery: true }, headers: { 'Content-Type': contentType },
  })
  const base = publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`
  void username
  return { presignedUrl: signed.url, key, url: `${base}/${key}` }
}

type VercelRequest = any
type VercelResponse = any

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }
export const maxDuration = 30

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = await quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    if (body.op === 'presign') return res.status(200).json({ ok: true, ...(await presign(body, session.username)) })
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
