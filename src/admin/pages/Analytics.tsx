import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Users, MousePointer2, Target, Activity } from 'lucide-react'

const trafficData = [
    { month: 'Sep', visitas: 820, leads: 12 },
    { month: 'Oct', visitas: 1100, leads: 19 },
    { month: 'Nov', visitas: 980, leads: 15 },
    { month: 'Dic', visitas: 1340, leads: 27 },
    { month: 'Ene', visitas: 1580, leads: 31 },
    { month: 'Feb', visitas: 2040, leads: 42 },
]

const pageData = [
    { page: '/servicios/captura-adn', views: 640, conversion: 8.1 },
    { page: '/servicios/mapeo-procesos', views: 490, conversion: 5.4 },
    { page: '/productos/diagnostico-md-ia', views: 380, conversion: 9.7 },
    { page: '/servicios/implementacion', views: 310, conversion: 4.2 },
    { page: '/productos/prototipo', views: 280, conversion: 7.1 },
]

const sourceData = [
    { name: 'Orgánico', value: 48 },
    { name: 'Directo', value: 25 },
    { name: 'LinkedIn', value: 18 },
    { name: 'Referidos', value: 9 },
]

const COLORS = ['#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe']

const kpis = [
    { label: 'Visitas (Feb)', value: '2,040', change: '+29%', icon: Users },
    { label: 'Leads Generados', value: '42', change: '+35%', icon: Target },
    { label: 'Tasa Conversión', value: '4.8%', change: '+0.4 pp', icon: MousePointer2 },
    { label: 'Páginas / Sesión', value: '3.2', change: '+0.6', icon: Activity },
]

export function Analytics() {
    return (
        <div className="space-y-12">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Analítica</h1>
                <p className="text-slate-500 font-light">Rendimiento de la plataforma digital AlgoritmoT — últimos 6 meses.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-white border border-slate-200 p-8 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-10 h-10 bg-blue-50 text-brand-primary flex items-center justify-center">
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1">
                                {kpi.change}
                            </span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{kpi.value}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Traffic Trend */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <TrendingUp className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Evolución de Tráfico & Leads</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={trafficData}>
                            <defs>
                                <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12, fontWeight: 700 }}
                                labelStyle={{ color: '#1e293b', fontWeight: 900 }}
                            />
                            <Area type="monotone" dataKey="visitas" stroke="#1d4ed8" strokeWidth={2} fill="url(#colorVisitas)" name="Visitas" />
                            <Area type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={2} fill="url(#colorLeads)" name="Leads" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Traffic Sources Pie */}
                <div className="bg-white border border-slate-200 p-8">
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-8">Fuentes de Tráfico</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={sourceData} cx="50%" cy="50%" innerRadius={56} outerRadius={85} paddingAngle={3} dataKey="value">
                                {sourceData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend
                                formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{value}</span>}
                            />
                            <Tooltip formatter={(value) => [`${value}%`, '']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Pages */}
            <div className="bg-white border border-slate-200">
                <div className="p-8 border-b border-slate-100">
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Páginas con Mayor Rendimiento</h3>
                </div>
                <div className="p-8">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={pageData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="page" type="category" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={200} />
                            <Tooltip
                                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12, fontWeight: 700 }}
                            />
                            <Bar dataKey="views" name="Visitas" fill="#1d4ed8" radius={[0, 2, 2, 0]} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
