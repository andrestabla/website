type JsonLdSchema = Record<string, unknown>

export const DEFAULT_FAVICON_URL = '/favicon.svg'
export const DEFAULT_OG_IMAGE_URL = '/assets/og-default.png'

// Símbolo de la marca: círculo con la T en forma de persona.
export const BRAND_MARK = '/assets/algoritmot-mark.svg?v=2026-11'

// Logotipo de la marca (kit en public/assets/brand): nombre + símbolo, sin eslogan.
export const BRAND_LOGO_ON_LIGHT = '/assets/brand/02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-claro.svg'
export const BRAND_LOGO_ON_DARK = '/assets/brand/02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-oscuro.svg'

// Loader del sitio: el logo animado del kit (fondo azul de marca incluido).
// Dura 4,56 s; el loader se mantiene ese tiempo para que alcance a descifrarse.
export const BRAND_LOADER_ANIMATION = '/assets/brand/05-Animado/algoritmot-animado-con-eslogan-fondo-oscuro.gif'
export const BRAND_LOADER_BACKGROUND = '#1a2d5a'
export const BRAND_LOADER_MS = 4900

// Icono anterior de la marca. La configuración guardada del sitio todavía puede
// apuntar a él (favicon y logo de pie); donde aparezca se usa el actual.
export const LEGACY_BRAND_ICON_URL = 'https://imageneseiconos.s3.us-east-1.amazonaws.com/sitioweb/T.svg'

export function resolveFaviconUrl(url?: string | null): string {
  const value = (url || '').trim()
  return !value || value === LEGACY_BRAND_ICON_URL ? DEFAULT_FAVICON_URL : value
}

export function resolveShareImage(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const value = (candidate || '').trim()
    if (value && value !== LEGACY_BRAND_ICON_URL) return value
  }
  return DEFAULT_OG_IMAGE_URL
}

export type SeoPayload = {
  title: string
  description: string
  canonicalUrl: string
  imageUrl: string
  robots: string
  lang: string
  siteName: string
  ogType?: string
  twitterCard?: string
  themeColor?: string
  faviconUrl?: string
  schemas?: JsonLdSchema[]
}

const MANAGED_ATTR = 'data-seo-managed'
const JSONLD_ID = 'algoritmot-seo-jsonld'

export function normalizeBaseUrl(input: string) {
  const raw = String(input || '').trim()
  const fallback = 'https://www.algoritmot.com'
  if (!raw) return fallback
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(normalized)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return fallback
  }
}

export function normalizePath(input: string) {
  const value = String(input || '').trim()
  if (!value) return '/'
  const withSlash = value.startsWith('/') ? value : `/${value}`
  if (withSlash === '/') return '/'
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

export function toAbsoluteUrl(baseUrl: string, maybeRelative: string) {
  const input = String(maybeRelative || '').trim()
  if (!input) return baseUrl
  if (/^https?:\/\//i.test(input)) return input
  const cleanBase = normalizeBaseUrl(baseUrl)
  return `${cleanBase}${input.startsWith('/') ? '' : '/'}${input}`
}

export function limitText(value: string, max: number) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}...`
}

function ensureMetaByName(name: string) {
  let node = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', name)
    document.head.appendChild(node)
  }
  node.setAttribute(MANAGED_ATTR, '1')
  return node
}

function ensureMetaByProperty(property: string) {
  let node = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('property', property)
    document.head.appendChild(node)
  }
  node.setAttribute(MANAGED_ATTR, '1')
  return node
}

function ensureLink(rel: string) {
  let node = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', rel)
    document.head.appendChild(node)
  }
  node.setAttribute(MANAGED_ATTR, '1')
  return node
}

function setJsonLdGraph(schemas: JsonLdSchema[]) {
  if (!schemas.length) {
    const stale = document.getElementById(JSONLD_ID)
    if (stale) stale.remove()
    return
  }
  let node = document.getElementById(JSONLD_ID) as HTMLScriptElement | null
  if (!node) {
    node = document.createElement('script')
    node.id = JSONLD_ID
    node.type = 'application/ld+json'
    document.head.appendChild(node)
  }
  node.setAttribute(MANAGED_ATTR, '1')
  node.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas,
  })
}

export function applySeoPayload(payload: SeoPayload) {
  if (typeof document === 'undefined') return

  document.documentElement.lang = payload.lang || 'es'
  document.title = payload.title

  ensureMetaByName('description').setAttribute('content', payload.description)
  ensureMetaByName('robots').setAttribute('content', payload.robots)
  ensureMetaByName('twitter:card').setAttribute('content', payload.twitterCard || 'summary_large_image')
  ensureMetaByName('twitter:title').setAttribute('content', payload.title)
  ensureMetaByName('twitter:description').setAttribute('content', payload.description)
  ensureMetaByName('twitter:image').setAttribute('content', payload.imageUrl)

  if (payload.themeColor) {
    ensureMetaByName('theme-color').setAttribute('content', payload.themeColor)
  }

  ensureMetaByProperty('og:type').setAttribute('content', payload.ogType || 'website')
  ensureMetaByProperty('og:title').setAttribute('content', payload.title)
  ensureMetaByProperty('og:description').setAttribute('content', payload.description)
  ensureMetaByProperty('og:url').setAttribute('content', payload.canonicalUrl)
  ensureMetaByProperty('og:image').setAttribute('content', payload.imageUrl)
  ensureMetaByProperty('og:site_name').setAttribute('content', payload.siteName)

  ensureLink('canonical').setAttribute('href', payload.canonicalUrl)

  const faviconLink = ensureLink('icon')
  faviconLink.setAttribute('href', payload.faviconUrl || DEFAULT_FAVICON_URL)
  faviconLink.setAttribute('type', 'image/svg+xml')

  setJsonLdGraph(payload.schemas || [])
}
