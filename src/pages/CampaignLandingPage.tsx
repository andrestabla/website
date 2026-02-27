import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { ContactForm } from '../components/forms/ContactForm'
import { Button } from '../components/ui/Button'

type CampaignSection = {
    id: string
    title: string
    body: string
    bullets: string[]
}

type CampaignLanding = {
    id: string
    slug: string
    name: string
    heroEyebrow: string
    heroTitle: string
    heroSubtitle: string
    primaryCtaLabel: string
    primaryCtaHref: string
    secondaryCtaLabel: string
    secondaryCtaHref: string
    sections: CampaignSection[]
    offerTitle: string
    offerBody: string
    formTitle: string
    thankYouMessage: string
    accentColor: string
    backgroundStyle: string
}

export function CampaignLandingPage() {
    const { slug } = useParams<{ slug: string }>()
    const { search } = useLocation()
    const [landing, setLanding] = useState<CampaignLanding | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const preview = useMemo(() => new URLSearchParams(search).get('preview') === '1', [search])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!slug) return
            setLoading(true)
            setError(null)
            try {
                const response = await fetch(`/api/campaign-landings?slug=${encodeURIComponent(slug)}${preview ? '&preview=1' : ''}`)
                const json = await response.json().catch(() => null)
                if (!response.ok || !json?.ok) {
                    throw new Error(json?.error || `HTTP ${response.status}`)
                }
                if (!cancelled) setLanding(json.landing)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Landing no disponible')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => {
            cancelled = true
        }
    }, [preview, slug])

    if (loading) {
        return (
            <Layout>
                <section className="min-h-[60vh] px-6 py-24 bg-white flex items-center justify-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">Cargando landing...</div>
                </section>
            </Layout>
        )
    }

    if (error || !landing) {
        return (
            <Layout>
                <section className="min-h-[60vh] px-6 py-24 bg-white flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">Landing no encontrada</h1>
                        <p className="text-slate-500">{error || 'La campaña solicitada no existe o no está publicada.'}</p>
                        <div className="mt-8">
                            <Link to="/">
                                <Button>Volver al inicio</Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </Layout>
        )
    }

    const accent = landing.accentColor || '#2563eb'

    return (
        <Layout>
            <section
                data-track-section={`campaign-hero-${landing.slug}`}
                className={`relative min-h-[72vh] px-6 pt-24 pb-20 overflow-hidden ${landing.backgroundStyle === 'light-grid' ? 'bg-slate-50 infra-grid' : 'bg-slate-950'}`}
            >
                {landing.backgroundStyle !== 'light-grid' && (
                    <div className="absolute inset-0 dot-pattern opacity-10" />
                )}
                <div className="max-w-7xl mx-auto relative">
                    <Link to="/" className={`inline-flex items-center text-xs font-black uppercase tracking-widest mb-10 ${landing.backgroundStyle === 'light-grid' ? 'text-slate-400 hover:text-brand-primary' : 'text-white/40 hover:text-white/70'}`}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Inicio
                    </Link>
                    <div className="max-w-4xl">
                        <div className={`text-[11px] font-black uppercase tracking-[0.35em] ${landing.backgroundStyle === 'light-grid' ? 'text-slate-500' : 'text-white/55'}`}>
                            {landing.heroEyebrow}
                        </div>
                        <h1 className={`mt-6 text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] ${landing.backgroundStyle === 'light-grid' ? 'text-slate-900' : 'text-white'}`}>
                            {landing.heroTitle}
                        </h1>
                        <p className={`mt-6 text-xl max-w-3xl font-light leading-relaxed ${landing.backgroundStyle === 'light-grid' ? 'text-slate-600' : 'text-white/60'}`}>
                            {landing.heroSubtitle}
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            <Link
                                to={landing.primaryCtaHref || '/#contacto'}
                                className="h-12 px-6 text-white text-xs font-black uppercase tracking-[0.2em] inline-flex items-center justify-center"
                                style={{ backgroundColor: accent }}
                            >
                                {landing.primaryCtaLabel || 'Iniciar'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                to={landing.secondaryCtaHref || '/#servicios'}
                                className={`h-12 px-6 text-xs font-black uppercase tracking-[0.2em] inline-flex items-center justify-center border ${landing.backgroundStyle === 'light-grid' ? 'border-slate-300 text-slate-700 hover:text-slate-900' : 'border-white/25 text-white/75 hover:text-white'}`}
                            >
                                {landing.secondaryCtaLabel || 'Ver más'}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section data-track-section={`campaign-body-${landing.slug}`} className="py-24 px-6 bg-white border-y border-slate-200">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {landing.sections.map((section) => (
                        <article key={section.id} className="border border-slate-200 bg-white p-8">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">{section.title}</h2>
                            <p className="mt-4 text-slate-600 font-light leading-relaxed">{section.body}</p>
                            <ul className="mt-6 space-y-3">
                                {section.bullets.map((bullet, index) => (
                                    <li key={`${section.id}-${index}`} className="text-sm font-semibold text-slate-700 flex items-start gap-2">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section data-track-section={`campaign-conversion-${landing.slug}`} className="py-24 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                    <div className="bg-slate-900 text-white p-10">
                        <div className="text-[11px] font-black uppercase tracking-[0.35em] text-white/45">Oferta focalizada</div>
                        <h3 className="mt-4 text-4xl font-black tracking-tight">{landing.offerTitle}</h3>
                        <p className="mt-5 text-white/65 leading-relaxed">{landing.offerBody}</p>
                        <div className="mt-8 text-sm text-white/50">
                            {landing.thankYouMessage}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 md:p-10">
                        <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">Conversión</div>
                        <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{landing.formTitle}</h3>
                        <div className="mt-6">
                            <ContactForm context="general" serviceSlug={landing.slug} />
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
