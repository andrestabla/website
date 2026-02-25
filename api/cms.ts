import { prisma } from './_lib/prisma.js'
import { getDefaultCmsSnapshot, sanitizeCmsSnapshot } from './_lib/cms.js'
import { requireAdminSession } from './_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

const SNAPSHOT_ID = 'main'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
      if (!snapshot) {
        const data = getDefaultCmsSnapshot()
        await prisma.cmsSnapshot.create({ data: { id: SNAPSHOT_ID, data } })
        return res.status(200).json({ ok: true, data, source: 'default' })
      }
      return res.status(200).json({ ok: true, data: sanitizeCmsSnapshot(snapshot.data), source: 'db' })
    }

    if (req.method === 'PUT') {
      if (!requireAdminSession(req, res)) return
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const data = sanitizeCmsSnapshot(body)
      await prisma.cmsSnapshot.upsert({
        where: { id: SNAPSHOT_ID },
        update: { data },
        create: { id: SNAPSHOT_ID, data },
      })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/cms error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
