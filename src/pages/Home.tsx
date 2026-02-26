import { Fragment, useEffect, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../sections/Hero/Hero'
import { Services } from '../sections/Services/Services'
import { Products } from '../sections/Products/Products'
import { Frameworks } from '../sections/Frameworks/Frameworks'
import { Contact } from '../sections/Contact/Contact'
import { Layout } from '../components/layout/Layout'
import { useLanguage } from '../context/LanguageContext'
import type { HomeResponsiveViewport, HomeSectionId } from '../admin/context/CMSContext'

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
    const isVisibleInViewport = (sectionId: HomeSectionId) => {
        if (hiddenSections.has(sectionId)) return false
        const sectionVisibility = responsiveVisibility?.[sectionId]
        if (!sectionVisibility) return true
        return sectionVisibility[viewport] !== false
    }

    const sectionRenderers: Record<HomeSectionId, () => ReactElement> = {
        hero: () => (
            <div id="inicio" data-track-section="home-hero">
                <Hero viewport={viewport} />
            </div>
        ),
        services: () => (
            <div id="servicios" data-track-section="home-servicios">
                <Services />
            </div>
        ),
        products: () => (
            <div id="productos" data-track-section="home-productos">
                <Products />
            </div>
        ),
        frameworks: () => (
            <div id="confianza" data-track-section="home-confianza">
                <Frameworks />
            </div>
        ),
        contact: () => (
            <div id="contacto" data-track-section="home-contacto">
                <Contact />
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
