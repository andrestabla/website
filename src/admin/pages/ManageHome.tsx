import { useEffect, useMemo, useState, useRef, type ComponentType, type CSSProperties, type ReactNode } from 'react'
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
    ArrowUp,
    ArrowDown,
    Plus,
    Trash2,
    X,
    ChevronsUpDown,
    GripVertical,
    EyeOff,
} from 'lucide-react'
import {
    useCMS,
    type HeroContent,
    type HomePageContent,
    type DesignTokens,
    type HomeSectionId,
    type HomeResponsiveViewport,
    type HomeSectionVisibility,
    type HomeBlockVisibilityMap,
    HOME_SECTION_IDS,
    HOME_SECTION_BLOCK_IDS,
    HOME_RESPONSIVE_VIEWPORTS,
} from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'
import { HeroView } from '../../sections/Hero/HeroView'
import { Button } from '../../components/ui/Button'

type Tab = 'hero' | 'services' | 'products' | 'frameworks' | 'contact' | 'visual' | 'advanced' | 'structure' | 'sections'
type HeroStructureBlock = 'section' | 'headline' | 'ctas' | 'stats'
type ServicesStructureBlock = 'section' | 'header' | 'grid'
type ProductsStructureBlock = 'section' | 'header' | 'cards'
type FrameworksStructureBlock = 'section' | 'header' | 'items'
type ContactStructureBlock = 'section' | 'header' | 'channels' | 'form'
type StructureBlockKey = string

const COLOR_SWATCHES = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#0f172a', '#1a2d5a', '#2563eb', '#3b82f6', '#f97316']
const FONT_PRESETS = ['Inter', 'Space Grotesk', 'Manrope', 'Sora', 'IBM Plex Sans', 'Montserrat', 'Poppins', 'system-ui']
const CMS_RADIUS_VALUES: Record<string, string> = { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }
const DEFAULT_HOME_SECTION_VISIBILITY: HomeSectionVisibility = { desktop: true, tablet: true, mobile: true }
const HOME_SECTION_META: Record<HomeSectionId, {
    label: string
    shortLabel: string
    description: string
    tab: Tab
    icon: ComponentType<{ className?: string }>
    anchor: string
    accent: string
}> = {
    hero: { label: 'Hero', shortLabel: 'Hero', description: 'Bloque principal con titular, CTAs y panel de métricas.', tab: 'hero', icon: Layout, anchor: '#inicio', accent: '#2563eb' },
    services: { label: 'Servicios', shortLabel: 'Servicios', description: 'Cabecera de servicios y grilla de oferta.', tab: 'services', icon: Briefcase, anchor: '#servicios', accent: '#0ea5e9' },
    products: { label: 'Productos', shortLabel: 'Productos', description: 'Módulos/soluciones y CTA de despliegue.', tab: 'products', icon: Package, anchor: '#productos', accent: '#8b5cf6' },
    frameworks: { label: 'Frameworks', shortLabel: 'Frameworks', description: 'Bloque de confianza/compliance y marcos.', tab: 'frameworks', icon: ShieldCheck, anchor: '#confianza', accent: '#22c55e' },
    contact: { label: 'Contacto', shortLabel: 'Contacto', description: 'Formulario y canales de contacto.', tab: 'contact', icon: Mail, anchor: '#contacto', accent: '#f97316' },
}

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
            <div
                className="grid gap-2 rounded-xl bg-slate-100 p-1"
                style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(options.length, 1), 4)}, minmax(0, 1fr))` }}
            >
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
    const [structureSelectedSection, setStructureSelectedSection] = useState<HomeSectionId>('hero')
    const [structureHeroBlock, setStructureHeroBlock] = useState<HeroStructureBlock>('section')
    const [structureServicesBlock, setStructureServicesBlock] = useState<ServicesStructureBlock>('section')
    const [structureProductsBlock, setStructureProductsBlock] = useState<ProductsStructureBlock>('section')
    const [structureFrameworksBlock, setStructureFrameworksBlock] = useState<FrameworksStructureBlock>('section')
    const [structureContactBlock, setStructureContactBlock] = useState<ContactStructureBlock>('section')
    const [structureDraggedSection, setStructureDraggedSection] = useState<HomeSectionId | null>(null)
    const [structureInspectorTab, setStructureInspectorTab] = useState<'content' | 'behavior' | 'style'>('content')
    const [fieldSearch, setFieldSearch] = useState('')
    const [presetSelection, setPresetSelection] = useState('')
    const [styleClipboard, setStyleClipboard] = useState<Record<string, any> | null>(null)
    const [openTabGroup, setOpenTabGroup] = useState<'Principal' | 'Secciones' | 'Sistema' | null>('Principal')

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
    const defaultSectionVisibilityMap = useMemo(
        () => Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, { ...DEFAULT_HOME_SECTION_VISIBILITY }])) as Record<HomeSectionId, HomeSectionVisibility>,
        []
    )
    const defaultBlockVisibilityMap = useMemo(
        () => Object.fromEntries(
            HOME_SECTION_IDS.map((sectionId) => [
                sectionId,
                Object.fromEntries(
                    HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [blockId, { ...DEFAULT_HOME_SECTION_VISIBILITY }])
                ),
            ])
        ) as HomeBlockVisibilityMap,
        []
    )
    const homeLayout = homeDraft.layout ?? { sectionOrder: [...HOME_SECTION_IDS], hiddenSections: [], sectionVisibility: defaultSectionVisibilityMap, blockVisibility: defaultBlockVisibilityMap }
    const structureSectionOrder = [...new Set([...(homeLayout.sectionOrder ?? []), ...HOME_SECTION_IDS].filter((id): id is HomeSectionId => HOME_SECTION_IDS.includes(id as HomeSectionId)))]
    const hiddenSectionSet = new Set<HomeSectionId>((homeLayout.hiddenSections ?? []).filter((id): id is HomeSectionId => HOME_SECTION_IDS.includes(id as HomeSectionId)))
    const structureSectionVisibility = HOME_SECTION_IDS.reduce((acc, id) => {
        acc[id] = {
            ...DEFAULT_HOME_SECTION_VISIBILITY,
            ...(homeLayout.sectionVisibility?.[id] ?? {}),
        }
        return acc
    }, {} as Record<HomeSectionId, HomeSectionVisibility>)
    const structureBlockVisibility = HOME_SECTION_IDS.reduce((acc, sectionId) => {
        acc[sectionId] = Object.fromEntries(
            HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [
                blockId,
                {
                    ...DEFAULT_HOME_SECTION_VISIBILITY,
                    ...((homeLayout.blockVisibility as any)?.[sectionId]?.[blockId] ?? {}),
                },
            ])
        ) as any
        return acc
    }, {} as HomeBlockVisibilityMap)
    const heroButtonRadius = CMS_RADIUS_VALUES[String(designDraft.borderRadius || 'none')] ?? '0px'
    const heroPrimaryCtaPreview = heroDraft.cta.trim() || 'Iniciar transformación'
    const heroSecondaryCtaPreview = heroDraft.secondaryCta.trim() || 'Ver servicios'
    const heroButtonPreviewVars = {
        ['--cms-button-primary-text' as any]: designDraft.buttonPrimaryTextColor || '#ffffff',
        ['--cms-button-primary-hover-text' as any]: designDraft.buttonPrimaryHoverTextColor || '#ffffff',
        ['--cms-button-primary-hover-bg' as any]: designDraft.buttonPrimaryHoverBgColor || '#0f172a',
        ['--cms-button-outline-text' as any]: designDraft.buttonOutlineTextColor || '#ffffff',
        ['--cms-button-outline-border' as any]: designDraft.buttonOutlineBorderColor || '#e2e8f0',
        ['--cms-button-outline-hover-text' as any]: designDraft.buttonOutlineHoverTextColor || '#2563eb',
        ['--cms-button-outline-hover-border' as any]: designDraft.buttonOutlineHoverBorderColor || '#2563eb',
        ['--cms-button-outline-hover-bg' as any]: designDraft.buttonOutlineHoverBgColor || 'transparent',
    } as CSSProperties
    const parseNum = (value: string | undefined, fallback: number) => {
        const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : fallback
    }
    const setHomeLayout = (patch: Partial<HomePageContent['layout']>) => {
        const nextOrder = patch.sectionOrder ?? homeLayout.sectionOrder
        const nextHidden = patch.hiddenSections ?? homeLayout.hiddenSections
        const nextSectionVisibility = patch.sectionVisibility ?? homeLayout.sectionVisibility
        const nextBlockVisibility = patch.blockVisibility ?? homeLayout.blockVisibility
        setHome({
            ...homeDraft,
            layout: {
                ...homeLayout,
                ...patch,
                sectionOrder: [...new Set([...(nextOrder ?? []), ...HOME_SECTION_IDS].filter((id): id is HomeSectionId => HOME_SECTION_IDS.includes(id as HomeSectionId)))],
                hiddenSections: [...new Set((nextHidden ?? []).filter((id): id is HomeSectionId => HOME_SECTION_IDS.includes(id as HomeSectionId)))],
                sectionVisibility: HOME_SECTION_IDS.reduce((acc, id) => {
                    acc[id] = {
                        ...DEFAULT_HOME_SECTION_VISIBILITY,
                        ...((nextSectionVisibility as Record<HomeSectionId, Partial<HomeSectionVisibility>> | undefined)?.[id] ?? {}),
                    }
                    return acc
                }, {} as Record<HomeSectionId, HomeSectionVisibility>),
                blockVisibility: HOME_SECTION_IDS.reduce((acc, sectionId) => {
                    acc[sectionId] = Object.fromEntries(
                        HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [
                            blockId,
                            {
                                ...DEFAULT_HOME_SECTION_VISIBILITY,
                                ...((nextBlockVisibility as any)?.[sectionId]?.[blockId] ?? {}),
                            },
                        ])
                    ) as any
                    return acc
                }, {} as HomeBlockVisibilityMap),
            },
        })
    }
    const reorderStructureSections = (fromId: HomeSectionId, toId: HomeSectionId) => {
        if (fromId === toId) return
        const next = [...structureSectionOrder]
        const fromIndex = next.indexOf(fromId)
        const toIndex = next.indexOf(toId)
        if (fromIndex === -1 || toIndex === -1) return
        next.splice(fromIndex, 1)
        next.splice(toIndex, 0, fromId)
        setHomeLayout({ sectionOrder: next })
    }
    const moveStructureSection = (sectionId: HomeSectionId, direction: -1 | 1) => {
        const currentIndex = structureSectionOrder.indexOf(sectionId)
        if (currentIndex === -1) return
        const targetIndex = currentIndex + direction
        if (targetIndex < 0 || targetIndex >= structureSectionOrder.length) return
        reorderStructureSections(sectionId, structureSectionOrder[targetIndex])
    }
    const toggleStructureSectionVisibility = (sectionId: HomeSectionId) => {
        const isHidden = hiddenSectionSet.has(sectionId)
        const hiddenSections = isHidden
            ? homeLayout.hiddenSections.filter((id) => id !== sectionId)
            : [...homeLayout.hiddenSections, sectionId]
        setHomeLayout({ hiddenSections })
    }
    const isSectionVisibleInPreviewViewport = (sectionId: HomeSectionId, viewport: HomeResponsiveViewport) => {
        if (hiddenSectionSet.has(sectionId)) return false
        return structureSectionVisibility[sectionId]?.[viewport] !== false
    }
    const setSectionViewportVisibility = (sectionId: HomeSectionId, viewport: HomeResponsiveViewport, visible: boolean) => {
        setHomeLayout({
            sectionVisibility: {
                ...structureSectionVisibility,
                [sectionId]: {
                    ...structureSectionVisibility[sectionId],
                    [viewport]: visible,
                },
            },
        })
    }
    const setSectionAllViewportVisibility = (sectionId: HomeSectionId, visible: boolean) => {
        setHomeLayout({
            sectionVisibility: {
                ...structureSectionVisibility,
                [sectionId]: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = visible
                    return acc
                }, { ...structureSectionVisibility[sectionId] } as HomeSectionVisibility),
            },
        })
    }
    const getSelectedStructureBlockKey = (sectionId: HomeSectionId = structureSelectedSection): StructureBlockKey | null => {
        if (sectionId === 'hero') return structureHeroBlock === 'section' ? null : structureHeroBlock
        if (sectionId === 'services') return structureServicesBlock === 'section' ? null : structureServicesBlock
        if (sectionId === 'products') return structureProductsBlock === 'section' ? null : structureProductsBlock
        if (sectionId === 'frameworks') return structureFrameworksBlock === 'section' ? null : structureFrameworksBlock
        if (sectionId === 'contact') return structureContactBlock === 'section' ? null : structureContactBlock
        return null
    }
    const isSectionBlockVisibleInPreviewViewport = (sectionId: HomeSectionId, blockId: StructureBlockKey, viewport: HomeResponsiveViewport) => {
        const sectionBlocks = (structureBlockVisibility as any)[sectionId]
        const blockVisibility = sectionBlocks?.[blockId]
        if (!blockVisibility) return true
        return blockVisibility[viewport] !== false
    }
    const setSectionBlockViewportVisibility = (sectionId: HomeSectionId, blockId: StructureBlockKey, viewport: HomeResponsiveViewport, visible: boolean) => {
        const nextSectionBlocks = {
            ...((structureBlockVisibility as any)[sectionId] ?? {}),
            [blockId]: {
                ...((structureBlockVisibility as any)[sectionId]?.[blockId] ?? DEFAULT_HOME_SECTION_VISIBILITY),
                [viewport]: visible,
            },
        }
        setHomeLayout({
            blockVisibility: {
                ...structureBlockVisibility,
                [sectionId]: nextSectionBlocks,
            } as any,
        })
    }
    const setSectionBlockAllViewportVisibility = (sectionId: HomeSectionId, blockId: StructureBlockKey, visible: boolean) => {
        setHomeLayout({
            blockVisibility: {
                ...structureBlockVisibility,
                [sectionId]: {
                    ...((structureBlockVisibility as any)[sectionId] ?? {}),
                    [blockId]: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                        acc[viewport] = visible
                        return acc
                    }, { ...DEFAULT_HOME_SECTION_VISIBILITY } as HomeSectionVisibility),
                },
            } as any,
        })
    }
    const openSectionEditorFromStructure = (sectionId: HomeSectionId) => {
        const meta = HOME_SECTION_META[sectionId]
        setTab(meta.tab)
        setStructureSelectedSection(sectionId)
        if (sectionId !== 'hero') setStructureHeroBlock('section')
        if (sectionId !== 'services') setStructureServicesBlock('section')
        if (sectionId !== 'products') setStructureProductsBlock('section')
        if (sectionId !== 'frameworks') setStructureFrameworksBlock('section')
        if (sectionId !== 'contact') setStructureContactBlock('section')
        if (sectionId === 'hero') {
            setHeroPanelTab(
                structureHeroBlock === 'stats'
                    ? 'stats'
                    : structureHeroBlock === 'ctas'
                        ? 'cta'
                        : 'content'
            )
        }
    }
    const openSectionStyleEditorFromStructure = (sectionId: HomeSectionId) => {
        const meta = HOME_SECTION_META[sectionId]
        setTab(meta.tab)
        setStructureSelectedSection(sectionId)
        if (sectionId !== 'hero') setStructureHeroBlock('section')
        if (sectionId !== 'services') setStructureServicesBlock('section')
        if (sectionId !== 'products') setStructureProductsBlock('section')
        if (sectionId !== 'frameworks') setStructureFrameworksBlock('section')
        if (sectionId !== 'contact') setStructureContactBlock('section')
        if (sectionId === 'hero') {
            setHeroPanelTab(
                structureHeroBlock === 'stats'
                    ? 'stats'
                    : structureHeroBlock === 'headline'
                        ? 'type'
                        : structureHeroBlock === 'ctas'
                            ? 'cta'
                            : 'background'
            )
        }
    }
    const getStructureSectionHeadline = (sectionId: HomeSectionId) => {
        if (sectionId === 'hero') return heroDraft.title
        if (sectionId === 'services') return homeDraft.servicesSection.title
        if (sectionId === 'products') return homeDraft.productsSection.title
        if (sectionId === 'frameworks') return homeDraft.frameworksSection.title
        return `${homeDraft.contactSection.titlePrefix} ${homeDraft.contactSection.titleAccent}`.trim()
    }
    const getStructureSectionSubline = (sectionId: HomeSectionId) => {
        if (sectionId === 'hero') return heroDraft.subtitle
        if (sectionId === 'services') return homeDraft.servicesSection.subtitle
        if (sectionId === 'products') return homeDraft.productsSection.subtitle
        if (sectionId === 'frameworks') return homeDraft.frameworksSection.subtitle
        return homeDraft.contactSection.eyebrow
    }
    const getActiveStructureBlockLabel = (sectionId: HomeSectionId) => {
        if (sectionId === 'hero') return structureHeroBlock === 'section' ? 'General' : structureHeroBlock === 'headline' ? 'Titular' : structureHeroBlock === 'ctas' ? 'CTAs' : 'Stats'
        if (sectionId === 'services') return structureServicesBlock === 'section' ? 'General' : structureServicesBlock === 'header' ? 'Header' : 'Grid'
        if (sectionId === 'products') return structureProductsBlock === 'section' ? 'General' : structureProductsBlock === 'header' ? 'Header' : 'Cards'
        if (sectionId === 'frameworks') return structureFrameworksBlock === 'section' ? 'General' : structureFrameworksBlock === 'header' ? 'Header' : 'Items'
        if (sectionId === 'contact') return structureContactBlock === 'section' ? 'General' : structureContactBlock === 'header' ? 'Header' : structureContactBlock === 'channels' ? 'Canales' : 'Formulario'
        return null
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
        { id: 'hero-cta', tab: 'hero', label: 'Hero botones (CTA)', keywords: 'cta button boton call to action iniciar transformacion ver servicios', action: () => { setTab('hero'); fieldRefs.cta.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
        { id: 'hero-overlay', tab: 'hero', label: 'Hero overlay / filtro', keywords: 'overlay filtro opacity opacidad background hero', action: () => { setTab('hero'); setHeroPanelTab('background'); } },
        { id: 'hero-stats', tab: 'hero', label: 'Hero stats panel', keywords: 'stats panel metricas hero', action: () => { setTab('hero'); setHeroPanelTab('stats'); } },
        { id: 'services-header', tab: 'services', label: 'Servicios cabecera Home', keywords: 'services home header title subtitle eyebrow', action: () => setTab('services') },
        { id: 'products-header', tab: 'products', label: 'Productos cabecera Home', keywords: 'products home header title subtitle labels', action: () => setTab('products') },
        { id: 'frameworks-items', tab: 'frameworks', label: 'Frameworks items', keywords: 'frameworks items compliance cards blocks', action: () => setTab('frameworks') },
        { id: 'contact-labels', tab: 'contact', label: 'Contacto labels', keywords: 'contact labels linkedin email hq official', action: () => setTab('contact') },
        { id: 'visual-palette', tab: 'visual', label: 'Paleta global', keywords: 'color palette primary secondary accent visual', action: () => setTab('visual') },
        { id: 'visual-typography', tab: 'visual', label: 'Tipografías globales', keywords: 'font typography display body visual', action: () => setTab('visual') },
        { id: 'json-advanced', tab: 'advanced', label: 'JSON avanzado', keywords: 'json advanced raw', action: () => setTab('advanced') },
    ]), [fieldRefs.title, fieldRefs.subtitle, fieldRefs.cta])

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

    const currentTabMeta = tabs.find(t => t.id === tab)
    const currentTabGroup = (currentTabMeta?.group ?? 'Principal') as 'Principal' | 'Secciones' | 'Sistema'

    const previewScaleClass = previewViewport === 'desktop'
        ? 'scale-[0.65] 2xl:scale-[0.8] w-[153.8%] 2xl:w-[125%]'
        : previewViewport === 'tablet'
            ? 'scale-[0.45] w-[222%]'
            : 'scale-[0.34] w-[294%]'

    const selectSectionFromCanvas = (sectionId: HomeSectionId) => {
        setStructureSelectedSection(sectionId)
        setStructureHeroBlock('section')
        setStructureServicesBlock('section')
        setStructureProductsBlock('section')
        setStructureFrameworksBlock('section')
        setStructureContactBlock('section')
        if (tab !== 'structure' && tab !== 'sections') {
            setTab(HOME_SECTION_META[sectionId].tab)
        }
    }
    const selectHeroBlockFromCanvas = (block: HeroStructureBlock) => {
        setStructureSelectedSection('hero')
        setStructureHeroBlock(block)
        setStructureServicesBlock('section')
        setStructureProductsBlock('section')
        setStructureFrameworksBlock('section')
        setStructureContactBlock('section')
        if (tab !== 'structure' && tab !== 'sections') {
            setTab('structure')
        }
    }
    const selectServicesBlockFromCanvas = (block: ServicesStructureBlock) => {
        setStructureSelectedSection('services')
        setStructureHeroBlock('section')
        setStructureServicesBlock(block)
        setStructureProductsBlock('section')
        setStructureFrameworksBlock('section')
        setStructureContactBlock('section')
        if (tab !== 'structure' && tab !== 'sections') {
            setTab('structure')
        }
    }
    const selectProductsBlockFromCanvas = (block: ProductsStructureBlock) => {
        setStructureSelectedSection('products')
        setStructureHeroBlock('section')
        setStructureServicesBlock('section')
        setStructureProductsBlock(block)
        setStructureFrameworksBlock('section')
        setStructureContactBlock('section')
        if (tab !== 'structure' && tab !== 'sections') {
            setTab('structure')
        }
    }
    const selectFrameworksBlockFromCanvas = (block: FrameworksStructureBlock) => {
        setStructureSelectedSection('frameworks')
        setStructureHeroBlock('section')
        setStructureServicesBlock('section')
        setStructureProductsBlock('section')
        setStructureFrameworksBlock(block)
        setStructureContactBlock('section')
        if (tab !== 'structure' && tab !== 'sections') {
            setTab('structure')
        }
    }
    const selectContactBlockFromCanvas = (block: ContactStructureBlock) => {
        setStructureSelectedSection('contact')
        setStructureHeroBlock('section')
        setStructureServicesBlock('section')
        setStructureProductsBlock('section')
        setStructureFrameworksBlock('section')
        setStructureContactBlock(block)
        if (tab !== 'structure' && tab !== 'sections') {
            setTab('structure')
        }
    }

    const getSectionCanvasBackground = (sectionId: HomeSectionId) => {
        if (sectionId === 'hero') return homeDraft.hero.style.backgroundColor || '#ffffff'
        if (sectionId === 'services') return homeDraft.servicesSection.style.backgroundColor || '#f8fafc'
        if (sectionId === 'products') return homeDraft.productsSection.style.backgroundColor || '#ffffff'
        if (sectionId === 'frameworks') return homeDraft.frameworksSection.style.backgroundColor || '#0f172a'
        return homeDraft.contactSection.style.backgroundColor || '#ffffff'
    }

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
                    {structureSectionOrder.map((sectionId, index) => {
                        const meta = HOME_SECTION_META[sectionId]
                        const Icon = meta.icon
                        const isSelected = structureSelectedSection === sectionId
                        const isGloballyHidden = hiddenSectionSet.has(sectionId)
                        const isViewportVisible = structureSectionVisibility[sectionId]?.[previewViewport] !== false
                        const isVisible = isSectionVisibleInPreviewViewport(sectionId, previewViewport)
                        const canvasBg = getSectionCanvasBackground(sectionId)

                        if (sectionId === 'hero') {
                            const heroVisibleBlocks = {
                                headline: isSectionBlockVisibleInPreviewViewport('hero', 'headline', previewViewport),
                                ctas: isSectionBlockVisibleInPreviewViewport('hero', 'ctas', previewViewport),
                                stats: isSectionBlockVisibleInPreviewViewport('hero', 'stats', previewViewport),
                            }
                            return (
                                <div key={`preview-${sectionId}`} className="relative border-b border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => selectHeroBlockFromCanvas('section')}
                                        className={`absolute top-6 left-6 z-20 rounded-xl border bg-white/90 backdrop-blur px-3 py-2 text-left shadow-sm transition-all ${isSelected ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                            {!isVisible && (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                                    Oculta
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">{heroDraft.cta} · {heroDraft.secondaryCta}</div>
                                    </button>

                                    {isVisible ? (
                                        <div className="relative">
                                            <HeroView hero={heroDraft} heroSection={homeDraft.hero} animated={false} visibleBlocks={heroVisibleBlocks} />

                                            <div className="absolute top-6 right-6 z-20 rounded-xl border border-slate-200 bg-white/90 backdrop-blur p-1 shadow-sm flex items-center gap-1">
                                                {([
                                                    { value: 'headline', label: 'Titular' },
                                                    { value: 'ctas', label: 'CTAs' },
                                                    { value: 'stats', label: 'Stats' },
                                                ] as const).map((opt) => {
                                                    const active = isSelected && structureHeroBlock === opt.value
                                                    return (
                                                        <button
                                                            key={`hero-block-pill-${opt.value}`}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                selectHeroBlockFromCanvas(opt.value)
                                                            }}
                                                            className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectHeroBlockFromCanvas('headline')
                                                }}
                                                className={`absolute left-[4%] top-[15%] z-10 w-[60%] h-[48%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureHeroBlock === 'headline' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar bloque titular del hero"
                                                title="Bloque titular"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureHeroBlock === 'headline' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>
                                                    Titular
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectHeroBlockFromCanvas('ctas')
                                                }}
                                                className={`absolute left-[6%] top-[58%] z-10 w-[42%] h-[12%] rounded-xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureHeroBlock === 'ctas' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar bloque CTAs del hero"
                                                title="Bloque CTAs"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureHeroBlock === 'ctas' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>
                                                    CTAs
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectHeroBlockFromCanvas('stats')
                                                }}
                                                className={`absolute right-[4.5%] top-[18%] z-10 w-[25%] h-[55%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureHeroBlock === 'stats' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'} hidden lg:block`}
                                                aria-label="Seleccionar bloque stats del hero"
                                                title="Bloque stats"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureHeroBlock === 'stats' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>
                                                    Stats
                                                </span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="min-h-[70vh] bg-slate-100 border-b border-slate-200 flex items-center justify-center">
                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Hero oculto en {previewViewport}</div>
                                                <div className="text-sm font-semibold text-slate-900 mt-1">
                                                    {isGloballyHidden ? 'Oculto globalmente' : 'Oculto por configuración responsive'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        if (sectionId === 'services') {
                            return (
                                <div
                                    key={`preview-${sectionId}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectServicesBlockFromCanvas('section')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            selectServicesBlockFromCanvas('section')
                                        }
                                    }}
                                    className={`w-full text-left relative border-b border-slate-200 transition-all ${isSelected ? 'ring-2 ring-inset ring-brand-primary/20' : ''} ${isVisible ? 'opacity-100' : 'opacity-70'}`}
                                    style={{ backgroundColor: canvasBg }}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: isVisible ? 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.88))' : 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96))' }} />

                                    <div className="absolute top-4 right-4 z-10 rounded-xl border border-slate-200 bg-white/90 backdrop-blur p-1 shadow-sm flex items-center gap-1">
                                        {([
                                            { value: 'header', label: 'Header' },
                                            { value: 'grid', label: 'Grid' },
                                        ] as const).map((opt) => {
                                            const active = isSelected && structureServicesBlock === opt.value
                                            return (
                                                <button
                                                    key={`services-pill-${opt.value}`}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        selectServicesBlockFromCanvas(opt.value)
                                                    }}
                                                    className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="relative p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                            {isVisible ? 'Visible' : 'Oculta'}
                                                        </span>
                                                    </div>
                                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-3 line-clamp-2">{getStructureSectionHeadline(sectionId) || meta.label}</div>
                                                    <div className="text-sm text-slate-500 mt-2 max-w-3xl line-clamp-2">{getStructureSectionSubline(sectionId) || meta.description}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].desktop ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>D</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].tablet ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>T</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].mobile ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>M</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Array.from({ length: Math.min(4, state.services.length || 4) }).map((_, cardIndex) => (
                                                <div key={`services-card-preview-${cardIndex}`} className="rounded-xl border border-slate-200 bg-white/90 p-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 mb-3" />
                                                    <div className="h-3 rounded bg-slate-200 w-2/3 mb-2" />
                                                    <div className="h-2 rounded bg-slate-100 w-full mb-1.5" />
                                                    <div className="h-2 rounded bg-slate-100 w-5/6" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectServicesBlockFromCanvas('header')
                                                }}
                                                className={`absolute left-6 right-6 top-14 h-[38%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureServicesBlock === 'header' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar header de servicios"
                                                title="Header servicios"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureServicesBlock === 'header' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Header</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectServicesBlockFromCanvas('grid')
                                                }}
                                                className={`absolute left-6 right-6 bottom-6 h-[35%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureServicesBlock === 'grid' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar grid de servicios"
                                                title="Grid servicios"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureServicesBlock === 'grid' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Grid</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        }

                        if (sectionId === 'products') {
                            return (
                                <div
                                    key={`preview-${sectionId}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectProductsBlockFromCanvas('section')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            selectProductsBlockFromCanvas('section')
                                        }
                                    }}
                                    className={`w-full text-left relative border-b border-slate-200 transition-all ${isSelected ? 'ring-2 ring-inset ring-brand-primary/20' : ''} ${isVisible ? 'opacity-100' : 'opacity-70'}`}
                                    style={{ backgroundColor: canvasBg }}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: isVisible ? 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.88))' : 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96))' }} />

                                    <div className="absolute top-4 right-4 z-10 rounded-xl border border-slate-200 bg-white/90 backdrop-blur p-1 shadow-sm flex items-center gap-1">
                                        {([
                                            { value: 'header', label: 'Header' },
                                            { value: 'cards', label: 'Cards' },
                                        ] as const).map((opt) => {
                                            const active = isSelected && structureProductsBlock === opt.value
                                            return (
                                                <button
                                                    key={`products-pill-${opt.value}`}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        selectProductsBlockFromCanvas(opt.value)
                                                    }}
                                                    className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="relative p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                            {isVisible ? 'Visible' : 'Oculta'}
                                                        </span>
                                                    </div>
                                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-3 line-clamp-2">{getStructureSectionHeadline(sectionId) || meta.label}</div>
                                                    <div className="text-sm text-slate-500 mt-2 max-w-3xl line-clamp-2">{getStructureSectionSubline(sectionId) || meta.description}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].desktop ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>D</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].tablet ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>T</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].mobile ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>M</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            {Array.from({ length: Math.min(3, state.products.length || 3) }).map((_, cardIndex) => (
                                                <div key={`products-card-preview-${cardIndex}`} className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200" />
                                                        <div className="h-3 rounded bg-blue-100 w-14" />
                                                    </div>
                                                    <div className="h-3 rounded bg-slate-200 w-2/3" />
                                                    <div className="h-2 rounded bg-slate-100 w-full" />
                                                    <div className="h-8 rounded-lg border border-slate-200 bg-white" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectProductsBlockFromCanvas('header')
                                                }}
                                                className={`absolute left-6 right-6 top-14 h-[35%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureProductsBlock === 'header' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar header de productos"
                                                title="Header productos"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureProductsBlock === 'header' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Header</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectProductsBlockFromCanvas('cards')
                                                }}
                                                className={`absolute left-6 right-6 bottom-6 h-[38%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureProductsBlock === 'cards' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar cards de productos"
                                                title="Cards productos"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureProductsBlock === 'cards' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Cards</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        }

                        if (sectionId === 'frameworks') {
                            return (
                                <div
                                    key={`preview-${sectionId}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectFrameworksBlockFromCanvas('section')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            selectFrameworksBlockFromCanvas('section')
                                        }
                                    }}
                                    className={`w-full text-left relative border-b border-slate-200 transition-all ${isSelected ? 'ring-2 ring-inset ring-brand-primary/20' : ''} ${isVisible ? 'opacity-100' : 'opacity-70'}`}
                                    style={{ backgroundColor: canvasBg }}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: isVisible ? 'linear-gradient(180deg, rgba(255,255,255,0.76), rgba(255,255,255,0.88))' : 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96))' }} />

                                    <div className="absolute top-4 right-4 z-10 rounded-xl border border-slate-200 bg-white/90 backdrop-blur p-1 shadow-sm flex items-center gap-1">
                                        {([
                                            { value: 'header', label: 'Header' },
                                            { value: 'items', label: 'Items' },
                                        ] as const).map((opt) => {
                                            const active = isSelected && structureFrameworksBlock === opt.value
                                            return (
                                                <button
                                                    key={`frameworks-pill-${opt.value}`}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        selectFrameworksBlockFromCanvas(opt.value)
                                                    }}
                                                    className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="relative p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                            {isVisible ? 'Visible' : 'Oculta'}
                                                        </span>
                                                    </div>
                                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-3 line-clamp-2">{getStructureSectionHeadline(sectionId) || meta.label}</div>
                                                    <div className="text-sm text-slate-500 mt-2 max-w-3xl line-clamp-2">{getStructureSectionSubline(sectionId) || meta.description}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].desktop ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>D</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].tablet ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>T</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].mobile ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>M</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {homeDraft.frameworksSection.items.slice(0, 4).map((item, itemIndex) => (
                                                <div key={`frameworks-item-preview-${itemIndex}`} className="rounded-xl border border-slate-200 bg-white/90 p-4">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.organization || 'ORG'}</div>
                                                    <div className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{item.name || `Framework ${itemIndex + 1}`}</div>
                                                    <div className="h-2 rounded bg-slate-100 w-full mt-3" />
                                                    <div className="h-2 rounded bg-slate-100 w-5/6 mt-2" />
                                                </div>
                                            ))}
                                            {homeDraft.frameworksSection.items.length === 0 && (
                                                <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-xs text-slate-500">
                                                    No hay items de frameworks en el CMS.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectFrameworksBlockFromCanvas('header')
                                                }}
                                                className={`absolute left-6 right-6 top-14 h-[34%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureFrameworksBlock === 'header' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar header de frameworks"
                                                title="Header frameworks"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureFrameworksBlock === 'header' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Header</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectFrameworksBlockFromCanvas('items')
                                                }}
                                                className={`absolute left-6 right-6 bottom-6 h-[40%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureFrameworksBlock === 'items' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar items de frameworks"
                                                title="Items frameworks"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureFrameworksBlock === 'items' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Items</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        }

                        if (sectionId === 'contact') {
                            return (
                                <div
                                    key={`preview-${sectionId}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectContactBlockFromCanvas('section')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            selectContactBlockFromCanvas('section')
                                        }
                                    }}
                                    className={`w-full text-left relative border-b border-slate-200 transition-all ${isSelected ? 'ring-2 ring-inset ring-brand-primary/20' : ''} ${isVisible ? 'opacity-100' : 'opacity-70'}`}
                                    style={{ backgroundColor: canvasBg }}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: isVisible ? 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.90))' : 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96))' }} />

                                    <div className="absolute top-4 right-4 z-10 rounded-xl border border-slate-200 bg-white/90 backdrop-blur p-1 shadow-sm flex items-center gap-1">
                                        {([
                                            { value: 'header', label: 'Header' },
                                            { value: 'channels', label: 'Canales' },
                                            { value: 'form', label: 'Form' },
                                        ] as const).map((opt) => {
                                            const active = isSelected && structureContactBlock === opt.value
                                            return (
                                                <button
                                                    key={`contact-pill-${opt.value}`}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        selectContactBlockFromCanvas(opt.value)
                                                    }}
                                                    className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="relative p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                            {isVisible ? 'Visible' : 'Oculta'}
                                                        </span>
                                                    </div>
                                                    <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-3 line-clamp-2">{getStructureSectionHeadline(sectionId) || meta.label}</div>
                                                    <div className="text-sm text-slate-500 mt-2 max-w-3xl line-clamp-2">{getStructureSectionSubline(sectionId) || meta.description}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].desktop ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>D</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].tablet ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>T</span>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${structureSectionVisibility[sectionId].mobile ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>M</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-5">
                                            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 space-y-4">
                                                <div className="h-4 rounded bg-slate-200 w-3/4" />
                                                {[
                                                    homeDraft.contactSection.labels.officialChannel,
                                                    homeDraft.contactSection.labels.hubHq,
                                                    homeDraft.contactSection.labels.corporateNetwork,
                                                    homeDraft.contactSection.labels.linkedinProtocol,
                                                ].map((label, labelIndex) => (
                                                    <div key={`contact-channel-preview-${labelIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 line-clamp-1">{label || `Label ${labelIndex + 1}`}</div>
                                                        <div className="h-2 rounded bg-slate-100 w-2/3 mt-2" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 p-4 bg-white/90 space-y-3">
                                                <div className="h-9 rounded-xl bg-slate-100 border border-slate-200" />
                                                <div className="h-9 rounded-xl bg-slate-100 border border-slate-200" />
                                                <div className="h-24 rounded-xl bg-slate-100 border border-slate-200" />
                                                <div className="h-10 rounded-xl bg-white border border-slate-200" />
                                            </div>
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectContactBlockFromCanvas('header')
                                                }}
                                                className={`absolute left-6 right-6 top-14 h-[26%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureContactBlock === 'header' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar header de contacto"
                                                title="Header contacto"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureContactBlock === 'header' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Header</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectContactBlockFromCanvas('channels')
                                                }}
                                                className={`absolute left-6 bottom-6 w-[52%] h-[46%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureContactBlock === 'channels' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar canales de contacto"
                                                title="Canales contacto"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureContactBlock === 'channels' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Canales</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectContactBlockFromCanvas('form')
                                                }}
                                                className={`absolute right-6 bottom-6 w-[40%] h-[46%] rounded-2xl border-2 border-dashed bg-transparent transition-all ${isSelected && structureContactBlock === 'form' ? 'border-brand-primary shadow-[0_0_0_6px_rgba(37,99,235,0.10)]' : 'border-white/70 hover:border-brand-primary/70'}`}
                                                aria-label="Seleccionar formulario de contacto"
                                                title="Formulario contacto"
                                            >
                                                <span className={`absolute -top-3 left-3 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isSelected && structureContactBlock === 'form' ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white/95 text-slate-600'}`}>Form</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <button
                                key={`preview-${sectionId}`}
                                type="button"
                                onClick={() => selectSectionFromCanvas(sectionId)}
                                className={`w-full text-left relative border-b border-slate-200 transition-all ${isSelected ? 'ring-2 ring-inset ring-brand-primary/20' : ''} ${isVisible ? 'opacity-100' : 'opacity-70'}`}
                                style={{ backgroundColor: canvasBg }}
                            >
                                {(() => {
                                    const fallbackSectionId = sectionId as HomeSectionId
                                    const fallbackVisibility = structureSectionVisibility[fallbackSectionId]
                                    return (
                                        <>
                                <div className="absolute inset-0 pointer-events-none" style={{ background: isVisible ? 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.88))' : 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(248,250,252,0.96))' }} />
                                <div className="relative p-8 md:p-12">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                        {isVisible ? 'Visible' : 'Oculta'}
                                                    </span>
                                                </div>
                                                <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-3 line-clamp-2">{getStructureSectionHeadline(sectionId) || meta.label}</div>
                                                <div className="text-sm text-slate-500 mt-2 max-w-3xl line-clamp-2">{getStructureSectionSubline(sectionId) || meta.description}</div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${fallbackVisibility.desktop ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>D</span>
                                                <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${fallbackVisibility.tablet ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>T</span>
                                                <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${fallbackVisibility.mobile ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>M</span>
                                            </div>
                                            {!isViewportVisible && !isGloballyHidden && (
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                                                    Oculta en {previewViewport}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                        </>
                                    )
                                })()}
                            </button>
                        )
                    })}
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(['Principal', 'Secciones', 'Sistema'] as const).map((groupName) => {
                                const groupTabs = tabs.filter(t => t.group === groupName)
                                const selectedInGroup = groupTabs.find(t => t.id === tab) ?? groupTabs[0]
                                const isOpen = openTabGroup === groupName
                                const SelectedIcon = selectedInGroup.icon
                                return (
                                    <div key={groupName} className="relative">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2">{groupName}</div>
                                        <button
                                            type="button"
                                            onClick={() => setOpenTabGroup(prev => prev === groupName ? null : groupName)}
                                            className={`w-full rounded-xl border px-3 py-2.5 bg-white text-left transition-all ${currentTabGroup === groupName ? 'border-brand-primary/40 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`h-7 w-7 rounded-lg border flex items-center justify-center ${currentTabGroup === groupName ? 'border-brand-primary text-brand-primary bg-white' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                                                    <SelectedIcon className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate">{selectedInGroup.label}</div>
                                                    <div className="text-[11px] text-slate-500 truncate">{selectedInGroup.desc}</div>
                                                </div>
                                                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1">
                                                {groupTabs.map((t) => {
                                                    const Icon = t.icon
                                                    const isSelected = tab === t.id
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setTab(t.id)
                                                                setOpenTabGroup(null)
                                                            }}
                                                            className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${isSelected ? 'bg-blue-50 text-brand-primary' : 'hover:bg-slate-50 text-slate-700'}`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-primary' : 'text-slate-400'}`} />
                                                                <div className="min-w-0">
                                                                    <div className="text-[10px] font-black uppercase tracking-widest truncate">{t.label}</div>
                                                                    <div className="text-[11px] text-slate-500 truncate">{t.desc}</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
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
                                            { value: 'cta', label: 'Botones' },
                                            { value: 'stats', label: 'Stats' },
                                        ]}
                                    />
                                </section>

                                <section className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm">
                                    <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.12), transparent 40%), radial-gradient(circle at 90% 10%, rgba(15,23,42,0.08), transparent 42%)' }} />
                                    <div className="relative space-y-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Editor rápido · Botones del Hero</div>
                                                <div className="text-sm font-bold text-slate-900 mt-1">Aquí editas los dos botones visibles del bloque principal (como en tu screenshot).</div>
                                                <div className="text-xs text-slate-500 mt-1">Cambia el texto aquí y usa “Botones” para colores/hover. El preview se actualiza de inmediato.</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setHeroPanelTab('cta')}
                                                    className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50"
                                                >
                                                    Abrir estilos de botones
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setHeroPanelTab('content')}
                                                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                                >
                                                    Ir a textos del Hero
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
                                            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div ref={fieldRefs.cta}>
                                                        <Field label="Botón primario (azul / izquierda)" hint="Ejemplo: INICIAR TRANSFORMACIÓN">
                                                            <Input
                                                                value={heroDraft.cta}
                                                                onChange={(e) => setHeroDraft((d) => ({ ...d, cta: e.target.value }))}
                                                                placeholder="Iniciar transformación"
                                                            />
                                                        </Field>
                                                    </div>
                                                    <div ref={fieldRefs.secondaryCta}>
                                                        <Field label="Botón secundario (borde / derecha)" hint="Ejemplo: VER SERVICIOS">
                                                            <Input
                                                                value={heroDraft.secondaryCta}
                                                                onChange={(e) => setHeroDraft((d) => ({ ...d, secondaryCta: e.target.value }))}
                                                                placeholder="Ver servicios"
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <SegmentedField
                                                        label="Forma de botón (global)"
                                                        value={String(designDraft.buttonStyle || 'sharp') as 'sharp' | 'rounded' | 'pill'}
                                                        onChange={(v) => setDesignDraft((d) => ({ ...d, buttonStyle: v }))}
                                                        options={[
                                                            { value: 'sharp', label: 'Sharp' },
                                                            { value: 'rounded', label: 'Rounded' },
                                                            { value: 'pill', label: 'Pill' },
                                                        ]}
                                                    />
                                                    <Field label="Border radius (global)" hint="Afecta botones y otros elementos con radio global.">
                                                        <select
                                                            value={designDraft.borderRadius || 'lg'}
                                                            onChange={(e) => setDesignDraft((d) => ({ ...d, borderRadius: e.target.value }))}
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

                                            <div className="rounded-2xl border border-slate-800 bg-slate-950 text-white p-4 space-y-4 shadow-inner">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Vista previa de botones</div>
                                                        <div className="text-xs text-slate-300 mt-1">Simula el bloque de acciones del Hero para editar más rápido.</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsPreviewModalOpen(true)}
                                                        className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-blue-400"
                                                    >
                                                        Abrir preview
                                                    </button>
                                                </div>

                                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3">
                                                        <Button
                                                            type="button"
                                                            size="lg"
                                                            className="w-full md:w-auto justify-center md:justify-start"
                                                            style={{
                                                                ...heroButtonPreviewVars,
                                                                backgroundColor: designDraft.colorPrimary || undefined,
                                                                borderRadius: heroButtonRadius,
                                                            } as any}
                                                        >
                                                            {heroPrimaryCtaPreview}
                                                            <ArrowRight className="ml-3 w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="lg"
                                                            className="w-full md:w-auto justify-center md:justify-start bg-transparent"
                                                            style={{
                                                                ...heroButtonPreviewVars,
                                                                borderRadius: heroButtonRadius,
                                                            } as any}
                                                        >
                                                            {heroSecondaryCtaPreview}
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
                                                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Dónde cambiar texto</span>
                                                        <div className="mt-1">En los campos de la izquierda (arriba).</div>
                                                    </div>
                                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
                                                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Dónde cambiar colores</span>
                                                        <div className="mt-1">Tab <strong className="text-white">Botones</strong> o botón “Abrir estilos de botones”.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {heroPanelTab === 'content' && (
                                    <CollapsibleCard title="Contenido principal" subtitle="Eyebrow, H1 y subtítulo del Hero (los botones se editan en el editor rápido de arriba)" defaultOpen>
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
                                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">Botones del Hero</div>
                                                    <div className="text-sm font-semibold text-slate-900 mt-1">Ahora se editan en el bloque “Editor rápido · Botones del Hero” de arriba.</div>
                                                    <div className="text-xs text-slate-500 mt-1">Ahí puedes cambiar textos y ver el resultado sin navegar entre sub-tabs.</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHeroPanelTab('cta')}
                                                    className="px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50"
                                                >
                                                    Abrir estilos de botones
                                                </button>
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
                                    <CollapsibleCard title="Botones del Hero · Estilo avanzado" subtitle="Colores, hover y forma global de botones (los textos se editan arriba en el editor rápido)" defaultOpen>
                                        <div className="space-y-6 pt-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Field label="Texto CTA principal"><Input value={heroDraft.cta} onChange={(e) => setHeroDraft(d => ({ ...d, cta: e.target.value }))} /></Field>
                                                <Field label="Texto CTA secundario"><Input value={heroDraft.secondaryCta} onChange={(e) => setHeroDraft(d => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ColorField label="Color CTA principal" value={designDraft.colorPrimary} onChange={v => setDesignDraft(d => ({ ...d, colorPrimary: v }))} />
                                                <ColorField label="Texto CTA principal" value={designDraft.buttonPrimaryTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                                                <ColorField label="Hover fondo CTA principal" value={designDraft.buttonPrimaryHoverBgColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryHoverBgColor: v }))} />
                                                <ColorField label="Hover texto CTA principal" value={designDraft.buttonPrimaryHoverTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryHoverTextColor: v }))} />
                                                <ColorField label="Texto CTA secundario" value={designDraft.buttonOutlineTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                                <ColorField label="Borde CTA secundario" value={designDraft.buttonOutlineBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                                <ColorField label="Hover texto CTA secundario" value={designDraft.buttonOutlineHoverTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverTextColor: v }))} />
                                                <ColorField label="Hover borde CTA secundario" value={designDraft.buttonOutlineHoverBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverBorderColor: v }))} />
                                                <ColorField label="Hover fondo CTA secundario" value={designDraft.buttonOutlineHoverBgColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverBgColor: v }))} />
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
                                        <ColorField label="Hover fondo botón primario" value={designDraft.buttonPrimaryHoverBgColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryHoverBgColor: v }))} />
                                        <ColorField label="Hover texto botón primario" value={designDraft.buttonPrimaryHoverTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryHoverTextColor: v }))} />
                                        <ColorField label="Texto botón outline" value={designDraft.buttonOutlineTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                        <ColorField label="Borde botón outline" value={designDraft.buttonOutlineBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                        <ColorField label="Hover texto botón outline" value={designDraft.buttonOutlineHoverTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverTextColor: v }))} />
                                        <ColorField label="Hover borde botón outline" value={designDraft.buttonOutlineHoverBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverBorderColor: v }))} />
                                        <ColorField label="Hover fondo botón outline" value={designDraft.buttonOutlineHoverBgColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineHoverBgColor: v }))} />
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
                            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
                                <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Visual CMS v1 · Canvas de Secciones</div>
                                                <h3 className="text-lg font-black tracking-tight text-slate-900 mt-1">Arrastra para reordenar y haz clic para editar</h3>
                                                <p className="text-xs text-slate-500 mt-1">Controla el orden y la visibilidad del Home desde una sola vista. El panel derecho funciona como inspector contextual.</p>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
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
                                                            title={`Canvas ${opt.label}`}
                                                            onClick={() => setPreviewViewport(opt.value)}
                                                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-blue-50 text-brand-primary border border-blue-100' : 'text-slate-500 hover:text-slate-800'}`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 space-y-3 ${previewViewport === 'mobile' ? 'max-w-md mx-auto' : previewViewport === 'tablet' ? 'max-w-3xl mx-auto' : ''}`}>
                                            {structureSectionOrder.map((sectionId, index) => {
                                                const meta = HOME_SECTION_META[sectionId]
                                                const Icon = meta.icon
                                                const isSelected = structureSelectedSection === sectionId
                                                const isHidden = hiddenSectionSet.has(sectionId)
                                                const isDragging = structureDraggedSection === sectionId
                                                const headline = getStructureSectionHeadline(sectionId)
                                                const subline = getStructureSectionSubline(sectionId)
                                                return (
                                                    <div
                                                        key={sectionId}
                                                        draggable
                                                        onDragStart={() => {
                                                            setStructureDraggedSection(sectionId)
                                                            selectSectionFromCanvas(sectionId)
                                                        }}
                                                        onDragEnd={() => setStructureDraggedSection(null)}
                                                        onDragOver={(e) => {
                                                            e.preventDefault()
                                                            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault()
                                                            if (structureDraggedSection) reorderStructureSections(structureDraggedSection, sectionId)
                                                            setStructureDraggedSection(null)
                                                        }}
                                                        onClick={() => selectSectionFromCanvas(sectionId)}
                                                        className={`group cursor-pointer rounded-2xl border p-3 bg-white transition-all ${isSelected ? 'border-brand-primary shadow-md shadow-blue-100' : 'border-slate-200 hover:border-slate-300'} ${isDragging ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="pt-1 text-slate-300 group-hover:text-slate-500">
                                                                <GripVertical className="w-4 h-4" />
                                                            </div>
                                                            <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
                                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-700">{meta.label}</span>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${isHidden ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                                                        {isHidden ? 'Oculta' : 'Visible'}
                                                                    </span>
                                                                </div>
                                                                <div className={`mt-2 rounded-xl border p-3 ${isHidden ? 'border-slate-200 bg-slate-50/80 opacity-70' : 'border-slate-200 bg-white'}`}>
                                                                    <div className="text-sm font-bold text-slate-900 line-clamp-2">{headline || `Sección ${meta.shortLabel}`}</div>
                                                                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{subline || meta.description}</div>
                                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.anchor}</div>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    toggleStructureSectionVisibility(sectionId)
                                                                                }}
                                                                                className={`h-8 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest ${isHidden ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
                                                                            >
                                                                                {isHidden ? 'Mostrar' : 'Ocultar'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    openSectionEditorFromStructure(sectionId)
                                                                                }}
                                                                                className="h-8 px-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                                                            >
                                                                                Editar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden xl:sticky xl:top-6">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-white">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Inspector</div>
                                        <h3 className="text-lg font-black tracking-tight text-slate-900 mt-1">Sección seleccionada</h3>
                                        <p className="text-xs text-slate-500 mt-1">Edita contenido clave, visibilidad y orden sin salir del canvas.</p>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        {(() => {
                                            const selected = structureSelectedSection
                                            const meta = HOME_SECTION_META[selected]
                                            const Icon = meta.icon
                                            const selectedIndex = structureSectionOrder.indexOf(selected)
                                            const isHidden = hiddenSectionSet.has(selected)
                                            const canMoveUp = selectedIndex > 0
                                            const canMoveDown = selectedIndex < structureSectionOrder.length - 1
                                            const selectedBlockKey = getSelectedStructureBlockKey(selected)

                                            return (
                                                <>
                                                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}14`, color: meta.accent }}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <div className="text-sm font-black text-slate-900">{meta.label}</div>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posición #{selectedIndex + 1}</span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1">{meta.description}</div>
                                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                    <span className="text-[10px] px-2 py-1 rounded-full border border-slate-200 bg-white font-black uppercase tracking-widest text-slate-500">{meta.anchor}</span>
                                                                    <span className={`text-[10px] px-2 py-1 rounded-full border font-black uppercase tracking-widest ${isHidden ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                                                        {isHidden ? 'Oculta' : 'Visible'}
                                                                    </span>
                                                                    {getActiveStructureBlockLabel(selected) && (
                                                                        <span className="text-[10px] px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-brand-primary font-black uppercase tracking-widest">
                                                                            Bloque: {getActiveStructureBlockLabel(selected)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleStructureSectionVisibility(selected)}
                                                            className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${isHidden ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                                                        >
                                                            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                            {isHidden ? 'Mostrar sección' : 'Ocultar sección'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openSectionEditorFromStructure(selected)}
                                                            className="h-11 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary flex items-center justify-center gap-2"
                                                        >
                                                            <ArrowRight className="w-4 h-4" />
                                                            Abrir editor completo
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveStructureSection(selected, -1)}
                                                            disabled={!canMoveUp}
                                                            className="h-11 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            <ArrowUp className="w-4 h-4" />
                                                            Subir
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveStructureSection(selected, 1)}
                                                            disabled={!canMoveDown}
                                                            className="h-11 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            <ArrowDown className="w-4 h-4" />
                                                            Bajar
                                                        </button>
                                                    </div>

                                                    <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                                                        <SegmentedField
                                                            label="Inspector"
                                                            value={structureInspectorTab}
                                                            onChange={setStructureInspectorTab}
                                                            options={[
                                                                { value: 'content', label: 'Contenido', icon: Layout },
                                                                { value: 'behavior', label: 'Comport.', icon: Eye },
                                                                { value: 'style', label: 'Estilo', icon: Palette },
                                                            ]}
                                                        />
                                                    </div>

                                                    {structureInspectorTab === 'content' && (
                                                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Edit</div>
                                                                    <div className="text-sm font-bold text-slate-900 mt-1">Contenido esencial</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStructureInspectorTab('style')}
                                                                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                                                >
                                                                    Ir a estilo
                                                                </button>
                                                            </div>

                                                            {selected === 'hero' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque activo · Hero"
                                                                        value={structureHeroBlock}
                                                                        onChange={setStructureHeroBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'headline', label: 'Titular', icon: Sparkles },
                                                                            { value: 'ctas', label: 'CTAs', icon: ArrowRight },
                                                                            { value: 'stats', label: 'Stats', icon: ShieldCheck },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                        Selecciona un hotspot en el preview o cambia aquí el bloque para editar solo ese fragmento del Hero.
                                                                    </div>

                                                                    {(structureHeroBlock === 'section' || structureHeroBlock === 'headline') && (
                                                                        <div className="space-y-4">
                                                                            <Field label="Highlight"><Input value={heroDraft.highlight} onChange={(e) => setHeroDraft((d) => ({ ...d, highlight: e.target.value }))} /></Field>
                                                                            <Field label="Título"><Textarea rows={3} value={heroDraft.title} onChange={(e) => setHeroDraft((d) => ({ ...d, title: e.target.value }))} /></Field>
                                                                            <Field label="Subtítulo"><Textarea rows={3} value={heroDraft.subtitle} onChange={(e) => setHeroDraft((d) => ({ ...d, subtitle: e.target.value }))} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {(structureHeroBlock === 'section' || structureHeroBlock === 'ctas') && (
                                                                        <div className="grid grid-cols-1 gap-4">
                                                                            <Field label="Botón principal"><Input value={heroDraft.cta} onChange={(e) => setHeroDraft((d) => ({ ...d, cta: e.target.value }))} /></Field>
                                                                            <Field label="Botón secundario"><Input value={heroDraft.secondaryCta} onChange={(e) => setHeroDraft((d) => ({ ...d, secondaryCta: e.target.value }))} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {structureHeroBlock === 'stats' && (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stats Panel</div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={addHeroStat}
                                                                                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary flex items-center gap-2"
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5" />
                                                                                    Agregar
                                                                                </button>
                                                                            </div>
                                                                            {homeDraft.hero.stats.map((stat, statIndex) => (
                                                                                <div key={`hero-stat-quick-${statIndex}`} className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stat #{statIndex + 1}</div>
                                                                                        {homeDraft.hero.stats.length > 1 && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => removeHeroStat(statIndex)}
                                                                                                className="h-7 w-7 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center"
                                                                                                title="Eliminar stat"
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <Field label="Label"><Input value={stat.label} onChange={(e) => setHeroStat(statIndex, 'label', e.target.value)} /></Field>
                                                                                    <Field label="Valor"><Input value={stat.value} onChange={(e) => setHeroStat(statIndex, 'value', e.target.value)} /></Field>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'services' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque activo · Services"
                                                                        value={structureServicesBlock}
                                                                        onChange={setStructureServicesBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'grid', label: 'Grid', icon: Briefcase },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                        Selecciona `Header` o `Grid` desde el preview para editar esa parte. Las tarjetas se administran desde el módulo `Services`.
                                                                    </div>

                                                                    {(structureServicesBlock === 'section' || structureServicesBlock === 'header') && (
                                                                        <div className="space-y-4">
                                                                            <Field label="Eyebrow"><Input value={homeDraft.servicesSection.eyebrow} onChange={(e) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, eyebrow: e.target.value } })} /></Field>
                                                                            <Field label="Título"><Textarea rows={2} value={homeDraft.servicesSection.title} onChange={(e) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, title: e.target.value } })} /></Field>
                                                                            <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.servicesSection.subtitle} onChange={(e) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, subtitle: e.target.value } })} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {(structureServicesBlock === 'section' || structureServicesBlock === 'grid') && (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <Field label="Número decorativo"><Input value={homeDraft.servicesSection.sectionNumber} onChange={(e) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, sectionNumber: e.target.value } })} /></Field>
                                                                                <Field label="Servicios publicados"><Input value={String(state.services.length)} onChange={() => { }} disabled /></Field>
                                                                            </div>
                                                                            <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                                                <div>
                                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tarjetas del grid</div>
                                                                                    <div className="text-xs text-slate-500 mt-1">Contenido de tarjetas, copy y orden se administra en el módulo de servicios.</div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => navigate('/admin/services')}
                                                                                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary flex items-center justify-center gap-2"
                                                                                >
                                                                                    <ArrowRight className="w-4 h-4" />
                                                                                    Abrir Services
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {structureServicesBlock === 'section' && (
                                                                        <ColorField label="Fondo (quick)" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'products' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque activo · Products"
                                                                        value={structureProductsBlock}
                                                                        onChange={setStructureProductsBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'cards', label: 'Cards', icon: Package },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                        Selecciona `Header` o `Cards` desde el preview. Las fichas de producto se gestionan en el módulo `Products`.
                                                                    </div>

                                                                    {(structureProductsBlock === 'section' || structureProductsBlock === 'header') && (
                                                                        <div className="space-y-4">
                                                                            <Field label="Eyebrow"><Input value={homeDraft.productsSection.eyebrow} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, eyebrow: e.target.value } })} /></Field>
                                                                            <Field label="Título"><Textarea rows={2} value={homeDraft.productsSection.title} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, title: e.target.value } })} /></Field>
                                                                            <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.productsSection.subtitle} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, subtitle: e.target.value } })} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {(structureProductsBlock === 'section' || structureProductsBlock === 'cards') && (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <Field label="Label Precio"><Input value={homeDraft.productsSection.availabilityPricingLabel} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, availabilityPricingLabel: e.target.value } })} /></Field>
                                                                                <Field label="Label CTA Deploy"><Input value={homeDraft.productsSection.deploySolutionLabel} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, deploySolutionLabel: e.target.value } })} /></Field>
                                                                                <Field label="Productos publicados"><Input value={String(state.products.length)} onChange={() => { }} disabled /></Field>
                                                                            </div>
                                                                            <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                                                <div>
                                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cards de producto</div>
                                                                                    <div className="text-xs text-slate-500 mt-1">El contenido de cada card (título, precio, CTA, descripción) se edita en el módulo de productos.</div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => navigate('/admin/products')}
                                                                                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary flex items-center justify-center gap-2"
                                                                                >
                                                                                    <ArrowRight className="w-4 h-4" />
                                                                                    Abrir Products
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {structureProductsBlock === 'section' && (
                                                                        <ColorField label="Fondo (quick)" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'frameworks' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque activo · Frameworks"
                                                                        value={structureFrameworksBlock}
                                                                        onChange={setStructureFrameworksBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'items', label: 'Items', icon: ShieldCheck },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                        Selecciona `Header` o `Items` desde el preview. Aquí editas contenido; estilos de fondo/overlay están en la pestaña `Estilo`.
                                                                    </div>

                                                                    {(structureFrameworksBlock === 'section' || structureFrameworksBlock === 'header') && (
                                                                        <div className="space-y-4">
                                                                            <Field label="Eyebrow"><Input value={homeDraft.frameworksSection.eyebrow} onChange={(e) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, eyebrow: e.target.value } })} /></Field>
                                                                            <Field label="Título"><Textarea rows={2} value={homeDraft.frameworksSection.title} onChange={(e) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, title: e.target.value } })} /></Field>
                                                                            <Field label="Subtítulo"><Textarea rows={3} value={homeDraft.frameworksSection.subtitle} onChange={(e) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, subtitle: e.target.value } })} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {(structureFrameworksBlock === 'section' || structureFrameworksBlock === 'items') && (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Items / Compliance blocks</div>
                                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 rounded-full px-2 py-1 bg-white">
                                                                                    {homeDraft.frameworksSection.items.length} items
                                                                                </div>
                                                                            </div>
                                                                            {homeDraft.frameworksSection.items.map((item, itemIndex) => (
                                                                                <div key={`frameworks-quick-${itemIndex}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                                                                    <Field label="Organización">
                                                                                        <Input
                                                                                            value={item.organization}
                                                                                            onChange={(e) => {
                                                                                                const items = [...homeDraft.frameworksSection.items]
                                                                                                items[itemIndex] = { ...items[itemIndex], organization: e.target.value }
                                                                                                setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items } })
                                                                                            }}
                                                                                        />
                                                                                    </Field>
                                                                                    <Field label="Nombre">
                                                                                        <Input
                                                                                            value={item.name}
                                                                                            onChange={(e) => {
                                                                                                const items = [...homeDraft.frameworksSection.items]
                                                                                                items[itemIndex] = { ...items[itemIndex], name: e.target.value }
                                                                                                setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, items } })
                                                                                            }}
                                                                                        />
                                                                                    </Field>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'contact' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque activo · Contact"
                                                                        value={structureContactBlock}
                                                                        onChange={setStructureContactBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'channels', label: 'Canales', icon: Mail },
                                                                            { value: 'form', label: 'Form', icon: Braces },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                        Selecciona `Header`, `Canales` o `Form` desde el preview. El formulario todavía no expone copy editable en este schema (solo estilos).
                                                                    </div>

                                                                    {(structureContactBlock === 'section' || structureContactBlock === 'header') && (
                                                                        <div className="space-y-4">
                                                                            <Field label="Eyebrow"><Input value={homeDraft.contactSection.eyebrow} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, eyebrow: e.target.value } })} /></Field>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <Field label="Título Prefix"><Input value={homeDraft.contactSection.titlePrefix} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titlePrefix: e.target.value } })} /></Field>
                                                                                <Field label="Título Accent"><Input value={homeDraft.contactSection.titleAccent} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, titleAccent: e.target.value } })} /></Field>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {(structureContactBlock === 'section' || structureContactBlock === 'channels') && (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <Field label="Canal oficial"><Input value={homeDraft.contactSection.labels.officialChannel} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, officialChannel: e.target.value } } })} /></Field>
                                                                            <Field label="Hub / HQ"><Input value={homeDraft.contactSection.labels.hubHq} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, hubHq: e.target.value } } })} /></Field>
                                                                            <Field label="Red corporativa"><Input value={homeDraft.contactSection.labels.corporateNetwork} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, corporateNetwork: e.target.value } } })} /></Field>
                                                                            <Field label="LinkedIn protocol"><Input value={homeDraft.contactSection.labels.linkedinProtocol} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, labels: { ...homeDraft.contactSection.labels, linkedinProtocol: e.target.value } } })} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {structureContactBlock === 'form' && (
                                                                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formulario (contenido)</div>
                                                                            <div className="text-xs text-slate-500">
                                                                                El formulario no tiene textos configurables por CMS en este schema. En la pestaña `Estilo` sí puedes editar el panel del formulario.
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setStructureInspectorTab('style')}
                                                                                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-primary flex items-center gap-2"
                                                                            >
                                                                                <Palette className="w-4 h-4" />
                                                                                Ir a estilo del formulario
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {structureInspectorTab === 'behavior' && (
                                                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comportamiento</div>
                                                                    <div className="text-sm font-bold text-slate-900 mt-1">Visibilidad y responsive</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStructureInspectorTab('content')}
                                                                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                                                >
                                                                    Contenido
                                                                </button>
                                                            </div>

                                                            <div className={`rounded-xl border p-3 ${isHidden ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado global</div>
                                                                        <div className="text-sm font-bold text-slate-900 mt-1">{isHidden ? 'Sección oculta globalmente' : 'Sección visible globalmente'}</div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleStructureSectionVisibility(selected)}
                                                                        className={`h-10 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isHidden ? 'border-emerald-200 bg-white text-emerald-700' : 'border-amber-200 bg-white text-amber-700'}`}
                                                                    >
                                                                        {isHidden ? 'Mostrar' : 'Ocultar'}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visibilidad por dispositivo</div>
                                                                        <div className="text-xs text-slate-500 mt-1">Estos switches se guardan en el layout y afectan el render público.</div>
                                                                    </div>
                                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isSectionVisibleInPreviewViewport(selected, previewViewport) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                                        {isSectionVisibleInPreviewViewport(selected, previewViewport) ? `Visible en ${previewViewport}` : `Oculta en ${previewViewport}`}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                    {HOME_RESPONSIVE_VIEWPORTS.map((viewport) => {
                                                                        const isOn = structureSectionVisibility[selected][viewport]
                                                                        const viewportLabel = viewport === 'desktop' ? 'Desktop' : viewport === 'tablet' ? 'Tablet' : 'Mobile'
                                                                        const viewportShort = viewport === 'desktop' ? 'D' : viewport === 'tablet' ? 'T' : 'M'
                                                                        const isCurrentViewport = previewViewport === viewport
                                                                        return (
                                                                            <button
                                                                                key={`${selected}-${viewport}`}
                                                                                type="button"
                                                                                onClick={() => setSectionViewportVisibility(selected, viewport, !isOn)}
                                                                                className={`rounded-xl border p-3 text-left transition-colors ${isOn ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'} ${isCurrentViewport ? 'ring-2 ring-brand-primary/15' : ''}`}
                                                                            >
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{viewportShort}</span>
                                                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isOn ? 'border-emerald-200 bg-white text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>{isOn ? 'ON' : 'OFF'}</span>
                                                                                </div>
                                                                                <div className="text-xs font-bold text-slate-900 mt-2">{viewportLabel}</div>
                                                                                <div className="text-[11px] text-slate-500 mt-0.5">{isCurrentViewport ? 'Viewport actual del preview' : 'Toggle independiente'}</div>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSectionAllViewportVisibility(selected, true)}
                                                                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                                                    >
                                                                        Mostrar en todos
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSectionViewportVisibility(selected, 'mobile', false)}
                                                                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                                                    >
                                                                        Ocultar solo mobile
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {selectedBlockKey && (
                                                                <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bloque activo · Responsive</div>
                                                                            <div className="text-sm font-bold text-slate-900 mt-1">{getActiveStructureBlockLabel(selected)}</div>
                                                                        </div>
                                                                        <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isSectionBlockVisibleInPreviewViewport(selected, selectedBlockKey, previewViewport) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                                            {isSectionBlockVisibleInPreviewViewport(selected, selectedBlockKey, previewViewport) ? `Visible en ${previewViewport}` : `Oculto en ${previewViewport}`}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                        {HOME_RESPONSIVE_VIEWPORTS.map((viewport) => {
                                                                            const isOn = isSectionBlockVisibleInPreviewViewport(selected, selectedBlockKey, viewport)
                                                                            const viewportLabel = viewport === 'desktop' ? 'Desktop' : viewport === 'tablet' ? 'Tablet' : 'Mobile'
                                                                            const viewportShort = viewport === 'desktop' ? 'D' : viewport === 'tablet' ? 'T' : 'M'
                                                                            const isCurrentViewport = previewViewport === viewport
                                                                            return (
                                                                                <button
                                                                                    key={`${selected}-${selectedBlockKey}-${viewport}`}
                                                                                    type="button"
                                                                                    onClick={() => setSectionBlockViewportVisibility(selected, selectedBlockKey, viewport, !isOn)}
                                                                                    className={`rounded-xl border p-3 text-left transition-colors ${isOn ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'} ${isCurrentViewport ? 'ring-2 ring-brand-primary/15' : ''}`}
                                                                                >
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{viewportShort}</span>
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isOn ? 'border-emerald-200 bg-white text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>{isOn ? 'ON' : 'OFF'}</span>
                                                                                    </div>
                                                                                    <div className="text-xs font-bold text-slate-900 mt-2">{viewportLabel}</div>
                                                                                    <div className="text-[11px] text-slate-500 mt-0.5">{isCurrentViewport ? 'Viewport actual del preview' : 'Toggle independiente'}</div>
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setSectionBlockAllViewportVisibility(selected, selectedBlockKey, true)}
                                                                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                                                        >
                                                                            Mostrar bloque en todos
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setSectionBlockViewportVisibility(selected, selectedBlockKey, 'mobile', false)}
                                                                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                                                                        >
                                                                            Ocultar bloque en mobile
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {structureInspectorTab === 'style' && (
                                                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Style Shortcuts</div>
                                                                    <div className="text-sm font-bold text-slate-900 mt-1">Ajustes rápidos de apariencia</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openSectionStyleEditorFromStructure(selected)}
                                                                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary"
                                                                >
                                                                    Abrir editor completo
                                                                </button>
                                                            </div>

                                                            {selected === 'hero' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque de estilo · Hero"
                                                                        value={structureHeroBlock}
                                                                        onChange={setStructureHeroBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'headline', label: 'Titular', icon: Sparkles },
                                                                            { value: 'ctas', label: 'CTAs', icon: ArrowRight },
                                                                            { value: 'stats', label: 'Stats', icon: ShieldCheck },
                                                                        ]}
                                                                    />

                                                                    {(structureHeroBlock === 'section' || structureHeroBlock === 'headline') && (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <ColorField label="Color título" value={homeDraft.hero.style.titleColor} onChange={(v) => setHeroStyle('titleColor', v)} />
                                                                            <ColorField label="Color acento título" value={homeDraft.hero.style.titleAccentColor} onChange={(v) => setHeroStyle('titleAccentColor', v)} />
                                                                            <ColorField label="Color subtítulo" value={homeDraft.hero.style.subtitleColor} onChange={(v) => setHeroStyle('subtitleColor', v)} />
                                                                            <ColorField label="Color highlight" value={homeDraft.hero.style.highlightColor} onChange={(v) => setHeroStyle('highlightColor', v)} />
                                                                        </div>
                                                                    )}

                                                                    {(structureHeroBlock === 'section' || structureHeroBlock === 'ctas') && (
                                                                        <div className="space-y-4 rounded-xl border border-slate-200 p-3 bg-slate-50">
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">CTAs (tokens globales rápidos)</div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <ColorField label="Texto botón primario" value={designDraft.buttonPrimaryTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryTextColor: v }))} />
                                                                                <ColorField label="Hover fondo primario" value={designDraft.buttonPrimaryHoverBgColor} onChange={v => setDesignDraft(d => ({ ...d, buttonPrimaryHoverBgColor: v }))} />
                                                                                <ColorField label="Texto outline" value={designDraft.buttonOutlineTextColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineTextColor: v }))} />
                                                                                <ColorField label="Borde outline" value={designDraft.buttonOutlineBorderColor} onChange={v => setDesignDraft(d => ({ ...d, buttonOutlineBorderColor: v }))} />
                                                                            </div>
                                                                            <SegmentedField
                                                                                label="Forma de botón"
                                                                                value={String(designDraft.buttonStyle || 'sharp') as 'sharp' | 'rounded' | 'pill'}
                                                                                onChange={(v) => setDesignDraft(d => ({ ...d, buttonStyle: v }))}
                                                                                options={[
                                                                                    { value: 'sharp', label: 'Sharp' },
                                                                                    { value: 'rounded', label: 'Rounded' },
                                                                                    { value: 'pill', label: 'Pill' },
                                                                                ]}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {(structureHeroBlock === 'section' || structureHeroBlock === 'stats') && (
                                                                        <div className="space-y-4 rounded-xl border border-slate-200 p-3 bg-slate-50">
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel de Stats</div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <ColorField label="Fondo panel" value={homeDraft.hero.style.rightPanelBackgroundColor} onChange={(v) => setHeroStyle('rightPanelBackgroundColor', v)} />
                                                                                <ColorField label="Borde panel" value={homeDraft.hero.style.statsPanelBorderColor} onChange={(v) => setHeroStyle('statsPanelBorderColor', v)} />
                                                                                <ColorField label="Color label stat" value={homeDraft.hero.style.statsLabelColor} onChange={(v) => setHeroStyle('statsLabelColor', v)} />
                                                                                <ColorField label="Color valor stat" value={homeDraft.hero.style.statsValueColor} onChange={(v) => setHeroStyle('statsValueColor', v)} />
                                                                                <ColorField label="Divisor stats" value={homeDraft.hero.style.statsDividerColor} onChange={(v) => setHeroStyle('statsDividerColor', v)} />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {structureHeroBlock === 'section' && (
                                                                        <div className="space-y-4">
                                                                            <ColorField label="Fondo Hero" value={homeDraft.hero.style.backgroundColor} onChange={(v) => setHeroStyle('backgroundColor', v)} />
                                                                            <ColorField label="Overlay Hero" value={homeDraft.hero.style.sectionOverlayColor} onChange={(v) => setHeroStyle('sectionOverlayColor', v)} />
                                                                            <RangeField label="Opacidad Overlay Hero" value={Number(homeDraft.hero.style.sectionOverlayOpacity || '0.15')} onChange={(v) => setHeroStyle('sectionOverlayOpacity', v.toFixed(2))} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'services' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque de estilo · Services"
                                                                        value={structureServicesBlock}
                                                                        onChange={setStructureServicesBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'grid', label: 'Grid', icon: Briefcase },
                                                                        ]}
                                                                    />
                                                                    <ColorField label="Fondo sección" value={homeDraft.servicesSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundColor: v } } })} />
                                                                    <Field label="Imagen de fondo (URL)"><Input value={homeDraft.servicesSection.style.backgroundImageUrl} onChange={(e) => setHome({ ...homeDraft, servicesSection: { ...homeDraft.servicesSection, style: { ...homeDraft.servicesSection.style, backgroundImageUrl: e.target.value } } })} /></Field>
                                                                    {structureServicesBlock !== 'section' && (
                                                                        <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                            En esta versión `Services` usa estilo compartido a nivel de sección. El siguiente paso es separar estilos de `Header` y `Grid`.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'products' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque de estilo · Products"
                                                                        value={structureProductsBlock}
                                                                        onChange={setStructureProductsBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'cards', label: 'Cards', icon: Package },
                                                                        ]}
                                                                    />
                                                                    <ColorField label="Fondo sección" value={homeDraft.productsSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundColor: v } } })} />
                                                                    <Field label="Imagen de fondo (URL)"><Input value={homeDraft.productsSection.style.backgroundImageUrl} onChange={(e) => setHome({ ...homeDraft, productsSection: { ...homeDraft.productsSection, style: { ...homeDraft.productsSection.style, backgroundImageUrl: e.target.value } } })} /></Field>
                                                                    {structureProductsBlock !== 'section' && (
                                                                        <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                            En esta versión `Products` comparte estilo a nivel de sección. Próxima fase: overrides visuales por `Header` y `Cards`.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'frameworks' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque de estilo · Frameworks"
                                                                        value={structureFrameworksBlock}
                                                                        onChange={setStructureFrameworksBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'items', label: 'Items', icon: ShieldCheck },
                                                                        ]}
                                                                    />
                                                                    <ColorField label="Fondo sección" value={homeDraft.frameworksSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundColor: v } } })} />
                                                                    <RangeField label="Overlay" value={Number(homeDraft.frameworksSection.style.overlayOpacity || '0.10')} onChange={(v) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, overlayOpacity: v.toFixed(2) } } })} />
                                                                    <Field label="Imagen de fondo (URL)"><Input value={homeDraft.frameworksSection.style.backgroundImageUrl} onChange={(e) => setHome({ ...homeDraft, frameworksSection: { ...homeDraft.frameworksSection, style: { ...homeDraft.frameworksSection.style, backgroundImageUrl: e.target.value } } })} /></Field>
                                                                    {structureFrameworksBlock !== 'section' && (
                                                                        <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                            En esta versión `Frameworks` usa estilo compartido a nivel de sección. Próxima fase: overrides separados para `Header` e `Items`.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selected === 'contact' && (
                                                                <div className="space-y-4">
                                                                    <SegmentedField
                                                                        label="Bloque de estilo · Contact"
                                                                        value={structureContactBlock}
                                                                        onChange={setStructureContactBlock}
                                                                        options={[
                                                                            { value: 'section', label: 'General', icon: Layout },
                                                                            { value: 'header', label: 'Header', icon: Sparkles },
                                                                            { value: 'channels', label: 'Canales', icon: Mail },
                                                                            { value: 'form', label: 'Form', icon: Braces },
                                                                        ]}
                                                                    />

                                                                    {(structureContactBlock === 'section' || structureContactBlock === 'header' || structureContactBlock === 'channels') && (
                                                                        <div className="space-y-4">
                                                                            <ColorField label="Fondo sección" value={homeDraft.contactSection.style.backgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundColor: v } } })} />
                                                                            <Field label="Imagen fondo sección (URL)"><Input value={homeDraft.contactSection.style.backgroundImageUrl} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, backgroundImageUrl: e.target.value } } })} /></Field>
                                                                        </div>
                                                                    )}

                                                                    {(structureContactBlock === 'section' || structureContactBlock === 'form') && (
                                                                        <div className="space-y-4 rounded-xl border border-slate-200 p-3 bg-slate-50">
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel de formulario</div>
                                                                            <ColorField label="Fondo panel externo" value={homeDraft.contactSection.style.formOuterBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundColor: v } } })} />
                                                                            <Field label="Imagen panel externo (URL)"><Input value={homeDraft.contactSection.style.formOuterBackgroundImageUrl} onChange={(e) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formOuterBackgroundImageUrl: e.target.value } } })} /></Field>
                                                                            <ColorField label="Fondo panel interno" value={homeDraft.contactSection.style.formInnerBackgroundColor} onChange={(v) => setHome({ ...homeDraft, contactSection: { ...homeDraft.contactSection, style: { ...homeDraft.contactSection.style, formInnerBackgroundColor: v } } })} />
                                                                        </div>
                                                                    )}

                                                                    {(structureContactBlock === 'header' || structureContactBlock === 'channels') && (
                                                                        <div className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                            `Header` y `Canales` comparten hoy el fondo de sección. Próxima fase: estilos diferenciados por sub-bloque.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rutas rápidas</div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {structureSectionOrder.map((sectionId) => {
                                                                const m = HOME_SECTION_META[sectionId]
                                                                const isCurrent = sectionId === selected
                                                                return (
                                                                    <button
                                                                        key={`jump-${sectionId}`}
                                                                        type="button"
                                                                        onClick={() => selectSectionFromCanvas(sectionId)}
                                                                        className={`text-left rounded-xl border px-3 py-2 transition-colors ${isCurrent ? 'border-brand-primary bg-blue-50 text-brand-primary' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}
                                                                    >
                                                                        <div className="text-[10px] font-black uppercase tracking-widest">{m.shortLabel}</div>
                                                                        <div className="text-[11px] opacity-70">{m.anchor}</div>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </section>
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
