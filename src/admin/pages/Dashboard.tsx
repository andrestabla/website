import { useEffect, useState } from 'react'
import { Users, Boxes, Languages, Plug, Activity, Zap, Globe, RefreshCw } from 'lucide-react'

type DashboardData = {
  responseMs: number
  region: string
  cms: { serviceCount: number; productCount: number; totalManagedRoutes: number; lastUpdatedAt: string | null }
  translations: { total: number; byLang: Record<string, number> }
  integrations: { configured: number; enabled: number; items: Array<{ key: string; enabled: boolean; status: string }> }
  recentActivity: Array<{ event: string; source: string; date: string; status: string }>
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
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
          setData(json.data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No disponible')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const id = window.setInterval(load, 15000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])

  const stats = data ? [
    { name: 'Servicios', value: String(data.cms.serviceCount), change: 'CMS', icon: Users },
    { name: 'Productos', value: String(data.cms.productCount), change: 'CMS', icon: Boxes },
    { name: 'Traducciones Cache', value: String(data.translations.total), change: 'DB', icon: Languages },
    { name: 'Integraciones Activas', value: `${data.integrations.enabled}/${data.integrations.configured}`, change: 'Server', icon: Plug },
  ] : []

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Monitor Sistema</h1>
        <p className="text-slate-500 font-light">Estado real del CMS, integraciones y cache de traducciones en Vercel + Neon.</p>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 p-6 flex items-center gap-3 text-slate-700">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando métricas reales...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 p-6 text-red-700 font-semibold">
          No se pudieron cargar métricas reales: {error}
        </div>
      )}

      {!!data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-brand-primary">
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-50 text-slate-600">
                    {stat.change}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.name}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <Activity className="w-5 h-5 text-brand-primary" />
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Actividad Reciente (real)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Evento</th>
                      <th className="px-6 py-4">Origen</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.recentActivity.map((row, i) => (
                      <tr key={`${row.event}-${i}`}>
                        <td className="px-6 py-4 font-bold text-slate-900">{row.event}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.source}</td>
                        <td className="px-6 py-4 text-slate-400">{row.date}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-8">
                <div className="flex items-center gap-3 mb-8">
                  <Zap className="w-6 h-6 text-brand-primary" />
                  <h3 className="font-black uppercase tracking-[0.3em] text-xs">System Health</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span>DB Connectivity</span>
                      <span className="text-brand-primary">OK</span>
                    </div>
                    <div className="h-1 bg-white/10"><div className="h-full bg-brand-primary w-full" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span>API Response Time</span>
                      <span className="text-brand-primary">{data.responseMs}ms</span>
                    </div>
                    <div className="h-1 bg-white/10"><div className="h-full bg-brand-primary" style={{ width: `${Math.max(10, 100 - Math.min(95, data.responseMs / 10))}%` }} /></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-8 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Global Node</h4>
                  <div className="text-xl font-black text-slate-900 tracking-tighter">{String(data.region || 'unknown').toUpperCase()}</div>
                </div>
                <Globe className="w-8 h-8 text-slate-200" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

