import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function Products() {
    const { products } = content

    return (
        <section className="py-24 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold mb-4"
                    >
                        {products.title}
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {products.items.map((product, index) => {
                        const Icon = product.icon
                        return (
                            <Card
                                key={product.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                variant={index === 1 ? 'gradient' : 'glass'}
                                className="relative overflow-hidden group"
                            >
                                <div className="mb-6 inline-flex p-3 rounded-xl bg-brand-500/10 text-brand-500">
                                    <Icon className="w-6 h-6" />
                                </div>

                                <h3 className="text-2xl font-bold mb-4 text-slate-50">
                                    {product.title}
                                </h3>

                                <p className="text-slate-400 mb-8 leading-relaxed">
                                    {product.description}
                                </p>

                                <div className="mt-auto">
                                    <div className="text-sm font-medium text-slate-500 mb-4">
                                        {product.price}
                                    </div>
                                    <Button variant={index === 1 ? 'primary' : 'outline'} className="w-full">
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
