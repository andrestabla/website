import { useEffect, useMemo, useState, useRef } from 'react'
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
    Briefcase
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

            {/* Split Layout Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* Panel Editor - Left */}
                <div className="w-full xl:w-[450px] 2xl:w-[500px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                            {tabs.map(t => {
                                const Icon = t.icon
                                const isSelected = tab === t.id
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all min-w-0 ${isSelected
                                            ? 'bg-white text-brand-primary shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span className="truncate">{t.label}</span>
                                    </button>
                                )
                            })}
                        </div>
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
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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
                                <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                        <h3 className="font-black text-slate-900 text-sm flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                            Textos Principales
                                        </h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div ref={fieldRefs.highlight}>
                                            <Field label="Highlight"><Input value={heroDraft.highlight} onChange={e => setHeroDraft(d => ({ ...d, highlight: e.target.value }))} /></Field>
                                        </div>
                                        <div ref={fieldRefs.title}>
                                            <Field label="Titular (H1)"><Textarea rows={3} value={heroDraft.title} onChange={e => setHeroDraft(d => ({ ...d, title: e.target.value }))} /></Field>
                                        </div>
                                        <div ref={fieldRefs.subtitle}>
                                            <Field label="Subtítulo"><Textarea rows={3} value={heroDraft.subtitle} onChange={e => setHeroDraft(d => ({ ...d, subtitle: e.target.value }))} /></Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div ref={fieldRefs.cta}>
                                                <Field label="CTA Prim."><Input value={heroDraft.cta} onChange={e => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                                            </div>
                                            <div ref={fieldRefs.secondaryCta}>
                                                <Field label="CTA Sec."><Input value={heroDraft.secondaryCta} onChange={e => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2 border-b border-slate-100 pb-3">Estilos Visuales</div>
                                    <ColorField label="Fondo Sección" value={homeDraft.hero.style.backgroundColor} onChange={(v) => setHeroStyle('backgroundColor', v)} />
                                    <Field label="Imagen/Video Fondo">
                                        <div className="space-y-3">
                                            <Input value={homeDraft.hero.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, hero: { ...homeDraft.hero, style: { ...homeDraft.hero.style, backgroundImageUrl: e.target.value } } })} />
                                            <ImageUrlPreview url={homeDraft.hero.style.backgroundImageUrl} />
                                        </div>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ColorField label="Color Filtro" value={homeDraft.hero.style.sectionOverlayColor} onChange={(v) => setHeroStyle('sectionOverlayColor', v)} />
                                        <RangeField label="Opacidad" value={Number(homeDraft.hero.style.sectionOverlayOpacity || '0.92')} onChange={(v) => setHeroStyle('sectionOverlayOpacity', v.toFixed(2))} />
                                    </div>
                                    <Field label="Acento Titular">
                                        <ColorField label="" value={homeDraft.hero.style.titleAccentColor} onChange={(v) => setHeroStyle('titleAccentColor', v)} />
                                    </Field>
                                </section>
                            </div>
                        )}

                        {tab === 'services' && (
                            <div className="space-y-6">
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Cabecera Servicios (Home)</div>
                                    <Field label="Eyebrow"><Input value={homeDraft.servicesSection.eyebrow} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, eyebrow: e.target.value } })} /></Field>
                                    <Field label="Título Sección"><Textarea rows={2} value={homeDraft.servicesSection.title} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, title: e.target.value } })} /></Field>
                                    <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.servicesSection.subtitle} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, subtitle: e.target.value } })} /></Field>
                                    <Field label="Número decorativo"><Input value={homeDraft.servicesSection.sectionNumber} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, sectionNumber: e.target.value } })} /></Field>
                                    <ColorField label="Fondo" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                                    <Field label="Imagen Fondo (URL)">
                                        <div className="space-y-3">
                                            <Input value={homeDraft.servicesSection.style.backgroundImageUrl} onChange={e => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundImageUrl: e.target.value } } })} />
                                            <ImageUrlPreview url={homeDraft.servicesSection.style.backgroundImageUrl} />
                                        </div>
                                    </Field>
                                </section>
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Servicios Vinculados</div>
                                    {state.services.map(s => (
                                        <button key={s.slug} type="button" className="w-full border border-slate-100 p-3 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all cursor-pointer text-left" onClick={() => navigate(`/admin/services?slug=${s.slug}`)}>
                                            <div>
                                                <div className="font-black text-slate-900 text-xs">{s.title}</div>
                                                <div className="text-[9px] text-slate-400 uppercase tracking-widest">{s.highlight}</div>
                                            </div>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-primary" />
                                        </button>
                                    ))}
                                </section>
                            </div>
                        )}

                        {tab === 'products' && (
                            <div className="space-y-6">
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Cabecera Productos (Home)</div>
                                    <Field label="Eyebrow"><Input value={homeDraft.productsSection.eyebrow} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, eyebrow: e.target.value } })} /></Field>
                                    <Field label="Título Sección"><Textarea rows={2} value={homeDraft.productsSection.title} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, title: e.target.value } })} /></Field>
                                    <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.productsSection.subtitle} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, subtitle: e.target.value } })} /></Field>
                                    <Field label="Label Precio"><Input value={homeDraft.productsSection.availabilityPricingLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, availabilityPricingLabel: e.target.value } })} /></Field>
                                    <Field label="Label CTA Deploy"><Input value={homeDraft.productsSection.deploySolutionLabel} onChange={e => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, deploySolutionLabel: e.target.value } })} /></Field>
                                    <ColorField label="Fondo" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                                </section>
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Productos Vinculados</div>
                                    {state.products.map(p => (
                                        <button key={p.slug} type="button" className="w-full border border-slate-100 p-3 rounded-xl flex justify-between items-center group hover:bg-slate-50 transition-all cursor-pointer text-left" onClick={() => navigate(`/admin/products?slug=${p.slug}`)}>
                                            <div className="font-black text-slate-900 text-xs">{p.title}</div>
                                            <div className="text-[10px] font-bold text-brand-primary">{p.price}</div>
                                        </button>
                                    ))}
                                </section>
                            </div>
                        )}

                        {tab === 'frameworks' && (
                            <div className="space-y-6">
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Frameworks (Home)</div>
                                    <Field label="Eyebrow"><Input value={homeDraft.frameworksSection.eyebrow} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, eyebrow: e.target.value } })} /></Field>
                                    <Field label="Título"><Textarea rows={2} value={homeDraft.frameworksSection.title} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, title: e.target.value } })} /></Field>
                                    <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.frameworksSection.subtitle} onChange={e => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, subtitle: e.target.value } })} /></Field>
                                    <ColorField label="Fondo" value={homeDraft.frameworksSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundColor: v } } })} />
                                    <RangeField label="Opacidad Overlay" value={Number(homeDraft.frameworksSection.style.overlayOpacity || '0.10')} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, overlayOpacity: v.toFixed(2) } } })} />
                                </section>
                            </div>
                        )}

                        {tab === 'contact' && (
                            <div className="space-y-6">
                                <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Contacto (Home)</div>
                                    <Field label="Eyebrow"><Input value={homeDraft.contactSection.eyebrow} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, eyebrow: e.target.value } })} /></Field>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Título Prefix"><Input value={homeDraft.contactSection.titlePrefix} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titlePrefix: e.target.value } })} /></Field>
                                        <Field label="Título Accent"><Input value={homeDraft.contactSection.titleAccent} onChange={e => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titleAccent: e.target.value } })} /></Field>
                                    </div>
                                    <ColorField label="Fondo" value={homeDraft.contactSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundColor: v } } })} />
                                </section>
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

                {/* Panel Preview - Right - HIGH FIDELITY */}
                {tab !== 'advanced' && (
                <div className="hidden xl:flex flex-1 bg-white flex-col overflow-hidden relative group min-w-0">
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm animate-pulse-slow">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Site Preview (High-Fidelity)</span>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-900 preview-container">
                        <div className="origin-top-left scale-[0.65] 2xl:scale-[0.8] w-[153.8%] 2xl:w-[125%] transition-transform duration-500 ease-in-out">
                            {/* Inyectamos los drafts en el componente real para fidelidad 100% */}
                            <HeroView
                                hero={heroDraft}
                                heroSection={homeDraft.hero}
                                animated={false}
                            />

                            {/* Resto del home (placeholder estilizado) */}
                            <div className="h-screen bg-slate-50 border-t border-slate-200 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Zap className="w-12 h-12 text-slate-200 mx-auto" />
                                    <div className="text-xl font-bold text-slate-300">Sections Placeholder</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    )
}
