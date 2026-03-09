import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAdminSession(req, res)
  if (!session) return

  const { method } = req

  try {
    if (method === 'GET') {
      const leads = await prisma.contactLead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to recent 100 for now
      })
      return res.status(200).json({ ok: true, leads })
    }

    if (method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { id, status, notes } = body

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Missing lead ID' })
      }

      const updated = await prisma.contactLead.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
      })

      return res.status(200).json({ ok: true, lead: updated })
    }

    if (method === 'DELETE') {
      const { id } = req.query
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ ok: false, error: 'Missing lead ID' })
      }

      await prisma.contactLead.delete({
        where: { id },
      })

      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/leads error:', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
