import { useMemo, useState } from 'react'
import { Megaphone, Copy, FlaskConical, Link, Save, Sparkles, Accessibility, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useCMS, type SiteConfig } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'

type SelectedVariants = Record<string, string>

type A11yFinding = {
    id: string
    severity: 'high' | 'medium' | 'low'
    message: string
    count: number
    samples?: string[]
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { })
}

function SelectField({
    value,
    onChange,
    options,
}: {
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all duration-200"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

export function ManageMarketing() {
    const { state, updateSite } = useCMS()
    const [selected, setSelected] = useState<SelectedVariants>({})
    const [utmSource, setUtmSource] = useState('linkedin')
    const [utmMedium, setUtmMedium] = useState('social')
    const [utmCampaign, setUtmCampaign] = useState('q1-2026')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [draft, setDraft] = useState<SiteConfig>({ ...state.site })
    const [aiObjective, setAiObjective] = useState('Captar leads para diagnóstico de madurez digital.')
    const [aiAudience, setAiAudience] = useState('Directores de operaciones y tecnología')
    const [aiTone, setAiTone] = useState('Directo y consultivo')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)
    const [scanPath, setScanPath] = useState('/')
    const [scanLoading, setScanLoading] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [scanScore, setScanScore] = useState<number | null>(null)
    const [scanFindings, setScanFindings] = useState<A11yFinding[]>([])

    const pick = (serviceSlug: string, variant: string) => {
        setSelected((s) => ({ ...s, [serviceSlug]: variant }))
    }

    const setSite = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = () => {
        updateSite(draft)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const buildUTM = (path: string) => {
        const base = (state.site.url || 'https://algoritmot.com').replace(/\/+$/, '')
        return `${base}${path}?utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`
    }

    const handleCopy = (id: string, url: string) => {
        copyToClipboard(url)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const popupPreview = useMemo(() => ({
        title: draft.popupTitle || 'Agenda una sesión estratégica',
        body: draft.popupBody || 'Te ayudamos a definir un roadmap realista de transformación digital.',
        ctaLabel: draft.popupCtaLabel || 'Quiero mi sesión',
        dismissLabel: draft.popupDismissLabel || 'Ahora no',
    }), [draft.popupBody, draft.popupCtaLabel, draft.popupDismissLabel, draft.popupTitle])

    const generateAiCopy = async () => {
        setAiLoading(true)
        setAiError(null)
        try {
            const response = await fetch('/api/admin/ai-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objective: aiObjective,
                    audience: aiAudience,
                    tone: aiTone,
                    locale: 'es',
                }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setDraft((prev) => ({
                ...prev,
                popupTitle: json.data.title || prev.popupTitle,
                popupBody: json.data.body || prev.popupBody,
                popupCtaLabel: json.data.ctaLabel || prev.popupCtaLabel,
                popupCtaHref: json.data.ctaHref || prev.popupCtaHref,
                popupDismissLabel: json.data.dismissLabel || prev.popupDismissLabel,
            }))
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'No se pudo generar copy')
        } finally {
            setAiLoading(false)
        }
    }

    const runAccessibilityScan = async () => {
        setScanLoading(true)
        setScanError(null)
        try {
            const path = scanPath.trim().startsWith('/') ? scanPath.trim() : '/'
            const response = await fetch(`/api/admin/accessibility-scan?path=${encodeURIComponent(path)}`)
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setScanScore(Number(json.score || 0))
            setScanFindings(Array.isArray(json.findings) ? json.findings : [])
        } catch (error) {
            setScanError(error instanceof Error ? error.message : 'No se pudo ejecutar el escaneo')
            setScanScore(null)
            setScanFindings([])
        } finally {
            setScanLoading(false)
        }
    }

    return (
        <div className="space-y-12 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Marketing</h1>
                    <p className="text-slate-500 font-light">Popup Builder, AI copy, formularios de conversión, UTM y escaneo de accesibilidad.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                >
                    <Save className="w-5 h-5" />
                    Guardar Marketing
                </button>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Configuración de marketing guardada
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Popup Builder</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Popup activo">
                            <SelectField
                                value={draft.popupEnabled}
                                onChange={(v) => setSite('popupEnabled', v)}
                                options={[
                                    { value: 'false', label: 'Desactivado' },
                                    { value: 'true', label: 'Activado' },
                                ]}
                            />
                        </Field>
                        <Field label="Trigger">
                            <SelectField
                                value={draft.popupTrigger}
                                onChange={(v) => setSite('popupTrigger', v)}
                                options={[
                                    { value: 'time', label: 'Por tiempo' },
                                    { value: 'scroll', label: 'Por scroll' },
                                    { value: 'exit', label: 'Por intención de salida' },
                                ]}
                            />
                        </Field>
                        <Field label="Páginas objetivo">
                            <SelectField
                                value={draft.popupPages}
                                onChange={(v) => setSite('popupPages', v)}
                                options={[
                                    { value: 'all', label: 'Todo el sitio' },
                                    { value: 'home', label: 'Solo Home' },
                                    { value: 'services', label: 'Servicios' },
                                    { value: 'products', label: 'Productos' },
                                    { value: 'protocols', label: 'Protocolos' },
                                ]}
                            />
                        </Field>
                        <Field label="Frecuencia">
                            <SelectField
                                value={draft.popupFrequency}
                                onChange={(v) => setSite('popupFrequency', v)}
                                options={[
                                    { value: 'once_session', label: '1 vez por sesión' },
                                    { value: 'once_day', label: '1 vez por día' },
                                    { value: 'always', label: 'Siempre mostrar' },
                                ]}
                            />
                        </Field>
                        <Field label="Delay (segundos)">
                            <Input value={draft.popupDelaySeconds} onChange={(e) => setSite('popupDelaySeconds', e.target.value)} />
                        </Field>
                        <Field label="Scroll %">
                            <Input value={draft.popupScrollPercent} onChange={(e) => setSite('popupScrollPercent', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Título popup">
                        <Input value={draft.popupTitle} onChange={(e) => setSite('popupTitle', e.target.value)} />
                    </Field>
                    <Field label="Mensaje popup">
                        <Textarea rows={3} value={draft.popupBody} onChange={(e) => setSite('popupBody', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="CTA label">
                            <Input value={draft.popupCtaLabel} onChange={(e) => setSite('popupCtaLabel', e.target.value)} />
                        </Field>
                        <Field label="CTA URL">
                            <Input value={draft.popupCtaHref} onChange={(e) => setSite('popupCtaHref', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Label botón dismiss">
                        <Input value={draft.popupDismissLabel} onChange={(e) => setSite('popupDismissLabel', e.target.value)} />
                    </Field>
                    <div className="border border-slate-200 bg-slate-50 p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</div>
                        <div className="mt-3 text-xl font-black tracking-tight text-slate-900">{popupPreview.title}</div>
                        <div className="mt-2 text-sm text-slate-600">{popupPreview.body}</div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="px-3 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest">{popupPreview.ctaLabel}</span>
                            <span className="px-3 py-2 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600">{popupPreview.dismissLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-brand-primary" />
                            <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Elementor AI · Copy Assistant</h2>
                        </div>
                        <Field label="Objetivo">
                            <Textarea rows={3} value={aiObjective} onChange={(e) => setAiObjective(e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Audiencia">
                                <Input value={aiAudience} onChange={(e) => setAiAudience(e.target.value)} />
                            </Field>
                            <Field label="Tono">
                                <Input value={aiTone} onChange={(e) => setAiTone(e.target.value)} />
                            </Field>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={generateAiCopy}
                                disabled={aiLoading}
                                className="h-11 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                            >
                                {aiLoading ? 'Generando...' : 'Generar copy con IA'}
                            </button>
                            {aiLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>
                        {aiError && (
                            <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                {aiError}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="w-5 h-5 text-brand-primary" />
                            <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Formulario de Conversión</h2>
                        </div>
                        <Field label="Mensaje éxito formulario">
                            <Textarea rows={3} value={draft.formSuccessMessage} onChange={(e) => setSite('formSuccessMessage', e.target.value)} />
                        </Field>
                        <Field label="Mensaje error formulario">
                            <Textarea rows={3} value={draft.formErrorMessage} onChange={(e) => setSite('formErrorMessage', e.target.value)} />
                        </Field>
                        <div className="text-xs text-slate-500">
                            El formulario se envía por `POST /api/contact-submit` y puede reenviar a webhook con `CONTACT_FORM_WEBHOOK_URL`.
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FlaskConical className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Selector de Variantes A/B</h2>
                    </div>

                    {state.services.map((service) => {
                        const currentVariant = selected[service.slug] || service.ctaPrimary
                        const allOptions = [
                            service.ctaPrimary,
                            service.ctaSecondary,
                            ...((service.variants ?? []).map((v) => v.titular).filter(Boolean)).slice(0, 4),
                        ].filter(Boolean)

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
                            </div>
                        )
                    })}
                </div>

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
                                    onChange={(e) => setUtmSource(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_medium</label>
                                <input
                                    type="text"
                                    value={utmMedium}
                                    onChange={(e) => setUtmMedium(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_campaign</label>
                                <input
                                    type="text"
                                    value={utmCampaign}
                                    onChange={(e) => setUtmCampaign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">URLs Generadas</div>
                            {state.services.map((service) => {
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

            <div className="bg-white border border-slate-200 p-8 space-y-5">
                <div className="flex items-center gap-3">
                    <Accessibility className="w-5 h-5 text-brand-primary" />
                    <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Escaneo de Accesibilidad (rápido)</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <Input value={scanPath} onChange={(e) => setScanPath(e.target.value)} placeholder="/, /servicios/adn-digital, /productos/..." />
                    <button
                        type="button"
                        onClick={runAccessibilityScan}
                        disabled={scanLoading}
                        className="h-11 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                    >
                        {scanLoading ? 'Escaneando...' : 'Ejecutar scan'}
                    </button>
                </div>
                {scanError && (
                    <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {scanError}
                    </div>
                )}
                {scanScore !== null && (
                    <div className="border border-slate-200 bg-slate-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score A11Y</div>
                        <div className="text-3xl font-black tracking-tight text-slate-900 mt-1">{scanScore}/100</div>
                    </div>
                )}
                {scanFindings.length > 0 && (
                    <div className="space-y-3">
                        {scanFindings.map((finding) => (
                            <div key={finding.id} className="border border-slate-200 p-4 bg-white">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-900">{finding.message}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${finding.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' : finding.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        {finding.severity} · {finding.count}
                                    </div>
                                </div>
                                {finding.samples && finding.samples.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {finding.samples.map((sample, idx) => (
                                            <div key={`${finding.id}-${idx}`} className="bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-[10px] text-slate-500 break-all">
                                                {sample}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
