import { prisma } from './_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from './_lib/integrations.js'
import { requireAdminSession } from './_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

const CMS_ID = 'main'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function relativeTime(input: Date) {
  const diffMs = Date.now() - input.getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now()
  try {
    if (!requireAdminSession(req, res)) return
    const [cmsSnapshot, integrationsSnapshot, translationCount, translationsByLang, latestTranslations, latestSnapshots,
      analyticsTotalEvents, pageViewCount, sectionViewCount, consentCount, avgTimeAggregate, topPagesRaw, topSectionsRaw,
      byCountryRaw, recentAnalytics, recentConsents
    ] = await Promise.all([
      prisma.cmsSnapshot.findUnique({ where: { id: CMS_ID } }),
      prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } }),
      prisma.translationCache.count(),
      prisma.translationCache.groupBy({ by: ['targetLang'], _count: { _all: true } }),
      prisma.translationCache.findMany({ orderBy: { updatedAt: 'desc' }, take: 20, select: { targetLang: true, updatedAt: true, provider: true, model: true } }),
      prisma.cmsSnapshot.findMany({ orderBy: { updatedAt: 'desc' }, take: 10, select: { id: true, updatedAt: true } }),
      prisma.analyticsEvent.count(),
      prisma.analyticsEvent.count({ where: { eventType: 'page_view' } }),
      prisma.analyticsEvent.count({ where: { eventType: 'section_view' } }),
      prisma.privacyConsentAcceptance.count(),
      prisma.analyticsEvent.aggregate({ where: { eventType: 'page_exit', durationMs: { not: null } }, _avg: { durationMs: true } }),
      prisma.analyticsEvent.groupBy({
        by: ['path'],
        where: { eventType: 'page_view', path: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } } as any,
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['sectionId'],
        where: { eventType: 'section_view', sectionId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } } as any,
        take: 12,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['country'],
        where: { country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } } as any,
        take: 10,
      }),
      prisma.analyticsEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 400,
        select: { eventType: true, path: true, sectionId: true, durationMs: true, country: true, city: true, createdAt: true },
      }),
      prisma.privacyConsentAcceptance.findMany({
        orderBy: { acceptedAt: 'desc' },
        take: 20,
        select: { policyVersion: true, path: true, country: true, city: true, acceptedAt: true, visitorId: true },
      }),
    ])

    const cmsData: any = cmsSnapshot?.data ?? {}
    const integrations = sanitizeIntegrations(integrationsSnapshot?.data ?? {})

    const serviceCount = Array.isArray(cmsData.services) ? cmsData.services.length : 0
    const productCount = Array.isArray(cmsData.products) ? cmsData.products.length : 0

    const days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(new Date(Date.now() - (13 - i) * 86400000))
      return { day: formatDay(d), count: 0 }
    })
    const dayIndex = new Map(days.map((d, i) => [d.day, i]))
    for (const item of latestTranslations) {
      const key = formatDay(new Date(item.updatedAt))
      const idx = dayIndex.get(key)
      if (idx !== undefined) days[idx].count += 1
    }

    const byLangMap: Record<string, number> = { es: 0, en: 0, fr: 0 }
    for (const row of translationsByLang as any[]) {
      byLangMap[row.targetLang] = row._count._all
    }

    const eventDays = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(new Date(Date.now() - (13 - i) * 86400000))
      return { day: formatDay(d), pageViews: 0, consents: 0 }
    })
    const eventDayIndex = new Map(eventDays.map((d, i) => [d.day, i]))
    for (const item of recentAnalytics as any[]) {
      const key = formatDay(new Date(item.createdAt))
      const idx = eventDayIndex.get(key)
      if (idx === undefined) continue
      if (item.eventType === 'page_view') eventDays[idx].pageViews += 1
    }
    for (const item of recentConsents as any[]) {
      const key = formatDay(new Date(item.acceptedAt))
      const idx = eventDayIndex.get(key)
      if (idx === undefined) continue
      eventDays[idx].consents += 1
    }

    const recentActivity = [
      ...latestSnapshots.map((s) => ({
        event: s.id === CMS_ID ? 'Actualización CMS' : s.id === INTEGRATIONS_SNAPSHOT_ID ? 'Actualización Integraciones' : `Snapshot ${s.id}`,
        source: s.id === CMS_ID ? '/api/cms' : '/api/integrations',
        date: relativeTime(new Date(s.updatedAt)),
        status: 'saved',
      })),
      ...latestTranslations.slice(0, 5).map((t) => ({
        event: `Traducción ${t.targetLang.toUpperCase()}`,
        source: `${t.provider}:${t.model}`,
        date: relativeTime(new Date(t.updatedAt)),
        status: 'cached',
      })),
    ]
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 8)

    const configuredIntegrations = (['gemini', 'openai', 'smtp', 'r2'] as const).map((key) => ({
      key,
      enabled: integrations[key].enabled,
      status: integrations[key].status,
    }))

    const topPages = (topPagesRaw as any[]).map((row) => ({ path: row.path || '(sin ruta)', count: row._count?._all || 0 }))
    const topSections = (topSectionsRaw as any[]).map((row) => ({ sectionId: row.sectionId || '(sin id)', count: row._count?._all || 0 }))
    const byCountry = (byCountryRaw as any[]).map((row) => ({ country: row.country || 'Unknown', count: row._count?._all || 0 }))

    return res.status(200).json({
      ok: true,
      data: {
        generatedAt: new Date().toISOString(),
        responseMs: Date.now() - started,
        dbConnected: true,
        region: process.env.VERCEL_REGION || 'unknown',
        cms: {
          serviceCount,
          productCount,
          totalManagedRoutes: 1 + serviceCount + productCount,
          lastUpdatedAt: cmsSnapshot?.updatedAt ?? null,
        },
        translations: {
          total: translationCount,
          byLang: byLangMap,
          recentDaily: days,
        },
        integrations: {
          configured: configuredIntegrations.filter((i) => i.status === 'configured').length,
          enabled: configuredIntegrations.filter((i) => i.enabled).length,
          items: configuredIntegrations,
          lastUpdatedAt: integrationsSnapshot?.updatedAt ?? null,
        },
        analytics: {
          totalEvents: analyticsTotalEvents,
          pageViews: pageViewCount,
          sectionViews: sectionViewCount,
          consentAcceptances: consentCount,
          avgTimeOnPageMs: Math.round(Number(avgTimeAggregate?._avg?.durationMs || 0)),
          topPages,
          topSections,
          byCountry,
          recentDaily: eventDays,
          recentConsents: recentConsents.map((c: any) => ({
            ...c,
            acceptedAt: c.acceptedAt,
            visitorId: String(c.visitorId || '').slice(0, 8),
          })),
        },
        recentActivity,
      },
    })
  } catch (error) {
    console.error('api/admin-metrics error', error)
    return res.status(500).json({ ok: false, error: 'Metrics unavailable' })
  }
}
