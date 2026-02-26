import { Card } from '../../components/ui/Card'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { servicesDetail } from '../../data/details'
import { useLanguage } from '../../context/LanguageContext'
import type { HomeResponsiveViewport } from '../../admin/context/CMSContext'

type ServicesProps = {
    visibleBlocks?: {
        header?: boolean
        grid?: boolean
    }
    blockOrder?: Array<'header' | 'grid'>
    viewport?: HomeResponsiveViewport
    styleOverrides?: {
        header?: {
            titleSizeRem?: string
        }
        grid?: {
            columns?: string
            itemLimit?: string
        }
    }
}

export function Services({ visibleBlocks, blockOrder, viewport = 'desktop', styleOverrides }: ServicesProps) {
    const { translatedState } = useLanguage()
    // CMS services are a flat ServiceItem[]; icons live in servicesDetail (React components can't be stored)
    const services = translatedState.services
    const sectionCfg = translatedState.homePage.servicesSection
    const sectionStyle = {
        backgroundColor: sectionCfg.style.backgroundColor || undefined,
        backgroundImage: sectionCfg.style.backgroundImageUrl
            ? `linear-gradient(rgba(248,250,252,0.94), rgba(248,250,252,0.94)), url(${sectionCfg.style.backgroundImageUrl})`
            : undefined,
        backgroundSize: sectionCfg.style.backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: sectionCfg.style.backgroundImageUrl ? 'center' : undefined,
    } as const
    const blocks = {
        header: visibleBlocks?.header !== false,
        grid: visibleBlocks?.grid !== false,
    }
    const normalizeBlockOrder = (raw: unknown, fallback: Array<'header' | 'grid'>): Array<'header' | 'grid'> => {
        const valid = new Set(fallback)
        const fromRaw = Array.isArray(raw) ? raw.filter((value): value is 'header' | 'grid' => typeof value === 'string' && valid.has(value as any)) : []
        const unique = [...new Set(fromRaw)]
        for (const value of fallback) {
            if (!unique.includes(value)) unique.push(value)
        }
        return unique as Array<'header' | 'grid'>
    }
    const sectionBlockOrder = normalizeBlockOrder(blockOrder, ['header', 'grid'])
    const headerOrder = sectionBlockOrder.indexOf('header')
    const gridOrder = sectionBlockOrder.indexOf('grid')
    const parseNum = (value: string | undefined, fallback: number) => {
        const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : fallback
    }
    const headerTitleSizeRem = parseNum(
        styleOverrides?.header?.titleSizeRem,
        viewport === 'desktop' ? 4.5 : viewport === 'tablet' ? 4 : 3
    )
    const gridColumns = Math.max(
        1,
        Math.min(
            4,
            Math.round(parseNum(styleOverrides?.grid?.columns, viewport === 'desktop' ? 3 : viewport === 'tablet' ? 2 : 1))
        )
    )
    const gridItemLimit = Math.max(
        1,
        Math.min(
            12,
            Math.round(parseNum(styleOverrides?.grid?.itemLimit, viewport === 'desktop' ? 6 : viewport === 'tablet' ? 6 : 4))
        )
    )
    const visibleServices = services.slice(0, gridItemLimit)
    if (!blocks.header && !blocks.grid) return null

    return (
        <section style={sectionStyle} className="py-32 px-6 bg-slate-50 border-y border-slate-200 relative overflow-hidden">
            {blocks.header && (
                <div className="absolute top-0 right-0 p-24 text-[20rem] font-black text-slate-200/20 leading-none select-none -z-10 pointer-events-none">
                    {sectionCfg.sectionNumber}
                </div>
            )}

            <div className="max-w-7xl mx-auto flex flex-col">
                {blocks.header && (
                    <div
                        className={headerOrder > gridOrder && blocks.grid ? 'mt-16' : 'mb-32'}
                        style={{ order: headerOrder + 1 }}
                    >
                    <div className="flex items-center gap-4 mb-6">
                        <span className="w-12 h-1 bg-brand-primary" />
                        <span className="text-sm font-black uppercase tracking-[0.4em] text-brand-primary">
                            {sectionCfg.eyebrow}
                        </span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter" style={{ fontSize: `${headerTitleSizeRem}rem`, lineHeight: 0.95 }}>
                        {sectionCfg.title}
                    </h2>
                    <p className="text-2xl text-slate-500 font-light max-w-2xl border-l-2 border-slate-200 pl-8">
                        {sectionCfg.subtitle}
                    </p>
                    </div>
                )}

                {blocks.grid && (
                    <div className="grid gap-0 border-t border-l border-slate-200" style={{ order: gridOrder + 1, gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
                    {visibleServices.map((service, index) => {
                        // Get the icon from static data by matching slug
                        const staticDetail = servicesDetail.find(d => d.slug === service.slug) ?? servicesDetail[index]
                        const Icon = staticDetail?.icon

                        return (
                            <Card
                                key={service.slug}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white hover:bg-slate-50 border-r border-b border-slate-200 p-12 transition-all duration-500"
                            >
                                <div className="flex items-start justify-between mb-16">
                                    <div className="w-16 h-16 rounded-none bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
                                        {Icon && <Icon className="w-8 h-8 stroke-[1.5]" />}
                                    </div>
                                    <span className="text-4xl font-black text-slate-50 group-hover:text-slate-100 transition-colors">
                                        0{index + 1}
                                    </span>
                                </div>

                                <h3 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter leading-none">
                                    {service.title}
                                </h3>

                                <p className="text-slate-500 mb-10 text-lg leading-relaxed font-light">
                                    {service.description}
                                </p>

                                <div className="space-y-4 mb-12">
                                    {service.features.map((feature, i) => (
                                        <div key={i} className="flex items-center text-sm text-slate-600 font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-4 h-4 text-brand-secondary mr-3 shrink-0" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    to={`/servicios/${service.slug}`}
                                    className="flex items-center text-sm font-black uppercase tracking-[0.2em] text-brand-primary hover:text-slate-900 transition-colors group/btn"
                                >
                                    {service.ctaPrimary}
                                    <ArrowRight className="ml-3 w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                                </Link>
                            </Card>
                        )
                    })}
                    </div>
                )}
            </div>
        </section>
    )
}
