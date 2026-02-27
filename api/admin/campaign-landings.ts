import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import {
  CAMPAIGN_LANDINGS_SNAPSHOT_ID,
  deleteCampaignLanding,
  sanitizeCampaignLandingsSnapshot,
  sanitizeCampaignLanding,
  upsertCampaignLanding,
} from '../_lib/campaign-landings.js'

type VercelRequest = any
type VercelResponse = any

async function loadSnapshot() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: CAMPAIGN_LANDINGS_SNAPSHOT_ID } })
  return sanitizeCampaignLandingsSnapshot(snapshot?.data)
}

async function saveSnapshot(data: any) {
  await prisma.cmsSnapshot.upsert({
    where: { id: CAMPAIGN_LANDINGS_SNAPSHOT_ID },
    update: { data: data as any },
    create: { id: CAMPAIGN_LANDINGS_SNAPSHOT_ID, data: data as any },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    if (req.method === 'GET') {
      const snapshot = await loadSnapshot()
      return res.status(200).json({ ok: true, items: snapshot.items })
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      if (!body?.landing || typeof body.landing !== 'object') {
        return res.status(400).json({ ok: false, error: 'landing payload is required' })
      }
      const current = await loadSnapshot()
      const incoming = sanitizeCampaignLanding(body.landing)
      const next = upsertCampaignLanding(current, incoming)
      await saveSnapshot(next)
      return res.status(200).json({ ok: true, items: next.items, landing: next.items.find((item) => item.id === incoming.id || item.slug === incoming.slug) })
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const idOrSlug = String(body?.id || body?.slug || '').trim()
      if (!idOrSlug) return res.status(400).json({ ok: false, error: 'id or slug is required' })
      const current = await loadSnapshot()
      const next = deleteCampaignLanding(current, idOrSlug)
      await saveSnapshot(next)
      return res.status(200).json({ ok: true, items: next.items })
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/campaign-landings error', error)
    return res.status(500).json({ ok: false, error: 'Campaign landings operation failed' })
  }
}
