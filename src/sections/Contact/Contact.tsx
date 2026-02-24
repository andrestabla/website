import { motion } from 'framer-motion'
import { siteConfig } from '../../data/config'
import { Button } from '../../components/ui/Button'
import { Mail, MapPin, Linkedin, Terminal } from 'lucide-react'

export function Contact() {
    return (
        <section className="py-32 px-6 bg-white infra-grid relative">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
                    <div>
                        <div className="flex items-center gap-4 mb-10">
                            <Terminal className="w-6 h-6 text-brand-primary" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">
                                System Access
                            </span>
                        </div>

                        <h2 className="text-6xl md:text-8xl font-black text-slate-900 mb-12 tracking-tighter leading-none">
                            Iniciemos el <span className="text-gradient">Despliegue</span>
                        </h2>

                        <div className="space-y-12">
                            {[
                                { icon: Mail, label: "Official Channel", value: siteConfig.contact.email },
                                { icon: MapPin, label: "Hub HQ", value: siteConfig.contact.address },
                                { icon: Linkedin, label: "Corporate Network", value: "LinkedIn Protocol" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-8 group">
                                    <div className="w-16 h-16 flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{item.label}</div>
                                        <div className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="bg-white border-4 border-slate-900 p-12 lg:p-20 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]"
                    >
                        <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Identity Name</label>
                                <input
                                    type="text"
                                    placeholder="Andrés Tabla"
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 p-4 text-xl font-bold text-slate-900 outline-none focus:border-brand-primary transition-all placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Transmission Protocol (Email)</label>
                                <input
                                    type="email"
                                    placeholder="andres@corporation.com"
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 p-4 text-xl font-bold text-slate-900 outline-none focus:border-brand-primary transition-all placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Project Brief</label>
                                <textarea
                                    rows={4}
                                    placeholder="¿Cuál es tu próximo hito digital?"
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 p-4 text-xl font-bold text-slate-900 outline-none focus:border-brand-primary transition-all placeholder:text-slate-300 resize-none"
                                />
                            </div>
                            <Button size="lg" className="w-full py-6">
                                Submit Access Request
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
