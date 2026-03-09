import { ArrowRight, CheckCircle2, Code2, LineChart, Network, Rocket, Search, Users } from 'lucide-react'
import { ContactForm } from '../forms/ContactForm'
import React, { useState, type MouseEvent as ReactMouseEvent } from 'react'
import { type SiteArchitecturePage, type SitePageBlock } from '../../admin/context/CMSContext'
import { AdaptiveCaseStudyModal } from './blocks/AdaptiveCaseStudyModal'

type HomeRootPageRendererProps = {
    page: SiteArchitecturePage
    selectable?: boolean
    selectedBlockId?: string | null
    onSelectBlock?: (blockId: string) => void
    className?: string
}

type ItemObject = Record<string, unknown>

const SERVICE_CARD_ICONS = [Search, Network, Users, Code2, Rocket, LineChart]

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

function renderHeroBlock(block: SitePageBlock) {
    const primaryHref = normalizeCmsHref(block.content.primaryHref)
    const secondaryHref = normalizeCmsHref(block.content.secondaryHref)
    return (
        <div className="relative mx-auto max-w-6xl">
            <div className="pointer-events-none absolute inset-0 services-grid-pattern opacity-35" />
            <div className="pointer-events-none absolute left-[8%] top-20 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl services-float-slow" />
            <div className="pointer-events-none absolute right-[10%] top-32 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl services-float-slow-delay" />

            <div className="relative">
                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-900">
                    {toText(block.content.eyebrow, 'Servicios explicados sin tecnicismos')}
                </p>

                <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-7xl">
                    {toText(block.content.title, 'Te ayudamos a modernizar tu empresa paso a paso, con decisiones simples y enfocadas en resultados.')}
                </h1>

                <p className="mt-6 max-w-4xl text-lg leading-relaxed text-slate-700 md:text-xl">
                    {toText(block.content.body, 'Diseñamos e implementamos mejoras reales para tu compañía: menos fricción operativa, más orden interno y un mejor servicio para tus clientes.')}
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                    {toText(block.content.primaryLabel) && primaryHref && (
                        <a
                            href={primaryHref}
                            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-emerald-800 hover:bg-emerald-800"
                        >
                            {toText(block.content.primaryLabel)}
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    )}
                    {toText(block.content.secondaryLabel) && secondaryHref && (
                        <a
                            href={secondaryHref}
                            className="inline-flex items-center gap-2 border border-slate-300 bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-800 transition-colors hover:border-slate-900 hover:text-slate-900"
                        >
                            {toText(block.content.secondaryLabel)}
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}

function renderPromisesBlock(block: SitePageBlock) {
    const items = ensureObjectItems(block.content.items)
    return (
        <div className="mx-auto max-w-6xl">
            {toText(block.content.title) && (
                <h2 className="mb-3 text-2xl font-black tracking-tight text-slate-900">{toText(block.content.title)}</h2>
            )}
            {toText(block.content.body) && <p className="mb-6 text-slate-700">{toText(block.content.body)}</p>}
            <div className="grid gap-4 md:grid-cols-3">
                {items.map((item, index) => (
                    <div key={`${item.id || index}`} className="services-card-shadow border border-slate-200 bg-white/95 px-5 py-4">
                        <p className="text-sm font-semibold text-slate-700">{toText(item.label || item.title || item.body || `Promesa ${index + 1}`)}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function renderServicesGridBlock(block: SitePageBlock) {
    const items = ensureObjectItems(block.content.items)
    return (
        <div className="mx-auto max-w-6xl">
            <div className="max-w-4xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">{toText(block.content.eyebrow, 'Servicios de punta a punta')}</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Qué hacemos y cómo beneficia a tu empresa')}</h2>
                {toText(block.content.body) && <p className="mt-5 text-lg text-slate-700">{toText(block.content.body)}</p>}
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
                {items.map((item, index) => {
                    const Icon = SERVICE_CARD_ICONS[index % SERVICE_CARD_ICONS.length]
                    const outcomes = ensureStringArray(item.outcomes)
                    const iconText = toText(item.icon)

                    return (
                        <article key={`${item.id || index}`} className="services-card-shadow border border-slate-200 bg-white/95 px-8 py-8">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-12 w-12 items-center justify-center border border-emerald-100 bg-emerald-50 text-emerald-900">
                                    {iconText ? (
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
                                                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
                                                <span>{outcome}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {toText(item.label) && toText(item.url) && (
                                <a
                                    href={normalizeCmsHref(item.url)}
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

function renderBenefitsAndFlow(benefitsBlock: SitePageBlock, flowBlock: SitePageBlock | null, selectable: boolean, selectedBlockId: string | null, onSelectBlock?: (blockId: string) => void, setIsCaseModalOpen?: React.Dispatch<React.SetStateAction<boolean>>) {
    const benefitItems = ensureObjectItems(benefitsBlock.content.items)
    const flowItems = flowBlock ? ensureObjectItems(flowBlock.content.items) : []
    const flowBadges = flowBlock ? ensureStringArray(flowBlock.content.badges) : []

    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <article
                data-block-id={benefitsBlock.id}
                onClickCapture={(event) => handleSelectableBlockClick(event, selectable, benefitsBlock.id, onSelectBlock)}
                className={`border border-slate-200 bg-white px-8 py-10 md:px-10 ${selectable ? 'cursor-pointer' : ''} ${selectedBlockId === benefitsBlock.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100' : ''}`}
            >
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">{toText(benefitsBlock.content.eyebrow, 'Lo que puedes esperar')}</p>
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
                    className={`border border-slate-700 bg-slate-950 px-8 py-10 text-white md:px-10 ${selectable ? 'cursor-pointer' : ''} ${selectedBlockId === flowBlock.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100' : ''}`}
                >
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">{toText(flowBlock.content.eyebrow, 'Cómo trabajamos')}</p>
                    <h3 className="mt-5 text-4xl font-black tracking-tight text-white">{toText(flowBlock.content.title, 'Cómo trabajamos')}</h3>
                    <div className="mt-8 space-y-6">
                        {flowItems.map((item, index) => (
                            <div key={`${item.id || index}`}>
                                <p className="text-4xl font-black leading-none text-white">{toText(item.title || item.label || `Paso ${index + 1}`)}</p>
                                <p className="mt-2 text-lg leading-relaxed text-slate-200">{toText(item.body || item.description)}</p>
                            </div>
                        ))}
                    </div>
                    {flowBadges.length > 0 && (
                        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-3">
                            {flowBadges.map((badge) => (
                                <div key={badge} className="min-h-[56px] border border-white/20 bg-white/5 px-3 py-4 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-emerald-200 break-words whitespace-normal">
                                    {badge}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-10">
                        <button
                            onClick={() => setIsCaseModalOpen?.(true)}
                            className="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200 transition-all hover:bg-emerald-400/20 hover:border-emerald-400/50"
                        >
                            Ver casos en mi industria
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </article>
            )}
        </div>
    )
}

function renderFaqBlock(block: SitePageBlock) {
    const items = ensureObjectItems(block.content.items)
    return (
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white px-8 py-10 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">{toText(block.content.eyebrow, 'Preguntas frecuentes')}</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, 'Respuestas claras para tomar decisiones')}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
                {items.map((item, index) => (
                    <article key={`${item.id || index}`} className="border border-slate-200 bg-slate-50/70 px-6 py-6">
                        <h3 className="text-3xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Pregunta ${index + 1}`)}</h3>
                        <p className="mt-3 text-lg leading-relaxed text-slate-700">{toText(item.body || item.description || item.content)}</p>
                    </article>
                ))}
            </div>
        </div>
    )
}

function renderContactBlock(block: SitePageBlock) {
    const secondaryHref = normalizeCmsHref(block.content.secondaryHref)
    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <article className="border border-slate-200 bg-white px-8 py-10 md:px-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">{toText(block.content.eyebrow, 'Hablemos de tu caso')}</p>
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
                    <a href={secondaryHref} className="mt-4 inline-flex items-center gap-2 text-lg font-black text-slate-900 hover:text-slate-700">
                        {toText(block.content.secondaryLabel)}
                        <ArrowRight className="h-4 w-4" />
                    </a>
                )}
            </article>

            <article className="border border-slate-200 bg-white px-8 py-10 shadow-2xl md:px-14 lg:px-16">
                <ContactForm />
                
                {toText(block.content.complianceText) && (
                    <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{toText(block.content.complianceText)}</p>
                )}
            </article>
        </div>
    )
}

function renderCtaBlock(block: SitePageBlock) {
    const primaryHref = normalizeCmsHref(block.content.primaryHref)
    return (
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white px-8 py-12 text-center md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-900">{toText(block.content.eyebrow, 'Cierre')}</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-6xl">{toText(block.content.title, '¿Listo para avanzar?')}</h2>
            {toText(block.content.body) && <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-700">{toText(block.content.body)}</p>}
            {toText(block.content.primaryLabel) && primaryHref && (
                <a
                    href={primaryHref}
                    className="mt-8 inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-8 py-4 text-sm font-bold uppercase tracking-[0.24em] text-white transition-colors hover:border-emerald-800 hover:bg-emerald-800"
                >
                    {toText(block.content.primaryLabel)}
                    <ArrowRight className="h-4 w-4" />
                </a>
            )}
        </div>
    )
}

function renderFallbackBlock(block: SitePageBlock) {
    const title = toText(block.content.title)
    const body = toText(block.content.body)
    const items = ensureObjectItems(block.content.items)

    return (
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white px-8 py-8 md:px-10">
            {title && <h3 className="text-3xl font-black tracking-tight text-slate-900">{title}</h3>}
            {body && <p className="mt-3 text-lg leading-relaxed text-slate-700">{body}</p>}
            {items.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {items.map((item, index) => (
                        <article key={`${item.id || index}`} className="border border-slate-200 bg-slate-50 px-5 py-5">
                            <p className="text-xl font-black tracking-tight text-slate-900">{toText(item.title || item.label || `Item ${index + 1}`)}</p>
                            <p className="mt-2 text-base text-slate-700">{toText(item.body || item.description)}</p>
                        </article>
                    ))}
                </div>
            )}
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

    const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)

    return (
        <div className={`services-landing-theme ${className}`.trim()}>
            {sortedBlocks.map((block) => {
                if (block.id === 'flujo' && benefitsBlock) return null
                const isSplitBenefitsFlow = block.id === 'beneficios' && Boolean(flowBlock)

                const selected = !isSplitBenefitsFlow && selectedBlockId === block.id
                const sectionClasses = [
                    'px-6',
                    block.id === 'hero' ? 'pt-20 pb-16 md:pt-28 md:pb-24' : 'py-14 md:py-20',
                    'relative scroll-mt-36',
                    selectable && !isSplitBenefitsFlow ? 'cursor-pointer' : '',
                    selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100' : '',
                ]
                    .filter(Boolean)
                    .join(' ')
                const blockAnchors = resolveBlockAnchors(block)

                return (
                    <section
                        key={block.id}
                        data-block-id={block.id}
                        id={blockAnchors[0] || undefined}
                        onClickCapture={isSplitBenefitsFlow ? undefined : (event) => handleSelectableBlockClick(event, selectable, block.id, onSelectBlock)}
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
                                <div className="inline-flex w-fit items-center gap-2 border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                                    {block.name || block.type}
                                </div>
                            </div>
                        )}

                        {block.id === 'hero' && renderHeroBlock(block)}
                        {block.id === 'promesas' && renderPromisesBlock(block)}
                        {block.id === 'servicios' && renderServicesGridBlock(block)}
                        {block.id === 'beneficios' && renderBenefitsAndFlow(block, flowBlock, selectable, selectedBlockId, onSelectBlock, setIsCaseModalOpen)}
                        {block.id === 'faq' && renderFaqBlock(block)}
                        {block.id === 'contacto' && renderContactBlock(block)}
                        {block.id === 'cta' && renderCtaBlock(block)}
                        {!['hero', 'promesas', 'servicios', 'beneficios', 'faq', 'contacto', 'cta'].includes(block.id) && renderFallbackBlock(block)}
                    </section>
                )
            })}
            <AdaptiveCaseStudyModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} />
        </div>
    )
}
