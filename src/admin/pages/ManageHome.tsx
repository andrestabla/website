import { useEffect, useMemo, useState, useRef, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Save,
    Home,
    Monitor,
    Sparkles,
    Package,
    ShieldCheck,
    Mail,
    Palette,
    Braces,
    CheckCircle2,
    UploadCloud,
    Minus,
    Plus,
    MousePointer2,
    Layout,
    Zap,
    ArrowRight,
    Briefcase
} from 'lucide-react'
import { useCMS, type HeroContent, type HomePageContent, type DesignTokens } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'
import { HeroView } from '../../sections/Hero/HeroView'

type Tab = 'hero' | 'services' | 'products' | 'frameworks' | 'contact' | 'visual' | 'advanced' | 'structure'

const COLOR_SWATCHES = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#0f172a', '#1a2d5a', '#2563eb', '#3b82f6', '#f97316']
const FONT_PRESETS = ['Inter', 'Space Grotesk', 'Manrope', 'Sora', 'IBM Plex Sans', 'Montserrat', 'Poppins', 'system-ui']

function getYouTubeId(url: string): string | null {
    if (!url) return null
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '') || null
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v')
            if (v) return v
            const parts = u.pathname.split('/').filter(Boolean)
            const idx = parts.findIndex(p => p === 'embed' || p === 'shorts')
            if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
        }
    } catch { }
    return null
}

function getYouTubeEmbedUrl(url: string): string | null {
    const id = getYouTubeId(url)
    if (!id) return null
    const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        controls: '0',
        loop: '1',
        playlist: id,
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
    })
    return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

function parseRem(value: string, fallback: number) {
    const n = Number(String(value).replace('rem', '').trim())
    return Number.isFinite(n) ? n : fallback
}

function formatRem(value: number) {
    return `${Math.round(value * 100) / 100}rem`
}

function getPreviewDesignVars(tokens: DesignTokens): CSSProperties {
    const radii: Record<string, string> = {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
    }
    return {
        ['--color-brand-primary' as any]: tokens.colorPrimary,
        ['--color-brand-secondary' as any]: tokens.colorSecondary,
        ['--color-brand-surface' as any]: tokens.colorSurface,
        ['--cms-radius' as any]: radii[tokens.borderRadius] ?? '0px',
        ['--cms-dark' as any]: tokens.colorDark,
        ['--cms-grid-opacity' as any]: tokens.gridOpacity,
        ['--cms-button-primary-text' as any]: tokens.buttonPrimaryTextColor || '#ffffff',
        ['--cms-button-outline-text' as any]: tokens.buttonOutlineTextColor || '#ffffff',
        ['--cms-button-outline-border' as any]: tokens.buttonOutlineBorderColor || '#ffffff',
        ['--font-sans' as any]: `"${tokens.fontBody}", system-ui, sans-serif`,
        ['--font-display' as any]: `"${tokens.fontDisplay}", serif`,
    } as CSSProperties
}

function StepperField({
    label,
    value,
    onChange,
    step = 1,
    min,
    max,
    hint,
}: {
    label: string
    value: number
    onChange: (next: number) => void
    step?: number
    min?: number
    max?: number
    hint?: string
}) {
    const clamp = (n: number) => {
        if (typeof min === 'number') n = Math.max(min, n)
        if (typeof max === 'number') n = Math.min(max, n)
        return Math.round(n * 100) / 100
    }
    return (
        <Field label={label} hint={hint}>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => onChange(clamp(value - step))} className="h-12 w-12 border border-slate-200 bg-white hover:border-brand-primary flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                </button>
                <input
                    type="number"
                    step={step}
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(clamp(Number(e.target.value || 0)))}
                    className="w-full bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-900 focus:border-brand-primary focus:bg-white outline-none transition-colors"
                />
                <button type="button" onClick={() => onChange(clamp(value + step))} className="h-12 w-12 border border-slate-200 bg-white hover:border-brand-primary flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </Field>
    )
}

function RangeField({
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
}: {
    label: string
    value: number
    onChange: (next: number) => void
    min?: number
    max?: number
    step?: number
}) {
    return (
        <Field label={label}>
            <div className="space-y-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full accent-[var(--color-brand-primary)]"
                />
                <div className="text-xs font-bold text-slate-500">{value.toFixed(2)}</div>
            </div>
        </Field>
    )
}

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (next: string) => void
}) {
    return (
        <Field label={label}>
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={value || '#000000'}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-12 w-16 border border-slate-200 bg-white p-1 cursor-pointer"
                    />
                    <Input value={value} onChange={(e) => onChange(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map((swatch) => (
                        <button
                            key={swatch}
                            type="button"
                            title={swatch}
                            onClick={() => onChange(swatch)}
                            className={`h-7 w-7 border ${value?.toLowerCase() === swatch ? 'border-slate-900 ring-2 ring-slate-300' : 'border-slate-200'}`}
                            style={{ backgroundColor: swatch }}
                        />
                    ))}
                </div>
            </div>
        </Field>
    )
}

function FontField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (next: string) => void
}) {
    return (
        <Field label={label}>
            <div className="space-y-3">
                <Input value={value} onChange={(e) => onChange(e.target.value)} list={`font-list-${label.replace(/\s+/g, '-').toLowerCase()}`} />
                <datalist id={`font-list-${label.replace(/\s+/g, '-').toLowerCase()}`}>
                    {FONT_PRESETS.map((font) => <option key={font} value={font} />)}
                </datalist>
                <div className="flex flex-wrap gap-2">
                    {FONT_PRESETS.map((font) => (
                        <button
                            key={font}
                            type="button"
                            onClick={() => onChange(font)}
                            className={`px-3 py-1.5 text-[11px] font-bold border transition-colors ${value === font ? 'border-brand-primary text-brand-primary bg-blue-50' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
                        >
                            {font}
                        </button>
                    ))}
                </div>
            </div>
        </Field>
    )
}

function JsonEditor({ value, onChange }: { value: unknown; onChange: (next: any) => void }) {
    const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2))
    const [error, setError] = useState('')
    useEffect(() => {
        setRaw(JSON.stringify(value, null, 2))
    }, [value])
    return (
        <div className="space-y-3">
            <Textarea
                rows={22}
                value={raw}
                onChange={(e) => {
                    const nextRaw = e.target.value
                    setRaw(nextRaw)
                    try {
                        const parsed = JSON.parse(nextRaw)
                        setError('')
                        onChange(parsed)
                    } catch (err: any) {
                        setError(err?.message || 'JSON inválido')
                    }
                }}
                className={error ? 'border-red-300' : ''}
            />
            {error && <div className="text-xs font-bold text-red-600">{error}</div>}
        </div>
    )
}

function R2ImageUploadButton({
    folder,
    onUploaded,
}: {
    folder: string
    onUploaded: (url: string) => void
}) {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState('')

    const uploadFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten imágenes.')
            return
        }
        if (file.size > 4 * 1024 * 1024) {
            setError('Máximo 4MB por imagen.')
            return
        }
        setError('')
        setIsUploading(true)
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const result = String(reader.result || '')
                    const payload = result.includes(',') ? result.split(',')[1] : result
                    resolve(payload)
                }
                reader.onerror = () => reject(reader.error)
                reader.readAsDataURL(file)
            })

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    base64,
                    folder,
                }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok || !json?.ok || !json?.data?.url) {
                throw new Error(json?.error || `HTTP ${res.status}`)
            }
            onUploaded(json.data.url)
            if (json?.warning) setError(String(json.warning))
        } catch (err: any) {
            setError(err?.message || 'Error subiendo a R2')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-brand-primary text-[11px] font-black uppercase tracking-widest cursor-pointer transition-colors">
                <UploadCloud className="w-4 h-4" />
                {isUploading ? 'Subiendo...' : 'Subir a R2'}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadFile(file)
                        e.currentTarget.value = ''
                    }}
                />
            </label>
            {error && <span className="text-xs font-bold text-red-600">{error}</span>}
        </div>
    )
}

function ImageUrlPreview({ url }: { url: string }) {
    if (!url?.trim()) return null
    const youtubeEmbed = getYouTubeEmbedUrl(url)
    return (
        <div className="border border-slate-200 bg-white p-2">
            {youtubeEmbed ? (
                <iframe
                    src={youtubeEmbed}
                    title="Video preview"
                    className="w-full h-40 bg-slate-50"
                    allow="autoplay; encrypted-media"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            ) : (
                <img
                    src={url}
                    alt="Preview"
                    className="w-full h-28 object-cover bg-slate-50"
                    onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        const sibling = target.nextElementSibling as HTMLElement | null
                        if (sibling) sibling.style.display = 'block'
                    }}
                />
            )}
            <div className="hidden text-xs font-bold text-amber-700 p-3">
                No se pudo cargar el recurso desde esa URL. Si es `r2.dev`, habilita la Public Development URL o configura `publicUrl` en Integraciones.
            </div>
        </div>
    )
}

export function ManageHome() {
    const { state, updateHero, updateHomePage, updateDesign } = useCMS()
    const navigate = useNavigate()
    const [tab, setTab] = useState<Tab>('hero')
    const [heroDraft, setHeroDraft] = useState<HeroContent>({ ...state.hero })
    const [homeDraft, setHomeDraft] = useState<HomePageContent>(() => JSON.parse(JSON.stringify(state.homePage)))
    const [designDraft, setDesignDraft] = useState<DesignTokens>({ ...state.design })
    const [saved, setSaved] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Refs for scrolling to fields
    const fieldRefs = {
        highlight: useRef<HTMLDivElement>(null),
        title: useRef<HTMLDivElement>(null),
        subtitle: useRef<HTMLDivElement>(null),
        cta: useRef<HTMLDivElement>(null),
        secondaryCta: useRef<HTMLDivElement>(null),
    }

    useEffect(() => {
        setHeroDraft({ ...state.hero })
        setHomeDraft(JSON.parse(JSON.stringify(state.homePage)))
        setDesignDraft({ ...state.design })
    }, [state.hero, state.homePage, state.design])

    const scrollToField = (key: keyof typeof fieldRefs) => {
        fieldRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const el = fieldRefs[key]?.current
        if (el) {
            el.classList.add('ring-2', 'ring-brand-primary', 'ring-offset-4')
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-brand-primary', 'ring-offset-4')
            }, 2000)
        }
    }

    const saveAll = async () => {
        setIsSaving(true)
        await Promise.all([
            updateHero(heroDraft),
            updateHomePage(homeDraft),
            updateDesign(designDraft)
        ])
        setIsSaving(false)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 3000)
    }

    const tabs = useMemo(() => [
        { id: 'hero' as Tab, label: 'Hero Principal', icon: Layout },
        { id: 'structure' as Tab, label: 'Estructura Home', icon: Sparkles },
        { id: 'services' as Tab, label: 'Servicios', icon: Briefcase },
        { id: 'products' as Tab, label: 'Productos', icon: Package },
        { id: 'frameworks' as Tab, label: 'Frameworks', icon: ShieldCheck },
        { id: 'contact' as Tab, label: 'Contacto', icon: Mail },
        { id: 'visual' as Tab, label: 'Visual Global', icon: Palette },
        { id: 'advanced' as Tab, label: 'JSON Avanzado', icon: Braces },
    ], [])

    const setHome = (next: HomePageContent) => setHomeDraft(next)
    const setHeroStyle = <K extends keyof HomePageContent['hero']['style']>(key: K, value: HomePageContent['hero']['style'][K]) => {
        setHome({
            ...homeDraft,
            hero: {
                ...homeDraft.hero,
                style: { ...homeDraft.hero.style, [key]: value },
            },
        })
    }

    const hasChanges = JSON.stringify(state.hero) !== JSON.stringify(heroDraft) ||
        JSON.stringify(state.homePage) !== JSON.stringify(homeDraft) ||
        JSON.stringify(state.design) !== JSON.stringify(designDraft)

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
            {/* Header with quick actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-[0.3em] mb-3">
                        <Zap className="w-3 h-3 fill-current" />
                        Editor en Vivo
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Home Page</h1>
                    <p className="text-slate-500 font-medium max-w-xl">
                        Gestiona el primer impacto de tu sitio. Los cambios se previsualizan al instante antes de publicar.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors pr-4 border-r border-slate-200"
                    >
                        <Home className="w-4 h-4" />
                        Ver Sitio
                    </a>
                    <button
                        onClick={saveAll}
                        disabled={!hasChanges || isSaving}
                        className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${hasChanges
                            ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className={`w-5 h-5 transition-transform ${hasChanges && 'group-hover:rotate-12'}`} />
                        )}
                        {hasChanges ? 'Publicar Cambios' : 'Sin Cambios'}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {saved && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-2xl text-emerald-800 font-bold text-sm shadow-sm"
                    >
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        Contenido actualizado con éxito en la base de datos de Neon
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                {tabs.map(t => {
                    const Icon = t.icon
                    const isSelected = tab === t.id
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isSelected
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Contents */}
            <div className="mt-8">
                {tab === 'hero' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6 order-2 xl:order-1">
                            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                    <h3 className="font-black text-slate-900 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                        Textos Principales
                                    </h3>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                                        Hero Editor
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div ref={fieldRefs.highlight}>
                                        <Field label="Highlight"><Input value={heroDraft.highlight} onChange={e => setHeroDraft(d => ({ ...d, highlight: e.target.value }))} /></Field>
                                    </div>
                                    <div ref={fieldRefs.title}>
                                        <Field label="Titular (H1)"><Textarea rows={3} value={heroDraft.title} onChange={e => setHeroDraft(d => ({ ...d, title: e.target.value }))} /></Field>
                                    </div>
                                    <div ref={fieldRefs.subtitle}>
                                        <Field label="Subtítulo"><Textarea rows={3} value={heroDraft.subtitle} onChange={e => setHeroDraft(d => ({ ...d, subtitle: e.target.value }))} /></Field>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div ref={fieldRefs.cta}>
                                            <Field label="CTA Principal"><Input value={heroDraft.cta} onChange={e => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                                        </div>
                                        <div ref={fieldRefs.secondaryCta}>
                                            <Field label="CTA Secundario"><Input value={heroDraft.secondaryCta} onChange={e => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Estilos del Hero</div>
                                <ColorField label="Color fondo sección" value={homeDraft.hero.style.backgroundColor} onChange={(v) => setHeroStyle('backgroundColor', v)} />
                                <Field label="Imagen/Video fondo">
                                    <div className="space-y-3">
                                        <Input value={homeDraft.hero.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, backgroundImageUrl: e.target.value } } })} />
                                        <ImageUrlPreview url={homeDraft.hero.style.backgroundImageUrl} />
                                    </div>
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorField label="Color filtro" value={homeDraft.hero.style.sectionOverlayColor} onChange={(v) => setHeroStyle('sectionOverlayColor', v)} />
                                    <RangeField label="Opacidad filtro" value={Number(homeDraft.hero.style.sectionOverlayOpacity || '0.92')} onChange={(v) => setHeroStyle('sectionOverlayOpacity', v.toFixed(2))} />
                                </div>
                            </div>
                        </div>

                        <div className="sticky top-10 order-1 xl:order-2 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-4">Preview Live</div>
                            <div className="relative group bg-[#0F172A] rounded-[2.5rem] border-[12px] border-slate-900 shadow-2xl overflow-hidden aspect-[16/10] flex items-center justify-center p-12 text-center select-none">
                                <div className="relative z-10 space-y-8 max-w-2xl">
                                    <motion.div onClick={() => scrollToField('highlight')} className="cursor-pointer hover:ring-2 hover:ring-brand-primary p-2">
                                        <div className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-2">
                                            {heroDraft.highlight || 'Highlight'}
                                        </div>
                                    </motion.div>
                                    <motion.h2 onClick={() => scrollToField('title')} className="text-4xl font-black text-white cursor-pointer hover:ring-2 hover:ring-brand-primary p-2">
                                        {heroDraft.title || 'Main Title'}
                                    </motion.h2>
                                    <motion.p onClick={() => scrollToField('subtitle')} className="text-slate-400 font-medium cursor-pointer hover:ring-2 hover:ring-brand-primary p-2">
                                        {heroDraft.subtitle || 'Supporting description.'}
                                    </motion.p>
                                    <div className="flex gap-4 justify-center">
                                        <div onClick={() => scrollToField('cta')} className="px-6 py-3 bg-brand-primary text-white font-black text-[10px] uppercase rounded-xl cursor-pointer">
                                            {heroDraft.cta || 'CTA'}
                                        </div>
                                        <div onClick={() => scrollToField('secondaryCta')} className="px-6 py-3 border border-white/20 text-white font-black text-[10px] uppercase rounded-xl cursor-pointer">
                                            {heroDraft.secondaryCta || 'Learn More'}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent)]" />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'services' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                            <Field label="Eyebrow"><Input value={homeDraft.servicesSection.eyebrow} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, eyebrow: e.target.value } })} /></Field>
                            <Field label="Título sección"><Textarea rows={2} value={homeDraft.servicesSection.title} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, title: e.target.value } })} /></Field>
                            <Field label="Subtítulo sección"><Textarea rows={3} value={homeDraft.servicesSection.subtitle} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, subtitle: e.target.value } })} /></Field>
                            <ColorField label="Color fondo" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                        </div>
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Servicios vinculados</div>
                            {state.services.map(s => (
                                <div key={s.slug} className="border border-slate-100 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all">
                                    <div>
                                        <div className="font-black text-slate-900">{s.title}</div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">{s.category}</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-primary" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'products' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                            <Field label="Eyebrow"><Input value={homeDraft.productsSection.eyebrow} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, eyebrow: e.target.value } })} /></Field>
                            <Field label="Título sección"><Textarea rows={2} value={homeDraft.productsSection.title} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, title: e.target.value } })} /></Field>
                            <Field label="Label precio"><Input value={homeDraft.productsSection.availabilityPricingLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, availabilityPricingLabel: e.target.value } })} /></Field>
                            <ColorField label="Color fondo" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                        </div>
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Productos vinculados</div>
                            {state.products.map(p => (
                                <div key={p.slug} className="border border-slate-100 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all">
                                    <div className="font-black text-slate-900">{p.title}</div>
                                    <div className="text-xs font-bold text-brand-primary">{p.price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'visual' && (
                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-8 border-b border-slate-100 pb-4">Identidad Visual</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ColorField label="Primario" value={designDraft.colorPrimary} onChange={v => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                                <ColorField label="Secundario" value={designDraft.colorSecondary} onChange={v => setDesignDraft(d => ({ ...d, colorSecondary: v }))} />
                                <FontField label="Fuente Display" value={designDraft.fontDisplay} onChange={v => setDesignDraft(d => ({ ...d, fontDisplay: v }))} />
                                <FontField label="Fuente Body" value={designDraft.fontBody} onChange={v => setDesignDraft(d => ({ ...d, fontBody: v }))} />
                            </div>
                        </div>
                        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <div className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: designDraft.colorPrimary }}>Preview Visual</div>
                                <h2 className="text-6xl font-black tracking-tighter" style={{ fontFamily: designDraft.fontDisplay }}>Digital Transformation</h2>
                                <p className="text-slate-400 text-lg max-w-xl" style={{ fontFamily: designDraft.fontBody }}>Esta es una vista previa de cómo interactúan tus tipografías y colores principales en un entorno oscuro.</p>
                                <div className="flex gap-4 pt-4">
                                    <div className="px-8 py-4 bg-brand-primary text-white font-black text-xs uppercase tracking-widest rounded-xl" style={{ backgroundColor: designDraft.colorPrimary }}>Botón Primario</div>
                                    <div className="px-8 py-4 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded-xl">Botón Outline</div>
                                </div>
                            </div>
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${designDraft.colorPrimary} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
                        </div>
                    </div>
                )}

                {tab === 'advanced' && (
                    <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Editor JSON Avanzado</div>
                            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Atención: Cambios directos</div>
                        </div>
                        <JsonEditor value={homeDraft} onChange={v => setHomeDraft(v)} />
                    </div>
                )}

                {tab === 'sections' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { title: 'Servicios', icon: Briefcase, desc: 'Configura la cabecera de servicios.' },
                            { title: 'Productos', icon: Package, desc: 'Configura la cabecera de la tienda.' }
                        ].map(s => (
                            <div key={s.title} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm group hover:border-brand-primary transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
                                        <s.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-xl">{s.title}</h3>
                                        <p className="text-sm text-slate-400">{s.desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate(`/admin/${s.title.toLowerCase()}`)} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                                    Abrir Editor Específico
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
