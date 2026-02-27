import { Fragment, useEffect, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../sections/Hero/Hero'
import { Services } from '../sections/Services/Services'
import { Products } from '../sections/Products/Products'
import { Frameworks } from '../sections/Frameworks/Frameworks'
import { Contact } from '../sections/Contact/Contact'
import { Layout } from '../components/layout/Layout'
import { useLanguage } from '../context/LanguageContext'
import type { HomeResponsiveViewport, HomeSectionId, HomeBlockStyleOverrides, HomeBlockOrderMap } from '../admin/context/CMSContext'

const HOME_SECTION_IDS: HomeSectionId[] = ['hero', 'services', 'products', 'frameworks', 'contact']

function getViewportFromWidth(width: number): HomeResponsiveViewport {
    if (width >= 1024) return 'desktop'
    if (width >= 768) return 'tablet'
    return 'mobile'
}

export function Home() {
    const { hash } = useLocation()
    const { translatedState } = useLanguage()
    const [viewport, setViewport] = useState<HomeResponsiveViewport>(() => getViewportFromWidth(window.innerWidth))

    useEffect(() => {
        if (hash) {
            const element = document.getElementById(hash.replace('#', ''))
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            window.scrollTo(0, 0)
        }
    }, [hash])

    useEffect(() => {
        const onResize = () => setViewport(getViewportFromWidth(window.innerWidth))
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const rawLayout = translatedState.homePage.layout
    const validIds = new Set(HOME_SECTION_IDS)
    const isHomeSectionId = (id: unknown): id is HomeSectionId => typeof id === 'string' && validIds.has(id as HomeSectionId)
    const sectionOrder: HomeSectionId[] = Array.isArray(rawLayout?.sectionOrder)
        ? [...new Set([...rawLayout.sectionOrder.filter(isHomeSectionId), ...HOME_SECTION_IDS])]
        : HOME_SECTION_IDS
    const hiddenSections = new Set<HomeSectionId>(
        Array.isArray(rawLayout?.hiddenSections)
            ? rawLayout.hiddenSections.filter(isHomeSectionId)
            : []
    )
    const responsiveVisibility = rawLayout?.sectionVisibility
    const responsiveBlockVisibility = rawLayout?.blockVisibility
    const responsiveBlockOrder = rawLayout?.blockOrder as Partial<HomeBlockOrderMap> | undefined
    const responsiveBlockStyles = rawLayout?.blockStyleOverrides as Partial<HomeBlockStyleOverrides> | undefined
    const isVisibleInViewport = (sectionId: HomeSectionId) => {
        if (hiddenSections.has(sectionId)) return false
        const sectionVisibility = responsiveVisibility?.[sectionId]
        if (!sectionVisibility) return true
        return sectionVisibility[viewport] !== false
    }
    const isBlockVisibleInViewport = (sectionId: HomeSectionId, blockId: string) => {
        const sectionBlocks = responsiveBlockVisibility?.[sectionId] as Record<string, Partial<Record<HomeResponsiveViewport, boolean>>> | undefined
        const blockVisibility = sectionBlocks?.[blockId]
        if (!blockVisibility) return true
        return blockVisibility[viewport] !== false
    }
    const getBlockStyleStringInViewport = (
        sectionId: 'services' | 'products' | 'frameworks' | 'contact',
        blockId: string,
        prop: string,
        fallback: string
    ) => {
        const raw = (responsiveBlockStyles as any)?.[sectionId]?.[blockId]?.[prop]?.[viewport]
        return typeof raw === 'string' ? raw : fallback
    }
    const normalizeBlockOrder = <T extends string>(raw: unknown, fallback: readonly T[]): T[] => {
        const valid = new Set(fallback)
        const fromRaw = Array.isArray(raw) ? raw.filter((value): value is T => typeof value === 'string' && valid.has(value as T)) : []
        const unique = [...new Set(fromRaw)]
        for (const value of fallback) {
            if (!unique.includes(value)) unique.push(value)
        }
        return unique as T[]
    }
    const getBlockOrder = <T extends string>(sectionId: 'services' | 'products' | 'frameworks' | 'contact', fallback: readonly T[]) =>
        normalizeBlockOrder((responsiveBlockOrder as any)?.[sectionId], fallback)

    const sectionRenderers: Record<HomeSectionId, () => ReactElement> = {
        hero: () => (
            <div id="inicio" data-track-section="home-hero">
                <Hero viewport={viewport} />
            </div>
        ),
        services: () => (
            <div id="servicios" data-track-section="home-servicios">
                <Services visibleBlocks={{
                    header: isBlockVisibleInViewport('services', 'header'),
                    grid: isBlockVisibleInViewport('services', 'grid'),
                }} blockOrder={getBlockOrder('services', ['header', 'grid'])} viewport={viewport} styleOverrides={{
                    header: {
                        titleSizeRem: getBlockStyleStringInViewport('services', 'header', 'titleSizeRem', viewport === 'desktop' ? '4.5rem' : viewport === 'tablet' ? '4rem' : '3rem'),
                    },
                    grid: {
                        columns: getBlockStyleStringInViewport('services', 'grid', 'columns', viewport === 'desktop' ? '3' : viewport === 'tablet' ? '2' : '1'),
                        itemLimit: getBlockStyleStringInViewport('services', 'grid', 'itemLimit', viewport === 'desktop' ? '6' : viewport === 'tablet' ? '6' : '4'),
                    },
                }} />
            </div>
        ),
        products: () => (
            <div id="productos" data-track-section="home-productos">
                <Products visibleBlocks={{
                    header: isBlockVisibleInViewport('products', 'header'),
                    cards: isBlockVisibleInViewport('products', 'cards'),
                }} blockOrder={getBlockOrder('products', ['header', 'cards'])} viewport={viewport} styleOverrides={{
                    header: {
                        titleSizeRem: getBlockStyleStringInViewport('products', 'header', 'titleSizeRem', viewport === 'desktop' ? '4.5rem' : viewport === 'tablet' ? '4rem' : '3rem'),
                    },
                    cards: {
                        columns: getBlockStyleStringInViewport('products', 'cards', 'columns', viewport === 'desktop' ? '3' : viewport === 'tablet' ? '2' : '1'),
                        itemLimit: getBlockStyleStringInViewport('products', 'cards', 'itemLimit', viewport === 'desktop' ? '3' : viewport === 'tablet' ? '3' : '2'),
                    },
                }} />
            </div>
        ),
        frameworks: () => (
            <div id="confianza" data-track-section="home-confianza">
                <Frameworks visibleBlocks={{
                    header: isBlockVisibleInViewport('frameworks', 'header'),
                    items: isBlockVisibleInViewport('frameworks', 'items'),
                }} blockOrder={getBlockOrder('frameworks', ['header', 'items'])} viewport={viewport} styleOverrides={{
                    header: {
                        titleSizeRem: getBlockStyleStringInViewport('frameworks', 'header', 'titleSizeRem', viewport === 'desktop' ? '4.5rem' : viewport === 'tablet' ? '4rem' : '3rem'),
                    },
                    items: {
                        columns: getBlockStyleStringInViewport('frameworks', 'items', 'columns', viewport === 'desktop' ? '2' : viewport === 'tablet' ? '2' : '1'),
                        itemLimit: getBlockStyleStringInViewport('frameworks', 'items', 'itemLimit', viewport === 'desktop' ? '3' : viewport === 'tablet' ? '3' : '2'),
                    },
                }} />
            </div>
        ),
        contact: () => (
            <div id="contacto" data-track-section="home-contacto">
                <Contact visibleBlocks={{
                    header: isBlockVisibleInViewport('contact', 'header'),
                    channels: isBlockVisibleInViewport('contact', 'channels'),
                    form: isBlockVisibleInViewport('contact', 'form'),
                }} blockOrder={getBlockOrder('contact', ['header', 'channels', 'form'])} viewport={viewport} styleOverrides={{
                    header: {
                        titleSizeRem: getBlockStyleStringInViewport('contact', 'header', 'titleSizeRem', viewport === 'desktop' ? '6rem' : viewport === 'tablet' ? '5rem' : '3.5rem'),
                    },
                    channels: {
                        gapRem: getBlockStyleStringInViewport('contact', 'channels', 'gapRem', viewport === 'desktop' ? '3rem' : viewport === 'tablet' ? '2.5rem' : '2rem'),
                    },
                    form: {
                        layoutMode: getBlockStyleStringInViewport('contact', 'form', 'layoutMode', viewport === 'desktop' ? 'split' : 'stack'),
                    },
                }} />
            </div>
        ),
    }

    return (
        <Layout>
            {sectionOrder.map((sectionId: HomeSectionId) => {
                if (!isVisibleInViewport(sectionId)) return null
                const render = sectionRenderers[sectionId]
                return <Fragment key={sectionId}>{render()}</Fragment>
            })}
        </Layout>
    )
}
