import { motion } from 'framer-motion'
import { useCMS } from '../../admin/context/CMSContext'
import { Button } from '../../components/ui/Button'
import { ChevronRight } from 'lucide-react'

export function Hero() {
    const { state } = useCMS()
    const hero = state.hero

    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-24 px-6 overflow-hidden bg-white infra-grid">
            {/* Decorative Structural Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary opacity-50" />
            <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50/50 -z-10 border-l border-slate-100" />

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
                <div className="lg:col-span-8">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col items-start"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <span className="w-12 h-px bg-brand-primary" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-brand-primary">
                                {hero.highlight}
                            </span>
                        </div>

                        <h1 className="text-7xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85] text-slate-900">
                            {hero.title.split(' ').map((word, i) => (
                                <span key={i} className={i > 1 ? "block text-gradient" : "block"}>
                                    {word}
                                </span>
                            ))}
                        </h1>

                        <div className="max-w-2xl border-l-4 border-brand-primary pl-10 py-2 mb-16">
                            <p className="text-2xl md:text-3xl text-slate-500 font-medium leading-tight">
                                {hero.subtitle}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <Button size="lg" className="group">
                                {hero.cta}
                                <ChevronRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button variant="outline" size="lg">
                                {hero.secondaryCta}
                            </Button>
                        </div>
                    </motion.div>
                </div>

                <div className="lg:col-span-4 hidden lg:block">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="w-full aspect-square border border-slate-200 relative p-8 dot-pattern bg-white"
                    >
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-primary -translate-x-1 -translate-y-1" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-primary translate-x-1 translate-y-1" />

                        <div className="flex flex-col h-full justify-center space-y-8">
                            {[
                                { label: "Stability", value: "99.9%" },
                                { label: "Performance", value: "High-Tier" },
                                { label: "Standard", value: "ISO 9241" }
                            ].map((stat, i) => (
                                <div key={i} className="border-b border-slate-100 pb-4">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                                    <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
