import { motion } from 'framer-motion'
import { ContactForm } from '../../components/forms/ContactForm'
import { Mail, MapPin, Linkedin, Terminal } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import type { HomeResponsiveViewport } from '../../admin/context/CMSContext'

type ContactProps = {
    visibleBlocks?: {
        header?: boolean
        channels?: boolean
        form?: boolean
    }
    blockOrder?: Array<'header' | 'channels' | 'form'>
    viewport?: HomeResponsiveViewport
    styleOverrides?: {
        header?: {
            titleSizeRem?: string
        }
        channels?: {
            gapRem?: string
        }
        form?: {
            layoutMode?: string
        }
    }
}

export function Contact({ visibleBlocks, blockOrder, viewport = 'desktop', styleOverrides }: ContactProps) {
    const { translatedState } = useLanguage()
    const section = translatedState.homePage.contactSection
    const sectionStyle = {
        backgroundColor: section.style.backgroundColor || undefined,
        backgroundImage: section.style.backgroundImageUrl
            ? `linear-gradient(rgba(255,255,255,0.94), rgba(255,255,255,0.94)), url(${section.style.backgroundImageUrl})`
            : undefined,
        backgroundSize: section.style.backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: section.style.backgroundImageUrl ? 'center' : undefined,
    } as const
    const formOuterStyle = {
        backgroundColor: section.style.formOuterBackgroundColor || undefined,
        backgroundImage: section.style.formOuterBackgroundImageUrl
            ? `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${section.style.formOuterBackgroundImageUrl})`
            : undefined,
        backgroundSize: section.style.formOuterBackgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: section.style.formOuterBackgroundImageUrl ? 'center' : undefined,
    } as const
    const formInnerStyle = {
        backgroundColor: section.style.formInnerBackgroundColor || undefined,
    } as const
    const blocks = {
        header: visibleBlocks?.header !== false,
        channels: visibleBlocks?.channels !== false,
        form: visibleBlocks?.form !== false,
    }
    const normalizeBlockOrder = (raw: unknown, fallback: Array<'header' | 'channels' | 'form'>): Array<'header' | 'channels' | 'form'> => {
        const valid = new Set(fallback)
        const fromRaw = Array.isArray(raw) ? raw.filter((value): value is 'header' | 'channels' | 'form' => typeof value === 'string' && valid.has(value as any)) : []
        const unique = [...new Set(fromRaw)]
        for (const value of fallback) {
            if (!unique.includes(value)) unique.push(value)
        }
        return unique as Array<'header' | 'channels' | 'form'>
    }
    const sectionBlockOrder = normalizeBlockOrder(blockOrder, ['header', 'channels', 'form'])
    const orderedVisibleBlocks = sectionBlockOrder.filter((blockId) => blocks[blockId])
    const parseNum = (value: string | undefined, fallback: number) => {
        const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : fallback
    }
    const headerTitleSizeRem = parseNum(
        styleOverrides?.header?.titleSizeRem,
        viewport === 'desktop' ? 6 : viewport === 'tablet' ? 5 : 3.5
    )
    const channelsGapRem = parseNum(
        styleOverrides?.channels?.gapRem,
        viewport === 'desktop' ? 3 : viewport === 'tablet' ? 2.5 : 2
    )
    const formLayoutMode = styleOverrides?.form?.layoutMode === 'split' ? 'split' : 'stack'
    const nonFormVisibleBlocks = orderedVisibleBlocks.filter((blockId) => blockId !== 'form')
    const formIndex = orderedVisibleBlocks.indexOf('form')
    const useSplitLayout = formLayoutMode === 'split' && formIndex !== -1 && nonFormVisibleBlocks.length > 0 && formIndex === orderedVisibleBlocks.length - 1
    if (orderedVisibleBlocks.length === 0) return null

    const renderHeaderBlock = () => (
        <div key="contact-block-header">
            <div className="flex items-center gap-4 mb-10">
                <Terminal className="w-6 h-6 text-brand-primary" />
                <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">
                    {section.eyebrow}
                </span>
            </div>

            <h2 className="text-6xl md:text-8xl font-black text-slate-900 mb-12 tracking-tighter leading-none" style={{ fontSize: `${headerTitleSizeRem}rem`, lineHeight: 0.95 }}>
                {section.titlePrefix} <span className="text-gradient">{section.titleAccent}</span>
            </h2>
        </div>
    )

    const renderChannelsBlock = () => (
        <div key="contact-block-channels" className="grid" style={{ gap: `${channelsGapRem}rem` }}>
            {[
                { icon: Mail, label: section.labels.officialChannel, value: translatedState.site.contactEmail },
                { icon: MapPin, label: section.labels.hubHq, value: translatedState.site.contactAddress },
                { icon: Linkedin, label: section.labels.corporateNetwork, value: section.labels.linkedinProtocol }
            ].map((item, i) => (
                <div key={i} className="flex items-start gap-8 group">
                    <div className="w-16 h-16 flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{item.label}</div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</div>
                    </div>
                </div>
            ))}
        </div>
    )

    const renderFormBlock = () => (
        <motion.div
            key="contact-block-form"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={formOuterStyle}
            className="bg-white border-4 border-slate-900 p-12 lg:p-20 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]"
        >
            <div style={formInnerStyle} className="bg-white p-12 md:p-16 border-b-8 border-brand-primary shadow-2xl">
                <ContactForm />
            </div>
        </motion.div>
    )

    const renderBlock = (blockId: 'header' | 'channels' | 'form') => {
        if (blockId === 'header') return renderHeaderBlock()
        if (blockId === 'channels') return renderChannelsBlock()
        return renderFormBlock()
    }

    return (
        <section style={sectionStyle} className="py-32 px-6 bg-white infra-grid relative">
            <div className="max-w-7xl mx-auto">
                {useSplitLayout ? (
                    <div className="grid gap-24" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                        <div className="space-y-16">
                            {nonFormVisibleBlocks.map((blockId) => renderBlock(blockId))}
                        </div>
                        {renderFormBlock()}
                    </div>
                ) : (
                    <div className="grid gap-16">
                        {orderedVisibleBlocks.map((blockId) => renderBlock(blockId))}
                    </div>
                )}
            </div>
        </section>
    )
}
