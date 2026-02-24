import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ArrowUpRight } from 'lucide-react'

export function Services() {
    const { services } = content

    return (
        <section className="section-padding bg-slate-50/50 border-y border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
                    <div className="max-w-2xl">
                        <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-6">
                            Servicios Estratégicos
                        </div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-bold text-slate-900"
                        >
                            {services.title}
                        </motion.h2>
                    </div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 text-lg max-w-md md:text-right"
                    >
                        {services.subtitle}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {services.items.map((service, index) => {
                        const Icon = service.icon
                        return (
                            <Card
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group border border-transparent hover:bg-white hover:border-slate-200 rounded-none h-full flex flex-col p-12 transition-all duration-500"
                            >
                                <div className="mb-12 text-slate-300 group-hover:text-slate-900 transition-colors">
                                    <Icon className="w-10 h-10 stroke-[1.5]" />
                                </div>

                                <h3 className="text-2xl font-bold mb-6 text-slate-900 tracking-tight">
                                    {service.title}
                                </h3>

                                <p className="text-slate-500 mb-10 leading-relaxed font-light">
                                    {service.description}
                                </p>

                                <ul className="space-y-4 mb-12 flex-grow">
                                    {service.features.map((feature, i) => (
                                        <li key={i} className="flex items-center text-xs text-slate-400 font-medium uppercase tracking-wider">
                                            <div className="w-1.5 h-1.5 bg-slate-200 mr-3" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent text-slate-900 border-b border-slate-200 hover:border-slate-900 rounded-none w-fit transition-all group/btn">
                                    {service.cta}
                                    <ArrowUpRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </Button>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
