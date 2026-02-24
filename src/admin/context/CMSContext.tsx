/**
 * CMSContext — Runtime in-memory CMS store backed by localStorage.
 * Includes design tokens that are injected as CSS custom properties.
 */

import {
    createContext, useContext, useState, useCallback, useEffect,
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

export type SiteConfig = {
    name: string
    description: string
    url: string
    contactEmail: string
    contactAddress: string
    linkedin: string
    twitter: string
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
    gridOpacity: string        // infra-grid opacity string

    // Dark panel color (hero card, service page sidebar)
    colorDark: string
}

export type CMSState = {
    services: ServiceItem[]
    products: ProductItem[]
    hero: HeroContent
    site: SiteConfig
    design: DesignTokens
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
    gridOpacity: '0.03',
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

const staticSite: SiteConfig = {
    name: defaultSiteConfig.name,
    description: defaultSiteConfig.description,
    url: defaultSiteConfig.url,
    contactEmail: defaultSiteConfig.contact.email,
    contactAddress: defaultSiteConfig.contact.address,
    linkedin: defaultSiteConfig.links.linkedin,
    twitter: defaultSiteConfig.links.twitter,
}

function buildInitialState(): CMSState {
    const stored = loadFromStorage()
    return {
        services: stored.services ?? staticServices,
        products: stored.products ?? staticProducts,
        hero: stored.hero ?? staticHero,
        site: stored.site ?? staticSite,
        design: stored.design ?? defaultDesign,
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type CMSContextType = {
    state: CMSState

    updateService: (slug: string, data: Partial<ServiceItem>) => void
    addService: (data: ServiceItem) => void
    deleteService: (slug: string) => void

    updateProduct: (slug: string, data: Partial<ProductItem>) => void
    addProduct: (data: ProductItem) => void
    deleteProduct: (slug: string) => void

    updateHero: (data: Partial<HeroContent>) => void
    updateSite: (data: Partial<SiteConfig>) => void
    updateDesign: (data: Partial<DesignTokens>) => void

    resetToDefaults: () => void
}

const CMSContext = createContext<CMSContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CMSProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CMSState>(buildInitialState)

    // Inject design tokens on mount and whenever they change
    useEffect(() => {
        injectDesignTokens(state.design)
    }, [state.design])

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

    const resetToDefaults = useCallback(() => {
        const fresh: CMSState = {
            services: staticServices,
            products: staticProducts,
            hero: staticHero,
            site: staticSite,
            design: defaultDesign,
        }
        persist(fresh)
        injectDesignTokens(defaultDesign)
    }, [persist])

    return (
        <CMSContext.Provider value={{
            state,
            updateService, addService, deleteService,
            updateProduct, addProduct, deleteProduct,
            updateHero, updateSite, updateDesign,
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
