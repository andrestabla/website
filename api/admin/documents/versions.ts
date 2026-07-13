import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'
import { canAccessDocumentCategory } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
}

/** Reconstruye la URL pública de un archivo en R2 a partir de su key. */
async function publicUrlForKey(key: string): Promise<string | null> {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = sanitizeIntegrations(snapshot?.data ?? {})
  const r2 = integrations.r2
  if (!r2.enabled || r2.status !== 'configured') return null
  const { accountId, bucketName, publicUrl } = r2.config
  const base = publicUrl ? publicUrl.trim().replace(/\/+$/, '') : `https://${bucketName}.${accountId}.r2.dev`
  return `${base}/${key}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    const id = String(req.query?.id || '')
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!(await canAccessDocumentCategory(session, document.categoryId))) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este documento' })
    }

    // GET: lista de versiones históricas (la actual es document.version).
    if (req.method === 'GET') {
      const versions = await prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { version: 'desc' },
      })
      return res.status(200).json({
        ok: true,
        data: {
          current: { version: document.version, size: document.size, publicUrl: document.publicUrl, updatedAt: document.updatedAt },
          versions,
        },
      })
    }

    // POST: registrar una nueva versión (el cliente ya subió el archivo a R2).
    if (req.method === 'POST') {
      const body = parseBody(req)
      const { r2Key, publicUrl, size, notes } = body
      if (!r2Key) return res.status(400).json({ ok: false, error: 'r2Key es requerido' })

      await prisma.$transaction([
        // Guarda el archivo ACTUAL como versión histórica.
        prisma.documentVersion.create({
          data: {
            documentId: id,
            version: document.version,
            r2Key: document.r2Key,
            size: document.size,
            uploadedBy: session.userId,
            notes: notes ? String(notes) : null,
          },
        }),
        // Actualiza el documento con el nuevo archivo.
        prisma.document.update({
          where: { id },
          data: {
            r2Key: String(r2Key),
            publicUrl: publicUrl ? String(publicUrl) : null,
            size: Number(size) || document.size,
            version: document.version + 1,
          },
        }),
      ])

      const versions = await prisma.documentVersion.findMany({ where: { documentId: id }, orderBy: { version: 'desc' } })
      const updated = await prisma.document.findUnique({ where: { id } })
      return res.status(201).json({ ok: true, data: { document: updated, versions } })
    }

    // PUT: restaurar una versión histórica como versión actual.
    if (req.method === 'PUT') {
      const body = parseBody(req)
      const versionId = String(body.versionId || '')
      if (!versionId) return res.status(400).json({ ok: false, error: 'versionId es requerido' })

      const version = await prisma.documentVersion.findUnique({ where: { id: versionId } })
      if (!version || version.documentId !== id) {
        return res.status(404).json({ ok: false, error: 'Versión no encontrada' })
      }
      const restoredUrl = await publicUrlForKey(version.r2Key)

      await prisma.$transaction([
        // Guarda el archivo ACTUAL como versión histórica antes de restaurar.
        prisma.documentVersion.create({
          data: {
            documentId: id,
            version: document.version,
            r2Key: document.r2Key,
            size: document.size,
            uploadedBy: session.userId,
            notes: `Reemplazado al restaurar v${version.version}`,
          },
        }),
        prisma.document.update({
          where: { id },
          data: {
            r2Key: version.r2Key,
            publicUrl: restoredUrl,
            size: version.size,
            version: document.version + 1,
          },
        }),
      ])

      const versions = await prisma.documentVersion.findMany({ where: { documentId: id }, orderBy: { version: 'desc' } })
      const updated = await prisma.document.findUnique({ where: { id } })
      return res.status(200).json({ ok: true, data: { document: updated, versions } })
    }

    res.setHeader('Allow', 'GET,POST,PUT')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/versions error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
