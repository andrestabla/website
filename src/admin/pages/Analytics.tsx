import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  Languages,
  Boxes,
  Activity,
  RefreshCw,
  ShieldCheck,
  Mail,
  MailOpen,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  UserX,
  LayoutGrid,
  Filter,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCMS } from '../context/CMSContext'

type MarketingRecipientActivity = {
  email: string
  status: string
  sentAt: string | null
  openedAt: string | null
  lastOpenedAt: string | null
  updatedAt: string | null
  openCount: number
  campaignId: string | null
  campaignName: string | null
  subject: string | null
}

type MetricsData = {
  translations: { total: number; byLang: Record<string, number>; recentDaily: Array<{ day: string; count: number }> }
  i18n: {
    auditedUnits: number
    byLang: Record<string, {
      expected: number
      cached: number
      missing: number
      coveragePct: number
      checkedStrings: number
      unchangedStrings: number
      unchangedRatePct: number
    }>
    missingRoutes: Array<{ lang: string; route: string; missing: number }>
    missingUnits: Array<{ lang: string; route: string; label: string }>
    flaggedUnits: Array<{ lang: string; route: string; label: string; unchanged: number; total: number; ratioPct: number }>
  }
  cms: { serviceCount: number; productCount: number; totalManagedRoutes: number }
  integrations: { configured: number; enabled: number }
  analytics: {
    totalEvents: number
    pageViews: number
    sectionViews: number
    consentAcceptances: number
    avgTimeOnPageMs: number
    topPages: Array<{ path: string; count: number }>
    topSections: Array<{ sectionId: string; count: number }>
    byCountry: Array<{ country: string; count: number }>
    recentDaily: Array<{ day: string; pageViews: number; consents: number }>
    recentConsents: Array<{ acceptedAt: string; policyVersion: string; path?: string | null; country?: string | null; city?: string | null; visitorId: string }>
  }
  marketing: {
    campaignsTotal: number
    sentTotal: number
    openedTotal: number
    unsubscribedTotal: number
    openRate: number
    daily: Array<{ day: string; sent: number; opened: number; unsubscribed: number }>
    monthly: Array<{ month: string; sent: number; opened: number; unsubscribed: number }>
    recipientActivity: MarketingRecipientActivity[]
    openedRecipients: Array<{
      email: string
      openCount: number
      openedAt: string | null
      lastOpenedAt: string | null
      campaignId: string | null
      campaignName: string | null
      subject: string | null
    }>
    unsubscribedRecipients: Array<{
      email: string
      unsubscribedAt: string | null
      campaignId: string | null
      campaignName: string | null
      subject: string | null
    }>
  }
  caseGenerator: {
    totalQueries: number
    totalEmails: number
    activeIndustries: number
    activeProcesses: number
    daily: Array<{ day: string; queries: number; emails: number }>
    byIndustry: Array<{ industry: string; count: number }>
    byProcess: Array<{ processName: string; count: number }>
    byType: Array<{ type: string; count: number }>
    emails: Array<{ email: string; count: number; lastSentAt: string; industry: string | null; processName: string | null }>
  }
}

type AnalyticsTab = 'general' | 'cases' | 'marketing'
type MarketingDateFilter = 'all' | '7d' | '30d' | '90d'
type MarketingOpenFilter = 'all' | 'opened' | 'not-opened'

const COLORS = ['#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe']

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'N/D'
  return new Date(value).toLocaleString()
}

function getCampaignFilterKey(row: Pick<MarketingRecipientActivity, 'campaignId' | 'campaignName'>) {
  return row.campaignId || row.campaignName || 'sin-campana'
}

function isMarketingOpened(row: MarketingRecipientActivity) {
  return Boolean(row.lastOpenedAt || row.openedAt || row.openCount > 0)
}

function getMarketingActivityDate(row: MarketingRecipientActivity) {
  return row.lastOpenedAt || row.openedAt || row.sentAt || row.updatedAt || null
}

function getDateCutoff(filter: MarketingDateFilter) {
  if (filter === 'all') return null
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  return cutoff
}

function buildMarketingDaily(rows: MarketingRecipientActivity[]) {
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.now() - (29 - index) * 86400000)
    return {
      day: date.toISOString().slice(0, 10),
      sent: 0,
      opened: 0,
      unsubscribed: 0,
    }
  })

  const indexByDay = new Map(series.map((entry, index) => [entry.day, index]))

  for (const row of rows) {
    if (row.sentAt) {
      const day = row.sentAt.slice(0, 10)
      const idx = indexByDay.get(day)
      if (idx !== undefined) series[idx].sent += 1
    }
    if (row.lastOpenedAt || row.openedAt) {
      const day = (row.lastOpenedAt || row.openedAt || '').slice(0, 10)
      const idx = indexByDay.get(day)
      if (idx !== undefined) series[idx].opened += 1
    }
    if (row.status === 'unsubscribed' && row.updatedAt) {
      const day = row.updatedAt.slice(0, 10)
      const idx = indexByDay.get(day)
      if (idx !== undefined) series[idx].unsubscribed += 1
    }
  }

  return series
}

function buildMarketingMonthly(rows: MarketingRecipientActivity[]) {
  const series = Array.from({ length: 12 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setHours(0, 0, 0, 0)
    date.setMonth(date.getMonth() - (11 - index))
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      month,
      sent: 0,
      opened: 0,
      unsubscribed: 0,
    }
  })

  const indexByMonth = new Map(series.map((entry, index) => [entry.month, index]))

  for (const row of rows) {
    if (row.sentAt) {
      const month = row.sentAt.slice(0, 7)
      const idx = indexByMonth.get(month)
      if (idx !== undefined) series[idx].sent += 1
    }
    if (row.lastOpenedAt || row.openedAt) {
      const month = (row.lastOpenedAt || row.openedAt || '').slice(0, 7)
      const idx = indexByMonth.get(month)
      if (idx !== undefined) series[idx].opened += 1
    }
    if (row.status === 'unsubscribed' && row.updatedAt) {
      const month = row.updatedAt.slice(0, 7)
      const idx = indexByMonth.get(month)
      if (idx !== undefined) series[idx].unsubscribed += 1
    }
  }

  return series
}

function AnalyticsTabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: typeof LayoutGrid
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-black text-[11px] uppercase tracking-widest transition-all border-b-2 ${
        active
          ? 'border-brand-primary text-brand-primary bg-blue-50/40'
          : 'border-transparent text-slate-400 hover:text-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-brand-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Analytics() {
  const { state } = useCMS()
  const [searchParams, setSearchParams] = useSearchParams()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(() => {
    const value = searchParams.get('tab')
    return value === 'cases' || value === 'marketing' ? value : 'general'
  })
  const [campaignFilter, setCampaignFilter] = useState(() => searchParams.get('campaign') || 'all')
  const [dateFilter, setDateFilter] = useState<MarketingDateFilter>(() => {
    const value = searchParams.get('period')
    return value === 'all' || value === '7d' || value === '90d' ? value : '30d'
  })
  const [openFilter, setOpenFilter] = useState<MarketingOpenFilter>(() => {
    const value = searchParams.get('opening')
    return value === 'opened' || value === 'not-opened' ? value : 'all'
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin-metrics', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`)
        if (!cancelled) {
          setMetrics(json.data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No disponible')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const intervalId = window.setInterval(() => {
      void load()
    }, 10000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const searchParamsString = searchParams.toString()

  useEffect(() => {
    const next = new URLSearchParams(searchParamsString)

    if (activeTab === 'general') next.delete('tab')
    else next.set('tab', activeTab)

    if (campaignFilter === 'all') next.delete('campaign')
    else next.set('campaign', campaignFilter)

    if (dateFilter === '30d') next.delete('period')
    else next.set('period', dateFilter)

    if (openFilter === 'all') next.delete('opening')
    else next.set('opening', openFilter)

    if (next.toString() !== searchParamsString) {
      setSearchParams(next, { replace: true })
    }
  }, [activeTab, campaignFilter, dateFilter, openFilter, searchParamsString, setSearchParams])

  const sourceData = useMemo(() => {
    if (!metrics) return []
    return Object.entries(metrics.translations.byLang)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
  }, [metrics])

  const seoPageData = useMemo(() => {
    const rows = [
      ...state.services.map((service) => ({
        page: `/servicios/${service.slug}`,
        score: [service.seoTitle, service.seoDescription].filter(Boolean).length,
      })),
      ...state.products.map((product) => ({
        page: `/productos/${product.slug}`,
        score: [product.seoTitle, product.seoDescription].filter(Boolean).length,
      })),
    ]
    return rows.slice(0, 10)
  }, [state.products, state.services])

  const kpis = metrics ? [
    { label: 'Rutas Gestionadas', value: String(metrics.cms.totalManagedRoutes), icon: Boxes },
    { label: 'Traducciones Cache', value: String(metrics.translations.total), icon: Languages },
    { label: 'Consentimientos', value: String(metrics.analytics.consentAcceptances), icon: ShieldCheck },
    { label: 'Views de Página', value: String(metrics.analytics.pageViews), icon: Activity },
  ] : []

  const topPagesChart = metrics?.analytics.topPages.slice(0, 8) ?? []
  const topSectionsChart = metrics?.analytics.topSections.slice(0, 8) ?? []
  const countriesChart = metrics?.analytics.byCountry.slice(0, 6) ?? []
  const caseGeneratorIndustryChart = metrics?.caseGenerator.byIndustry.slice(0, 8) ?? []
  const caseGeneratorProcessChart = metrics?.caseGenerator.byProcess.slice(0, 8) ?? []
  const caseGeneratorTypes = metrics?.caseGenerator.byType.slice(0, 8) ?? []
  const caseGeneratorEmails = metrics?.caseGenerator.emails.slice(0, 100) ?? []
  const i18nLangRows = metrics
    ? Object.entries(metrics.i18n.byLang).map(([lang, bucket]) => ({ lang: lang.toUpperCase(), ...bucket }))
    : []
  const i18nMissingRoutes = metrics?.i18n.missingRoutes.slice(0, 12) ?? []
  const i18nFlaggedUnits = metrics?.i18n.flaggedUnits.slice(0, 12) ?? []

  const marketingActivity = useMemo(
    () => metrics?.marketing.recipientActivity ?? [],
    [metrics]
  )
  const marketingCampaignOptions = useMemo(() => {
    const unique = new Map<string, string>()
    for (const row of marketingActivity) {
      const key = getCampaignFilterKey(row)
      if (!unique.has(key)) unique.set(key, row.campaignName || 'Sin campaña')
    }
    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [marketingActivity])

  const filteredMarketingActivity = useMemo(() => {
    const cutoff = getDateCutoff(dateFilter)

    return marketingActivity.filter((row) => {
      if (campaignFilter !== 'all' && getCampaignFilterKey(row) !== campaignFilter) return false
      if (openFilter === 'opened' && !isMarketingOpened(row)) return false
      if (openFilter === 'not-opened' && isMarketingOpened(row)) return false
      if (!cutoff) return true
      const activityDate = getMarketingActivityDate(row)
      if (!activityDate) return false
      return new Date(activityDate) >= cutoff
    })
  }, [campaignFilter, dateFilter, marketingActivity, openFilter])

  const filteredMarketingDaily = useMemo(
    () => buildMarketingDaily(filteredMarketingActivity),
    [filteredMarketingActivity]
  )

  const filteredMarketingMonthly = useMemo(
    () => buildMarketingMonthly(filteredMarketingActivity),
    [filteredMarketingActivity]
  )

  const filteredMarketingOpened = useMemo(
    () => filteredMarketingActivity.filter(isMarketingOpened).slice(0, 120),
    [filteredMarketingActivity]
  )

  const filteredMarketingUnsubscribed = useMemo(
    () => filteredMarketingActivity.filter((row) => row.status === 'unsubscribed').slice(0, 120),
    [filteredMarketingActivity]
  )

  const filteredMarketingSummary = useMemo(() => {
    const campaigns = new Set(filteredMarketingActivity.map((row) => getCampaignFilterKey(row)))
    const sent = filteredMarketingActivity.filter((row) => Boolean(row.sentAt)).length
    const opened = filteredMarketingActivity.filter(isMarketingOpened).length
    const unsubscribed = filteredMarketingActivity.filter((row) => row.status === 'unsubscribed').length
    return {
      campaigns: campaigns.size,
      sent,
      opened,
      unsubscribed,
      openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    }
  }, [filteredMarketingActivity])

  const tabContent = metrics ? {
    general: (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 bg-blue-50 text-brand-primary flex items-center justify-center">
                  <kpi.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 px-2 py-1">real</span>
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">{kpi.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-6">Calidad i18n</h3>
            <p className="text-sm text-slate-600 mb-6">
              Auditoría sobre <span className="font-semibold text-slate-900">{metrics.i18n.auditedUnits}</span> bloques esperados por idioma.
            </p>
            <div className="space-y-4">
              {i18nLangRows.map((row) => (
                <div key={row.lang} className="border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black tracking-widest text-slate-500">{row.lang}</span>
                    <span className="text-sm font-black text-slate-900">{row.coveragePct}% cache</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.cached}/{row.expected} listos · {row.missing} faltantes
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Sin traducir detectado: <span className="font-semibold text-slate-700">{row.unchangedRatePct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Rutas sin cache i18n</h3>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                  <tr>
                    <th className="text-left px-4 py-3">Idioma</th>
                    <th className="text-left px-4 py-3">Ruta</th>
                    <th className="text-left px-4 py-3">Faltantes</th>
                  </tr>
                </thead>
                <tbody>
                  {i18nMissingRoutes.length === 0 ? (
                    <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>Sin faltantes detectados.</td></tr>
                  ) : i18nMissingRoutes.map((row, index) => (
                    <tr key={`${row.lang}-${row.route}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.lang.toUpperCase()}</td>
                      <td className="px-4 py-3 text-slate-600">{row.route}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{row.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Bloques con riesgo de mezcla</h3>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                  <tr>
                    <th className="text-left px-4 py-3">Idioma</th>
                    <th className="text-left px-4 py-3">Bloque</th>
                    <th className="text-left px-4 py-3">Sin traducir</th>
                  </tr>
                </thead>
                <tbody>
                  {i18nFlaggedUnits.length === 0 ? (
                    <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>Sin bloques críticos detectados.</td></tr>
                  ) : i18nFlaggedUnits.map((row, index) => (
                    <tr key={`${row.lang}-${row.route}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.lang.toUpperCase()}</td>
                      <td className="px-4 py-3 text-slate-600">{row.route}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.ratioPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-5 h-5 text-brand-primary" />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Traducciones Cache por Día (14d)</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={metrics.translations.recentDaily}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} fill="url(#colorCount)" name="Entradas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Cache por Idioma</h3>
            {sourceData.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay traducciones cacheadas en DB.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={56} outerRadius={85} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{value}</span>} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Navegación y Consentimiento por Día (14d)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={metrics.analytics.recentDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Area type="monotone" dataKey="pageViews" stroke="#1d4ed8" fillOpacity={0.08} fill="#1d4ed8" name="Page Views" />
                <Area type="monotone" dataKey="consents" stroke="#10b981" fillOpacity={0.08} fill="#10b981" name="Consentimientos" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-slate-500">
              Tiempo promedio en página: <span className="font-bold text-slate-700">{Math.round((metrics.analytics.avgTimeOnPageMs || 0) / 1000)}s</span> ·
              Secciones consultadas: <span className="font-bold text-slate-700">{metrics.analytics.sectionViews}</span> ·
              Eventos totales: <span className="font-bold text-slate-700">{metrics.analytics.totalEvents}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Ubicación Geográfica (Top países)</h3>
            {countriesChart.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay eventos geográficos registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={countriesChart} dataKey="count" nameKey="country" innerRadius={45} outerRadius={82}>
                    {countriesChart.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Legend formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Páginas Consultadas (Top)</h3>
            </div>
            <div className="p-8">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topPagesChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="path" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={220} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[0, 2, 2, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Secciones Consultadas (Top)</h3>
            </div>
            <div className="p-8">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSectionsChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="sectionId" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={220} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0f172a" radius={[0, 2, 2, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-100">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Trazabilidad de Aceptaciones (reciente)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                <tr>
                  <th className="text-left px-6 py-4">Fecha</th>
                  <th className="text-left px-6 py-4">Versión</th>
                  <th className="text-left px-6 py-4">Ubicación</th>
                  <th className="text-left px-6 py-4">Ruta</th>
                  <th className="text-left px-6 py-4">Visitante</th>
                </tr>
              </thead>
              <tbody>
                {metrics.analytics.recentConsents.length === 0 ? (
                  <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>Aún no hay aceptaciones registradas.</td></tr>
                ) : metrics.analytics.recentConsents.map((row, index) => (
                  <tr key={`${row.visitorId}-${index}`} className="border-t border-slate-100">
                    <td className="px-6 py-4 text-slate-700">{new Date(row.acceptedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{row.policyVersion}</td>
                    <td className="px-6 py-4 text-slate-600">{[row.country, row.city].filter(Boolean).join(' · ') || 'N/D'}</td>
                    <td className="px-6 py-4 text-slate-600">{row.path || 'N/D'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.visitorId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-100">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Cobertura SEO en Rutas del CMS (real)</h3>
          </div>
          <div className="p-8">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={seoPageData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 2]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="page" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={220} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Bar dataKey="score" name="Campos SEO completos (0-2)" fill="#1d4ed8" radius={[0, 2, 2, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    ),
    cases: (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">generador-casos</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{metrics.caseGenerator.totalQueries}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Consultas generadas</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Mail className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">email</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{metrics.caseGenerator.totalEmails}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Resultados enviados</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Boxes className="w-5 h-5 text-slate-700" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">segmentación</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{metrics.caseGenerator.activeIndustries}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Industrias activas</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-slate-700" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">operación</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{metrics.caseGenerator.activeProcesses}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Procesos consultados</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Interacción en /generador-casos por Día (30d)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={metrics.caseGenerator.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Area type="monotone" dataKey="queries" stroke="#1d4ed8" fillOpacity={0.08} fill="#1d4ed8" name="Consultas" />
                <Area type="monotone" dataKey="emails" stroke="#10b981" fillOpacity={0.08} fill="#10b981" name="Envíos por correo" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Tipos de consulta</h3>
            <div className="space-y-3">
              {caseGeneratorTypes.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay consultas registradas.</p>
              ) : caseGeneratorTypes.map((row, index) => (
                <div key={`${row.type}-${index}`} className="flex items-center justify-between border border-slate-200 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{row.type}</span>
                  <span className="text-sm font-black text-slate-900">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Consultas por Industria</h3>
            {caseGeneratorIndustryChart.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay datos de industria.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={caseGeneratorIndustryChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="industry" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={220} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[0, 2, 2, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Consultas por Proceso</h3>
            {caseGeneratorProcessChart.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay datos de proceso.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={caseGeneratorProcessChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="processName" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={240} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0f172a" radius={[0, 2, 2, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-100">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Correos que enviaron resultados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                <tr>
                  <th className="text-left px-6 py-4">Email</th>
                  <th className="text-left px-6 py-4">Envíos</th>
                  <th className="text-left px-6 py-4">Industria (último)</th>
                  <th className="text-left px-6 py-4">Proceso (último)</th>
                  <th className="text-left px-6 py-4">Último envío</th>
                </tr>
              </thead>
              <tbody>
                {caseGeneratorEmails.length === 0 ? (
                  <tr><td className="px-6 py-8 text-slate-500" colSpan={5}>Aún no hay envíos desde el generador de casos.</td></tr>
                ) : caseGeneratorEmails.map((row, index) => (
                  <tr key={`${row.email}-${index}`} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.email}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{row.count}</td>
                    <td className="px-6 py-4 text-slate-600">{row.industry || 'N/D'}</td>
                    <td className="px-6 py-4 text-slate-600">{row.processName || 'N/D'}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(row.lastSentAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ),
    marketing: (
      <>
        <div className="bg-white border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-4 h-4 text-brand-primary" />
            <div>
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Filtros de campaña</h3>
              <p className="mt-2 text-sm text-slate-500">
                La vista se actualiza por campaña, periodo de actividad y apertura para separar rendimiento global y comportamiento puntual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterSelect
              label="Campaña"
              value={campaignFilter}
              onChange={setCampaignFilter}
              options={[
                { value: 'all', label: 'Todas las campañas' },
                ...marketingCampaignOptions,
              ]}
            />
            <FilterSelect
              label="Periodo"
              value={dateFilter}
              onChange={(value) => setDateFilter(value as MarketingDateFilter)}
              options={[
                { value: 'all', label: 'Todo el histórico' },
                { value: '7d', label: 'Últimos 7 días' },
                { value: '30d', label: 'Últimos 30 días' },
                { value: '90d', label: 'Últimos 90 días' },
              ]}
            />
            <FilterSelect
              label="Apertura"
              value={openFilter}
              onChange={(value) => setOpenFilter(value as MarketingOpenFilter)}
              options={[
                { value: 'all', label: 'Todos los destinatarios' },
                { value: 'opened', label: 'Solo abiertos' },
                { value: 'not-opened', label: 'Solo no abiertos' },
              ]}
            />
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Mostrando <span className="font-bold text-slate-700">{filteredMarketingActivity.length}</span> registros trazables de destinatarios.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Mail className="w-5 h-5 text-brand-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">marketing</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{filteredMarketingSummary.campaigns}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Campañas en vista</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <Mail className="w-5 h-5 text-slate-700" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">marketing</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{filteredMarketingSummary.sent}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Correos enviados</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <MailOpen className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">opened</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{filteredMarketingSummary.opened}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Correos abiertos</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <UserX className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">opt-out</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{filteredMarketingSummary.unsubscribed}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">No interesados</div>
          </div>
          <div className="bg-white border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">rate</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{filteredMarketingSummary.openRate}%</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Tasa de apertura</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Campañas de Email por Día (30d)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredMarketingDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Area type="monotone" dataKey="sent" stroke="#1d4ed8" fillOpacity={0.08} fill="#1d4ed8" name="Enviados" />
                <Area type="monotone" dataKey="opened" stroke="#10b981" fillOpacity={0.08} fill="#10b981" name="Abiertos" />
                <Area type="monotone" dataKey="unsubscribed" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" name="No interesados" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Campañas de Email por Mes (12m)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredMarketingMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                <Bar dataKey="sent" name="Enviados" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="opened" name="Abiertos" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="unsubscribed" name="No interesados" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-100">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Actividad de destinatarios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                <tr>
                  <th className="text-left px-6 py-4">Email</th>
                  <th className="text-left px-6 py-4">Campaña</th>
                  <th className="text-left px-6 py-4">Asunto</th>
                  <th className="text-left px-6 py-4">Estado</th>
                  <th className="text-left px-6 py-4">Enviado</th>
                  <th className="text-left px-6 py-4">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarketingActivity.length === 0 ? (
                  <tr><td className="px-6 py-8 text-slate-500" colSpan={6}>No hay actividad de marketing para los filtros actuales.</td></tr>
                ) : filteredMarketingActivity.slice(0, 160).map((row, index) => (
                  <tr key={`${row.email}-${row.campaignId || row.campaignName || 'no-campaign'}-${index}`} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-800">{row.email}</td>
                    <td className="px-6 py-4 text-slate-600">{row.campaignName || 'Sin campaña'}</td>
                    <td className="px-6 py-4 text-slate-600">{row.subject || 'N/D'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                        row.status === 'unsubscribed'
                          ? 'bg-amber-50 text-amber-700'
                          : isMarketingOpened(row)
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.status === 'unsubscribed' ? 'No interesado' : isMarketingOpened(row) ? 'Abierto' : 'Enviado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(row.sentAt)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(getMarketingActivityDate(row))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Aperturas de correo (quién abrió)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                  <tr>
                    <th className="text-left px-6 py-4">Email</th>
                    <th className="text-left px-6 py-4">Campaña</th>
                    <th className="text-left px-6 py-4">Asunto</th>
                    <th className="text-left px-6 py-4">Aperturas</th>
                    <th className="text-left px-6 py-4">Primera apertura</th>
                    <th className="text-left px-6 py-4">Última apertura</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarketingOpened.length === 0 ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={6}>No hay aperturas para los filtros actuales.</td></tr>
                  ) : filteredMarketingOpened.map((row, index) => (
                    <tr key={`${row.email}-${row.campaignId || row.campaignName || 'no-campaign'}-open-${index}`} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium text-slate-800">{row.email}</td>
                      <td className="px-6 py-4 text-slate-600">{row.campaignName || 'Sin campaña'}</td>
                      <td className="px-6 py-4 text-slate-600">{row.subject || 'N/D'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{row.openCount || 1}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(row.openedAt)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(row.lastOpenedAt || row.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">No interesados (opt-out)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
                  <tr>
                    <th className="text-left px-6 py-4">Email</th>
                    <th className="text-left px-6 py-4">Campaña</th>
                    <th className="text-left px-6 py-4">Asunto</th>
                    <th className="text-left px-6 py-4">Fecha de baja</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarketingUnsubscribed.length === 0 ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={4}>No hay registros de “No estoy interesado” para los filtros actuales.</td></tr>
                  ) : filteredMarketingUnsubscribed.map((row, index) => (
                    <tr key={`${row.email}-${row.campaignId || row.campaignName || 'no-campaign'}-unsubscribe-${index}`} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium text-slate-800">{row.email}</td>
                      <td className="px-6 py-4 text-slate-600">{row.campaignName || 'Sin campaña'}</td>
                      <td className="px-6 py-4 text-slate-600">{row.subject || 'N/D'}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    ),
  } : null

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Analítica</h1>
        <p className="text-slate-500 font-light">
          Reorganiza la lectura por contexto: operación general, interacción con el generador de casos y rendimiento de campañas de email.
        </p>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 p-6 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando analítica real...
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 p-6 text-red-700 font-semibold">No se pudieron cargar métricas: {error}</div>}

      {!!metrics && (
        <>
          <div className="bg-white border border-slate-200">
            <div className="flex flex-wrap border-b border-slate-200">
              <AnalyticsTabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={LayoutGrid} label="Datos generales" />
              <AnalyticsTabButton active={activeTab === 'cases'} onClick={() => setActiveTab('cases')} icon={Sparkles} label="Interacción con generador de casos" />
              <AnalyticsTabButton active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={Mail} label="Campañas de email marketing" />
            </div>
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {activeTab === 'general'
                  ? 'Vista operativa consolidada'
                  : activeTab === 'cases'
                    ? 'Analítica específica del asistente /generador-casos'
                    : 'Seguimiento detallado de campañas, aperturas y bajas'}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {activeTab === 'general' && tabContent?.general}
            {activeTab === 'cases' && tabContent?.cases}
            {activeTab === 'marketing' && tabContent?.marketing}
          </div>
        </>
      )}
    </div>
  )
}
