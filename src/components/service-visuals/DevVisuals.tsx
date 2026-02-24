// Service 4: Diseño y Desarrollo — Architecture Layers Diagram
import { useState } from 'react'
import { Globe, Server, Database, Bot, Plug } from 'lucide-react'

type Layer = {
    id: string
    name: string
    description: string
    tech: string[]
    icon: React.ElementType
    color: string
}

const layers: Layer[] = [
    {
        id: 'frontend',
        name: 'Interfaz de Usuario',
        description: 'Aplicaciones web y móviles centradas en el usuario. Accesibles, responsivas y siguiendo los principios ISO 9241-110.',
        tech: ['React', 'Next.js', 'Tailwind CSS', 'PWA', 'Figma'],
        icon: Globe,
        color: 'bg-blue-600',
    },
    {
        id: 'logic',
        name: 'Lógica de Negocio',
        description: 'Servicios y APIs que materializan las reglas de negocio validadas en el Mapeo de Procesos. Arquitectura escalable y testeable.',
        tech: ['Node.js', 'Python', 'REST APIs', 'GraphQL', 'Microservicios'],
        icon: Server,
        color: 'bg-slate-700',
    },
    {
        id: 'ai',
        name: 'Capa de IA & Automatización',
        description: 'Modelos de IA responsable integrados para automatizar decisiones, analizar datos y asistir a los usuarios de forma ética.',
        tech: ['OpenAI', 'Gemini', 'LangChain', 'RPA', 'ML Models'],
        icon: Bot,
        color: 'bg-brand-primary',
    },
    {
        id: 'data',
        name: 'Datos & Persistencia',
        description: 'Gestión centralizada de datos con modelos relacionales y documentales. Respaldo, versionado y gobierno de datos.',
        tech: ['PostgreSQL', 'MongoDB', 'Redis', 'Prisma ORM', 'S3'],
        icon: Database,
        color: 'bg-emerald-700',
    },
    {
        id: 'integrations',
        name: 'Integraciones & Ecosistema',
        description: 'Conectores con tus sistemas actuales (ERP, CRM, herramientas SaaS) para garantizar interoperabilidad sin interrupciones.',
        tech: ['Zapier', 'Webhooks', 'OAuth 2.0', 'SAP Connect', 'Salesforce'],
        icon: Plug,
        color: 'bg-amber-600',
    },
]

export function DevVisuals() {
    const [active, setActive] = useState<string>('frontend')
    const activeLayer = layers.find(l => l.id === active)!

    return (
        <div className="space-y-10">
            <div>
                <div className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2">Visualización</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Arquitectura de la Solución</h2>
                <p className="text-slate-500 font-light mb-10 max-w-xl">
                    Construimos soluciones en capas independientes y escalables. Haz clic en cada nivel para explorar
                    las tecnologías y su propósito.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Stack visual */}
                    <div className="space-y-2">
                        {layers.map((layer) => {
                            const Icon = layer.icon
                            const isActive = active === layer.id
                            return (
                                <button
                                    key={layer.id}
                                    onClick={() => setActive(layer.id)}
                                    className={`w-full flex items-center gap-5 p-5 border-2 transition-all text-left ${isActive ? 'border-brand-primary bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className={`w-10 h-10 flex items-center justify-center text-white shrink-0 ${layer.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-black text-sm tracking-tight ${isActive ? 'text-brand-primary' : 'text-slate-900'}`}>
                                            {layer.name}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {layer.tech.slice(0, 3).map(t => (
                                                <span key={t} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500">
                                                    {t}
                                                </span>
                                            ))}
                                            {layer.tech.length > 3 && (
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-400">
                                                    +{layer.tech.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-2 h-full self-stretch ${isActive ? 'bg-brand-primary' : 'bg-transparent'}`} />
                                </button>
                            )
                        })}
                    </div>

                    {/* Detail panel */}
                    <div className="bg-slate-950 p-10 text-white sticky top-8">
                        <div className={`w-14 h-14 flex items-center justify-center text-white mb-8 ${activeLayer.color}`}>
                            <activeLayer.icon className="w-7 h-7" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Capa Seleccionada</div>
                        <h3 className="text-2xl font-black tracking-tighter mb-6">{activeLayer.name}</h3>
                        <p className="text-white/60 font-light leading-relaxed mb-8">{activeLayer.description}</p>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Tecnologías</div>
                            <div className="flex flex-wrap gap-2">
                                {activeLayer.tech.map(t => (
                                    <span key={t} className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
