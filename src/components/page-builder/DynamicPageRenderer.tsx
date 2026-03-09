import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
    Activity,
    ArrowRight,
    BarChart3,
    Boxes,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Code2,
    Infinity,
    LayoutGrid,
    LineChart,
    Link2,
    Mail,
    MapPin,
    Network,
    Phone,
    Rocket,
    Search,
    Settings,
    Settings2,
    ShieldCheck,
    TriangleAlert,
    UploadCloud,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { type SiteArchitecturePage, type SitePageBlock } from '../../admin/context/CMSContext'
import { HomeRootPageRenderer } from './HomeRootPageRenderer'
import { ContactForm } from '../forms/ContactForm'

type DynamicPageRendererProps = {
    page: SiteArchitecturePage
    selectable?: boolean
    selectedBlockId?: string | null
    onSelectBlock?: (blockId: string) => void
    className?: string
}

type ItemObject = Record<string, unknown>
type PageThemeVariant = 'default' | 'case-premium'

const CMS_ICON_COMPONENTS: Record<string, LucideIcon> = {
    search: Search,
    network: Network,
    users: Users,
    code2: Code2,
    rocket: Rocket,
    linechart: LineChart,
    mappin: MapPin,
    settings2: Settings2,
    barchart3: BarChart3,
    infinity: Infinity,
    link2: Link2,
    userround: UserRound,
    clipboardcheck: ClipboardCheck,
    settings: Settings,
    uploadcloud: UploadCloud,
    trianglealert: TriangleAlert,
    layoutgrid: LayoutGrid,
    shieldcheck: ShieldCheck,
    boxes: Boxes,
    checkcircle2: CheckCircle2,
}

const CMS_ICON_ALIASES: Record<string, string> = {
    '🧭': 'search',
    '🗺️': 'network',
    '🗺': 'network',
    '🤝': 'users',
    '🧱': 'boxes',
    '🚀': 'rocket',
    '📈': 'linechart',
    '📍': 'mappin',
    '🛠️': 'settings2',
    '🛠': 'settings2',
    '📊': 'barchart3',
    '♾️': 'infinity',
    '♾': 'infinity',
    '🔗': 'link2',
    '👷': 'userround',
    '📝': 'clipboardcheck',
    '⚙️': 'settings',
    '⚙': 'settings',
    '👤': 'users',
    '📎': 'uploadcloud',
    '🚨': 'trianglealert',
    '🏢': 'shieldcheck',
    '✅': 'checkcircle2',
}

function normalizeIconToken(value: string) {
    return value.toLowerCase().replace(/[\s_-]+/g, '').trim()
}

function resolveCmsIcon(value: string) {
    if (!value) return null
    const alias = CMS_ICON_ALIASES[value]
    const normalized = normalizeIconToken(alias || value)
    return CMS_ICON_COMPONENTS[normalized] ?? null
}

function parseServiceNarrative(value: string) {
    const compact = value.replace(/\s+/g, ' ').trim()
    if (!compact) return { what: '', purpose: '', value: '' }

    const whatMatch = compact.match(/Qué hicimos:\s*(.+?)(?=Para qué sirvió:|Valor para el cliente:|$)/i)
    const purposeMatch = compact.match(/Para qué sirvió:\s*(.+?)(?=Valor para el cliente:|$)/i)
    const valueMatch = compact.match(/Valor para el cliente:\s*(.+)$/i)

    return {
        what: whatMatch?.[1]?.trim() || '',
        purpose: purposeMatch?.[1]?.trim() || '',
        value: valueMatch?.[1]?.trim() || '',
    }
}

function ExecutiveSystemPreview({ block, accentColor }: { block: SitePageBlock; accentColor: string }) {
    const [windowKey, setWindowKey] = useState<'hoy' | '7d' | '30d'>('7d')

    const kpis = ensureObjectItems(block.content.previewKpis)
    const queue = ensureObjectItems(block.content.previewQueue)
    const stages = ensureObjectItems(block.content.previewStages)
    const alerts = ensureObjectItems(block.content.previewAlerts)

    const kpiItems = kpis.length > 0
        ? kpis
        : [
            { label: 'Incidentes abiertos', value: 38, delta: '-14%', status: 'warn', note: '12 de alta criticidad' },
            { label: 'Cumplimiento SLA', value: 87, delta: '+6%', status: 'ok', note: 'Mejora sostenida por sede' },
            { label: 'Medidas en tiempo', value: 89, delta: '+9%', status: 'ok', note: 'Seguimiento con alertas activas' },
            { label: 'Riesgo crítico', value: 11, delta: '-5 pts', status: 'risk', note: 'Tendencia a la baja mensual' },
        ]

    const queueItems = queue.length > 0
        ? queue
        : [
            { title: 'Caída en planta norte', owner: 'SST Medellín', sla: '6h', status: 'En investigación' },
            { title: 'Lesión lumbar en bodega', owner: 'SST Bogotá', sla: '4h', status: 'Medidas activas' },
            { title: 'Incidente con montacargas', owner: 'SST Cali', sla: '2h', status: 'Escalado' },
            { title: 'Falla de EPP en turno nocturno', owner: 'SST Barranquilla', sla: '8h', status: 'Verificación' },
        ]

    const stageItems = stages.length > 0
        ? stages
        : [
            { label: 'Reporte', value: 100 },
            { label: 'Investigación', value: 93 },
            { label: 'Medidas', value: 91 },
            { label: 'Cierre', value: 87 },
        ]

    const alertItems = alerts.length > 0
        ? alerts
        : [
            { label: '4 casos vencen en menos de 24h' },
            { label: '2 sedes requieren comité extraordinario' },
            { label: '1 patrón repetitivo en incidentes locativos' },
        ]

    const statusClass = (raw: string) => {
        const status = raw.toLowerCase()
        if (status === 'ok') return 'border-emerald-300/60 bg-emerald-50 text-emerald-900'
        if (status === 'warn') return 'border-amber-300/70 bg-amber-50 text-amber-900'
        if (status === 'risk') return 'border-rose-300/70 bg-rose-50 text-rose-900'
        return 'border-slate-300 bg-slate-50 text-slate-900'
    }

    const statusIcon = (raw: string) => {
        const status = raw.toLowerCase()
        if (status === 'ok') return <CheckCircle2 className="h-3.5 w-3.5" />
        if (status === 'risk') return <TriangleAlert className="h-3.5 w-3.5" />
        return <Clock3 className="h-3.5 w-3.5" />
    }

    const windowOptions: Array<{ key: 'hoy' | '7d' | '30d'; label: string }> = [
        { key: 'hoy', label: 'Hoy' },
        { key: '7d', label: '7 días' },
        { key: '30d', label: '30 días' },
    ]

    return (
        <div className="mt-5 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_24px_46px_-38px_rgba(15,23,42,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/85 px-4 py-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Preview funcional</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Panel operativo SST en tiempo real</p>
                </div>
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
                    {windowOptions.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setWindowKey(option.key)}
                            className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${windowKey === option.key ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            style={windowKey === option.key ? { backgroundColor: accentColor } : undefined}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_0.9fr]">
                <section className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {kpiItems.map((item, index) => {
                            const label = toText(item.label || item.title || `KPI ${index + 1}`)
                            const value = Math.max(0, Math.min(100, toNumber(item.value, 0)))
                            const delta = toText(item.delta || item.trend)
                            const note = toText(item.note || item.description || item.body)
                            const status = toText(item.status, 'warn')
                            return (
                                <article key={`${label}-${index}`} className={`rounded-xl border px-3.5 py-3 ${statusClass(status)}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-black uppercase tracking-[0.14em]">{label}</p>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                            {statusIcon(status)}
                                            {status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-3xl font-black leading-none">{value}%</p>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-300/40">
                                        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: accentColor }} />
                                    </div>
                                    {(delta || note) && (
                                        <div className="mt-2 space-y-0.5">
                                            {delta && <p className="text-[10px] font-black uppercase tracking-[0.16em]">{delta}</p>}
                                            {note && <p className="text-xs opacity-85">{note}</p>}
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                                <Activity className="h-4 w-4 text-slate-500" />
                                Casos activos por prioridad
                            </p>
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{windowKey}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                            {queueItems.map((item, index) => {
                                const incident = toText(item.title || item.label || `Caso ${index + 1}`)
                                const owner = toText(item.owner || item.responsible || 'Equipo SST')
                                const sla = toText(item.sla || item.deadline || '24h')
                                const status = toText(item.status || item.state || 'En seguimiento')
                                return (
                                    <article key={`${incident}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{incident}</p>
                                            <p className="text-xs text-slate-600">{owner}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">SLA {sla}</span>
                                            <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-800">{status}</span>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/65 p-3.5">
                        <p className="text-sm font-bold text-slate-900">Embudo de ejecución</p>
                        <div className="mt-3 space-y-2.5">
                            {stageItems.map((item, index) => {
                                const stage = toText(item.label || item.title || `Estado ${index + 1}`)
                                const value = Math.max(0, Math.min(100, toNumber(item.value, 0)))
                                return (
                                    <div key={`${stage}-${index}`}>
                                        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                                            <span>{stage}</span>
                                            <span>{value}%</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-300/40">
                                            <span className="block h-full rounded-full bg-slate-900" style={{ width: `${value}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-sm font-bold text-slate-900">Alertas priorizadas</p>
                        <ul className="mt-3 space-y-2 text-xs text-slate-700">
                            {alertItems.map((item, index) => (
                                <li key={`${toText(item.label || item.title || item.body)}-${index}`} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    <span>{toText(item.label || item.title || item.body || `Alerta ${index + 1}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    )
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

function toCssLength(value: string | undefined, fallback: string) {
    if (!value || typeof value !== 'string') return fallback
    return value
}

function toText(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback
}

function normalizeCmsHref(value: unknown, fallback = '') {
    if (typeof value !== 'string') return fallback
    const trimmed = value.trim()
    if (!trimmed) return fallback
    if (trimmed.startsWith('/https://')) return `https://${trimmed.slice('/https://'.length)}`
    if (trimmed.startsWith('/http://')) return `http://${trimmed.slice('/http://'.length)}`
    if (trimmed.startsWith('/https:/')) return `https://${trimmed.slice('/https:/'.length)}`
    if (trimmed.startsWith('/http:/')) return `http://${trimmed.slice('/http:/'.length)}`
    if (trimmed.startsWith('https:/') && !trimmed.startsWith('https://')) return `https://${trimmed.slice('https:/'.length)}`
    if (trimmed.startsWith('http:/') && !trimmed.startsWith('http://')) return `http://${trimmed.slice('http:/'.length)}`
    return trimmed
}

function toNumber(value: unknown, fallback: number) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function toOpacity(value: unknown, fallback = 0) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    if (parsed > 1) return Math.max(0, Math.min(1, parsed / 100))
    return Math.max(0, Math.min(1, parsed))
}

function getResponsiveGridTemplate(columnsValue: unknown, fallbackColumns: number) {
    const columns = Math.max(1, Math.round(toNumber(columnsValue, fallbackColumns)))
    if (columns <= 1) return 'repeat(1, minmax(0, 1fr))'
    const minWidth = columns >= 4 ? '190px' : columns === 3 ? '220px' : '280px'
    return `repeat(auto-fit, minmax(min(100%, ${minWidth}), 1fr))`
}

function normalizeAnchorId(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed.replace(/^\/?#/, '').trim()
}

function extractSamePageHash(value: unknown): string {
    const trimmed = normalizeCmsHref(value)
    if (!trimmed) return ''
    if (trimmed.startsWith('#')) return normalizeAnchorId(trimmed)
    if (trimmed.startsWith('/#')) return normalizeAnchorId(trimmed)
    return ''
}

function getBlockAnchorIds(block: SitePageBlock) {
    const anchors = new Set<string>()
    const explicitAnchor = normalizeAnchorId(toText(block.content.anchor))
    if (explicitAnchor) anchors.add(explicitAnchor)
    const idAnchor = normalizeAnchorId(block.id)
    if (idAnchor) anchors.add(idAnchor)

    const primaryHrefAnchor = extractSamePageHash(block.content.primaryHref)
    if (primaryHrefAnchor) anchors.add(primaryHrefAnchor)
    const secondaryHrefAnchor = extractSamePageHash(block.content.secondaryHref)
    if (secondaryHrefAnchor) anchors.add(secondaryHrefAnchor)

    if (block.type === 'contact') anchors.add('contacto')
    if (block.type === 'cta') anchors.add('cta')

    return Array.from(anchors).filter(Boolean)
}

function ensureObjectItems(value: unknown): ItemObject[] {
    if (!Array.isArray(value)) return []
    const output: ItemObject[] = []
    value.forEach((item, index) => {
        if (typeof item === 'string') {
            output.push({ label: item, value: item, title: item, body: item, id: `item-${index + 1}` })
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

function textAlignClass(align: unknown) {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
}

function getYoutubeEmbedUrl(rawUrl: string) {
    if (!rawUrl) return ''
    const shortMatch = rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
    if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`
    const fullMatch = rawUrl.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
    if (fullMatch?.[1]) return `https://www.youtube.com/embed/${fullMatch[1]}`
    if (rawUrl.includes('youtube.com/embed/')) return rawUrl
    return ''
}

function BlockActions({ block }: { block: SitePageBlock }) {
    const primaryLabel = toText(block.content.primaryLabel).trim()
    const primaryHref = normalizeCmsHref(block.content.primaryHref)
    const secondaryLabel = toText(block.content.secondaryLabel).trim()
    const secondaryHref = normalizeCmsHref(block.content.secondaryHref)

    if (!primaryLabel && !secondaryLabel) return null

    return (
        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            {primaryLabel && primaryHref && (
                <a
                    href={primaryHref}
                    className="inline-flex w-full items-center justify-center gap-2 border border-current/25 bg-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/20 sm:w-auto"
                >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                </a>
            )}
            {secondaryLabel && secondaryHref && (
                <a
                    href={secondaryHref}
                    className="inline-flex w-full items-center justify-center gap-2 border border-current/25 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 sm:w-auto"
                >
                    {secondaryLabel}
                </a>
            )}
        </div>
    )
}

function SimpleTabsPreview({ items, color }: { items: ItemObject[]; color: string }) {
    const [active, setActive] = useState(0)
    const safeItems = items.length > 0
        ? items
        : [{ label: 'Pestaña 1', title: 'Pestaña 1', body: 'Contenido de la pestaña.' }]
    const current = safeItems[Math.min(active, safeItems.length - 1)]

    return (
        <div className="mt-6 w-full">
            <div className="flex flex-wrap gap-2">
                {safeItems.map((item, index) => {
                    const label = toText(item.label || item.title || `Pestaña ${index + 1}`)
                    const isActive = index === active
                    return (
                        <button
                            key={`${label}-${index}`}
                            type="button"
                            onClick={() => setActive(index)}
                            className={`border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${isActive ? 'text-white' : ''}`}
                            style={isActive ? { backgroundColor: color, borderColor: color } : { borderColor: `${color}55`, color }}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>
            <div className="mt-3 border border-current/20 p-4 text-sm opacity-90">
                <p className="font-bold">{toText(current.title || current.label)}</p>
                <p className="mt-2">{toText(current.body || current.content)}</p>
            </div>
        </div>
    )
}

function renderBlockBody(block: SitePageBlock, accentColor: string) {
    const eyebrow = toText(block.content.eyebrow)
    const title = toText(block.content.title)
    const subtitle = toText(block.content.subtitle)
    const body = toText(block.content.body)
    const html = toText(block.content.html)
    const items = ensureObjectItems(block.content.items)

    if (block.type === 'hero' || block.type === 'cta') {
        return (
            <>
                {toText(block.content.eyebrow) && <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-75">{toText(block.content.eyebrow)}</p>}
                {title && <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{title}</h2>}
                {subtitle && <p className="mt-3 text-xl opacity-90">{subtitle}</p>}
                {body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>}
                <BlockActions block={block} />
            </>
        )
    }

    if (block.type === 'heading') {
        const rawTag = toText(block.content.tag, 'h2').toLowerCase()
        const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2'
        return (
            <>
                {title && (
                    <>
                        {tag === 'h1' && <h1 className="text-5xl font-black tracking-tight">{title}</h1>}
                        {tag === 'h2' && <h2 className="text-4xl font-black tracking-tight">{title}</h2>}
                        {tag === 'h3' && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                        {tag === 'h4' && <h4 className="text-2xl font-black tracking-tight">{title}</h4>}
                        {tag === 'h5' && <h5 className="text-xl font-black tracking-tight">{title}</h5>}
                        {tag === 'h6' && <h6 className="text-lg font-black tracking-tight">{title}</h6>}
                    </>
                )}
                {subtitle && <p className="mt-3 text-lg opacity-90">{subtitle}</p>}
            </>
        )
    }

    if (block.type === 'text' || block.type === 'richtext' || block.type === 'feature-list' || block.type === 'testimonial' || block.type === 'icon') {
        return (
            <>
                {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-75">{eyebrow}</p>}
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {subtitle && <p className="mt-3 text-lg opacity-90">{subtitle}</p>}
                {html ? (
                    <div className="prose mt-4 max-w-none prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                    body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>
                )}
                {block.type === 'icon' && toText(block.content.icon) && (
                    <p className="mt-3 text-4xl">{toText(block.content.icon)}</p>
                )}
                {block.type === 'feature-list' && items.length > 0 && (
                    <ul className="mt-6 grid list-none gap-3 pl-0 text-base" style={{ gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, 2) }}>
                        {items.map((item, index) => (
                            <li key={`${item.id || index}`} className="relative border border-current/20 bg-white/5 px-4 py-3 pl-10">
                                <span
                                    className="absolute left-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                                    style={{ backgroundColor: accentColor }}
                                    aria-hidden="true"
                                />
                                {toText(item.label || item.title || item.value || `Item ${index + 1}`)}
                            </li>
                        ))}
                    </ul>
                )}
                {block.type === 'testimonial' && (
                    <div className="mt-6 border border-current/20 bg-white/5 p-5">
                        <p className="text-xl italic">“{body || 'Añade aquí el texto del testimonio.'}”</p>
                        <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] opacity-80">{toText(block.content.author, 'Cliente')}</p>
                        {toText(block.content.role) && <p className="text-sm opacity-70">{toText(block.content.role)}</p>}
                    </div>
                )}
            </>
        )
    }

    if (block.type === 'button') {
        const label = toText(block.content.label || block.content.primaryLabel, 'Botón')
        const href = normalizeCmsHref(block.content.href || block.content.primaryHref, '#')
        return (
            <a
                href={href}
                className="inline-flex items-center gap-2 border border-current/25 bg-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/20"
            >
                {label}
                <ArrowRight className="h-4 w-4" />
            </a>
        )
    }

    if (block.type === 'image') {
        const previewMode = toText(block.content.previewMode).toLowerCase()
        const isExecutivePreview = previewMode === 'sst-dashboard' || block.id === 'vista-ejecutiva'
        if (isExecutivePreview) {
            return (
                <div className="w-full">
                    {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                    {body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>}
                    <ExecutiveSystemPreview block={block} accentColor={accentColor} />
                </div>
            )
        }

        const src = toText(block.content.imageUrl || block.content.url)
        if (!src) {
            return <div className="border border-dashed border-current/30 p-8 text-sm opacity-70">Configura `imageUrl` para mostrar la imagen.</div>
        }
        return (
            <div className="w-full">
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>}
                <img
                    src={src}
                    alt={toText(block.content.imageAlt || block.content.alt, 'Imagen')}
                    className={`${title || body ? 'mt-5' : ''} w-full max-w-5xl border border-current/15 object-cover`}
                    style={{ borderRadius: toCssLength(block.style.radius, '0.75rem'), maxHeight: toCssLength(block.style.maxHeight, '520px') }}
                    onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        const fallback = event.currentTarget.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'flex'
                    }}
                />
                <div
                    className={`${title || body ? 'mt-5' : ''} hidden h-[280px] w-full max-w-5xl items-center justify-center border border-current/20 bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center`}
                    style={{ borderRadius: toCssLength(block.style.radius, '0.75rem') }}
                >
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">Vista ejecutiva</p>
                        <p className="mt-2 text-sm opacity-80">No se pudo cargar la imagen. Puedes cambiar la URL desde el builder.</p>
                    </div>
                </div>
            </div>
        )
    }

    if (block.type === 'video' || block.type === 'embed' || block.type === 'map') {
        const source = toText(block.content.videoUrl || block.content.embedUrl || block.content.url)
        const youtubeEmbed = getYoutubeEmbedUrl(source)
        const iframeSource = youtubeEmbed || source

        if (!iframeSource) {
            return <div className="border border-dashed border-current/30 p-8 text-sm opacity-70">Configura la URL del bloque para mostrar el contenido.</div>
        }

        return (
            <div className="w-full overflow-hidden border border-current/15" style={{ borderRadius: toCssLength(block.style.radius, '0.75rem') }}>
                <iframe
                    src={iframeSource}
                    title={title || block.name}
                    className="h-[360px] w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        )
    }

    if (block.type === 'divider') {
        return <hr className="w-full border-t" style={{ borderColor: block.style.textColor || '#cbd5e1' }} />
    }

    if (block.type === 'contact') {
        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>}
                <div className="mt-6 grid gap-3 text-base sm:grid-cols-2">
                    {toText(block.content.email) && (
                        <a href={`mailto:${toText(block.content.email)}`} className="inline-flex items-center gap-2 border border-current/20 px-4 py-3 hover:bg-white/10">
                            <Mail className="h-4 w-4" />
                            {toText(block.content.email)}
                        </a>
                    )}
                    {toText(block.content.phone) && (
                        <a href={`tel:${toText(block.content.phone)}`} className="inline-flex items-center gap-2 border border-current/20 px-4 py-3 hover:bg-white/10">
                            <Phone className="h-4 w-4" />
                            {toText(block.content.phone)}
                        </a>
                    )}
                </div>
            </>
        )
    }

    if (block.type === 'social') {
        const links = items.length > 0 ? items : ensureObjectItems(block.content.links)
        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                <div className="mt-5 flex flex-wrap gap-3">
                    {links.map((item, index) => {
                        const label = toText(item.label || item.network || `Red ${index + 1}`)
                        const url = normalizeCmsHref(item.url || item.href, '#')
                        return (
                            <a key={`${label}-${index}`} href={url} className="border border-current/25 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10">
                                {label}
                            </a>
                        )
                    })}
                </div>
            </>
        )
    }

    if (block.type === 'progress' || block.type === 'progressbar' || block.type === 'stats' || block.type === 'counter') {
        const bars = items.length > 0 ? items : [{ label: 'Indicador', value: 75 }]
        const isCounter = block.type === 'counter'
        const chartMode = toText(block.content.chartMode).toLowerCase()
        const isCompare = !isCounter && chartMode === 'compare'
        const isDonut = !isCounter && (chartMode === 'donut' || chartMode === 'gauge')
        const compareLabelA = toText(block.content.compareLabelA, 'Antes')
        const compareLabelB = toText(block.content.compareLabelB, 'Después')
        const isMetricGrid = isCounter || isDonut
        const metricsGridStyle = isMetricGrid
            ? { gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, 3) }
            : undefined

        function renderStatusBadge(status: string) {
            const normalized = status.toLowerCase()
            if (!normalized) return null
            const statusClass = normalized === 'ok'
                ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
                : normalized === 'warn'
                    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
                    : normalized === 'risk'
                        ? 'border-rose-300/35 bg-rose-300/10 text-rose-100'
                        : 'border-slate-300/35 bg-slate-200/10 text-slate-100'
            return (
                <span className={`inline-flex items-center border px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${statusClass}`}>
                    {normalized === 'ok' ? 'Estable' : normalized === 'warn' ? 'Atención' : normalized === 'risk' ? 'Riesgo' : status}
                </span>
            )
        }

        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {body && <p className="mt-3 text-lg leading-relaxed opacity-90">{body}</p>}
                <div className={`mt-5 ${isMetricGrid ? 'grid gap-3' : 'space-y-3'}`} style={metricsGridStyle}>
                    {bars.map((item, index) => {
                        const label = toText(item.label || item.title || `Métrica ${index + 1}`)
                        const valueNumber = toNumber(item.value, 75)
                        const prefix = toText(item.prefix)
                        const suffix = toText(item.suffix, '%')
                        const description = toText(item.description || item.body)
                        const trend = toText(item.trend)
                        const status = toText(item.status)

                        if (isCounter) {
                            return (
                                <article key={`${label}-${index}`} className="border border-current/20 bg-white/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
                                        {renderStatusBadge(status)}
                                    </div>
                                    <p className="mt-3 text-4xl font-black leading-none tracking-tight">
                                        {prefix}
                                        {valueNumber}
                                        {suffix}
                                    </p>
                                    {(trend || description) && (
                                        <div className="mt-2 space-y-1">
                                            {trend && <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{trend}</p>}
                                            {description && <p className="text-xs opacity-80">{description}</p>}
                                        </div>
                                    )}
                                </article>
                            )
                        }

                        if (isCompare) {
                            const before = Math.max(0, Math.min(100, toNumber(item.before, 100)))
                            const after = Math.max(0, Math.min(100, valueNumber))
                            const delta = after - before
                            return (
                                <article key={`${label}-${index}`} className="border border-current/20 bg-white/5 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-bold">{label}</p>
                                        <span className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                                            Δ {delta >= 0 ? '+' : ''}{Math.round(delta)}%
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="mb-1 flex items-center justify-between text-xs opacity-75">
                                                <span>{compareLabelA}</span>
                                                <span>{Math.round(before)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-300/40">
                                                <div className="h-full bg-slate-500/70" style={{ width: `${before}%` }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                                                <span>{compareLabelB}</span>
                                                <span>{Math.round(after)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-300/35">
                                                <div className="h-full" style={{ width: `${after}%`, backgroundColor: accentColor }} />
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            )
                        }

                        if (isDonut) {
                            const value = Math.max(0, Math.min(100, valueNumber))
                            const ringColor = toText(item.color) || accentColor
                            return (
                                <article key={`${label}-${index}`} className="border border-current/20 bg-white/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-bold">{label}</p>
                                        {renderStatusBadge(status)}
                                    </div>
                                    <div className="mt-4 flex items-center gap-4">
                                        <div
                                            className="relative h-24 w-24 rounded-full"
                                            style={{ background: `conic-gradient(${ringColor} ${value * 3.6}deg, rgba(148,163,184,0.28) ${value * 3.6}deg)` }}
                                        >
                                            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-slate-950/70 text-sm font-black">
                                                {value}{suffix}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {trend && <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{trend}</p>}
                                            {description && <p className="text-xs opacity-80">{description}</p>}
                                        </div>
                                    </div>
                                </article>
                            )
                        }

                        return (
                            <div key={`${label}-${index}`}>
                                <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                                    <span>{label}</span>
                                    <span>{valueNumber}{suffix}</span>
                                </div>
                                <div className="h-2 w-full bg-white/20">
                                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, valueNumber))}%`, backgroundColor: accentColor }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        )
    }

    if (block.type === 'tabs' || block.type === 'toggle') {
        return <SimpleTabsPreview items={items} color={accentColor} />
    }

    if (block.type === 'accordion') {
        const faqItems = items.length > 0 ? items : [{ label: 'Pregunta', body: 'Respuesta' }]
        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                <div className="mt-5 space-y-2">
                    {faqItems.map((item, index) => (
                        <details key={`${item.id || index}`} className="border border-current/20 bg-white/5 p-3">
                            <summary className="cursor-pointer font-semibold">{toText(item.label || item.title || `Pregunta ${index + 1}`)}</summary>
                            <p className="mt-2 text-sm opacity-85">{toText(item.body || item.description || item.content)}</p>
                        </details>
                    ))}
                </div>
            </>
        )
    }

    if (block.type === 'timeline') {
        const timelineItems = items.length > 0 ? items : [{ title: 'Hito', body: 'Describe un hito importante.' }]
        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                <div className="mt-6 space-y-4 border-l-2 border-current/25 pl-5">
                    {timelineItems.map((item, index) => (
                        <article key={`${item.id || index}`} className="relative">
                            <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-current" style={{ backgroundColor: accentColor }} />
                            <h4 className="font-bold">{toText(item.title || item.label || `Hito ${index + 1}`)}</h4>
                            <p className="text-sm opacity-85">{toText(item.body || item.description || item.content)}</p>
                        </article>
                    ))}
                </div>
            </>
        )
    }

    if (block.type === 'grid' || block.type === 'bento' || block.type === 'loopgrid' || block.type === 'portfolio' || block.type === 'hotspots') {
        const cards = items.length > 0 ? items : [{ title: 'Tarjeta', body: 'Contenido de ejemplo para este bloque.' }]
        const chartMode = toText(block.content.chartMode).toLowerCase()

        function statusFromCard(card: ItemObject) {
            const explicit = toText(card.status).toLowerCase()
            if (explicit) return explicit
            const value = toNumber(card.value, 0)
            if (value >= 85) return 'ok'
            if (value >= 65) return 'warn'
            return 'risk'
        }

        function statusStyles(status: string) {
            if (status === 'ok') return { dot: '#22c55e', label: 'En control', card: 'bg-emerald-100/40 border-emerald-300/55' }
            if (status === 'warn') return { dot: '#f59e0b', label: 'Atención', card: 'bg-amber-100/45 border-amber-300/60' }
            return { dot: '#ef4444', label: 'Riesgo', card: 'bg-rose-100/45 border-rose-300/60' }
        }

        function heatColor(value: number) {
            const safe = Math.max(0, Math.min(100, value))
            if (safe >= 80) return 'rgba(239,68,68,0.72)'
            if (safe >= 60) return 'rgba(245,158,11,0.65)'
            if (safe >= 40) return 'rgba(234,179,8,0.58)'
            if (safe >= 20) return 'rgba(132,204,22,0.5)'
            return 'rgba(16,185,129,0.44)'
        }

        if (chartMode === 'semaforo') {
            return (
                <>
                    {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                    {body && <p className="mt-3 text-lg leading-relaxed opacity-90">{body}</p>}
                    <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, 3) }}>
                        {cards.map((card, index) => {
                            const cardTitle = toText(card.title || card.label || `Sede ${index + 1}`)
                            const metric = toNumber(card.value, 0)
                            const detail = toText(card.body || card.description)
                            const status = statusFromCard(card)
                            const styles = statusStyles(status)
                            return (
                                <article key={`${card.id || index}`} className={`border p-4 ${styles.card}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold">{cardTitle}</p>
                                        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: styles.dot }} />
                                            {styles.label}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-3xl font-black tracking-tight">{metric}%</p>
                                    {detail && <p className="mt-2 text-xs opacity-80">{detail}</p>}
                                </article>
                            )
                        })}
                    </div>
                </>
            )
        }

        if (chartMode === 'heatmap') {
            return (
                <>
                    {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                    {body && <p className="mt-3 text-lg leading-relaxed opacity-90">{body}</p>}
                    <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, 4) }}>
                        {cards.map((card, index) => {
                            const area = toText(card.area || card.group || card.title || `Área ${index + 1}`)
                            const risk = toText(card.risk || card.label || 'Criticidad')
                            const value = Math.max(0, Math.min(100, toNumber(card.value, 0)))
                            const note = toText(card.body || card.description)
                            return (
                                <article key={`${card.id || index}`} className="border border-white/50 p-4 text-white" style={{ backgroundColor: heatColor(value) }}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">{area}</p>
                                    <p className="mt-1 text-sm font-semibold">{risk}</p>
                                    <p className="mt-3 text-3xl font-black leading-none">{value}%</p>
                                    {note && <p className="mt-2 text-xs opacity-90">{note}</p>}
                                </article>
                            )
                        })}
                    </div>
                </>
            )
        }

        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {body && <p className="mt-3 text-lg leading-relaxed opacity-90">{body}</p>}
                <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, 3) }}>
                    {cards.map((card, index) => {
                        const cardTitle = toText(card.title || card.label || `Elemento ${index + 1}`)
                        const cardBody = toText(card.body || card.description || card.content)
                        const parsedNarrative = parseServiceNarrative(cardBody)
                        const cardWhat = toText(card.what || parsedNarrative.what)
                        const cardPurpose = toText(card.purpose || parsedNarrative.purpose)
                        const cardValue = toText(card.valueText || card.valueDescription || card.valueOutcome || parsedNarrative.value)
                        const hasStructuredNarrative = Boolean(cardWhat || cardPurpose || cardValue)
                        const cardEyebrow = toText(card.eyebrow || card.kicker)
                        const cardIcon = toText(card.icon)
                        const CardIcon = resolveCmsIcon(cardIcon)
                        const cardImage = toText(card.imageUrl || card.image || card.photo)
                        const cardHref = normalizeCmsHref(card.url || card.href)
                        const cardCtaLabel = toText(card.label || card.ctaLabel || (block.id === 'servicios-aplicados' ? 'Ver servicio' : 'Ver detalle'))

                        return (
                            <article key={`${card.id || index}`} className="group overflow-hidden border border-current/20 bg-white/5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/10">
                                {cardImage && (
                                    <img
                                        src={cardImage}
                                        alt={cardTitle}
                                        className="h-40 w-full border-b border-current/20 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    {(cardEyebrow || cardIcon) && (
                                        <div className="mb-2 flex items-center gap-2">
                                            {cardIcon && (
                                                <span className="inline-flex h-8 w-8 items-center justify-center border border-current/25 bg-white/10 text-base">
                                                    {CardIcon ? <CardIcon className="h-4 w-4" /> : cardIcon}
                                                </span>
                                            )}
                                            {cardEyebrow && (
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{cardEyebrow}</p>
                                            )}
                                        </div>
                                    )}
                                    <h4 className="font-bold">{cardTitle}</h4>
                                    {!hasStructuredNarrative && cardBody && <p className="mt-2 text-sm opacity-85">{cardBody}</p>}
                                    {hasStructuredNarrative && (
                                        <div className="mt-3 space-y-2.5 text-sm leading-relaxed">
                                            {cardWhat && (
                                                <div className="rounded-lg border border-sky-200/55 bg-sky-50/40 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Qué hicimos</p>
                                                    <p className="mt-1 text-slate-700">{cardWhat}</p>
                                                </div>
                                            )}
                                            {cardPurpose && (
                                                <div className="rounded-lg border border-indigo-200/55 bg-indigo-50/40 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">Para qué sirvió</p>
                                                    <p className="mt-1 text-slate-700">{cardPurpose}</p>
                                                </div>
                                            )}
                                            {cardValue && (
                                                <div className="rounded-lg border border-emerald-200/55 bg-emerald-50/40 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Qué valor dejó</p>
                                                    <p className="mt-1 text-slate-700">{cardValue}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {cardHref && cardHref !== '#' && (
                                        <a href={cardHref} className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 hover:opacity-100">
                                            {cardCtaLabel}
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            </>
        )
    }

    if (block.type === 'gallery' || block.type === 'carousel') {
        const galleryItems = items.length > 0 ? items : [
            { title: 'Imagen 1', body: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop' },
            { title: 'Imagen 2', body: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=1200&auto=format&fit=crop' },
        ]
        return (
            <>
                {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
                {body && <p className="mt-3 text-lg leading-relaxed opacity-90">{body}</p>}
                <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: getResponsiveGridTemplate(block.style.columns, block.type === 'gallery' ? 3 : 1) }}>
                    {galleryItems.map((item, index) => {
                        const src = toText(item.body || item.url || item.imageUrl)
                        const captionTitle = toText(item.title || item.label || `Imagen ${index + 1}`)
                        const captionBody = toText(item.description || item.content)
                        return (
                            <figure key={`${item.id || index}`} className="overflow-hidden border border-current/20 bg-white/5">
                                {src ? (
                                    <img src={src} alt={captionTitle} className="h-64 w-full object-cover" />
                                ) : (
                                    <div className="flex h-64 items-center justify-center text-sm opacity-70">Sin imagen</div>
                                )}
                                {(captionTitle || captionBody) && (
                                    <figcaption className="border-t border-current/15 px-4 py-3">
                                        {captionTitle && <p className="text-sm font-bold">{captionTitle}</p>}
                                        {captionBody && <p className="mt-1 text-xs opacity-80">{captionBody}</p>}
                                    </figcaption>
                                )}
                            </figure>
                        )
                    })}
                </div>
            </>
        )
    }

    if (block.type === 'pricing') {
        const features = items.length > 0 ? items : [{ label: 'Beneficio 1' }, { label: 'Beneficio 2' }, { label: 'Beneficio 3' }]
        return (
            <div className="w-full max-w-lg border border-current/20 bg-white/5 p-6 text-center">
                <h3 className="text-2xl font-black tracking-tight">{title || 'Plan'}</h3>
                <p className="mt-2 text-4xl font-black">{toText(block.content.price, '$99')}<span className="text-base font-semibold opacity-70">{toText(block.content.period, '')}</span></p>
                <ul className="mt-4 space-y-2 text-sm">
                    {features.map((item, index) => (
                        <li key={`${item.id || index}`}>• {toText(item.label || item.title || item.value || `Beneficio ${index + 1}`)}</li>
                    ))}
                </ul>
                <div className="mt-5">
                    <BlockActions block={block} />
                </div>
            </div>
        )
    }

    if (block.type === 'flipbox') {
        return (
            <div className="grid w-full gap-3 sm:grid-cols-2">
                <article className="border border-current/20 bg-white/5 p-4">
                    <h4 className="font-bold">{toText(block.content.frontTitle, 'Frente')}</h4>
                    <p className="mt-2 text-sm opacity-85">{toText(block.content.body, 'Contenido del frente')}</p>
                </article>
                <article className="border border-current/20 bg-white/5 p-4">
                    <h4 className="font-bold">{toText(block.content.backTitle, 'Reverso')}</h4>
                    <p className="mt-2 text-sm opacity-85">{toText(block.content.backBody, 'Contenido del reverso')}</p>
                </article>
            </div>
        )
    }

    if (block.type === 'navmenu') {
        const menuItems = items.length > 0 ? items : [{ label: 'Inicio', body: '/' }, { label: 'Servicios', body: '/landing-servicios' }]
        return (
            <nav className="flex flex-wrap gap-2">
                {menuItems.map((item, index) => (
                    <a
                        key={`${item.id || index}`}
                        href={normalizeCmsHref(item.body || item.url, '#')}
                        className="border border-current/25 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10"
                    >
                        {toText(item.label || item.title || `Link ${index + 1}`)}
                    </a>
                ))}
            </nav>
        )
    }

    if (block.type === 'lottie') {
        return (
            <div className="w-full max-w-xl border border-current/20 bg-white/5 p-5">
                <h3 className="text-xl font-black tracking-tight">{title || 'Lottie'}</h3>
                <p className="mt-2 text-sm opacity-80">JSON URL: {toText(block.content.jsonUrl, '(sin definir)')}</p>
            </div>
        )
    }

    if (block.type === 'form') {
        const serviceSlug = toText(block.content.serviceSlug)
        const formVariant = toText(block.content.variant) === 'product' ? 'product' : toText(block.content.variant) === 'service' ? 'service' : 'general'
        
        return (
            <div className="w-full max-w-xl border border-current/20 bg-white/5 p-8 lg:p-12 shadow-2xl">
                {title && <h3 className="text-2xl font-black tracking-tight mb-2">{title}</h3>}
                {body && <p className="mb-8 text-sm opacity-80 leading-relaxed">{body}</p>}
                <ContactForm serviceSlug={serviceSlug} context={formVariant} />
            </div>
        )
    }

    return (
        <>
            {title && <h3 className="text-3xl font-black tracking-tight">{title}</h3>}
            {body && <p className="mt-4 text-lg leading-relaxed opacity-90">{body}</p>}
        </>
    )
}

function PageBlock({
    block,
    pageAccentColor,
    pageTheme,
    selectable,
    selected,
    onSelect,
}: {
    block: SitePageBlock
    pageAccentColor: string
    pageTheme: PageThemeVariant
    selectable: boolean
    selected: boolean
    onSelect?: (id: string) => void
}) {
    if (!block.visible) return null
    const isCasePremium = pageTheme === 'case-premium'

    if (block.type === 'spacer') {
        const spacerClass = `${selectable ? 'relative' : ''}`
        return (
            <div
                data-block-id={block.id}
                onClickCapture={(event) => handleSelectableBlockClick(event, selectable, block.id, onSelect)}
                className={spacerClass}
                style={{ height: toCssLength(block.style.height, '3rem') }}
            >
                {selectable && (
                    <div className={`absolute inset-x-0 top-0 border-t border-dashed ${selected ? 'border-blue-500' : 'border-slate-300'}`} />
                )}
            </div>
        )
    }

    const backgroundColor = toText(block.style.backgroundColor) || (block.type === 'cta' ? pageAccentColor : '#ffffff')
    const textColor = toText(block.style.textColor) || (block.type === 'cta' || block.type === 'contact' ? '#ffffff' : '#0f172a')
    const paddingY = toCssLength(block.style.paddingY, block.type === 'hero' ? '5rem' : '3.5rem')
    const alignment = textAlignClass(block.style.align)
    const borderRadius = toCssLength(block.style.radius, '0px')
    const backgroundGradient = toText(block.style.backgroundGradient)
    const backgroundImageUrl = toText(block.style.backgroundImageUrl || block.style.backgroundImage)
    const backgroundImage = [backgroundGradient, backgroundImageUrl ? `url(${backgroundImageUrl})` : ''].filter(Boolean).join(', ')
    const overlayColor = toText(block.style.overlayColor)
    const overlayOpacity = toOpacity(block.style.overlayOpacity, 0)
    const blockAnchorIds = getBlockAnchorIds(block)

    return (
        <section
            data-block-id={block.id}
            data-theme-variant={isCasePremium ? 'case-premium' : 'default'}
            id={blockAnchorIds[0] || undefined}
            onClickCapture={(event) => handleSelectableBlockClick(event, selectable, block.id, onSelect)}
            className={`relative scroll-mt-36 ${isCasePremium ? 'case-premium-section overflow-hidden' : ''} ${selectable ? 'cursor-pointer transition-shadow' : ''} ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{
                backgroundColor,
                color: textColor,
                paddingTop: paddingY,
                paddingBottom: paddingY,
                borderRadius,
                backgroundImage: backgroundImage || undefined,
                backgroundSize: backgroundImageUrl ? 'cover' : undefined,
                backgroundPosition: backgroundImageUrl ? 'center' : undefined,
                backgroundRepeat: backgroundImageUrl ? 'no-repeat' : undefined,
            }}
        >
            {isCasePremium && (block.id === 'hero' || block.id === 'cta-final') && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    <span className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
                    <span className="absolute right-8 top-10 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" />
                    <span className="absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-amber-200/20 blur-2xl" />
                </div>
            )}
            {overlayColor && overlayOpacity > 0 && (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
                />
            )}
            {blockAnchorIds.slice(1).map((anchorId) => (
                <span
                    key={`${block.id}-${anchorId}`}
                    id={anchorId}
                    className="pointer-events-none absolute -top-36 left-0 h-px w-px opacity-0"
                    aria-hidden="true"
                />
            ))}
            <div className="relative mx-auto flex max-w-6xl flex-col px-6">
                {selectable && (
                    <div className="mb-3 inline-flex w-fit items-center gap-2 border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                        {block.name || block.type}
                    </div>
                )}
                <div className={`flex w-full flex-col ${alignment}`} style={{ gap: toCssLength(block.style.gap, '0rem') }}>
                    {renderBlockBody(block, pageAccentColor)}
                </div>
            </div>
        </section>
    )
}

export function DynamicPageRenderer({
    page,
    selectable = false,
    selectedBlockId = null,
    onSelectBlock,
    className = '',
}: DynamicPageRendererProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [caseProgress, setCaseProgress] = useState(0)
    const normalizedPath = page.path !== '/' && page.path.endsWith('/') ? page.path.slice(0, -1) : page.path
    const isHomeRootPage = page.id === 'home-root' || normalizedPath === '/'
    const pageTheme: PageThemeVariant = page.id === 'case-transversal' || normalizedPath === '/caso-transversal'
        ? 'case-premium'
        : 'default'
    const isCasePremium = pageTheme === 'case-premium'

    useEffect(() => {
        if (!isCasePremium || isHomeRootPage) return
        const root = wrapperRef.current
        if (!root) return
        const sections = Array.from(root.querySelectorAll<HTMLElement>('.case-premium-section'))
        if (sections.length === 0) return

        sections.forEach((section) => {
            section.classList.add('case-premium-observe')
        })
        if (sections[0]) sections[0].classList.add('case-premium-visible')

        if (typeof IntersectionObserver === 'undefined') {
            sections.forEach((section) => section.classList.add('case-premium-visible'))
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('case-premium-visible')
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
        )

        sections.slice(1).forEach((section) => observer.observe(section))
        return () => observer.disconnect()
    }, [isCasePremium, isHomeRootPage, page.id, selectable])

    useEffect(() => {
        if (!isCasePremium || isHomeRootPage || selectable) return
        const root = wrapperRef.current
        if (!root) return

        let raf = 0
        const update = () => {
            const rect = root.getBoundingClientRect()
            const viewport = window.innerHeight || 1
            const progressStart = viewport * 0.24
            const usable = Math.max(rect.height - viewport * 0.64, 1)
            const raw = (progressStart - rect.top) / usable
            const clamped = Math.max(0, Math.min(1, raw))
            setCaseProgress(clamped)
        }
        const schedule = () => {
            if (raf) return
            raf = window.requestAnimationFrame(() => {
                raf = 0
                update()
            })
        }

        update()
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', schedule)
        return () => {
            if (raf) window.cancelAnimationFrame(raf)
            window.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
        }
    }, [isCasePremium, isHomeRootPage, page.id, selectable])

    if (isHomeRootPage) {
        return (
            <HomeRootPageRenderer
                page={page}
                selectable={selectable}
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
                className={className}
            />
        )
    }

    const blocks = [...page.blocks].sort((a, b) => a.order - b.order)
    const wrapperClass = [className, pageTheme === 'case-premium' ? 'case-premium-theme' : ''].filter(Boolean).join(' ')
    const renderBlock = (block: SitePageBlock) => (
        <PageBlock
            key={block.id}
            block={block}
            pageAccentColor={page.accentColor || '#2563eb'}
            pageTheme={pageTheme}
            selectable={selectable}
            selected={selectedBlockId === block.id}
            onSelect={onSelectBlock}
        />
    )

    if (isCasePremium) {
        const heroBlock = blocks.find((block) => block.id === 'hero')
        const kpisBlock = blocks.find((block) => block.id === 'kpis-top')
        const storyBlocks = blocks.filter((block) => block.id !== 'hero' && block.id !== 'kpis-top')
        const railIds = new Set([
            'situacion-inicial',
            'servicios-aplicados',
            'productos-generados',
            'resultados-comparativos',
            'donut-operacion',
            'cta-final',
        ])
        const railLinks = storyBlocks
            .filter((block) => railIds.has(block.id))
            .map((block) => {
                const anchor = normalizeAnchorId(toText(block.content.anchor) || block.id)
                return {
                    id: block.id,
                    anchor,
                    label: toText(block.content.title || block.name || block.id),
                }
            })
            .filter((item) => item.anchor)

        return (
            <div ref={wrapperRef} className={wrapperClass} data-page-id={page.id} data-page-theme={pageTheme}>
                {heroBlock ? renderBlock(heroBlock) : null}
                <div className="case-premium-editorial-shell">
                    <aside className="case-premium-sticky-rail">
                        {kpisBlock ? renderBlock(kpisBlock) : null}
                        {!selectable && railLinks.length > 0 && (
                            <nav className="case-premium-story-nav" aria-label="Navegación del caso">
                                <p className="case-premium-story-nav-title">Atajos del caso</p>
                                {railLinks.map((item) => (
                                    <a key={`rail-${item.id}`} href={`#${item.anchor}`} className="case-premium-story-nav-link">
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                        )}
                        {!selectable && (
                            <div className="case-premium-progress-panel" aria-label="Progreso de lectura del caso">
                                <p className="case-premium-progress-title">Progreso del caso</p>
                                <div className="case-premium-progress-track">
                                    <span className="case-premium-progress-fill" style={{ width: `${Math.round(caseProgress * 100)}%` }} />
                                </div>
                                <p className="case-premium-progress-value">{Math.round(caseProgress * 100)}%</p>
                            </div>
                        )}
                    </aside>
                    <div className="case-premium-story">
                        {storyBlocks.map(renderBlock)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div ref={wrapperRef} className={wrapperClass} data-page-id={page.id} data-page-theme={pageTheme}>
            {blocks.map(renderBlock)}
        </div>
    )
}
