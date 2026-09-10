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
import { createHazloTuMismoLandingBlocks, hazloTuMismoLandingPageConfig } from '../../data/hazloTuMismoLanding'
import { DEFAULT_FAVICON_URL } from '../../lib/seo'
import { useLocation } from 'react-router-dom'

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
export type HomeBlockOrderMap = {
    services: Array<'header' | 'grid'>
    products: Array<'header' | 'cards'>
    frameworks: Array<'header' | 'items'>
    contact: Array<'header' | 'channels' | 'form'>
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
        grid: { columns: HomeResponsiveStringMap; itemLimit: HomeResponsiveStringMap }
    }
    products: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        cards: { columns: HomeResponsiveStringMap; itemLimit: HomeResponsiveStringMap }
    }
    frameworks: {
        header: { titleSizeRem: HomeResponsiveStringMap }
        items: { columns: HomeResponsiveStringMap; itemLimit: HomeResponsiveStringMap }
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
        blockOrder: HomeBlockOrderMap
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

export type SitePageCategory = 'principal' | 'servicios' | 'productos' | 'protocolos' | 'legal' | 'marketing' | 'custom'
export const SITE_PAGE_CATEGORIES: SitePageCategory[] = ['principal', 'servicios', 'productos', 'protocolos', 'legal', 'marketing', 'custom']
export type SitePageStatus = 'published' | 'draft'
export type SitePageEditor = 'home' | 'services' | 'products' | 'design' | 'site' | 'marketing' | 'none'
export type SitePageBlockType =
    | 'hero'
    | 'text'
    | 'richtext'
    | 'feature-list'
    | 'cta'
    | 'contact'
    | 'spacer'
    | 'heading'
    | 'button'
    | 'image'
    | 'video'
    | 'embed'
    | 'divider'
    | 'form'
    | 'social'
    | 'tabs'
    | 'toggle'
    | 'gallery'
    | 'counter'
    | 'lottie'
    | 'accordion'
    | 'carousel'
    | 'map'
    | 'testimonial'
    | 'progress'
    | 'progressbar'
    | 'grid'
    | 'timeline'
    | 'tuprofe'
    | 'bento'
    | 'loopgrid'
    | 'portfolio'
    | 'pricing'
    | 'flipbox'
    | 'hotspots'
    | 'navmenu'
    | 'icon'
    | 'stats'
    | 'navigation-selector'
export const SITE_PAGE_BLOCK_TYPES: SitePageBlockType[] = [
    'hero', 'text', 'richtext', 'feature-list', 'cta', 'contact', 'spacer',
    'heading', 'button', 'image', 'video', 'embed', 'divider',
    'form', 'social', 'tabs', 'toggle', 'gallery', 'counter', 'lottie', 'accordion', 'carousel',
    'map', 'testimonial', 'progress', 'progressbar',
    'grid', 'timeline', 'bento', 'loopgrid', 'portfolio', 'pricing', 'flipbox', 'hotspots', 'navmenu',
    'icon', 'stats', 'navigation-selector'
]

export type SitePageBlockContent = {
    [key: string]: any
    eyebrow?: string
    title?: string
    body?: string
    subtitle?: string
    html?: string
    primaryLabel?: string
    primaryHref?: string
    secondaryLabel?: string
    secondaryHref?: string
    items?: Array<string | Record<string, any>>
    email?: string
    phone?: string
}

export type SitePageBlockStyle = {
    [key: string]: any
    backgroundColor?: string
    textColor?: string
    align?: 'left' | 'center' | 'right'
    paddingY?: string
    columns?: string
    height?: string
}

export type SitePageBlock = {
    id: string
    type: SitePageBlockType
    name: string
    visible: boolean
    order: number
    content: SitePageBlockContent
    style: SitePageBlockStyle
}

export type SiteArchitecturePage = {
    id: string
    title: string
    path: string
    description: string
    category: SitePageCategory
    status: SitePageStatus
    editor: SitePageEditor
    template: string
    navLabel: string
    showInNavigation: boolean
    previewPath: string
    accentColor: string
    notes: string
    order: number
    locked: boolean
    blocks: SitePageBlock[]
}

export type SiteArchitecture = {
    pages: SiteArchitecturePage[]
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
    headerVariant: string
    headerSticky: string
    headerCtaEnabled: string
    headerCtaLabel: string
    headerCtaHref: string
    footerVariant: string
    announcementEnabled: string
    announcementText: string
    announcementHref: string
    announcementBgColor: string
    announcementTextColor: string
    pageTemplateHome: string
    pageTemplateService: string
    pageTemplateProduct: string
    pageTemplateProtocol: string
    pageTemplatePolicy: string
    performanceMode: string
    motionPreference: string
    popupEnabled: string
    popupTrigger: string
    popupDelaySeconds: string
    popupScrollPercent: string
    popupFrequency: string
    popupPages: string
    popupTitle: string
    popupBody: string
    popupCtaLabel: string
    popupCtaHref: string
    popupDismissLabel: string
    formSuccessMessage: string
    formErrorMessage: string
    notFoundTitle: string
    notFoundDescription: string
    notFoundCtaLabel: string
    notFoundCtaHref: string
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
    siteArchitecture: SiteArchitecture
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

    fontBody: 'Space Grotesk',
    fontDisplay: 'Space Grotesk',

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
    faviconUrl: DEFAULT_FAVICON_URL,

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
    root.style.setProperty('--font-display', `"${tokens.fontDisplay}", system-ui, sans-serif`)

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

    // Load Google Fonts dynamically for body + display when needed.
    document.getElementById('cms-font-link')?.remove()

    const builtInFonts = new Set(['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'])
    const requestedFonts = [tokens.fontBody, tokens.fontDisplay]
        .map((font) => font.trim())
        .filter((font) => font.length > 0)
        .filter((font, index, self) => self.indexOf(font) === index)
        .filter((font) => !builtInFonts.has(font))

    if (requestedFonts.length > 0) {
        const familyQuery = requestedFonts
            .map((font) => `family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800;900`)
            .join('&')
        const link = document.createElement('link')
        link.id = 'cms-font-link'
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`
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
        blockOrder: {
            services: ['header', 'grid'],
            products: ['header', 'cards'],
            frameworks: ['header', 'items'],
            contact: ['header', 'channels', 'form'],
        },
        blockStyleOverrides: {
            services: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                grid: {
                    columns: { mobile: '1', tablet: '2', desktop: '3' },
                    itemLimit: { mobile: '4', tablet: '6', desktop: '6' },
                },
            },
            products: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                cards: {
                    columns: { mobile: '1', tablet: '2', desktop: '3' },
                    itemLimit: { mobile: '2', tablet: '3', desktop: '3' },
                },
            },
            frameworks: {
                header: { titleSizeRem: { mobile: '3rem', tablet: '4rem', desktop: '4.5rem' } },
                items: {
                    columns: { mobile: '1', tablet: '2', desktop: '2' },
                    itemLimit: { mobile: '2', tablet: '3', desktop: '3' },
                },
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
    headerVariant: 'classic',
    headerSticky: 'true',
    headerCtaEnabled: 'true',
    headerCtaLabel: 'Iniciar transformación',
    headerCtaHref: '/#contacto',
    footerVariant: 'detailed',
    announcementEnabled: 'false',
    announcementText: 'Nuevo: sesión de diagnóstico sin costo para equipos directivos.',
    announcementHref: '/#contacto',
    announcementBgColor: '#0f172a',
    announcementTextColor: '#ffffff',
    pageTemplateHome: 'immersive',
    pageTemplateService: 'balanced',
    pageTemplateProduct: 'balanced',
    pageTemplateProtocol: 'immersive',
    pageTemplatePolicy: 'compact',
    performanceMode: 'standard',
    motionPreference: 'system',
    popupEnabled: 'false',
    popupTrigger: 'time',
    popupDelaySeconds: '8',
    popupScrollPercent: '40',
    popupFrequency: 'once_session',
    popupPages: 'all',
    popupTitle: 'Agenda una sesión estratégica',
    popupBody: 'Te ayudamos a definir un roadmap realista de transformación digital en 30 minutos.',
    popupCtaLabel: 'Quiero mi sesión',
    popupCtaHref: '/#contacto',
    popupDismissLabel: 'Ahora no',
    formSuccessMessage: 'Gracias. Te responderemos en menos de 24 horas hábiles.',
    formErrorMessage: 'No pudimos enviar tu solicitud. Inténtalo nuevamente en unos minutos.',
    notFoundTitle: 'La página que buscas no está disponible.',
    notFoundDescription: 'Es posible que haya cambiado de ruta o ya no exista. Te llevamos al inicio para continuar.',
    notFoundCtaLabel: 'Volver al inicio',
    notFoundCtaHref: '/',
}

const defaultServicePreviewPath = staticServices[0]?.slug ? `/servicios/${staticServices[0].slug}` : '/servicios/captura-adn'
const defaultProductPreviewPath = staticProducts[0]?.slug ? `/productos/${staticProducts[0].slug}` : '/productos/diagnostico-md-ia'









export type PlainServiceCopy = {
    inSimpleWords: string
    businessBenefit: string
    idealWhen: string
    outcomes: string[]
}

const SERVICES_LANDING_SIMPLE_COPY: Record<string, PlainServiceCopy> = {
    'captura-adn': {
        inSimpleWords: 'Nos sentamos contigo para entender cómo funciona hoy tu empresa y qué te está frenando.',
        businessBenefit: 'Evitas invertir a ciegas y priorizas solo lo que realmente mejora ventas, tiempos o costos.',
        idealWhen: 'Sientes que debes modernizarte, pero no tienes claridad de por dónde empezar.',
        outcomes: ['Mapa claro de prioridades', 'Plan por etapas fácil de ejecutar', 'Decisiones con menos riesgo'],
    },
    'mapeo-procesos': {
        inSimpleWords: 'Ordenamos tus procesos para que todos trabajen de forma más simple y consistente.',
        businessBenefit: 'Reduces reprocesos, errores y tiempos muertos en áreas clave del negocio.',
        idealWhen: 'Tu equipo depende de “como cada uno lo hace” y eso genera cuellos de botella.',
        outcomes: ['Procesos claros para todo el equipo', 'Menos retrabajo operativo', 'Mayor velocidad de respuesta al cliente'],
    },
    'humano-vs-tecnologia': {
        inSimpleWords: 'Definimos qué tareas debe hacer una persona y cuáles conviene automatizar.',
        businessBenefit: 'Tu equipo se enfoca en lo que aporta valor y la tecnología se encarga de lo repetitivo.',
        idealWhen: 'Quieres usar automatización o IA sin perder el control ni afectar la calidad.',
        outcomes: ['Roles más claros', 'Automatización con criterio', 'Menor riesgo en la operación'],
    },
    'diseno-desarrollo': {
        inSimpleWords: 'Construimos la solución digital que necesitas, desde una idea hasta una versión funcional.',
        businessBenefit: 'Obtienes una herramienta hecha para tu operación, no una plantilla genérica.',
        idealWhen: 'Ya sabes qué resolver y necesitas pasar rápido de la idea a algo usable.',
        outcomes: ['Prototipo validado en poco tiempo', 'Solución adaptada a tu empresa', 'Visibilidad continua del avance'],
    },
    implementacion: {
        inSimpleWords: 'Ponemos la solución en marcha con tu equipo, cuidando que el cambio funcione en la práctica.',
        businessBenefit: 'Aceleras la adopción y evitas interrupciones que afecten clientes o ingresos.',
        idealWhen: 'Tienes una herramienta lista, pero te preocupa que la implementación falle.',
        outcomes: ['Arranque controlado', 'Capacitación por rol', 'Soporte cercano en las primeras semanas'],
    },
    'seguimiento-mejora': {
        inSimpleWords: 'Medimos resultados y ajustamos continuamente para que la solución siga generando valor.',
        businessBenefit: 'No te quedas con un sistema estático: mejoras mes a mes según datos reales.',
        idealWhen: 'Quieres asegurar que la inversión siga rindiendo y evolucionando con tu negocio.',
        outcomes: ['Indicadores de desempeño claros', 'Plan de mejoras continuo', 'Evolución constante sin improvisar'],
    },
}

function getServicesPlainCopy(slug: string, fallbackDescription: string): PlainServiceCopy {
    return (
        SERVICES_LANDING_SIMPLE_COPY[slug] ?? {
            inSimpleWords: fallbackDescription,
            businessBenefit: 'Te ayuda a tomar decisiones con más claridad y menos riesgo.',
            idealWhen: 'Quieres mejorar resultados sin afectar la operación del día a día.',
            outcomes: ['Más orden operativo', 'Más foco del equipo', 'Más continuidad'],
        }
    )
}

function createDefaultBlocks(title: string, description: string, accentColor: string): SitePageBlock[] {
    return [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero principal',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Bloque inicial',
                title,
                body: description || 'Describe aquí el mensaje principal de la página.',
                primaryLabel: 'Contáctanos',
                primaryHref: '/#contacto',
                secondaryLabel: 'Ir al inicio',
                secondaryHref: '/inicio',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'content',
            type: 'text',
            name: 'Contenido principal',
            visible: true,
            order: 1,
            content: {
                title: '¿Qué incluye esta página?',
                body: 'Usa este bloque para explicar detalles del servicio, producto o propuesta de valor con lenguaje claro.',
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#334155',
                align: 'left',
                paddingY: '4rem',
            },
        },
        {
            id: 'cta',
            type: 'cta',
            name: 'Cierre con CTA',
            visible: true,
            order: 2,
            content: {
                title: '¿Listo para avanzar?',
                body: 'Podemos ayudarte a definir el siguiente paso para tu organización.',
                primaryLabel: 'Hablar con un asesor',
                primaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: accentColor || '#2563eb',
                textColor: '#ffffff',
                align: 'center',
                paddingY: '3.5rem',
            },
        },
    ]
}















/**
 * El contenido por defecto de las landings con maquetacion propia vive en
 * ./cmsDefaultPageBlocks, fuera del chunk de entrada. Se carga bajo demanda.
 */
type DefaultPageBlocksModule = typeof import('./cmsDefaultPageBlocks')
let defaultPageBlocksModule: DefaultPageBlocksModule | null = null
let defaultPageBlocksPromise: Promise<DefaultPageBlocksModule> | null = null

/** Paginas cuyos bloques por defecto necesitan el modulo diferido. */
const SPECIALIZED_DEFAULT_PAGES = new Set([
    'home-nav', 'home-root', 'home-edu', 'servicio-plataformas',
    'virtualizacion-programas', 'auditoria-programas-virtuales',
    'home-inicio', 'case-transversal',
])

function loadDefaultPageBlocks(): Promise<DefaultPageBlocksModule> {
    if (!defaultPageBlocksPromise) {
        defaultPageBlocksPromise = import('./cmsDefaultPageBlocks').then((module) => {
            defaultPageBlocksModule = module
            return module
        })
    }
    return defaultPageBlocksPromise
}

/** Se activa si alguna pagina tuvo que conformarse con el andamiaje generico. */
let deferredDefaultsPending = false

/**
 * Bloques por defecto de una landing con maquetacion propia, o null si el modulo
 * diferido aun no esta en memoria (en cuyo caso queda pedido y se reintenta).
 */
function specializedBlocksFor(
    pageId: string,
    title = '',
    description = '',
    accentColor = ''
): SitePageBlock[] | null {
    if (!defaultPageBlocksModule) {
        if (SPECIALIZED_DEFAULT_PAGES.has(pageId)) {
            deferredDefaultsPending = true
            void loadDefaultPageBlocks()
        }
        return null
    }
    return defaultPageBlocksModule.createSpecializedBlocks(
        pageId, title, description, accentColor,
        { staticServices, staticProducts, staticHero, staticSite, staticHomePage, getServicesPlainCopy },
    )
}

function createDefaultBlocksByPage(pageId: string, title: string, description: string, accentColor: string): SitePageBlock[] {
    if (pageId === 'hazlo-tu-mismo') return createHazloTuMismoLandingBlocks() as SitePageBlock[]
    return specializedBlocksFor(pageId, title, description, accentColor)
        ?? createDefaultBlocks(title, description, accentColor)
}

function isLegacyScaffoldBlocks(blocks: SitePageBlock[], pageTitle: string) {
    if (blocks.length !== 3) return false
    const hero = blocks.find((block) => block.id === 'hero')
    const content = blocks.find((block) => block.id === 'content')
    const cta = blocks.find((block) => block.id === 'cta')
    if (!hero || !content || !cta) return false
    const heroTitle = String(hero.content?.title || '')
    const contentTitle = String(content.content?.title || '')
    const contentBody = String(content.content?.body || '')
    const ctaTitle = String(cta.content?.title || '')
    const ctaLabel = String(cta.content?.primaryLabel || '')
    return (
        heroTitle === pageTitle &&
        contentTitle === '¿Qué incluye esta página?' &&
        contentBody.includes('Usa este bloque para explicar detalles') &&
        ctaTitle === '¿Listo para avanzar?' &&
        ctaLabel === 'Hablar con un asesor'
    )
}

function isOutdatedHomeRootBlocks(blocks: SitePageBlock[]) {
    const servicesBlock = blocks.find((block) => block.id === 'servicios')
    if (!servicesBlock) return true
    const items = Array.isArray(servicesBlock.content?.items) ? servicesBlock.content.items : []
    if (items.length === 0) return true
    const firstObjectItem = items.find((item) => item && typeof item === 'object') as Record<string, unknown> | undefined
    if (!firstObjectItem) return true
    return !('inSimpleWords' in firstObjectItem) || !('businessBenefit' in firstObjectItem) || !('idealWhen' in firstObjectItem)
}

function isOutdatedEducationBlocks(blocks: SitePageBlock[]) {
    const servicesBlock = blocks.find((block) => block.id === 'servicios')
    if (!servicesBlock) return true
    const items = Array.isArray(servicesBlock.content?.items) ? servicesBlock.content.items : []
    if (items.length < 4) return true
    
    // Check if the first item is 'plataformas-lms' to ensure the new order is applied
    const firstItem = items[0] as any
    return firstItem?.id !== 'plataformas-lms' || firstItem?.id === 'edu-digital'
}

function ensureEducationClientsBlock(blocks: SitePageBlock[]) {
    const existingClientsIndex = blocks.findIndex((block) => block.id === 'clientes')
    if (existingClientsIndex >= 0) {
        const existingClientsBlock = blocks[existingClientsIndex]
        const existingItems = Array.isArray(existingClientsBlock.content?.items) ? existingClientsBlock.content.items : []
        const hasLogoUrls = existingItems.some((item) => (
            item &&
            typeof item === 'object' &&
            typeof (item as Record<string, unknown>).logoUrl === 'string' &&
            String((item as Record<string, unknown>).logoUrl).trim().length > 0
        ))

        // Salida rapida antes de tocar los defaults: si el bloque ya trae logos
        // no hay nada que parchear y evitamos cargar ./cmsDefaultPageBlocks.
        if (hasLogoUrls) return blocks

        const defaultClientsBlock = specializedBlocksFor('home-edu')?.find((block) => block.id === 'clientes')
        if (!defaultClientsBlock) return blocks

        const updated = [...blocks]
        updated[existingClientsIndex] = {
            ...existingClientsBlock,
            content: {
                ...existingClientsBlock.content,
                title: 'Clientes',
                body: 'Instituciones y empresas que han confiado en nosotros',
                items: Array.isArray(defaultClientsBlock.content.items)
                    ? defaultClientsBlock.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                    : [],
            },
            style: { ...existingClientsBlock.style },
        }
        return updated.map((block, index) => ({ ...block, order: index }))
    }

    const defaultClientsBlock = specializedBlocksFor('home-edu')?.find((block) => block.id === 'clientes')
    if (!defaultClientsBlock) return blocks

    const nextBlocks = [...blocks].sort((a, b) => a.order - b.order)
    const flowIndex = nextBlocks.findIndex((block) => block.id === 'flujo')
    const faqIndex = nextBlocks.findIndex((block) => block.id === 'faq')
    const insertAt = flowIndex >= 0
        ? flowIndex + 1
        : (faqIndex >= 0 ? faqIndex : nextBlocks.length)

    nextBlocks.splice(insertAt, 0, {
        ...defaultClientsBlock,
        content: {
            ...defaultClientsBlock.content,
            items: Array.isArray(defaultClientsBlock.content.items)
                ? defaultClientsBlock.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                : [],
        },
        style: { ...defaultClientsBlock.style },
    })

    return nextBlocks.map((block, index) => ({ ...block, order: index }))
}

const AUDITORIA_CANONICAL_ORDER = ['hero', 'promesas', 'servicios', 'estandares-qm', 'entregables', 'clientes', 'recursos', 'flujo', 'faq', 'contacto']

/**
 * true si los bloques guardados ya estan reconciliados: ids canonicos en orden y
 * los items de estandares-qm completos. En ese caso esta funcion seria un no-op,
 * asi que salimos antes de pedir los defaults y evitamos cargar el modulo
 * diferido en cada visita a la landing de auditoria.
 */
function isAuditoriaAlreadyReconciled(blocks: SitePageBlock[]): boolean {
    if (blocks.length !== AUDITORIA_CANONICAL_ORDER.length) return false
    if (blocks.some((block, index) => block.id !== AUDITORIA_CANONICAL_ORDER[index])) return false

    const standards = blocks.find((block) => block.id === 'estandares-qm')
    const items = Array.isArray(standards?.content?.items) ? standards.content.items : []
    if (items.length === 0) return false
    return items.every((item) => {
        if (!item || typeof item !== 'object') return true
        const source = item as Record<string, unknown>
        return source.value !== undefined && source.scoreLabel !== undefined && source.icon !== undefined
    })
}

function ensureAuditoriaPremiumBlocks(blocks: SitePageBlock[]) {
    if (Array.isArray(blocks) && isAuditoriaAlreadyReconciled(blocks)) {
        return blocks.map((block, index) => ({ ...block, order: index }))
    }

    const defaultBlocks = specializedBlocksFor('auditoria-programas-virtuales')
    if (!defaultBlocks) return blocks
    if (!Array.isArray(blocks) || blocks.length === 0) return defaultBlocks

    const normalizeAuditoriaText = (value: unknown) =>
        (typeof value === 'string' ? value : '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()

    const includesAny = (source: string, terms: string[]) => terms.some((term) => source.includes(term))

    const getItemAuditText = (item: unknown) => {
        if (typeof item === 'string') return normalizeAuditoriaText(item)
        if (!item || typeof item !== 'object') return ''
        const source = item as Record<string, unknown>
        return normalizeAuditoriaText(
            [
                source.title,
                source.label,
                source.body,
                source.description,
                source.metric,
                source.scoreLabel,
            ]
                .filter((value) => typeof value === 'string')
                .join(' ')
        )
    }

    const inferAuditoriaBlockId = (block: SitePageBlock): string | null => {
        const idText = normalizeAuditoriaText(block.id)
        const nameText = normalizeAuditoriaText(block.name)
        const titleText = normalizeAuditoriaText(block.content?.title)
        const eyebrowText = normalizeAuditoriaText(block.content?.eyebrow)
        const bodyText = normalizeAuditoriaText(block.content?.body)
        const items = Array.isArray(block.content?.items) ? block.content.items : []
        const itemText = items.map((item) => getItemAuditText(item)).join(' ')
        const fullText = `${idText} ${nameText} ${titleText} ${eyebrowText} ${bodyText} ${itemText}`.trim()
        const hasMetricLikeItem = items.some((item) => (
            item &&
            typeof item === 'object' &&
            (
                Object.prototype.hasOwnProperty.call(item, 'value') ||
                Object.prototype.hasOwnProperty.call(item, 'metric') ||
                Object.prototype.hasOwnProperty.call(item, 'scoreLabel')
            )
        ))

        if (block.type === 'hero') return 'hero'
        if (block.type === 'timeline') return 'flujo'
        if (block.type === 'accordion') return 'faq'
        if (block.type === 'contact') return 'contacto'
        if (block.type === 'cta') return 'cta'
        if (block.type === 'carousel') return 'clientes'

        if (includesAny(fullText, ['estandares qm', 'estandar qm', 'quality matters'])) return 'estandares-qm'
        if (includesAny(itemText, ['descripcion general e introduccion', 'objetivos de aprendizaje', 'accesibilidad y usabilidad'])) return 'estandares-qm'

        if (block.type === 'feature-list' && includesAny(fullText, ['entregables', 'matriz de hallazgos', 'puntajes de cumplimiento'])) return 'entregables'
        if (includesAny(fullText, ['activos para decision', 'rubrica qm higher education', 'informe ejecutivo', 'plan de mejoramiento'])) return 'recursos'
        if (includesAny(fullText, ['indicadores de referencia', 'cumplimiento global de referencia', 'fases de mejora continua']) || hasMetricLikeItem) return 'promesas'
        if (includesAny(fullText, ['alcance de la auditoria', 'que auditamos', 'auditoria tecnica y pedagogica'])) return 'servicios'
        if (includesAny(fullText, ['respuestas claras para iniciar la auditoria', 'preguntas frecuentes'])) return 'faq'
        if (includesAny(fullText, ['hablemos de la calidad', 'iniciemos tu proyecto', 'cuentanos el alcance'])) return 'contacto'
        if (includesAny(fullText, ['ruta de auditoria en 4 fases', 'alistamiento y muestra', 'recoleccion de evidencia'])) return 'flujo'

        return null
    }

    const cloneDefaultBlock = (block: SitePageBlock): SitePageBlock => ({
        ...block,
        content: {
            ...block.content,
            items: Array.isArray(block.content?.items)
                ? block.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                : block.content?.items,
        },
        style: { ...block.style },
    })

    const defaultById = new Map(defaultBlocks.map((block) => [block.id, cloneDefaultBlock(block)]))
    const nextBlocks = [...blocks]
        .sort((a, b) => a.order - b.order)
        .map((block) => ({
            ...block,
            content: { ...block.content },
            style: { ...block.style },
        }))

    const canonicalOrder = AUDITORIA_CANONICAL_ORDER
    const usedIds = new Set(nextBlocks.map((block) => block.id))

    nextBlocks.forEach((block, index) => {
        const inferredId = inferAuditoriaBlockId(block)
        if (!inferredId || block.id === inferredId || usedIds.has(inferredId)) return
        usedIds.delete(block.id)
        usedIds.add(inferredId)
        nextBlocks[index] = {
            ...block,
            id: inferredId,
        }
    })

    const insertMissingBlock = (blockId: string, afterBlockId?: string) => {
        const exists = nextBlocks.some((block) => block.id === blockId)
        if (exists) return
        const defaultBlock = defaultById.get(blockId)
        if (!defaultBlock) return

        const afterIndex = afterBlockId ? nextBlocks.findIndex((block) => block.id === afterBlockId) : -1
        const insertAt = afterIndex >= 0 ? afterIndex + 1 : (blockId === 'hero' ? 0 : nextBlocks.length)
        nextBlocks.splice(insertAt, 0, cloneDefaultBlock(defaultBlock))
    }

    canonicalOrder.forEach((blockId, index) => {
        if (index === 0) {
            insertMissingBlock(blockId)
            return
        }
        insertMissingBlock(blockId, canonicalOrder[index - 1])
    })

    const standardsIndex = nextBlocks.findIndex((block) => block.id === 'estandares-qm')
    const defaultStandards = defaultById.get('estandares-qm')
    if (standardsIndex >= 0 && defaultStandards) {
        const currentStandardsBlock = nextBlocks[standardsIndex]
        const currentItems = Array.isArray(currentStandardsBlock.content?.items) ? currentStandardsBlock.content.items : []
        const defaultItems = Array.isArray(defaultStandards.content?.items) ? defaultStandards.content.items : []

        const mergedItems = currentItems.map((item, index) => {
            if (!item || typeof item !== 'object') return item
            const source = item as Record<string, unknown>
            const fallbackItem = (defaultItems[index] && typeof defaultItems[index] === 'object')
                ? (defaultItems[index] as Record<string, unknown>)
                : {}
            return {
                ...source,
                value: source.value ?? fallbackItem.value,
                scoreLabel: source.scoreLabel ?? fallbackItem.scoreLabel,
                icon: source.icon ?? fallbackItem.icon,
            }
        })

        nextBlocks[standardsIndex] = {
            ...currentStandardsBlock,
            content: {
                ...currentStandardsBlock.content,
                items: mergedItems.length > 0 ? mergedItems : defaultItems,
            },
        }
    }

    const clientsIndex = nextBlocks.findIndex((block) => block.id === 'clientes')
    const deliverablesIndex = nextBlocks.findIndex((block) => block.id === 'entregables')
    const defaultClients = defaultById.get('clientes')

    if (clientsIndex >= 0 && defaultClients) {
        const currentClientsBlock = nextBlocks[clientsIndex]
        const currentItems = Array.isArray(currentClientsBlock.content?.items) ? currentClientsBlock.content.items : []
        const defaultItems = Array.isArray(defaultClients.content?.items) ? defaultClients.content.items : []
        const onlyDefaultClient = defaultItems.slice(0, 1).map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
        const legacyIds = new Set(['marca-ejecutiva', 'icaza-jammoul', 'inetum', 'estudiemos-web'])
        const legacyLike = currentItems.length === 4 && currentItems.every((item) => (
            item &&
            typeof item === 'object' &&
            typeof (item as Record<string, unknown>).id === 'string' &&
            legacyIds.has(String((item as Record<string, unknown>).id))
        ))
        const singleLegacyMarca = currentItems.length === 1 && currentItems.some((item) => (
            item &&
            typeof item === 'object' &&
            (
                String((item as Record<string, unknown>).id || '').toLowerCase() === 'marca-ejecutiva' ||
                String((item as Record<string, unknown>).title || '').toLowerCase().includes('marca ejecutiva')
            )
        ))

        if ((legacyLike || singleLegacyMarca) && onlyDefaultClient.length > 0) {
            nextBlocks[clientsIndex] = {
                ...currentClientsBlock,
                name: defaultClients.name,
                content: {
                    ...currentClientsBlock.content,
                    title: defaultClients.content?.title,
                    body: defaultClients.content?.body,
                    items: onlyDefaultClient,
                },
            }
        }
    }

    const currentClientsIndex = nextBlocks.findIndex((block) => block.id === 'clientes')
    if (currentClientsIndex >= 0 && deliverablesIndex >= 0 && currentClientsIndex !== deliverablesIndex + 1) {
        const [clientsBlock] = nextBlocks.splice(currentClientsIndex, 1)
        const updatedDeliverablesIndex = nextBlocks.findIndex((block) => block.id === 'entregables')
        const insertAt = updatedDeliverablesIndex >= 0 ? updatedDeliverablesIndex + 1 : nextBlocks.length
        nextBlocks.splice(insertAt, 0, clientsBlock)
    }

    return nextBlocks.map((block, index) => ({ ...block, order: index }))
}

function isOutdatedVirtualizacionBlocks(blocks: SitePageBlock[]) {
    return !blocks.some((block) => block.id === 'experiencias')
}

function ensureVirtualizacionMaturityBlock(blocks: SitePageBlock[]) {
    if (!Array.isArray(blocks) || blocks.length === 0) return blocks
    if (blocks.some((block) => block.id === 'maturity360')) {
        return blocks.map((block, index) => ({ ...block, order: index }))
    }

    const defaultMaturityBlock = specializedBlocksFor('virtualizacion-programas')?.find((block) => block.id === 'maturity360')
    if (!defaultMaturityBlock) {
        return blocks.map((block, index) => ({ ...block, order: index }))
    }

    const nextBlocks = blocks.map((block) => ({
        ...block,
        content: block.content && typeof block.content === 'object' ? { ...block.content } : block.content,
        style: block.style && typeof block.style === 'object' ? { ...block.style } : block.style,
    }))

    const experienciasIndex = nextBlocks.findIndex((block) => block.id === 'experiencias')
    const insertAt = experienciasIndex >= 0 ? experienciasIndex + 1 : nextBlocks.length
    nextBlocks.splice(insertAt, 0, {
        ...defaultMaturityBlock,
        content: { ...defaultMaturityBlock.content },
        style: { ...defaultMaturityBlock.style },
    })

    return nextBlocks.map((block, index) => ({ ...block, order: index }))
}

function isOutdatedCaseTransversalBlocks(blocks: SitePageBlock[]) {
    if (!Array.isArray(blocks) || blocks.length === 0) return true
    const heroBlock = blocks.find((block) => block.id === 'hero')
    const requiredBlockIds = [
        'hero',
        'kpis-top',
        'situacion-inicial',
        'consecuencias',
        'servicios-aplicados',
        'flujo-operativo',
        'productos-generados',
        'resultados-comparativos',
        'semaforo-sedes',
        'donut-operacion',
        'heatmap-riesgo',
        'cta-final',
    ]
    const hasAllRequired = requiredBlockIds.every((id) => blocks.some((block) => block?.id === id))
    const heroBody = String(heroBlock?.content?.body || '').toLowerCase()
    const heroTitle = String(heroBlock?.content?.title || '').toLowerCase()
    if (!heroBlock) return true
    if (!hasAllRequired) return true

    // v1 del caso transversal (genérico): forzar actualización al caso SST.
    if (heroBody.includes('simulamos un caso real y aplicamos los 6 servicios en secuencia')) return true
    if (heroBody.includes('empresa de servicios b2b')) return true
    if (!heroTitle.includes('reportes por whatsapp')) return true

    return false
}

function migrateLegacyBuilderPage(pageId: string, title: string, description: string, accentColor: string, blocks: SitePageBlock[]) {
    if (pageId === 'home-root' && isOutdatedHomeRootBlocks(blocks)) {
        return createDefaultBlocksByPage(pageId, title, description, accentColor)
    }
    if (pageId === 'home-edu') {
        const withClients = ensureEducationClientsBlock(blocks)
        if (isOutdatedEducationBlocks(withClients)) {
            return createDefaultBlocksByPage(pageId, title, description, accentColor)
        }
        return withClients
    }
    if (pageId === 'virtualizacion-programas' && isOutdatedVirtualizacionBlocks(blocks)) {
        return createDefaultBlocksByPage(pageId, title, description, accentColor)
    }
    if (pageId === 'virtualizacion-programas') {
        return ensureVirtualizacionMaturityBlock(blocks)
    }
    if (pageId === 'auditoria-programas-virtuales') {
        return ensureAuditoriaPremiumBlocks(blocks)
    }
    if (pageId === 'case-transversal' && isOutdatedCaseTransversalBlocks(blocks)) {
        return createDefaultBlocksByPage(pageId, title, description, accentColor)
    }
    if (pageId !== 'home-root' && pageId !== 'home-inicio') return blocks
    if (!isLegacyScaffoldBlocks(blocks, title)) return blocks
    return createDefaultBlocksByPage(pageId, title, description, accentColor)
}

const SITE_PAGE_BLOCK_TYPE_SET = new Set<SitePageBlockType>(SITE_PAGE_BLOCK_TYPES)

function normalizeSitePageBlocks(rawBlocks: unknown, fallbackBlocks: SitePageBlock[]): SitePageBlock[] {
    const sourceBlocks = Array.isArray(rawBlocks) ? rawBlocks : fallbackBlocks
    const fallbackById = new Map(fallbackBlocks.map((block) => [block.id, block]))
    const seen = new Set<string>()
    const normalized: SitePageBlock[] = []

    sourceBlocks.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return
        const raw = entry as any
        const requestedId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `block-${index + 1}`
        let id = requestedId
        let suffix = 2
        while (seen.has(id)) {
            id = `${requestedId}-${suffix}`
            suffix += 1
        }
        seen.add(id)
        const fallback = fallbackById.get(id) ?? fallbackBlocks[index]
        const type = SITE_PAGE_BLOCK_TYPE_SET.has(raw.type as SitePageBlockType) ? raw.type as SitePageBlockType : (fallback?.type ?? 'text')
        const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : (fallback?.name ?? `Bloque ${index + 1}`)
        const visible = typeof raw.visible === 'boolean' ? raw.visible : (fallback?.visible ?? true)
        const order = Number.isFinite(Number(raw.order)) ? Number(raw.order) : (fallback?.order ?? index)

        const fallbackContent = fallback?.content && typeof fallback.content === 'object' ? fallback.content : {}
        const rawContent = raw.content && typeof raw.content === 'object' ? raw.content : {}
        const mergedContent: SitePageBlockContent = {
            ...fallbackContent,
            ...rawContent,
        }
        if (typeof mergedContent.primaryHref === 'string') {
            mergedContent.primaryHref = normalizePagePath(mergedContent.primaryHref)
        }
        if (typeof mergedContent.secondaryHref === 'string') {
            mergedContent.secondaryHref = normalizePagePath(mergedContent.secondaryHref)
        }
        if (Array.isArray(mergedContent.items)) {
            mergedContent.items = mergedContent.items
                .filter((item: unknown) => typeof item === 'string' || (item && typeof item === 'object'))
                .map((item) => (item && typeof item === 'object') ? { ...(item as Record<string, unknown>) } : item)
        }
        const content: SitePageBlockContent = mergedContent

        const fallbackStyle = fallback?.style && typeof fallback.style === 'object' ? fallback.style : {}
        const rawStyle = raw.style && typeof raw.style === 'object' ? raw.style : {}
        const mergedStyle: SitePageBlockStyle = {
            ...fallbackStyle,
            ...rawStyle,
        }
        if (mergedStyle.align !== 'left' && mergedStyle.align !== 'center' && mergedStyle.align !== 'right') {
            mergedStyle.align = 'left'
        }
        const style: SitePageBlockStyle = mergedStyle

        normalized.push({ id, type, name, visible, order, content, style })
    })

    if (normalized.length === 0) {
        return fallbackBlocks.map((block, index) => ({ ...block, order: index }))
    }

    normalized.sort((a, b) => a.order - b.order)
    return normalized.map((block, index) => ({ ...block, order: index }))
}

const staticSiteArchitecture: SiteArchitecture = {
    pages: [
        {
            id: 'home-nav',
            title: 'Selector de Navegación',
            path: '/',
            description: 'Pantalla inicial de selección: Empresas o Educación.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Selector',
            showInNavigation: false,
            previewPath: '/',
            accentColor: '#0f172a',
            notes: 'Página de entrada al sitio.',
            order: 0,
            locked: true,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'home-root',
            title: 'Home (Landing principal)',
            path: '/empresas',
            description: 'Página principal pública del sitio.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Inicio',
            showInNavigation: true,
            previewPath: '/empresas',
            accentColor: '#2563eb',
            notes: 'Render principal del sitio.',
            order: 1,
            locked: true,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'home-edu',
            title: 'Educación',
            path: '/educacion',
            description: 'Soluciones digitales para el sector educativo.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Educación',
            showInNavigation: true,
            previewPath: '/educacion',
            accentColor: '#10b981',
            notes: 'Página de educación con estilo premium.',
            order: 2,
            locked: true,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'servicio-plataformas',
            title: 'Plataformas de Aprendizaje',
            path: '/plataformas-de-aprendizaje',
            description: 'Implementa o evoluciona tu ecosistema digital para el aprendizaje.',
            category: 'servicios',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Plataformas',
            showInNavigation: false,
            previewPath: '/plataformas-de-aprendizaje',
            accentColor: '#10b981',
            notes: 'Página de servicio usando el tema Emerald.',
            order: 3,
            locked: false,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'virtualizacion-programas',
            title: 'Virtualización de Programas',
            path: '/virtualizacion-programas',
            description: 'Experiencias de aprendizaje mediadas por tecnologías.',
            category: 'servicios',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Virtualización',
            showInNavigation: false,
            previewPath: '/virtualizacion-programas',
            accentColor: '#10b981',
            notes: 'Página de producción de contenidos educativos.',
            order: 4,
            locked: false,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'auditoria-programas-virtuales',
            title: 'Auditoría de Programas Virtuales',
            path: '/auditoria-programas-virtuales',
            description: 'Evaluación de calidad de aulas virtuales con estándares Quality Matters (QM).',
            category: 'servicios',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Auditoría',
            showInNavigation: false,
            previewPath: '/auditoria-programas-virtuales',
            accentColor: '#10b981',
            notes: 'Página de servicio de auditoría técnica y pedagógica para programas virtuales.',
            order: 5,
            locked: false,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'home-inicio',
            title: 'Home clásica',
            path: '/inicio',
            description: 'Versión clásica del home original.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'balanced',
            navLabel: 'Inicio clásico',
            showInNavigation: false,
            previewPath: '/inicio',
            accentColor: '#0ea5e9',
            notes: 'Útil para comparar versiones del Home.',
            order: 1,
            locked: true,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'landing-servicios',
            title: 'Landing de servicios',
            path: '/landing-servicios',
            description: 'Landing simplificada orientada a conversión.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Servicios',
            showInNavigation: false,
            previewPath: '/landing-servicios',
            accentColor: '#16a34a',
            notes: 'Página explicativa para público no técnico.',
            order: 2,
            locked: true,
            blocks: createDefaultBlocks('Landing de servicios', 'Landing simplificada orientada a conversión.', '#16a34a'),
        },
        {
            id: 'case-transversal',
            title: 'Caso transversal (servicios + productos)',
            path: '/caso-transversal',
            description: 'Caso SST de punta a punta: incidentes laborales, seguimiento, medidas y analítica en tiempo real.',
            category: 'principal',
            status: 'published',
            editor: 'home',
            template: 'immersive',
            navLabel: 'Caso transversal',
            showInNavigation: false,
            previewPath: '/caso-transversal',
            accentColor: '#0f172a',
            notes: 'Caso real editable de SST con énfasis en productos derivados.',
            order: 3,
            locked: false,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'services-template',
            title: 'Detalle de servicios (dinámico)',
            path: '/servicios/:slug',
            description: 'Plantilla para páginas de detalle de cada servicio.',
            category: 'servicios',
            status: 'published',
            editor: 'services',
            template: 'balanced',
            navLabel: 'Servicios',
            showInNavigation: false,
            previewPath: defaultServicePreviewPath,
            accentColor: '#0891b2',
            notes: 'Cada servicio se edita en el catálogo de Servicios.',
            order: 3,
            locked: true,
            blocks: createDefaultBlocks('Detalle de servicios', 'Plantilla para páginas de detalle de cada servicio.', '#0891b2'),
        },
        {
            id: 'products-template',
            title: 'Detalle de productos (dinámico)',
            path: '/productos/:slug',
            description: 'Plantilla para páginas de detalle de productos.',
            category: 'productos',
            status: 'published',
            editor: 'products',
            template: 'balanced',
            navLabel: 'Productos',
            showInNavigation: false,
            previewPath: defaultProductPreviewPath,
            accentColor: '#7c3aed',
            notes: 'Cada producto se edita desde el catálogo de Productos.',
            order: 4,
            locked: true,
            blocks: createDefaultBlocks('Detalle de productos', 'Plantilla para páginas de detalle de productos.', '#7c3aed'),
        },
        {
            id: 'protocol-human',
            title: 'Protocolo · Ingeniería humana',
            path: '/protocolos/ingenieria-humana',
            description: 'Página del protocolo de ingeniería humana.',
            category: 'protocolos',
            status: 'published',
            editor: 'site',
            template: 'immersive',
            navLabel: 'Ingeniería humana',
            showInNavigation: false,
            previewPath: '/protocolos/ingenieria-humana',
            accentColor: '#f97316',
            notes: 'Página informativa corporativa.',
            order: 5,
            locked: true,
            blocks: createDefaultBlocks('Ingeniería humana', 'Página del protocolo de ingeniería humana.', '#f97316'),
        },
        {
            id: 'protocol-ai',
            title: 'Protocolo · Despliegue IA',
            path: '/protocolos/despliegue-ia',
            description: 'Página del protocolo de despliegue IA.',
            category: 'protocolos',
            status: 'published',
            editor: 'site',
            template: 'immersive',
            navLabel: 'Despliegue IA',
            showInNavigation: false,
            previewPath: '/protocolos/despliegue-ia',
            accentColor: '#ec4899',
            notes: 'Página informativa corporativa.',
            order: 6,
            locked: true,
            blocks: createDefaultBlocks('Despliegue IA', 'Página del protocolo de despliegue IA.', '#ec4899'),
        },
        {
            id: 'protocol-maturity',
            title: 'Protocolo · Madurez orgánica',
            path: '/protocolos/madurez-organica',
            description: 'Página del protocolo de madurez orgánica.',
            category: 'protocolos',
            status: 'published',
            editor: 'site',
            template: 'immersive',
            navLabel: 'Madurez orgánica',
            showInNavigation: false,
            previewPath: '/protocolos/madurez-organica',
            accentColor: '#22c55e',
            notes: 'Página informativa corporativa.',
            order: 7,
            locked: true,
            blocks: createDefaultBlocks('Madurez orgánica', 'Página del protocolo de madurez orgánica.', '#22c55e'),
        },
        {
            id: 'data-policy',
            title: 'Política de tratamiento de datos',
            path: '/politica-tratamiento-datos',
            description: 'Página legal de consentimiento y tratamiento de datos.',
            category: 'legal',
            status: 'published',
            editor: 'site',
            template: 'compact',
            navLabel: 'Política de datos',
            showInNavigation: false,
            previewPath: '/politica-tratamiento-datos',
            accentColor: '#334155',
            notes: 'Editable desde Configuración global.',
            order: 8,
            locked: true,
            blocks: createDefaultBlocks('Política de datos', 'Página legal de consentimiento y tratamiento de datos.', '#334155'),
        },
        {
            id: hazloTuMismoLandingPageConfig.id,
            title: hazloTuMismoLandingPageConfig.title,
            path: hazloTuMismoLandingPageConfig.path,
            description: hazloTuMismoLandingPageConfig.description,
            category: hazloTuMismoLandingPageConfig.category,
            status: hazloTuMismoLandingPageConfig.status,
            editor: hazloTuMismoLandingPageConfig.editor,
            template: hazloTuMismoLandingPageConfig.template,
            navLabel: hazloTuMismoLandingPageConfig.navLabel,
            showInNavigation: hazloTuMismoLandingPageConfig.showInNavigation,
            previewPath: hazloTuMismoLandingPageConfig.previewPath,
            accentColor: hazloTuMismoLandingPageConfig.accentColor,
            notes: hazloTuMismoLandingPageConfig.notes,
            order: hazloTuMismoLandingPageConfig.order,
            locked: hazloTuMismoLandingPageConfig.locked,
            blocks: [], // materializado bajo demanda por defaultBlocksFor()
        },
        {
            id: 'campaign-template',
            title: 'Landing de campañas (dinámico)',
            path: '/campanias/:slug',
            description: 'Plantilla dinámica para campañas de marketing.',
            category: 'marketing',
            status: 'published',
            editor: 'marketing',
            template: 'immersive',
            navLabel: 'Campañas',
            showInNavigation: false,
            previewPath: '/campanias/demo',
            accentColor: '#14b8a6',
            notes: 'Las campañas se gestionan en Marketing.',
            order: 9,
            locked: true,
            blocks: createDefaultBlocks('Landing de campañas', 'Plantilla dinámica para campañas de marketing.', '#14b8a6'),
        },
    ],
}

const SITE_PAGE_CATEGORY_SET = new Set<SitePageCategory>(SITE_PAGE_CATEGORIES)
const SITE_PAGE_STATUS_SET = new Set<SitePageStatus>(['published', 'draft'])
const SITE_PAGE_EDITOR_SET = new Set<SitePageEditor>(['home', 'services', 'products', 'design', 'site', 'marketing', 'none'])

function normalizePagePath(rawPath: unknown): string {
    const base = typeof rawPath === 'string' ? rawPath.trim() : ''
    if (!base) return '/'
    const withSlash = base.startsWith('/') ? base : `/${base}`
    const compact = withSlash.replace(/\s+/g, '-').replace(/\/{2,}/g, '/')
    if (compact === '/') return '/'
    return compact.endsWith('/') ? compact.slice(0, -1) : compact
}

/**
 * Materializa los bloques por defecto de una pagina del andamiaje estatico. Las
 * paginas se declaran con `blocks: []` a proposito: generarlos al cargar el
 * modulo obligaba a traer ./cmsDefaultPageBlocks en cada visita, que es
 * justamente lo que queremos evitar.
 */
function defaultBlocksFor(page: SiteArchitecturePage): SitePageBlock[] {
    if (page.blocks.length > 0) return page.blocks
    return createDefaultBlocksByPage(page.id, page.title, page.description, page.accentColor)
}

function normalizeSiteArchitecture(raw: unknown): SiteArchitecture {
    const sourcePages = raw && typeof raw === 'object' && Array.isArray((raw as any).pages)
        ? (raw as any).pages
        : []
    const defaultsById = new Map(staticSiteArchitecture.pages.map((page) => [page.id, page]))
    const seenIds = new Set<string>()
    const normalizedPages: SiteArchitecturePage[] = []

    sourcePages.forEach((entry: any, index: number) => {
        if (!entry || typeof entry !== 'object') return
        const requestedId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `page-${index + 1}`
        let id = requestedId
        let suffix = 2
        while (seenIds.has(id)) {
            id = `${requestedId}-${suffix}`
            suffix += 1
        }
        seenIds.add(id)
        const fallback = defaultsById.get(id)
        const title = typeof entry.title === 'string' && entry.title.trim()
            ? entry.title.trim()
            : (fallback?.title ?? 'Nueva página')
        const path = normalizePagePath(entry.path ?? fallback?.path ?? `/pagina-${index + 1}`)
        const previewPath = normalizePagePath(entry.previewPath ?? fallback?.previewPath ?? path)
        const category = SITE_PAGE_CATEGORY_SET.has(entry.category as SitePageCategory)
            ? entry.category as SitePageCategory
            : (fallback?.category ?? 'custom')
        const status = SITE_PAGE_STATUS_SET.has(entry.status as SitePageStatus)
            ? entry.status as SitePageStatus
            : (fallback?.status ?? 'draft')
        const editor = SITE_PAGE_EDITOR_SET.has(entry.editor as SitePageEditor)
            ? entry.editor as SitePageEditor
            : (fallback?.editor ?? 'none')
        const template = typeof entry.template === 'string' && entry.template.trim()
            ? entry.template.trim()
            : (fallback?.template ?? 'balanced')
        const navLabel = typeof entry.navLabel === 'string' && entry.navLabel.trim()
            ? entry.navLabel.trim()
            : (fallback?.navLabel ?? title)
        const description = typeof entry.description === 'string'
            ? entry.description
            : (fallback?.description ?? '')
        const accentColor = typeof entry.accentColor === 'string' && entry.accentColor.trim()
            ? entry.accentColor
            : (fallback?.accentColor ?? '#2563eb')
        const notes = typeof entry.notes === 'string' ? entry.notes : (fallback?.notes ?? '')
        const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : (fallback?.order ?? index)
        const locked = fallback?.locked === true ? true : entry.locked === true
        const showInNavigation = typeof entry.showInNavigation === 'boolean'
            ? entry.showInNavigation
            : (fallback?.showInNavigation ?? false)
        // Si el snapshot ya trae bloques, vienen completos de un guardado previo
        // del panel y no necesitan base de mezcla. Pedir los defaults aqui
        // forzaria la descarga del modulo de contenidos en cada visita.
        const hasStoredBlocks = Array.isArray(entry.blocks) && entry.blocks.length > 0
        const fallbackSource = hasStoredBlocks
            ? []
            : (fallback ? defaultBlocksFor(fallback) : createDefaultBlocksByPage(id, title, description, accentColor))
        const fallbackBlocks = fallbackSource.map((block) => ({
            ...block,
            content: {
                ...(block.content ?? {}),
                items: Array.isArray(block.content?.items)
                    ? block.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                    : [],
            },
            style: { ...(block.style ?? {}) },
        }))
        const blocks = migrateLegacyBuilderPage(
            id,
            title,
            description,
            accentColor,
            normalizeSitePageBlocks(entry.blocks, fallbackBlocks)
        )
        normalizedPages.push({
            id,
            title,
            path,
            description,
            category,
            status,
            editor,
            template,
            navLabel,
            showInNavigation,
            previewPath,
            accentColor,
            notes,
            order,
            locked,
            blocks,
        })
    })

    for (const defaultPage of staticSiteArchitecture.pages) {
        if (!normalizedPages.some((page) => page.id === defaultPage.id)) {
            normalizedPages.push({
                ...defaultPage,
                blocks: defaultBlocksFor(defaultPage).map((block) => ({
                    ...block,
                    content: {
                        ...(block.content ?? {}),
                        items: Array.isArray(block.content?.items)
                            ? block.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                            : [],
                    },
                    style: { ...(block.style ?? {}) },
                })),
            })
        }
    }

    normalizedPages.sort((a, b) => a.order - b.order)
    return {
        pages: normalizedPages.map((page, index) => ({ ...page, order: index })),
    }
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
    const siteArchitecture = normalizeSiteArchitecture(stored.siteArchitecture)
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
    const normalizeBlockOrder = <T extends string>(rawValue: unknown, fallback: readonly T[]): T[] => {
        const valid = new Set(fallback)
        const fromRaw = Array.isArray(rawValue) ? rawValue.filter((value): value is T => typeof value === 'string' && valid.has(value as T)) : []
        const unique = [...new Set(fromRaw)]
        for (const value of fallback) {
            if (!unique.includes(value)) unique.push(value)
        }
        return unique as T[]
    }
    const blockOrder = {
        services: normalizeBlockOrder((rawLayout as any)?.blockOrder?.services, staticHomePage.layout.blockOrder.services),
        products: normalizeBlockOrder((rawLayout as any)?.blockOrder?.products, staticHomePage.layout.blockOrder.products),
        frameworks: normalizeBlockOrder((rawLayout as any)?.blockOrder?.frameworks, staticHomePage.layout.blockOrder.frameworks),
        contact: normalizeBlockOrder((rawLayout as any)?.blockOrder?.contact, staticHomePage.layout.blockOrder.contact),
    } as HomeBlockOrderMap
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
                itemLimit: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.services?.grid?.itemLimit?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.services.grid.itemLimit[viewport]
                        : staticHomePage.layout.blockStyleOverrides.services.grid.itemLimit[viewport]
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
                itemLimit: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.products?.cards?.itemLimit?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.products.cards.itemLimit[viewport]
                        : staticHomePage.layout.blockStyleOverrides.products.cards.itemLimit[viewport]
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
                itemLimit: HOME_RESPONSIVE_VIEWPORTS.reduce((acc, viewport) => {
                    acc[viewport] = typeof (rawLayout as any)?.blockStyleOverrides?.frameworks?.items?.itemLimit?.[viewport] === 'string'
                        ? (rawLayout as any).blockStyleOverrides.frameworks.items.itemLimit[viewport]
                        : staticHomePage.layout.blockStyleOverrides.frameworks.items.itemLimit[viewport]
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
    const normalizedDesign = { ...defaultDesign, ...design }
    if (normalizedDesign.fontBody === 'Inter' && normalizedDesign.fontDisplay === 'Inter') {
        normalizedDesign.fontBody = 'Space Grotesk'
        normalizedDesign.fontDisplay = 'Space Grotesk'
    }
    if (normalizedDesign.fontBody === 'Space Grotesk' && normalizedDesign.fontDisplay === 'Fraunces') {
        normalizedDesign.fontDisplay = 'Space Grotesk'
    }

    return {
        services,
        products,
        hero: { ...staticHero, ...hero },
        site: { ...staticSite, ...site },
        design: normalizedDesign,
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
                blockOrder,
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
        siteArchitecture,
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
            siteArchitecture: state.siteArchitecture,
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
    updateSiteArchitecture: (data: Partial<SiteArchitecture>) => void
    addSiteArchitecturePage: (page: SiteArchitecturePage) => void
    updateSiteArchitecturePage: (id: string, data: Partial<SiteArchitecturePage>) => void
    deleteSiteArchitecturePage: (id: string) => void
    reorderSiteArchitecturePage: (id: string, direction: 'up' | 'down') => void
    resetDesign: () => void

    resetToDefaults: () => void
}

const CMSContext = createContext<CMSContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CMSProvider({ children }: { children: ReactNode }) {
    // El sondeo y el historial del CMS solo tienen sentido dentro del panel de
    // administracion. En el sitio publico el snapshot se lee una vez al arrancar.
    const { pathname } = useLocation()
    const isAdminSurface = pathname.startsWith('/admin')

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
    const prewarmTimerRef = useRef<number | null>(null)
    const prewarmInFlightRef = useRef(false)
    const queuedPrewarmRef = useRef<{ hash: string; changedSections: string[] } | null>(null)
    const lastPrewarmedHashRef = useRef('')

    // Inject design tokens on mount and whenever they change
    useEffect(() => {
        injectDesignTokens(state.design)
    }, [state.design])

    // Si al normalizar falto el modulo de contenidos por defecto (paginas
    // ausentes del snapshot, o el servidor caido), se carga aparte y se vuelve
    // a normalizar ya con los bloques completos.
    useEffect(() => {
        if (!deferredDefaultsPending) return
        let cancelled = false
        void loadDefaultPageBlocks().then(() => {
            deferredDefaultsPending = false
            if (cancelled) return
            setState((current) => normalizeCMSState(current))
        })
        return () => { cancelled = true }
    }, [state.siteArchitecture])

    useEffect(() => {
        let cancelled = false

        const hydrate = async () => {
            try {
                // En publico la respuesta la sirve el CDN (ver api/cms.ts); en el
                // panel pedimos siempre la version viva para no editar sobre cache.
                const res = await fetch(isAdminSurface ? '/api/cms?fresh=1' : '/api/cms')
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
        // Solo se hidrata una vez por carga; isAdminSurface se lee en ese momento.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const getChangedSections = useCallback((base: CMSState, next: CMSState) => {
        const sections: Array<keyof CMSState> = ['hero', 'services', 'products', 'site', 'design', 'homePage', 'siteArchitecture']
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

    const runTranslationPrewarm = useCallback(async (hash: string, changedSections: string[]) => {
        const targetSections = Array.from(new Set(changedSections.filter(section => section !== 'design')))
        if (targetSections.length === 0) return
        if (hash === lastPrewarmedHashRef.current) return

        if (prewarmInFlightRef.current) {
            queuedPrewarmRef.current = { hash, changedSections: targetSections }
            return
        }

        prewarmInFlightRef.current = true
        try {
            const res = await fetch('/api/cms-prewarm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ changedSections: targetSections }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            lastPrewarmedHashRef.current = hash
        } catch (error) {
            console.warn('CMS translation prewarm failed (non-blocking)', error)
        } finally {
            prewarmInFlightRef.current = false
            const queued = queuedPrewarmRef.current
            if (queued && queued.hash !== lastPrewarmedHashRef.current) {
                queuedPrewarmRef.current = null
                void runTranslationPrewarm(queued.hash, queued.changedSections)
            } else {
                queuedPrewarmRef.current = null
            }
        }
    }, [])

    const scheduleTranslationPrewarm = useCallback((hash: string, changedSections: string[]) => {
        const targetSections = Array.from(new Set(changedSections.filter(section => section !== 'design')))
        if (targetSections.length === 0) return
        if (prewarmTimerRef.current) window.clearTimeout(prewarmTimerRef.current)
        prewarmTimerRef.current = window.setTimeout(() => {
            void runTranslationPrewarm(hash, targetSections)
        }, 12000) as unknown as number
    }, [runTranslationPrewarm])

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
            const changedSections = Array.isArray(json?.changedSections)
                ? (json.changedSections as unknown[]).filter((section): section is string => typeof section === 'string')
                : []
            lastServerHash.current = hash
            lastServerStateRef.current = snapshot
            setPersistence(prev => ({
                ...prev,
                status: 'saved',
                pendingChanges: false,
                retryCount: 0,
                lastSavedAt: json?.savedAt || new Date().toISOString(),
                changedSections,
                lastError: null,
            }))
            scheduleTranslationPrewarm(hash, changedSections)
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
    }, [refreshHistory, scheduleTranslationPrewarm])

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
        // Antes esto corria para cualquier visitante: 12 invocaciones serverless
        // y 12 consultas a la base por minuto y por pestana abierta.
        if (!isAdminSurface) return

        const interval = window.setInterval(async () => {
            if (document.hidden) return
            try {
                const res = await fetch('/api/cms?fresh=1', { credentials: 'include' })
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
    }, [serverSyncReady, isAdminSurface])

    useEffect(() => {
        if (!serverSyncReady || !isAdminSurface) return
        void refreshHistory()
    }, [serverSyncReady, isAdminSurface, refreshHistory])

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!persistence.pendingChanges) return
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [persistence.pendingChanges])

    useEffect(() => {
        return () => {
            if (prewarmTimerRef.current) window.clearTimeout(prewarmTimerRef.current)
        }
    }, [])

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
            const nextRes = await fetch('/api/cms?fresh=1', { credentials: 'include' })
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

    const updateSiteArchitecture = useCallback((data: Partial<SiteArchitecture>) => {
        setState(prev => {
            const next = normalizeCMSState({
                ...prev,
                siteArchitecture: {
                    ...prev.siteArchitecture,
                    ...data,
                },
            } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const addSiteArchitecturePage = useCallback((page: SiteArchitecturePage) => {
        setState(prev => {
            const next = normalizeCMSState({
                ...prev,
                siteArchitecture: {
                    pages: [...prev.siteArchitecture.pages, page],
                },
            } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const updateSiteArchitecturePage = useCallback((id: string, data: Partial<SiteArchitecturePage>) => {
        setState(prev => {
            const next = normalizeCMSState({
                ...prev,
                siteArchitecture: {
                    pages: prev.siteArchitecture.pages.map((page) => page.id === id ? { ...page, ...data } : page),
                },
            } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const deleteSiteArchitecturePage = useCallback((id: string) => {
        setState(prev => {
            const target = prev.siteArchitecture.pages.find((page) => page.id === id)
            if (!target || target.locked) return prev
            const next = normalizeCMSState({
                ...prev,
                siteArchitecture: {
                    pages: prev.siteArchitecture.pages.filter((page) => page.id !== id),
                },
            } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const reorderSiteArchitecturePage = useCallback((id: string, direction: 'up' | 'down') => {
        setState(prev => {
            const sorted = [...prev.siteArchitecture.pages].sort((a, b) => a.order - b.order)
            const index = sorted.findIndex((page) => page.id === id)
            if (index === -1) return prev
            const swapIndex = direction === 'up' ? index - 1 : index + 1
            if (swapIndex < 0 || swapIndex >= sorted.length) return prev
            const [moved] = sorted.splice(index, 1)
            sorted.splice(swapIndex, 0, moved)
            const reordered = sorted.map((page, position) => ({ ...page, order: position }))
            const next = normalizeCMSState({
                ...prev,
                siteArchitecture: {
                    pages: reordered,
                },
            } as Partial<CMSState>)
            saveToStorage(next)
            return next
        })
    }, [])

    const resetToDefaults = useCallback(() => {
        // Restaurar valores de fabrica necesita los bloques reales, asi que se
        // espera al modulo diferido antes de reconstruir el estado.
        void loadDefaultPageBlocks().then(() => {
        const fresh: CMSState = {
            services: staticServices.map(s => ({ ...s })),
            products: staticProducts.map(p => ({ ...p })),
            hero: staticHero,
            site: staticSite,
            design: defaultDesign,
            homePage: staticHomePage,
            siteArchitecture: {
                pages: staticSiteArchitecture.pages.map((page) => ({
                    ...page,
                    blocks: defaultBlocksFor(page).map((block) => ({
                        ...block,
                        content: {
                            ...(block.content ?? {}),
                            items: Array.isArray(block.content?.items)
                                ? block.content.items.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item))
                                : [],
                        },
                        style: { ...(block.style ?? {}) },
                    })),
                })),
            },
        }
        persist(fresh)
        injectDesignTokens(defaultDesign)
        })
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
            updateSiteArchitecture,
            addSiteArchitecturePage,
            updateSiteArchitecturePage,
            deleteSiteArchitecturePage,
            reorderSiteArchitecturePage,
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
