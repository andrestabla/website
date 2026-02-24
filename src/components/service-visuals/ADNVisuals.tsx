// Service 1: Captura del ADN — Digital Maturity Radar + Value Promise Map
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts'

const radarData = [
    { dimension: 'Estrategia', actual: 3, benchmark: 7 },
    { dimension: 'Cultura', actual: 4, benchmark: 8 },
    { dimension: 'Procesos', actual: 2, benchmark: 8 },
    { dimension: 'Tecnología', actual: 5, benchmark: 9 },
    { dimension: 'Datos', actual: 2, benchmark: 7 },
    { dimension: 'Talento', actual: 4, benchmark: 8 },
]

const valueMap = [
    { need: 'Incertidumbre sobre qué digitalizar', solution: 'Roadmap priorizado de iniciativas', type: 'pain' },
    { need: 'Inversión sin retorno claro', solution: 'Business Model Canvas validado', type: 'pain' },
    { need: 'Decisiones sin datos', solution: 'Diagnóstico MD-IA con benchmark', type: 'pain' },
    { need: 'Crecimiento escalable', solution: 'Propuesta de valor diferenciada', type: 'gain' },
    { need: 'Alineación del equipo', solution: 'Value Proposition Canvas co-creado', type: 'gain' },
]

export function ADNVisuals() {
    return (
        <div className="space-y-16">
            {/* Radar Chart */}
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">Visualización</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Radar de Madurez Digital</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    Nuestro diagnóstico genera este radar comparando tu posición actual frente al benchmark del sector.
                    Identifica de inmediato las brechas y prioridades de evolución.
                </p>
                <div className="bg-slate-950 p-10 border-b-4 border-brand-primary">
                    <div className="flex items-center gap-8 mb-6">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                            <span className="w-8 h-0.5 bg-brand-primary inline-block" /> Tu empresa
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                            <span className="w-8 h-0.5 bg-white/30 inline-block" /> Benchmark sector
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="dimension"
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }}
                            />
                            <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, fontSize: 12 }}
                                labelStyle={{ color: '#fff', fontWeight: 900 }}
                            />
                            <Radar name="Benchmark" dataKey="benchmark" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" strokeWidth={2} />
                            <Radar name="Tu empresa" dataKey="actual" stroke="#1d4ed8" fill="rgba(29,78,216,0.25)" strokeWidth={2} dot={{ r: 4, fill: '#1d4ed8' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Value Promise Map */}
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Mapa de Promesa de Valor</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    Conectamos cada problema real de tu negocio con la solución concreta que entregamos.
                </p>
                <div className="space-y-3">
                    {valueMap.map((item, i) => (
                        <div key={i} className="flex items-center gap-0 group">
                            <div className={`flex-1 border p-5 ${item.type === 'pain'
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-green-200 bg-green-50 text-green-800'
                                }`}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">
                                    {item.type === 'pain' ? 'Problema Actual' : 'Oportunidad'}
                                </div>
                                <div className="font-bold text-sm">{item.need}</div>
                            </div>
                            <div className="w-12 h-0.5 bg-brand-primary shrink-0 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-brand-primary border-y-4 border-y-transparent" />
                            </div>
                            <div className="flex-1 border border-brand-primary/30 bg-blue-50 p-5">
                                <div className="text-[9px] font-black uppercase tracking-widest text-brand-primary mb-1">Solución AlgoritmoT</div>
                                <div className="font-bold text-sm text-brand-primary">{item.solution}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
