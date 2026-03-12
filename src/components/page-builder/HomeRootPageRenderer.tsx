import { Activity, ArrowRight, BarChart3, BookOpenText, Boxes, Building2, CheckCircle2, ChevronLeft, ChevronRight, Code2, GraduationCap, Laptop, Layers, Layout, LayoutDashboard, LineChart, Network, Rocket, Search, Settings2, ShieldCheck, Target, Users, X, type LucideIcon } from 'lucide-react'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ContactForm } from '../forms/ContactForm'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { type SiteArchitecturePage, type SitePageBlock } from '../../admin/context/CMSContext'
import { Link } from 'react-router-dom'
type HomeRootPageRendererProps = {
    page: SiteArchitecturePage
    selectable?: boolean
    selectedBlockId?: string | null
    onSelectBlock?: (blockId: string) => void
    className?: string
}

type ItemObject = Record<string, unknown>
type ChartPoint = { x: number; y: number }

type ThemeColors = {
    primary: string
    primaryHover: string
    secondary: string
    textAccent: string
    textHighlight: string
    border: string
    bgLight: string
    bgHighlight: string
    gradientStart: string
    gradientEnd: string
}

const THEMES: Record<string, ThemeColors> = {
    '/empresas': {
        primary: 'bg-blue-600',
        primaryHover: 'hover:bg-blue-700 hover:border-blue-700',
        secondary: 'text-blue-600',
        textAccent: 'text-blue-900',
        textHighlight: 'text-blue-700',
        border: 'border-blue-200',
        bgLight: 'bg-blue-50/50',
        bgHighlight: 'bg-blue-100',
        gradientStart: 'bg-blue-200/40',
        gradientEnd: 'bg-amber-100/40',
    },
    '/educacion': {
        primary: 'bg-emerald-700',
        primaryHover: 'hover:bg-emerald-800 hover:border-emerald-800',
        secondary: 'text-emerald-700',
        textAccent: 'text-emerald-900',
        textHighlight: 'text-emerald-800',
        border: 'border-emerald-200',
        bgLight: 'bg-emerald-50/50',
        bgHighlight: 'bg-emerald-100',
        gradientStart: 'bg-emerald-200/40',
        gradientEnd: 'bg-teal-100/40',
    },
    '/plataformas-de-aprendizaje': {
        primary: 'bg-emerald-700',
        primaryHover: 'hover:bg-emerald-800 hover:border-emerald-800',
        secondary: 'text-emerald-700',
        textAccent: 'text-emerald-900',
        textHighlight: 'text-emerald-800',
        border: 'border-emerald-200',
        bgLight: 'bg-emerald-50/50',
        bgHighlight: 'bg-emerald-100',
        gradientStart: 'bg-emerald-200/40',
        gradientEnd: 'bg-teal-100/40',
    },
    '/virtualizacion-programas': {
        primary: 'bg-emerald-700',
        primaryHover: 'hover:bg-emerald-800 hover:border-emerald-800',
        secondary: 'text-emerald-700',
        textAccent: 'text-emerald-900',
        textHighlight: 'text-emerald-800',
        border: 'border-emerald-200',
        bgLight: 'bg-emerald-50/50',
        bgHighlight: 'bg-emerald-100',
        gradientStart: 'bg-emerald-200/40',
        gradientEnd: 'bg-teal-100/40',
    },
    '/auditoria-programas-virtuales': {
        primary: 'bg-emerald-700',
        primaryHover: 'hover:bg-emerald-800 hover:border-emerald-800',
        secondary: 'text-emerald-700',
        textAccent: 'text-emerald-900',
        textHighlight: 'text-emerald-800',
        border: 'border-emerald-200',
        bgLight: 'bg-emerald-50/50',
        bgHighlight: 'bg-emerald-100',
        gradientStart: 'bg-emerald-200/40',
        gradientEnd: 'bg-teal-100/40',
    }
}

const DEFAULT_THEME = THEMES['/empresas']

const SERVICE_CARD_ICONS = [Search, Network, Users, Code2, Rocket, LineChart]
const AUDITORIA_VISUAL_ICONS = [ShieldCheck, BarChart3, LayoutDashboard, Target, BookOpenText, Users, Settings2, Rocket]
const AUDITORIA_STANDARD_FALLBACK_SCORES = [75, 87, 85, 92, 100, 88, 50, 67]
const CMS_ICON_COMPONENTS: Record<string, LucideIcon> = {
    search: Search,
    network: Network,
    users: Users,
    code2: Code2,
    rocket: Rocket,
    linechart: LineChart,
    graduationcap: GraduationCap,
    bookopentext: BookOpenText,
    building2: Building2,
    layers: Layers,
    settings2: Settings2,
    shieldcheck: ShieldCheck,
    layoutdashboard: LayoutDashboard,
    barchart3: BarChart3,
    target: Target,
    boxes: Boxes,
    laptop: Laptop,
    layout: Layout,
    activity: Activity,
}

function handleSelectableBlockClick(
    event: ReactMouseEvent<HTMLElement>,
    selectable: boolean,
    blockId: string,
    onSelect?: (id: string) => void
) {
    if (!selectable) return
    event.preventDefault()
    event.stopPropagation()
    onSelect?.(blockId)
}

function toText(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback
}

function toNumber(value: unknown, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
        const numeric = Number(value.replace(/[^\d.-]/g, ''))
        if (Number.isFinite(numeric)) return numeric
    }
    return fallback
}

function clampPercentage(value: number) {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, value))
}

function buildChartPoints(values: number[], width = 300, height = 100, padding = 8): ChartPoint[] {
    const safeValues = values.length > 0 ? values.map((value) => clampPercentage(value)) : [0]
    const step = safeValues.length > 1 ? (width - padding * 2) / (safeValues.length - 1) : 0
    return safeValues.map((value, index) => ({
        x: Number((padding + index * step).toFixed(2)),
        y: Number((height - padding - (value / 100) * (height - padding * 2)).toFixed(2)),
    }))
}

function chartPointsToPolyline(points: ChartPoint[]) {
    return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function chartPointsToAreaPath(points: ChartPoint[], height: number, padding: number) {
    if (points.length === 0) return ''
    const first = points[0]
    const last = points[points.length - 1]
    const baseline = height - padding
    return `M ${first.x} ${baseline} L ${chartPointsToPolyline(points)} L ${last.x} ${baseline} Z`
}

function normalizeCmsHref(value: unknown, fallback = '', currentPath = '/empresas') {
    if (typeof value !== 'string') return fallback
    const trimmed = value.trim()
    if (!trimmed) return fallback
    if (trimmed.startsWith('/https://')) return `https://${trimmed.slice('/https://'.length)}`
    if (trimmed.startsWith('/http://')) return `http://${trimmed.slice('/http://'.length)}`
    if (trimmed.startsWith('/https:/')) return `https://${trimmed.slice('/https:/'.length)}`
    if (trimmed.startsWith('/http:/')) return `http://${trimmed.slice('/http:/'.length)}`
    if (trimmed.startsWith('https:/') && !trimmed.startsWith('https://')) return `https://${trimmed.slice('https:/'.length)}`
    if (trimmed.startsWith('http:/') && !trimmed.startsWith('http://')) return `http://${trimmed.slice('http:/'.length)}`
    
    // Prefix internal anchors with current page path for cross-page compatibility
    if (trimmed.startsWith('#')) return `${currentPath}${trimmed}`
    if (trimmed.startsWith('/#')) return `${currentPath}${trimmed.slice(1)}`
    
    return trimmed
}

function ensureObjectItems(value: unknown): ItemObject[] {
    if (!Array.isArray(value)) return []
    const output: ItemObject[] = []
    value.forEach((item, index) => {
        if (typeof item === 'string') {
            output.push({ id: `item-${index + 1}`, label: item, title: item, body: item })
            return
        }
        if (!item || typeof item !== 'object') return
        const objectItem = item as ItemObject
        const itemId = typeof objectItem.id === 'string' && objectItem.id.trim().length > 0
            ? objectItem.id
            : `item-${index + 1}`
        output.push({ id: itemId, ...objectItem })
    })
    return output
}

function ensureStringArray(value: unknown) {
    if (!Array.isArray(value)) return []
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

function normalizeAnchorId(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed.replace(/^\/?#/, '').trim()
}

function normalizeIconToken(value: string) {
    return value.toLowerCase().replace(/[\s_-]+/g, '').trim()
}

function resolveCmsIcon(value: string) {
    if (!value) return null
    const normalized = normalizeIconToken(value)
    return CMS_ICON_COMPONENTS[normalized] ?? null
}

function resolveVirtualizacionFallbackIcon(blockId: string, itemTitle: string, index: number) {
    const normalizedTitle = itemTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    if (blockId === 'gestion-planes') {
        if (normalizedTitle.includes('pregrado') || normalizedTitle.includes('posgrado')) return GraduationCap
        if (normalizedTitle.includes('educacion continua') || normalizedTitle.includes('diplom') || normalizedTitle.includes('certific')) return BookOpenText
        if (normalizedTitle.includes('organizacional') || normalizedTitle.includes('corporativ')) return Building2
        if (normalizedTitle.includes('medida')) return Users
        if (normalizedTitle.includes('cursos cortos') || normalizedTitle.includes('micro')) return Rocket
        return SERVICE_CARD_ICONS[index % SERVICE_CARD_ICONS.length]
    }

    if (blockId === 'contenidos') {
        if (normalizedTitle.includes('fabrica') || normalizedTitle.includes('produccion') || normalizedTitle.includes('contenido')) return Layers
        if (normalizedTitle.includes('implementacion') || normalizedTitle.includes('proceso') || normalizedTitle.includes('metodologia')) return Settings2
        if (normalizedTitle.includes('curso')) return BookOpenText
        return SERVICE_CARD_ICONS[index % SERVICE_CARD_ICONS.length]
    }

    return null
}

function getLogoInitials(value: string) {
    const parts = value
        .split(/\s+/)
        .map((segment) => segment.trim())
        .filter(Boolean)
        .slice(0, 2)
    const initials = parts.map((segment) => segment[0]?.toUpperCase() ?? '').join('')
    return initials || 'CL'
}

function subscribeToMediaQuery(
    mediaQuery: MediaQueryList,
    listener: (event: MediaQueryListEvent) => void
) {
    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', listener)
        return () => mediaQuery.removeEventListener('change', listener)
    }

    if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(listener)
        return () => mediaQuery.removeListener(listener)
    }

    return () => undefined
}

function AnimatedNumber({ value, duration = 2 }: { value: number; duration?: number }) {
    const count = useMotionValue(0)
    const rounded = useTransform(count, (latest) => Math.round(latest))
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })
    const [isMobileViewport, setIsMobileViewport] = useState(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
        return window.matchMedia('(max-width: 767px)').matches
    })

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
        const mediaQuery = window.matchMedia('(max-width: 767px)')
        const syncViewport = (event?: MediaQueryListEvent) => {
            setIsMobileViewport(event ? event.matches : mediaQuery.matches)
        }
        syncViewport()
        return subscribeToMediaQuery(mediaQuery, syncViewport)
    }, [])

    useEffect(() => {
        if (isInView || isMobileViewport) {
            animate(count, value, { duration, ease: "easeOut" })
        }
    }, [isInView, isMobileViewport, count, value, duration])

    return <motion.span ref={ref}>{rounded}</motion.span>
}

function CountingNumber({ text }: { text: string }) {
    // Regex to find numbers (possibly with commas) inside the string
    // This allows strings like "500+ Docentes" or "1,200 Projects"
    const parts = text.split(/(\d+(?:,\d+)*)/)
    
    return (
        <>
            {parts.map((part, i) => {
                const num = parseInt(part.replace(/,/g, ''), 10)
                if (!isNaN(num)) {
                    return <AnimatedNumber key={i} value={num} />
                }
                return <span key={i}>{part}</span>
            })}
        </>
    )
}

function resolveBlockAnchors(block: SitePageBlock) {
    const anchors = new Set<string>()
    const idAnchor = normalizeAnchorId(block.id)
    if (idAnchor) anchors.add(idAnchor)

    if (block.id === 'hero') anchors.add('inicio')
    if (block.id === 'servicios') anchors.add('servicios-explicados')
    if (block.id === 'contacto') anchors.add('contacto-simple')
    if (block.id === 'faq') anchors.add('preguntas-frecuentes')
    if (block.id === 'cta') anchors.add('cierre-cta')

    const explicitAnchor = normalizeAnchorId(toText(block.content.anchor))
    if (explicitAnchor) anchors.add(explicitAnchor)

    return Array.from(anchors).filter(Boolean)
}

function renderHeroBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const primaryHref = normalizeCmsHref(block.content.primaryHref, '', currentPath)
    const bgImage = block.style?.backgroundImageUrl
    const isDark = toText(block.style.textColor) === '#ffffff' || toText(block.style.backgroundColor) === '#0b1323'

    return (
        <div className="relative mx-auto max-w-6xl">
            {bgImage && (
                <div className="absolute inset-x-0 -top-20 bottom-0 -z-10 overflow-hidden rounded-3xl" style={{ margin: '0 -2rem' }}>
                    <img src={bgImage} alt="" className="h-full w-full object-cover opacity-20" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0b1323] via-[#0b1323]/80' : 'from-white via-white/80'} to-transparent`} />
                </div>
            )}
            {!bgImage && <div className={`pointer-events-none absolute inset-0 services-grid-pattern opacity-35 ${isDark ? 'invert opacity-10' : ''}`} />}
            
            <div className={`pointer-events-none absolute left-[8%] top-20 h-28 w-28 rounded-full blur-2xl services-float-slow ${theme.gradientStart}`} />
            <div className={`pointer-events-none absolute right-[10%] top-32 h-36 w-36 rounded-full blur-2xl services-float-slow-delay ${theme.gradientEnd}`} />

            <div className={`relative ${bgImage ? 'pt-8' : ''}`}>
                <p className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${isDark ? 'bg-slate-800/80 text-emerald-300 border-slate-700' : `bg-white/80 ${theme.border} ${theme.textAccent}`}`}>
                    {toText(block.content.eyebrow, 'Servicios explicados sin tecnicismos')}
                </p>

                <h1 className={`mt-6 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {toText(block.content.title, 'Te ayudamos a modernizar tu empresa paso a paso, con decisiones simples y enfocadas en resultados.')}
                </h1>

                <p className={`mt-6 max-w-4xl text-lg leading-relaxed md:text-xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {toText(block.content.body, 'Diseñamos e implementamos mejoras reales para tu compañía: menos fricción operativa, más orden interno y un mejor servicio para tus clientes.')}
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                    {toText(block.content.primaryLabel) && primaryHref && (
                        <a
                            href={primaryHref}
                            className={`inline-flex items-center gap-2 border px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-colors ${isDark ? 'text-slate-900 bg-emerald-500 border-emerald-500 hover:bg-emerald-400' : `text-white border-slate-900 bg-slate-900 ${theme.primaryHover}`}`}
                        >
                            {toText(block.content.primaryLabel)}
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    )}
                    <Link
                        to="/generador-casos"
                        className={`inline-flex items-center gap-2 border px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-all ${isDark ? 'border-slate-700 bg-slate-800/40 text-white hover:border-emerald-500/50 hover:bg-slate-800/80' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900 shadow-sm'}`}
                    >
                        Ver casos en mi industria
                    </Link>
                </div>
            </div>
        </div>
    )
}

function renderPromisesBlock(block: SitePageBlock, theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)
    const bgImage = block.style?.backgroundImageUrl
    const isDark = toText(block.style.textColor) === '#ffffff' || toText(block.style.backgroundColor) === '#0b1323' || bgImage

    return (
        <div className="relative mx-auto max-w-6xl">
            {bgImage && (
                <div className="absolute inset-0 -z-10 overflow-hidden rounded-[2.5rem]">
                    <img src={bgImage} alt="" className="h-full w-full object-cover opacity-10" />
                    <div className="absolute inset-0 bg-slate-950/60 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/90" />
                </div>
            )}
            <div className={`relative px-6 py-12 md:px-10 md:py-16 ${bgImage ? 'rounded-[2.5rem] bg-slate-900/20 backdrop-blur-sm' : ''}`}>
                {toText(block.content.title) && (
                    <h2 className={`mb-4 text-3xl font-black tracking-tight md:text-4xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {toText(block.content.title)}
                    </h2>
                )}
                {toText(block.content.body) && (
                    <p className={`mb-12 max-w-3xl text-lg leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {toText(block.content.body)}
                    </p>
                )}
                
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {items.map((item, index) => {
                        // Attempt to resolve stylized icons based on title keywords
                        const title = toText(item.title || item.label || item.body).toLowerCase()
                        let Icon = CheckCircle2
                        if (title.includes('campus virtual') || title.includes('aula')) Icon = Laptop
                        if (title.includes('plataforma de aprendizaje') || title.includes('software') || title.includes('sistema')) Icon = Layout
                        if (title.includes('complemento') || title.includes('integración') || title.includes('api')) Icon = Boxes
                        if (title.includes('trazabilidad') || title.includes('seguimiento') || title.includes('datos')) Icon = Target
                        if (title.includes('pedagógica') || title.includes('aprendizaje') || title.includes('docente')) Icon = BookOpenText

                        return (
                            <article 
                                key={`${item.id || index}`} 
                                className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                                    isDark 
                                    ? 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/30 hover:bg-slate-800/40' 
                                    : `bg-white ${theme.border} hover:border-slate-400 shadow-sm`
                                }`}
                            >
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-500 group-hover:scale-110 ${
                                    isDark 
                                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' 
                                    : `${theme.bgHighlight} ${theme.textAccent}`
                                }`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className={`text-xl font-bold leading-snug ${isDark ? 'text-white group-hover:text-emerald-300' : 'text-slate-900'} transition-colors`}>
                                        {theme.textHighlight === 'text-emerald-800' ? (
                                            <CountingNumber text={toText(item.title || item.label || item.body)} />
                                        ) : (
                                            toText(item.title || item.label || item.body)
                                        )}
                                    </h3>
                                    {toText(item.body) && item.body !== item.title && (
                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {toText(item.body)}
                                        </p>
                                    )}
                                </div>

                                {/* Premium Accent Line */}
                                <div className={`absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full ${isDark ? 'bg-emerald-500/50' : `bg-slate-900/10`}`} />
                            </article>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function getAuditoriaScore(item: ItemObject, fallback = 0) {
    return clampPercentage(toNumber(item.value ?? item.score ?? item.percent, fallback))
}

function getAuditoriaScoreLabel(item: ItemObject, score: number) {
    const explicit = toText(item.scoreLabel || item.valueLabel || item.metric)
    return explicit || `${Math.round(score)}%`
}

function renderAuditoriaHeroBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const primaryHref = normalizeCmsHref(block.content.primaryHref, '', currentPath)
    const standardsHref = `${currentPath}#estandares-qm`
    const chartValues = AUDITORIA_STANDARD_FALLBACK_SCORES
    const points = buildChartPoints(chartValues, 280, 96, 10)
    const polyline = chartPointsToPolyline(points)

    return (
        <div className="relative overflow-hidden bg-white">
            <div className={`pointer-events-none absolute left-0 top-10 h-64 w-64 rounded-full blur-[100px] opacity-40 ${theme.gradientStart}`} />
            <div className={`pointer-events-none absolute right-0 bottom-10 h-72 w-72 rounded-full blur-[110px] opacity-30 ${theme.gradientEnd}`} />
            <div className="pointer-events-none absolute inset-0 services-grid-pattern opacity-[0.25]" />

            <div className="relative mx-auto max-w-7xl px-6 pt-28 pb-16 md:px-12 md:pt-40 md:pb-24">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
                    <div>
                        <p className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] bg-white/80 ${theme.border} ${theme.textAccent}`}>
                            {toText(block.content.eyebrow, 'Auditoría de programas virtuales')}
                        </p>

                        <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl xl:text-7xl">
                            {toText(block.content.title, 'Asegura la calidad de tus aulas virtuales con estándares QM')}
                        </h1>

                        {toText(block.content.body) && (
                            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 md:text-xl">
                                {toText(block.content.body)}
                            </p>
                        )}

                        <div className="mt-10 flex flex-wrap gap-4">
                            {toText(block.content.primaryLabel) && primaryHref && (
                                <a
                                    href={primaryHref}
                                    className={`inline-flex items-center gap-2 border px-7 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors border-slate-900 bg-slate-900 ${theme.primaryHover}`}
                                >
                                    {toText(block.content.primaryLabel)}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                            <a
                                href={standardsHref}
                                className={`inline-flex items-center gap-2 border px-7 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-800 transition-colors border-slate-200 bg-white hover:border-slate-900 hover:text-slate-900 shadow-sm`}
                            >
                                Ver matriz QM
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="mt-10 grid gap-3 sm:grid-cols-3">
                            {[
                                { label: 'Cobertura', value: '8 estándares' },
                                { label: 'Criterios', value: '42 subestándares' },
                                { label: 'Resultado guía', value: '80% cumplimiento' },
                            ].map((metric) => (
                                <article key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                                    <p className="mt-1 text-base font-black text-slate-900">{metric.value}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-white/80 p-6 backdrop-blur-sm shadow-lg ring-1 ring-slate-900/5">
                        <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${theme.textHighlight}`}>Panel de calidad</p>
                        <h3 className="mt-3 text-2xl font-black text-slate-900">Lectura rápida de cumplimiento</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">Vista de referencia por estándar para priorizar la intervención académica y técnica.</p>

                        <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <svg viewBox="0 0 280 96" className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de cumplimiento">
                                <defs>
                                    <linearGradient id="auditoriaHeroLine" x1="0%" x2="100%" y1="0%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                                <polyline fill="none" stroke="url(#auditoriaHeroLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
                                {points.map((point, index) => (
                                    <circle key={`hero-point-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#10b981" />
                                ))}
                            </svg>
                        </div>

                        <div className="mt-5 grid gap-2">
                            {chartValues.slice(0, 4).map((score, index) => (
                                <div key={`hero-bar-${index}`} className="flex items-center gap-3">
                                    <span className="w-5 text-[10px] font-bold uppercase text-slate-500">{index + 1}</span>
                                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                                        <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${score}%` }} />
                                    </div>
                                    <span className="w-10 text-right text-xs font-bold text-emerald-600">{score}%</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}

function renderAuditoriaMetricsBlock(block: SitePageBlock, _theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)
    if (items.length === 0) return renderPromisesBlock(block, _theme)

    const scoredItems = items.map((item, index) => {
        const score = getAuditoriaScore(item, AUDITORIA_STANDARD_FALLBACK_SCORES[index] ?? 75)
        return {
            item,
            score,
            scoreLabel: getAuditoriaScoreLabel(item, score),
            Icon: resolveCmsIcon(toText(item.icon)) || AUDITORIA_VISUAL_ICONS[index % AUDITORIA_VISUAL_ICONS.length],
        }
    })
    const summaryScore = Math.round(scoredItems.reduce((acc, entry) => acc + entry.score, 0) / Math.max(scoredItems.length, 1))
    const gaugeStyle = { background: `conic-gradient(#10b981 ${summaryScore * 3.6}deg, rgba(148,163,184,0.2) ${summaryScore * 3.6}deg 360deg)` }
    const chartPoints = buildChartPoints(scoredItems.map((entry) => entry.score), 300, 96, 10)
    const chartAreaPath = chartPointsToAreaPath(chartPoints, 96, 10)
    const chartPolyline = chartPointsToPolyline(chartPoints)

    return (
        <div className="relative overflow-hidden bg-slate-950 px-6 py-14 md:px-10 md:py-20">
            <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-[100px]" />
            <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

            <div className="relative mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300">
                            {toText(block.content.title, 'Indicadores de referencia')}
                        </p>
                        {toText(block.content.body) && <p className="mt-3 text-sm leading-relaxed text-slate-300">{toText(block.content.body)}</p>}

                        <div className="mt-6 flex justify-center">
                            <div className="relative grid h-44 w-44 place-items-center rounded-full p-3" style={gaugeStyle}>
                                <div className="grid h-full w-full place-items-center rounded-full bg-slate-950">
                                    <div className="text-center">
                                        <p className="text-4xl font-black tracking-tight text-white">{summaryScore}%</p>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Promedio</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                            <svg viewBox="0 0 300 96" className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de indicadores">
                                <defs>
                                    <linearGradient id="auditoriaMetricsArea" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(16,185,129,0.45)" />
                                        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                                    </linearGradient>
                                </defs>
                                <path d={chartAreaPath} fill="url(#auditoriaMetricsArea)" />
                                <polyline fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={chartPolyline} />
                            </svg>
                        </div>
                    </aside>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {scoredItems.map((entry, index) => {
                            const { item, score, scoreLabel, Icon } = entry
                            return (
                                <article
                                    key={`${item.id || index}`}
                                    className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-white shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-900/80"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-base font-black leading-tight text-white">
                                            {toText(item.title || item.label || `Indicador ${index + 1}`)}
                                        </p>
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-950 text-emerald-300">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {toText(item.body) && <p className="mt-3 text-sm leading-relaxed text-slate-300">{toText(item.body)}</p>}

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                            <span>Lectura</span>
                                            <span className="text-emerald-300">{scoreLabel}</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-slate-800">
                                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500" style={{ width: `${score}%` }} />
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function renderAuditoriaScopeBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)

    return (
        <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
                <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Qué auditamos')}</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Alcance de la auditoría')}</h2>
                {toText(block.content.body) && <p className="mt-5 text-lg text-slate-700">{toText(block.content.body)}</p>}
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {items.map((item, index) => {
                    const Icon = resolveCmsIcon(toText(item.icon)) || AUDITORIA_VISUAL_ICONS[index % AUDITORIA_VISUAL_ICONS.length]
                    const href = normalizeCmsHref(item.url, '', currentPath)
                    const hasCta = toText(item.label) && href

                    return (
                        <article
                            key={`${item.id || index}`}
                            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                        >
                            <span className="pointer-events-none absolute -right-3 top-2 text-7xl font-black text-emerald-900/[0.07]">{index + 1}</span>
                            <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500 group-hover:w-full" />

                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${theme.border} bg-white ${theme.textAccent}`}>
                                <Icon className="h-6 w-6" />
                            </div>

                            <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Componente ${index + 1}`)}</h3>
                            {toText(item.body || item.description) && (
                                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{toText(item.body || item.description)}</p>
                            )}

                            {hasCta && (
                                <a
                                    href={href}
                                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:text-emerald-800"
                                >
                                    {toText(item.label)}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

function renderAuditoriaStandardsBlock(block: SitePageBlock, theme: ThemeColors) {
    const title = toText(block.content.title)
    const body = toText(block.content.body)
    const items = ensureObjectItems(block.content.items)
    if (items.length === 0) return renderFallbackBlock(block, theme)

    const average = Math.round(
        items.reduce((acc, item, index) => acc + getAuditoriaScore(item, AUDITORIA_STANDARD_FALLBACK_SCORES[index] ?? 75), 0) / Math.max(items.length, 1)
    )

    return (
        <div className="mx-auto max-w-6xl">
            {title && <h2 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">{title}</h2>}
            {body && <p className="mt-4 max-w-4xl text-lg leading-relaxed text-slate-600">{body}</p>}

            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-4 md:grid-cols-2">
                    {items.map((item, index) => {
                        const itemTitle = toText(item.title || item.label || `Estándar ${index + 1}`)
                        const itemBody = toText(item.body || item.description)
                        const score = getAuditoriaScore(item, AUDITORIA_STANDARD_FALLBACK_SCORES[index] ?? 75)
                        const scoreLabel = getAuditoriaScoreLabel(item, score)
                        const Icon = resolveCmsIcon(toText(item.icon)) || AUDITORIA_VISUAL_ICONS[index % AUDITORIA_VISUAL_ICONS.length]

                        return (
                            <article key={`${item.id || index}`} className={`rounded-2xl border bg-white p-5 shadow-sm ${theme.border}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.border} ${theme.bgLight} ${theme.textAccent}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                        {scoreLabel}
                                    </span>
                                </div>
                                <h3 className="mt-3 text-lg font-black leading-tight text-slate-900">{itemTitle}</h3>
                                {itemBody && <p className="mt-2 text-sm leading-relaxed text-slate-600">{itemBody}</p>}

                                <div className="mt-4 h-2 rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${score}%` }} />
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className={`rounded-3xl border bg-white p-6 shadow-sm ${theme.border}`}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Mapa gráfico</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Distribución de cumplimiento por estándar QM.</p>

                    <div className="mt-6">
                        <div className="flex h-36 items-end gap-2">
                            {items.map((item, index) => {
                                const score = getAuditoriaScore(item, AUDITORIA_STANDARD_FALLBACK_SCORES[index] ?? 75)
                                return (
                                    <div key={`bar-${item.id || index}`} className="flex flex-1 flex-col items-center">
                                        <div className="relative h-28 w-full overflow-hidden rounded-t-md bg-emerald-100/70">
                                            <span className="absolute bottom-0 left-0 right-0 rounded-t-md bg-emerald-500/90" style={{ height: `${score}%` }} />
                                        </div>
                                        <span className="mt-2 text-[10px] font-bold text-slate-500">{index + 1}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                        <p className="text-3xl font-black tracking-tight text-emerald-800">{average}%</p>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Promedio general</p>
                    </div>
                </aside>
            </div>
        </div>
    )
}

function renderAuditoriaDeliverablesBlock(block: SitePageBlock, theme: ThemeColors) {
    const title = toText(block.content.title)
    const items = ensureObjectItems(block.content.items)
    if (items.length === 0) return renderFeatureListBlock(block, theme)

    return (
        <div className="mx-auto max-w-6xl">
            {title && <h2 className="mb-8 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">{title}</h2>}
            <div className="grid gap-4 md:grid-cols-2">
                {items.map((item, index) => {
                    const Icon = resolveCmsIcon(toText(item.icon)) || AUDITORIA_VISUAL_ICONS[index % AUDITORIA_VISUAL_ICONS.length]
                    return (
                        <article key={`${item.id || index}`} className={`flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm ${theme.border}`}>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${theme.border} ${theme.bgLight} ${theme.textAccent}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-base font-semibold leading-relaxed text-slate-800">{toText(item.title || item.label || `Entregable ${index + 1}`)}</p>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

function renderAuditoriaResourcesBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)
    if (items.length === 0) return renderFallbackBlock(block, theme)

    return (
        <div className="mx-auto max-w-6xl">
            <div className="max-w-4xl">
                <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Recursos')}</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">{toText(block.content.title, 'Recursos')}</h2>
                {toText(block.content.body) && <p className="mt-4 text-lg text-slate-600">{toText(block.content.body)}</p>}
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
                {items.map((item, index) => {
                    const href = normalizeCmsHref(item.url, '', currentPath)
                    const isExternal = /^https?:\/\//i.test(href)
                    const Icon = resolveCmsIcon(toText(item.icon)) || AUDITORIA_VISUAL_ICONS[index % AUDITORIA_VISUAL_ICONS.length]

                    return (
                        <article key={`${item.id || index}`} className={`rounded-2xl border bg-white p-6 shadow-sm ${theme.border}`}>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.border} ${theme.bgLight} ${theme.textAccent}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Recurso ${index + 1}`)}</h3>
                            {toText(item.body || item.description) && <p className="mt-2 text-sm leading-relaxed text-slate-600">{toText(item.body || item.description)}</p>}
                            {toText(item.label) && href && (
                                <a
                                    href={href}
                                    target={isExternal ? '_blank' : undefined}
                                    rel={isExternal ? 'noopener noreferrer' : undefined}
                                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 hover:text-emerald-800"
                                >
                                    {toText(item.label)}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

function renderServicesGridBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)
    return (
        <div className="mx-auto max-w-6xl">
            <div className="max-w-4xl">
                <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Servicios de punta a punta')}</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Qué hacemos y cómo beneficia a tu empresa')}</h2>
                {toText(block.content.body) && <p className="mt-5 text-lg text-slate-700">{toText(block.content.body)}</p>}
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
                {items.map((item, index) => {
                    const Icon = SERVICE_CARD_ICONS[index % SERVICE_CARD_ICONS.length]
                    const outcomes = ensureStringArray(item.outcomes)
                    const iconText = toText(item.icon)
                    const ExplicitIcon = resolveCmsIcon(iconText)

                    return (
                        <article key={`${item.id || index}`} className={`services-card-shadow border bg-white/95 px-8 py-8 ${theme.border}`}>
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 flex h-12 w-12 items-center justify-center border ${theme.border} ${theme.bgLight} ${theme.textAccent}`}>
                                    {ExplicitIcon ? (
                                        <ExplicitIcon className="h-5 w-5" />
                                    ) : iconText ? (
                                        <span className="text-lg leading-none">{iconText}</span>
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                                        {toText(item.eyebrow, `Servicio ${index + 1}`)}
                                    </p>
                                    <h3 className="mt-1 text-[2rem] font-black leading-none tracking-tight text-slate-900">{toText(item.title, `Servicio ${index + 1}`)}</h3>
                                </div>
                            </div>

                            <div className="mt-7 space-y-4 text-lg leading-relaxed text-slate-700">
                                <p><span className="font-black text-slate-900">En palabras simples:</span> {toText(item.inSimpleWords || item.body || item.description)}</p>
                                <p><span className="font-black text-slate-900">Beneficio para tu compañía:</span> {toText(item.businessBenefit || item.benefit)}</p>
                                <p><span className="font-black text-slate-900">Te conviene si hoy:</span> {toText(item.idealWhen || item.when)}</p>
                            </div>

                            {outcomes.length > 0 && (
                                <>
                                    <div className="my-7 h-px bg-slate-200" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Resultados esperados</p>
                                    <ul className="mt-4 space-y-2 text-lg text-slate-700">
                                        {outcomes.map((outcome) => (
                                            <li key={outcome} className="flex items-start gap-2">
                                                <CheckCircle2 className={`mt-1 h-5 w-5 shrink-0 ${theme.textHighlight}`} />
                                                <span>{outcome}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {toText(item.label) && toText(item.url) && (
                                <a
                                    href={normalizeCmsHref(item.url, '', currentPath)}
                                    className="mt-7 inline-flex items-center gap-2 border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-800 transition-colors hover:border-slate-900 hover:text-slate-900"
                                >
                                    {toText(item.label)}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

function renderBenefitsAndFlow(benefitsBlock: SitePageBlock, flowBlock: SitePageBlock | null, selectable: boolean, selectedBlockId: string | null, theme: ThemeColors, onSelectBlock?: (blockId: string) => void) {
    const benefitItems = ensureObjectItems(benefitsBlock.content.items)
    const flowItems = flowBlock ? ensureObjectItems(flowBlock.content.items) : []
    const flowBadges = flowBlock ? ensureStringArray(flowBlock.content.badges) : []

    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <article
                data-block-id={benefitsBlock.id}
                onClickCapture={(event) => handleSelectableBlockClick(event, selectable, benefitsBlock.id, onSelectBlock)}
                className={`border border-slate-200 bg-white px-8 py-10 md:px-10 ${selectable ? 'cursor-pointer' : ''} ${selectedBlockId === benefitsBlock.id ? `ring-2 ring-offset-2 ring-offset-slate-100 ${theme.primary}` : ''}`}
            >
                <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(benefitsBlock.content.eyebrow, 'Lo que puedes esperar')}</p>
                <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(benefitsBlock.content.title, 'Beneficios directos para el negocio')}</h2>

                <div className="mt-8 space-y-7">
                    {benefitItems.map((item, index) => (
                        <div key={`${item.id || index}`}>
                            <h3 className="text-4xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Beneficio ${index + 1}`)}</h3>
                            <p className="mt-2 text-lg leading-relaxed text-slate-700">{toText(item.body || item.description)}</p>
                            {index < benefitItems.length - 1 && <div className="mt-7 h-px bg-slate-200" />}
                        </div>
                    ))}
                </div>
            </article>

            {flowBlock && (
                <article
                    data-block-id={flowBlock.id}
                    onClickCapture={(event) => handleSelectableBlockClick(event, selectable, flowBlock.id, onSelectBlock)}
                    className={`border border-slate-700 bg-slate-950 px-8 py-10 text-white md:px-10 ${selectable ? 'cursor-pointer' : ''} ${selectedBlockId === flowBlock.id ? `ring-2 ring-offset-2 ring-offset-slate-100 ${theme.primary}` : ''}`}
                >
                    <p className={`text-[11px] font-bold uppercase tracking-[0.3em] text-white/70`}>{toText(flowBlock.content.eyebrow, 'Cómo trabajamos')}</p>
                    <h3 className="mt-5 text-4xl font-black tracking-tight text-white">{toText(flowBlock.content.title, 'Cómo trabajamos')}</h3>
                    <div className="mt-8 space-y-6">
                        {flowItems.map((item, index) => (
                            <div key={`${item.id || index}`}>
                                <p className={`text-4xl font-black leading-none ${theme.textHighlight} opacity-90`}>{toText(item.title || item.label || `Paso ${index + 1}`)}</p>
                                <p className="mt-2 text-lg leading-relaxed text-slate-200">{toText(item.body || item.description)}</p>
                            </div>
                        ))}
                    </div>
                    {flowBadges.length > 0 && (
                        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-3">
                            {flowBadges.map((badge) => (
                                <div key={badge} className="min-h-[56px] border border-white/20 bg-white/5 px-3 py-4 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-white/80 break-words whitespace-normal">
                                    {badge}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-10">
                        <a
                            href="https://www.algoritmot.com/caso-transversal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 border bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all ${theme.border} hover:bg-white/10`}
                        >
                            Ver caso
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </article>
            )}
        </div>
    )
}

function renderStandaloneFlowBlock(block: SitePageBlock) {
    const items = ensureObjectItems(block.content.items)
    const badges = ensureStringArray(block.content.badges)

    return (
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-20 md:px-12 md:py-24 shadow-2xl">
            {/* Background elements */}
            <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="pointer-events-none absolute right-1/4 bottom-0 h-96 w-96 translate-y-1/2 rounded-full bg-blue-500/10 blur-[100px]" />

            <div className="relative text-center">
                <p className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400/80">
                    {toText(block.content.eyebrow, 'Cómo trabajamos')}
                </p>
                <h3 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
                    {toText(block.content.title, 'Tu plataforma en 4 pasos')}
                </h3>
            </div>

            <div className="relative mx-auto mt-20 max-w-6xl">
                {/* Horizontal flow line for desktop */}
                <div className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-800 to-transparent lg:block" />

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {items.map((item, index) => (
                        <div key={`${item.id || index}`} className="group relative">
                            {/* Decorative numbering behind */}
                            <span className="absolute -top-10 left-0 select-none text-8xl font-black text-white/[0.03] transition-colors group-hover:text-emerald-500/[0.05]">
                                {index + 1}
                            </span>
                            
                            <article className="relative flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500/30 hover:bg-slate-900/60 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl font-black text-emerald-400 ring-1 ring-emerald-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950">
                                    {index + 1}
                                </div>
                                <h4 className="text-xl font-bold leading-tight text-white transition-colors group-hover:text-emerald-300">
                                    {toText(item.title || item.label || `Paso ${index + 1}`)}
                                </h4>
                                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                                    {toText(item.body || item.description)}
                                </p>

                                {/* Connecting dot for desktop timeline */}
                                <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center lg:flex">
                                    {index < items.length - 1 && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-emerald-500" />
                                    )}
                                </div>
                            </article>
                        </div>
                    ))}
                </div>
            </div>

            {badges.length > 0 && (
                <div className="mx-auto mt-20 flex max-w-4xl flex-wrap justify-center gap-4">
                    {badges.map((badge) => (
                        <div key={badge} className="rounded-lg border border-slate-800 bg-slate-900/50 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400">
                            {badge}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function renderFaqBlock(block: SitePageBlock, theme: ThemeColors) {
    const items = ensureObjectItems(block.content.items)
    return (
        <div className={`mx-auto max-w-6xl border px-8 py-10 md:px-10 ${theme.border} bg-white`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Preguntas frecuentes')}</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Respuestas claras para tomar decisiones')}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
                {items.map((item, index) => (
                    <article key={`${item.id || index}`} className={`border ${theme.border} ${theme.bgLight} px-6 py-6`}>
                        <h3 className="text-3xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Pregunta ${index + 1}`)}</h3>
                        <p className="mt-3 text-lg leading-relaxed text-slate-700">{toText(item.body || item.description || item.content)}</p>
                    </article>
                ))}
            </div>
        </div>
    )
}

function renderContactBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const secondaryHref = normalizeCmsHref(block.content.secondaryHref, '', currentPath)
    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <article className={`border px-8 py-10 md:px-10 ${theme.border} bg-white`}>
                <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Hablemos de tu caso')}</p>
                <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Cuéntanos qué quieres mejorar')}</h2>
                <p className="mt-5 text-lg leading-relaxed text-slate-700">{toText(block.content.body, 'Te ayudamos a definir el mejor punto de inicio según tus objetivos de negocio y contexto actual.')}</p>

                <div className="my-8 h-px bg-slate-200" />

                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Canales directos</p>
                {toText(block.content.email) && (
                    <a href={`mailto:${toText(block.content.email)}`} className="mt-3 block text-2xl font-black tracking-tight text-slate-900 hover:text-slate-700">
                        {toText(block.content.email)}
                    </a>
                )}
                {toText(block.content.secondaryLabel) && secondaryHref && (
                    <a href={secondaryHref} className={`mt-4 inline-flex items-center gap-2 text-lg font-black ${theme.secondary} hover:text-slate-700`}>
                        {toText(block.content.secondaryLabel)}
                        <ArrowRight className="h-4 w-4" />
                    </a>
                )}
            </article>

            <article className={`border px-8 py-10 shadow-2xl md:px-14 lg:px-16 ${theme.border} bg-white`}>
                <ContactForm />
                
                {toText(block.content.complianceText) && (
                    <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{toText(block.content.complianceText)}</p>
                )}
            </article>
        </div>
    )
}

function renderCtaBlock(block: SitePageBlock, currentPath: string, theme: ThemeColors) {
    const primaryHref = normalizeCmsHref(block.content.primaryHref, '', currentPath)
    return (
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white px-8 py-12 text-center md:px-10">
            <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme.textAccent}`}>{toText(block.content.eyebrow, 'Cierre')}</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, '¿Listo para avanzar?')}</h2>
            {toText(block.content.body) && <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-700">{toText(block.content.body)}</p>}
            {toText(block.content.primaryLabel) && primaryHref && (
                <a
                    href={primaryHref}
                    className={`mt-8 inline-flex items-center gap-2 border px-8 py-4 text-sm font-bold uppercase tracking-[0.24em] text-white transition-colors border-slate-900 bg-slate-900 ${theme.primaryHover}`}
                >
                    {toText(block.content.primaryLabel)}
                    <ArrowRight className="h-4 w-4" />
                </a>
            )}
        </div>
    )
}

function renderFallbackBlock(block: SitePageBlock, theme: ThemeColors) {
    const title = toText(block.content.title)
    const body = toText(block.content.body)
    const items = ensureObjectItems(block.content.items)

    return (
        <div className={`mx-auto max-w-6xl border px-8 py-8 md:px-10 ${theme.border} bg-white`}>
            {title && <h3 className="text-3xl font-black tracking-tight text-slate-900">{title}</h3>}
            {body && <p className="mt-3 text-lg leading-relaxed text-slate-700">{body}</p>}
            {items.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {items.map((item, index) => {
                        const itemTitle = toText(item.title || item.label || `Item ${index + 1}`)
                        const itemBody = toText(item.body || item.description)
                        const explicitIcon = resolveCmsIcon(toText(item.icon))
                        const inferredIcon = resolveVirtualizacionFallbackIcon(block.id, itemTitle, index)
                        const Icon = explicitIcon || inferredIcon

                        return (
                            <article key={`${item.id || index}`} className={`border px-5 py-5 ${theme.border} ${theme.bgLight}`}>
                                <div className="flex items-start gap-3">
                                    {Icon && (
                                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border ${theme.border} bg-white ${theme.textAccent}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xl font-black tracking-tight text-slate-900">{itemTitle}</p>
                                        {itemBody && <p className="mt-2 text-base text-slate-700">{itemBody}</p>}
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function renderFeatureListBlock(block: SitePageBlock, theme: ThemeColors) {
    const title = toText(block.content.title)
    const items = ensureObjectItems(block.content.items)
    const columnCount = block.style?.columns === '3' ? 'md:grid-cols-3' : 'md:grid-cols-2'

    return (
        <div className="mx-auto max-w-6xl">
            {title && <h2 className="mb-10 text-center text-4xl font-black tracking-tight md:text-5xl">{title}</h2>}
            <div className={`grid gap-4 sm:grid-cols-2 ${columnCount}`}>
                {items.map((item, index) => (
                    <div key={`${item.id || index}`} className={`flex items-start gap-3 rounded-lg border p-4 transition-all hover:-translate-y-1 hover:shadow-lg ${theme.border} ${theme.bgLight}`}>
                        <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 bg-white ${theme.secondary}`}>
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">
                            {toText(item.title || item.label || item.value || `Funcionalidad ${index + 1}`)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function renderTrustedClientsBlock(block: SitePageBlock, theme: ThemeColors, currentPath: string) {
    const title = toText(block.content.title, 'Clientes')
    const body = toText(block.content.body, 'Instituciones y empresas que han confiado en nosotros')
    const items = ensureObjectItems(block.content.items)
    const carouselItems = items.length > 1 ? [...items, ...items] : items

    if (items.length === 0) return null

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
                <h2 className={`text-4xl font-black tracking-tight md:text-5xl ${theme.textAccent}`}>{title}</h2>
                <p className="mt-5 text-lg text-slate-600">{body}</p>
            </div>

            <div className={`clients-marquee relative mt-12 overflow-hidden rounded-3xl border bg-white/80 px-4 py-6 backdrop-blur-sm md:px-6 ${theme.border}`}>
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#f8fbfa] to-transparent md:w-24" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#f8fbfa] to-transparent md:w-24" />

                <div className="clients-marquee-track flex w-max items-stretch gap-4 md:gap-6">
                    {carouselItems.map((item, index) => {
                        const name = toText(item.title || item.label, `Cliente ${index + 1}`)
                        const logoUrl = toText(item.logoUrl || item.imageUrl)
                        const itemUrl = normalizeCmsHref(item.url, '', currentPath)

                        const cardContent = (
                            <>
                                <div className={`flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-50 ${theme.border}`}>
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={`Logo de ${name}`} className="h-full w-full object-contain p-1.5" loading="lazy" />
                                    ) : (
                                        <span className={`text-base font-black tracking-tight ${theme.textHighlight}`}>
                                            {getLogoInitials(name)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold leading-tight text-slate-800">{name}</p>
                            </>
                        )

                        if (itemUrl) {
                            return (
                                <a
                                    key={`${item.id || name}-${index}`}
                                    href={itemUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex min-h-[104px] min-w-[220px] items-center gap-4 rounded-2xl border bg-white px-5 py-4 transition-transform hover:-translate-y-0.5 ${theme.border}`}
                                    aria-label={name}
                                >
                                    {cardContent}
                                </a>
                            )
                        }

                        return (
                            <article
                                key={`${item.id || name}-${index}`}
                                className={`flex min-h-[104px] min-w-[220px] items-center gap-4 rounded-2xl border bg-white px-5 py-4 ${theme.border}`}
                                aria-label={name}
                            >
                                {cardContent}
                            </article>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function renderClientCarouselBlock(block: SitePageBlock) {
    const title = toText(block.content.title)
    const body = toText(block.content.body)
    const items = ensureObjectItems(block.content.items)

    return (
        <div className="mx-auto max-w-screen-2xl overflow-hidden px-4 md:px-8">
            <div className="mx-auto mb-10 max-w-6xl text-center">
                {title && <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">{title}</h2>}
                {body && <p className="mt-4 text-lg text-slate-600">{body}</p>}
            </div>
            
            {/* Premium CSS scroll snap carousel */}
            <div className="relative mt-12 w-full">
                {/* Fade edges to suggest scroll */}
                <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-[#f8fafc] to-transparent md:w-24" />
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-[#f8fafc] to-transparent md:w-24" />
                
                <div className="flex w-full gap-6 overflow-x-auto snap-x snap-mandatory px-8 pb-12 pt-4 hide-scrollbar md:px-24">
                    {items.map((item, index) => {
                        return <ExperienceCarouselCard key={`${item.id || index}`} item={item} index={index} />
                    })}
                </div>
            </div>

            {items.length > 1 && (
                <div className="mt-1 flex items-center justify-center gap-2 md:hidden" aria-label={`Carrusel con ${items.length} experiencias`}>
                    {items.map((_, index) => (
                        <span
                            key={`experience-dot-${index}`}
                            className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-emerald-600' : 'bg-slate-300'}`}
                            aria-hidden="true"
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

type ExperienceCarouselCardProps = {
    item: ItemObject
    index: number
}

function resolveExperienceImages(item: ItemObject) {
    const imageCollections = [
        ensureStringArray(item.images),
        ensureStringArray(item.imageUrls),
        ensureStringArray(item.gallery),
        ensureStringArray(item.photos),
    ].flat()
    const coverImage = toText(item.imageUrl || item.image || item.photo)
    const normalizedCollections = imageCollections.map((entry) => entry.trim()).filter(Boolean)
    const cover = coverImage.trim()
    const mergedImages = [...normalizedCollections]
    if (cover && !mergedImages.includes(cover)) mergedImages.unshift(cover)
    const normalized = mergedImages
    return normalized.length > 0
        ? normalized
        : ['https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80']
}

function ExperienceCarouselCard({ item, index }: ExperienceCarouselCardProps) {
    const itemTitle = toText(item.title || item.label || `Experiencia ${index + 1}`)
    const clientName = toText(item.clientName || item.client || item.company || item.organization || item.partner, itemTitle)
    const itemBody = toText(item.body || item.description)
    const images = resolveExperienceImages(item)
    const [isMobileViewport, setIsMobileViewport] = useState(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
        return window.matchMedia('(max-width: 767px)').matches
    })
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false)
    const [modalImageIndex, setModalImageIndex] = useState(0)
    const currentImage = images[Math.min(activeImageIndex, images.length - 1)] || images[0]
    const modalImage = images[Math.min(modalImageIndex, images.length - 1)] || images[0]
    const hasImageSlider = images.length > 1

    useEffect(() => {
        if (!portfolioModalOpen) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPortfolioModalOpen(false)
        }

        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [portfolioModalOpen])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
        const mediaQuery = window.matchMedia('(max-width: 767px)')
        const syncViewport = (event?: MediaQueryListEvent) => {
            setIsMobileViewport(event ? event.matches : mediaQuery.matches)
        }
        syncViewport()
        return subscribeToMediaQuery(mediaQuery, syncViewport)
    }, [])

    useEffect(() => {
        if (isMobileViewport && portfolioModalOpen) {
            setPortfolioModalOpen(false)
        }
    }, [isMobileViewport, portfolioModalOpen])

    const goToPreviousPreview = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    const goToNextPreview = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setActiveImageIndex((prev) => (prev + 1) % images.length)
    }

    const openPortfolioModal = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (isMobileViewport) return
        setModalImageIndex(activeImageIndex)
        setPortfolioModalOpen(true)
    }

    const closePortfolioModal = (event?: ReactMouseEvent<HTMLElement>) => {
        event?.preventDefault()
        event?.stopPropagation()
        setPortfolioModalOpen(false)
    }

    const goToPreviousModal = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setModalImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    const goToNextModal = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setModalImageIndex((prev) => (prev + 1) % images.length)
    }

    return (
        <>
            <article className="group relative flex w-[85vw] max-w-[420px] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl sm:w-[380px]">
                <div className="relative h-56 w-full overflow-hidden">
                    <div className="absolute inset-0 z-10 bg-emerald-900/20 mix-blend-multiply opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <img
                        src={currentImage}
                        alt={`${clientName} - ${itemTitle}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent" />
                    <div className="absolute left-4 top-4 z-20 rounded-full border border-white/35 bg-slate-950/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm">
                        {clientName}
                    </div>
                    {hasImageSlider && (
                        <>
                            <button
                                type="button"
                                onClick={goToPreviousPreview}
                                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/35 bg-slate-950/60 p-2 text-white transition-colors hover:bg-slate-900/90"
                                aria-label={`Imagen anterior de ${clientName}`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={goToNextPreview}
                                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/35 bg-slate-950/60 p-2 text-white transition-colors hover:bg-slate-900/90"
                                aria-label={`Siguiente imagen de ${clientName}`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="absolute right-4 top-4 z-20 rounded-full border border-white/30 bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-white/90">
                                {activeImageIndex + 1}/{images.length}
                            </div>
                        </>
                    )}
                    <div className="absolute bottom-6 left-6 right-6 z-20">
                        <h3 className="text-xl font-bold leading-tight text-white group-hover:text-emerald-400 transition-colors drop-shadow-md">
                            {itemTitle}
                        </h3>
                    </div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                    <p className="line-clamp-4 text-base leading-relaxed text-slate-600">
                        {itemBody}
                    </p>
                    <button
                        type="button"
                        onClick={openPortfolioModal}
                        className="mt-8 hidden items-center text-left text-sm font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 md:inline-flex"
                    >
                        Ver caso <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </article>

            {portfolioModalOpen && !isMobileViewport && (
                <div
                    className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Portafolio de ${clientName}`}
                    onClick={closePortfolioModal}
                >
                    <div
                        className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={closePortfolioModal}
                            className="absolute right-4 top-4 z-30 rounded-full border border-white/30 bg-slate-950/70 p-2 text-white hover:bg-slate-950"
                            aria-label="Cerrar portafolio"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="relative bg-slate-950">
                                <img
                                    src={modalImage}
                                    alt={`${clientName} - imagen ${modalImageIndex + 1}`}
                                    className="h-[58vh] w-full object-contain"
                                />
                                {hasImageSlider && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={goToPreviousModal}
                                            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/35 bg-slate-950/60 p-2 text-white transition-colors hover:bg-slate-900/90"
                                            aria-label={`Imagen anterior de ${clientName}`}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goToNextModal}
                                            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/35 bg-slate-950/60 p-2 text-white transition-colors hover:bg-slate-900/90"
                                            aria-label={`Siguiente imagen de ${clientName}`}
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <aside className="flex flex-col border-t border-white/15 bg-slate-900/95 p-6 lg:border-l lg:border-t-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">{clientName}</p>
                                <h4 className="mt-3 text-2xl font-black leading-tight text-white">{itemTitle}</h4>
                                {itemBody && <p className="mt-4 text-sm leading-relaxed text-slate-300">{itemBody}</p>}

                                <div className="mt-6 rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-200">
                                    Imagen {modalImageIndex + 1} de {images.length}
                                </div>

                                {hasImageSlider && (
                                    <div className="mt-6 grid grid-cols-4 gap-2">
                                        {images.map((image, imageIndex) => (
                                            <button
                                                key={`${clientName}-thumb-${imageIndex}`}
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault()
                                                    event.stopPropagation()
                                                    setModalImageIndex(imageIndex)
                                                }}
                                                className={`overflow-hidden rounded-lg border ${modalImageIndex === imageIndex ? 'border-emerald-400' : 'border-white/20'} transition-colors`}
                                                aria-label={`Ir a imagen ${imageIndex + 1} de ${clientName}`}
                                            >
                                                <img src={image} alt={`${clientName} miniatura ${imageIndex + 1}`} className="h-14 w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </aside>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function renderTuProfeBlock(block: SitePageBlock) {
    const title = toText(block.content.title)
    const eyebrow = toText(block.content.eyebrow)
    const body = toText(block.content.body)
    const items = ensureObjectItems(block.content.items)
    const primaryHref = normalizeCmsHref(block.content.primaryHref, 'https://profetabla.com/', '/')
    const imageUrl = toText(block.content.imageUrl) || '/assets/landing/tuprofe-mockup.png'

    return (
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#0b1323] px-6 py-16 md:px-12 md:py-24 lg:px-20 shadow-2xl">
            <div className="pointer-events-none absolute right-0 top-0 h-[800px] w-[800px] -translate-y-1/3 translate-x-1/3 rounded-full bg-emerald-900/20 blur-[120px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-600/10 blur-[100px]" />
            
            <div className="relative grid gap-16 lg:grid-cols-2 lg:items-center">
                <div className="max-w-xl order-2 lg:order-1">
                    {eyebrow && (
                        <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                            <span className="mr-2 flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse"></span>
                            {eyebrow}
                        </div>
                    )}
                    {title && <h2 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">{title}</h2>}
                    {body && <p className="mt-6 text-lg leading-relaxed text-slate-300 md:text-xl">{body}</p>}
                    
                    <div className="mt-12 grid gap-6 sm:grid-cols-1">
                        {items.map((item, index) => {
                            const itemTitle = toText(item.title).toLowerCase()
                            let Icon = Code2
                            if (itemTitle.includes('operación') || itemTitle.includes('conectada')) Icon = Layers
                            if (itemTitle.includes('proyecto') || itemTitle.includes('reto')) Icon = LayoutDashboard
                            if (itemTitle.includes('reconocimiento') || itemTitle.includes('verificable') || itemTitle.includes('insignia')) Icon = ShieldCheck
                            if (itemTitle.includes('dashboard') || itemTitle.includes('analítica') || itemTitle.includes('métrica')) Icon = BarChart3

                            return (
                                <div 
                                    key={index}
                                    className="group relative flex items-start gap-4 rounded-xl border border-slate-700/50 bg-slate-800/20 p-5 transition-all hover:border-emerald-400/50 hover:bg-slate-800/60"
                                >
                                    <div className="mt-1 shrink-0 rounded-lg bg-emerald-400/10 p-2 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-900 transition-colors">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{toText(item.title)}</h3>
                                        <p className="text-sm leading-relaxed text-slate-300">{toText(item.body)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-12">
                        {primaryHref && (
                            <a
                                href={primaryHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-900 transition-all hover:bg-emerald-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                            >
                                {toText(block.content.primaryLabel, 'Conoce TuProfe')}
                                <ArrowRight className="h-5 w-5" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none order-1 lg:order-2">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-slate-800 shadow-2xl lg:aspect-[3/4]">
                        <img 
                            src={imageUrl} 
                            alt="Plataforma Mockup" 
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1323] via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                        <Activity className="h-6 w-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white tracking-widest uppercase">Operacional</p>
                                        <p className="text-emerald-400 text-sm mt-1">Conectado al 100%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function HomeRootPageRenderer({
    page,
    selectable = false,
    selectedBlockId = null,
    onSelectBlock,
    className = '',
}: HomeRootPageRendererProps) {
    const sortedBlocks = [...page.blocks].sort((a, b) => a.order - b.order).filter((block) => block.visible)
    const benefitsBlock = sortedBlocks.find((block) => block.id === 'beneficios') ?? null
    const flowBlock = sortedBlocks.find((block) => block.id === 'flujo') ?? null

    const currentTheme = THEMES[page.path] || DEFAULT_THEME
    const isAuditoriaPage = page.path === '/auditoria-programas-virtuales'

    return (
        <div className={`services-landing-theme ${className}`.trim()}>
            {sortedBlocks.map((block) => {
                if (block.id === 'flujo' && benefitsBlock) return null
                const isSplitBenefitsFlow = block.id === 'beneficios' && Boolean(flowBlock)

                const selected = (!isSplitBenefitsFlow || block.id === 'beneficios') && selectedBlockId === block.id
                const isFullWidthSection = isAuditoriaPage && (block.id === 'hero' || block.id === 'promesas')
                const sectionClasses = [
                    isFullWidthSection ? '' : 'px-6',
                    isFullWidthSection ? 'py-0' : block.id === 'hero' ? 'pt-20 pb-16 md:pt-28 md:pb-24' : 'py-14 md:py-20',
                    'relative scroll-mt-36',
                    selectable ? 'cursor-pointer' : '',
                    selected ? `ring-2 ring-offset-2 ring-offset-slate-100 ${currentTheme.primary}` : '',
                ]
                    .filter(Boolean)
                    .join(' ')
                const blockAnchors = resolveBlockAnchors(block)

                return (
                    <section
                        key={block.id}
                        data-block-id={block.id}
                        id={blockAnchors[0] || undefined}
                        onClickCapture={(event) => handleSelectableBlockClick(event, selectable, block.id, onSelectBlock)}
                        className={sectionClasses}
                        style={{ backgroundColor: toText(block.style.backgroundColor, 'transparent') }}
                    >
                        {blockAnchors.slice(1).map((anchorId) => (
                            <span
                                key={`${block.id}-${anchorId}`}
                                id={anchorId}
                                className="pointer-events-none absolute -top-36 left-0 h-px w-px opacity-0"
                                aria-hidden="true"
                            />
                        ))}
                        {selectable && (
                            <div className="mx-auto mb-3 max-w-6xl">
                                <div className={`inline-flex w-fit items-center gap-2 border px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${currentTheme.bgLight} ${currentTheme.border} ${currentTheme.textHighlight}`}>
                                    {block.name || block.type}
                                </div>
                            </div>
                        )}

                        {block.id === 'hero' && (isAuditoriaPage ? renderAuditoriaHeroBlock(block, page.path, currentTheme) : renderHeroBlock(block, page.path, currentTheme))}
                        {block.id === 'promesas' && (isAuditoriaPage ? renderAuditoriaMetricsBlock(block, currentTheme) : renderPromisesBlock(block, currentTheme))}
                        {block.id === 'servicios' && (isAuditoriaPage ? renderAuditoriaScopeBlock(block, page.path, currentTheme) : renderServicesGridBlock(block, page.path, currentTheme))}
                        {block.id === 'estandares-qm' && isAuditoriaPage && renderAuditoriaStandardsBlock(block, currentTheme)}
                        {block.id === 'entregables' && isAuditoriaPage && renderAuditoriaDeliverablesBlock(block, currentTheme)}
                        {block.id === 'recursos' && isAuditoriaPage && renderAuditoriaResourcesBlock(block, page.path, currentTheme)}
                        {block.id === 'flujo' && !benefitsBlock && renderStandaloneFlowBlock(block)}
                        {block.id === 'beneficios' && renderBenefitsAndFlow(block, flowBlock, selectable, selectedBlockId, currentTheme, onSelectBlock)}
                        {block.id === 'funcionalidades' && block.type === 'feature-list' && renderFeatureListBlock(block, currentTheme)}
                        {block.id === 'clientes' && renderTrustedClientsBlock(block, currentTheme, page.path)}
                        {block.type === 'carousel' && block.id !== 'clientes' && renderClientCarouselBlock(block)}
                        {block.type === 'tuprofe' && renderTuProfeBlock(block)}
                        {block.id === 'faq' && renderFaqBlock(block, currentTheme)}
                        {block.id === 'contacto' && renderContactBlock(block, page.path, currentTheme)}
                        {block.id === 'cta' && renderCtaBlock(block, page.path, currentTheme)}
                        {!['hero', 'promesas', 'servicios', 'estandares-qm', 'entregables', 'recursos', 'flujo', 'beneficios', 'funcionalidades', 'clientes', 'faq', 'contacto', 'cta'].includes(block.id) && block.type !== 'carousel' && block.type !== 'tuprofe' && renderFallbackBlock(block, currentTheme)}
                    </section>
                )
            })}
        </div>
    )
}
