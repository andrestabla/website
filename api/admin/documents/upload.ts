import crypto from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

export const config = {
  api: {
    bodyParser: false,
  },
}

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

const MAX_BASE64_BYTES = 10 * 1024 * 1024

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const session = requireAdminSession(req, res)
    if (!session) return

    const rawBody = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
    
    let body: any = {}
    if (rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid JSON payload' })
      }
    }

    const { filename, contentType, base64, categoryId, title } = body

    if (!filename || !contentType || !base64 || !categoryId) {
      return res.status(400).json({ ok: false, error: 'filename, contentType, base64 and categoryId are required' })
    }

    const ext = ALLOWED_MIME_TYPES[String(contentType)]
    if (!ext) {
      return res.status(400).json({ ok: false, error: 'Tipo de archivo no soportado' })
    }

    const rawBase64 = String(base64).replace(/^data:[^;]+;base64,/, '')
    if (!rawBase64 || rawBase64.length > MAX_BASE64_BYTES) {
      return res.status(400).json({ ok: false, error: 'El archivo supera el límite de 7.5 MB' })
    }

    const buffer = Buffer.from(rawBase64, 'base64')

    const category = await prisma.docCategory.findUnique({ where: { id: String(categoryId) } })
    if (!category) return res.status(404).json({ ok: false, error: 'Categoría no encontrada' })

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data ?? {})
    const r2 = integrations.r2

    if (!r2.enabled || r2.status !== 'configured') {
      return res.status(400).json({ ok: false, error: 'R2 no está configurado. Ve a Integraciones y activa R2.' })
    }

    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ ok: false, error: 'Credenciales de R2 incompletas' })
    }

    const safeBase = String(filename)
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'documento'

    const stamp = new Date().toISOString().slice(0, 10)
    const key = `documents/${stamp}/${safeBase}-${crypto.randomUUID()}.${ext}`

    const client = new S3Client({
      region: region || 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: String(contentType),
      CacheControl: 'public, max-age=31536000',
      Metadata: { uploadedBy: session.username, category: category.path },
    }))

    const derivedPublicBase = publicUrl
      ? publicUrl.trim().replace(/\/+$/, '')
      : `https://${bucketName}.${accountId}.r2.dev`
    const filePublicUrl = `${derivedPublicBase}/${key}`

    const document = await prisma.document.create({
      data: {
        title: ((title || filename) as string).trim(),
        originalName: String(filename),
        fileName: String(filename),
        mimeType: String(contentType),
        size: buffer.length,
        r2Key: key,
        publicUrl: filePublicUrl,
        categoryId: String(categoryId),
        status: 'ACTIVE',
        uploadedBy: session.userId,
        uploadedByName: session.displayName,
        keywords: [],
        metadata: {},
      },
      include: { category: { select: { id: true, name: true, path: true } } },
    })

    return res.status(201).json({ ok: true, data: document })
  } catch (error) {
    console.error('api/admin/documents/upload error', error)
    return res.status(500).json({ ok: false, error: 'Error al subir el documento' })
  }
}
