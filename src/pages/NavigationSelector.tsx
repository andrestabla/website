import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Building2, GraduationCap } from 'lucide-react'

export function NavigationSelector() {
    return (
        <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-slate-900">
            {/* Corporate Section */}
            <Link 
                to="/empresas"
                className="group relative flex-1 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10"
            >
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: 'url("/assets/landing/corporate.png")' }}
                />
                <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply transition-colors group-hover:bg-blue-800/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-transparent to-transparent opacity-80" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative h-full flex flex-col items-center justify-center text-center px-8"
                >
                    <div className="mb-6 p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 group-hover:scale-110 transition-transform">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-4 font-display">
                        SOLUCIONES <span className="block lg:inline">PARA EMPRESA</span>
                    </h2>
                    <p className="text-blue-100/70 text-lg max-w-md mx-auto mb-8 font-medium">
                        Optimización operativa, automatización de procesos y despliegue estratégico de IA.
                    </p>
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 text-xs font-black uppercase tracking-[0.3em] transition-all group-hover:bg-blue-50 group-hover:px-10">
                        INGRESAR
                    </div>
                </motion.div>
            </Link>

            {/* Educational Section */}
            <Link 
                to="/educacion"
                className="group relative flex-1 overflow-hidden"
            >
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: 'url("/assets/landing/education.png")' }}
                />
                <div className="absolute inset-0 bg-emerald-950/40 mix-blend-multiply transition-colors group-hover:bg-emerald-800/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent opacity-80" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative h-full flex flex-col items-center justify-center text-center px-8"
                >
                    <div className="mb-6 p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-4 font-display">
                        SOLUCIONES <span className="block lg:inline">EDUCATIVAS</span>
                    </h2>
                    <p className="text-emerald-50/70 text-lg max-w-md mx-auto mb-8 font-medium">
                        Transformación digital para instituciones, colegios y centros de formación técnica.
                    </p>
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-900 text-xs font-black uppercase tracking-[0.3em] transition-all group-hover:bg-emerald-50 group-hover:px-10">
                        INGRESAR
                    </div>
                </motion.div>
            </Link>

            {/* Logo Overlay */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="text-2xl font-black tracking-tighter text-white">
                    ALGORITMOT
                </div>
            </div>
        </div>
    )
}
