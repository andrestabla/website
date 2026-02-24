import { motion } from 'framer-motion'
import { content } from '../../data/content'
import { Button } from '../../components/ui/Button'
import { ArrowRight } from 'lucide-react'

export function Hero() {
    const { hero } = content

    return (
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-32 pb-24 px-6 overflow-hidden bg-white executive-grid">
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-start text-left"
                >
                    <div className="h-px w-24 bg-slate-900 mb-12" />

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-6"
                    >
                        {hero.highlight}
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-bold mb-10 tracking-tighter leading-[0.9] text-slate-900 max-w-4xl">
                        {hero.title}
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 mb-16 max-w-2xl font-light leading-relaxed border-l-2 border-slate-100 pl-8">
                        {hero.subtitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-6">
                        <Button size="lg" className="rounded-none">
                            {hero.cta}
                            <ArrowRight className="ml-3 w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="lg" className="rounded-none border-b border-transparent hover:border-slate-900">
                            {hero.secondaryCta}
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Structural Decoration */}
            <div className="absolute top-0 right-[10%] w-px h-full bg-slate-50" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-50" />
        </section>
    )
}
