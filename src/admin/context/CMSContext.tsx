/**
 * CMSContext — Runtime in-memory CMS store backed by localStorage.
 * All admin pages READ from and WRITE to this context.
 * The public site already reads from the static data files; the CMS
 * updates the context and localStorage so changes persist across page reloads
 * (until a real backend/API is integrated).
 */

import {
    createContext, useContext, useState, useCallback,
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
    // icon is intentionally omitted from editable state (it's a React component)
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

export type CMSState = {
    services: ServiceItem[]
    products: ProductItem[]
    hero: HeroContent
    site: SiteConfig
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
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type CMSContextType = {
    state: CMSState

    // Services
    updateService: (slug: string, data: Partial<ServiceItem>) => void
    addService: (data: Omit<ServiceItem, 'slug'> & { slug: string }) => void
    deleteService: (slug: string) => void

    // Products
    updateProduct: (slug: string, data: Partial<ProductItem>) => void
    addProduct: (data: ProductItem) => void
    deleteProduct: (slug: string) => void

    // Hero
    updateHero: (data: Partial<HeroContent>) => void

    // Site
    updateSite: (data: Partial<SiteConfig>) => void

    // Reset
    resetToDefaults: () => void
}

const CMSContext = createContext<CMSContextType | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CMSProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CMSState>(buildInitialState)

    const persist = useCallback((next: CMSState) => {
        setState(next)
        saveToStorage(next)
    }, [])

    const updateService = useCallback((slug: string, data: Partial<ServiceItem>) => {
        setState(prev => {
            const next = {
                ...prev,
                services: prev.services.map(s => s.slug === slug ? { ...s, ...data } : s),
            }
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
            const next = {
                ...prev,
                products: prev.products.map(p => p.slug === slug ? { ...p, ...data } : p),
            }
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
    }, [persist])

    const resetToDefaults = useCallback(() => {
        const fresh: CMSState = {
            services: staticServices,
            products: staticProducts,
            hero: staticHero,
            site: staticSite,
        }
        persist(fresh)
    }, [persist])

    return (
        <CMSContext.Provider value={{
            state,
            updateService, addService, deleteService,
            updateProduct, addProduct, deleteProduct,
            updateHero,
            updateSite,
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
