import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { ChevronLeft, Zap, ArrowRight, Shield } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export function ProductPage() {
    const { slug } = useParams<{ slug: string }>()
    const { translatedState } = useLanguage()
    const product = translatedState.products.find(p => p.slug === slug)

    if (!product) {
        return (
            <Layout>
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-black mb-8">Producto no encontrado</h1>
                    <Link to="/">
                        <Button>Volver al inicio</Button>
                    </Link>
                </div>
            </Layout>
        )
    }

    const Icon = product.icon

    return (
        <Layout>
            <section className="relative py-24 px-6 bg-white infra-grid overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <Link to="/#productos" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary mb-16 group">
                        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Volver a Productos
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <Zap className="w-5 h-5 text-brand-secondary" />
                                    <span className="text-sm font-black uppercase tracking-[0.4em] text-brand-secondary">
                                        Packaged Solution
                                    </span>
                                </div>

                                <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-12 tracking-tighter leading-none">
                                    {product.title}
                                </h1>

                                <div className="text-3xl font-black text-brand-primary mb-12 tracking-tight">
                                    {product.price}
                                </div>

                                <div className="prose prose-xl text-slate-600 font-light max-w-none mb-16 leading-relaxed">
                                    {product.descriptionLong}
                                </div>

                                <div className="p-8 border-l-4 border-slate-900 bg-slate-50 mb-12">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Shield className="w-5 h-5 text-slate-900" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">Garantía AlgoritmoT</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Todos nuestros productos empaquetados incluyen soporte inicial y aseguramiento de calidad técnica bajo estándares Industry 5.0.
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-12 lg:p-20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 dot-pattern opacity-20 w-48 h-48" />

                            <div className="w-24 h-24 bg-brand-primary flex items-center justify-center mb-12">
                                <Icon className="w-10 h-10 text-white" />
                            </div>

                            <h3 className="text-4xl font-black mb-8 tracking-tighter text-slate-900">Ficha de Despliegue</h3>

                            <ul className="space-y-6 mb-16">
                                {[
                                    "Entrega Estándar Garantizada",
                                    "Integración con Ecosistemas Existentes",
                                    "Manual de Operaciones Incluido",
                                    "Soporte Premium Opcional"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center text-sm font-bold uppercase tracking-wider text-slate-600">
                                        <div className="w-2 h-2 bg-brand-secondary mr-4" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <Button size="lg" className="w-full h-20 text-lg">
                                {product.ctaText || 'Solicitar Ahora'}
                                <ArrowRight className="ml-4 w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-32 px-6 bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute inset-0 dot-pattern opacity-5" />
                <div className="max-w-7xl mx-auto relative text-center">
                    <h2 className="text-4xl md:text-6xl font-black mb-12 tracking-tighter">¿Por qué elegir este modelo?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                        {product.variants?.map((v, i) => (
                            <div key={i} className="p-8 border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em] mb-4">{v.tone}</div>
                                <h4 className="text-xl font-bold mb-0 text-white leading-tight">"{v.titular}"</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    )
}
