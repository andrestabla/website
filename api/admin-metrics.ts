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
    const [cmsSnapshot, integrationsSnapshot, translationCount, translationsByLang, latestTranslations, latestSnapshots] = await Promise.all([
      prisma.cmsSnapshot.findUnique({ where: { id: CMS_ID } }),
      prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } }),
      prisma.translationCache.count(),
      prisma.translationCache.groupBy({ by: ['targetLang'], _count: { _all: true } }),
      prisma.translationCache.findMany({ orderBy: { updatedAt: 'desc' }, take: 20, select: { targetLang: true, updatedAt: true, provider: true, model: true } }),
      prisma.cmsSnapshot.findMany({ orderBy: { updatedAt: 'desc' }, take: 10, select: { id: true, updatedAt: true } }),
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
        recentActivity,
      },
    })
  } catch (error) {
    console.error('api/admin-metrics error', error)
    return res.status(500).json({ ok: false, error: 'Metrics unavailable' })
  }
}
