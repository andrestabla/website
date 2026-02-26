import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { HeroContent, HomePageContent } from '../../admin/context/CMSContext'

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

type HeroViewProps = {
    hero: HeroContent
    heroSection: HomePageContent['hero']
    animated?: boolean
    visibleBlocks?: {
        headline?: boolean
        ctas?: boolean
        stats?: boolean
    }
}

export function HeroView({ hero, heroSection, animated = true, visibleBlocks }: HeroViewProps) {
    const hs = heroSection.style
    const heroVisibleBlocks = {
        headline: visibleBlocks?.headline !== false,
        ctas: visibleBlocks?.ctas !== false,
        stats: visibleBlocks?.stats !== false,
    }
    const sectionVideoEmbed = getYouTubeEmbedUrl(hs.backgroundImageUrl || '')
    const panelVideoEmbed = getYouTubeEmbedUrl(hs.rightPanelBackgroundImageUrl || '')
    const overlaySectionOpacity = Math.max(0, Math.min(1, Number(hs.sectionOverlayOpacity || '0.92')))
    const overlayPanelOpacity = Math.max(0, Math.min(1, Number(hs.rightPanelOverlayOpacity || '0.90')))
    const sectionStyle = {
        backgroundColor: hs.backgroundColor || undefined,
        backgroundImage: hs.backgroundImageUrl && !sectionVideoEmbed ? `url(${hs.backgroundImageUrl})` : undefined,
        backgroundSize: hs.backgroundImageUrl && !sectionVideoEmbed ? 'cover' : undefined,
        backgroundPosition: hs.backgroundImageUrl && !sectionVideoEmbed ? 'center' : undefined,
    } as CSSProperties
    const panelStyle = {
        backgroundColor: hs.rightPanelBackgroundColor || undefined,
        backgroundImage: hs.rightPanelBackgroundImageUrl && !panelVideoEmbed ? `url(${hs.rightPanelBackgroundImageUrl})` : undefined,
        backgroundSize: hs.rightPanelBackgroundImageUrl && !panelVideoEmbed ? 'cover' : undefined,
        backgroundPosition: hs.rightPanelBackgroundImageUrl && !panelVideoEmbed ? 'center' : undefined,
    } as CSSProperties
    const titleStyle = {
        color: hs.titleColor || undefined,
        fontSize: hs.titleFontSizeMobile || undefined,
        fontWeight: hs.titleFontWeight || undefined,
        lineHeight: hs.titleLineHeight || undefined,
        fontFamily: 'var(--font-display, var(--font-sans))',
    } as CSSProperties
    const subtitleStyle = {
        color: hs.subtitleColor || undefined,
        fontSize: hs.subtitleFontSizeMobile || undefined,
        fontWeight: hs.subtitleFontWeight || undefined,
    } as CSSProperties
    const panelBorderColor = hs.statsPanelBorderColor || undefined
    const sectionVideoCoverStyle = {
        width: 'max(210vw, 210vh)',
        height: 'max(118.125vw, 118.125vh)',
        transform: 'translate(-50%, -50%) scale(1.9)',
    } as CSSProperties
    const panelVideoCoverStyle = {
        width: 'max(180vw, 180vh)',
        height: 'max(101.25vw, 101.25vh)',
        transform: 'translate(-50%, -50%) scale(2.05)',
    } as CSSProperties

    return (
        <section style={sectionStyle} className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-24 px-6 overflow-hidden bg-white infra-grid">
            {sectionVideoEmbed && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <iframe
                        src={sectionVideoEmbed}
                        title="Hero background video"
                        className="absolute top-1/2 left-1/2"
                        style={sectionVideoCoverStyle}
                        allow="autoplay; encrypted-media"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                </div>
            )}
            {hs.backgroundImageUrl && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: hs.sectionOverlayColor || '#ffffff', opacity: overlaySectionOpacity }}
                />
            )}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary opacity-50" />
            <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50/50 -z-10 border-l border-slate-100" />

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
                <div className={heroVisibleBlocks.stats ? 'lg:col-span-8' : 'lg:col-span-12'}>
                    <motion.div
                        initial={animated ? { opacity: 0, x: -30 } : false}
                        animate={animated ? { opacity: 1, x: 0 } : undefined}
                        transition={animated ? { duration: 0.8 } : undefined}
                        className="flex flex-col items-start"
                    >
                        {heroVisibleBlocks.headline && (
                            <>
                                <div className="flex items-center gap-4 mb-10">
                                    <span className="w-12 h-px bg-brand-primary" />
                                    <span className="text-sm font-black uppercase tracking-[0.4em]" style={{ color: hs.highlightColor || undefined }}>
                                        {hero.highlight}
                                    </span>
                                </div>

                                <h1 className="hero-dynamic-title text-7xl md:text-9xl mb-12 tracking-tighter leading-[0.85] text-slate-900" style={titleStyle}>
                                    {hero.title.split(' ').map((word, i) => (
                                        <span key={i} className="block" style={i > 1 ? { color: hs.titleAccentColor || hs.titleColor || undefined } : undefined}>
                                            {word}
                                        </span>
                                    ))}
                                </h1>

                                <div className="max-w-2xl border-l-4 border-brand-primary pl-10 py-2 mb-16">
                                    <p className="hero-dynamic-subtitle text-2xl md:text-3xl font-medium leading-tight" style={subtitleStyle}>
                                        {hero.subtitle}
                                    </p>
                                </div>
                            </>
                        )}

                        {heroVisibleBlocks.ctas && (
                            <div className="flex flex-wrap items-center gap-4">
                                <Button size="lg" className="group">
                                    {hero.cta}
                                    <ChevronRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button variant="outline" size="lg">
                                    {hero.secondaryCta}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {heroVisibleBlocks.stats && (
                    <div className="lg:col-span-4 hidden lg:block">
                    <motion.div
                        initial={animated ? { opacity: 0, scale: 0.9 } : false}
                        animate={animated ? { opacity: 1, scale: 1 } : undefined}
                        transition={animated ? { delay: 0.5, duration: 1 } : undefined}
                        className="w-full aspect-square border relative p-8 dot-pattern bg-white overflow-hidden"
                        style={{ ...panelStyle, borderColor: panelBorderColor }}
                    >
                        {panelVideoEmbed && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <iframe
                                    src={panelVideoEmbed}
                                    title="Hero panel background video"
                                    className="absolute top-1/2 left-1/2"
                                    style={panelVideoCoverStyle}
                                    allow="autoplay; encrypted-media"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                />
                            </div>
                        )}
                        {hs.rightPanelBackgroundImageUrl && (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ backgroundColor: hs.rightPanelOverlayColor || '#ffffff', opacity: overlayPanelOpacity }}
                            />
                        )}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-primary -translate-x-1 -translate-y-1" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-primary translate-x-1 translate-y-1" />

                        <div className="flex flex-col h-full justify-center space-y-8 relative z-10">
                            {heroSection.stats.map((stat, i) => (
                                <div key={i} className="border-b pb-4" style={{ borderColor: hs.statsDividerColor || undefined }}>
                                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: hs.statsLabelColor || undefined }}>{stat.label}</div>
                                    <div className="text-3xl font-black" style={{ color: hs.statsValueColor || undefined }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                    </div>
                )}
            </div>
            <style>{`
                @media (min-width: 768px) {
                    .hero-dynamic-title { font-size: ${hs.titleFontSizeDesktop || hs.titleFontSizeMobile || '8rem'} !important; }
                    .hero-dynamic-subtitle { font-size: ${hs.subtitleFontSizeDesktop || hs.subtitleFontSizeMobile || '1.875rem'} !important; }
                }
            `}</style>
        </section>
    )
}
