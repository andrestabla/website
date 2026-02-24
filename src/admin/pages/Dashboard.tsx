import {
    Users,
    MousePointer2,
    Clock,
    TrendingUp,
    Activity,
    Zap,
    Globe
} from 'lucide-react'

export function Dashboard() {
    const stats = [
        { name: 'Leads Recibidos', value: '42', change: '+12%', icon: Users },
        { name: 'Clicks en CTAs', value: '891', change: '+24%', icon: MousePointer2 },
        { name: 'Tiempo Promedio', value: '2m 14s', change: '-4%', icon: Clock },
        { name: 'Tasa Conversión', value: '4.8%', change: '+0.4%', icon: TrendingUp },
    ]

    return (
        <div className="space-y-12">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Monitor Sistema</h1>
                <p className="text-slate-500 font-light">Resumen ejecutivo del estado de la plataforma digital.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-brand-primary">
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${stat.change.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.name}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-brand-primary" />
                            <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Actividad Reciente</h3>
                        </div>
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
                                {[
                                    { event: 'Nuevo Lead: Captura ADN', source: '/servicios/captura-adn', date: 'Hace 5 min', status: 'Pending' },
                                    { event: 'Sincronización MD-IA', source: 'System Core', date: 'Hace 12 min', status: 'Success' },
                                    { event: 'Click: CTA Humano', source: '/productos/diagnostico-md-ia', date: 'Hace 24 min', status: 'Active' },
                                    { event: 'Actualización SiteConfig', source: 'Admin (Andres)', date: 'Hace 1h', status: 'Saved' },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
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

                {/* System Health */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <Zap className="w-6 h-6 text-brand-primary" />
                            <h3 className="font-black uppercase tracking-[0.3em] text-xs">System Health</h3>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                    <span>Datacenter Sync</span>
                                    <span className="text-brand-primary">98%</span>
                                </div>
                                <div className="h-1 bg-white/10">
                                    <div className="h-full bg-brand-primary w-[98%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                    <span>API Response Time</span>
                                    <span className="text-brand-primary">42ms</span>
                                </div>
                                <div className="h-1 bg-white/10">
                                    <div className="h-full bg-brand-primary w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Global Node</h4>
                            <div className="text-xl font-black text-slate-900 tracking-tighter">US-EAST-1</div>
                        </div>
                        <Globe className="w-8 h-8 text-slate-200" />
                    </div>
                </div>
            </div>
        </div>
    )
}
