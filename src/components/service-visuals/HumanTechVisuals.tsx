// Service 3: Decisión Humano vs Tecnología — Interactive Human-Tech Matrix
import { useState } from 'react'
import { User, Cpu, Users, AlertTriangle, ShieldCheck } from 'lucide-react'

type Task = {
    activity: string
    process: string
    mode: 'human' | 'auto' | 'hybrid'
    riskLevel: 'low' | 'medium' | 'high'
    rationale: string
}

const tasks: Task[] = [
    { activity: 'Clasificación de solicitudes entrantes', process: 'Atención al cliente', mode: 'auto', riskLevel: 'low', rationale: 'Volumen alto + criterios definidos → IA con 95% de precisión.' },
    { activity: 'Resolución de quejas complejas', process: 'Atención al cliente', mode: 'human', riskLevel: 'high', rationale: 'Requiere empatía y negociación contextual.' },
    { activity: 'Generación de informes periódicos', process: 'Operaciones', mode: 'auto', riskLevel: 'low', rationale: 'Datos estructurados + repetición → automatizable 100%.' },
    { activity: 'Análisis de contratos legales', process: 'Legal', mode: 'hybrid', riskLevel: 'high', rationale: 'IA extrae cláusulas clave; abogado valida y decide.' },
    { activity: 'Segmentación de clientes', process: 'Marketing', mode: 'hybrid', riskLevel: 'medium', rationale: 'ML propone segmentos; equipo de marketing refina.' },
    { activity: 'Negociación con proveedores', process: 'Compras', mode: 'human', riskLevel: 'medium', rationale: 'Relación estratégica + variables no estructuradas.' },
    { activity: 'Control de calidad en producción', process: 'Operaciones', mode: 'hybrid', riskLevel: 'medium', rationale: 'Visión IA detecta defectos; operario valida casos límite.' },
    { activity: 'Estrategia de innovación', process: 'Dirección', mode: 'human', riskLevel: 'high', rationale: 'Decisión sistémica que requiere liderazgo y creatividad.' },
]

const modeConfig = {
    human: { label: 'Humano', color: 'bg-blue-700 text-white', badge: 'bg-blue-100 text-blue-800', icon: User },
    auto: { label: 'Automatizado', color: 'bg-slate-900 text-white', badge: 'bg-slate-100 text-slate-700', icon: Cpu },
    hybrid: { label: 'Colaboración', color: 'bg-emerald-700 text-white', badge: 'bg-emerald-100 text-emerald-800', icon: Users },
}

const riskConfig = {
    low: { label: 'Riesgo Bajo', color: 'text-green-600' },
    medium: { label: 'Riesgo Medio', color: 'text-amber-600' },
    high: { label: 'Riesgo Alto', color: 'text-red-600' },
}

export function HumanTechVisuals() {
    const [filter, setFilter] = useState<'all' | 'human' | 'auto' | 'hybrid'>('all')
    const [active, setActive] = useState<string | null>(null)

    const visible = filter === 'all' ? tasks : tasks.filter(t => t.mode === filter)
    const counts = {
        human: tasks.filter(t => t.mode === 'human').length,
        auto: tasks.filter(t => t.mode === 'auto').length,
        hybrid: tasks.filter(t => t.mode === 'hybrid').length,
    }

    return (
        <div className="space-y-10">
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">Visualización</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Matriz Humano–Tecnología</h2>
                <p className="text-slate-500 font-light mb-8 max-w-xl">
                    Analizamos cada actividad de tu empresa y determinamos la distribución óptima entre talento humano,
                    automatización e IA responsable. Haz clic en cualquier fila para ver el razonamiento.
                </p>

                {/* Summary pies */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {(Object.keys(modeConfig) as Array<keyof typeof modeConfig>).map(mode => {
                        const cfg = modeConfig[mode]
                        const Icon = cfg.icon
                        return (
                            <button
                                key={mode}
                                onClick={() => setFilter(filter === mode ? 'all' : mode)}
                                className={`flex items-center gap-4 p-5 border-2 transition-all ${filter === mode ? 'border-brand-primary bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                            >
                                <div className={`w-10 h-10 flex items-center justify-center ${cfg.color} shrink-0`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-2xl font-black text-slate-900">{counts[mode]}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cfg.label}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Matrix table */}
                <div className="border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actividad</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Proceso</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Modo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Riesgo IA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((task, i) => {
                                const cfg = modeConfig[task.mode]
                                const risk = riskConfig[task.riskLevel]
                                const isActive = active === task.activity
                                return (
                                    <>
                                        <tr
                                            key={i}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => setActive(isActive ? null : task.activity)}
                                        >
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">{task.activity}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{task.process}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-[11px] font-black hidden lg:table-cell ${risk.color}`}>
                                                {task.riskLevel === 'high' ? <AlertTriangle className="w-4 h-4 inline mr-1" /> : <ShieldCheck className="w-4 h-4 inline mr-1" />}
                                                {risk.label}
                                            </td>
                                        </tr>
                                        {isActive && (
                                            <tr key={`${i}-detail`}>
                                                <td colSpan={4} className="px-6 py-4 bg-slate-900 text-white">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-10 h-10 shrink-0 flex items-center justify-center ${cfg.color}`}>
                                                            <cfg.icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Razonamiento AlgoritmoT</div>
                                                            <div className="text-sm font-light text-white/80">{task.rationale}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <p className="mt-6 text-xs text-slate-400 border-l-2 border-slate-200 pl-4 italic">
                    Basado en los marcos NIST AI RMF e ISO 9241‑210 para IA responsable y diseño centrado en el ser humano.
                </p>
            </div>
        </div>
    )
}
