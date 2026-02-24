import { motion } from 'framer-motion'
import { siteConfig } from '../../data/config'
import { Button } from '../../components/ui/Button'
import { Mail, MapPin, Linkedin, ArrowRight } from 'lucide-react'

export function Contact() {
    return (
        <section className="section-padding bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
                <div>
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-8">
                        Contacto Directo
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-5xl md:text-6xl font-bold mb-10 text-slate-900 tracking-tighter"
                    >
                        Iniciemos una <span className="text-slate-400">Conversación Estratégica</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 text-xl mb-16 max-w-md font-light leading-relaxed"
                    >
                        Descubre cómo AlgoritmoT puede acompañar la maduración digital de tu organización hacia la Industria 5.0.
                    </motion.p>

                    <div className="space-y-8">
                        <div className="flex items-center gap-6 group">
                            <div className="w-12 h-12 flex items-center justify-center border border-slate-100 bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Mail className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-medium text-slate-700">{siteConfig.contact.email}</span>
                        </div>
                        <div className="flex items-center gap-6 group">
                            <div className="w-12 h-12 flex items-center justify-center border border-slate-100 bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-medium text-slate-700">{siteConfig.contact.address}</span>
                        </div>
                        <a
                            href={siteConfig.links.linkedin}
                            className="flex items-center gap-6 group"
                        >
                            <div className="w-12 h-12 flex items-center justify-center border border-slate-100 bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Linkedin className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-medium text-slate-400 group-hover:text-slate-900 transition-colors">LinkedIn Corporate</span>
                        </a>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-slate-50 p-12 lg:p-16 border border-slate-100"
                >
                    <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Nombre Completo</label>
                                <input
                                    type="text"
                                    placeholder="Andrés Tabla"
                                    className="w-full bg-transparent border-b border-slate-200 py-3 text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Correo Corporativo</label>
                                <input
                                    type="email"
                                    placeholder="andres@corporacion.com"
                                    className="w-full bg-transparent border-b border-slate-200 py-3 text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Mensaje</label>
                            <textarea
                                rows={3}
                                placeholder="¿Qué reto tecnológico enfrentas hoy?"
                                className="w-full bg-transparent border-b border-slate-200 py-3 text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 resize-none"
                            />
                        </div>
                        <Button className="w-full py-5 rounded-none group">
                            Enviar Propuesta
                            <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>
                </motion.div>
            </div>
        </section>
    )
}
