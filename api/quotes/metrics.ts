/**
 * Cotizador — métricas de una cotización (privado, dueño o admin).
 *
 * Resume la actividad del visor público: aperturas, visitantes, tiempo de
 * lectura, secciones alcanzadas, módulos tocados y detalle por destinatario.
 * El tiempo se estima con los latidos: el mayor durationMs de cada sesión.
 */
import { prisma } from '../_lib/prisma.js'
import { quoteSessionState } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

const quoteDb = () => (prisma as any).quote
const eventDb = () => (prisma as any).quoteEvent
const recipientDb = () => (prisma as any).quoteRecipient

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const quoteId = String(body.quoteId || '').slice(0, 40)
    if (!quoteId) return res.status(400).json({ ok: false, error: 'quoteId requerido' })

    const quote = await quoteDb().findUnique({ where: { id: quoteId }, select: { id: true, ownerId: true } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })
    const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
    if (quote.ownerId !== session.userId && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Esta cotización es de otro usuario' })
    }

    const [events, recipients] = await Promise.all([
      eventDb().findMany({
        where: { quoteId },
        orderBy: { createdAt: 'asc' },
        take: 5000,
        select: {
          type: true, sectionId: true, moduleCode: true, value: true, durationMs: true,
          visitorId: true, sessionId: true, recipientId: true, country: true, city: true, createdAt: true,
        },
      }),
      recipientDb().findMany({ where: { quoteId }, orderBy: { createdAt: 'asc' } }),
    ])

    const views = events.filter((e: any) => e.type === 'view')
    const visitors = new Set(views.map((e: any) => e.visitorId).filter(Boolean))

    // Tiempo por sesión: el latido más alto de cada una.
    const sessionTime = new Map<string, number>()
    const sessionRecipient = new Map<string, string | null>()
    for (const e of events) {
      const key = e.sessionId || 'anon'
      if (e.type === 'heartbeat' && e.durationMs) {
        sessionTime.set(key, Math.max(sessionTime.get(key) ?? 0, e.durationMs))
      }
      if (e.type === 'view') sessionRecipient.set(key, e.recipientId ?? null)
    }
    const durations = [...sessionTime.values()]
    const totalMs = durations.reduce((s, v) => s + v, 0)
    const avgMs = durations.length ? Math.round(totalMs / durations.length) : 0

    // Secciones: visitantes únicos que llegaron a cada una.
    const sectionVisitors = new Map<string, Set<string>>()
    for (const e of events) {
      if (e.type !== 'section' || !e.sectionId) continue
      if (!sectionVisitors.has(e.sectionId)) sectionVisitors.set(e.sectionId, new Set())
      sectionVisitors.get(e.sectionId)!.add(e.visitorId || e.sessionId || 'anon')
    }
    const sections = [...sectionVisitors.entries()].map(([sectionId, set]) => ({ sectionId, visitors: set.size }))

    // Módulos: interés expresado con los interruptores.
    const moduleStats = new Map<string, { on: number; off: number }>()
    for (const e of events) {
      if (e.type !== 'toggle' || !e.moduleCode) continue
      const entry = moduleStats.get(e.moduleCode) ?? { on: 0, off: 0 }
      if (e.value === 'on') entry.on++
      else entry.off++
      moduleStats.set(e.moduleCode, entry)
    }
    const modules = [...moduleStats.entries()]
      .map(([code, s]) => ({ code, ...s, total: s.on + s.off }))
      .sort((a, b) => b.total - a.total)

    // Serie diaria de aperturas.
    const byDay = new Map<string, number>()
    for (const e of views) {
      const day = new Date(e.createdAt).toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    const timeline = [...byDay.entries()].map(([day, count]) => ({ day, views: count }))

    // Detalle por destinatario, con su tiempo acumulado.
    const recipientTime = new Map<string, number>()
    for (const [sessionKey, ms] of sessionTime) {
      const rid = sessionRecipient.get(sessionKey)
      if (rid) recipientTime.set(rid, (recipientTime.get(rid) ?? 0) + ms)
    }
    const geo = new Map<string, number>()
    for (const e of views) {
      const place = [e.city, e.country].filter(Boolean).join(', ') || 'Sin ubicación'
      geo.set(place, (geo.get(place) ?? 0) + 1)
    }

    return res.status(200).json({
      ok: true,
      summary: {
        views: views.length,
        visitors: visitors.size,
        totalMs,
        avgMs,
        pdf: events.filter((e: any) => e.type === 'pdf').length,
        toggles: events.filter((e: any) => e.type === 'toggle').length,
        lastActivity: events.length ? events[events.length - 1].createdAt : null,
      },
      sections,
      modules,
      timeline,
      places: [...geo.entries()].map(([place, count]) => ({ place, views: count })).sort((a, b) => b.views - a.views),
      recipients: recipients.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        token: r.token,
        sentAt: r.sentAt,
        firstSeenAt: r.firstSeenAt,
        lastSeenAt: r.lastSeenAt,
        openCount: r.openCount,
        totalMs: recipientTime.get(r.id) ?? 0,
      })),
    })
  } catch (error: any) {
    console.error('quotes/metrics error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
