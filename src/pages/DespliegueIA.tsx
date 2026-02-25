import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Bot, Zap, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft, Cpu, GitBranch } from 'lucide-react'
import { useTranslatedStatic } from '../hooks/useTranslatedStatic'

const phases = [
    {
        num: '01',
        icon: Cpu,
        title: 'Evaluación de Readiness',
        desc: 'Auditamos tu infraestructura de datos, procesos y cultura para determinar el nivel de preparación real antes de desplegar cualquier modelo de IA.'
    },
    {
        num: '02',
        icon: GitBranch,
        title: 'Arquitectura de Solución',
        desc: 'Diseñamos la arquitectura técnica y operativa: qué modelos usar, cómo conectarlos con tus sistemas actuales y cómo gobernarlos.'
    },
    {
        num: '03',
        icon: Zap,
        title: 'Despliegue Controlado',
        desc: 'Implementamos en fases con pilotos medibles. Cada etapa tiene métricas de éxito claras y criterios de escalabilidad definidos.'
    },
    {
        num: '04',
        icon: ShieldCheck,
        title: 'Gobierno y Sostenibilidad',
        desc: 'Instalamos las políticas, controles y capacidades internas para que la IA sea un activo sostenible, no una caja negra dependiente.'
    },
]

const outcomes = [
    'Modelos de IA en producción en < 120 días',
    'ROI medible desde la primera fase',
    'Equipos internos capacitados para operar la IA',
    'Marco de gobernanza alineado con NIST AI RMF e ISO 42001',
]

export function DespliegueIA() {
    const copy = useTranslatedStatic('protocolo-despliegue-ia', {
        phases: phases.map(({ num, title, desc }) => ({ num, title, desc })),
        outcomes,
        back: 'Inicio',
        protocol: 'Protocolo 02',
        heroTitle1: 'Despliegue',
        heroTitle2: 'IA',
        heroSubtitle: 'La inteligencia artificial no se implementa — se despliega con estrategia, gobernanza y una hoja de ruta que convierte el potencial en valor real y medible.',
        problemEyebrow: 'El Problema Real',
        problemTitle: 'El 87% de los proyectos de IA no llegan a producción.',
        problemP1: 'No por falta de tecnología — sino por ausencia de estrategia, datos de pobre calidad y organizaciones no preparadas para operar modelos en producción.',
        problemP2: 'Nuestro protocolo de Despliegue IA cierra esa brecha: desde la evaluación técnica hasta la operación continua, con gobernanza incluida desde el día uno.',
        expectedResults: 'Resultados Esperados',
        phasesEyebrow: 'Las 4 Fases',
        phasesTitleLine1: 'De la promesa',
        phasesTitleLine2: 'a la producción',
        frameworksEyebrow: 'Marcos de Referencia',
        ctaTitle: '¿Cuál es tu nivel de madurez en IA?',
        ctaSubtitle: 'Evaluación técnica gratuita: 45 minutos, resultados inmediatos.',
        ctaPrimary: 'Solicitar evaluación',
    })
    return (
        <Layout>
            {/* Hero */}
            <section className="relative min-h-[70vh] flex flex-col justify-center pt-32 pb-24 px-6 bg-slate-950 overflow-hidden">
                <div className="absolute inset-0" style={{
                    backgroundSize: '60px 60px',
                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                }} />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary opacity-60" />

                <div className="max-w-7xl mx-auto w-full relative z-10">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                        <Link to="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-xs font-black uppercase tracking-widest mb-12 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                            {copy.back}
                        </Link>
                        <div className="flex items-center gap-4 mb-8">
                            <span className="w-12 h-px bg-brand-secondary" />
                            <span className="text-brand-secondary text-xs font-black uppercase tracking-[0.5em]">{copy.protocol}</span>
                        </div>
                        <h1 className="text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.85] text-white mb-12">
                            {copy.heroTitle1}<br />
                            <span className="text-brand-secondary">{copy.heroTitle2}</span>
                        </h1>
                        <p className="text-2xl text-white/50 font-light max-w-2xl leading-relaxed border-l-4 border-brand-primary pl-10">
                            {copy.heroSubtitle}
                        </p>
                    </motion.div>
                </div>

                <div className="absolute right-12 bottom-12 hidden lg:block text-right">
                    <Bot className="w-48 h-48 text-white/5" />
                </div>
            </section>

            {/* Context */}
            <section className="py-32 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div>
                            <div className="flex items-center gap-4 mb-8">
                                <span className="w-12 h-1 bg-brand-primary" />
                                <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.problemEyebrow}</span>
                            </div>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8 leading-tight">
                                {copy.problemTitle}
                            </h2>
                            <p className="text-xl text-slate-500 font-light leading-relaxed mb-8">
                                {copy.problemP1}
                            </p>
                            <p className="text-xl text-slate-500 font-light leading-relaxed">
                                {copy.problemP2}
                            </p>
                        </div>
                        <div className="bg-slate-950 p-16 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10" />
                            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-8">{copy.expectedResults}</div>
                            <div className="space-y-8 relative z-10">
                                {copy.outcomes.map((o, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <CheckCircle2 className="w-6 h-6 text-brand-secondary shrink-0 mt-0.5" />
                                        <p className="text-white/70 font-light leading-relaxed">{o}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Phases */}
            <section className="py-32 px-6 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-24">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-12 h-1 bg-brand-primary" />
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.phasesEyebrow}</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                            {copy.phasesTitleLine1}<br />{copy.phasesTitleLine2}
                        </h2>
                    </div>
                    <div className="space-y-0 border-t border-slate-200">
                        {phases.map((phase, i) => {
                            const Icon = phase.icon
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-12 border-b border-slate-200 py-12 group hover:bg-white px-6 -mx-6 transition-all"
                                >
                                    <div className="text-6xl font-black text-slate-100 group-hover:text-brand-primary/20 transition-colors shrink-0 w-24 text-right">{copy.phases[i]?.num ?? phase.num}</div>
                                    <div className="w-14 h-14 bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all shrink-0">
                                        <Icon className="w-7 h-7 stroke-[1.5]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{copy.phases[i]?.title ?? phase.title}</h3>
                                        <p className="text-slate-500 font-light leading-relaxed max-w-2xl">{copy.phases[i]?.desc ?? phase.desc}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Frameworks */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-12">
                        <span className="w-12 h-1 bg-brand-primary" />
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.frameworksEyebrow}</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {['NIST AI RMF', 'ISO 42001', 'EU AI Act', 'MLOps Maturity', 'LLMOps', 'Vector DB Architecture'].map(f => (
                            <div key={f} className="px-6 py-3 border border-slate-200 text-sm font-black text-slate-600 uppercase tracking-widest">
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 px-6 bg-slate-950">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div>
                        <h2 className="text-5xl font-black text-white tracking-tighter mb-4">{copy.ctaTitle}</h2>
                        <p className="text-xl text-white/40 font-light">{copy.ctaSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <Link to="/#contacto" className="flex items-center gap-2 px-10 py-5 bg-brand-secondary text-white font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-colors">
                            {copy.ctaPrimary}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
