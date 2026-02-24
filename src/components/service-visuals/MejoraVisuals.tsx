// Service 6: Seguimiento & Mejora Continua — PDCA Cycle + KPI Dashboard
import { useState } from 'react'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'

const kpiData = [
    { month: 'Oct', ciclo: 18, errores: 4.2, satisfaccion: 72 },
    { month: 'Nov', ciclo: 15, errores: 3.1, satisfaccion: 76 },
    { month: 'Dic', ciclo: 13, errores: 2.5, satisfaccion: 80 },
    { month: 'Ene', ciclo: 10, errores: 1.8, satisfaccion: 85 },
    { month: 'Feb', ciclo: 8, errores: 1.1, satisfaccion: 91 },
    { month: 'Mar', ciclo: 7, errores: 0.7, satisfaccion: 94 },
]

const pdcaPhases = [
    {
        id: 'plan',
        label: 'Planificar',
        angle: 315,
        color: '#1d4ed8',
        description: 'Definimos objetivos, KPIs y acciones de mejora basándonos en los datos del periodo anterior.',
    },
    {
        id: 'do',
        label: 'Ejecutar',
        angle: 45,
        color: '#0ea5e9',
        description: 'Implementamos las acciones planificadas en un entorno controlado, documentando cada cambio.',
    },
    {
        id: 'check',
        label: 'Verificar',
        angle: 135,
        color: '#f59e0b',
        description: 'Medimos los resultados reales contra los objetivos, identificando desviaciones y causas.',
    },
    {
        id: 'act',
        label: 'Actuar',
        angle: 225,
        color: '#10b981',
        description: 'Estandarizamos los cambios exitosos y ajustamos el plan para el siguiente ciclo de mejora.',
    },
]

export function MejoraVisuals() {
    const [activePhase, setActivePhase] = useState<string>('plan')
    const [activeKPI, setActiveKPI] = useState<'ciclo' | 'errores' | 'satisfaccion'>('satisfaccion')

    const activeData = pdcaPhases.find(p => p.id === activePhase)!

    const cx = 130
    const cy = 130
    const r = 80

    const kpiLabels = {
        ciclo: { label: 'Tiempo de Ciclo (min)', color: '#1d4ed8' },
        errores: { label: 'Tasa de Error (%)', color: '#ef4444' },
        satisfaccion: { label: 'Satisfacción Usuario (%)', color: '#10b981' },
    }

    return (
        <div className="space-y-12">
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">Visualización</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Ciclo PDCA de Mejora Continua</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    Nuestro servicio de retainer sigue un ciclo iterativo de 4 etapas. Haz clic en cada cuadrante para
                    entender cómo mejoramos continuamente tu solución.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* PDCA SVG Circle */}
                    <div className="flex flex-col items-center">
                        <svg width="260" height="260" viewBox="0 0 260 260">
                            {[0, 1, 2, 3].map((i) => {
                                const start = i * 90 - 90
                                const end = start + 90
                                const toRad = (deg: number) => (deg * Math.PI) / 180
                                const x1 = cx + r * Math.cos(toRad(start))
                                const y1 = cy + r * Math.sin(toRad(start))
                                const x2 = cx + r * Math.cos(toRad(end))
                                const y2 = cy + r * Math.sin(toRad(end))
                                const phase = pdcaPhases[i]
                                const isActive = activePhase === phase.id
                                return (
                                    <g key={i} onClick={() => setActivePhase(phase.id)} className="cursor-pointer">
                                        <path
                                            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                                            fill={phase.color}
                                            opacity={isActive ? 1 : 0.35}
                                            className="transition-all duration-300"
                                        />
                                        {/* Label */}
                                        {(() => {
                                            const midAngle = toRad(start + 45)
                                            const lx = cx + (r * 0.64) * Math.cos(midAngle)
                                            const ly = cy + (r * 0.64) * Math.sin(midAngle)
                                            return (
                                                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="900" className="uppercase tracking-wider pointer-events-none" style={{ letterSpacing: '0.05em' }}>
                                                    {phase.label}
                                                </text>
                                            )
                                        })()}
                                    </g>
                                )
                            })}
                            {/* Center */}
                            <circle cx={cx} cy={cy} r={28} fill="white" />
                            <text x={cx} y={cy - 6} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900">PDCA</text>
                            <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" fontSize="8">Mejora</text>
                            {/* Arrow for cycle direction */}
                            <text x={cx + r + 14} y={cy} textAnchor="middle" fill="#94a3b8" fontSize="18">↻</text>
                        </svg>

                        <div className="mt-6 p-6 bg-slate-900 text-white w-full min-h-[100px]" style={{ borderLeft: `4px solid ${activeData.color}` }}>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: activeData.color }}>
                                {activeData.label}
                            </div>
                            <p className="text-sm text-white/70 font-light leading-relaxed">{activeData.description}</p>
                        </div>
                    </div>

                    {/* KPI Dashboard */}
                    <div>
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900 mb-4">Dashboard de KPIs</h3>
                        <div className="flex gap-2 mb-6">
                            {(Object.keys(kpiLabels) as Array<keyof typeof kpiLabels>).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setActiveKPI(key)}
                                    className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest transition-all border ${activeKPI === key ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    {key === 'ciclo' ? 'Ciclo' : key === 'errores' ? 'Errores' : 'Satisfac.'}
                                </button>
                            ))}
                        </div>
                        <div className="bg-white border border-slate-200 p-6">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                {kpiLabels[activeKPI].label} — 6 meses
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                {activeKPI === 'satisfaccion' ? (
                                    <LineChart data={kpiData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[60, 100]} />
                                        <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                                        <Line type="monotone" dataKey={activeKPI} stroke={kpiLabels[activeKPI].color} strokeWidth={2.5} dot={{ r: 4 }} />
                                    </LineChart>
                                ) : (
                                    <BarChart data={kpiData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 0, fontSize: 12 }} />
                                        <Bar dataKey={activeKPI} fill={kpiLabels[activeKPI].color} maxBarSize={32} radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>

                        {/* Trend summary */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="bg-white border border-slate-200 p-4 text-center">
                                <div className="text-2xl font-black text-green-600">-61%</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Tiempo Ciclo</div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 text-center">
                                <div className="text-2xl font-black text-green-600">-83%</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Tasa de Error</div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 text-center">
                                <div className="text-2xl font-black text-green-600">+22pp</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Satisfacción</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
