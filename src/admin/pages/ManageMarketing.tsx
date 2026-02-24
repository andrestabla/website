import { useState } from 'react'
import { servicesDetail } from '../../data/details'
import { Megaphone, Copy, FlaskConical, Link } from 'lucide-react'

type SelectedVariants = Record<string, string>

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { })
}

export function ManageMarketing() {
    const [selected, setSelected] = useState<SelectedVariants>({})
    const [utmSource, setUtmSource] = useState('linkedin')
    const [utmMedium, setUtmMedium] = useState('social')
    const [utmCampaign, setUtmCampaign] = useState('feb-2026')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const pick = (serviceSlug: string, variant: string) => {
        setSelected(s => ({ ...s, [serviceSlug]: variant }))
    }

    const buildUTM = (path: string) => {
        return `https://algoritmot.com${path}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`
    }

    const handleCopy = (id: string, url: string) => {
        copyToClipboard(url)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="space-y-12 pb-20">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Marketing</h1>
                <p className="text-slate-500 font-light">Gestiona variantes de CTAs por servicio y construye URLs de campañas con parámetros UTM.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* A/B CTA Manager */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FlaskConical className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Selector de Variantes A/B</h2>
                    </div>

                    {servicesDetail.map(service => {
                        const currentVariant = selected[service.slug] || service.ctaPrimary
                        const allOptions = [
                            service.ctaPrimary,
                            service.ctaSecondary,
                            ...(service.ctaVariants?.[0]?.alt ?? []).slice(0, 4),
                        ]

                        return (
                            <div key={service.slug} className="bg-white border border-slate-200 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="font-black text-slate-900 tracking-tighter">{service.title}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{service.highlight}</div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-blue-50 px-2 py-1">
                                        Activo
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {allOptions.map((variant, i) => (
                                        <button
                                            key={i}
                                            onClick={() => pick(service.slug, variant)}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold transition-all border ${currentVariant === variant
                                                ? 'bg-brand-primary text-white border-brand-primary'
                                                : 'bg-slate-50 text-slate-700 border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            <span>{variant}</span>
                                            {i === 0 && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 ${currentVariant === variant ? 'bg-white/20 text-white' : 'bg-blue-50 text-brand-primary'}`}>Original</span>}
                                        </button>
                                    ))}
                                </div>

                                {service.abHypothesis && (
                                    <p className="mt-4 text-xs text-slate-400 italic border-l-2 border-slate-200 pl-3">
                                        {service.abHypothesis}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* UTM Builder */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Constructor de UTM</h2>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 space-y-6 sticky top-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_source</label>
                                <input
                                    type="text"
                                    value={utmSource}
                                    onChange={e => setUtmSource(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                    placeholder="linkedin, google, email..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_medium</label>
                                <input
                                    type="text"
                                    value={utmMedium}
                                    onChange={e => setUtmMedium(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                    placeholder="social, email, cpc..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_campaign</label>
                                <input
                                    type="text"
                                    value={utmCampaign}
                                    onChange={e => setUtmCampaign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                    placeholder="feb-2026, black-friday..."
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">URLs Generadas</div>
                            {servicesDetail.map(service => {
                                const url = buildUTM(`/servicios/${service.slug}`)
                                return (
                                    <div key={service.slug} className="flex items-center gap-3 group">
                                        <div className="flex-1 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-500 truncate border border-slate-100">
                                            {url}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(service.slug, url)}
                                            className="p-2 text-slate-400 hover:text-brand-primary transition-colors shrink-0"
                                            title="Copiar URL"
                                        >
                                            {copiedId === service.slug
                                                ? <Link className="w-4 h-4 text-green-500" />
                                                : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
