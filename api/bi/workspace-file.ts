import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'
import { biSessionState } from '../_lib/bi-auth.js'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } }
export const maxDuration = 30

const MAX_TEXT = 60000

const EXT: Record<string, string> = {
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
}

async function extractText(buffer: Buffer, contentType: string, filename: string): Promise<string> {
  const ct = String(contentType)
  const name = String(filename).toLowerCase()
  try {
    if (ct === 'application/pdf' || name.endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse')
      const parser = new (PDFParse as any)({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      return String(result?.text || '')
    }
    if (ct.includes('wordprocessingml') || name.endsWith('.docx')) {
      const mammoth = (await import('mammoth')) as any
      const out = await (mammoth.extractRawText || mammoth.default?.extractRawText)({ buffer })
      return String(out?.value || '')
    }
    if (ct.includes('spreadsheetml') || ct === 'application/vnd.ms-excel' || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = (await import('xlsx')) as any
      const wb = XLSX.read(buffer, { type: 'buffer' })
      return wb.SheetNames.map((sn: string) => `# ${sn}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sn])}`).join('\n\n')
    }
    // Texto plano
    return buffer.toString('utf8')
  } catch (error) {
    console.error('workspace-file extract error', error)
    return ''
  }
}

async function uploadToR2(buffer: Buffer, contentType: string, ext: string, userId: string) {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = sanitizeIntegrations(snapshot?.data ?? {})
  const r2 = integrations.r2
  if (!r2.enabled || r2.status !== 'configured') return null
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = r2.config
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null
  const key = `bi-workspace/${userId}/${crypto.randomUUID()}.${ext}`
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: region || 'auto' })
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`
  const put = await aws.fetch(url, { method: 'PUT', body: buffer, headers: { 'Content-Type': contentType } })
  if (!put.ok) return null
  const base = publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`
  return `${base}/${key}`
}

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
    const { filename, contentType, dataBase64 } = body
    if (!filename || !contentType || !dataBase64) {
      return res.status(400).json({ ok: false, error: 'filename, contentType y dataBase64 requeridos' })
    }
    const ext = EXT[String(contentType)] || String(filename).split('.').pop() || 'bin'
    const buffer = Buffer.from(String(dataBase64), 'base64')
    if (buffer.length > 6 * 1024 * 1024) return res.status(400).json({ ok: false, error: 'Archivo demasiado grande (máx 6 MB)' })

    const text = (await extractText(buffer, contentType, filename)).slice(0, MAX_TEXT)
    const url = await uploadToR2(buffer, contentType, ext, session.userId).catch(() => null)

    return res.status(200).json({ ok: true, text, chars: text.length, url })
  } catch (error: any) {
    console.error('api/bi/workspace-file error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Internal server error' })
  }
}
