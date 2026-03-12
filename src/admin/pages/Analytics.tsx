import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Languages, Boxes, Activity, RefreshCw, ShieldCheck, Mail, MailOpen, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCMS } from '../context/CMSContext'

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
    openRate: number
    daily: Array<{ day: string; sent: number; opened: number }>
    monthly: Array<{ month: string; sent: number; opened: number }>
    openedRecipients: Array<{
      email: string
      openCount: number
      openedAt: string | null
      lastOpenedAt: string | null
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

const COLORS = ['#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe']

export function Analytics() {
  const { state } = useCMS()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    const intervalId = window.setInterval(() => { void load() }, 10000)
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

  const sourceData = useMemo(() => {
    if (!metrics) return []
    return Object.entries(metrics.translations.byLang)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
  }, [metrics])

  const seoPageData = useMemo(() => {
    const rows = [
      ...state.services.map(s => ({
        page: `/servicios/${s.slug}`,
        score: [s.seoTitle, s.seoDescription].filter(Boolean).length,
      })),
      ...state.products.map(p => ({
        page: `/productos/${p.slug}`,
        score: [p.seoTitle, p.seoDescription].filter(Boolean).length,
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
  const marketingOpeners = metrics?.marketing.openedRecipients.slice(0, 25) ?? []
  const caseGeneratorIndustryChart = metrics?.caseGenerator.byIndustry.slice(0, 8) ?? []
  const caseGeneratorProcessChart = metrics?.caseGenerator.byProcess.slice(0, 8) ?? []
  const caseGeneratorTypes = metrics?.caseGenerator.byType.slice(0, 8) ?? []
  const caseGeneratorEmails = metrics?.caseGenerator.emails.slice(0, 100) ?? []
  const i18nLangRows = metrics
    ? Object.entries(metrics.i18n.byLang).map(([lang, bucket]) => ({ lang: lang.toUpperCase(), ...bucket }))
    : []
  const i18nMissingRoutes = metrics?.i18n.missingRoutes.slice(0, 12) ?? []
  const i18nFlaggedUnits = metrics?.i18n.flaggedUnits.slice(0, 12) ?? []

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Analítica</h1>
        <p className="text-slate-500 font-light">Métricas reales de operación, consentimiento y navegación (Vercel + Neon).</p>
      </div>

      {loading && <div className="bg-white border border-slate-200 p-6 flex items-center gap-3"><RefreshCw className="w-4 h-4 animate-spin" />Cargando analítica real...</div>}
      {error && <div className="bg-red-50 border border-red-200 p-6 text-red-700 font-semibold">No se pudieron cargar métricas: {error}</div>}

      {!!metrics && (
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
                    ) : i18nMissingRoutes.map((row, idx) => (
                      <tr key={`${row.lang}-${row.route}-${idx}`} className="border-t border-slate-100">
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
                    ) : i18nFlaggedUnits.map((row, idx) => (
                      <tr key={`${row.lang}-${row.route}-${idx}`} className="border-t border-slate-100">
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
                ) : caseGeneratorTypes.map((row, idx) => (
                  <div key={`${row.type}-${idx}`} className="flex items-center justify-between border border-slate-200 px-4 py-3">
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
                  ) : caseGeneratorEmails.map((row, idx) => (
                    <tr key={`${row.email}-${idx}`} className="border-t border-slate-100">
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
                      {sourceData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
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
                      {countriesChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                    <Legend formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 p-7">
              <div className="flex items-center justify-between mb-4">
                <Mail className="w-5 h-5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">marketing</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{metrics.marketing.campaignsTotal}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Campañas enviadas</div>
            </div>
            <div className="bg-white border border-slate-200 p-7">
              <div className="flex items-center justify-between mb-4">
                <Mail className="w-5 h-5 text-slate-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">marketing</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{metrics.marketing.sentTotal}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Correos enviados</div>
            </div>
            <div className="bg-white border border-slate-200 p-7">
              <div className="flex items-center justify-between mb-4">
                <MailOpen className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">opened</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{metrics.marketing.openedTotal}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Correos abiertos</div>
            </div>
            <div className="bg-white border border-slate-200 p-7">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">rate</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{metrics.marketing.openRate}%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Tasa de apertura</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 p-8">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Email Marketing por Día (30d)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={metrics.marketing.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="#1d4ed8" fillOpacity={0.08} fill="#1d4ed8" name="Enviados" />
                  <Area type="monotone" dataKey="opened" stroke="#10b981" fillOpacity={0.08} fill="#10b981" name="Abiertos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-200 p-8">
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Email Marketing por Mes (12m)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.marketing.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="sent" name="Enviados" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="opened" name="Abiertos" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

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
                  {marketingOpeners.length === 0 ? (
                    <tr><td className="px-6 py-8 text-slate-500" colSpan={6}>Aún no hay aperturas registradas.</td></tr>
                  ) : marketingOpeners.map((row, idx) => (
                    <tr key={`${row.email}-${idx}`} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium text-slate-800">{row.email}</td>
                      <td className="px-6 py-4 text-slate-600">{row.campaignName || 'N/D'}</td>
                      <td className="px-6 py-4 text-slate-600">{row.subject || 'N/D'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{row.openCount}</td>
                      <td className="px-6 py-4 text-slate-600">{row.openedAt ? new Date(row.openedAt).toLocaleString() : 'N/D'}</td>
                      <td className="px-6 py-4 text-slate-600">{row.lastOpenedAt ? new Date(row.lastOpenedAt).toLocaleString() : 'N/D'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  ) : metrics.analytics.recentConsents.map((row, idx) => (
                    <tr key={`${row.visitorId}-${idx}`} className="border-t border-slate-100">
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
      )}
    </div>
  )
}
