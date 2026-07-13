import { AwsClient } from 'aws4fetch'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'
import { canAccessDocumentCategory } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    const id = String(req.query?.id || '')
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        category: true,
        versions: { orderBy: { version: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { comments: true, reviews: true, shares: true } },
      },
    })
    if (!document) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!(await canAccessDocumentCategory(session, document.categoryId))) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este documento' })
    }

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, data: document })
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { title, description, keywords, status, categoryId, metadata } = body

      // Al mover a otro espacio, exige acceso al espacio destino.
      if (categoryId !== undefined && !(await canAccessDocumentCategory(session, String(categoryId)))) {
        return res.status(403).json({ ok: false, error: 'No tienes acceso al espacio destino' })
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title: String(title).trim() } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(keywords !== undefined ? { keywords: Array.isArray(keywords) ? keywords : [] } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(categoryId !== undefined ? { categoryId: String(categoryId) } : {}),
          ...(metadata !== undefined ? { metadata } : {}),
        },
        include: { category: { select: { id: true, name: true, path: true } } },
      })
      return res.status(200).json({ ok: true, data: updated })
    }

    if (req.method === 'DELETE') {
      if (session.role === 'EDITOR' || session.role === 'ANALYST') {
        await prisma.document.update({ where: { id }, data: { status: 'ARCHIVED' } })
        return res.status(200).json({ ok: true, message: 'Document archived' })
      }

      try {
        const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
        const integrations = sanitizeIntegrations(snapshot?.data ?? {})
        const r2 = integrations.r2
        if (r2.enabled && r2.status === 'configured') {
          const { accountId, accessKeyId, secretAccessKey, bucketName, region } = r2.config
          const aws = new AwsClient({
            accessKeyId,
            secretAccessKey,
            service: 's3',
            region: region || 'auto',
          })
          const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${document.r2Key}`)
          await aws.fetch(url, { method: 'DELETE' })
        }
      } catch (r2Error) {
        console.warn('R2 delete failed, proceeding with DB delete:', r2Error)
      }

      await prisma.document.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET,PUT,DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/manage error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
