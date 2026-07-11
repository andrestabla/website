import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'
import { biSessionState } from '../_lib/bi-auth.js'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

const ALLOWED: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'text/tab-separated-values': 'tsv',
  'application/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const { session, allowed } = biSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No BI access' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const { filename, contentType, size } = body
    if (!filename || !contentType) {
      return res.status(400).json({ ok: false, error: 'filename y contentType requeridos' })
    }
    const ext = ALLOWED[String(contentType)]
    if (!ext) return res.status(400).json({ ok: false, error: 'Tipo de archivo no permitido' })
    if (size && Number(size) > MAX_SIZE) {
      return res.status(400).json({ ok: false, error: 'El archivo supera 25 MB' })
    }

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = sanitizeIntegrations(snapshot?.data ?? {})
    const r2 = integrations.r2
    if (!r2.enabled || r2.status !== 'configured') {
      return res.status(400).json({ ok: false, error: 'La integración R2 no está configurada' })
    }
    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ ok: false, error: 'Credenciales R2 incompletas' })
    }

    const safeBase =
      String(filename)
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'archivo'
    const key = `bi-workspace/${session.userId}/${safeBase}-${crypto.randomUUID()}.${ext}`

    const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' })
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`)
    const signed = await aws.sign(url, {
      method: 'PUT',
      aws: { signQuery: true },
      headers: { 'Content-Type': String(contentType) },
    })
    const derivedPublicBase = publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`

    return res.status(200).json({
      ok: true,
      data: { presignedUrl: signed.url, key, publicUrl: `${derivedPublicBase}/${key}` },
    })
  } catch (error) {
    console.error('api/bi/workspace-upload error', error)
    return res.status(500).json({ ok: false, error: 'No se pudo generar la URL de carga' })
  }
}
