import { prisma } from './_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from './_lib/integrations.js'
import { requireAdminSession } from './_lib/admin-auth.js'
import { PRESERVE_TERMS, hashTranslationCacheKey } from './_lib/translation.js'
import { safeString } from './_lib/analytics.js'

type VercelRequest = any
type VercelResponse = any

const CMS_ID = 'main'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatMonth(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'si') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  return fallback
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

type TranslationAuditUnit = {
  id: string
  label: string
  route: string
  payload: unknown
}

function buildTranslationAuditUnits(cmsData: any): TranslationAuditUnit[] {
  const units: TranslationAuditUnit[] = []
  const pages = Array.isArray(cmsData?.siteArchitecture?.pages) ? cmsData.siteArchitecture.pages : []

  units.push({ id: 'core:hero', label: 'Hero', route: '/', payload: cmsData?.hero ?? {} })
  units.push({ id: 'core:services', label: 'Servicios', route: '/#servicios', payload: cmsData?.services ?? [] })
  units.push({ id: 'core:products', label: 'Productos', route: '/#productos', payload: cmsData?.products ?? [] })
  units.push({
    id: 'core:site',
    label: 'Configuración sitio',
    route: '/config',
    payload: {
      name: cmsData?.site?.name ?? '',
      description: cmsData?.site?.description ?? '',
      contactAddress: cmsData?.site?.contactAddress ?? '',
    },
  })
  units.push({ id: 'core:homePage', label: 'Home Builder', route: '/', payload: cmsData?.homePage ?? {} })

  for (const page of pages) {
    const id = String(page?.id || '')
    if (!id) continue
    const route = typeof page?.path === 'string' && page.path.trim() ? page.path.trim() : '/(sin-ruta)'
    const title = typeof page?.title === 'string' && page.title.trim() ? page.title.trim() : id
    units.push({
      id: `page:${id}`,
      label: title,
      route,
      payload: page,
    })
  }

  return units
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isLikelyNonTranslatable(value: string) {
  const text = value.trim()
  if (!text) return true
  if (text.length < 3) return true
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(text)) return true
  if (/^[-+*/=~_.,:;!?()[\]{}<>0-9\s%$#@]+$/.test(text)) return true
  if (/^[A-Z0-9 _:+\-/.]{2,20}$/.test(text)) return true
  if (/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+$/.test(text)) return true

  const normalized = normalizeText(text)
  if (PRESERVE_TERMS.some((term) => normalizeText(term) === normalized)) return true
  return false
}

function compareTranslatedStrings(source: unknown, translated: unknown): { total: number; unchanged: number } {
  if (typeof source === 'string') {
    if (isLikelyNonTranslatable(source)) return { total: 0, unchanged: 0 }
    const translatedString = typeof translated === 'string' ? translated : ''
    const unchanged = normalizeText(source) === normalizeText(translatedString) ? 1 : 0
    return { total: 1, unchanged }
  }

  if (Array.isArray(source)) {
    let total = 0
    let unchanged = 0
    for (let i = 0; i < source.length; i++) {
      const child = compareTranslatedStrings(source[i], Array.isArray(translated) ? translated[i] : undefined)
      total += child.total
      unchanged += child.unchanged
    }
    return { total, unchanged }
  }

  if (source && typeof source === 'object') {
    let total = 0
    let unchanged = 0
    const translatedObject = translated && typeof translated === 'object' && !Array.isArray(translated) ? (translated as Record<string, unknown>) : {}
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      const child = compareTranslatedStrings(value, translatedObject[key])
      total += child.total
      unchanged += child.unchanged
    }
    return { total, unchanged }
  }

  return { total: 0, unchanged: 0 }
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

    let analyticsTotalEvents = 0
    let pageViewCount = 0
    let sectionViewCount = 0
    let consentCount = 0
    let avgTimeAggregate: any = { _avg: { durationMs: null } }
    let topPagesRaw: any[] = []
    let topSectionsRaw: any[] = []
    let byCountryRaw: any[] = []
    let recentAnalytics: any[] = []
    let recentConsents: any[] = []
    let marketingCampaignCount = 0
    let marketingSentCount = 0
    let marketingOpenedCount = 0
    let marketingUnsubscribedCount = 0
    let marketingRecipientRows: Array<{ sentAt: Date | null; openedAt: Date | null; status: string; updatedAt: Date }> = []
    let marketingOpenedRecipientsRows: Array<{ email: string; openCount: number; openedAt: Date | null; lastOpenedAt: Date | null; campaign: { id: string; name: string; subject: string } }> = []
    let marketingUnsubscribeEventRows: Array<{ createdAt: Date; metadata: any }> = []
    let caseGeneratorRows: Array<{ eventType: string; createdAt: Date; metadata: any }> = []

    try {
      const analyticsResults = await Promise.allSettled([
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
        prisma.marketingEmailCampaign.count(),
        prisma.marketingEmailRecipient.count({ where: { status: 'sent' } }),
        prisma.marketingEmailRecipient.count({ where: { openedAt: { not: null } } }),
        prisma.marketingEmailRecipient.count({ where: { status: 'unsubscribed' } }),
        prisma.marketingEmailRecipient.findMany({
          where: {
            OR: [
              { sentAt: { not: null } },
              { openedAt: { not: null } },
              { status: 'unsubscribed' },
            ],
          },
          select: { sentAt: true, openedAt: true, status: true, updatedAt: true },
          take: 12000,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.marketingEmailRecipient.findMany({
          where: { openedAt: { not: null } },
          orderBy: { lastOpenedAt: 'desc' },
          take: 200,
          select: {
            email: true,
            openCount: true,
            openedAt: true,
            lastOpenedAt: true,
            campaign: {
              select: {
                id: true,
                name: true,
                subject: true,
              },
            },
          },
        }),
        prisma.analyticsEvent.findMany({
          where: { eventType: 'email_campaign_unsubscribe' },
          orderBy: { createdAt: 'desc' },
          take: 2500,
          select: {
            createdAt: true,
            metadata: true,
          },
        }),
        prisma.analyticsEvent.findMany({
          where: {
            eventType: {
              in: ['case_generator_query', 'case_generator_email_sent'],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
          select: {
            eventType: true,
            createdAt: true,
            metadata: true,
          },
        }),
      ] as const)

      const pick = <T,>(index: number, fallback: T): T => {
        const item = analyticsResults[index]
        if (!item || item.status !== 'fulfilled') {
          const reason = (item as PromiseRejectedResult | undefined)?.reason
          if (reason) console.error(`api/admin-metrics analytics query[${index}] degraded`, reason)
          return fallback
        }
        return item.value as T
      }

      analyticsTotalEvents = pick(0, 0)
      pageViewCount = pick(1, 0)
      sectionViewCount = pick(2, 0)
      consentCount = pick(3, 0)
      avgTimeAggregate = pick(4, { _avg: { durationMs: null } } as any)
      topPagesRaw = pick(5, [] as any[])
      topSectionsRaw = pick(6, [] as any[])
      byCountryRaw = pick(7, [] as any[])
      recentAnalytics = pick(8, [] as any[])
      recentConsents = pick(9, [] as any[])
      marketingCampaignCount = pick(10, 0)
      marketingSentCount = pick(11, 0)
      marketingOpenedCount = pick(12, 0)
      marketingUnsubscribedCount = pick(13, 0)
      marketingRecipientRows = pick(14, [] as Array<{ sentAt: Date | null; openedAt: Date | null; status: string; updatedAt: Date }>)
      marketingOpenedRecipientsRows = pick(15, [] as Array<{ email: string; openCount: number; openedAt: Date | null; lastOpenedAt: Date | null; campaign: { id: string; name: string; subject: string } }>)
      marketingUnsubscribeEventRows = pick(16, [] as Array<{ createdAt: Date; metadata: any }>)
      caseGeneratorRows = pick(17, [] as Array<{ eventType: string; createdAt: Date; metadata: any }>)
    } catch (analyticsError) {
      console.error('api/admin-metrics analytics block degraded', analyticsError)
    }

    const cmsData: any = cmsSnapshot?.data ?? {}
    const integrations = sanitizeIntegrations(integrationsSnapshot?.data ?? {})

    const serviceCount = Array.isArray(cmsData.services) ? cmsData.services.length : 0
    const productCount = Array.isArray(cmsData.products) ? cmsData.products.length : 0
    const architectureCount = Array.isArray(cmsData.siteArchitecture?.pages) ? cmsData.siteArchitecture.pages.length : 0

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

    const i18nAuditUnits = buildTranslationAuditUnits(cmsData)
    const i18nLangs = ['en', 'fr'] as const
    const i18nKeyMeta = i18nLangs.flatMap((lang) =>
      i18nAuditUnits.map((unit) => ({
        lang,
        key: hashTranslationCacheKey(unit.payload, lang, 'object'),
        unit,
      }))
    )
    const i18nUniqueKeys = Array.from(new Set(i18nKeyMeta.map((entry) => entry.key)))
    const i18nCacheRows = i18nUniqueKeys.length
      ? await prisma.translationCache.findMany({
          where: { key: { in: i18nUniqueKeys } },
          select: { key: true, payload: true, updatedAt: true },
        })
      : []
    const i18nCacheByKey = new Map(i18nCacheRows.map((row) => [row.key, row]))

    const i18nByLang: Record<string, {
      expected: number
      cached: number
      missing: number
      coveragePct: number
      checkedStrings: number
      unchangedStrings: number
      unchangedRatePct: number
    }> = {
      en: { expected: 0, cached: 0, missing: 0, coveragePct: 0, checkedStrings: 0, unchangedStrings: 0, unchangedRatePct: 0 },
      fr: { expected: 0, cached: 0, missing: 0, coveragePct: 0, checkedStrings: 0, unchangedStrings: 0, unchangedRatePct: 0 },
    }

    const i18nMissingUnits: Array<{ lang: string; route: string; label: string }> = []
    const i18nFlaggedUnits: Array<{ lang: string; route: string; label: string; unchanged: number; total: number; ratioPct: number }> = []
    const i18nMissingByRoute = new Map<string, number>()

    for (const entry of i18nKeyMeta) {
      const bucket = i18nByLang[entry.lang]
      bucket.expected += 1

      const cached = i18nCacheByKey.get(entry.key)
      if (!cached) {
        bucket.missing += 1
        const routeKey = `${entry.lang}:${entry.unit.route}`
        i18nMissingByRoute.set(routeKey, (i18nMissingByRoute.get(routeKey) || 0) + 1)
        if (i18nMissingUnits.length < 30) {
          i18nMissingUnits.push({ lang: entry.lang, route: entry.unit.route, label: entry.unit.label })
        }
        continue
      }

      bucket.cached += 1
      const diff = compareTranslatedStrings(entry.unit.payload, (cached as any).payload)
      bucket.checkedStrings += diff.total
      bucket.unchangedStrings += diff.unchanged

      if (diff.total >= 8) {
        const ratio = diff.unchanged / diff.total
        if (ratio >= 0.35 && i18nFlaggedUnits.length < 40) {
          i18nFlaggedUnits.push({
            lang: entry.lang,
            route: entry.unit.route,
            label: entry.unit.label,
            unchanged: diff.unchanged,
            total: diff.total,
            ratioPct: Math.round(ratio * 1000) / 10,
          })
        }
      }
    }

    Object.values(i18nByLang).forEach((bucket) => {
      bucket.coveragePct = bucket.expected > 0 ? Math.round((bucket.cached / bucket.expected) * 1000) / 10 : 100
      bucket.unchangedRatePct = bucket.checkedStrings > 0 ? Math.round((bucket.unchangedStrings / bucket.checkedStrings) * 1000) / 10 : 0
    })

    const i18nMissingRoutes = Array.from(i18nMissingByRoute.entries())
      .map(([key, missing]) => {
        const separator = key.indexOf(':')
        const lang = separator === -1 ? 'en' : key.slice(0, separator)
        const route = separator === -1 ? key : key.slice(separator + 1)
        return { lang, route, missing }
      })
      .sort((a, b) => b.missing - a.missing)
      .slice(0, 20)

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

    const topPages = (topPagesRaw as any[]).length
      ? (topPagesRaw as any[]).map((row) => ({ path: row.path || '(sin ruta)', count: row._count?._all || 0 }))
      : (() => {
          const counts = new Map<string, number>()
          for (const item of recentAnalytics as any[]) {
            if (item.eventType !== 'page_view') continue
            const key = String(item.path || '(sin ruta)')
            counts.set(key, (counts.get(key) || 0) + 1)
          }
          return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }))
        })()

    const topSections = (topSectionsRaw as any[]).length
      ? (topSectionsRaw as any[]).map((row) => ({ sectionId: row.sectionId || '(sin id)', count: row._count?._all || 0 }))
      : (() => {
          const counts = new Map<string, number>()
          for (const item of recentAnalytics as any[]) {
            if (item.eventType !== 'section_view') continue
            const key = String(item.sectionId || '(sin id)')
            counts.set(key, (counts.get(key) || 0) + 1)
          }
          return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([sectionId, count]) => ({ sectionId, count }))
        })()
    const byCountry = (byCountryRaw as any[]).map((row) => ({ country: row.country || 'Unknown', count: row._count?._all || 0 }))

    const marketingDaily = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(new Date(Date.now() - (29 - i) * 86400000))
      return { day: formatDay(d), sent: 0, opened: 0, unsubscribed: 0 }
    })
    const marketingDayIndex = new Map(marketingDaily.map((entry, index) => [entry.day, index]))

    const marketingMonthly = Array.from({ length: 12 }, (_, i) => {
      const base = new Date()
      base.setDate(1)
      base.setHours(0, 0, 0, 0)
      base.setMonth(base.getMonth() - (11 - i))
      return { month: formatMonth(base), sent: 0, opened: 0, unsubscribed: 0 }
    })
    const marketingMonthIndex = new Map(marketingMonthly.map((entry, index) => [entry.month, index]))

    for (const row of marketingRecipientRows) {
      if (row.sentAt) {
        const sentDay = formatDay(new Date(row.sentAt))
        const sentDayIndex = marketingDayIndex.get(sentDay)
        if (sentDayIndex !== undefined) marketingDaily[sentDayIndex].sent += 1

        const sentMonth = formatMonth(new Date(row.sentAt))
        const sentMonthIndex = marketingMonthIndex.get(sentMonth)
        if (sentMonthIndex !== undefined) marketingMonthly[sentMonthIndex].sent += 1
      }
      if (row.openedAt) {
        const openedDay = formatDay(new Date(row.openedAt))
        const openedDayIndex = marketingDayIndex.get(openedDay)
        if (openedDayIndex !== undefined) marketingDaily[openedDayIndex].opened += 1

        const openedMonth = formatMonth(new Date(row.openedAt))
        const openedMonthIndex = marketingMonthIndex.get(openedMonth)
        if (openedMonthIndex !== undefined) marketingMonthly[openedMonthIndex].opened += 1
      }
    }

    const marketingUnsubscribeByEmail = new Map<string, {
      email: string
      unsubscribedAt: Date
      campaignId: string | null
      campaignName: string | null
      subject: string | null
    }>()

    for (const row of marketingUnsubscribeEventRows) {
      const metadata = row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {}
      const preview = parseBoolean(metadata.preview, false)
      const updated = parseBoolean(metadata.updated, true)
      const email = safeString(metadata.email, 320)?.toLowerCase() || ''
      if (!email || preview || !updated) continue

      const unsubscribedDay = formatDay(new Date(row.createdAt))
      const unsubscribedDayIndex = marketingDayIndex.get(unsubscribedDay)
      if (unsubscribedDayIndex !== undefined) marketingDaily[unsubscribedDayIndex].unsubscribed += 1

      const unsubscribedMonth = formatMonth(new Date(row.createdAt))
      const unsubscribedMonthIndex = marketingMonthIndex.get(unsubscribedMonth)
      if (unsubscribedMonthIndex !== undefined) marketingMonthly[unsubscribedMonthIndex].unsubscribed += 1

      const campaignId = safeString(metadata.campaignId, 120) || null
      const campaignName = safeString(metadata.campaignName, 180) || null
      const subject = safeString(metadata.campaignSubject, 220) || safeString(metadata.subject, 220) || null

      const current = marketingUnsubscribeByEmail.get(email)
      if (!current || new Date(row.createdAt) > current.unsubscribedAt) {
        marketingUnsubscribeByEmail.set(email, {
          email,
          unsubscribedAt: new Date(row.createdAt),
          campaignId,
          campaignName,
          subject,
        })
      }
    }

    const marketingOpenedRecipients = marketingOpenedRecipientsRows.map((row) => ({
      email: row.email,
      openCount: row.openCount || 0,
      openedAt: row.openedAt ? row.openedAt.toISOString() : null,
      lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
      campaignId: row.campaign?.id || null,
      campaignName: row.campaign?.name || null,
      subject: row.campaign?.subject || null,
    }))
    const marketingUnsubscribedRecipients = Array.from(marketingUnsubscribeByEmail.values())
      .sort((a, b) => b.unsubscribedAt.getTime() - a.unsubscribedAt.getTime())
      .map((row) => ({
        email: row.email,
        unsubscribedAt: row.unsubscribedAt ? row.unsubscribedAt.toISOString() : null,
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        subject: row.subject,
      }))
    const marketingUnsubscribedTotalPrecise = marketingUnsubscribedRecipients.length > 0
      ? marketingUnsubscribedRecipients.length
      : marketingUnsubscribedCount
    const marketingOpenRate = marketingSentCount > 0 ? Math.round((marketingOpenedCount / marketingSentCount) * 1000) / 10 : 0

    const caseGeneratorDaily = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(new Date(Date.now() - (29 - i) * 86400000))
      return { day: formatDay(d), queries: 0, emails: 0 }
    })
    const caseGeneratorDayIndex = new Map(caseGeneratorDaily.map((entry, index) => [entry.day, index]))
    const queryByIndustry = new Map<string, number>()
    const queryByProcess = new Map<string, number>()
    const queryByType = new Map<string, number>()
    const emailByRecipient = new Map<string, { email: string; count: number; lastSentAt: Date; industry: string | null; processName: string | null }>()

    for (const row of caseGeneratorRows) {
      const day = formatDay(new Date(row.createdAt))
      const dayIndex = caseGeneratorDayIndex.get(day)
      const metadata = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, unknown> : {}
      const industry = safeString(metadata.industry, 160) || 'No definido'
      const processName = safeString(metadata.processName, 220) || 'No definido'
      const queryType = safeString(metadata.queryType, 120) || 'No definido'

      if (row.eventType === 'case_generator_query') {
        if (dayIndex !== undefined) caseGeneratorDaily[dayIndex].queries += 1
        queryByIndustry.set(industry, (queryByIndustry.get(industry) || 0) + 1)
        queryByProcess.set(processName, (queryByProcess.get(processName) || 0) + 1)
        queryByType.set(queryType, (queryByType.get(queryType) || 0) + 1)
      }

      if (row.eventType === 'case_generator_email_sent') {
        if (dayIndex !== undefined) caseGeneratorDaily[dayIndex].emails += 1
        const email = safeString(metadata.email, 320)?.toLowerCase()
        if (email) {
          const current = emailByRecipient.get(email)
          if (!current) {
            emailByRecipient.set(email, {
              email,
              count: 1,
              lastSentAt: new Date(row.createdAt),
              industry: safeString(metadata.industry, 160) || null,
              processName: safeString(metadata.processName, 220) || null,
            })
          } else {
            current.count += 1
            if (new Date(row.createdAt) > current.lastSentAt) {
              current.lastSentAt = new Date(row.createdAt)
              current.industry = safeString(metadata.industry, 160) || current.industry
              current.processName = safeString(metadata.processName, 220) || current.processName
            }
          }
        }
      }
    }

    const caseGeneratorByIndustry = Array.from(queryByIndustry.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)

    const caseGeneratorByProcess = Array.from(queryByProcess.entries())
      .map(([processName, count]) => ({ processName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    const caseGeneratorByType = Array.from(queryByType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const caseGeneratorEmails = Array.from(emailByRecipient.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.lastSentAt.getTime() - a.lastSentAt.getTime()
      })
      .slice(0, 200)
      .map((row) => ({
        email: row.email,
        count: row.count,
        lastSentAt: row.lastSentAt.toISOString(),
        industry: row.industry,
        processName: row.processName,
      }))

    const caseGeneratorTotalQueries = caseGeneratorRows.filter((row) => row.eventType === 'case_generator_query').length
    const caseGeneratorTotalEmails = caseGeneratorRows.filter((row) => row.eventType === 'case_generator_email_sent').length
    const caseGeneratorActiveIndustries = caseGeneratorByIndustry.length
    const caseGeneratorActiveProcesses = caseGeneratorByProcess.length

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
          totalManagedRoutes: Math.max(1, architectureCount) + serviceCount + productCount,
          lastUpdatedAt: cmsSnapshot?.updatedAt ?? null,
        },
        translations: {
          total: translationCount,
          byLang: byLangMap,
          recentDaily: days,
        },
        i18n: {
          auditedUnits: i18nAuditUnits.length,
          byLang: i18nByLang,
          missingRoutes: i18nMissingRoutes,
          missingUnits: i18nMissingUnits,
          flaggedUnits: i18nFlaggedUnits
            .sort((a, b) => b.ratioPct - a.ratioPct)
            .slice(0, 20),
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
        marketing: {
          campaignsTotal: marketingCampaignCount,
          sentTotal: marketingSentCount,
          openedTotal: marketingOpenedCount,
          unsubscribedTotal: marketingUnsubscribedTotalPrecise,
          openRate: marketingOpenRate,
          daily: marketingDaily,
          monthly: marketingMonthly,
          openedRecipients: marketingOpenedRecipients,
          unsubscribedRecipients: marketingUnsubscribedRecipients,
        },
        caseGenerator: {
          totalQueries: caseGeneratorTotalQueries,
          totalEmails: caseGeneratorTotalEmails,
          activeIndustries: caseGeneratorActiveIndustries,
          activeProcesses: caseGeneratorActiveProcesses,
          daily: caseGeneratorDaily,
          byIndustry: caseGeneratorByIndustry,
          byProcess: caseGeneratorByProcess,
          byType: caseGeneratorByType,
          emails: caseGeneratorEmails,
        },
        recentActivity,
      },
    })
  } catch (error) {
    console.error('api/admin-metrics error', error)
    return res.status(500).json({ ok: false, error: 'Metrics unavailable' })
  }
}
