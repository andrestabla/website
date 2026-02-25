import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Languages, Boxes, Activity, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCMS } from '../context/CMSContext'

type MetricsData = {
  translations: { total: number; byLang: Record<string, number>; recentDaily: Array<{ day: string; count: number }> }
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
