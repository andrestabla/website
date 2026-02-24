import { content } from '../../data/content'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LayoutGrid } from 'lucide-react'

export function Products() {
    const { products } = content

    return (
        <section className="py-32 px-6 bg-white infra-grid">
            <div className="max-w-7xl mx-auto">
                <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <LayoutGrid className="w-5 h-5 text-brand-secondary" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">
                                Performance Modules
                            </span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
                            {products.title}
                        </h2>
                    </div>
                    <p className="text-xl text-slate-500 font-light max-w-sm">
                        Soluciones sistematizadas para resultados predecibles y escalables.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {products.items.map((product, index) => {
                        const Icon = product.icon
                        return (
                            <Card
                                key={product.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={index === 1 ? "bg-brand-primary text-white border-0" : "bg-white"}
                            >
                                <div className={cn(
                                    "w-20 h-20 mb-12 flex items-center justify-center p-4 dot-pattern",
                                    index === 1 ? "bg-white/10" : "bg-slate-50"
                                )}>
                                    <Icon className={cn("w-10 h-10", index === 1 ? "text-white" : "text-brand-primary")} />
                                </div>

                                <h3 className="text-4xl font-black mb-8 tracking-tighter leading-none">
                                    {product.title}
                                </h3>

                                <p className={cn(
                                    "mb-12 text-lg font-light leading-relaxed h-24",
                                    index === 1 ? "text-white/70" : "text-slate-500"
                                )}>
                                    {product.description}
                                </p>

                                <div className="mt-auto pt-8 border-t border-current/10">
                                    <div className="text-xs font-black uppercase tracking-[0.3em] opacity-50 mb-4">
                                        Availability & Pricing
                                    </div>
                                    <div className="text-2xl font-black mb-10 tracking-tight">
                                        {product.price}
                                    </div>
                                    <Button
                                        variant={index === 1 ? 'secondary' : 'primary'}
                                        className="w-full"
                                    >
                                        Deploy Solution
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
import { cn } from '../../lib/utils'
