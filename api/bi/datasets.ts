import { biSessionState } from '../_lib/bi-auth.js'
import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const { session, allowed } = biSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'No BI access' })

  try {
    const items = await (prisma as any).biDataset.findMany({
      where: { active: true },
      select: { key: true, title: true, description: true, category: true, version: true, updatedAt: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
    return res.status(200).json({ ok: true, datasets: items })
  } catch (error) {
    console.error('api/bi/datasets error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
