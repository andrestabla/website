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

const SERVICES_LANDING_RESULTS = [
    { title: 'Menos costos ocultos', body: 'Detectamos tareas repetitivas y errores operativos que hoy consumen tiempo y presupuesto.' },
    { title: 'Equipos más enfocados', body: 'Tu gente trabaja en decisiones importantes, no en apagar incendios todos los días.' },
    { title: 'Mejor experiencia para clientes', body: 'Procesos más ordenados se traducen en respuestas más rápidas y servicio más confiable.' },
    { title: 'Crecimiento con control', body: 'Escalas con una base sólida, sin depender de esfuerzos manuales difíciles de sostener.' },
]

const SERVICES_LANDING_WORKFLOW = [
    { title: '1. Escuchamos tu contexto', body: 'Partimos de tus metas de negocio, no de herramientas o modas.' },
    { title: '2. Definimos prioridades', body: 'Mostramos qué hacer primero para obtener resultados visibles en menor tiempo.' },
    { title: '3. Ejecutamos contigo', body: 'Diseñamos, implementamos y acompañamos a tu equipo durante todo el proceso.' },
    { title: '4. Medimos y mejoramos', body: 'Revisamos resultados y ajustamos para mantener el impacto en el tiempo.' },
]

const SERVICES_LANDING_FAQ = [
    {
        title: '¿Necesito tener un área de tecnología para empezar?',
        body: 'No. Traducimos lo técnico a decisiones de negocio para avanzar con claridad.',
    },
    {
        title: '¿Esto sirve para empresas pequeñas o solo grandes compañías?',
        body: 'Funciona para ambos casos. Ajustamos alcance según tamaño, etapa y prioridades de la empresa.',
    },
    {
        title: '¿Cuándo se empiezan a ver resultados?',
        body: 'Desde las primeras fases se identifican mejoras rápidas en orden, tiempos y foco operativo.',
    },
    {
        title: '¿Qué pasa después de implementar?',
        body: 'Seguimos contigo para medir desempeño, corregir desviaciones y mantener mejora continua.',
    },
]

const EDUCATION_LANDING_WORKFLOW = [
    { title: '1. Diagnóstico y Análisis', body: 'Evaluamos el ecosistema digital actual y las necesidades pedagógicas de la institución.' },
    { title: '2. Diseño de Solución', body: 'Co-creamos una hoja de ruta que integre tecnología, metodología activa y formación docente.' },
    { title: '3. Implementación Estratégica', body: 'Desplegamos plataformas, producimos contenidos y certificamos competencias digitales.' },
    { title: '4. Seguimiento y Evolución', body: 'Acompañamos la adopción del modelo para asegurar resultados académicos y operativos.' },
]

const EDUCATION_LANDING_FAQ = [
    {
        title: '¿Cómo aseguran la calidad pedagógica en la virtualización?',
        body: 'Trabajamos con expertos en diseño instruccional que aseguran que el contenido sea efectivo, motivador y centrado en el estudiante.',
    },
    {
        title: '¿Sus plataformas son compatibles con sistemas que ya usamos?',
        body: 'Sí, implementamos soluciones que se integran con sus sistemas académico-administrativos existentes mediante estándares abiertos.',
    },
    {
        title: '¿En qué consiste la formación para docentes?',
        body: 'Es un acompañamiento práctico donde los docentes aprenden a usar herramientas digitales mientras rediseñan sus propias experiencias de aprendizaje.',
    },
    {
        title: '¿Ofrecen soporte técnico post-implementación?',
        body: 'No solo soporte técnico, sino acompañamiento en la adopción del modelo educativo para garantizar que la inversión genere impacto real.',
    },
]

const EDUCATION_LANDING_CLIENTS = [
    {
        id: 'cliente-1',
        title: 'CESA',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/CESA.svg',
    },
    {
        id: 'cliente-2',
        title: 'Ibero',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/ibero.png',
    },
    {
        id: 'cliente-3',
        title: 'La Salle',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/La-Salle-color-RGB.png',
    },
    {
        id: 'cliente-4',
        title: 'Mobile Citi Academy',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO+MOBILE+CITI+ACADEMY+VF.png',
    },
    {
        id: 'cliente-5',
        title: 'Inetum',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/LOGO_INETUM.jpg',
    },
    {
        id: 'cliente-6',
        title: 'UDI',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/logos-udi-1-02.png',
    },
    {
        id: 'cliente-7',
        title: 'San Martín',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SanMarti%CC%81n.png',
    },
    {
        id: 'cliente-8',
        title: 'Santo Tomás',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/SANTO_TOMA%CC%81S_Principal.webp',
    },
    {
        id: 'cliente-9',
        title: 'UTB',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/UTB.png',
    },
    {
        id: 'cliente-10',
        title: 'CA3',
        logoUrl: 'https://imageneseiconos.s3.us-east-1.amazonaws.com/logos/Logo+CA3.svg',
    },
]

const PLATAFORMAS_LANDING_WORKFLOW = [
    { title: '1. Despliegue', body: 'Instalación y configuración de la infraestructura tecnológica base de acuerdo con los requerimientos operativos y de seguridad.' },
    { title: '2. Personalización', body: 'Adaptación de la interfaz gráfica al libro de marca y configuración de reglas funcionales específicas del modelo.' },
    { title: '3. Documentación y transferencia', body: 'Entrega de manuales técnicos, guías de usuario y capacitación a los roles clave para asegurar independencia técnica.' },
    { title: '4. Administración y soporte', body: 'Servicio de mantenimiento, monitoreo y soporte a usuarios para garantizar la continuidad y evolución del sistema.' },
]

const PLATAFORMAS_LANDING_FEATURES = [
    'Reportes y analíticas de aprendizaje',
    'Control del progreso de avance por curso',
    'Experiencia de usuario personalizada según roles',
    'Flujo de certificación automática',
    'Pasarela de pagos',
    'Herramienta de autoría de contenidos integrada',
    'Rutas de aprendizaje personalizadas',
    'Sistemas de videoconferencias integrados',
    'Sistema de notificaciones personalizadas',
    'Gamificación configurable por grupos o cursos',
    'Bloques de valoración de cursos y contenidos',
    'Sistema de recomendación de cursos',
    'Más de 50 funcionalidades adicionales...'
]

type PlainServiceCopy = {
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

function createServicesLandingBlocks(_pageTitle: string): SitePageBlock[] {
    const serviceItems = staticServices.map((service, index) => {
        const plain = getServicesPlainCopy(service.slug, service.description)
        return {
            id: `service-${index + 1}`,
            eyebrow: `Servicio ${index + 1}`,
            title: service.title,
            inSimpleWords: plain.inSimpleWords,
            businessBenefit: plain.businessBenefit,
            idealWhen: plain.idealWhen,
            outcomes: plain.outcomes,
            label: 'Ver detalle del servicio',
            url: `/servicios/${service.slug}`,
        }
    })

    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero principal',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Servicios explicados sin tecnicismos',
                title: 'Te ayudamos a modernizar tu empresa paso a paso, con decisiones simples y enfocadas en resultados.',
                body: 'Diseñamos e implementamos mejoras reales para AlgoritmoT: menos fricción operativa, más orden interno y un mejor servicio para tus clientes.',
                primaryLabel: 'Ver servicios',
                primaryHref: '/#servicios-explicados',
                secondaryLabel: 'Quiero asesoría',
                secondaryHref: '/#contacto-simple',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'promesas',
            type: 'feature-list',
            name: 'Promesas principales',
            visible: true,
            order: 1,
            content: {
                title: 'Hablamos en lenguaje de negocio',
                body: 'Acompañamos el proceso de extremo a extremo.',
                items: [
                    'Hablamos en lenguaje de negocio',
                    'Priorizamos impacto antes que complejidad',
                    'Acompañamos desde diagnóstico hasta mejora',
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                columns: '3',
                paddingY: '2rem',
            },
        },
        {
            id: 'servicios',
            type: 'grid',
            name: 'Servicios explicados',
            visible: true,
            order: 2,
            content: {
                eyebrow: 'Servicios de punta a punta',
                title: 'Qué hacemos y cómo beneficia a tu empresa',
                body: 'Cada servicio está explicado en tres preguntas simples: qué es, cómo te ayuda y cuándo te conviene.',
                items: serviceItems,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'beneficios',
            type: 'grid',
            name: 'Beneficios directos',
            visible: true,
            order: 3,
            content: {
                eyebrow: 'Lo que puedes esperar',
                title: 'Beneficios directos para el negocio',
                body: 'Resultados visibles para operación y crecimiento con foco en impacto real.',
                items: SERVICES_LANDING_RESULTS,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '1',
                paddingY: '5rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Cómo trabajamos',
            visible: true,
            order: 4,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Cómo trabajamos',
                items: SERVICES_LANDING_WORKFLOW,
                badges: ['Rapidez', 'Acompañamiento', 'Control'],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '4rem',
            },
        },
        {
            id: 'faq',
            type: 'accordion',
            name: 'Preguntas frecuentes',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Preguntas frecuentes',
                title: 'Respuestas claras para tomar decisiones',
                items: SERVICES_LANDING_FAQ,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Canales de contacto',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Hablemos de tu caso',
                title: 'Cuéntanos qué quieres mejorar',
                body: 'Te ayudamos a definir el mejor punto de inicio según tus objetivos de negocio y tu contexto actual.',
                email: staticSite.contactEmail,
                secondaryLabel: 'LinkedIn de AlgoritmoT',
                secondaryHref: staticSite.linkedin,
                formNameLabel: 'Identificación',
                formNamePlaceholder: 'Tu nombre',
                formEmailLabel: 'Canal de comunicación',
                formEmailPlaceholder: 'email@ejemplo.com',
                formRequirementLabel: 'Requerimiento técnico',
                formRequirementPlaceholder: '¿En qué fase de tu transformación digital te encuentras?',
                primaryLabel: 'Contactar ahora',
                primaryHref: '/#contacto',
                complianceText: 'Cumplimos con normativas de privacidad GDPR. Tus datos están seguros bajo protocolo SSL.',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'cta',
            type: 'cta',
            name: 'Cierre con CTA',
            visible: true,
            order: 7,
            content: {
                eyebrow: 'Cierre con CTA',
                title: '¿Listo para avanzar?',
                body: 'Agenda una conversación para priorizar decisiones y próximos pasos.',
                primaryLabel: 'Hablar con un asesor',
                primaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '4rem',
            },
        },
    ]

    return blocks.map((block, index) => ({ ...block, order: index }))
}

function createClassicHomeBlocks(pageTitle: string, pageDescription: string, accentColor: string): SitePageBlock[] {
    const servicesItems = staticServices.map((service) => ({
        title: service.title,
        body: service.description,
        url: `/servicios/${service.slug}`,
    }))
    const productsItems = staticProducts.map((product) => ({
        title: product.title,
        body: product.description,
        value: product.price,
        url: `/productos/${product.slug}`,
    }))
    const frameworksItems = defaultContent.frameworks.items.map((item) => ({
        title: item.organization,
        body: `${item.name}: ${item.description}`,
    }))

    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero clásico',
            visible: true,
            order: 0,
            content: {
                eyebrow: staticHero.highlight,
                title: pageTitle,
                subtitle: staticHero.title,
                body: pageDescription || staticHero.subtitle,
                primaryLabel: staticHero.cta || 'Iniciar transformación',
                primaryHref: '/#contacto',
                secondaryLabel: staticHero.secondaryCta || 'Ver servicios',
                secondaryHref: '/#servicios',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'servicios',
            type: 'grid',
            name: 'Servicios',
            visible: true,
            order: 1,
            content: {
                title: staticHomePage.servicesSection.title,
                body: staticHomePage.servicesSection.subtitle,
                items: servicesItems,
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '4rem',
            },
        },
        {
            id: 'productos',
            type: 'grid',
            name: 'Productos',
            visible: true,
            order: 2,
            content: {
                title: staticHomePage.productsSection.title,
                body: staticHomePage.productsSection.subtitle,
                items: productsItems,
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '4rem',
            },
        },
        {
            id: 'frameworks',
            type: 'feature-list',
            name: 'Frameworks y confianza',
            visible: true,
            order: 3,
            content: {
                title: staticHomePage.frameworksSection.title,
                body: staticHomePage.frameworksSection.subtitle,
                items: frameworksItems.map((item) => item.body),
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                columns: '2',
                paddingY: '4rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto',
            visible: true,
            order: 4,
            content: {
                title: `${staticHomePage.contactSection.titlePrefix} ${staticHomePage.contactSection.titleAccent}`,
                body: 'Canales directos para iniciar una conversación estratégica.',
                email: staticSite.contactEmail,
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3.5rem',
            },
        },
        {
            id: 'cta',
            type: 'cta',
            name: 'Cierre con CTA',
            visible: true,
            order: 5,
            content: {
                title: 'Iniciar transformación',
                body: 'Activa la siguiente etapa con un plan claro de ejecución.',
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

    return blocks.map((block, index) => ({ ...block, order: index }))
}

function createTransversalCaseBlocks(): SitePageBlock[] {
    const serviceBySlug = new Map(staticServices.map((service) => [service.slug, service]))
    const flowStates = [
        'Reporte del incidente',
        'Triage y clasificación',
        'Asignación del caso',
        'Investigación',
        'Definición de medidas',
        'Verificación de cumplimiento',
        'Cierre del caso',
        'Evaluación de efectividad',
    ]

    const serviceAppliedItems = [
        {
            slug: 'captura-adn',
            icon: 'Search',
            what: 'Entendimos cómo funcionaba la gestión de incidentes en campo, desde el reporte hasta la revisión de medidas.',
            purpose: 'Identificar fricciones reales, puntos de fuga, tareas repetidas y decisiones críticas.',
            value: 'Se evitó una solución genérica y se intervino exactamente donde se perdía tiempo y control.',
        },
        {
            slug: 'mapeo-procesos',
            icon: 'Network',
            what: 'Convertimos un proceso disperso en un flujo único con estados, responsables, reglas y criterios comunes.',
            purpose: 'Ordenar la operación y eliminar ambigüedades entre áreas.',
            value: 'Menos reproceso, menos dependencia de memoria individual y más consistencia entre sedes.',
        },
        {
            slug: 'humano-vs-tecnologia',
            icon: 'Users',
            what: 'Definimos qué actividades se mantenían bajo criterio humano y cuáles se automatizaban.',
            purpose: 'Evitar sobreautomatizar decisiones sensibles y automatizar lo repetitivo.',
            value: 'El equipo SST se enfocó en investigar, decidir y prevenir; el sistema en alertar y trazar.',
        },
        {
            slug: 'diseno-desarrollo',
            icon: 'Code2',
            what: 'Construimos el módulo digital de incidentes con registro, evidencias, responsables, planes y estados.',
            purpose: 'Convertir el proceso rediseñado en una herramienta operativa real.',
            value: 'Solución hecha sobre su forma de operar, no una adaptación forzada a plantilla.',
        },
        {
            slug: 'implementacion',
            icon: 'Rocket',
            what: 'Desplegamos por fases, con piloto por sedes y capacitación por rol.',
            purpose: 'Poner la solución en marcha sin detener la operación.',
            value: 'Transición controlada, menor resistencia al cambio y adopción más rápida.',
        },
        {
            slug: 'seguimiento-mejora',
            icon: 'LineChart',
            what: 'Activamos tableros, comités de revisión e indicadores de evolución.',
            purpose: 'Medir desempeño y corregir desviaciones con datos reales.',
            value: 'El sistema no quedó instalado y olvidado: siguió mejorando mes a mes.',
        },
    ]

    const serviceJourneyItems = serviceAppliedItems.map((entry, index) => {
        const service = serviceBySlug.get(entry.slug)
        return {
            id: `servicio-${index + 1}`,
            eyebrow: `Servicio ${index + 1}`,
            icon: entry.icon,
            title: service?.title || `Servicio ${index + 1}`,
            body: entry.what,
            what: entry.what,
            purpose: entry.purpose,
            valueText: entry.value,
            label: 'Ver servicio',
            url: service ? `/servicios/${service.slug}` : '',
        }
    })

    const productItems = [
        {
            icon: 'MapPin',
            title: 'Diagnóstico MD-IA',
            body: 'Evaluación integral de madurez digital e IA aplicada a la operación. Dejó línea base, brechas críticas y ruta de transformación por sede.',
            url: '/productos/diagnostico-md-ia',
        },
        {
            icon: 'Settings2',
            title: 'Módulo Operativo de Gestión de Incidentes SST',
            body: 'Sistema para registrar, investigar, asignar, controlar y cerrar incidentes con trazabilidad de punta a punta.',
            url: '/productos/prototipo-funcional',
        },
        {
            icon: 'BarChart3',
            title: 'Tablero Ejecutivo y Analítica en Tiempo Real',
            body: 'Capa de visualización para operación y dirección: criticidad, SLA, cumplimiento de medidas y evolución por sede.',
            url: '#vista-ejecutiva',
        },
        {
            icon: 'Infinity',
            title: 'Retainer de Mejora Continua',
            body: 'Acompañamiento post-lanzamiento para optimizar alertas, reglas de seguimiento, indicadores y adopción continua.',
            url: '/productos/retainer-mejora',
        },
    ]

    const serviceToProductItems = [
        { title: 'Captura del ADN', body: 'Diagnóstico de operación actual y mapa de fricciones' },
        { title: 'Mapeo de procesos', body: 'Flujo validado y rediseñado con reglas comunes' },
        { title: 'Decisión humano vs tecnología', body: 'Modelo de automatización con control de riesgos' },
        { title: 'Diseño y desarrollo', body: 'Módulo operativo SST en producción' },
        { title: 'Implementación', body: 'Despliegue por fases y adopción por rol' },
        { title: 'Seguimiento continuo', body: 'Tablero ejecutivo + retainer de mejora' },
    ]

    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Caso transversal · Hero',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Caso real: salud y seguridad en el trabajo',
                title: 'De reportes por WhatsApp a control operativo en tiempo real',
                subtitle: 'Una empresa de salud y seguridad en el trabajo pasó de llamadas, correos y Excel a un flujo digital único, trazabilidad de punta a punta, responsables visibles, alertas automáticas y analítica en vivo.',
                body: 'Antes: cada incidente se reportaba por un canal distinto y el seguimiento dependía de perseguir personas. Después: cada caso entra a un solo flujo, queda asignado, se documenta con evidencia, activa medidas, controla vencimientos y permite evaluar resultados en tiempo real.',
                primaryLabel: 'Ver transformación completa',
                primaryHref: '#situacion-inicial',
                secondaryLabel: 'Ver resultados',
                secondaryHref: '#resultados-caso',
            },
            style: {
                backgroundColor: '#020617',
                backgroundGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
                textColor: '#f8fafc',
                align: 'left',
                paddingY: '7.5rem',
            },
        },
        {
            id: 'kpis-top',
            type: 'counter',
            name: 'KPIs principales',
            visible: true,
            order: 1,
            content: {
                title: 'Impacto visible desde el inicio',
                anchor: 'resultados-caso',
                items: [
                    {
                        label: 'Menos tiempo de respuesta al reporte inicial',
                        value: 71,
                        prefix: '-',
                        suffix: '%',
                        trend: '↓',
                        status: 'ok',
                        description: 'Se eliminaron transcripciones y reenvíos manuales.',
                    },
                    {
                        label: 'Incidentes con trazabilidad completa',
                        value: 96,
                        suffix: '%',
                        trend: '↑',
                        status: 'ok',
                        description: 'Cada caso quedó conectado con responsable, evidencia y cierre.',
                    },
                    {
                        label: 'Medidas correctivas verificadas a tiempo',
                        value: 89,
                        suffix: '%',
                        trend: '↑',
                        status: 'ok',
                        description: 'Las acciones pasaron de intención a gestión controlada.',
                    },
                ],
            },
            style: {
                backgroundColor: '#020617',
                textColor: '#f8fbff',
                align: 'left',
                paddingY: '3.5rem',
            },
        },
        {
            id: 'caso-descripcion',
            type: 'richtext',
            name: 'Caso explicado',
            visible: true,
            order: 2,
            content: {
                title: 'Caso real: salud y seguridad en el trabajo',
                html: '<p>Una empresa de SST gestionaba incidentes desde múltiples canales: llamadas, WhatsApp, correos y hojas de cálculo. Cada área hacía seguimiento por separado, sin una vista consolidada del caso ni del riesgo operativo.</p><p>El resultado era predecible: tiempos largos de respuesta, tareas duplicadas, medidas correctivas sin cierre verificable, baja trazabilidad y poca capacidad para prevenir reincidencias.</p><p>Diseñamos e implementamos una solución integral para transformar ese proceso en una operación digital controlada, con seguimiento en tiempo real desde el reporte inicial hasta la evaluación de efectividad.</p>',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'fotos-caso',
            type: 'gallery',
            name: 'Fotos narrativas',
            visible: true,
            order: 3,
            content: {
                title: 'Momentos del proceso en campo',
                body: 'Reporte, seguimiento y comité de revisión en una sola narrativa visual.',
                items: [
                    {
                        title: 'Reporte en campo',
                        description: 'Registro inicial con criticidad y evidencia desde el origen.',
                        body: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1800&auto=format&fit=crop',
                    },
                    {
                        title: 'Seguimiento operativo',
                        description: 'Responsables, fechas y acciones visibles para todo el equipo SST.',
                        body: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1800&auto=format&fit=crop',
                    },
                    {
                        title: 'Comité con tablero',
                        description: 'Revisión de vencimientos, criticidad y avance de medidas.',
                        body: 'https://images.unsplash.com/photo-1581594549595-35f6edc7b762?q=80&w=1800&auto=format&fit=crop',
                    },
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                radius: '1.5rem',
                paddingY: '5rem',
            },
        },
        {
            id: 'situacion-inicial',
            type: 'text',
            name: 'Situación inicial',
            visible: true,
            order: 4,
            content: {
                anchor: 'situacion-inicial',
                eyebrow: 'Situación inicial',
                title: 'Qué ocurría antes',
                body: 'Cuando se presentaba un incidente, el reporte podía llegar por cualquier canal. Luego alguien lo transcribía manualmente a Excel o lo reenviaba por correo. Desde ahí, cada responsable seguía el caso desde su propia lógica, con formatos distintos y evidencia dispersa.',
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#334155',
                align: 'left',
                paddingY: '4.5rem',
            },
        },
        {
            id: 'consecuencias',
            type: 'feature-list',
            name: 'Consecuencias operativas',
            visible: true,
            order: 5,
            content: {
                title: 'Consecuencias operativas',
                body: 'Puntos críticos que impactaban tiempos, control y prevención.',
                items: [
                    'Reportes incompletos o duplicados',
                    'Investigación sin estándar único',
                    'Medidas correctivas sin control de ejecución',
                    'Cierres sin verificación de efectividad',
                    'Falta de priorización por criticidad',
                    'Cero visibilidad consolidada para comités y dirección',
                ],
            },
            style: {
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'transformacion',
            type: 'text',
            name: 'La transformación',
            visible: true,
            order: 6,
            content: {
                title: 'Qué transformamos',
                body: 'Pasamos de una gestión fragmentada a un flujo digital único de incidentes, con estados visibles, responsables definidos, evidencias centralizadas, alertas automáticas y tablero en vivo para seguimiento operativo y toma de decisiones.',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '4.5rem',
            },
        },
        {
            id: 'antes-despues',
            type: 'grid',
            name: 'Antes vs después',
            visible: true,
            order: 7,
            content: {
                title: 'Operación manual vs operación controlada',
                body: 'Comparación directa para entender el salto operativo.',
                items: [
                    {
                        icon: 'Boxes',
                        eyebrow: 'ANTES',
                        title: 'Antes',
                        body: 'Reportes en canales dispersos. Registro manual y duplicado. Investigación sin estándar único. Seguimiento por correos y llamadas. Medidas sin control visible. Cierres tardíos y sin evaluación consistente. Sin tablero consolidado.',
                    },
                    {
                        icon: 'CheckCircle2',
                        eyebrow: 'DESPUÉS',
                        title: 'Después',
                        body: 'Un solo flujo digital. Registro estructurado desde origen. Investigación con criterios comunes. Responsables y evidencias visibles. Alertas automáticas. Verificación y evaluación de efectividad. Tablero en vivo para decidir a tiempo.',
                    },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'servicios-aplicados',
            type: 'grid',
            name: 'Servicios aplicados',
            visible: true,
            order: 8,
            content: {
                title: 'Cómo acompañamos el cambio (6 servicios)',
                body: 'Hablamos menos en consultoría y más en qué hicimos, para qué sirvió y qué valor dejó.',
                items: serviceJourneyItems,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'flujo-operativo',
            type: 'timeline',
            name: 'Flujo de 8 estados',
            visible: true,
            order: 9,
            content: {
                title: 'El nuevo flujo operativo',
                items: flowStates.map((state, index) => ({
                    id: `estado-${index + 1}`,
                    title: `${index + 1}. ${state}`,
                    body: 'Estado controlado con responsable y evidencia.',
                })),
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'productos-generados',
            type: 'grid',
            name: 'Productos generados',
            visible: true,
            order: 10,
            content: {
                anchor: 'productos-generados',
                title: 'Productos generados por el proyecto',
                body: 'No solo hubo acompañamiento: quedaron instalados productos concretos para operar y escalar.',
                items: productItems.map((product, index) => ({
                    id: `producto-${index + 1}`,
                    icon: product.icon,
                    eyebrow: `Producto ${index + 1}`,
                    title: product.title,
                    body: product.body,
                    url: product.url,
                })),
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'servicio-producto',
            type: 'grid',
            name: 'Servicio → producto',
            visible: true,
            order: 11,
            content: {
                title: 'Qué hizo el servicio y qué producto dejó',
                body: 'Doble capa para conectar acompañamiento con entregables concretos.',
                items: serviceToProductItems.map((entry, index) => ({
                    id: `mapa-${index + 1}`,
                    icon: 'Link2',
                    title: entry.title,
                    body: entry.body,
                })),
            },
            style: {
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'arquitectura-simple',
            type: 'grid',
            name: 'Arquitectura simple',
            visible: true,
            order: 12,
            content: {
                title: 'Arquitectura simple del sistema',
                body: 'Usuario en campo → formulario de incidente → motor de estados → responsables → evidencias → alertas → dashboard → comité SST.',
                items: [
                    { icon: 'UserRound', title: 'Usuario en campo', body: 'Registra incidente con evidencia inicial.' },
                    { icon: 'ClipboardCheck', title: 'Formulario de incidente', body: 'Captura datos estructurados y criticidad.' },
                    { icon: 'Settings', title: 'Motor de estados', body: 'Orquesta el flujo y los cambios de estado.' },
                    { icon: 'Users', title: 'Responsables', body: 'Asigna dueño y fechas compromiso por tarea.' },
                    { icon: 'UploadCloud', title: 'Evidencias', body: 'Centraliza soportes para verificar acciones.' },
                    { icon: 'TriangleAlert', title: 'Alertas', body: 'Notifica vencimientos y riesgos prioritarios.' },
                    { icon: 'LayoutGrid', title: 'Dashboard', body: 'Visibilidad operativa y ejecutiva en vivo.' },
                    { icon: 'ShieldCheck', title: 'Comité SST', body: 'Decide, corrige y prioriza con datos.' },
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '4',
                paddingY: '6rem',
            },
        },
        {
            id: 'vista-ejecutiva',
            type: 'image',
            name: 'Vista ejecutiva',
            visible: true,
            order: 13,
            content: {
                anchor: 'vista-ejecutiva',
                title: 'Vista ejecutiva del sistema',
                body: 'La dirección ya no depende de reportes tardíos o fragmentados. En un solo tablero ve incidentes abiertos, criticidad, casos vencidos, avance de medidas, cumplimiento por sede y evolución mensual para decidir antes de que el problema escale.',
                previewMode: 'sst-dashboard',
                previewKpis: [
                    { label: 'Incidentes abiertos', value: 38, delta: '-14%', status: 'warn', note: '12 de alta criticidad' },
                    { label: 'Cumplimiento SLA', value: 87, delta: '+6%', status: 'ok', note: 'Mejora sostenida por sede' },
                    { label: 'Medidas en tiempo', value: 89, delta: '+9%', status: 'ok', note: 'Seguimiento con alertas activas' },
                    { label: 'Riesgo crítico', value: 11, delta: '-5 pts', status: 'risk', note: 'Tendencia a la baja mensual' },
                ],
                previewQueue: [
                    { title: 'Caída en planta norte', owner: 'SST Medellín', sla: '6h', status: 'En investigación' },
                    { title: 'Lesión lumbar en bodega', owner: 'SST Bogotá', sla: '4h', status: 'Medidas activas' },
                    { title: 'Incidente con montacargas', owner: 'SST Cali', sla: '2h', status: 'Escalado' },
                    { title: 'Falla de EPP en turno nocturno', owner: 'SST Barranquilla', sla: '8h', status: 'Verificación' },
                ],
                previewStages: [
                    { label: 'Reporte', value: 100 },
                    { label: 'Investigación', value: 93 },
                    { label: 'Medidas', value: 91 },
                    { label: 'Cierre', value: 87 },
                ],
                previewAlerts: [
                    { label: '4 casos vencen en menos de 24h' },
                    { label: '2 sedes requieren comité extraordinario' },
                    { label: '1 patrón repetitivo en incidentes locativos' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                radius: '1.5rem',
                maxHeight: '560px',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'resultados-comparativos',
            type: 'progress',
            name: 'Gráfica comparativa',
            visible: true,
            order: 14,
            content: {
                title: 'Gráfica de barras: antes vs después',
                body: 'Comparativo directo de los indicadores más comerciales del caso.',
                chartMode: 'compare',
                compareLabelA: 'Antes',
                compareLabelB: 'Después',
                items: [
                    { label: 'Tiempo promedio de respuesta inicial', before: 100, value: 29 },
                    { label: 'Tiempo promedio de cierre', before: 100, value: 44 },
                    { label: 'Trazabilidad completa de incidentes', before: 34, value: 96 },
                    { label: 'Medidas verificadas a tiempo', before: 38, value: 89 },
                    { label: 'Cierres dentro de SLA', before: 41, value: 87 },
                ],
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'semaforo-sedes',
            type: 'grid',
            name: 'Semáforo por sede',
            visible: true,
            order: 15,
            content: {
                title: 'Semáforo operativo por sede',
                body: 'Vista rápida para saber dónde hay control, dónde hay atención y dónde intervenir primero.',
                chartMode: 'semaforo',
                items: [
                    { title: 'Bogotá', value: 94, status: 'ok', body: 'Operación estable y medidas en cumplimiento.' },
                    { title: 'Medellín', value: 86, status: 'ok', body: 'Buen desempeño con foco en reducir tiempos de cierre.' },
                    { title: 'Cali', value: 74, status: 'warn', body: 'Aumentaron incidentes leves; se reforzó verificación semanal.' },
                    { title: 'Barranquilla', value: 62, status: 'risk', body: 'Desviación en SLA y evidencia incompleta en algunos casos.' },
                    { title: 'Bucaramanga', value: 88, status: 'ok', body: 'Alta trazabilidad y ejecución consistente por responsables.' },
                    { title: 'Manizales', value: 69, status: 'warn', body: 'Control parcial; en curso plan de mejora por criticidad.' },
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'donut-operacion',
            type: 'stats',
            name: 'Indicadores ejecutivos',
            visible: true,
            order: 16,
            content: {
                title: 'Indicadores ejecutivos en una mirada',
                body: 'Lectura rápida del estado operativo para comité y dirección.',
                chartMode: 'donut',
                items: [
                    {
                        label: 'Incidentes cerrados',
                        value: 78,
                        suffix: '%',
                        trend: '22% abiertos',
                        status: 'ok',
                        color: '#3b82f6',
                        description: 'La mayoría de casos ya completa su ciclo con verificación.',
                    },
                    {
                        label: 'Medidas en tiempo',
                        value: 89,
                        suffix: '%',
                        trend: '11% vencidas',
                        status: 'ok',
                        color: '#22c55e',
                        description: 'Seguimiento automático de compromisos y alertas activas.',
                    },
                    {
                        label: 'Cumplimiento promedio por sede',
                        value: 86,
                        suffix: '%',
                        trend: '+4 pts vs mes anterior',
                        status: 'warn',
                        color: '#f59e0b',
                        description: 'Evolución positiva con brechas controladas por sede.',
                    },
                ],
            },
            style: {
                backgroundColor: '#020617',
                textColor: '#f8fbff',
                align: 'left',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'heatmap-riesgo',
            type: 'grid',
            name: 'Heatmap de riesgo',
            visible: true,
            order: 17,
            content: {
                title: 'Heatmap por sede y tipo de incidente',
                body: 'Priorización por criticidad para actuar primero donde el riesgo operativo es mayor.',
                chartMode: 'heatmap',
                items: [
                    { area: 'Bogotá', risk: 'Biológico', value: 41, body: 'Controlado con protocolo reforzado.' },
                    { area: 'Bogotá', risk: 'Ergonómico', value: 33, body: 'Monitoreo preventivo mensual.' },
                    { area: 'Medellín', risk: 'Locativo', value: 58, body: 'Incidentes en descenso tras ajustes.' },
                    { area: 'Medellín', risk: 'Psicosocial', value: 46, body: 'Seguimiento por comité de bienestar.' },
                    { area: 'Cali', risk: 'Biológico', value: 67, body: 'Plan de contención y auditoría interna.' },
                    { area: 'Cali', risk: 'Mecánico', value: 72, body: 'Prioridad alta en medidas de mitigación.' },
                    { area: 'Barranquilla', risk: 'Locativo', value: 79, body: 'Zona crítica con control semanal.' },
                    { area: 'Barranquilla', risk: 'Ergonómico', value: 64, body: 'Ajustes en curso por reincidencia.' },
                ],
            },
            style: {
                backgroundColor: '#000000',
                textColor: '#f8fbff',
                align: 'left',
                columns: '4',
                paddingY: '5rem',
            },
        },
        {
            id: 'embudo-operativo',
            type: 'timeline',
            name: 'Embudo operativo',
            visible: true,
            order: 18,
            content: {
                title: 'Embudo del flujo de incidentes',
                body: 'Visualiza dónde se concentran cuellos de botella y cómo se corrigen.',
                items: [
                    { title: 'Reporte (100%)', body: 'Ingreso completo de casos al flujo digital.' },
                    { title: 'Triage (97%)', body: 'Clasificación rápida por criticidad y tipo.' },
                    { title: 'Asignación (95%)', body: 'Responsable y fecha compromiso definidos.' },
                    { title: 'Investigación (93%)', body: 'Análisis de causa con evidencia centralizada.' },
                    { title: 'Medidas (91%)', body: 'Acciones correctivas ejecutadas por prioridad.' },
                    { title: 'Verificación (89%)', body: 'Control de cumplimiento y calidad documental.' },
                    { title: 'Cierre (87%)', body: 'Cierre con criterios comunes y trazabilidad.' },
                    { title: 'Evaluación (84%)', body: 'Revisión de efectividad y prevención de reincidencias.' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5.5rem',
            },
        },
        {
            id: 'evolucion-mensual',
            type: 'progress',
            name: 'Evolución mensual',
            visible: true,
            order: 19,
            content: {
                title: 'Línea de evolución mensual',
                body: 'Medimos, analizamos, decidimos, ajustamos y volvemos a medir para sostener la mejora.',
                items: [
                    { label: 'Cumplimiento de planes de acción', value: 92 },
                    { label: 'Cierres dentro del SLA', value: 87 },
                    { label: 'Calidad documental en primera revisión', value: 86 },
                ],
            },
            style: {
                backgroundColor: '#f1f5f9',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'faq-caso',
            type: 'accordion',
            name: 'Preguntas frecuentes',
            visible: true,
            order: 20,
            content: {
                title: 'Preguntas frecuentes',
                items: [
                    {
                        title: '¿Cómo pasaron de manual a digital sin detener la operación?',
                        body: 'No se hizo de golpe. Primero se rediseñó el flujo, luego se probó en piloto por sedes y finalmente se desplegó por fases con capacitación por rol.',
                    },
                    {
                        title: '¿Qué cambió realmente en el seguimiento de medidas correctivas?',
                        body: 'Cada medida pasó a tener responsable, fecha compromiso, evidencia y estado visible. El seguimiento dejó de depender de perseguir personas por teléfono o correo.',
                    },
                    {
                        title: '¿Cómo se aprovecha la analítica en tiempo real?',
                        body: 'Los tableros permiten ver sedes con más incidentes, riesgos repetidos, acciones vencidas y casos que requieren intervención prioritaria para prevenir.',
                    },
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto',
            visible: true,
            order: 21,
            content: {
                title: '¿Tu operación sigue dependiendo de WhatsApp, correos y Excel?',
                body: 'Diseñamos soluciones a la medida para convertir procesos críticos en operación visible, trazable y medible en tiempo real.',
                email: staticSite.contactEmail,
                primaryLabel: 'Quiero transformar mi operación',
                primaryHref: '#cta-final',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'cta-final',
            type: 'cta',
            name: 'CTA final',
            visible: true,
            order: 22,
            content: {
                anchor: 'cta-final',
                title: '¿Listo para aplicar este modelo en tu empresa?',
                body: 'Te mostramos una ruta clara para pasar de procesos manuales a control operativo en tiempo real.',
                primaryLabel: 'Conoce cómo aplicar este modelo en tu empresa',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: '#020617',
                backgroundGradient: 'linear-gradient(115deg, #020617 0%, #0f172a 100%)',
                textColor: '#f8fafc',
                align: 'center',
                paddingY: '6.5rem',
            },
        },
    ]

    return blocks.map((block, index) => ({ ...block, order: index }))
}

function createNavigationSelectorBlocks(): SitePageBlock[] {
    return [
        {
            id: 'selector',
            type: 'navigation-selector',
            name: 'Selector de Navegación',
            visible: true,
            order: 0,
            content: {
                corporateTitle: 'SOLUCIONES PARA EMPRESA',
                corporateDescription: 'Optimización operativa, automatización de procesos y despliegue estratégico de IA.',
                corporateCta: 'INGRESAR',
                educationTitle: 'SOLUCIONES EDUCATIVAS',
                educationDescription: 'Transformación digital para instituciones, colegios y centros de formación técnica.',
                educationCta: 'INGRESAR',
                logoText: 'ALGORITMOT'
            },
            style: {
                backgroundColor: '#0f172a',
                paddingY: '0',
            }
        }
    ]
}
const VIRTUALIZACION_EXPERIENCIAS = [
    {
        title: 'Maestría en Entornos Globales',
        body: 'Virtualización 100% de posgrado con simuladores de negocios y foros internacionales.',
        url: '#maestria',
        imageUrl: 'https://images.unsplash.com/photo-1523240715637-891ee3f71f0a?w=800&q=80',
    },
    {
        title: 'Pregrado en Ingeniería Digital',
        body: 'Estructuración didáctica de 40 materias con laboratorios virtuales y realidad aumentada.',
        url: '#pregrado',
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
    },
    {
        title: 'Certificación en Liderazgo Ágil',
        body: 'Curso corto gamificado con entrega de micro-credenciales y badges digitales.',
        url: '#liderazgo',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    },
    {
        title: 'Diplomado en Data Science',
        body: 'Contenidos interactivos con cuadernos de Jupyter integrados y videoclases 4K.',
        url: '#datascience',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?w=800&q=80',
    },
    {
        title: 'Escuela de Ventas Corporativas',
        body: 'Fábrica de contenidos para 2,000 asesores con evaluaciones situacionales.',
        url: '#ventas',
        imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    },
    {
        title: 'Inducción de Talento Humano',
        body: 'Experiencia de onboarding inmersiva con storyboarding y personajes 3D.',
        url: '#induccion',
        imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    },
    {
        title: 'Especialización en Bioética',
        body: 'Migración masiva de contenidos legacy a estándares LTI y SCORM modernos.',
        url: '#bioetica',
        imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
    },
    {
        title: 'Bootcamp Code & Design',
        body: 'Formación intensiva basada en proyectos con mentorías sincrónicas y asincrónicas.',
        url: '#bootcamp',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    },
]

const VIRTUALIZACION_LANDING_WORKFLOW = [
    { title: 'Asesoría pedagógica', description: 'Definición de objetivos y estrategias de aprendizaje.' },
    { title: 'Autoría de contenidos', description: 'Creación de materiales por expertos temáticos.' },
    { title: 'Diseño instruccional', description: 'Estructuración pedagógica y didáctica del curso.' },
    { title: 'Corrección de estilo', description: 'Revisión gramatical y coherencia editorial.' },
    { title: 'Producción multimedia', description: 'Desarrollo de videos, interactivos y gráficos.' },
    { title: 'Montaje sobre LMS', description: 'Configuración y despliegue en la plataforma.' },
    { title: 'Quality Assurance', description: 'Pruebas rigurosas de funcionamiento y navegación.' },
    { title: 'Auditoría aulas virtuales', description: 'Verificación de estándares de calidad final.' },
]

function createEducationLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Principal',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Soluciones para universidades',
                title: 'Experiencias de aprendizaje auténticas',
                body: 'Diseñando programas académicos, formando docentes, produciendo contenidos educativos y optimizando la operación académico-administrativa.',
                primaryLabel: 'Conoce nuestra plataforma',
                primaryHref: '#servicios',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'promesas',
            type: 'feature-list',
            name: 'Cifras de Impacto',
            visible: true,
            order: 1,
            content: {
                title: 'Experiencia y resultados',
                items: [
                    '500+ Docentes formados',
                    '10+ Plataformas implementadas',
                    '100+ Programas diseñados',
                    '1500+ Cursos producidos'
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                columns: '4',
                paddingY: '2rem',
            },
        },
        {
            id: 'servicios',
            type: 'grid',
            name: 'Servicios Educación',
            visible: true,
            order: 2,
            content: {
                eyebrow: 'Nuestras Soluciones',
                title: 'Programas y plataformas de aprendizaje',
                body: 'Desarrollamos ecosistemas educativos que promueven la interacción y el aprendizaje activo.',
                items: [
                    {
                        id: 'plataformas-lms',
                        title: 'Plataformas de aprendizaje',
                        eyebrow: 'Infraestructura flexible',
                        inSimpleWords: 'Implementación de entornos virtuales que posibilitan experiencias de aprendizaje auténticas y escalables.',
                        businessBenefit: 'Centralización de la operación académica y trazabilidad de procesos.',
                        idealWhen: 'La institución necesita robustecer su presencia digital.',
                        label: 'Conocer más',
                        url: '#contacto',
                    },
                    {
                        id: 'virtualizacion',
                        title: 'Virtualización de programas',
                        eyebrow: 'Co-creación de contenidos',
                        inSimpleWords: 'Diseño de contenidos y programas mediados digitalmente con foco en el aprendizaje activo.',
                        businessBenefit: 'Oferta académica moderna, atractiva y de alta calidad pedagógica.',
                        idealWhen: 'Se busca transformar un programa presencial a una modalidad híbrida o virtual.',
                        label: 'Conocer más',
                        url: '#contacto',
                    },
                    {
                        id: 'auditoria-qm',
                        title: 'Auditoría de programas virtuales',
                        eyebrow: 'Calidad internacional',
                        inSimpleWords: 'Evaluación y certificación de la calidad pedagógica y técnica de tus cursos virtuales bajo estándares globales QM (Quality Matters).',
                        businessBenefit: 'Aseguramiento de la esencia académica y mejora en los índices de retención.',
                        idealWhen: 'Buscas validar la efectividad de tus programas o prepararte para acreditaciones.',
                        label: 'Conocer más',
                        url: '#contacto',
                    },
                    {
                        id: 'edu-digital',
                        title: 'Programa Educación digital',
                        eyebrow: 'Formación continua',
                        inSimpleWords: 'Capacitación integral para el cuerpo docente sobre herramientas y metodologías del siglo XXI.',
                        businessBenefit: 'Mejora en la calidad educativa y adopción tecnológica institucional.',
                        idealWhen: 'Se requiere actualizar las competencias digitales de los profesores.',
                        label: 'Conocer más',
                        url: '#contacto',
                    }
                ],
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Cómo trabajamos',
            visible: true,
            order: 3,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Cómo trabajamos',
                items: EDUCATION_LANDING_WORKFLOW,
                badges: ['Metodología', 'Acompañamiento', 'Innovación'],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '4rem',
            },
        },
        {
            id: 'clientes',
            type: 'carousel',
            name: 'Clientes',
            visible: true,
            order: 4,
            content: {
                title: 'Clientes',
                body: 'Instituciones y empresas que han confiado en nosotros',
                items: EDUCATION_LANDING_CLIENTS,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'faq',
            type: 'accordion',
            name: 'Preguntas frecuentes',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Preguntas frecuentes',
                title: 'Respuestas claras para tomar decisiones',
                items: EDUCATION_LANDING_FAQ,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto Educación',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus objetivos educativos',
                body: 'Cuéntanos sobre tus retos en formación y tecnología para diseñar una solución a medida.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createPlataformasLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Servicio',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Plataformas de aprendizaje',
                title: 'Implementa o evoluciona tu ecosistema digital para el aprendizaje',
                body: '',
                primaryLabel: 'Hablar con un consultor',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '8rem',
            },
        },
        {
            id: 'promesas',
            type: 'grid', // Will map to a grid essentially, or rely on renderPromisesBlock logic if it matches
            name: 'Tecnologías',
            visible: true,
            order: 1,
            content: {
                eyebrow: 'Tecnologías que posibilitan experiencias',
                items: [
                    { title: 'Campus virtual', body: 'Para el desarrollo de procesos de formación 100% en línea.' },
                    { title: 'Plataforma de aprendizaje', body: 'Para procesos de formación virtuales, presenciales o híbridos.' },
                    { title: 'Complementos', body: 'Tecnológicos que contribuyen al aprendizaje activo y en comunidad.' },
                ]
            },
            style: {
                backgroundColor: '#ffffff', // Fallback
                textColor: '#ffffff',
                align: 'left',
                columns: '3',
                paddingY: '6rem',
            },
        },
        {
            id: 'funcionalidades',
            type: 'feature-list',
            name: 'Funcionalidades',
            visible: true,
            order: 2,
            content: {
                title: 'Más que una plataforma...',
                items: PLATAFORMAS_LANDING_FEATURES.map((feat) => ({ title: feat }))
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '2',
                paddingY: '5rem',
            },
        },
        {
            id: 'clientes',
            type: 'carousel',
            name: 'Experiencias de Éxito',
            visible: true,
            order: 3,
            content: {
                title: 'Instituciones que confían en nosotros',
                body: 'Descubre cómo han transformado su operación educativa.',
                items: [
                    {
                        title: 'Universidad de la Innovación',
                        body: 'Implementación core de campus virtual para 5,000 estudiantes con analítica avanzada.',
                        url: '#caso-1',
                        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80',
                    },
                    {
                        title: 'Instituto Tecnológico Superior',
                        body: 'Virtualización de 15 programas técnicos con laboratorios remotos y simuladores.',
                        url: '#caso-2',
                        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
                    },
                    {
                        title: 'Colegio Bilingüe Internacional',
                        body: 'Sistema híbrido K-12 con gamificación y seguimiento personalizado para padres.',
                        url: '#caso-3',
                        imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
                    },
                    {
                        title: 'Red de Educación Continua',
                        body: 'Portal de lifelong learning con pasarela de pagos, suscripciones y certificaciones.',
                        url: '#caso-4',
                        imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80',
                    },
                    {
                        title: 'Academia Corporativa',
                        body: 'Entorno de capacitación B2B para desarrollo de talento y planes de carrera.',
                        url: '#caso-5',
                        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
                    }
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                paddingY: '5rem',
            },
        },
        {
            id: 'tuprofe',
            type: 'tuprofe' as SitePageBlockType,
            name: 'Metodología Divergente',
            visible: true,
            order: 4,
            content: {
                eyebrow: 'Educación por proyectos',
                title: 'Metodología divergente impulsada por TuProfe',
                body: 'Conectamos diseño pedagógico, mentorías, evidencias y analítica en un ecosistema que prioriza el aprendizaje auténtico sobre la simple revisión de contenidos.',
                primaryLabel: 'Conoce TuProfe',
                primaryHref: 'https://profetabla.com/',
                imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80',
                items: [
                    { title: 'Operación conectada', body: 'Planeación, entregas, correcciones grupales, mentorías y rúbricas en el mismo flujo visual.' },
                    { title: 'Métricas predictivas', body: 'Análisis del histórico de entregas y el "engagement" real (no solo clicks, sino interacción colaborativa).' },
                    { title: 'Gamificación de alto nivel', body: 'Economía de aprendizaje ligada a insignias públicas, validables e integradas con perfiles.' },
                    { title: 'Retroalimentación humana inteligente', body: 'Bancos de feedback reutilizables, comentarios de audio o video integrados sobre los entregables.' },
                    { title: 'Autonomía guiada', body: 'Las "etapas" se abren si y sólo si demuestras suficiencia, asegurando el desarrollo de competencias.' }
                ]
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                paddingY: '6rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Pasos de entrega',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Tu plataforma en 4 pasos:',
                items: PLATAFORMAS_LANDING_WORKFLOW,
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto Servicio',
            visible: true,
            order: 6,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus necesidades de plataforma',
                body: 'Escríbenos para conversar sobre configuraciones, integraciones y modelos de servicio.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createVirtualizacionLandingBlocks(): SitePageBlock[] {
    const blocks: SitePageBlock[] = [
        {
            id: 'hero',
            type: 'hero',
            name: 'Hero Servicio',
            visible: true,
            order: 0,
            content: {
                eyebrow: 'Experiencias de aprendizaje mediadas por tecnologías',
                title: 'Virtualización de programas',
                body: '',
                primaryLabel: 'Hablar con un consultor',
                primaryHref: '#contacto',
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0b1323',
                align: 'left',
                paddingY: '8rem',
            },
        },
        {
            id: 'gestion-planes',
            type: 'grid',
            name: 'Gestión planes de formación',
            visible: true,
            order: 1,
            content: {
                eyebrow: 'Somos su aliado en la creación y operación',
                title: 'Gestión planes de formación',
                items: [
                    { title: 'Programas de pregrado y posgrado', body: 'Acompañamiento integral en la formalización digital.' },
                    { title: 'Oferta de educación continua', body: 'Diplomados y certificados de alta calidad.' },
                    { title: 'Planes de formación organizacional', body: 'Entrenamiento corporativo escalable.' },
                    { title: 'Formaciones a la medida', body: 'Proyectos específicos según necesidad.' },
                    { title: 'Cursos cortos', body: 'Experiencias ágiles de micro-aprendizaje.' }
                ]
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#ffffff',
                align: 'left',
                columns: '3',
                paddingY: '6rem',
            },
        },
        {
            id: 'contenidos',
            type: 'feature-list',
            name: 'Producción de contenidos',
            visible: true,
            order: 2,
            content: {
                title: 'Producción de contenidos educativos',
                items: [
                    { title: 'Cursos a la medida', body: 'Diseñamos, desarrollamos y virtualizamos programas atendiendo a proyectos específicos.' },
                    { title: 'Fábrica de contenidos', body: 'Producción masiva de contenidos administrando el 100% de la operación.' },
                    { title: 'Implementación del proceso', body: 'Transferencia de la metodología Algoritmo e implementación tecnológica.' }
                ]
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '5rem',
            },
        },
        {
            id: 'experiencias',
            type: 'carousel',
            name: 'Casos de Virtualización',
            visible: true,
            order: 3,
            content: {
                title: 'Experiencias de virtualización exitosas',
                body: 'Conoce cómo hemos transformado la oferta educativa de diversas organizaciones.',
                items: VIRTUALIZACION_EXPERIENCIAS,
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                paddingY: '6rem',
            },
        },
        {
            id: 'flujo',
            type: 'timeline',
            name: 'Procesos ágiles',
            visible: true,
            order: 4,
            content: {
                eyebrow: 'Calidad asegurada',
                title: 'Procesos ágiles que generan valor',
                items: VIRTUALIZACION_LANDING_WORKFLOW,
                primaryLabel: 'Ver casos de éxito',
                primaryHref: '/servicios/casos-de-exito'
            },
            style: {
                backgroundColor: 'transparent',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '6rem',
            },
        },
        {
            id: 'contacto',
            type: 'contact',
            name: 'Contacto Servicio',
            visible: true,
            order: 5,
            content: {
                eyebrow: 'Iniciemos tu proyecto',
                title: 'Hablemos de tus necesidades de virtualización',
                body: 'Escríbenos para conversar sobre modelos de producción y operación de programas.',
                email: 'andrestabla@algoritmot.com',
                secondaryLabel: 'WhatsApp Directo',
                secondaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
            },
        }
    ]
    return blocks
}

function createDefaultBlocksByPage(pageId: string, title: string, description: string, accentColor: string): SitePageBlock[] {
    if (pageId === 'home-nav') return createNavigationSelectorBlocks()
    if (pageId === 'home-root') return createServicesLandingBlocks(title)
    if (pageId === 'home-edu') return createEducationLandingBlocks()
    if (pageId === 'servicio-plataformas') return createPlataformasLandingBlocks()
    if (pageId === 'virtualizacion-programas') return createVirtualizacionLandingBlocks()
    if (pageId === 'home-inicio') return createClassicHomeBlocks(title, description, accentColor)
    if (pageId === 'case-transversal') return createTransversalCaseBlocks()
    return createDefaultBlocks(title, description, accentColor)
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
    const defaultClientsBlock = createEducationLandingBlocks().find((block) => block.id === 'clientes')
    if (!defaultClientsBlock) return blocks

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

        if (hasLogoUrls) return blocks

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

function isOutdatedVirtualizacionBlocks(blocks: SitePageBlock[]) {
    return !blocks.some((block) => block.id === 'experiencias')
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
            blocks: createDefaultBlocksByPage('home-nav', 'Selector de Navegación', 'Pantalla inicial de selección: Empresas o Educación.', '#0f172a'),
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
            blocks: createDefaultBlocksByPage('home-root', 'Home (Landing principal)', 'Página principal pública del sitio.', '#2563eb'),
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
            blocks: createDefaultBlocksByPage('home-edu', 'Educación', 'Soluciones digitales para el sector educativo.', '#10b981'),
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
            blocks: createDefaultBlocksByPage('servicio-plataformas', 'Plataformas de Aprendizaje', 'Implementa o evoluciona tu ecosistema digital para el aprendizaje.', '#10b981'),
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
            blocks: createDefaultBlocksByPage('virtualizacion-programas', 'Virtualización de Programas', 'Experiencias de aprendizaje mediadas por tecnologías.', '#10b981'),
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
            blocks: createDefaultBlocksByPage('home-inicio', 'Home clásica', 'Versión clásica del home original.', '#0ea5e9'),
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
            blocks: createDefaultBlocksByPage(
                'case-transversal',
                'Caso transversal (servicios + productos)',
                'Caso SST de punta a punta: incidentes laborales, seguimiento, medidas y analítica en tiempo real.',
                '#0f172a'
            ),
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
        const fallbackBlocks = (fallback?.blocks ?? createDefaultBlocksByPage(id, title, description, accentColor)).map((block) => ({
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
                blocks: defaultPage.blocks.map((block) => ({
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
                    blocks: page.blocks.map((block) => ({
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
