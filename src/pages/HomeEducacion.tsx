import { motion } from 'framer-motion'
import { Layout } from '../components/layout/Layout'
import { Link } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'

export function HomeEducacion() {
    return (
        <Layout>
            <section className="min-h-[80vh] flex items-center justify-center px-6">
                <div className="max-w-3xl w-full text-center py-20 bg-slate-50 border border-slate-200 rounded-3xl p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex p-4 bg-emerald-100 rounded-full mb-8 text-emerald-600"
                    >
                        <Construction className="w-12 h-12" />
                    </motion.div>
                    
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-6">
                        PRÓXIMAMENTE
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto">
                        Estamos diseñando una experiencia de transformación digital específica para el sector educativo. Pronto podrás acceder a soluciones de automatización académica y gestión inteligente.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link 
                            to="/"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-slate-800"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            VOLVER AL SELECTOR
                        </Link>
                        <Link 
                            to="/empresas"
                            className="inline-flex items-center gap-2 px-8 py-4 border border-slate-200 bg-white text-slate-900 text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-slate-50"
                        >
                            VER SOLUCIONES EMPRESA
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
