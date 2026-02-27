import { prisma } from './_lib/prisma.js'
import { getAdminSession } from './_lib/admin-auth.js'
import {
  CAMPAIGN_LANDINGS_SNAPSHOT_ID,
  sanitizeCampaignLandingsSnapshot,
} from './_lib/campaign-landings.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: CAMPAIGN_LANDINGS_SNAPSHOT_ID } })
    const data = sanitizeCampaignLandingsSnapshot(snapshot?.data)
    const adminSession = getAdminSession(req)
    const preview = String(req.query?.preview || '') === '1' && !!adminSession
    const slug = String(req.query?.slug || '').trim()

    const visibleItems = preview ? data.items : data.items.filter((item) => item.status === 'published')

    if (slug) {
      const landing = visibleItems.find((item) => item.slug === slug)
      if (!landing) return res.status(404).json({ ok: false, error: 'Campaign landing not found' })
      return res.status(200).json({ ok: true, landing })
    }

    return res.status(200).json({
      ok: true,
      items: visibleItems.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        status: item.status,
        heroTitle: item.heroTitle,
        heroSubtitle: item.heroSubtitle,
        primaryCtaLabel: item.primaryCtaLabel,
        updatedAt: item.updatedAt,
      })),
    })
  } catch (error) {
    console.error('api/campaign-landings error', error)
    return res.status(500).json({ ok: false, error: 'Unable to read campaign landings' })
  }
}
