import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { productsDetail } from '../../data/details'
import { cn } from '../../lib/utils'
import { useLanguage } from '../../context/LanguageContext'
import type { HomeResponsiveViewport } from '../../admin/context/CMSContext'

type ProductsProps = {
    visibleBlocks?: {
        header?: boolean
        cards?: boolean
    }
    blockOrder?: Array<'header' | 'cards'>
    viewport?: HomeResponsiveViewport
    styleOverrides?: {
        header?: {
            titleSizeRem?: string
        }
        cards?: {
            columns?: string
            itemLimit?: string
        }
    }
}

export function Products({ visibleBlocks, blockOrder, viewport = 'desktop', styleOverrides }: ProductsProps) {
    const { translatedState } = useLanguage()
    const sectionCfg = translatedState.homePage.productsSection
    const products = {
        title: sectionCfg.title,
        items: translatedState.products
    }
    const sectionStyle = {
        backgroundColor: sectionCfg.style.backgroundColor || undefined,
        backgroundImage: sectionCfg.style.backgroundImageUrl
            ? `linear-gradient(rgba(255,255,255,0.94), rgba(255,255,255,0.94)), url(${sectionCfg.style.backgroundImageUrl})`
            : undefined,
        backgroundSize: sectionCfg.style.backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: sectionCfg.style.backgroundImageUrl ? 'center' : undefined,
    } as const
    const blocks = {
        header: visibleBlocks?.header !== false,
        cards: visibleBlocks?.cards !== false,
    }
    const normalizeBlockOrder = (raw: unknown, fallback: Array<'header' | 'cards'>): Array<'header' | 'cards'> => {
        const valid = new Set(fallback)
        const fromRaw = Array.isArray(raw) ? raw.filter((value): value is 'header' | 'cards' => typeof value === 'string' && valid.has(value as any)) : []
        const unique = [...new Set(fromRaw)]
        for (const value of fallback) {
            if (!unique.includes(value)) unique.push(value)
        }
        return unique as Array<'header' | 'cards'>
    }
    const sectionBlockOrder = normalizeBlockOrder(blockOrder, ['header', 'cards'])
    const headerOrder = sectionBlockOrder.indexOf('header')
    const cardsOrder = sectionBlockOrder.indexOf('cards')
    const parseNum = (value: string | undefined, fallback: number) => {
        const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : fallback
    }
    const headerTitleSizeRem = parseNum(
        styleOverrides?.header?.titleSizeRem,
        viewport === 'desktop' ? 4.5 : viewport === 'tablet' ? 4 : 3
    )
    const cardsColumns = Math.max(
        1,
        Math.min(
            4,
            Math.round(parseNum(styleOverrides?.cards?.columns, viewport === 'desktop' ? 3 : viewport === 'tablet' ? 2 : 1))
        )
    )
    const cardsItemLimit = Math.max(
        1,
        Math.min(
            12,
            Math.round(parseNum(styleOverrides?.cards?.itemLimit, viewport === 'desktop' ? 3 : viewport === 'tablet' ? 3 : 2))
        )
    )
    const visibleProducts = products.items.slice(0, cardsItemLimit)
    if (!blocks.header && !blocks.cards) return null

    return (
        <section style={sectionStyle} className="py-32 px-6 bg-white infra-grid">
            <div className="max-w-7xl mx-auto flex flex-col">
                {blocks.header && (
                    <div
                        className={`flex flex-col md:flex-row md:items-end justify-between gap-8 ${headerOrder > cardsOrder && blocks.cards ? 'mt-16' : 'mb-24'}`}
                        style={{ order: headerOrder + 1 }}
                    >
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <LayoutGrid className="w-5 h-5 text-brand-secondary" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">
                                {sectionCfg.eyebrow}
                            </span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter" style={{ fontSize: `${headerTitleSizeRem}rem`, lineHeight: 0.95 }}>
                            {products.title}
                        </h2>
                    </div>
                    <p className="text-xl text-slate-500 font-light max-w-sm">
                        {sectionCfg.subtitle}
                    </p>
                    </div>
                )}

                {blocks.cards && (
                    <div className="grid gap-12" style={{ order: cardsOrder + 1, gridTemplateColumns: `repeat(${cardsColumns}, minmax(0, 1fr))` }}>
                    {visibleProducts.map((product, index) => {
                        const Icon = (product as any).icon
                        const detail = productsDetail[index]
                        const slug = detail ? detail.slug : 'diagnostico-md-ia'

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
                                        {sectionCfg.availabilityPricingLabel}
                                    </div>
                                    <div className="text-2xl font-black mb-10 tracking-tight">
                                        {product.price}
                                    </div>
                                    <Link to={`/productos/${slug}`}>
                                        <Button
                                            variant={index === 1 ? 'secondary' : 'primary'}
                                            className="w-full"
                                        >
                                            {sectionCfg.deploySolutionLabel}
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        )
                    })}
                    </div>
                )}
            </div>
        </section>
    )
}
