import { motion } from 'framer-motion'
import { siteConfig } from '../../data/config'
import { ContactForm } from '../../components/forms/ContactForm'
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
                        <div className="bg-white p-12 md:p-16 border-b-8 border-brand-primary shadow-2xl">
                            <ContactForm />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
