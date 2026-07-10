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

  const key = String((req.query?.key ?? '') || (req.url?.split('key=')[1]?.split('&')[0] ?? '')).trim()
  if (!key) return res.status(400).json({ ok: false, error: 'Missing key' })

  try {
    const ds = await (prisma as any).biDataset.findUnique({ where: { key } })
    if (!ds || !ds.active) return res.status(404).json({ ok: false, error: 'Dataset not found' })
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json({
      ok: true,
      key: ds.key,
      title: ds.title,
      category: ds.category,
      version: ds.version,
      meta: ds.meta,
      data: ds.data,
    })
  } catch (error) {
    console.error('api/bi/dataset error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
