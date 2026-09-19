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

/**
 * Credenciales y cliente de R2, resueltos una vez. Lo usan las subidas que no
 * son de imágenes: paquetes importados, locuciones generadas y, en general,
 * cualquier archivo que deba conservar su ruta dentro de un paquete.
 */
export async function r2Client(): Promise<{ aws: AwsClient; bucketUrl: string; publicBase: string }> {
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
  return {
    aws: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' }),
    bucketUrl: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`,
    publicBase: publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`,
  }
}

/** 25 MB: lo que cabe holgadamente en un SCORM de un curso y en un episodio. */
export const R2_MAX_FILE_BYTES = 25 * 1024 * 1024

/**
 * Sube un archivo a una clave concreta. A diferencia de las imágenes, aquí la
 * clave la decide quien llama: un paquete importado solo se sirve igual que el
 * original si sus archivos conservan sus rutas relativas.
 */
export async function uploadToR2(opts: {
  key: string
  buffer: Buffer
  contentType: string
  cacheControl?: string
  client?: { aws: AwsClient; bucketUrl: string; publicBase: string }
}): Promise<{ url: string; key: string; bytes: number }> {
  const key = opts.key.replace(/^\/+/, '')
  if (!key || key.includes('..')) throw new Error(`Ruta de archivo no válida: ${opts.key}`)
  if (opts.buffer.length > R2_MAX_FILE_BYTES) {
    throw new Error(`«${key}» pesa más de ${Math.round(R2_MAX_FILE_BYTES / 1024 / 1024)} MB`)
  }
  const client = opts.client || (await r2Client())
  const response = await client.aws.fetch(new URL(`${client.bucketUrl}/${key}`), {
    method: 'PUT',
    body: opts.buffer,
    headers: {
      'Content-Type': opts.contentType || 'application/octet-stream',
      'Cache-Control': opts.cacheControl || 'public, max-age=31536000, immutable',
    },
  })
  if (!response.ok) throw new Error(`R2 respondió ${response.status} al subir «${key}»`)
  return { url: `${client.publicBase}/${key}`, key, bytes: opts.buffer.length }
}

/** Descarga un archivo del bucket. Se usa para volver a empaquetar lo importado. */
export async function downloadFromR2(
  key: string,
  client?: { aws: AwsClient; bucketUrl: string; publicBase: string }
): Promise<Buffer> {
  const resolved = client || (await r2Client())
  const response = await resolved.aws.fetch(new URL(`${resolved.bucketUrl}/${key.replace(/^\/+/, '')}`))
  if (!response.ok) throw new Error(`R2 respondió ${response.status} al leer «${key}»`)
  return Buffer.from(await response.arrayBuffer())
}

/** Borra claves del bucket. Los fallos no interrumpen: se informa de cuántas quedaron. */
export async function deleteFromR2(keys: string[]): Promise<{ deleted: number; failed: string[] }> {
  if (!keys.length) return { deleted: 0, failed: [] }
  const client = await r2Client()
  const failed: string[] = []
  let deleted = 0
  for (const key of keys) {
    const response = await client.aws
      .fetch(new URL(`${client.bucketUrl}/${key.replace(/^\/+/, '')}`), { method: 'DELETE' })
      .catch(() => null)
    if (response?.ok) deleted += 1
    else failed.push(key)
  }
  return { deleted, failed }
}
