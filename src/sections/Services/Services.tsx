import { Card } from '../../components/ui/Card'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { servicesDetail } from '../../data/details'
import { useLanguage } from '../../context/LanguageContext'

export function Services() {
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

    return (
        <section style={sectionStyle} className="py-32 px-6 bg-slate-50 border-y border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-24 text-[20rem] font-black text-slate-200/20 leading-none select-none -z-10 pointer-events-none">
                {sectionCfg.sectionNumber}
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="mb-32">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="w-12 h-1 bg-brand-primary" />
                        <span className="text-sm font-black uppercase tracking-[0.4em] text-brand-primary">
                            {sectionCfg.eyebrow}
                        </span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter">
                        {sectionCfg.title}
                    </h2>
                    <p className="text-2xl text-slate-500 font-light max-w-2xl border-l-2 border-slate-200 pl-8">
                        {sectionCfg.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-slate-200">
                    {services.map((service, index) => {
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
            </div>
        </section>
    )
}
