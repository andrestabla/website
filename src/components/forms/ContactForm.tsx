import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formMicrocopy } from '../../data/details'
import { Button } from '../ui/Button'
import { Mail, User, MessageSquare, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useTranslatedStatic } from '../../hooks/useTranslatedStatic'
import { useLanguage } from '../../context/LanguageContext'
import { useCMS } from '../../admin/context/CMSContext'

interface ContactFormProps {
    serviceSlug?: string
    context?: 'general' | 'service' | 'product'
}

export function ContactForm({ serviceSlug, context = 'general' }: ContactFormProps) {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [form, setForm] = useState({ name: '', email: '', requirement: '' })
    const { uiText } = useLanguage()
    const { state } = useCMS()
    const translatedMicrocopy = useTranslatedStatic('contact-form-microcopy', formMicrocopy)

    // Randomly select microcopy variants for a "fresh" feel on each load
    const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

    const placeholders = {
        name: getRandom(translatedMicrocopy.placeholders.name),
        email: getRandom(translatedMicrocopy.placeholders.email)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('submitting')
        try {
            const response = await fetch('/api/contact-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    requirement: form.requirement,
                    serviceSlug: serviceSlug || undefined,
                    context,
                    path: window.location.pathname,
                }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setStatus('success')
            setForm({ name: '', email: '', requirement: '' })
        } catch {
            setStatus('error')
        }
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
                    {getRandom(translatedMicrocopy.success)}
                </h3>
                <p className="text-slate-500 mb-8 font-light">
                    {state.site.formSuccessMessage || uiText.form.successBlurb}
                </p>
                <Button
                    variant="outline"
                    onClick={() => setStatus('idle')}
                    className="mx-auto"
                >
                    {getRandom(translatedMicrocopy.confirm)}
                </Button>
            </motion.div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    {uiText.form.labels.id}
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <User className="w-5 h-5" />
                    </div>
                    <input
                        name="name"
                        type="text"
                        required
                        placeholder={placeholders.name}
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        autoComplete="name"
                        className="w-full bg-slate-50 border border-slate-200 py-6 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                    />
                </div>
            </div>

            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    {uiText.form.labels.channel}
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder={placeholders.email}
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        autoComplete="email"
                        className="w-full bg-slate-50 border border-slate-200 py-6 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium"
                    />
                </div>
            </div>

            <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 ml-1">
                    {uiText.form.labels.requirement}
                </label>
                <div className="relative group">
                    <div className="absolute top-6 left-6 pointer-events-none text-slate-300 group-focus-within:text-brand-primary transition-colors">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <textarea
                        name="requirement"
                        rows={4}
                        required
                        placeholder={uiText.form.placeholders.requirement}
                        value={form.requirement}
                        onChange={(e) => setForm((prev) => ({ ...prev, requirement: e.target.value }))}
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
                        {state.site.formErrorMessage || getRandom(translatedMicrocopy.error)}
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                type="submit"
                size="lg"
                className="w-full py-8 text-lg"
                disabled={status === 'submitting'}
            >
                {status === 'submitting' ? uiText.form.submitting : getRandom(translatedMicrocopy.submit)}
                <ArrowRight className="ml-3 w-6 h-6" />
            </Button>

            <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                {uiText.form.privacy} <br />
                {uiText.form.ssl}
            </div>
        </form>
    )
}
