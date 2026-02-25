import { useEffect, useMemo, useState, useRef, type ComponentType, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Save,
    Home,
    Sparkles,
    Package,
    ShieldCheck,
    Mail,
    Palette,
    Braces,
    CheckCircle2,
    Layout,
    Zap,
    ArrowRight,
    Briefcase,
    Eye,
    Monitor,
    Tablet,
    Smartphone,
    ChevronDown,
    Plus,
    Trash2,
    X
} from 'lucide-react'
import { useCMS, type HeroContent, type HomePageContent, type DesignTokens } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'
import { HeroView } from '../../sections/Hero/HeroView'

type Tab = 'hero' | 'services' | 'products' | 'frameworks' | 'contact' | 'visual' | 'advanced' | 'structure' | 'sections'

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

function StepperField({
    label,
    value,
    onChange,
    step = 1,
    min,
    max,
    suffix = '',
    precision = 0,
}: {
    label: string
    value: number
    onChange: (next: number) => void
    step?: number
    min?: number
    max?: number
    suffix?: string
    precision?: number
}) {
    const clamp = (n: number) => {
        let out = n
        if (typeof min === 'number') out = Math.max(min, out)
        if (typeof max === 'number') out = Math.min(max, out)
        return Number(out.toFixed(precision))
    }
    return (
        <Field label={label}>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => onChange(clamp(value - step))} className="h-11 w-11 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-black text-slate-500">-</button>
                <div className="flex-1">
                    <Input
                        value={`${value}${suffix}`}
                        onChange={(e) => {
                            const raw = e.target.value.replace(suffix, '').trim()
                            const parsed = Number(raw)
                            if (Number.isFinite(parsed)) onChange(clamp(parsed))
                        }}
                    />
                </div>
                <button type="button" onClick={() => onChange(clamp(value + step))} className="h-11 w-11 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-black text-slate-500">+</button>
            </div>
        </Field>
    )
}

function CollapsibleCard({
    title,
    subtitle,
    defaultOpen = true,
    children,
}: {
    title: string
    subtitle?: string
    defaultOpen?: boolean
    children: ReactNode
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
                <div>
                    <div className="font-black text-sm text-slate-900">{title}</div>
                    {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-6 pb-6 space-y-5 border-t border-slate-100">{children}</div>}
        </section>
    )
}

function SegmentedField<T extends string>({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: T
    onChange: (next: T) => void
    options: Array<{ value: T; label: string; icon?: ComponentType<{ className?: string }> }>
}) {
    return (
        <Field label={label}>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
                {options.map((opt) => {
                    const Icon = opt.icon
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${active ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            <span>{opt.label}</span>
                        </button>
                    )
                })}
            </div>
        </Field>
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
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
    const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
    const [heroPanelTab, setHeroPanelTab] = useState<'content' | 'background' | 'type' | 'stats' | 'cta'>('content')
    const [fieldSearch, setFieldSearch] = useState('')
    const [presetSelection, setPresetSelection] = useState('')
    const [styleClipboard, setStyleClipboard] = useState<Record<string, any> | null>(null)

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
        { id: 'hero' as Tab, label: 'Hero', icon: Layout, group: 'Principal', desc: 'Bloque inicial, CTA y panel stats' },
        { id: 'structure' as Tab, label: 'Estructura', icon: Sparkles, group: 'Principal', desc: 'Mapa del Home y accesos' },
        { id: 'services' as Tab, label: 'Servicios', icon: Briefcase, group: 'Secciones', desc: 'Cabecera y fondo de sección' },
        { id: 'products' as Tab, label: 'Productos', icon: Package, group: 'Secciones', desc: 'Cabecera y labels de cards' },
        { id: 'frameworks' as Tab, label: 'Frameworks', icon: ShieldCheck, group: 'Secciones', desc: 'Compliance y bloques' },
        { id: 'contact' as Tab, label: 'Contacto', icon: Mail, group: 'Secciones', desc: 'Textos y panel formulario' },
        { id: 'visual' as Tab, label: 'Visual Global', icon: Palette, group: 'Sistema', desc: 'Paleta, tipografías y tokens' },
        { id: 'advanced' as Tab, label: 'JSON Avanzado', icon: Braces, group: 'Sistema', desc: 'Control total para ajustes finos' },
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

    const heroStyle = homeDraft.hero.style
    const parseNum = (value: string | undefined, fallback: number) => {
        const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : fallback
    }
    const setHeroStyleRem = (key: keyof HomePageContent['hero']['style'], next: number) => setHeroStyle(key as any, `${next}rem` as any)
    const setHeroStyleInt = (key: keyof HomePageContent['hero']['style'], next: number) => setHeroStyle(key as any, String(Math.round(next)) as any)
    const setHeroStat = (index: number, field: 'label' | 'value', value: string) => {
        const next = [...homeDraft.hero.stats]
        next[index] = { ...next[index], [field]: value }
        setHome({ ...homeDraft, hero: { ...homeDraft.hero, stats: next } })
    }
    const addHeroStat = () => setHome({ ...homeDraft, hero: { ...homeDraft.hero, stats: [...homeDraft.hero.stats, { label: 'Nuevo Stat', value: '0' }] } })
    const removeHeroStat = (index: number) => setHome({ ...homeDraft, hero: { ...homeDraft.hero, stats: homeDraft.hero.stats.filter((_, i) => i !== index) } })

    const resetCurrentSection = () => {
        if (tab === 'hero') {
            setHeroDraft({ ...state.hero })
            setHome({ ...homeDraft, hero: JSON.parse(JSON.stringify(state.homePage.hero)) })
            return
        }
        if (tab === 'services') return setHome({ ...homeDraft, servicesSection: JSON.parse(JSON.stringify(state.homePage.servicesSection)) })
        if (tab === 'products') return setHome({ ...homeDraft, productsSection: JSON.parse(JSON.stringify(state.homePage.productsSection)) })
        if (tab === 'frameworks') return setHome({ ...homeDraft, frameworksSection: JSON.parse(JSON.stringify(state.homePage.frameworksSection)) })
        if (tab === 'contact') return setHome({ ...homeDraft, contactSection: JSON.parse(JSON.stringify(state.homePage.contactSection)) })
        if (tab === 'visual') return setDesignDraft({ ...state.design })
        if (tab === 'advanced') return setHomeDraft(JSON.parse(JSON.stringify(state.homePage)))
    }

    const getCurrentStyleObject = (): Record<string, any> | null => {
        if (tab === 'hero') return { ...homeDraft.hero.style }
        if (tab === 'services') return { ...homeDraft.servicesSection.style }
        if (tab === 'products') return { ...homeDraft.productsSection.style }
        if (tab === 'frameworks') return { ...homeDraft.frameworksSection.style }
        if (tab === 'contact') return { ...homeDraft.contactSection.style }
        if (tab === 'visual') return {
            colorPrimary: designDraft.colorPrimary,
            colorSecondary: designDraft.colorSecondary,
            colorSurface: designDraft.colorSurface,
            colorAccent: designDraft.colorAccent,
            colorDark: designDraft.colorDark,
            gridOpacity: designDraft.gridOpacity,
            buttonStyle: designDraft.buttonStyle,
            borderRadius: designDraft.borderRadius,
        }
        return null
    }

    const applyStyleObjectToCurrentTab = (style: Record<string, any>) => {
        if (tab === 'hero') return setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, ...style } } })
        if (tab === 'services') return setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, ...style } } })
        if (tab === 'products') return setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, ...style } } })
        if (tab === 'frameworks') return setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, ...style } } })
        if (tab === 'contact') return setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, ...style } } })
        if (tab === 'visual') {
            setDesignDraft((d) => ({ ...d, ...style }))
        }
    }

    const duplicateCurrentStyle = async () => {
        const currentStyle = getCurrentStyleObject()
        if (!currentStyle) return
        setStyleClipboard(currentStyle)
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(JSON.stringify(currentStyle, null, 2))
            }
        } catch { }
    }

    const applyPreset = (presetId: string) => {
        setPresetSelection(presetId)
        if (!presetId) return
        if (tab === 'hero') {
            const presets: Record<string, Record<string, string>> = {
                'hero-industrial': {
                    sectionOverlayColor: '#ffffff',
                    sectionOverlayOpacity: '0.80',
                    rightPanelOverlayColor: '#ffffff',
                    rightPanelOverlayOpacity: '0.86',
                    titleColor: '#0f172a',
                    titleAccentColor: '#2563eb',
                    subtitleColor: '#64748b',
                    highlightColor: '#1a2d5a',
                },
                'hero-darktech': {
                    sectionOverlayColor: '#0f172a',
                    sectionOverlayOpacity: '0.62',
                    rightPanelOverlayColor: '#0f172a',
                    rightPanelOverlayOpacity: '0.40',
                    titleColor: '#ffffff',
                    titleAccentColor: '#3b82f6',
                    subtitleColor: '#cbd5e1',
                    highlightColor: '#cbd5e1',
                    statsValueColor: '#ffffff',
                    statsLabelColor: '#cbd5e1',
                    statsDividerColor: '#334155',
                    statsPanelBorderColor: '#334155',
                },
                'hero-clean': {
                    sectionOverlayColor: '#ffffff',
                    sectionOverlayOpacity: '0.92',
                    rightPanelOverlayColor: '#ffffff',
                    rightPanelOverlayOpacity: '0.92',
                    titleColor: '#0f172a',
                    titleAccentColor: '#2563eb',
                    subtitleColor: '#64748b',
                    highlightColor: '#334155',
                },
            }
            return applyStyleObjectToCurrentTab(presets[presetId] || {})
        }
        if (tab === 'visual') {
            const presets: Record<string, Partial<DesignTokens>> = {
                'visual-algoritmot': { colorPrimary: '#1a2d5a', colorSecondary: '#2563eb', colorAccent: '#3b82f6', colorSurface: '#f8fafc', colorDark: '#0f172a', buttonStyle: 'sharp', borderRadius: 'lg' },
                'visual-industrial': { colorPrimary: '#0f172a', colorSecondary: '#f97316', colorAccent: '#fb923c', colorSurface: '#f8fafc', colorDark: '#111827', buttonStyle: 'rounded', borderRadius: 'md' },
                'visual-minimal': { colorPrimary: '#111827', colorSecondary: '#334155', colorAccent: '#64748b', colorSurface: '#ffffff', colorDark: '#0f172a', buttonStyle: 'sharp', borderRadius: 'sm' },
            }
            return applyStyleObjectToCurrentTab(presets[presetId] as Record<string, any>)
        }
        if (tab === 'services' || tab === 'products' || tab === 'frameworks' || tab === 'contact') {
            const presets: Record<string, Record<string, any>> = {
                'section-clean': { backgroundColor: '#f8fafc', backgroundImageUrl: '' },
                'section-white': { backgroundColor: '#ffffff', backgroundImageUrl: '' },
                'section-dark': { backgroundColor: '#0f172a' },
            }
            return applyStyleObjectToCurrentTab(presets[presetId] || {})
        }
    }

    const quickFieldIndex = useMemo(() => ([
        { id: 'hero-title', tab: 'hero', label: 'Hero título', keywords: 'hero title titular h1 headline', action: () => { setTab('hero'); setHeroPanelTab('content'); fieldRefs.title.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } },
        { id: 'hero-subtitle', tab: 'hero', label: 'Hero subtítulo', keywords: 'hero subtitle subtitulo copy description', action: () => { setTab('hero'); setHeroPanelTab('content'); fieldRefs.subtitle.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } },
        { id: 'hero-cta', tab: 'hero', label: 'Hero CTA', keywords: 'cta button boton call to action', action: () => { setTab('hero'); setHeroPanelTab('cta'); } },
        { id: 'hero-overlay', tab: 'hero', label: 'Hero overlay / filtro', keywords: 'overlay filtro opacity opacidad background hero', action: () => { setTab('hero'); setHeroPanelTab('background'); } },
        { id: 'hero-stats', tab: 'hero', label: 'Hero stats panel', keywords: 'stats panel metricas hero', action: () => { setTab('hero'); setHeroPanelTab('stats'); } },
        { id: 'services-header', tab: 'services', label: 'Servicios cabecera Home', keywords: 'services home header title subtitle eyebrow', action: () => setTab('services') },
        { id: 'products-header', tab: 'products', label: 'Productos cabecera Home', keywords: 'products home header title subtitle labels', action: () => setTab('products') },
        { id: 'frameworks-items', tab: 'frameworks', label: 'Frameworks items', keywords: 'frameworks items compliance cards blocks', action: () => setTab('frameworks') },
        { id: 'contact-labels', tab: 'contact', label: 'Contacto labels', keywords: 'contact labels linkedin email hq official', action: () => setTab('contact') },
        { id: 'visual-palette', tab: 'visual', label: 'Paleta global', keywords: 'color palette primary secondary accent visual', action: () => setTab('visual') },
        { id: 'visual-typography', tab: 'visual', label: 'Tipografías globales', keywords: 'font typography display body visual', action: () => setTab('visual') },
        { id: 'json-advanced', tab: 'advanced', label: 'JSON avanzado', keywords: 'json advanced raw', action: () => setTab('advanced') },
    ]), [fieldRefs.title, fieldRefs.subtitle])

    const visibleQuickFields = useMemo(() => {
        const q = fieldSearch.trim().toLowerCase()
        if (!q) return []
        return quickFieldIndex
            .filter(item => item.tab === tab || (tab === 'structure' && ['services', 'products'].includes(item.tab)))
            .filter(item => (`${item.label} ${item.keywords}`).toLowerCase().includes(q))
            .slice(0, 8)
    }, [fieldSearch, quickFieldIndex, tab])

    const presetOptions = useMemo(() => {
        if (tab === 'hero') return [
            { value: '', label: 'Aplicar preset…' },
            { value: 'hero-clean', label: 'Hero · Clean Light' },
            { value: 'hero-industrial', label: 'Hero · Industrial' },
            { value: 'hero-darktech', label: 'Hero · Dark Tech' },
        ]
        if (tab === 'visual') return [
            { value: '', label: 'Aplicar preset…' },
            { value: 'visual-algoritmot', label: 'Visual · AlgoritmoT' },
            { value: 'visual-industrial', label: 'Visual · Industrial' },
            { value: 'visual-minimal', label: 'Visual · Minimal' },
        ]
        if (['services', 'products', 'frameworks', 'contact'].includes(tab)) return [
            { value: '', label: 'Aplicar preset…' },
            { value: 'section-clean', label: 'Section · Clean' },
            { value: 'section-white', label: 'Section · White' },
            { value: 'section-dark', label: 'Section · Dark' },
        ]
        return [{ value: '', label: 'Sin presets para esta vista' }]
    }, [tab])

    const previewScaleClass = previewViewport === 'desktop'
        ? 'scale-[0.65] 2xl:scale-[0.8] w-[153.8%] 2xl:w-[125%]'
        : previewViewport === 'tablet'
            ? 'scale-[0.45] w-[222%]'
            : 'scale-[0.34] w-[294%]'

    const previewContent = (
        <div className="flex-1 bg-white flex flex-col overflow-hidden relative group min-w-0">
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Site Preview (High-Fidelity)</span>
            </div>

            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 border border-slate-200 rounded-xl p-1 shadow-sm">
                {([
                    { value: 'desktop', icon: Monitor, label: 'Desktop' },
                    { value: 'tablet', icon: Tablet, label: 'Tablet' },
                    { value: 'mobile', icon: Smartphone, label: 'Mobile' },
                ] as const).map((opt) => {
                    const Icon = opt.icon
                    const active = previewViewport === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setPreviewViewport(opt.value)}
                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Icon className="w-4 h-4" />
                        </button>
                    )
                })}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-900 preview-container">
                <div className={`origin-top-left transition-transform duration-500 ease-in-out ${previewScaleClass}`}>
                    <HeroView hero={heroDraft} heroSection={homeDraft.hero} animated={false} />
                    <div className="h-screen bg-slate-50 border-t border-slate-200 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <Zap className="w-12 h-12 text-slate-200 mx-auto" />
                            <div className="text-xl font-bold text-slate-300">Sections Placeholder</div>
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Usa “Ver sitio” para validar el home completo</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden -m-8 md:-m-12">
            {/* Header with quick actions - Compressed */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 py-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter">Home Editor</h1>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" />
                            Edición en Tiempo Real
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {tab !== 'advanced' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsPreviewModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                            >
                                <Eye className="w-4 h-4" />
                                Preview
                            </button>
                        </>
                    )}
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors pr-4 border-r border-slate-200"
                    >
                        <Home className="w-3.5 h-3.5" />
                        Ver Sitio
                    </a>
                    <button
                        onClick={saveAll}
                        disabled={!hasChanges || isSaving}
                        className={`group flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${hasChanges
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className={`w-4 h-4 transition-transform ${hasChanges && 'group-hover:rotate-12'}`} />
                        )}
                        {hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
                    </button>
                </div>
            </div>

            {/* Editor Workspace */}
            <div className="flex-1 bg-slate-50 overflow-y-auto custom-scrollbar">
                <div className="w-full flex flex-col">
                    <div className="sticky top-0 z-20 p-4 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 space-y-4">
                        {(['Principal', 'Secciones', 'Sistema'] as const).map((groupName) => {
                            const groupTabs = tabs.filter(t => t.group === groupName)
                            return (
                                <div key={groupName} className="space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{groupName}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {groupTabs.map((t) => {
                                            const Icon = t.icon
                                            const isSelected = tab === t.id
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setTab(t.id)}
                                                    className={`text-left rounded-xl border px-3 py-2.5 transition-all min-w-[220px] max-w-full ${isSelected
                                                        ? 'border-brand-primary bg-blue-50/70 shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`h-7 w-7 rounded-lg border flex items-center justify-center ${isSelected ? 'border-brand-primary text-brand-primary bg-white' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-primary' : 'text-slate-700'}`}>{t.label}</div>
                                                            <div className="text-[11px] text-slate-500 leading-snug truncate">{t.desc}</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                        <div className="text-[11px] text-slate-500 font-medium">
                            {tab === 'hero' && 'Edita el bloque principal del Home: textos, fondo, overlays, video/imagen y acentos.'}
                            {tab === 'structure' && 'Mapa y navegación hacia editores especializados para secciones del Home.'}
                            {tab === 'services' && 'Cabecera visual/textual de la sección Servicios del Home y acceso rápido a servicios publicados.'}
                            {tab === 'products' && 'Cabecera visual/textual de Productos en Home y acceso rápido a productos publicados.'}
                            {tab === 'frameworks' && 'Contenido de frameworks/compliance mostrado en Home.'}
                            {tab === 'contact' && 'Bloque de contacto del Home: títulos, labels y estilos base.'}
                            {tab === 'visual' && 'Tokens visuales globales del Home (paleta, tipografías y estética general).'}
                            {tab === 'advanced' && 'Edición JSON avanzada de homePage. Úsala solo para ajustes finos/estructuras complejas.'}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_auto] gap-3 pt-1">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Búsqueda rápida de campos</label>
                                <Input
                                    value={fieldSearch}
                                    onChange={(e) => setFieldSearch(e.target.value)}
                                    placeholder="Buscar: overlay, cta, subtitle, frameworks..."
                                />
                                {fieldSearch.trim() && (
                                    <div className="flex flex-wrap gap-2">
                                        {visibleQuickFields.length > 0 ? visibleQuickFields.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={item.action}
                                                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary hover:border-brand-primary"
                                            >
                                                {item.label}
                                            </button>
                                        )) : (
                                            <div className="text-xs text-slate-400">Sin coincidencias para esta sección.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atajos de sección</div>
                                <div className="flex flex-wrap gap-2 xl:justify-end">
                                    <button
                                        type="button"
                                        onClick={resetCurrentSection}
                                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                    >
                                        Reset sección
                                    </button>
                                    <button
                                        type="button"
                                        onClick={duplicateCurrentStyle}
                                        disabled={!getCurrentStyleObject()}
                                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Duplicar estilo
                                    </button>
                                    {styleClipboard && getCurrentStyleObject() && (
                                        <button
                                            type="button"
                                            onClick={() => applyStyleObjectToCurrentTab(styleClipboard)}
                                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary"
                                        >
                                            Pegar estilo
                                        </button>
                                    )}
                                    <select
                                        value={presetSelection}
                                        onChange={(e) => applyPreset(e.target.value)}
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 min-w-[220px]"
                                    >
                                        {presetOptions.map((opt) => (
                                            <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <AnimatePresence>
                            {saved && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 font-bold text-xs shadow-sm"
                                >
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    Cambios publicados
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {tab === 'hero' && (
                            <div className="space-y-6">
                                <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Hero Workspace</div>
                                            <div className="text-xs text-slate-500">Edita por categorías. El preview (dock/modal) usa el mismo render que producción.</div>
                                        </div>
                                        <div className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            Consejo: usa Preview modal para editar con más espacio
                                        </div>
                                    </div>
                                    <SegmentedField
                                        label="Bloque a editar"
                                        value={heroPanelTab}
                                        onChange={setHeroPanelTab}
                                        options={[
                                            { value: 'content', label: 'Contenido' },
                                            { value: 'background', label: 'Fondo' },
                                            { value: 'type', label: 'Tipografía' },
                                            { value: 'cta', label: 'CTA' },
                                            { value: 'stats', label: 'Stats' },
                                        ]}
                                    />
                                </section>

                                {heroPanelTab === 'content' && (
                                    <CollapsibleCard title="Contenido principal" subtitle="Eyebrow, H1, subtítulo y CTAs" defaultOpen>
                                        <div className="space-y-5 pt-5">
                                            <div ref={fieldRefs.highlight}>
                                                <Field label="Highlight / Eyebrow">
                                                    <Input value={heroDraft.highlight} onChange={e => setHeroDraft(d => ({ ...d, highlight: e.target.value }))} />
                                                </Field>
                                            </div>
                                            <div ref={fieldRefs.title}>
                                                <Field label="Titular (H1)" hint="Título principal del Home. Usa frases cortas por línea para mejor legibilidad.">
                                                    <Textarea rows={4} value={heroDraft.title} onChange={e => setHeroDraft(d => ({ ...d, title: e.target.value }))} />
                                                </Field>
                                            </div>
                                            <div ref={fieldRefs.subtitle}>
                                                <Field label="Subtítulo" hint="Texto descriptivo del Hero.">
                                                    <Textarea rows={3} value={heroDraft.subtitle} onChange={e => setHeroDraft(d => ({ ...d, subtitle: e.target.value }))} />
                                                </Field>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div ref={fieldRefs.cta}>
                                                    <Field label="CTA Primario"><Input value={heroDraft.cta} onChange={e => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                                                </div>
                                                <div ref={fieldRefs.secondaryCta}>
                                                    <Field label="CTA Secundario"><Input value={heroDraft.secondaryCta} onChange={e => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleCard>
                                )}

                                {heroPanelTab === 'background' && (
                                    <>
                                        <CollapsibleCard title="Fondo principal del Hero" subtitle="Color base, imagen/video y overlay de la sección" defaultOpen>
                                            <div className="space-y-6 pt-5">
                                                <ColorField label="Color fondo sección" value={heroStyle.backgroundColor} onChange={(v) => setHeroStyle('backgroundColor', v)} />
                                                <Field label="Imagen o video fondo (URL o YouTube)" hint="Usa imagen R2, URL pública o video de YouTube.">
                                                    <div className="space-y-3">
                                                        <Input value={heroStyle.backgroundImageUrl} onChange={e => setHeroStyle('backgroundImageUrl', e.target.value)} />
                                                        <ImageUrlPreview url={heroStyle.backgroundImageUrl} />
                                                    </div>
                                                </Field>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <ColorField label="Color filtro sección" value={heroStyle.sectionOverlayColor} onChange={(v) => setHeroStyle('sectionOverlayColor', v)} />
                                                    <RangeField label="Opacidad filtro sección" value={Number(heroStyle.sectionOverlayOpacity || '0.92')} onChange={(v) => setHeroStyle('sectionOverlayOpacity', v.toFixed(2))} />
                                                </div>
                                            </div>
                                        </CollapsibleCard>

                                        <CollapsibleCard title="Panel derecho (stats)" subtitle="Fondo/imagen y overlay del panel lateral" defaultOpen>
                                            <div className="space-y-5 pt-5">
                                                <ColorField label="Color fondo panel derecho" value={heroStyle.rightPanelBackgroundColor} onChange={(v) => setHeroStyle('rightPanelBackgroundColor', v)} />
                                                <Field label="Imagen / video panel derecho (URL o YouTube)">
                                                    <div className="space-y-3">
                                                        <Input value={heroStyle.rightPanelBackgroundImageUrl} onChange={e => setHeroStyle('rightPanelBackgroundImageUrl', e.target.value)} />
                                                        <ImageUrlPreview url={heroStyle.rightPanelBackgroundImageUrl} />
                                                    </div>
                                                </Field>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <ColorField label="Color filtro panel" value={heroStyle.rightPanelOverlayColor} onChange={(v) => setHeroStyle('rightPanelOverlayColor', v)} />
                                                    <RangeField label="Opacidad filtro panel" value={Number(heroStyle.rightPanelOverlayOpacity || '0.90')} onChange={(v) => setHeroStyle('rightPanelOverlayOpacity', v.toFixed(2))} />
                                                </div>
                                            </div>
                                        </CollapsibleCard>
                                    </>
                                )}

                                {heroPanelTab === 'type' && (
                                    <CollapsibleCard title="Tipografía y colores" subtitle="Tamaños, pesos y colores del Hero" defaultOpen>
                                        <div className="space-y-6 pt-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ColorField label="Color highlight" value={heroStyle.highlightColor} onChange={(v) => setHeroStyle('highlightColor', v)} />
                                                <ColorField label="Color título" value={heroStyle.titleColor} onChange={(v) => setHeroStyle('titleColor', v)} />
                                                <ColorField label="Acento título" value={heroStyle.titleAccentColor} onChange={(v) => setHeroStyle('titleAccentColor', v)} />
                                                <ColorField label="Color subtítulo" value={heroStyle.subtitleColor} onChange={(v) => setHeroStyle('subtitleColor', v)} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <StepperField label="Título mobile" value={parseNum(heroStyle.titleFontSizeMobile, 4.5)} step={0.1} min={1.5} max={9} suffix="rem" precision={2} onChange={(v) => setHeroStyleRem('titleFontSizeMobile', v)} />
                                                <StepperField label="Título desktop" value={parseNum(heroStyle.titleFontSizeDesktop, 8)} step={0.1} min={2} max={16} suffix="rem" precision={2} onChange={(v) => setHeroStyleRem('titleFontSizeDesktop', v)} />
                                                <StepperField label="Subtítulo mobile" value={parseNum(heroStyle.subtitleFontSizeMobile, 1.5)} step={0.05} min={0.75} max={3} suffix="rem" precision={2} onChange={(v) => setHeroStyleRem('subtitleFontSizeMobile', v)} />
                                                <StepperField label="Subtítulo desktop" value={parseNum(heroStyle.subtitleFontSizeDesktop, 1.875)} step={0.05} min={0.9} max={4} suffix="rem" precision={2} onChange={(v) => setHeroStyleRem('subtitleFontSizeDesktop', v)} />
                                                <StepperField label="Peso título" value={parseNum(heroStyle.titleFontWeight, 900)} step={100} min={100} max={900} precision={0} onChange={(v) => setHeroStyleInt('titleFontWeight', v)} />
                                                <StepperField label="Peso subtítulo" value={parseNum(heroStyle.subtitleFontWeight, 500)} step={100} min={100} max={900} precision={0} onChange={(v) => setHeroStyleInt('subtitleFontWeight', v)} />
                                                <StepperField label="Line-height título" value={parseNum(heroStyle.titleLineHeight, 0.85)} step={0.01} min={0.7} max={1.3} precision={2} onChange={(v) => setHeroStyle('titleLineHeight', v.toFixed(2))} />
                                            </div>
                                        </div>
                                    </CollapsibleCard>
                                )}

                                {heroPanelTab === 'cta' && (
                                    <CollapsibleCard title="CTA rápido (botones del Hero)" subtitle="Textos, colores y forma global de botones" defaultOpen>
                                        <div className="space-y-6 pt-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Field label="Texto CTA principal"><Input value={heroDraft.cta} onChange={(e) => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                                                <Field label="Texto CTA secundario"><Input value={heroDraft.secondaryCta} onChange={(e) => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ColorField label="Color CTA principal" value={designDraft.colorPrimary} onChange={v => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                                                <ColorField label="Texto CTA principal" value={designDraft.buttonPrimaryTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                                                <ColorField label="Texto CTA secundario" value={designDraft.buttonOutlineTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                                <ColorField label="Borde CTA secundario" value={designDraft.buttonOutlineBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <SegmentedField
                                                    label="Estilo botón (global)"
                                                    value={String(designDraft.buttonStyle || 'sharp') as 'sharp' | 'rounded' | 'pill'}
                                                    onChange={(v) => setDesignDraft(d => ({ ...d, buttonStyle: v }))}
                                                    options={[
                                                        { value: 'sharp', label: 'Sharp' },
                                                        { value: 'rounded', label: 'Rounded' },
                                                        { value: 'pill', label: 'Pill' },
                                                    ]}
                                                />
                                                <Field label="Border radius (global)">
                                                    <select
                                                        value={designDraft.borderRadius || 'lg'}
                                                        onChange={(e) => setDesignDraft(d => ({ ...d, borderRadius: e.target.value }))}
                                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
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
                                    </CollapsibleCard>
                                )}

                                {heroPanelTab === 'stats' && (
                                    <CollapsibleCard title="Stats del Hero" subtitle="Items y estilo del panel de métricas" defaultOpen>
                                        <div className="space-y-6 pt-5">
                                            <div className="space-y-3">
                                                {homeDraft.hero.stats.map((stat, index) => (
                                                    <div key={`${index}-${stat.label}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start border border-slate-100 rounded-xl p-3">
                                                        <Input value={stat.label} onChange={(e) => setHeroStat(index, 'label', e.target.value)} placeholder="Label" />
                                                        <Input value={stat.value} onChange={(e) => setHeroStat(index, 'value', e.target.value)} placeholder="Value" />
                                                        <button type="button" onClick={() => removeHeroStat(index)} className="h-11 w-11 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addHeroStat} className="w-full h-11 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-brand-primary hover:border-brand-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
                                                    <Plus className="w-4 h-4" />
                                                    Agregar Stat
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ColorField label="Color label stats" value={heroStyle.statsLabelColor} onChange={(v) => setHeroStyle('statsLabelColor', v)} />
                                                <ColorField label="Color valor stats" value={heroStyle.statsValueColor} onChange={(v) => setHeroStyle('statsValueColor', v)} />
                                                <ColorField label="Color divisores" value={heroStyle.statsDividerColor} onChange={(v) => setHeroStyle('statsDividerColor', v)} />
                                                <ColorField label="Borde panel stats" value={heroStyle.statsPanelBorderColor} onChange={(v) => setHeroStyle('statsPanelBorderColor', v)} />
                                            </div>
                                        </div>
                                    </CollapsibleCard>
                                )}
                            </div>
                        )}

                        {tab === 'services' && (
                            <div className="space-y-6">
                                <CollapsibleCard title="Contenido de sección" subtitle="Eyebrow, título, subtítulo y número decorativo" defaultOpen>
                                    <div className="space-y-4 pt-5">
                                        <Field label="Eyebrow"><Input value={homeDraft.servicesSection.eyebrow} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, eyebrow: e.target.value } })} /></Field>
                                        <Field label="Título Sección"><Textarea rows={2} value={homeDraft.servicesSection.title} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, title: e.target.value } })} /></Field>
                                        <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.servicesSection.subtitle} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, subtitle: e.target.value } })} /></Field>
                                        <Field label="Número decorativo"><Input value={homeDraft.servicesSection.sectionNumber} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, sectionNumber: e.target.value } })} /></Field>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Estilo y fondo" subtitle="Color + imagen de fondo para la sección de Servicios" defaultOpen={false}>
                                    <div className="space-y-4 pt-5">
                                        <ColorField label="Fondo" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                                        <Field label="Imagen Fondo (URL)">
                                            <div className="space-y-3">
                                                <Input value={homeDraft.servicesSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundImageUrl: e.target.value } } })} />
                                                <ImageUrlPreview url={homeDraft.servicesSection.style.backgroundImageUrl} />
                                            </div>
                                        </Field>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Servicios vinculados" subtitle="Los cards del Home se editan en el módulo Servicios" defaultOpen={false}>
                                    <div className="space-y-3 pt-5">
                                        {state.services.map(s => (
                                            <button key={s.slug} type="button" className="w-full border border-slate-100 p-3 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all cursor-pointer text-left" onClick={() => navigate(`/admin/services?slug=${s.slug}`)}>
                                                <div>
                                                    <div className="font-black text-slate-900 text-xs">{s.title}</div>
                                                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">{s.highlight}</div>
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-primary" />
                                            </button>
                                        ))}
                                    </div>
                                </CollapsibleCard>
                            </div>
                        )}

                        {tab === 'products' && (
                            <div className="space-y-6">
                                <CollapsibleCard title="Contenido de sección" subtitle="Textos y labels de productos en Home" defaultOpen>
                                    <div className="space-y-4 pt-5">
                                        <Field label="Eyebrow"><Input value={homeDraft.productsSection.eyebrow} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, eyebrow: e.target.value } })} /></Field>
                                        <Field label="Título Sección"><Textarea rows={2} value={homeDraft.productsSection.title} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, title: e.target.value } })} /></Field>
                                        <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.productsSection.subtitle} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, subtitle: e.target.value } })} /></Field>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label="Label Precio"><Input value={homeDraft.productsSection.availabilityPricingLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, availabilityPricingLabel: e.target.value } })} /></Field>
                                            <Field label="Label CTA Deploy"><Input value={homeDraft.productsSection.deploySolutionLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, deploySolutionLabel: e.target.value } })} /></Field>
                                        </div>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Estilo y fondo" subtitle="Color e imagen de fondo de la sección Productos" defaultOpen={false}>
                                    <div className="space-y-4 pt-5">
                                        <ColorField label="Fondo" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                                        <Field label="Imagen Fondo (URL)">
                                            <div className="space-y-3">
                                                <Input value={homeDraft.productsSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundImageUrl: e.target.value } } })} />
                                                <ImageUrlPreview url={homeDraft.productsSection.style.backgroundImageUrl} />
                                            </div>
                                        </Field>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Productos vinculados" subtitle="Los cards y su detalle se editan en Productos" defaultOpen={false}>
                                    <div className="space-y-3 pt-5">
                                        {state.products.map(p => (
                                            <button key={p.slug} type="button" className="w-full border border-slate-100 p-3 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all cursor-pointer text-left" onClick={() => navigate(`/admin/products?slug=${p.slug}`)}>
                                                <div className="font-black text-slate-900 text-xs">{p.title}</div>
                                                <div className="text-[10px] font-bold text-brand-primary">{p.price}</div>
                                            </button>
                                        ))}
                                    </div>
                                </CollapsibleCard>
                            </div>
                        )}

                        {tab === 'frameworks' && (
                            <div className="space-y-6">
                                <CollapsibleCard title="Contenido de sección" subtitle="Eyebrow, título y subtítulo del bloque de frameworks" defaultOpen>
                                    <div className="space-y-4 pt-5">
                                        <Field label="Eyebrow"><Input value={homeDraft.frameworksSection.eyebrow} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, eyebrow: e.target.value } })} /></Field>
                                        <Field label="Título"><Textarea rows={2} value={homeDraft.frameworksSection.title} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, title: e.target.value } })} /></Field>
                                        <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.frameworksSection.subtitle} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, subtitle: e.target.value } })} /></Field>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Items / compliance blocks" subtitle="Organización, nombre y descripción de cada framework" defaultOpen={false}>
                                    <div className="space-y-3 pt-5">
                                        {homeDraft.frameworksSection.items.map((item, idx) => (
                                            <div key={`${idx}-${item.name}`} className="border border-slate-100 rounded-xl p-3 space-y-2">
                                                <Input placeholder="Organization" value={item.organization} onChange={(e) => {
                                                    const items = [...homeDraft.frameworksSection.items]
                                                    items[idx] = { ...items[idx], organization: e.target.value }
                                                    setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items } })
                                                }} />
                                                <Input placeholder="Name" value={item.name} onChange={(e) => {
                                                    const items = [...homeDraft.frameworksSection.items]
                                                    items[idx] = { ...items[idx], name: e.target.value }
                                                    setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items } })
                                                }} />
                                                <Textarea rows={2} placeholder="Description" value={item.description} onChange={(e) => {
                                                    const items = [...homeDraft.frameworksSection.items]
                                                    items[idx] = { ...items[idx], description: e.target.value }
                                                    setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items } })
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Estilo y fondo" subtitle="Color, imagen y overlay de la sección" defaultOpen={false}>
                                    <div className="space-y-4 pt-5">
                                        <ColorField label="Fondo" value={homeDraft.frameworksSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundColor: v } } })} />
                                        <Field label="Imagen Fondo (URL)">
                                            <div className="space-y-3">
                                                <Input value={homeDraft.frameworksSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundImageUrl: e.target.value } } })} />
                                                <ImageUrlPreview url={homeDraft.frameworksSection.style.backgroundImageUrl} />
                                            </div>
                                        </Field>
                                        <RangeField label="Opacidad Overlay" value={Number(homeDraft.frameworksSection.style.overlayOpacity || '0.10')} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, overlayOpacity: v.toFixed(2) } } })} />
                                    </div>
                                </CollapsibleCard>
                            </div>
                        )}

                        {tab === 'contact' && (
                            <div className="space-y-6">
                                <CollapsibleCard title="Contenido de sección" subtitle="Eyebrow y título del bloque contacto" defaultOpen>
                                    <div className="space-y-4 pt-5">
                                        <Field label="Eyebrow"><Input value={homeDraft.contactSection.eyebrow} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, eyebrow: e.target.value } })} /></Field>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label="Título Prefix"><Input value={homeDraft.contactSection.titlePrefix} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titlePrefix: e.target.value } })} /></Field>
                                            <Field label="Título Accent"><Input value={homeDraft.contactSection.titleAccent} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titleAccent: e.target.value } })} /></Field>
                                        </div>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Labels de contacto" subtitle="Textos de canales / columnas de contacto" defaultOpen={false}>
                                    <div className="space-y-4 pt-5">
                                        <Field label="Canal oficial"><Input value={homeDraft.contactSection.labels.officialChannel} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, officialChannel: e.target.value } } })} /></Field>
                                        <Field label="Hub / HQ"><Input value={homeDraft.contactSection.labels.hubHq} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, hubHq: e.target.value } } })} /></Field>
                                        <Field label="Red corporativa"><Input value={homeDraft.contactSection.labels.corporateNetwork} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, corporateNetwork: e.target.value } } })} /></Field>
                                        <Field label="LinkedIn protocol"><Input value={homeDraft.contactSection.labels.linkedinProtocol} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, linkedinProtocol: e.target.value } } })} /></Field>
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Estilos y fondos" subtitle="Sección contacto y panel/formulario" defaultOpen={false}>
                                    <div className="space-y-4 pt-5">
                                        <ColorField label="Fondo sección" value={homeDraft.contactSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundColor: v } } })} />
                                        <Field label="Imagen fondo sección (URL)">
                                            <div className="space-y-3">
                                                <Input value={homeDraft.contactSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundImageUrl: e.target.value } } })} />
                                                <ImageUrlPreview url={homeDraft.contactSection.style.backgroundImageUrl} />
                                            </div>
                                        </Field>
                                        <ColorField label="Fondo panel externo formulario" value={homeDraft.contactSection.style.formOuterBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundColor: v } } })} />
                                        <Field label="Imagen panel externo formulario (URL)">
                                            <div className="space-y-3">
                                                <Input value={homeDraft.contactSection.style.formOuterBackgroundImageUrl} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundImageUrl: e.target.value } } })} />
                                                <ImageUrlPreview url={homeDraft.contactSection.style.formOuterBackgroundImageUrl} />
                                            </div>
                                        </Field>
                                        <ColorField label="Fondo panel interno formulario" value={homeDraft.contactSection.style.formInnerBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formInnerBackgroundColor: v } } })} />
                                    </div>
                                </CollapsibleCard>
                            </div>
                        )}

                        {tab === 'visual' && (
                            <div className="space-y-8">
                                <CollapsibleCard title="Identidad visual" subtitle="Paleta base y tipografías del sitio" defaultOpen>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-5">
                                        <ColorField label="Primario" value={designDraft.colorPrimary} onChange={v => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                                        <ColorField label="Secundario" value={designDraft.colorSecondary} onChange={v => setDesignDraft(d => ({ ...d, colorSecondary: v }))} />
                                        <ColorField label="Surface" value={designDraft.colorSurface} onChange={v => setDesignDraft(d => ({ ...d, colorSurface: v }))} />
                                        <ColorField label="Acento" value={designDraft.colorAccent} onChange={v => setDesignDraft(d => ({ ...d, colorAccent: v }))} />
                                        <ColorField label="Panel oscuro" value={designDraft.colorDark} onChange={v => setDesignDraft(d => ({ ...d, colorDark: v }))} />
                                        <RangeField label="Opacidad Grid" value={Number(designDraft.gridOpacity || '0.03')} onChange={(v) => setDesignDraft(d => ({ ...d, gridOpacity: v.toFixed(2) }))} />
                                        <FontField label="Fuente Display" value={designDraft.fontDisplay} onChange={v => setDesignDraft(d => ({ ...d, fontDisplay: v }))} />
                                        <FontField label="Fuente Body" value={designDraft.fontBody} onChange={v => setDesignDraft(d => ({ ...d, fontBody: v }))} />
                                    </div>
                                </CollapsibleCard>
                                <CollapsibleCard title="Botones y forma" subtitle="Estilo global de botones y bordes" defaultOpen={false}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                                        <SegmentedField
                                            label="Estilo de botón"
                                            value={String(designDraft.buttonStyle || 'sharp') as 'sharp' | 'rounded' | 'pill'}
                                            onChange={(v) => setDesignDraft(d => ({ ...d, buttonStyle: v }))}
                                            options={[
                                                { value: 'sharp', label: 'Sharp' },
                                                { value: 'rounded', label: 'Rounded' },
                                                { value: 'pill', label: 'Pill' },
                                            ]}
                                        />
                                        <Field label="Border Radius Global">
                                            <select
                                                value={designDraft.borderRadius || 'lg'}
                                                onChange={(e) => setDesignDraft(d => ({ ...d, borderRadius: e.target.value }))}
                                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                                            >
                                                <option value="none">None</option>
                                                <option value="sm">SM</option>
                                                <option value="md">MD</option>
                                                <option value="lg">LG</option>
                                                <option value="full">Full</option>
                                            </select>
                                        </Field>
                                        <ColorField label="Texto botón primario" value={designDraft.buttonPrimaryTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                                        <ColorField label="Texto botón outline" value={designDraft.buttonOutlineTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                        <ColorField label="Borde botón outline" value={designDraft.buttonOutlineBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                    </div>
                                </CollapsibleCard>
                                <div className="bg-slate-900 text-white p-12 rounded-[2rem] shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 space-y-4">
                                        <div className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: designDraft.colorPrimary }}>Preview Visual</div>
                                        <h2 className="text-4xl 2xl:text-6xl font-black tracking-tighter" style={{ fontFamily: designDraft.fontDisplay }}>Digital Transformation</h2>
                                        <p className="text-slate-400 text-base 2xl:text-lg max-w-xl" style={{ fontFamily: designDraft.fontBody }}>Esta es una vista previa de cómo interactúan tus tipografías y colores principales.</p>
                                    </div>
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

                        {(tab === 'structure' || tab === 'sections') && (
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
            </div>

            <AnimatePresence>
                {isPreviewModalOpen && tab !== 'advanced' && (
                    <motion.div
                        className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm p-3 md:p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="relative h-full w-full bg-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex"
                        >
                            <button
                                type="button"
                                onClick={() => setIsPreviewModalOpen(false)}
                                className="absolute top-3 right-3 z-30 h-10 w-10 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {previewContent}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
