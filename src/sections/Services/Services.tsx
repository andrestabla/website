import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ArrowRight } from 'lucide-react'

export function Services() {
    const { services } = content

    return (
        <section className="py-24 px-4 bg-slate-950/50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold mb-4"
                    >
                        {services.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-lg max-w-2xl mx-auto"
                    >
                        {services.subtitle}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.items.map((service, index) => {
                        const Icon = service.icon
                        return (
                            <Card
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                variant="glass"
                                className="group hover:border-brand-500/50 transition-colors"
                            >
                                <div className="mb-6 inline-flex p-3 rounded-xl bg-brand-500/10 text-brand-500 group-hover:scale-110 transition-transform">
                                    <Icon className="w-6 h-6" />
                                </div>

                                <h3 className="text-xl font-bold mb-3 text-slate-50">
                                    {service.title}
                                </h3>

                                <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                                    {service.description}
                                </p>

                                <ul className="space-y-2 mb-8">
                                    {service.features.map((feature, i) => (
                                        <li key={i} className="flex items-center text-xs text-slate-500">
                                            <div className="w-1 h-1 rounded-full bg-brand-500/50 mr-2" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent text-brand-500 font-semibold flex items-center group-hover:gap-2 transition-all">
                                    {service.cta}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
