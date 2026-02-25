// Service 2: Mapeo de Procesos — BPMN-style Interactive Process Flow + VSM
import { useState } from 'react'

type Step = {
    id: string
    label: string
    type: 'event' | 'task' | 'gateway' | 'waste'
    responsible: string
    time: string
    value: boolean
}

const asIsSteps: Step[] = [
    { id: '1', label: 'Solicitud de cliente', type: 'event', responsible: 'Cliente', time: '0 min', value: true },
    { id: '2', label: 'Revisión manual de correo', type: 'task', responsible: 'Recepción', time: '45 min', value: false },
    { id: '3', label: '¿Solicitud completa?', type: 'gateway', responsible: 'Coordinador', time: '10 min', value: false },
    { id: '4', label: 'Recolectar datos faltantes', type: 'waste', responsible: 'Ventas', time: '2 horas', value: false },
    { id: '5', label: 'Asignación a asesor', type: 'task', responsible: 'Coordinador', time: '30 min', value: true },
    { id: '6', label: 'Preparación de propuesta', type: 'task', responsible: 'Asesor', time: '3 horas', value: true },
    { id: '7', label: 'Aprobación interna', type: 'gateway', responsible: 'Gerencia', time: '1 día', value: false },
    { id: '8', label: 'Envío al cliente', type: 'event', responsible: 'Asesor', time: '15 min', value: true },
]

const toBe: Step[] = [
    { id: '1', label: 'Solicitud online (formulario)', type: 'event', responsible: 'Cliente', time: '0 min', value: true },
    { id: '2', label: 'Validación automática IA', type: 'task', responsible: 'Sistema', time: '2 min', value: true },
    { id: '3', label: '¿Requiere asesor?', type: 'gateway', responsible: 'IA', time: '1 min', value: true },
    { id: '4', label: 'Generación automática de propuesta', type: 'task', responsible: 'Sistema', time: '5 min', value: true },
    { id: '5', label: 'Revisión y aprobación', type: 'task', responsible: 'Asesor', time: '30 min', value: true },
    { id: '6', label: 'Envío automático', type: 'event', responsible: 'Sistema', time: '1 min', value: true },
]

const shapeClass: Record<string, string> = {
    event: 'w-14 h-14 rounded-full border-2 border-slate-700 bg-white flex items-center justify-center text-xs font-black text-center shrink-0',
    task: 'px-4 py-3 border-2 border-slate-300 bg-white text-sm font-bold text-slate-900 shrink-0 max-w-[140px] text-center',
    gateway: 'w-14 h-14 rotate-45 border-2 border-amber-400 bg-amber-50 shrink-0',
    waste: 'px-4 py-3 border-2 border-red-300 bg-red-50 text-sm font-bold text-red-700 shrink-0 max-w-[140px] text-center',
}

function ProcessDiagram({ steps, config }: { steps: Step[]; config?: any }) {
    const [active, setActive] = useState<string | null>(null)
    const activeStep = steps.find(s => s.id === active)

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto pb-4">
                <div className="flex items-center gap-0 min-w-max">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => setActive(active === step.id ? null : step.id)}
                                className={`focus:outline-none transition-all duration-150 ${active === step.id ? 'scale-110' : 'hover:scale-105'}`}
                                title={step.label}
                            >
                                {step.type === 'gateway' ? (
                                    <div className="relative w-14 h-14">
                                        <div className={`absolute inset-0 rotate-45 border-2 ${active === step.id ? 'border-amber-500 bg-amber-100' : 'border-amber-400 bg-amber-50'}`} />
                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-amber-700">⟡</div>
                                    </div>
                                ) : (
                                    <div className={`${shapeClass[step.type]} ${active === step.id ? '!border-brand-primary !bg-blue-50' : ''}`}>
                                        <span className="text-[11px] leading-tight">{step.label}</span>
                                    </div>
                                )}
                            </button>
                            {i < steps.length - 1 && (
                                <div className="flex items-center mx-1">
                                    <div className={`h-0.5 w-8 ${step.value ? 'bg-brand-primary' : 'bg-red-300'}`} />
                                    <div className={`w-0 h-0 border-l-[6px] ${step.value ? 'border-l-brand-primary' : 'border-l-red-300'} border-y-[4px] border-y-transparent`} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {activeStep && (
                <div className="bg-slate-900 text-white p-6 border-l-4 border-brand-primary">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${activeStep.value ? 'text-green-400' : 'text-red-400'}`}>
                                {activeStep.value ? (config?.valueLabel || '✓ Genera valor') : (config?.wasteLabel || '✗ Desperdicio')}
                            </div>
                            <div className="font-black text-lg tracking-tight">{activeStep.label}</div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{config?.responsibleLabel || 'Responsable'}</div>
                            <div className="font-bold">{activeStep.responsible}</div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{config?.timeLabel || 'Tiempo'}</div>
                            <div className="font-bold text-amber-400">{activeStep.time}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export function ProcessVisuals({ config }: { config?: any }) {
    const cfg = config ?? {}
    const [view, setView] = useState<'as-is' | 'to-be'>('as-is')
    const asIs = Array.isArray(cfg.asIsSteps) ? cfg.asIsSteps : asIsSteps
    const optimized = Array.isArray(cfg.toBeSteps) ? cfg.toBeSteps : toBe
    const vsm = cfg.vsm ?? {}

    return (
        <div className="space-y-12">
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">{cfg.eyebrow || 'Visualización'}</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">{cfg.title || 'Flujo de Proceso BPMN'}</h2>
                <p className="text-slate-500 font-light mb-8 max-w-xl">
                    {cfg.subtitle || 'Haz clic en cada elemento para ver responsables y tiempos. Las flechas rojas indican desperdicio, las azules generan valor.'}
                </p>

                <div className="flex items-center gap-2 mb-8">
                    <button
                        onClick={() => setView('as-is')}
                        className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${view === 'as-is' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {cfg.asIsButtonLabel || 'Estado Actual (As-Is)'}
                    </button>
                    <button
                        onClick={() => setView('to-be')}
                        className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${view === 'to-be' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {cfg.toBeButtonLabel || 'Estado Optimizado (To-Be)'}
                    </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-8">
                    {view === 'as-is' ? <ProcessDiagram steps={asIs} config={cfg} /> : <ProcessDiagram steps={optimized} config={cfg} />}
                </div>

                {/* VSM Summary */}
                <div className="mt-8 grid grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 p-6 text-center">
                        <div className="text-3xl font-black text-red-500 mb-2">{view === 'as-is' ? (vsm.asIsTotalTime || '7h 40m') : (vsm.toBeTotalTime || '39m')}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cfg.totalTimeLabel || 'Tiempo Total'}</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 text-center">
                        <div className="text-3xl font-black text-amber-500 mb-2">{view === 'as-is' ? (vsm.asIsWastePct || '62%') : (vsm.toBeWastePct || '0%')}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cfg.wasteActivitiesLabel || 'Actividades Sin Valor'}</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 text-center">
                        <div className={`text-3xl font-black mb-2 ${view === 'to-be' ? 'text-green-600' : 'text-slate-400'}`}>
                            {view === 'to-be' ? (vsm.timeReductionPct || '91%') : '—'}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cfg.timeReductionLabel || 'Reducción de Tiempo'}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
