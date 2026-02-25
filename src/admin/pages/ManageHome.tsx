import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
    Save, Home, Monitor, Sparkles, Package, ShieldCheck, Mail, Palette, Braces, CheckCircle2, UploadCloud, Minus, Plus
} from 'lucide-react'
import { useCMS, type HeroContent, type HomePageContent, type DesignTokens } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'
import { HeroView } from '../../sections/Hero/HeroView'

type Tab = 'hero' | 'services' | 'products' | 'frameworks' | 'contact' | 'visual' | 'advanced'

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
    const [tab, setTab] = useState<Tab>('hero')
    const [heroDraft, setHeroDraft] = useState<HeroContent>({ ...state.hero })
    const [homeDraft, setHomeDraft] = useState<HomePageContent>(() => JSON.parse(JSON.stringify(state.homePage)))
    const [designDraft, setDesignDraft] = useState<DesignTokens>({ ...state.design })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setHeroDraft({ ...state.hero })
        setHomeDraft(JSON.parse(JSON.stringify(state.homePage)))
        setDesignDraft({ ...state.design })
    }, [state.hero, state.homePage, state.design])

    const tabs = useMemo(() => [
        { id: 'hero' as Tab, label: 'Hero', icon: Monitor },
        { id: 'services' as Tab, label: 'Servicios (Sección)', icon: Sparkles },
        { id: 'products' as Tab, label: 'Productos (Sección)', icon: Package },
        { id: 'frameworks' as Tab, label: 'Frameworks', icon: ShieldCheck },
        { id: 'contact' as Tab, label: 'Contacto', icon: Mail },
        { id: 'visual' as Tab, label: 'Visual Global', icon: Palette },
        { id: 'advanced' as Tab, label: 'JSON Avanzado', icon: Braces },
    ], [])

    const saveAll = () => {
        updateHero(heroDraft)
        updateHomePage(homeDraft)
        updateDesign(designDraft)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 3000)
    }

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

    return (
        <div className="space-y-10 pb-20">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Editor Completo del Home</h1>
                    <p className="text-slate-500 font-light">
                        Edita contenido, estilos e imágenes de todas las secciones del home en CMS real (servidor + Neon).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Ver Home
                    </a>
                    <button
                        onClick={saveAll}
                        className="flex items-center gap-2 px-8 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        Guardar Todo
                    </button>
                </div>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Home actualizado en servidor y base de datos
                </div>
            )}

            <div className="flex border-b border-slate-200 overflow-x-auto">
                {tabs.map(t => {
                    const Icon = t.icon
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`shrink-0 flex items-center gap-2 px-6 py-4 font-black text-[11px] uppercase tracking-widest transition-all border-b-2 ${tab === t.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {tab === 'hero' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Mapa de estilos del Hero</div>
                                <button
                                    type="button"
                                    onClick={() => setTab('visual')}
                                    className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                >
                                    Ir a Visual Global
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="border border-slate-200 p-3">
                                    <div className="font-black text-slate-900 mb-1">Título / Subtítulo / Filtros</div>
                                    <div className="text-slate-500">Se editan aquí en `Hero` (colores, tamaños, opacidades, fondo).</div>
                                </div>
                                <div className="border border-slate-200 p-3">
                                    <div className="font-black text-slate-900 mb-1">Botones CTA (colores)</div>
                                    <div className="text-slate-500">Puedes editarlos aquí abajo en “CTA rápido” o en `Visual Global`.</div>
                                </div>
                                <div className="border border-slate-200 p-3">
                                    <div className="font-black text-slate-900 mb-1">Tipografías globales</div>
                                    <div className="text-slate-500">Fuente body/display están en `Visual Global`.</div>
                                </div>
                                <div className="border border-slate-200 p-3">
                                    <div className="font-black text-slate-900 mb-1">Panel de stats</div>
                                    <div className="text-slate-500">Color de labels, valores, bordes y divisores se edita aquí.</div>
                                </div>
                            </div>
                        </div>

                        <Field label="Highlight"><Input value={heroDraft.highlight} onChange={e => setHeroDraft(d => ({ ...d, highlight: e.target.value }))} /></Field>
                        <Field label="Titular (H1)"><Textarea rows={3} value={heroDraft.title} onChange={e => setHeroDraft(d => ({ ...d, title: e.target.value }))} /></Field>
                        <Field label="Subtítulo"><Textarea rows={3} value={heroDraft.subtitle} onChange={e => setHeroDraft(d => ({ ...d, subtitle: e.target.value }))} /></Field>
                        <Field label="CTA Principal"><Input value={heroDraft.cta} onChange={e => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                        <Field label="CTA Secundario"><Input value={heroDraft.secondaryCta} onChange={e => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {homeDraft.hero.stats.map((stat, i) => (
                                <div key={i} className="border border-slate-200 p-4 space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stat {i + 1}</div>
                                    <Input value={stat.label} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, stats: homeDraft.hero.stats.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) } })} />
                                    <Input value={stat.value} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, stats: homeDraft.hero.stats.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s) } })} />
                                </div>
                            ))}
                        </div>

                        <div className="bg-white border border-slate-200 p-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Estilos e imágenes del Hero</div>
                            <ColorField label="Color fondo sección" value={homeDraft.hero.style.backgroundColor} onChange={(v) => setHeroStyle('backgroundColor', v)} />
                            <Field label="Imagen/Video fondo sección (URL o YouTube)">
                                <div className="space-y-3">
                                    <Input value={homeDraft.hero.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, backgroundImageUrl: e.target.value } } })} />
                                    <R2ImageUploadButton folder="home/hero" onUploaded={(url) => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, backgroundImageUrl: url } } })} />
                                    <ImageUrlPreview url={homeDraft.hero.style.backgroundImageUrl} />
                                </div>
                            </Field>
                            <ColorField label="Color panel derecho" value={homeDraft.hero.style.rightPanelBackgroundColor} onChange={(v) => setHeroStyle('rightPanelBackgroundColor', v)} />
                            <Field label="Imagen/Video panel derecho (URL o YouTube)">
                                <div className="space-y-3">
                                    <Input value={homeDraft.hero.style.rightPanelBackgroundImageUrl} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, rightPanelBackgroundImageUrl: e.target.value } } })} />
                                    <R2ImageUploadButton folder="home/hero-panel" onUploaded={(url) => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, rightPanelBackgroundImageUrl: url } } })} />
                                    <ImageUrlPreview url={homeDraft.hero.style.rightPanelBackgroundImageUrl} />
                                </div>
                            </Field>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <ColorField label="Color filtro sección" value={homeDraft.hero.style.sectionOverlayColor} onChange={(v) => setHeroStyle('sectionOverlayColor', v)} />
                                <RangeField label="Opacidad filtro sección" value={Number(homeDraft.hero.style.sectionOverlayOpacity || '0.92')} onChange={(v) => setHeroStyle('sectionOverlayOpacity', v.toFixed(2))} />
                                <ColorField label="Color filtro panel derecho" value={homeDraft.hero.style.rightPanelOverlayColor} onChange={(v) => setHeroStyle('rightPanelOverlayColor', v)} />
                                <RangeField label="Opacidad filtro panel" value={Number(homeDraft.hero.style.rightPanelOverlayOpacity || '0.90')} onChange={(v) => setHeroStyle('rightPanelOverlayOpacity', v.toFixed(2))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <ColorField label="Color highlight" value={homeDraft.hero.style.highlightColor} onChange={(v) => setHeroStyle('highlightColor', v)} />
                                <ColorField label="Color título" value={homeDraft.hero.style.titleColor} onChange={(v) => setHeroStyle('titleColor', v)} />
                                <ColorField label="Color acento título" value={homeDraft.hero.style.titleAccentColor} onChange={(v) => setHeroStyle('titleAccentColor', v)} />
                                <ColorField label="Color subtítulo" value={homeDraft.hero.style.subtitleColor} onChange={(v) => setHeroStyle('subtitleColor', v)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <StepperField label="Tamaño título móvil (rem)" value={parseRem(homeDraft.hero.style.titleFontSizeMobile, 4.5)} min={2} max={12} step={0.1} onChange={(v) => setHeroStyle('titleFontSizeMobile', formatRem(v))} />
                                <StepperField label="Tamaño título desktop (rem)" value={parseRem(homeDraft.hero.style.titleFontSizeDesktop, 8)} min={2} max={16} step={0.1} onChange={(v) => setHeroStyle('titleFontSizeDesktop', formatRem(v))} />
                                <StepperField label="Tamaño subtítulo móvil (rem)" value={parseRem(homeDraft.hero.style.subtitleFontSizeMobile, 1.5)} min={0.75} max={4} step={0.05} onChange={(v) => setHeroStyle('subtitleFontSizeMobile', formatRem(v))} />
                                <StepperField label="Tamaño subtítulo desktop (rem)" value={parseRem(homeDraft.hero.style.subtitleFontSizeDesktop, 1.875)} min={0.75} max={5} step={0.05} onChange={(v) => setHeroStyle('subtitleFontSizeDesktop', formatRem(v))} />
                                <StepperField label="Peso título (100-900)" value={Number(homeDraft.hero.style.titleFontWeight || '900')} min={100} max={900} step={100} onChange={(v) => setHeroStyle('titleFontWeight', String(v))} />
                                <StepperField label="Peso subtítulo (100-900)" value={Number(homeDraft.hero.style.subtitleFontWeight || '500')} min={100} max={900} step={100} onChange={(v) => setHeroStyle('subtitleFontWeight', String(v))} />
                                <StepperField label="Line-height título" value={Number(homeDraft.hero.style.titleLineHeight || '0.85')} min={0.6} max={1.4} step={0.01} onChange={(v) => setHeroStyle('titleLineHeight', v.toFixed(2))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <ColorField label="Color label stats" value={homeDraft.hero.style.statsLabelColor} onChange={(v) => setHeroStyle('statsLabelColor', v)} />
                                <ColorField label="Color valor stats" value={homeDraft.hero.style.statsValueColor} onChange={(v) => setHeroStyle('statsValueColor', v)} />
                                <ColorField label="Color divisores stats" value={homeDraft.hero.style.statsDividerColor} onChange={(v) => setHeroStyle('statsDividerColor', v)} />
                                <ColorField label="Color borde panel stats" value={homeDraft.hero.style.statsPanelBorderColor} onChange={(v) => setHeroStyle('statsPanelBorderColor', v)} />
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">CTA rápido (botones del Hero)</div>
                                    <button
                                        type="button"
                                        onClick={() => setTab('visual')}
                                        className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                    >
                                        Abrir Visual Global
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorField label="Color CTA principal" value={designDraft.colorPrimary} onChange={(v) => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                                    <ColorField label="Color CTA secundario" value={designDraft.colorSecondary} onChange={(v) => setDesignDraft(d => ({ ...d, colorSecondary: v }))} />
                                    <ColorField label="Texto CTA principal" value={designDraft.buttonPrimaryTextColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                                    <ColorField label="Texto CTA secundario" value={designDraft.buttonOutlineTextColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                    <ColorField label="Borde CTA secundario" value={designDraft.buttonOutlineBorderColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                    <Field label="Estilo botón (global)">
                                        <select
                                            value={designDraft.buttonStyle}
                                            onChange={(e) => setDesignDraft(d => ({ ...d, buttonStyle: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-900 focus:border-brand-primary focus:bg-white outline-none transition-colors"
                                        >
                                            <option value="sharp">Sharp</option>
                                            <option value="rounded">Rounded</option>
                                            <option value="pill">Pill</option>
                                        </select>
                                    </Field>
                                    <Field label="Border radius (global)">
                                        <select
                                            value={designDraft.borderRadius}
                                            onChange={(e) => setDesignDraft(d => ({ ...d, borderRadius: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-900 focus:border-brand-primary focus:bg-white outline-none transition-colors"
                                        >
                                            <option value="none">None</option>
                                            <option value="sm">SM</option>
                                            <option value="md">MD</option>
                                            <option value="lg">LG</option>
                                            <option value="full">Full</option>
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="sticky top-8 h-fit space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-1">Vista previa real (mismo render del sitio)</div>
                        <div className="border border-slate-200 bg-white overflow-hidden">
                            <div
                                className="origin-top-left pointer-events-none"
                                style={{
                                    width: 1280,
                                    transform: 'scale(0.47)',
                                    height: 430,
                                    ...getPreviewDesignVars(designDraft),
                                }}
                            >
                                <HeroView
                                    hero={heroDraft}
                                    heroSection={homeDraft.hero}
                                    animated={false}
                                />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            Esta vista usa el mismo componente del Home público. Si cambias aquí y luego <strong>Guardar Todo</strong>, el resultado publicado debe coincidir.
                        </div>
                    </div>
                </div>
            )}

            {tab === 'services' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6 bg-white border border-slate-200 p-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Contenido y Estilo</div>
                            <div className="text-xs font-bold text-slate-400">Sección Servicios</div>
                        </div>
                        <Field label="Eyebrow"><Input value={homeDraft.servicesSection.eyebrow} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, eyebrow: e.target.value } })} /></Field>
                        <Field label="Título sección"><Textarea rows={2} value={homeDraft.servicesSection.title} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, title: e.target.value } })} /></Field>
                        <Field label="Subtítulo sección"><Textarea rows={3} value={homeDraft.servicesSection.subtitle} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, subtitle: e.target.value } })} /></Field>
                        <Field label="Número decorativo"><Input value={homeDraft.servicesSection.sectionNumber} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, sectionNumber: e.target.value } })} /></Field>
                        <ColorField label="Color fondo" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                        <Field label="Imagen fondo (URL)">
                            <div className="space-y-3">
                                <Input value={homeDraft.servicesSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundImageUrl: e.target.value } } })} />
                                <R2ImageUploadButton folder="home/services" onUploaded={(url) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundImageUrl: url } } })} />
                                <ImageUrlPreview url={homeDraft.servicesSection.style.backgroundImageUrl} />
                            </div>
                        </Field>
                    </div>
                    <div className="bg-white border border-slate-200 p-8 space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Datos de tarjetas en Home</div>
                        <p className="text-sm text-slate-500">Los ítems de servicios visibles en Home se editan también en <strong>Servicios</strong> (mismo CMS real).</p>
                        <div className="space-y-4">
                            {state.services.map((s) => (
                                <div key={s.slug} className="border border-slate-200 p-4">
                                    <div className="font-black text-slate-900">{s.title}</div>
                                    <div className="text-sm text-slate-500">{s.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'products' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6 bg-white border border-slate-200 p-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Contenido y Estilo</div>
                            <div className="text-xs font-bold text-slate-400">Sección Productos</div>
                        </div>
                        <Field label="Eyebrow"><Input value={homeDraft.productsSection.eyebrow} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, eyebrow: e.target.value } })} /></Field>
                        <Field label="Título sección"><Textarea rows={2} value={homeDraft.productsSection.title} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, title: e.target.value } })} /></Field>
                        <Field label="Subtítulo sección"><Textarea rows={3} value={homeDraft.productsSection.subtitle} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, subtitle: e.target.value } })} /></Field>
                        <Field label="Label disponibilidad/precio"><Input value={homeDraft.productsSection.availabilityPricingLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, availabilityPricingLabel: e.target.value } })} /></Field>
                        <Field label="Texto botón tarjetas"><Input value={homeDraft.productsSection.deploySolutionLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, deploySolutionLabel: e.target.value } })} /></Field>
                        <ColorField label="Color fondo" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                        <Field label="Imagen fondo (URL)">
                            <div className="space-y-3">
                                <Input value={homeDraft.productsSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundImageUrl: e.target.value } } })} />
                                <R2ImageUploadButton folder="home/products" onUploaded={(url) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundImageUrl: url } } })} />
                                <ImageUrlPreview url={homeDraft.productsSection.style.backgroundImageUrl} />
                            </div>
                        </Field>
                    </div>
                    <div className="bg-white border border-slate-200 p-8 space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Productos visibles en Home</div>
                        {state.products.map((p) => (
                            <div key={p.slug} className="border border-slate-200 p-4">
                                <div className="font-black">{p.title}</div>
                                <div className="text-sm text-slate-500">{p.description}</div>
                                <div className="text-xs text-slate-400 mt-1">{p.price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'frameworks' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 p-6">
                        <Field label="Eyebrow"><Input value={homeDraft.frameworksSection.eyebrow} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, eyebrow: e.target.value } })} /></Field>
                        <Field label="Título"><Input value={homeDraft.frameworksSection.title} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, title: e.target.value } })} /></Field>
                        <Field label="Subtítulo">
                            <Textarea rows={3} value={homeDraft.frameworksSection.subtitle} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, subtitle: e.target.value } })} />
                        </Field>
                        <div className="space-y-4">
                            <ColorField label="Color fondo" value={homeDraft.frameworksSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundColor: v } } })} />
                            <Field label="Imagen fondo (URL)">
                                <div className="space-y-3">
                                    <Input value={homeDraft.frameworksSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundImageUrl: e.target.value } } })} />
                                    <R2ImageUploadButton folder="home/frameworks" onUploaded={(url) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundImageUrl: url } } })} />
                                    <ImageUrlPreview url={homeDraft.frameworksSection.style.backgroundImageUrl} />
                                </div>
                            </Field>
                            <RangeField label="Opacidad patrón overlay" value={Number(homeDraft.frameworksSection.style.overlayOpacity || '0.10')} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, overlayOpacity: v.toFixed(2) } } })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {homeDraft.frameworksSection.items.map((item, i) => (
                            <div key={i} className="border border-slate-200 bg-white p-4 space-y-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Framework {i + 1}</div>
                                <Input value={item.organization} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items: homeDraft.frameworksSection.items.map((f, idx) => idx === i ? { ...f, organization: e.target.value } : f) } })} />
                                <Input value={item.name} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items: homeDraft.frameworksSection.items.map((f, idx) => idx === i ? { ...f, name: e.target.value } : f) } })} />
                                <Textarea rows={3} value={item.description} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items: homeDraft.frameworksSection.items.map((f, idx) => idx === i ? { ...f, description: e.target.value } : f) } })} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'contact' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6 bg-white border border-slate-200 p-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Contenido de Contacto</div>
                            <div className="text-xs font-bold text-slate-400">Textos y labels</div>
                        </div>
                        <Field label="Eyebrow"><Input value={homeDraft.contactSection.eyebrow} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, eyebrow: e.target.value } })} /></Field>
                        <Field label="Título prefijo"><Input value={homeDraft.contactSection.titlePrefix} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titlePrefix: e.target.value } })} /></Field>
                        <Field label="Título acento"><Input value={homeDraft.contactSection.titleAccent} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titleAccent: e.target.value } })} /></Field>
                        <Field label="Label canal oficial"><Input value={homeDraft.contactSection.labels.officialChannel} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, officialChannel: e.target.value } } })} /></Field>
                        <Field label="Label Hub HQ"><Input value={homeDraft.contactSection.labels.hubHq} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, hubHq: e.target.value } } })} /></Field>
                        <Field label="Label red corporativa"><Input value={homeDraft.contactSection.labels.corporateNetwork} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, corporateNetwork: e.target.value } } })} /></Field>
                        <Field label="Texto LinkedIn"><Input value={homeDraft.contactSection.labels.linkedinProtocol} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, linkedinProtocol: e.target.value } } })} /></Field>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 p-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Estilos e imágenes de contacto</div>
                            <ColorField label="Color fondo sección" value={homeDraft.contactSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundColor: v } } })} />
                            <Field label="Imagen fondo sección (URL)">
                                <div className="space-y-3">
                                    <Input value={homeDraft.contactSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundImageUrl: e.target.value } } })} />
                                    <R2ImageUploadButton folder="home/contact" onUploaded={(url) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundImageUrl: url } } })} />
                                    <ImageUrlPreview url={homeDraft.contactSection.style.backgroundImageUrl} />
                                </div>
                            </Field>
                            <ColorField label="Color panel externo formulario" value={homeDraft.contactSection.style.formOuterBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundColor: v } } })} />
                            <Field label="Imagen panel externo (URL)">
                                <div className="space-y-3">
                                    <Input value={homeDraft.contactSection.style.formOuterBackgroundImageUrl} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundImageUrl: e.target.value } } })} />
                                    <R2ImageUploadButton folder="home/contact-form" onUploaded={(url) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundImageUrl: url } } })} />
                                    <ImageUrlPreview url={homeDraft.contactSection.style.formOuterBackgroundImageUrl} />
                                </div>
                            </Field>
                            <ColorField label="Color panel interno formulario" value={homeDraft.contactSection.style.formInnerBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formInnerBackgroundColor: v } } })} />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-5 text-sm text-amber-900">
                            Email, dirección y links del bloque contacto se toman de <strong>Configuración</strong> (CMS real) y también impactan el Home.
                        </div>
                    </div>
                </div>
            )}

            {tab === 'visual' && (
                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Paleta Global</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ColorField label="Color primario (brand-primary)" value={designDraft.colorPrimary} onChange={(v) => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                            <ColorField label="Color secundario (brand-secondary)" value={designDraft.colorSecondary} onChange={(v) => setDesignDraft(d => ({ ...d, colorSecondary: v }))} />
                            <ColorField label="Color superficie" value={designDraft.colorSurface} onChange={(v) => setDesignDraft(d => ({ ...d, colorSurface: v }))} />
                            <ColorField label="Color acento" value={designDraft.colorAccent} onChange={(v) => setDesignDraft(d => ({ ...d, colorAccent: v }))} />
                            <ColorField label="Color panel oscuro" value={designDraft.colorDark} onChange={(v) => setDesignDraft(d => ({ ...d, colorDark: v }))} />
                            <RangeField label="Opacidad grid" value={Number(designDraft.gridOpacity || '0.03')} onChange={(v) => setDesignDraft(d => ({ ...d, gridOpacity: v.toFixed(2) }))} />
                            <ColorField label="Texto botón primario" value={designDraft.buttonPrimaryTextColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                            <ColorField label="Texto botón outline" value={designDraft.buttonOutlineTextColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                            <ColorField label="Borde botón outline" value={designDraft.buttonOutlineBorderColor} onChange={(v) => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Tipografía Global</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FontField label="Fuente body" value={designDraft.fontBody} onChange={(v) => setDesignDraft(d => ({ ...d, fontBody: v }))} />
                            <FontField label="Fuente display" value={designDraft.fontDisplay} onChange={(v) => setDesignDraft(d => ({ ...d, fontDisplay: v }))} />
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-6 border border-slate-800">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4">Vista previa rápida de sistema visual</div>
                        <div className="space-y-4">
                            <div className="text-sm uppercase tracking-[0.3em]" style={{ color: designDraft.colorPrimary, fontFamily: designDraft.fontBody }}>AlgoritmoT UI</div>
                            <div className="text-4xl font-black tracking-tighter" style={{ color: designDraft.colorSurface, fontFamily: designDraft.fontDisplay }}>
                                Digital Mastery
                            </div>
                            <div className="text-base" style={{ color: '#cbd5e1', fontFamily: designDraft.fontBody }}>
                                Vista previa de colores y tipografías aplicadas desde el CMS.
                            </div>
                            <div className="flex gap-3">
                                <div className="px-4 py-2 font-black text-xs uppercase tracking-widest text-white" style={{ backgroundColor: designDraft.colorPrimary }}>Primario</div>
                                <div className="px-4 py-2 font-black text-xs uppercase tracking-widest text-white" style={{ backgroundColor: designDraft.colorSecondary }}>Secundario</div>
                                <div className="px-4 py-2 font-black text-xs uppercase tracking-widest text-slate-900" style={{ backgroundColor: designDraft.colorAccent }}>Acento</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'advanced' && (
                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 p-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-3">JSON completo de homePage</div>
                        <p className="text-sm text-slate-500 mb-6">
                            Control total de textos, estilos e imágenes del Home. Cambios válidos se persisten en CMS real al guardar.
                        </p>
                        <JsonEditor value={homeDraft} onChange={(next) => setHomeDraft(next)} />
                    </div>
                </div>
            )}
        </div>
    )
}
