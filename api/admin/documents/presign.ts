import crypto from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'application/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'zip',
}

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const session = requireAdminSession(req, res)
    if (!session) return

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const { filename, contentType, size, categoryId } = body

    if (!filename || !contentType || !categoryId) {
      return res.status(400).json({ ok: false, error: 'filename, contentType and categoryId are required' })
    }

    const ext = ALLOWED_MIME_TYPES[String(contentType)]
    if (!ext) {
      return res.status(400).json({ ok: false, error: 'Unsupported file type' })
    }

    if (size && Number(size) > MAX_SIZE) {
      return res.status(400).json({ ok: false, error: 'File size exceeds 50 MB limit' })
    }

    const category = await prisma.docCategory.findUnique({ where: { id: String(categoryId) } })
    if (!category) return res.status(404).json({ ok: false, error: 'Category not found' })

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data ?? {})
    const r2 = integrations.r2
    if (!r2.enabled || r2.status !== 'configured') {
      return res.status(400).json({ ok: false, error: 'R2 integration is not configured' })
    }

    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ ok: false, error: 'R2 credentials are incomplete' })
    }

    const safeBase = String(filename)
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'documento'

    // Nueva estructura de key basada en la ruta y el ID de la categoría
    const categoryPathClean = category.path.startsWith('/') ? category.path.slice(1) : category.path
    const key = `documents/${categoryPathClean}/${category.id}/${safeBase}-${crypto.randomUUID()}.${ext}`.replace(/\/+/g, '/')

    const client = new S3Client({
      region: region || 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: String(contentType),
      Metadata: { uploadedBy: session.username, category: category.path, categoryId: category.id },
    })

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

    const derivedPublicBase = publicUrl
      ? publicUrl.trim().replace(/\/+$/, '')
      : `https://${bucketName}.${accountId}.r2.dev`
    const filePublicUrl = `${derivedPublicBase}/${key}`

    return res.status(200).json({
      ok: true,
      data: { presignedUrl, key, publicUrl: filePublicUrl },
    })
  } catch (error) {
    console.error('api/admin/documents/presign error', error)
    return res.status(500).json({ ok: false, error: 'Failed to generate upload URL' })
  }
}
