import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { HomeResponsiveViewport } from '../../admin/context/CMSContext'
import { HeroView } from './HeroView'

function getViewportFromWidth(width: number): HomeResponsiveViewport {
    if (width >= 1024) return 'desktop'
    if (width >= 768) return 'tablet'
    return 'mobile'
}

type HeroProps = {
    viewport?: HomeResponsiveViewport
}

export function Hero({ viewport }: HeroProps) {
    const { translatedState } = useLanguage()
    const [localViewport, setLocalViewport] = useState<HomeResponsiveViewport>(() => {
        if (typeof window === 'undefined') return 'desktop'
        return getViewportFromWidth(window.innerWidth)
    })
    const effectiveViewport = viewport ?? localViewport

    useEffect(() => {
        if (viewport) return
        const onResize = () => setLocalViewport(getViewportFromWidth(window.innerWidth))
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [viewport])

    const heroBlockVisibility = translatedState.homePage.layout?.blockVisibility?.hero
    const visibleBlocks = {
        headline: heroBlockVisibility?.headline?.[effectiveViewport] !== false,
        ctas: heroBlockVisibility?.ctas?.[effectiveViewport] !== false,
        stats: heroBlockVisibility?.stats?.[effectiveViewport] !== false,
    }

    return <HeroView hero={translatedState.hero} heroSection={translatedState.homePage.hero} viewport={effectiveViewport} visibleBlocks={visibleBlocks} />
}
