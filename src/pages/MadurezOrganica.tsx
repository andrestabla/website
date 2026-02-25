import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { TrendingUp, RefreshCw, Layers, Compass, ArrowRight, CheckCircle2, ChevronLeft, Activity } from 'lucide-react'
import { useTranslatedStatic } from '../hooks/useTranslatedStatic'

const dimensions = [
    {
        icon: Compass,
        title: 'Estrategia Digital Coherente',
        desc: 'Alineamos cada iniciativa tecnológica con los objetivos del negocio. No hay transformación sin dirección clara.',
        level: 'Nivel 1 → 3'
    },
    {
        icon: Layers,
        title: 'Procesos Vivos',
        desc: 'Documentamos, automatizamos y mejoramos los procesos clave. Los procesos deben respirar y adaptarse, no fossilizarse.',
        level: 'Nivel 2 → 4'
    },
    {
        icon: Activity,
        title: 'Datos como Activo',
        desc: 'Construimos la infraestructura de datos que convierte información dispersa en inteligencia de negocio accionable.',
        level: 'Nivel 1 → 4'
    },
    {
        icon: RefreshCw,
        title: 'Capacidad de Cambio Continuo',
        desc: 'Instalamos la mentalidad y las estructuras para que la organización mejore de forma autónoma, sin necesitar siempre un consultor externo.',
        level: 'Nivel 3 → 5'
    },
]

const maturityLevels = [
    { num: 1, label: 'Inicial', desc: 'Procesos ad-hoc, tecnología aislada' },
    { num: 2, label: 'Repetible', desc: 'Prácticas documentadas, dependencia de personas clave' },
    { num: 3, label: 'Definida', desc: 'Procesos estandarizados, gobierno establecido' },
    { num: 4, label: 'Gestionada', desc: 'Métricas en tiempo real, decisiones basadas en datos' },
    { num: 5, label: 'Optimizada', desc: 'Mejora continua autónoma, innovación sistemática' },
]

const outcomes = [
    'Diagnóstico de madurez digital con mapa de brechas',
    'Hoja de ruta priorizada a 12 y 24 meses',
    'Indicadores de madurez monitoreados en tiempo real',
    'Capacidad interna de sostenimiento del modelo',
]

export function MadurezOrganica() {
    const copy = useTranslatedStatic('protocolo-madurez-organica', {
        dimensions: dimensions.map(({ title, desc, level }) => ({ title, desc, level })),
        maturityLevels,
        outcomes,
        back: 'Inicio',
        protocol: 'Protocolo 03',
        heroTitle1: 'Madurez',
        heroTitle2: 'Orgánica',
        heroSubtitle: 'La transformación digital no es un proyecto — es un estado organizacional. Madurez Orgánica es el camino para llegar allí y quedarse.',
        modelEyebrow: 'Modelo de Madurez',
        modelTitle: 'Los 5 niveles de madurez digital',
        modelSubtitle: 'Toda organización se encuentra en uno de estos niveles. Nuestra misión es llevarla al siguiente, y al siguiente, con un camino claro.',
        targetLabel: 'Objetivo →',
        dimensionsEyebrow: '4 Dimensiones de Intervención',
        dimensionsTitle1: 'Dónde',
        dimensionsTitle2: 'actuamos',
        outcomesEyebrow: 'Entregables',
        outcomesTitle: 'Lo que obtienes al final del protocolo',
        durationEyebrow: 'Duración típica del protocolo',
        monthsLabel: 'meses',
        durationBlurb: 'Según la complejidad organizacional y el delta de madurez actual. Con revisiones de estado cada 30 días.',
        ctaTitle: 'Empieza con un diagnóstico',
        ctaSubtitle: '45 minutos que definen tu hoja de ruta digital para los próximos 24 meses.',
        ctaPrimary: 'Agendar diagnóstico',
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

                <div className="absolute right-12 bottom-12 hidden lg:block">
                    <TrendingUp className="w-48 h-48 text-white/5" />
                </div>
            </section>

            {/* Maturity model */}
            <section className="py-32 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-12 h-1 bg-brand-primary" />
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.modelEyebrow}</span>
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8">{copy.modelTitle}</h2>
                        <p className="text-xl text-slate-500 font-light max-w-2xl">{copy.modelSubtitle}</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-0 border border-slate-200">
                        {maturityLevels.map((level, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex-1 p-10 border-r border-slate-200 last:border-r-0 relative ${i >= 3 ? 'bg-brand-primary' : 'bg-white hover:bg-slate-50'} transition-colors`}
                            >
                                <div className={`text-5xl font-black mb-4 ${i >= 3 ? 'text-white/20' : 'text-slate-100'}`}>{level.num}</div>
                                <div className={`text-sm font-black uppercase tracking-widest mb-3 ${i >= 3 ? 'text-white' : 'text-slate-900'}`}>{copy.maturityLevels[i]?.label ?? level.label}</div>
                                <div className={`text-xs font-light leading-relaxed ${i >= 3 ? 'text-white/60' : 'text-slate-400'}`}>{copy.maturityLevels[i]?.desc ?? level.desc}</div>
                                {i >= 3 && (
                                    <div className="absolute top-4 right-4">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/30">{copy.targetLabel}</div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dimensions */}
            <section className="py-32 px-6 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-24">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-12 h-1 bg-brand-primary" />
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.dimensionsEyebrow}</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                            {copy.dimensionsTitle1}<br />{copy.dimensionsTitle2}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-slate-200">
                        {dimensions.map((d, i) => {
                            const Icon = d.icon
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group border-r border-b border-slate-200 p-12 bg-white hover:bg-slate-50 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-10">
                                        <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
                                            <Icon className="w-8 h-8 stroke-[1.5]" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-brand-secondary border border-brand-secondary/30 px-3 py-1">{copy.dimensions[i]?.level ?? d.level}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{copy.dimensions[i]?.title ?? d.title}</h3>
                                    <p className="text-slate-500 font-light leading-relaxed">{copy.dimensions[i]?.desc ?? d.desc}</p>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Outcomes */}
            <section className="py-32 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div>
                            <div className="flex items-center gap-4 mb-8">
                                <span className="w-12 h-1 bg-brand-primary" />
                                <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.outcomesEyebrow}</span>
                            </div>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8">{copy.outcomesTitle}</h2>
                            <div className="space-y-6">
                                {copy.outcomes.map((o, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <CheckCircle2 className="w-6 h-6 text-brand-secondary shrink-0 mt-0.5" />
                                        <p className="text-xl text-slate-600 font-light">{o}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-brand-primary p-16 text-white relative overflow-hidden">
                            <div className="absolute -bottom-12 -right-12 text-[12rem] font-black text-white/5 leading-none">5</div>
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-6">{copy.durationEyebrow}</div>
                                <div className="text-7xl font-black mb-4">6–12<br /><span className="text-4xl">{copy.monthsLabel}</span></div>
                                <p className="text-white/50 font-light leading-relaxed">
                                    {copy.durationBlurb}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 px-6 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{copy.ctaTitle}</h2>
                        <p className="text-xl text-slate-400 font-light">{copy.ctaSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <Link to="/#contacto" className="flex items-center gap-2 px-10 py-5 bg-brand-primary text-white font-black text-xs uppercase tracking-widest hover:bg-brand-secondary transition-colors">
                            {copy.ctaPrimary}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
