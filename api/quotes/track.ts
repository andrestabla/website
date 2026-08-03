/**
 * Cotizador — métricas de interacción con la cotización pública.
 *
 * Sin autenticación: recibe eventos del visor /c/:id. Cada evento queda atado a
 * la cotización y, si la URL traía ?d=<token>, al destinatario concreto. El
 * primer `view` de un destinatario sella firstSeenAt; cada visita suma openCount.
 *
 * Tipos: view | heartbeat | section | toggle | preset | pdf | cta
 */
import { prisma } from '../_lib/prisma.js'
import { getGeoFromRequest, safeInt, safeString } from '../_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

const quoteDb = () => (prisma as any).quote
const recipientDb = () => (prisma as any).quoteRecipient
const eventDb = () => (prisma as any).quoteEvent

const EVENT_TYPES = new Set(['view', 'heartbeat', 'section', 'toggle', 'qty', 'preset', 'pdf', 'cta'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const publicId = safeString(body?.publicId, 40)
    const recipientToken = safeString(body?.recipientToken, 60)
    const visitorId = safeString(body?.visitorId, 120)
    const sessionId = safeString(body?.sessionId, 120)
    const eventsRaw = Array.isArray(body?.events) ? body.events : []
    if (!publicId || eventsRaw.length === 0) {
      return res.status(400).json({ ok: false, error: 'publicId y events son requeridos' })
    }

    const quote = await quoteDb().findUnique({ where: { publicId }, select: { id: true, status: true } })
    if (!quote || quote.status !== 'PUBLISHED') {
      // Los borradores en previsualización no generan métricas.
      return res.status(200).json({ ok: true, ignored: true })
    }

    let recipientId: string | null = null
    if (recipientToken) {
      const recipient = await recipientDb().findUnique({ where: { token: recipientToken } })
      if (recipient && recipient.quoteId === quote.id) recipientId = recipient.id
    }

    const geo = getGeoFromRequest(req)
    const userAgent = safeString(req.headers?.['user-agent'], 300)
    const referrer = safeString(body?.referrer, 500)

    const events = eventsRaw
      .slice(0, 50)
      .map((e: any) => {
        const type = safeString(e?.type, 30)
        if (!EVENT_TYPES.has(type)) return null
        return {
          quoteId: quote.id,
          recipientId,
          type,
          sectionId: safeString(e?.sectionId, 120) || null,
          moduleCode: safeString(e?.moduleCode, 40) || null,
          value: safeString(e?.value, 200) || null,
          durationMs: safeInt(e?.durationMs) || null,
          visitorId: visitorId || null,
          sessionId: sessionId || null,
          country: geo.country || null,
          region: geo.region || null,
          city: geo.city || null,
          referrer: referrer || null,
          userAgent: userAgent || null,
          metadata: e?.metadata && typeof e.metadata === 'object' ? e.metadata : undefined,
        }
      })
      .filter(Boolean)

    if (!events.length) return res.status(400).json({ ok: false, error: 'Sin eventos válidos' })

    const hasView = events.some((e: any) => e.type === 'view')
    await eventDb().createMany({ data: events })
    if (recipientId) {
      await recipientDb().update({
        where: { id: recipientId },
        data: hasView
          ? { lastSeenAt: new Date(), openCount: { increment: 1 } }
          : { lastSeenAt: new Date() },
      })
      if (hasView) {
        // Sella la primera apertura solo si aún no existe.
        await recipientDb().updateMany({
          where: { id: recipientId, firstSeenAt: null },
          data: { firstSeenAt: new Date() },
        })
      }
    }

    return res.status(200).json({ ok: true, stored: events.length })
  } catch (error: any) {
    console.error('quotes/track error:', error)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}
