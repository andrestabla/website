import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    // List documents with search + filters
    if (req.method === 'GET') {
      const q = req.query ?? {}
      const search = String(q.search || '').trim()
      const categoryId = String(q.categoryId || '').trim()
      const status = String(q.status || '').trim()
      const mimeGroup = String(q.mimeGroup || '').trim()
      const page = Math.max(1, Number(q.page) || 1)
      const limit = Math.min(100, Math.max(1, Number(q.limit) || 24))
      const skip = (page - 1) * limit

      const where: any = {}

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
          { keywords: { hasSome: [search] } },
        ]
      }
      if (categoryId) where.categoryId = categoryId
      if (status) where.status = status
      if (mimeGroup) {
        const mimeMap: Record<string, string[]> = {
          pdf: ['application/pdf'],
          word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
          powerpoint: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
          image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
          text: ['text/plain', 'text/csv', 'text/markdown', 'application/json'],
        }
        if (mimeMap[mimeGroup]) where.mimeType = { in: mimeMap[mimeGroup] }
      }

      const [total, documents] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true, path: true, color: true } },
            _count: { select: { comments: true, reviews: true, shares: true } },
          },
        }),
      ])

      return res.status(200).json({ ok: true, data: documents, total, page, limit })
    }

    // Confirm document after R2 upload and save to DB
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { title, originalName, mimeType, size, r2Key, publicUrl, categoryId } = body

      if (!originalName || !mimeType || !r2Key || !categoryId) {
        return res.status(400).json({ ok: false, error: 'originalName, mimeType, r2Key and categoryId are required' })
      }

      const category = await prisma.docCategory.findUnique({ where: { id: String(categoryId) } })
      if (!category) return res.status(404).json({ ok: false, error: 'Category not found' })

      const document = await prisma.document.create({
        data: {
          title: (title || originalName).trim(),
          originalName: String(originalName),
          fileName: String(originalName),
          mimeType: String(mimeType),
          size: Number(size) || 0,
          r2Key: String(r2Key),
          publicUrl: publicUrl ? String(publicUrl) : null,
          categoryId: String(categoryId),
          status: 'ACTIVE',
          uploadedBy: session.userId,
          uploadedByName: session.displayName,
          keywords: [],
          metadata: {},
        },
        include: {
          category: { select: { id: true, name: true, path: true } },
        },
      })

      return res.status(201).json({ ok: true, data: document })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/index error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
