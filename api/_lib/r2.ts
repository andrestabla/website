/**
 * Subida de imágenes a Cloudflare R2 — helper compartido.
 * Lo usan el uploader del panel y el del Cotizador; también los seeds.
 */
import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations, applyServerEnv } from './integrations.js'

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

export const R2_MAX_BYTES = 4 * 1024 * 1024

export async function uploadImageToR2(opts: {
  buffer: Buffer
  contentType: string
  filename?: string
  folder?: string
  uploadedBy?: string
}): Promise<{ url: string; key: string }> {
  const contentType = opts.contentType.trim().toLowerCase()
  const ext = ALLOWED_MIME[contentType]
  if (!ext) throw new Error(`Tipo de imagen no soportado: ${contentType}`)
  if (!opts.buffer.length) throw new Error('Archivo vacío')
  if (opts.buffer.length > R2_MAX_BYTES) throw new Error('La imagen supera 4 MB')

  const snapshot = await (prisma as any).cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data ?? {}))
  const r2 = integrations.r2
  if (!r2.enabled || r2.status !== 'configured') {
    throw new Error('La integración con R2 no está habilitada en Integraciones')
  }
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Credenciales de R2 incompletas')
  }

  const safeBase = (opts.filename || 'imagen')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'imagen'
  const folder = (opts.folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '')
  const stamp = new Date().toISOString().slice(0, 10)
  const key = `${folder}/${stamp}/${safeBase}-${crypto.randomUUID()}.${ext}`

  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' })
  const endpoint = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`)
  const response = await aws.fetch(endpoint, {
    method: 'PUT',
    body: opts.buffer,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...(opts.uploadedBy ? { 'X-Amz-Meta-Uploadedby': opts.uploadedBy } : {}),
    },
  })
  if (!response.ok) {
    throw new Error(`R2 respondió ${response.status} al subir la imagen`)
  }

  const base = (publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`)
  return { url: `${base}/${key}`, key }
}
