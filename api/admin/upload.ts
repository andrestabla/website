import crypto from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

const MAX_BYTES = 4 * 1024 * 1024

function isAllowedImageMime(contentType: string) {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'].includes(contentType)
}

function extensionForContentType(contentType: string) {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  return map[contentType] || 'bin'
}

function normalizePublicBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function decodeBase64Payload(base64: string) {
  return Buffer.from(base64, 'base64')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const session = requireAdminSession(req, res)
    if (!session) return

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const filename = String(body.filename || 'image').trim()
    const contentType = String(body.contentType || '').trim().toLowerCase()
    const base64 = String(body.base64 || '')
    const folder = String(body.folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '')

    if (!contentType || !isAllowedImageMime(contentType)) {
      return res.status(400).json({ ok: false, error: 'Unsupported image type' })
    }
    if (!base64) {
      return res.status(400).json({ ok: false, error: 'Missing file payload' })
    }

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data ?? {})
    const r2 = integrations.r2

    if (!r2.enabled || r2.status !== 'configured') {
      return res.status(400).json({ ok: false, error: 'R2 integration is not enabled/configured' })
    }

    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ ok: false, error: 'R2 credentials are incomplete' })
    }
    const buffer = decodeBase64Payload(base64)
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(400).json({ ok: false, error: 'Invalid file size (max 4MB)' })
    }

    const ext = extensionForContentType(contentType)
    const safeBase = filename
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
    const stamp = new Date().toISOString().slice(0, 10)
    const key = `${folder}/${stamp}/${safeBase}-${crypto.randomUUID()}.${ext}`

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
    const client = new S3Client({
      region: region || 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })

    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        uploadedBy: session.username,
      },
    }))

    const derivedR2DevUrl = `https://${bucketName}.${accountId}.r2.dev`
    const publicBaseUrl = publicUrl ? normalizePublicBaseUrl(publicUrl) : derivedR2DevUrl
    const url = `${publicBaseUrl}/${key}`

    return res.status(200).json({
      ok: true,
      data: {
        key,
        url,
        bucket: bucketName,
        publicAccessMode: publicUrl ? 'custom' : 'r2.dev-fallback',
      },
      warning: publicUrl
        ? null
        : 'R2 publicUrl no está configurado. Se devolvió URL r2.dev (válida solo si Public Development URL está habilitada; no recomendado para producción).',
    })
  } catch (error) {
    console.error('api/admin/upload error', error)
    return res.status(500).json({ ok: false, error: 'Upload failed' })
  }
}
