/**
 * CMSContext — Runtime in-memory CMS store backed by localStorage.
 * Includes design tokens that are injected as CSS custom properties.
 */

import {
    createContext, useContext, useState, useCallback, useEffect, useRef,
    type ReactNode,
} from 'react'
import { servicesDetail, productsDetail } from '../../data/details'
import { content as defaultContent } from '../../data/content'
import { siteConfig as defaultSiteConfig } from '../../data/config'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ServiceItem = {
    slug: string
    title: string
    highlight: string
    subtitle: string
    description: string
    descriptionLong: string
    ctaPrimary: string
    ctaSecondary: string
    seoTitle: string
    seoDescription: string
    features: string[]
    icon?: any
    outcomes?: string[]
    variants?: Array<{
        tone: string
        titular: string
        rationale?: string
    }>
    tracking?: string
    ctaVariants?: Array<{
        original: string
        alt: string[]
    }>
    abHypothesis?: string
    visualConfig?: Record<string, any>
    visualStyle?: Record<string, any>
}

export type ProductItem = {
    slug: string
    title: string
    highlight: string
    description: string
    descriptionLong: string
    price: string
    ctaText: string
    seoTitle: string
    seoDescription: string
    icon?: any
    variants?: Array<{
        tone: string
        titular: string
    }>
}

export type HeroContent = {
    title: string
    subtitle: string
    highlight: string
    cta: string
    secondaryCta: string
}

export type HomeSectionId = 'hero' | 'services' | 'products' | 'frameworks' | 'contact'
export const HOME_SECTION_IDS: HomeSectionId[] = ['hero', 'services', 'products', 'frameworks', 'contact']
export type HomeResponsiveViewport = 'desktop' | 'tablet' | 'mobile'
export const HOME_RESPONSIVE_VIEWPORTS: HomeResponsiveViewport[] = ['desktop', 'tablet', 'mobile']
export type HomeSectionVisibility = Record<HomeResponsiveViewport, boolean>
export type HomeBlockVisibilityMap = {
    hero: Record<'headline' | 'ctas' | 'stats', HomeSectionVisibility>
    services: Record<'header' | 'grid', HomeSectionVisibility>
    products: Record<'header' | 'cards', HomeSectionVisibility>
    frameworks: Record<'header' | 'items', HomeSectionVisibility>
    contact: Record<'header' | 'channels' | 'form', HomeSectionVisibility>
}
export const HOME_SECTION_BLOCK_IDS: { [K in HomeSectionId]: Array<keyof HomeBlockVisibilityMap[K]> } = {
    hero: ['headline', 'ctas', 'stats'],
    services: ['header', 'grid'],
    products: ['header', 'cards'],
    frameworks: ['header', 'items'],
    contact: ['header', 'channels', 'form'],
}
export type HomeResponsiveStringMap = Record<HomeResponsiveViewport, string>
export type HomeBlockStyleOverrides = {
    services: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        grid: { columns: HomeResponsiveStringMap }
    }
    products: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        cards: { columns: HomeResponsiveStringMap }
    }
    frameworks: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        items: { columns: HomeResponsiveStringMap }
    }
    contact: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        channels: { gapRem: HomeResponsiveStringMap }
        form: { layoutMode: HomeResponsiveStringMap }
    }
}

export type HomePageContent = {
    layout: {
        sectionOrder: HomeSectionId[]
        hiddenSections: HomeSectionId[]
        sectionVisibility: Record<HomeSectionId, HomeSectionVisibility>
        blockVisibility: HomeBlockVisibilityMap
        blockStyleOverrides: HomeBlockStyleOverrides
    }
    hero: {
        stats: Array<{ label: string; value: string }>
        style: {
            backgroundColor: string
            backgroundImageUrl: string
            rightPanelBackgroundColor: string
            rightPanelBackgroundImageUrl: string
            sectionOverlayColor: string
            sectionOverlayOpacity: string
            rightPanelOverlayColor: string
            rightPanelOverlayOpacity: string
            titleColor: string
            titleAccentColor: string
            subtitleColor: string
            highlightColor: string
            titleFontSizeMobile: string
            titleFontSizeTablet: string
            titleFontSizeDesktop: string
            subtitleFontSizeMobile: string
            subtitleFontSizeTablet: string
            subtitleFontSizeDesktop: string
            ctaGapMobile: string
            ctaGapTablet: string
            ctaGapDesktop: string
            ctaStackMobile: string
            ctaStackTablet: string
            ctaStackDesktop: string
            titleFontWeight: string
            subtitleFontWeight: string
            titleLineHeight: string
            statsLabelColor: string
            statsValueColor: string
            statsDividerColor: string
            statsPanelBorderColor: string
        }
    }
    servicesSection: {
        eyebrow: string
        title: string
        subtitle: string
        sectionNumber: string
        style: { backgroundColor: string; backgroundImageUrl: string }
    }
    productsSection: {
        eyebrow: string
        title: string
        subtitle: string
        availabilityPricingLabel: string
        deploySolutionLabel: string
        style: { backgroundColor: string; backgroundImageUrl: string }
    }
    frameworksSection: {
        eyebrow: string
        title: string
        subtitle: string
        items: Array<{ organization: string; name: string; description: string }>
        style: { backgroundColor: string; backgroundImageUrl: string; overlayOpacity: string }
    }
    contactSection: {
        eyebrow: string
        titlePrefix: string
        titleAccent: string
        labels: {
            officialChannel: string
            hubHq: string
            corporateNetwork: string
            linkedinProtocol: string
        }
        style: {
            backgroundColor: string
            backgroundImageUrl: string
            formOuterBackgroundColor: string
            formOuterBackgroundImageUrl: string
            formInnerBackgroundColor: string
        }
    }
}

export type SiteConfig = {
    name: string
    description: string
    url: string
    contactEmail: string
    contactAddress: string
    linkedin: string
    twitter: string
    dataPolicyEnabled: string
    dataPolicyVersion: string
    dataPolicyTitle: string
    dataPolicySummary: string
    dataPolicyContent: string
    dataPolicyLinkLabel: string
    dataPolicyAcceptLabel: string
    dataPolicyRejectLabel: string
}

export type DesignTokens = {
    // Colors (hex format for color inputs, converted to oklch at runtime)
    colorPrimary: string       // brand-primary: deep tech blue
    colorSecondary: string     // brand-secondary: action blue
    colorSurface: string       // brand-surface: tinted background
    colorAccent: string        // accent highlight (gradient, selections)

    // Typography
    fontBody: string           // body font family
    fontDisplay: string        // display/heading font family

    // Layout
    borderRadius: string       // 'none' | 'sm' | 'md' | 'lg' | 'full'
    buttonStyle: string        // 'sharp' | 'rounded' | 'pill'
    buttonPrimaryTextColor: string
    buttonPrimaryHoverTextColor: string
    buttonPrimaryHoverBgColor: string
    buttonOutlineTextColor: string
    buttonOutlineBorderColor: string
    buttonOutlineHoverTextColor: string
    buttonOutlineHoverBorderColor: string
    buttonOutlineHoverBgColor: string
    gridOpacity: string        // infra-grid opacity string

    // Dark panel color (hero card, service page sidebar)
    colorDark: string

    // Brand assets
    logoMode: string           // 'text' | 'image'
    logoUrl: string
    logoFooterUrl: string
    logoAlt: string
    faviconUrl: string

    // Global loader
    loaderEnabled: string      // 'true' | 'false'
    loaderBackgroundColor: string
    loaderAccentColor: string
    loaderTextColor: string
    loaderLogoUrl: string
    loaderLabel: string
    loaderDurationMs: string
}

export type CMSState = {
    services: ServiceItem[]
    products: ProductItem[]
    hero: HeroContent
    site: SiteConfig
    design: DesignTokens
    homePage: HomePageContent
}

export type CmsSaveStatus =
    | 'hydrating'
    | 'idle'
    | 'draft'
    | 'saving'
    | 'retrying'
    | 'saved'
    | 'error'

export type CmsVersionEntry = {
    id: string
    section: string
    createdAt: string
    createdBy?: string | null
    note?: string | null
}

export type CmsAuditEntry = {
    id: string
    action: string
    resource: string
    section?: string | null
    actorUsername?: string | null
    actorRole?: string | null
    createdAt: string
    metadata?: any
}

export type CmsPersistenceState = {
    status: CmsSaveStatus
    pendingChanges: boolean
    autosaveEnabled: boolean
    retryCount: number
    lastSavedAt: string | null
    lastError: string | null
    changedSections: string[]
    historyLoading: boolean
    history: CmsVersionEntry[]
    audit: CmsAuditEntry[]
}

// ─── Default Design Tokens ────────────────────────────────────────────────────

export const defaultDesign: DesignTokens = {
    colorPrimary: '#1a2d5a',     // Deep navy
    colorSecondary: '#2563eb',   // Electric blue (Tailwind blue-600)
    colorSurface: '#f8faff',     // Ultra-light blue-tinted white
    colorAccent: '#3b82f6',      // Tailwind blue-500
    colorDark: '#0f172a',        // Slate-900 (dark panels)

    fontBody: 'Inter',
    fontDisplay: 'Inter',

    borderRadius: 'none',
    buttonStyle: 'sharp',
    buttonPrimaryTextColor: '#ffffff',
    buttonPrimaryHoverTextColor: '#ffffff',
    buttonPrimaryHoverBgColor: '#0f172a',
    buttonOutlineTextColor: '#ffffff',
    buttonOutlineBorderColor: '#ffffff',
    buttonOutlineHoverTextColor: '#2563eb',
    buttonOutlineHoverBorderColor: '#2563eb',
    buttonOutlineHoverBgColor: 'transparent',
    gridOpacity: '0.03',

    logoMode: 'text',
    logoUrl: '',
    logoFooterUrl: '',
    logoAlt: 'AlgoritmoT',
    faviconUrl: '',

    loaderEnabled: 'false',
    loaderBackgroundColor: '#0f172a',
    loaderAccentColor: '#2563eb',
    loaderTextColor: '#ffffff',
    loaderLogoUrl: '',
    loaderLabel: 'Cargando experiencia',
    loaderDurationMs: '900',
}

// ─── CSS Injection ────────────────────────────────────────────────────────────


export function injectDesignTokens(tokens: DesignTokens) {
    const root = document.documentElement

    // Override Tailwind v4 color tokens
    // Tailwind reads --color-brand-* so we set them directly
    root.style.setProperty('--color-brand-primary', tokens.colorPrimary)
    root.style.setProperty('--color-brand-secondary', tokens.colorSecondary)
    root.style.setProperty('--color-brand-surface', tokens.colorSurface)

    // Font overrides
    root.style.setProperty('--font-sans', `"${tokens.fontBody}", system-ui, sans-serif`)
    root.style.setProperty('--font-display', `"${tokens.fontDisplay}", serif`)

    // Border-radius mapping
    const radii: Record<string, string> = {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
    }
    root.style.setProperty('--cms-radius', radii[tokens.borderRadius] ?? '0px')

    // Dark panel
    root.style.setProperty('--cms-dark', tokens.colorDark)

    // Grid opacity
    root.style.setProperty('--cms-grid-opacity', tokens.gridOpacity)
    root.style.setProperty('--cms-button-primary-text', tokens.buttonPrimaryTextColor || '#ffffff')
    root.style.setProperty('--cms-button-primary-hover-text', tokens.buttonPrimaryHoverTextColor || '#ffffff')
    root.style.setProperty('--cms-button-primary-hover-bg', tokens.buttonPrimaryHoverBgColor || '#0f172a')
    root.style.setProperty('--cms-button-outline-text', tokens.buttonOutlineTextColor || '#ffffff')
    root.style.setProperty('--cms-button-outline-border', tokens.buttonOutlineBorderColor || '#e2e8f0')
    root.style.setProperty('--cms-button-outline-hover-text', tokens.buttonOutlineHoverTextColor || '#2563eb')
    root.style.setProperty('--cms-button-outline-hover-border', tokens.buttonOutlineHoverBorderColor || '#2563eb')
    root.style.setProperty('--cms-button-outline-hover-bg', tokens.buttonOutlineHoverBgColor || 'transparent')

    // Loader tokens
    root.style.setProperty('--cms-loader-bg', tokens.loaderBackgroundColor || '#0f172a')
    root.style.setProperty('--cms-loader-accent', tokens.loaderAccentColor || '#2563eb')
    root.style.setProperty('--cms-loader-text', tokens.loaderTextColor || '#ffffff')

    // Load Google Font dynamically
    const fontFamily = tokens.fontBody
    const existingLink = document.getElementById('cms-font-link')
    if (existingLink) existingLink.remove()

    const builtInFonts = ['Inter', 'system-ui']
    if (!builtInFonts.includes(fontFamily)) {
        const link = document.createElement('link')
        link.id = 'cms-font-link'
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;600;700;900&display=swap`
        document.head.appendChild(link)
    }

    // Favicon update (live)
    if (typeof document !== 'undefined' && tokens.faviconUrl) {
        let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (!favicon) {
            favicon = document.createElement('link')
            favicon.rel = 'icon'
            document.head.appendChild(favicon)
        }
        favicon.href = tokens.faviconUrl
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'algoritmot_cms_v1'

function loadFromStorage(): Partial<CMSState> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveToStorage(state: CMSState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { }
}

// ─── Initial state from static data ──────────────────────────────────────────

const staticServices: ServiceItem[] = servicesDetail.map(s => ({
    slug: s.slug,
    title: s.title,
    highlight: s.highlight,
    subtitle: s.subtitle,
    description: s.description,
    descriptionLong: s.descriptionLong,
    ctaPrimary: s.ctaPrimary,
    ctaSecondary: s.ctaSecondary ?? '',
    seoTitle: s.seoTitle ?? '',
    seoDescription: s.seoDescription ?? '',
    features: s.features,
    icon: s.icon,
    outcomes: (s as any).outcomes,
    variants: (s as any).variants,
    tracking: (s as any).tracking,
    ctaVariants: (s as any).ctaVariants,
    abHypothesis: (s as any).abHypothesis,
    visualConfig: (s as any).visualConfig,
    visualStyle: (s as any).visualStyle,
}))

const staticProducts: ProductItem[] = productsDetail.map(p => ({
    slug: p.slug,
    title: p.title,
    highlight: p.highlight,
    description: p.description,
    descriptionLong: p.descriptionLong ?? '',
    price: p.price ?? '',
    ctaText: p.ctaText ?? '',
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    icon: p.icon,
    variants: (p as any).variants,
}))

const staticHero: HeroContent = { ...defaultContent.hero }

const staticHomePage: HomePageContent = {
    layout: {
        sectionOrder: [...HOME_SECTION_IDS],
        hiddenSections: [],
        sectionVisibility: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, { desktop: true, tablet: true, mobile: true }])) as Record<HomeSectionId, HomeSectionVisibility>,
        blockVisibility: Object.fromEntries(
            HOME_SECTION_IDS.map((sectionId) => [
                sectionId,
                Object.fromEntries(
                    HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [blockId, { desktop: true, tablet: true, mobile: true }])
                ),
            ])
        ) as HomeBlockVisibilityMap,
        blockStyleOverrides: {
            services: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                grid: { columns: { mobile: '1', tablet: '2', desktop: '3' } },
            },
            products: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                cards: { columns: { mobile: '1', tablet: '2', desktop: '3' } },
            },
            frameworks: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                items: { columns: { mobile: '1', tablet: '2', desktop: '2' } },
            },
            contact: {
                header: { titleSizeRem: { mobile: '3.5rem', tablet: '5rem', desktop: '6rem' } },
                channels: { gapRem: { mobile: '2rem', tablet: '2.5rem', desktop: '3rem' } },
                form: { layoutMode: { mobile: 'stack', tablet: 'stack', desktop: 'split' } },
            },
        },
    },
    hero: {
        stats: [
            { label: 'Stability', value: '99.9%' },
            { label: 'Performance', value: 'High-Tier' },
            { label: 'Standard', value: 'ISO 9241' },
        ],
        style: {
            backgroundColor: '#ffffff',
            backgroundImageUrl: '',
            rightPanelBackgroundColor: '#ffffff',
            rightPanelBackgroundImageUrl: '',
            sectionOverlayColor: '#ffffff',
            sectionOverlayOpacity: '0.92',
            rightPanelOverlayColor: '#ffffff',
            rightPanelOverlayOpacity: '0.90',
            titleColor: '#0f172a',
            titleAccentColor: '#2563eb',
            subtitleColor: '#64748b',
            highlightColor: '#1a2d5a',
            titleFontSizeMobile: '4.5rem',
            titleFontSizeTablet: '6rem',
            titleFontSizeDesktop: '8rem',
            subtitleFontSizeMobile: '1.5rem',
            subtitleFontSizeTablet: '1.75rem',
            subtitleFontSizeDesktop: '1.875rem',
            ctaGapMobile: '1rem',
            ctaGapTablet: '1rem',
            ctaGapDesktop: '1rem',
            ctaStackMobile: 'true',
            ctaStackTablet: 'false',
            ctaStackDesktop: 'false',
            titleFontWeight: '900',
            subtitleFontWeight: '500',
            titleLineHeight: '0.85',
            statsLabelColor: '#94a3b8',
            statsValueColor: '#0f172a',
            statsDividerColor: '#e2e8f0',
            statsPanelBorderColor: '#cbd5e1',
        },
    },
    servicesSection: {
        eyebrow: 'Infrastructure & Operations',
        title: 'Portafolio de Servicios Digitales',
        subtitle: 'Nuestro método sistemático para capturar valor y asegurar la adopción real.',
        sectionNumber: '01',
        style: { backgroundColor: '#f8fafc', backgroundImageUrl: '' },
    },
    productsSection: {
        eyebrow: 'Performance Modules',
        title: 'Performance Modules',
        subtitle: 'Soluciones sistematizadas para resultados predecibles y escalables.',
        availabilityPricingLabel: 'Availability & Pricing',
        deploySolutionLabel: 'Deploy Solution',
        style: { backgroundColor: '#ffffff', backgroundImageUrl: '' },
    },
    frameworksSection: {
        eyebrow: 'Compliance & Standards',
        title: defaultContent.frameworks.title,
        subtitle: 'Alineamos cada despliegue con los marcos de trabajo globales más exigentes para garantizar resiliencia y adopción.',
        items: defaultContent.frameworks.items.map((item) => ({
            organization: item.organization,
            name: item.name,
            description: item.description,
        })),
        style: { backgroundColor: '#0f172a', backgroundImageUrl: '', overlayOpacity: '0.10' },
    },
    contactSection: {
        eyebrow: 'System Access',
        titlePrefix: 'Iniciemos el',
        titleAccent: 'Despliegue',
        labels: {
            officialChannel: 'Official Channel',
            hubHq: 'Hub HQ',
            corporateNetwork: 'Corporate Network',
            linkedinProtocol: 'LinkedIn Protocol',
        },
        style: {
            backgroundColor: '#ffffff',
            backgroundImageUrl: '',
            formOuterBackgroundColor: '#ffffff',
            formOuterBackgroundImageUrl: '',
            formInnerBackgroundColor: '#ffffff',
        },
    },
}

const staticSite: SiteConfig = {
    name: defaultSiteConfig.name,
    description: defaultSiteConfig.description,
    url: defaultSiteConfig.url,
    contactEmail: defaultSiteConfig.contact.email,
    contactAddress: defaultSiteConfig.contact.address,
    linkedin: defaultSiteConfig.links.linkedin,
    twitter: defaultSiteConfig.links.twitter,
    dataPolicyEnabled: 'true',
    dataPolicyVersion: 'v1',
    dataPolicyTitle: 'Política de tratamiento de datos',
    dataPolicySummary: 'Usamos cookies y analítica de navegación para mejorar la experiencia, medir interacción y optimizar el contenido del sitio. Puedes consultar el detalle de tratamiento y aceptar para continuar con analítica.',
    dataPolicyContent: `En AlgoritmoT tratamos datos de navegación con fines de analítica, mejora continua del servicio, seguridad y optimización de la experiencia digital.\n\nDatos que podemos registrar tras tu aceptación:\n- Ubicación geográfica aproximada (país, región, ciudad) inferida por IP.\n- Páginas y secciones consultadas.\n- Tiempo de permanencia aproximado por página.\n- Eventos de interacción técnica para analítica operativa.\n\nNo utilizamos esta información para decisiones automatizadas sobre el usuario final. Los datos se almacenan en infraestructura de servidor y base de datos asociada al sitio para fines de trazabilidad y analítica agregada.\n\nPuedes revocar o limpiar este consentimiento borrando los datos locales del navegador y dejando de usar el sitio.`,
    dataPolicyLinkLabel: 'Leer política',
    dataPolicyAcceptLabel: 'Aceptar',
    dataPolicyRejectLabel: 'Continuar sin analítica',
}

function buildInitialState(): CMSState {
    try {
        return normalizeCMSState(loadFromStorage())
    } catch (error) {
        console.warn('Invalid local CMS snapshot, using static defaults.', error)
        return normalizeCMSState({})
    }
}

function normalizeCMSState(stored: Partial<CMSState> = {}): CMSState {
    const rawServices = Array.isArray(stored.services) ? stored.services : staticServices
    const rawProducts = Array.isArray(stored.products) ? stored.products : staticProducts
    const hero = stored.hero && typeof stored.hero === 'object' ? stored.hero : staticHero
    const site = stored.site && typeof stored.site === 'object' ? stored.site : staticSite
    const design = stored.design && typeof stored.design === 'object' ? stored.design : defaultDesign
    const homePage = stored.homePage && typeof stored.homePage === 'object' ? stored.homePage : staticHomePage
    const rawLayout = (homePage as any)?.layout ?? {}
    const validHomeSectionIds = new Set(HOME_SECTION_IDS)
    const rawSectionOrder = Array.isArray(rawLayout.sectionOrder) ? rawLayout.sectionOrder.filter((id: any) => validHomeSectionIds.has(id)) : []
    const sectionOrder = [...new Set([...rawSectionOrder, ...HOME_SECTION_IDS])]
    const hiddenSections = Array.isArray(rawLayout.hiddenSections)
        ? [...new Set(rawLayout.hiddenSections.filter((id: any) => validHomeSectionIds.has(id)))]
        : []
    const sectionVisibility = HOME_SECTION_IDS.reduce((acc, id) => {
        const rawSection = rawLayout.sectionVisibility && typeof rawLayout.sectionVisibility === 'object'
            ? (rawLayout.sectionVisibility as any)[id]
            : undefined
        acc[id] = {
            desktop: typeof rawSection?.desktop === 'boolean' ? rawSection.desktop : true,
            tablet: typeof rawSection?.tablet === 'boolean' ? rawSection.tablet : true,
            mobile: typeof rawSection?.mobile === 'boolean' ? rawSection.mobile : true,
        }
        return acc
    }, {} as Record<HomeSectionId, HomeSectionVisibility>)
    const blockVisibility = HOME_SECTION_IDS.reduce((acc, sectionId) => {
        const rawSectionBlocks = rawLayout.blockVisibility && typeof rawLayout.blockVisibility === 'object'
            ? (rawLayout.blockVisibility as any)[sectionId]
            : undefined
        acc[sectionId] = Object.fromEntries(
            HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => {
                const rawBlock = rawSectionBlocks && typeof rawSectionBlocks === 'object' ? rawSectionBlocks[blockId] : undefined
                return [
                    blockId,
                    {
                        desktop: typeof rawBlock?.desktop === 'boolean' ? rawBlock.desktop : true,
                        tablet: typeof rawBlock?.tablet === 'boolean' ? rawBlock.tablet : true,
                        mobile: typeof rawBlock?.mobile === 'boolean' ? rawBlock.mobile : true,
                    },
                ]
            })
        ) as any
        return acc
    }, {} as HomeBlockVisibilityMap)
    const blockStyleOverrides = {
        services: {
            header: {
                titleSizeRem: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.services?.header?.titleSizeRem?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.services.header.titleSizeRem[viewport]
                        : staticHomePage.layout.blockStyleOverrides.services.header.titleSizeRem[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
            grid: {
                columns: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.services?.grid?.columns?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.services.grid.columns[viewport]
                        : staticHomePage.layout.blockStyleOverrides.services.grid.columns[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
        },
        products: {
            header: {
                titleSizeRem: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.products?.header?.titleSizeRem?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.products.header.titleSizeRem[viewport]
                        : staticHomePage.layout.blockStyleOverrides.products.header.titleSizeRem[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
            cards: {
                columns: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.products?.cards?.columns?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.products.cards.columns[viewport]
                        : staticHomePage.layout.blockStyleOverrides.products.cards.columns[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
        },
        frameworks: {
            header: {
                titleSizeRem: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.frameworks?.header?.titleSizeRem?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.frameworks.header.titleSizeRem[viewport]
                        : staticHomePage.layout.blockStyleOverrides.frameworks.header.titleSizeRem[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
            items: {
                columns: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.frameworks?.items?.columns?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.frameworks.items.columns[viewport]
                        : staticHomePage.layout.blockStyleOverrides.frameworks.items.columns[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
        },
        contact: {
            header: {
                titleSizeRem: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.contact?.header?.titleSizeRem?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.contact.header.titleSizeRem[viewport]
                        : staticHomePage.layout.blockStyleOverrides.contact.header.titleSizeRem[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
            channels: {
                gapRem: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.contact?.channels?.gapRem?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.contact.channels.gapRem[viewport]
                        : staticHomePage.layout.blockStyleOverrides.contact.channels.gapRem[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
            form: {
                layoutMode: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.contact?.form?.layoutMode?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.contact.form.layoutMode[viewport]
                        : staticHomePage.layout.blockStyleOverrides.contact.form.layoutMode[viewport]
                    return acc
                }, {} as HomeResponsiveStringMap),
            },
        },
    } as HomeBlockStyleOverrides

    const services = rawServices.map((service) => {
        const staticMatch = staticServices.find(s => s.slug === service.slug)
        return {
            ...(staticMatch ?? {}),
            ...service,
            icon: staticMatch?.icon,
        }
    })
    const products = rawProducts.map((product) => {
        const staticMatch = staticProducts.find(p => p.slug === product.slug)
        return {
            ...(staticMatch ?? {}),
            ...product,
            icon: staticMatch?.icon,
        }
    })
    return {
        services,
        products,
        hero: { ...staticHero, ...hero },
        site: { ...staticSite, ...site },
        design: { ...defaultDesign, ...design },
        homePage: {
            ...staticHomePage,
            ...(homePage as any),
            layout: {
                ...staticHomePage.layout,
                ...(rawLayout || {}),
                sectionOrder: sectionOrder as HomeSectionId[],
                hiddenSections: hiddenSections as HomeSectionId[],
                sectionVisibility,
                blockVisibility,
                blockStyleOverrides,
            },
            hero: {
                ...staticHomePage.hero,
                ...((homePage as any).hero ?? {}),
                stats: Array.isArray((homePage as any).hero?.stats)
                    ? (homePage as any).hero.stats.map((s: any, i: number) => ({ ...(staticHomePage.hero.stats[i] ?? { label: '', value: '' }), ...s }))
                    : staticHomePage.hero.stats.map((s) => ({ ...s })),
                style: { ...staticHomePage.hero.style, ...((homePage as any).hero?.style ?? {}) },
            },
            servicesSection: {
                ...staticHomePage.servicesSection,
                ...((homePage as any).servicesSection ?? {}),
                style: { ...staticHomePage.servicesSection.style, ...((homePage as any).servicesSection?.style ?? {}) },
            },
            productsSection: {
                ...staticHomePage.productsSection,
                ...((homePage as any).productsSection ?? {}),
                style: { ...staticHomePage.productsSection.style, ...((homePage as any).productsSection?.style ?? {}) },
            },
            frameworksSection: {
                ...staticHomePage.frameworksSection,
                ...((homePage as any).frameworksSection ?? {}),
                items: Array.isArray((homePage as any).frameworksSection?.items)
                    ? (homePage as any).frameworksSection.items.map((it: any, i: number) => ({ ...(staticHomePage.frameworksSection.items[i] ?? { organization: '', name: '', description: '' }), ...it }))
                    : staticHomePage.frameworksSection.items.map((it) => ({ ...it })),
                style: { ...staticHomePage.frameworksSection.style, ...((homePage as any).frameworksSection?.style ?? {}) },
            },
            contactSection: {
                ...staticHomePage.contactSection,
                ...((homePage as any).contactSection ?? {}),
                labels: { ...staticHomePage.contactSection.labels, ...((homePage as any).contactSection?.labels ?? {}) },
                style: { ...staticHomePage.contactSection.style, ...((homePage as any).contactSection?.style ?? {}) },
            },
        },
    }
}

function stateHash(state: CMSState): string {
    try {
        return JSON.stringify({
            hero: state.hero,
            services: state.services,
            products: state.products,
            site: state.site,
            design: state.design,
            homePage: state.homePage,
        })
    } catch {
        return String(Date.now())
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type CMSContextType = {
    state: CMSState
    persistence: CmsPersistenceState
    refreshHistory: () => Promise<void>
    rollbackSection: (versionId: string) => Promise<{ ok: boolean; error?: string }>

    updateService: (slug: string, data: Partial<ServiceItem>) => void
    addService: (data: ServiceItem) => void
    deleteService: (slug: string) => void

    updateProduct: (slug: string, data: Partial<ProductItem>) => void
    addProduct: (data: ProductItem) => void
    deleteProduct: (slug: string) => void

    updateHero: (data: Partial<HeroContent>) => void
    updateSite: (data: Partial<SiteConfig>) => void
    updateDesign: (data: Partial<DesignTokens>) => void
    updateHomePage: (data: Partial<HomePageContent>) => void
    resetDesign: () => void

    resetToDefaults: () => void
}

const CMSContext = createContext<CMSContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CMSProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CMSState>(buildInitialState)
    const [serverSyncReady, setServerSyncReady] = useState(false)
    const [persistence, setPersistence] = useState<CmsPersistenceState>({
        status: 'hydrating',
        pendingChanges: false,
        autosaveEnabled: true,
        retryCount: 0,
        lastSavedAt: null,
        lastError: null,
        changedSections: [],
        historyLoading: false,
        history: [],
        audit: [],
    })
    const hydratedFromServer = useRef(false)
    const lastServerHash = useRef('')
    const lastServerStateRef = useRef<CMSState>(buildInitialState())
    const saveTimerRef = useRef<number | null>(null)
    const saveInFlightRef = useRef(false)
    const retryTimerRef = useRef<number | null>(null)
    const queuedHashRef = useRef<string | null>(null)

    // Inject design tokens on mount and whenever they change
    useEffect(() => {
        injectDesignTokens(state.design)
    }, [state.design])

    useEffect(() => {
        let cancelled = false

        const hydrate = async () => {
            try {
                const res = await fetch('/api/cms')
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                const next = normalizeCMSState(json?.data ?? {})
                if (cancelled) return
                lastServerHash.current = stateHash(next)
                lastServerStateRef.current = next
                hydratedFromServer.current = true
                setServerSyncReady(true)
                setPersistence(prev => ({ ...prev, status: 'idle', pendingChanges: false, retryCount: 0, lastError: null }))
                setState(next)
                saveToStorage(next)
            } catch (error) {
                hydratedFromServer.current = true
                setServerSyncReady(true)
                try {
                    const local = normalizeCMSState(loadFromStorage())
                    lastServerHash.current = stateHash(local)
                    lastServerStateRef.current = local
                    setState(local)
                } catch {
                    // ignore invalid local cache
                }
                setPersistence(prev => ({ ...prev, status: 'error', pendingChanges: false, lastError: 'No se pudo conectar a /api/cms (modo cache local)' }))
                console.warn('CMS server sync unavailable, using local snapshot cache.', error)
            }
        }

        void hydrate()
        return () => { cancelled = true }
    }, [])

    const getChangedSections = useCallback((base: CMSState, next: CMSState) => {
        const sections: Array<keyof CMSState> = ['hero', 'services', 'products', 'site', 'design', 'homePage']
        return sections.filter((section) => {
            try {
                return JSON.stringify((base as any)[section]) !== JSON.stringify((next as any)[section])
            } catch {
                return true
            }
        }).map(String)
    }, [])

    const refreshHistory = useCallback(async () => {
        setPersistence(prev => ({ ...prev, historyLoading: true }))
        try {
            const res = await fetch('/api/cms?history=1&limit=25', { credentials: 'include' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            setPersistence(prev => ({
                ...prev,
                historyLoading: false,
                history: (json?.versions ?? []) as CmsVersionEntry[],
                audit: (json?.audits ?? []) as CmsAuditEntry[],
            }))
        } catch (e: any) {
            setPersistence(prev => ({ ...prev, historyLoading: false, lastError: prev.lastError ?? (e?.message || 'No se pudo cargar historial CMS') }))
        }
    }, [])

    const syncToServer = useCallback(async (snapshot: CMSState, hash: string, retryCount = 0) => {
        if (saveInFlightRef.current) {
            queuedHashRef.current = hash
            return
        }
        saveInFlightRef.current = true
        setPersistence(prev => ({
            ...prev,
            status: retryCount > 0 ? 'retrying' : 'saving',
            retryCount,
            lastError: null,
        }))
        try {
            const res = await fetch('/api/cms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(snapshot),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.error || `HTTP ${res.status}`)
            }
            const json = await res.json().catch(() => ({}))
            lastServerHash.current = hash
            lastServerStateRef.current = snapshot
            setPersistence(prev => ({
                ...prev,
                status: 'saved',
                pendingChanges: false,
                retryCount: 0,
                lastSavedAt: json?.savedAt || new Date().toISOString(),
                changedSections: Array.isArray(json?.changedSections) ? json.changedSections : prev.changedSections,
                lastError: null,
            }))
            void refreshHistory()
        } catch (error: any) {
            const nextRetry = retryCount + 1
            const shouldRetry = nextRetry <= 3
            setPersistence(prev => ({
                ...prev,
                status: shouldRetry ? 'retrying' : 'error',
                pendingChanges: true,
                retryCount: nextRetry,
                lastError: error?.message || 'Error al guardar en servidor',
            }))
            if (shouldRetry) {
                if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
                retryTimerRef.current = window.setTimeout(() => {
                    void syncToServer(snapshot, hash, nextRetry)
                }, 800 * nextRetry) as unknown as number
            }
        } finally {
            saveInFlightRef.current = false
            if (queuedHashRef.current && queuedHashRef.current !== hash) {
                const latestHash = stateHash(stateRef.current)
                queuedHashRef.current = null
                void syncToServer(stateRef.current, latestHash, 0)
            }
        }
    }, [refreshHistory])

    const stateRef = useRef(state)
    useEffect(() => {
        stateRef.current = state
    }, [state])

    useEffect(() => {
        if (!serverSyncReady || !hydratedFromServer.current) return
        const hash = stateHash(state)
        const hasChanges = hash !== lastServerHash.current
        const changedSections = hasChanges ? getChangedSections(lastServerStateRef.current, state) : []

        setPersistence(prev => ({
            ...prev,
            status: hasChanges ? (prev.status === 'saving' || prev.status === 'retrying' ? prev.status : 'draft') : (prev.status === 'error' ? 'error' : 'idle'),
            pendingChanges: hasChanges,
            changedSections: hasChanges ? changedSections : [],
        }))

        if (!hasChanges) return
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = window.setTimeout(() => {
            void syncToServer(state, hash, 0)
        }, 800) as unknown as number

        return () => {
            if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
        }
    }, [serverSyncReady, state, getChangedSections, syncToServer])

    useEffect(() => {
        if (!serverSyncReady) return

        const interval = window.setInterval(async () => {
            if (document.hidden) return
            try {
                const res = await fetch('/api/cms', { credentials: 'include' })
                if (!res.ok) return
                const json = await res.json()
                const next = normalizeCMSState(json?.data ?? {})
                const nextHash = stateHash(next)
                if (nextHash !== lastServerHash.current) {
                    lastServerHash.current = nextHash
                    lastServerStateRef.current = next
                    setState(next)
                    saveToStorage(next)
                }
            } catch {
                // ignore polling errors
            }
        }, 5000)

        return () => window.clearInterval(interval)
    }, [serverSyncReady])

    useEffect(() => {
        if (!serverSyncReady) return
        void refreshHistory()
    }, [serverSyncReady, refreshHistory])

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!persistence.pendingChanges) return
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [persistence.pendingChanges])

    const rollbackSection = useCallback(async (versionId: string) => {
        try {
            setPersistence(prev => ({ ...prev, status: 'saving', lastError: null }))
            const res = await fetch('/api/cms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'rollback', versionId }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
            const nextRes = await fetch('/api/cms', { credentials: 'include' })
            const nextJson = await nextRes.json()
            const next = normalizeCMSState(nextJson?.data ?? {})
            lastServerHash.current = stateHash(next)
            lastServerStateRef.current = next
            setState(next)
            saveToStorage(next)
            setPersistence(prev => ({
                ...prev,
                status: 'saved',
                pendingChanges: false,
                retryCount: 0,
                lastError: null,
                lastSavedAt: new Date().toISOString(),
            }))
            void refreshHistory()
            return { ok: true }
        } catch (e: any) {
            setPersistence(prev => ({ ...prev, status: 'error', lastError: e?.message || 'No se pudo revertir versión' }))
            return { ok: false, error: e?.message || 'No se pudo revertir versión' }
        }
    }, [refreshHistory])

    const persist = useCallback((next: CMSState) => {
        setState(next)
        saveToStorage(next)
    }, [])

    const updateService = useCallback((slug: string, data: Partial<ServiceItem>) => {
        setState(prev => {
            const next = { ...prev, services: prev.services.map(s => s.slug === slug ? { ...s, ...data } : s) }
            saveToStorage(next)
            return next
        })
    }, [])

    const addService = useCallback((data: ServiceItem) => {
        setState(prev => {
            const next = { ...prev, services: [...prev.services, data] }
            saveToStorage(next)
            return next
        })
    }, [])

    const deleteService = useCallback((slug: string) => {
        setState(prev => {
            const next = { ...prev, services: prev.services.filter(s => s.slug !== slug) }
            saveToStorage(next)
            return next
        })
    }, [])

    const updateProduct = useCallback((slug: string, data: Partial<ProductItem>) => {
        setState(prev => {
            const next = { ...prev, products: prev.products.map(p => p.slug === slug ? { ...p, ...data } : p) }
            saveToStorage(next)
            return next
        })
    }, [])

    const addProduct = useCallback((data: ProductItem) => {
        setState(prev => {
            const next = { ...prev, products: [...prev.products, data] }
            saveToStorage(next)
            return next
        })
    }, [])

    const deleteProduct = useCallback((slug: string) => {
        setState(prev => {
            const next = { ...prev, products: prev.products.filter(p => p.slug !== slug) }
            saveToStorage(next)
            return next
        })
    }, [])

    const updateHero = useCallback((data: Partial<HeroContent>) => {
        setState(prev => {
            const next = { ...prev, hero: { ...prev.hero, ...data } }
            saveToStorage(next)
            return next
        })
    }, [])

    const updateSite = useCallback((data: Partial<SiteConfig>) => {
        setState(prev => {
            const next = { ...prev, site: { ...prev.site, ...data } }
            saveToStorage(next)
            return next
        })
    }, [])

    const updateDesign = useCallback((data: Partial<DesignTokens>) => {
        setState(prev => {
            const next = { ...prev, design: { ...prev.design, ...data } }
            saveToStorage(next)
            injectDesignTokens(next.design) // immediate visual feedback
            return next
        })
    }, [])

    const updateHomePage = useCallback((data: Partial<HomePageContent>) => {
        setState(prev => {
            const next = normalizeCMSState({ ...prev, homePage: { ...prev.homePage, ...data } } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const resetToDefaults = useCallback(() => {
        const fresh: CMSState = {
            services: staticServices.map(s => ({ ...s })),
            products: staticProducts.map(p => ({ ...p })),
            hero: staticHero,
            site: staticSite,
            design: defaultDesign,
            homePage: staticHomePage,
        }
        persist(fresh)
        injectDesignTokens(defaultDesign)
    }, [persist])

    const resetDesign = useCallback(() => {
        setState(prev => {
            const next = { ...prev, design: { ...defaultDesign } }
            saveToStorage(next)
            injectDesignTokens(next.design)
            return next
        })
    }, [])

    return (
        <CMSContext.Provider value={{
            state,
            persistence,
            refreshHistory,
            rollbackSection,
            updateService, addService, deleteService,
            updateProduct, addProduct, deleteProduct,
            updateHero, updateSite, updateDesign, updateHomePage,
            resetDesign,
            resetToDefaults,
        }}>
            {children}
        </CMSContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCMS() {
    const ctx = useContext(CMSContext)
    if (!ctx) throw new Error('useCMS must be used within CMSProvider')
    return ctx
}
