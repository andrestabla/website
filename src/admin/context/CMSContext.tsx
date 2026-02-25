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
    if (typeof document === 'undefined') return
    const root = document.documentElement

    root.style.setProperty('--color-brand-primary', tokens.colorPrimary)
    root.style.setProperty('--color-brand-secondary', tokens.colorSecondary)
    root.style.setProperty('--color-brand-surface', tokens.colorSurface)

    root.style.setProperty('--font-sans', `"${tokens.fontBody}", system-ui, sans-serif`)
    root.style.setProperty('--font-display', `"${tokens.fontDisplay}", serif`)

    const radii: Record<string, string> = {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
    }
    root.style.setProperty('--cms-radius', radii[tokens.borderRadius] ?? '0px')
    root.style.setProperty('--cms-dark', tokens.colorDark)
    root.style.setProperty('--cms-grid-opacity', tokens.gridOpacity)

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

const API_ROUTES = {
    hero: '/api/cms/hero',
    services: '/api/cms/services',
    products: '/api/cms/products',
    site: '/api/cms/site',
}

async function fetchCMSContent(): Promise<Partial<CMSState>> {
    try {
        const [heroRes, servicesRes, productsRes, siteRes] = await Promise.all([
            fetch(API_ROUTES.hero),
            fetch(API_ROUTES.services),
            fetch(API_ROUTES.products),
            fetch(API_ROUTES.site),
        ])

        const [hero, services, products, site] = await Promise.all([
            heroRes.ok ? heroRes.json() : null,
            servicesRes.ok ? servicesRes.json() : null,
            productsRes.ok ? productsRes.json() : null,
            siteRes.ok ? siteRes.json() : null,
        ])

        return {
            hero: hero || undefined,
            services: services || undefined,
            products: products || undefined,
            site: site || undefined,
        }
    } catch (error) {
        console.error('Error fetching CMS content:', error)
        return {}
    }
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
    return {
        services: staticServices,
        products: staticProducts,
        hero: staticHero,
        site: staticSite,
        design: defaultDesign,
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

    // Load CMS content from API on mount
    useEffect(() => {
        fetchCMSContent().then(data => {
            setState(prev => ({
                ...prev,
                hero: data.hero || prev.hero,
                services: data.services || prev.services,
                products: data.products || prev.products,
                site: data.site || prev.site,
                design: data.design || prev.design,
            }))
        })
    }, [])

    // Inject design tokens on mount and whenever they change
    useEffect(() => {
        injectDesignTokens(state.design)
    }, [state.design])

    const updateService = useCallback(async (slug: string, data: Partial<ServiceItem>) => {
        const service = state.services.find(s => s.slug === slug)
        if (!service) return

        const updated = { ...service, ...data }
        await fetch(API_ROUTES.services, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        })

        setState(prev => ({
            ...prev,
            services: prev.services.map(s => s.slug === slug ? updated : s)
        }))
    }, [state.services])

    const addService = useCallback(async (data: ServiceItem) => {
        const res = await fetch(API_ROUTES.services, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!res.ok) return

        const saved = await res.json()
        setState(prev => ({
            ...prev,
            services: [...prev.services, saved]
        }))
    }, [])

    const deleteService = useCallback(async (slug: string) => {
        const service = state.services.find(s => s.slug === slug)
        if (!service) return

        const res = await fetch(`${API_ROUTES.services}?id=${(service as any).id}`, {
            method: 'DELETE',
        })
        if (!res.ok) return

        setState(prev => ({
            ...prev,
            services: prev.services.filter(s => s.slug !== slug)
        }))
    }, [state.services])

    const updateProduct = useCallback(async (slug: string, data: Partial<ProductItem>) => {
        const product = state.products.find(p => p.slug === slug)
        if (!product) return

        const updated = { ...product, ...data }
        await fetch(API_ROUTES.products, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        })

        setState(prev => ({
            ...prev,
            products: prev.products.map(p => p.slug === slug ? updated : p)
        }))
    }, [state.products])

    const addProduct = useCallback(async (data: ProductItem) => {
        const res = await fetch(API_ROUTES.products, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!res.ok) return

        const saved = await res.json()
        setState(prev => ({
            ...prev,
            products: [...prev.products, saved]
        }))
    }, [])

    const deleteProduct = useCallback(async (slug: string) => {
        const product = state.products.find(p => p.slug === slug)
        if (!product) return

        const res = await fetch(`${API_ROUTES.products}?id=${(product as any).id}`, {
            method: 'DELETE',
        })
        if (!res.ok) return

        setState(prev => ({
            ...prev,
            products: prev.products.filter(p => p.slug !== slug)
        }))
    }, [state.products])

    const updateHero = useCallback(async (data: Partial<HeroContent>) => {
        const updated = { ...state.hero, ...data }
        await fetch(API_ROUTES.hero, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        })
        setState(prev => ({ ...prev, hero: updated }))
    }, [state.hero])

    const updateSite = useCallback(async (data: Partial<SiteConfig>) => {
        const updated = { ...state.site, ...data }
        await fetch(API_ROUTES.site, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        })
        setState(prev => ({ ...prev, site: updated }))
    }, [state.site])

    const updateDesign = useCallback((data: Partial<DesignTokens>) => {
        setState(prev => {
            const next = { ...prev, design: { ...prev.design, ...data } }
            injectDesignTokens(next.design)
            return next
        })
    }, [])

    const persist = useCallback(async (next: CMSState) => {
        setState(next)
        // Batch updates to multiple endpoints if needed, although usually this is for full resets
        await Promise.all([
            updateHero(next.hero),
            updateSite(next.site),
            // Services and Products are more complex as they are arrays, 
            // but usually persist is called for a full state replacement.
        ])
    }, [updateHero, updateSite])

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
