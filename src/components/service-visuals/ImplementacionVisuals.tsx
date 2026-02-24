// Service 5: Implementación — Milestone Timeline + Cutover Plan
import { useState } from 'react'
import { Settings, Database, GraduationCap, CheckCircle2, Rocket, ShieldCheck } from 'lucide-react'

type Milestone = {
    phase: string
    week: string
    icon: React.ElementType
    color: string
    title: string
    tasks: string[]
}

const milestones: Milestone[] = [
    {
        phase: 'Fase 1',
        week: 'Semanas 1–2',
        icon: Settings,
        color: 'bg-slate-700',
        title: 'Configuración & Setup',
        tasks: ['Provisión de infraestructura cloud', 'Configuración de entornos (dev/staging/prod)', 'Integración con sistemas existentes', 'Revisión de parámetros de seguridad'],
    },
    {
        phase: 'Fase 2',
        week: 'Semanas 3–4',
        icon: Database,
        color: 'bg-amber-600',
        title: 'Migración de Datos',
        tasks: ['Auditoría y limpieza de datos heredados', 'Mapeo de entidades a nueva estructura', 'Migración incremental con validación', 'Reconciliación y verificación de integridad'],
    },
    {
        phase: 'Fase 3',
        week: 'Semanas 5–6',
        icon: GraduationCap,
        color: 'bg-blue-600',
        title: 'Capacitación',
        tasks: ['Módulos de formación por rol', 'Talleres prácticos en sandbox', 'Material de referencia rápida', 'Certificación básica de usuarios clave'],
    },
    {
        phase: 'Fase 4',
        week: 'Semanas 7–8',
        icon: CheckCircle2,
        color: 'bg-emerald-600',
        title: 'Pruebas & UAT',
        tasks: ['Pruebas de aceptación de usuarios (UAT)', 'Pruebas de carga y rendimiento', 'Corrección de incidencias', 'Aprobación formal de usuarios clave'],
    },
    {
        phase: 'Fase 5',
        week: 'Semana 9',
        icon: Rocket,
        color: 'bg-brand-primary',
        title: 'Go-Live',
        tasks: ['Cutover a producción (ventana nocturna)', 'Monitoreo intensivo primeras 48h', 'Equipo de soporte en sitio', 'Comunicación a usuarios finales'],
    },
    {
        phase: 'Fase 6',
        week: 'Semanas 10–12',
        icon: ShieldCheck,
        color: 'bg-purple-700',
        title: 'Estabilización',
        tasks: ['Soporte post-lanzamiento prioritario', 'Ajustes de rendimiento', 'Documentación definitiva', 'Transición a retainer de mejora'],
    },
]

export function ImplementacionVisuals() {
    const [active, setActive] = useState<number>(0)

    return (
        <div className="space-y-10">
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">Visualización</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Cronograma de Implementación</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    Un plan de 12 semanas, fase a fase, que garantiza un despliegue sin interrupciones en producción.
                    Haz clic en cada fase para ver el detalle de actividades.
                </p>

                {/* Timeline */}
                <div className="relative">
                    {/* Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 hidden md:block" />

                    <div className="space-y-4">
                        {milestones.map((m, i) => {
                            const Icon = m.icon
                            const isActive = active === i
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActive(i)}
                                    className={`relative w-full flex items-start gap-6 p-6 border-2 text-left transition-all ${isActive ? 'border-brand-primary bg-blue-50 md:ml-8' : 'border-slate-100 bg-white hover:border-slate-200 md:ml-8'
                                        }`}
                                >
                                    {/* Node on line */}
                                    <div className={`absolute -left-14 top-6 w-12 h-12 flex items-center justify-center text-white transition-all ${m.color} hidden md:flex ${isActive ? 'scale-110 shadow-lg' : ''}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Mobile icon */}
                                    <div className={`w-10 h-10 flex items-center justify-center text-white shrink-0 md:hidden ${m.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-3">{m.phase}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">{m.week}</span>
                                            </div>
                                        </div>
                                        <div className={`font-black text-lg tracking-tight mb-3 ${isActive ? 'text-brand-primary' : 'text-slate-900'}`}>{m.title}</div>

                                        {isActive && (
                                            <ul className="space-y-2 mt-4">
                                                {m.tasks.map((task, j) => (
                                                    <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                                                        <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                                                        {task}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
