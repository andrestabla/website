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

export function ADNVisuals({ config }: { config?: any }) {
    const cfg = config ?? {}
    const radarRows = Array.isArray(cfg.radarData) ? cfg.radarData : radarData
    const mapRows = Array.isArray(cfg.valueMap) ? cfg.valueMap : valueMap
    const theme = cfg.theme ?? {}
    return (
        <div className="space-y-16">
            {/* Radar Chart */}
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">{cfg.eyebrow || 'Visualización'}</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">{cfg.radarTitle || 'Radar de Madurez Digital'}</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    {cfg.radarSubtitle || 'Nuestro diagnóstico genera este radar comparando tu posición actual frente al benchmark del sector. Identifica de inmediato las brechas y prioridades de evolución.'}
                </p>
                <div className="bg-slate-950 p-10 border-b-4 border-brand-primary" style={{ backgroundColor: theme.chartPanelBg || undefined, borderBottomColor: theme.accentColor || undefined }}>
                    <div className="flex items-center gap-8 mb-6">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                            <span className="w-8 h-0.5 bg-brand-primary inline-block" style={{ backgroundColor: theme.accentColor || undefined }} /> {cfg.actualLabel || 'Tu empresa'}
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                            <span className="w-8 h-0.5 bg-white/30 inline-block" /> {cfg.benchmarkLabel || 'Benchmark sector'}
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <RadarChart data={radarRows}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="dimension"
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }}
                            />
                            <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, fontSize: 12 }}
                                labelStyle={{ color: '#fff', fontWeight: 900 }}
                            />
                            <Radar name={cfg.benchmarkLabel || 'Benchmark'} dataKey="benchmark" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" strokeWidth={2} />
                            <Radar name={cfg.actualLabel || 'Tu empresa'} dataKey="actual" stroke={theme.accentColor || '#1d4ed8'} fill={theme.actualFill || 'rgba(29,78,216,0.25)'} strokeWidth={2} dot={{ r: 4, fill: theme.accentColor || '#1d4ed8' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Value Promise Map */}
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">{cfg.valueMapTitle || 'Mapa de Promesa de Valor'}</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    {cfg.valueMapSubtitle || 'Conectamos cada problema real de tu negocio con la solución concreta que entregamos.'}
                </p>
                <div className="space-y-3">
                    {mapRows.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-0 group">
                            <div className={`flex-1 border p-5 ${item.type === 'pain'
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-green-200 bg-green-50 text-green-800'
                                }`}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">
                                    {item.type === 'pain' ? (cfg.painLabel || 'Problema Actual') : (cfg.gainLabel || 'Oportunidad')}
                                </div>
                                <div className="font-bold text-sm">{item.need}</div>
                            </div>
                            <div className="w-12 h-0.5 bg-brand-primary shrink-0 relative" style={{ backgroundColor: theme.accentColor || undefined }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-y-4 border-y-transparent" style={{ borderLeftColor: theme.accentColor || undefined }} />
                            </div>
                            <div className="flex-1 border border-brand-primary/30 bg-blue-50 p-5">
                                <div className="text-[9px] font-black uppercase tracking-widest text-brand-primary mb-1">{cfg.solutionLabel || 'Solución AlgoritmoT'}</div>
                                <div className="font-bold text-sm text-brand-primary" style={{ color: theme.accentColor || undefined }}>{item.solution}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
