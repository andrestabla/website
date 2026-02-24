import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Button } from '../../components/ui/Button'
import { ChevronRight } from 'lucide-react'

export function Hero() {
    const { hero } = content

    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-16 px-4 overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-[45%] h-[45%] bg-brand-500/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[10%] w-[45%] h-[45%] bg-accent-emerald/10 rounded-full blur-[140px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-5xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                    </span>
                    {hero.highlight}
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tighter leading-[1.1]"
                >
                    {hero.title.split(' ').map((word, i) => (
                        <span key={i} className={i >= 3 ? 'text-brand-500 text-glow' : 'text-slate-50'}>
                            {word}{' '}
                        </span>
                    ))}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto font-light leading-relaxed"
                >
                    {hero.subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Button size="lg" className="group">
                        {hero.cta}
                        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" size="lg">
                        {hero.secondaryCta}
                    </Button>
                </motion.div>
            </div>

            {/* Decorative Lines */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        </section>
    )
}
