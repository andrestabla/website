import { motion } from 'framer-motion'
import { siteConfig } from '../../data/config'
import { Button } from '../../components/ui/Button'
import { Mail, MapPin, Linkedin, Send } from 'lucide-react'

export function Contact() {
    return (
        <section className="py-24 px-4 bg-slate-900/40 relative overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-6 text-slate-50"
                    >
                        ¿Listo para elevar tu <span className="text-brand-500">Madurez Digital</span>?
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-lg mb-12 max-w-md"
                    >
                        Iniciemos una conversación sobre cómo AlgoritmoT puede ayudar a tu organización a capturar valor real.
                    </motion.p>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="p-3 rounded-lg bg-slate-800 text-brand-500">
                                <Mail className="w-5 h-5" />
                            </div>
                            {siteConfig.contact.email}
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <div className="p-3 rounded-lg bg-slate-800 text-brand-500">
                                <MapPin className="w-5 h-5" />
                            </div>
                            {siteConfig.contact.address}
                        </div>
                        <a
                            href={siteConfig.links.linkedin}
                            className="flex items-center gap-4 text-slate-400 hover:text-brand-500 transition-colors"
                        >
                            <div className="p-3 rounded-lg bg-slate-800">
                                <Linkedin className="w-5 h-5" />
                            </div>
                            Síguenos en LinkedIn
                        </a>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card p-8 rounded-3xl"
                >
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 ml-1">Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Tu nombre"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 ml-1">Empresa</label>
                                <input
                                    type="text"
                                    placeholder="Tu empresa"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                placeholder="tu@correo.com"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Mensaje</label>
                            <textarea
                                rows={4}
                                placeholder="¿Cómo podemos ayudarte?"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-600 resize-none"
                            />
                        </div>
                        <Button className="w-full py-4 group">
                            Enviar Mensaje
                            <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                        <p className="text-center text-xs text-slate-500 pt-2">
                            Recopilamos tus datos para contactarte. <br /> Respetamos tu privacidad al 100%.
                        </p>
                    </form>
                </motion.div>
            </div>

            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none" />
        </section>
    )
}
