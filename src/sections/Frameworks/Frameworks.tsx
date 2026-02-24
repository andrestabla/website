import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Shield, LayoutPanelLeft, Users } from 'lucide-react'

const frameworkIcons = [Users, LayoutPanelLeft, Shield]

export function Frameworks() {
    const { frameworks } = content

    return (
        <section className="py-24 px-4 bg-slate-900/20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold mb-4"
                    >
                        {frameworks.title}
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {frameworks.items.map((item, index) => {
                        const Icon = frameworkIcons[index]
                        return (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="flex flex-col items-center text-center p-8 rounded-3xl border border-slate-800/50 bg-slate-900/20 backdrop-blur-sm"
                            >
                                <div className="mb-6 p-4 rounded-2xl bg-slate-800/50 text-brand-500">
                                    <Icon className="w-8 h-8" />
                                </div>
                                <div className="text-xs font-bold text-brand-500 mb-2 uppercase tracking-widest">
                                    {item.organization}
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-slate-100">
                                    {item.name}
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
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
