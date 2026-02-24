import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function Products() {
    const { products } = content

    return (
        <section className="section-padding bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20 text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-6">
                        Soluciones Empaquetadas
                    </div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold text-slate-900"
                    >
                        {products.title}
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-100">
                    {products.items.map((product, index) => {
                        const Icon = product.icon
                        return (
                            <Card
                                key={product.title}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white hover:bg-slate-50 border-0 border-r last:border-r-0 border-slate-100 rounded-none p-12 transition-all group"
                            >
                                <div className="mb-10 text-slate-400 group-hover:text-slate-900 transition-colors">
                                    <Icon className="w-8 h-8" />
                                </div>

                                <h3 className="text-2xl font-bold mb-6 text-slate-900">
                                    {product.title}
                                </h3>

                                <p className="text-slate-500 mb-12 leading-relaxed font-light">
                                    {product.description}
                                </p>

                                <div className="mt-auto">
                                    <div className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest">
                                        {product.price}
                                    </div>
                                    <Button variant={index === 1 ? 'primary' : 'outline'} className="w-full rounded-none">
                                        Saber Más
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
