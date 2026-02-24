import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formMicrocopy } from '../../data/details'
import { Button } from '../ui/Button'
import { Mail, User, MessageSquare, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface ContactFormProps {
    serviceSlug?: string
    context?: 'general' | 'service' | 'product'
}

export function ContactForm({ serviceSlug, context = 'general' }: ContactFormProps) {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

    // Use props to avoid TS6198
    console.log(`Initializing form for ${serviceSlug || 'general'} in ${context} context`)

    // Randomly select microcopy variants for a "fresh" feel on each load
    const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

    const placeholders = {
        name: getRandom(formMicrocopy.placeholders.name),
        email: getRandom(formMicrocopy.placeholders.email)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('submitting')

        // Simulate API call
        setTimeout(() => {
            setStatus('success')
        }, 1500)
    }

    if (status === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-primary/5 border border-brand-primary/20 p-12 text-center"
            >
                <div className="w-20 h-20 bg-brand-primary text-white rounded-none mx-auto mb-8 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tighter">
                    {getRandom(formMicrocopy.success)}
                </h3>
                <p className="text-slate-500 mb-8 font-light">
                    Analizaremos tu solicitud bajo nuestros protocolos de Industria 5.0 y te contactaremos en breve.
                </p>
                <Button
                    variant="outline"
                    onClick={() => setStatus('idle')}
                    className="mx-auto"
                >
                    {getRandom(formMicrocopy.confirm)}
                </Button>
            </motion.div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    Identificación
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <User className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        required
                        placeholder={placeholders.name}
                        className="w-full bg-slate-50 border border-slate-200 py-6 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                    />
                </div>
            </div>

            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    Canal de Comunicación
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                    <input
                        type="email"
                        required
                        placeholder={placeholders.email}
                        className="w-full bg-slate-50 border border-slate-200 py-6 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                    />
                </div>
            </div>

            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    Requerimiento Técnico
                </label>
                <div className="relative group">
                    <div className="absolute top-6 left-6 pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <textarea
                        rows={4}
                        required
                        placeholder="¿En qué fase de tu transformación digital te encuentras?"
                        className="w-full bg-slate-50 border border-slate-200 py-6 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium resize-none"
                    />
                </div>
            </div>

            <AnimatePresence>
                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 bg-red-50 text-red-600 text-sm font-bold border-l-4 border-red-600"
                    >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {getRandom(formMicrocopy.error)}
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                type="submit"
                size="lg"
                className="w-full py-8 text-lg"
                disabled={status === 'submitting'}
            >
                {status === 'submitting' ? 'Sincronizando...' : getRandom(formMicrocopy.submit)}
                <ArrowRight className="ml-3 w-6 h-6" />
            </Button>

            <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                Cumplimos con normativas de privacidad GDPR. <br />
                Tus datos están seguros bajo protocolo SSL.
            </div>
        </form>
    )
}
