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
      const comments = await prisma.docComment.findMany({
        where: { documentId: id, parentId: null },
        include: {
          replies: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      })
      return res.status(200).json({ ok: true, data: comments })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { content, parentId } = body

      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ ok: false, error: 'content is required' })
      }

      const doc = await prisma.document.findUnique({ where: { id } })
      if (!doc) return res.status(404).json({ ok: false, error: 'Document not found' })

      const comment = await prisma.docComment.create({
        data: {
          documentId: id,
          userId: session.userId,
          userName: session.displayName,
          content: content.trim(),
          parentId: parentId ? String(parentId) : null,
        },
        include: { replies: true },
      })

      return res.status(201).json({ ok: true, data: comment })
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const commentId = String(body.commentId || req.query?.commentId || '')
      if (!commentId) return res.status(400).json({ ok: false, error: 'commentId is required' })

      const comment = await prisma.docComment.findUnique({ where: { id: commentId } })
      if (!comment) return res.status(404).json({ ok: false, error: 'Comment not found' })

      if (comment.userId !== session.userId && session.role !== 'SUPERADMIN' && session.role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'Not authorized' })
      }

      await prisma.docComment.delete({ where: { id: commentId } })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET,POST,DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/comments error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
