import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Users, Brain, Lightbulb, Network, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react'
import { useTranslatedStatic } from '../hooks/useTranslatedStatic'

const pillars = [
    {
        icon: Brain,
        title: 'Arquitectura Cognitiva',
        desc: 'Diseñamos flujos de trabajo que respetan los límites cognitivos del equipo. Menos fricción, mayor adopción.'
    },
    {
        icon: Lightbulb,
        title: 'Diseño de Hábitos Digitales',
        desc: 'Transformamos herramientas en rutinas. Cada sistema se integra en el día a día sin resistencia cultural.'
    },
    {
        icon: Network,
        title: 'Redes de Confianza Interna',
        desc: 'Identificamos los nodos de influencia en tu organización para acelerar la adopción de nuevos modelos.'
    },
    {
        icon: Users,
        title: 'Liderazgo Habilitador',
        desc: 'Formamos a los líderes para que sean amplificadores de cambio, no cuellos de botella tecnológicos.'
    },
]

const outcomes = [
    'Reducción del 60% en resistencia al cambio organizacional',
    'Adopción digital efectiva en menos de 90 días',
    'Equipos autónomos capaces de escalar sin dependencias',
    'Cultura de mejora continua instalada y sostenible',
]

export function IngenieriaHumana() {
    const copy = useTranslatedStatic('protocolo-ingenieria-humana', {
        pillars: pillars.map(({ title, desc }) => ({ title, desc })),
        outcomes,
        back: 'Inicio',
        protocol: 'Protocolo 01',
        heroTitle1: 'Ingeniería',
        heroTitle2: 'Humana',
        heroSubtitle: 'El factor limitante de la transformación digital no es la tecnología. Es la capacidad humana de adoptarla, adaptarla y mantenerla viva.',
        defEyebrow: 'Definición del Protocolo',
        defTitle: 'La ciencia de hacer que los sistemas humanos funcionen.',
        defP1: 'Ingeniería Humana es nuestra metodología para diseñar, implementar y sostener el cambio organizacional. Analizamos la organización como un sistema complejo donde las personas, los procesos y la tecnología deben alinearse con precisión quirúrgica.',
        defP2: 'No trabajamos sobre las herramientas — trabajamos sobre las personas que las usarán. Porque un ERP sin adopción es un gasto, no una inversión.',
        pillarsEyebrow: 'Los 4 Pilares',
        pillarsTitle: 'Metodología de intervención',
        ctaTitle: '¿Listo para activar a tu equipo?',
        ctaSubtitle: 'Diagnóstico de madurez organizacional sin costo.',
        ctaPrimary: 'Iniciar protocolo',
        ctaSecondary: 'Ver servicios',
    })
    return (
        <Layout>
            {/* Hero */}
            <section className="relative min-h-[70vh] flex flex-col justify-center pt-32 pb-24 px-6 bg-slate-950 overflow-hidden">
                {/* Grid pattern */}
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

                {/* Decorative stat */}
                <div className="absolute right-12 bottom-12 hidden lg:block text-right">
                    <div className="text-[8rem] font-black text-white/5 leading-none">IH</div>
                </div>
            </section>

            {/* What it is */}
            <section className="py-32 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div>
                            <div className="flex items-center gap-4 mb-8">
                                <span className="w-12 h-1 bg-brand-primary" />
                                <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.defEyebrow}</span>
                            </div>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8 leading-tight">
                                {copy.defTitle}
                            </h2>
                            <p className="text-xl text-slate-500 font-light leading-relaxed mb-8">
                                {copy.defP1}
                            </p>
                            <p className="text-xl text-slate-500 font-light leading-relaxed">
                                {copy.defP2}
                            </p>
                        </div>
                        <div className="bg-slate-950 p-16 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10" />
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

            {/* Pillars */}
            <section className="py-32 px-6 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-24">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="w-12 h-1 bg-brand-primary" />
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary">{copy.pillarsEyebrow}</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                            {copy.pillarsTitle}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-slate-200">
                        {pillars.map((p, i) => {
                            const Icon = p.icon
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group border-r border-b border-slate-200 p-12 bg-white hover:bg-slate-50 transition-all"
                                >
                                    <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all mb-10">
                                        <Icon className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{copy.pillars[i]?.title ?? p.title}</h3>
                                    <p className="text-slate-500 font-light leading-relaxed">{copy.pillars[i]?.desc ?? p.desc}</p>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 px-6 bg-white">
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
                        <Link to="/#servicios" className="flex items-center gap-2 px-8 py-5 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:border-brand-primary hover:text-brand-primary transition-colors">
                            {copy.ctaSecondary}
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
