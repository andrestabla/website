import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Shield, LayoutPanelLeft, Users } from 'lucide-react'

const frameworkIcons = [Users, LayoutPanelLeft, Shield]

export function Frameworks() {
    const { frameworks } = content

    return (
        <section className="section-padding bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto">
                <div className="mb-24 flex flex-col items-center text-center">
                    <div className="h-px w-12 bg-white/20 mb-8" />
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
                    >
                        {frameworks.title}
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                    {frameworks.items.map((item, index) => {
                        const Icon = frameworkIcons[index]
                        return (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="flex flex-col items-start p-8 border-l border-white/10"
                            >
                                <Icon className="w-8 h-8 text-white/40 mb-8" />
                                <div className="text-xs font-bold text-white/50 mb-3 uppercase tracking-[0.2em]">
                                    {item.organization}
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-white">
                                    {item.name}
                                </h3>
                                <p className="text-white/60 text-base leading-relaxed font-light">
                                    {item.description}
                                </p>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
