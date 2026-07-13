import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { canAccessDocumentCategory } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    const id = String(req.query?.id || '')
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

    const docForAccess = await prisma.document.findUnique({ where: { id }, select: { categoryId: true } })
    if (!docForAccess) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!(await canAccessDocumentCategory(session, docForAccess.categoryId))) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este documento' })
    }

    if (req.method === 'GET') {
      const reviews = await prisma.docReview.findMany({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
      })
      return res.status(200).json({ ok: true, data: reviews })
    }

    // POST: request a review
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { assignedTo, assignedToName, notes, dueDate } = body

      const doc = await prisma.document.findUnique({ where: { id } })
      if (!doc) return res.status(404).json({ ok: false, error: 'Document not found' })

      const review = await prisma.docReview.create({
        data: {
          documentId: id,
          requestedBy: session.userId,
          requestedByName: session.displayName,
          assignedTo: assignedTo ? String(assignedTo) : null,
          assignedToName: assignedToName ? String(assignedToName) : null,
          notes: notes ? String(notes).trim() : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'PENDING',
        },
      })

      await prisma.document.update({ where: { id }, data: { status: 'UNDER_REVIEW' } })

      return res.status(201).json({ ok: true, data: review })
    }

    // PUT: update review status
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { reviewId, status, resolution } = body

      if (!reviewId || !status) {
        return res.status(400).json({ ok: false, error: 'reviewId and status are required' })
      }

      const review = await prisma.docReview.update({
        where: { id: String(reviewId) },
        data: {
          status,
          resolution: resolution ? String(resolution).trim() : undefined,
          assignedTo: session.userId,
          assignedToName: session.displayName,
        },
      })

      // If approved/rejected, restore document to ACTIVE
      if (status === 'APPROVED' || status === 'REJECTED') {
        await prisma.document.update({ where: { id }, data: { status: 'ACTIVE' } })
      }

      return res.status(200).json({ ok: true, data: review })
    }

    res.setHeader('Allow', 'GET,POST,PUT')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/review error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
