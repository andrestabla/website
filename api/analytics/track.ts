import { prisma } from '../_lib/prisma.js'
import { getGeoFromRequest, safeInt, safeString } from '../_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

type InputEvent = {
  eventType?: string
  path?: string
  pageTitle?: string
  sectionId?: string
  durationMs?: number
  referrer?: string
  metadata?: any
}

function normalizeEvent(input: InputEvent) {
  const eventType = safeString(input?.eventType, 50)
  if (!eventType) return null
  return {
    eventType,
    path: safeString(input?.path, 300),
    pageTitle: safeString(input?.pageTitle, 300),
    sectionId: safeString(input?.sectionId, 120),
    durationMs: safeInt(input?.durationMs),
    referrer: safeString(input?.referrer, 500),
    metadata: input?.metadata && typeof input.metadata === 'object' ? input.metadata : undefined,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const visitorId = safeString(body?.visitorId, 120)
    const sessionId = safeString(body?.sessionId, 120)
    const eventsRaw = Array.isArray(body?.events) ? body.events : []

    if (!visitorId) return res.status(400).json({ ok: false, error: 'visitorId is required' })
    if (eventsRaw.length === 0) return res.status(400).json({ ok: false, error: 'events are required' })

    const geo = getGeoFromRequest(req)
    const events = eventsRaw
      .slice(0, 100)
      .map((e: any) => normalizeEvent(e))
      .filter(Boolean) as Array<ReturnType<typeof normalizeEvent>>

    if (events.length === 0) return res.status(400).json({ ok: false, error: 'No valid events' })

    await prisma.analyticsEvent.createMany({
      data: events.map((event) => ({
        visitorId,
        sessionId,
        eventType: event!.eventType,
        path: event!.path,
        pageTitle: event!.pageTitle,
        sectionId: event!.sectionId,
        durationMs: event!.durationMs,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        referrer: event!.referrer,
        metadata: event!.metadata,
      })),
    })

    return res.status(200).json({ ok: true, ingested: events.length })
  } catch (error) {
    console.error('api/analytics/track error', error)
    return res.status(500).json({ ok: false, error: 'Analytics track failed' })
  }
}

