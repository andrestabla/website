import { motion } from 'framer-motion'
import { Shield, LayoutPanelLeft, Users } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const frameworkIcons = [Users, LayoutPanelLeft, Shield]

export function Frameworks() {
    const { translatedState } = useLanguage()
    const frameworks = translatedState.homePage.frameworksSection
    const sectionStyle = {
        backgroundColor: frameworks.style.backgroundColor || undefined,
        backgroundImage: frameworks.style.backgroundImageUrl
            ? `url(${frameworks.style.backgroundImageUrl})`
            : undefined,
        backgroundSize: frameworks.style.backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: frameworks.style.backgroundImageUrl ? 'center' : undefined,
    } as const

    return (
        <section style={sectionStyle} className="py-32 px-6 bg-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 dot-pattern" style={{ opacity: Number(frameworks.style.overlayOpacity || '0.10') }} />

            <div className="max-w-7xl mx-auto relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-start">
                    <div className="lg:col-span-5">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="w-12 h-px bg-white/50" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-white/50">
                                {frameworks.eyebrow}
                            </span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-none">
                            {frameworks.title}
                        </h2>
                        <p className="text-xl text-white/50 font-light leading-relaxed">
                            {frameworks.subtitle}
                        </p>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {frameworks.items.map((item, index) => {
                            const Icon = frameworkIcons[index]
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="p-10 border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                                >
                                    <div className="w-14 h-14 bg-white/10 flex items-center justify-center mb-10 group-hover:bg-brand-secondary transition-colors">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-xs font-black text-brand-secondary mb-4 uppercase tracking-[0.3em]">
                                        {item.organization}
                                    </div>
                                    <h3 className="text-3xl font-black mb-6 text-white tracking-tighter">
                                        {item.name}
                                    </h3>
                                    <p className="text-white/40 text-base leading-relaxed font-light">
                                        {item.description}
                                    </p>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
