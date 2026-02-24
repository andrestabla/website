import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { servicesDetail } from '../data/details'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { ContactForm } from '../components/forms/ContactForm'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'

export function ServicePage() {
    const { slug } = useParams<{ slug: string }>()
    const service = servicesDetail.find(s => s.slug === slug)

    if (!service) {
        return (
            <Layout>
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-black mb-8">Servicio no encontrado</h1>
                    <Link to="/">
                        <Button>Volver al inicio</Button>
                    </Link>
                </div>
            </Layout>
        )
    }

    const Icon = service.icon

    return (
        <Layout>
            <section className="relative py-24 px-6 bg-white infra-grid overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <Link to="/#servicios" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary mb-16 group">
                        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Volver a Servicios
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-start">
                        <div className="lg:col-span-7">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <span className="w-12 h-1 bg-brand-primary" />
                                    <span className="text-sm font-black uppercase tracking-[0.4em] text-brand-primary">
                                        {service.highlight}
                                    </span>
                                </div>

                                <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-12 tracking-tighter leading-none">
                                    {service.title}
                                </h1>

                                <p className="text-2xl md:text-3xl text-slate-500 font-light mb-16 leading-tight border-l-4 border-slate-100 pl-10">
                                    {service.subtitle}
                                </p>

                                <div className="prose prose-xl text-slate-600 font-light max-w-none mb-20 leading-relaxed">
                                    {service.descriptionLong}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                                    {service.features.map((feature, i) => (
                                        <div key={i} className="flex items-start p-6 bg-slate-50 border border-slate-100">
                                            <CheckCircle2 className="w-6 h-6 text-brand-secondary mr-4 shrink-0 mt-1" />
                                            <span className="text-lg font-bold text-slate-900 tracking-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        <div className="lg:col-span-5 sticky top-32">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-slate-900 p-12 lg:p-16 text-white border-b-8 border-brand-secondary shadow-2xl"
                            >
                                <div className="w-20 h-20 bg-white/10 flex items-center justify-center mb-12">
                                    <Icon className="w-10 h-10 text-white" />
                                </div>

                                <h3 className="text-3xl font-black mb-10 tracking-tighter">¿Listo para el siguiente paso?</h3>

                                <ContactForm serviceSlug={service.slug} context="service" />

                                <div className="mt-12 pt-12 border-t border-white/10">
                                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">Metodología Aplicada</div>
                                    <div className="text-sm font-bold text-white/50 italic italic">
                                        Basado en estándares ISO 9241 y marcos de trabajo NIST AI RMF.
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Copy Variants / A/B Section (Visualizing the user's intent) */}
            <section className="py-32 px-6 bg-slate-50 border-t border-slate-200 dot-pattern">
                <div className="max-w-7xl mx-auto">
                    <div className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-16 text-center">
                        Enfoques de Comunicación Estratégica
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {service.variants?.map((v, i) => (
                            <div key={i} className="bg-white p-10 border border-slate-200">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">{v.tone}</div>
                                <h4 className="text-xl font-bold mb-4 text-slate-900 leading-tight">"{v.titular}"</h4>
                                {'rationale' in v && <p className="text-sm text-slate-500 font-light">{v.rationale}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    )
}
