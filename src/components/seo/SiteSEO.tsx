import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useCMS } from '../../admin/context/CMSContext'
import { useLanguage } from '../../context/LanguageContext'
import { DEFAULT_FAVICON_URL, applySeoPayload, limitText, normalizeBaseUrl, normalizePath, toAbsoluteUrl } from '../../lib/seo'

type BreadcrumbItem = {
  name: string
  path: string
}

function isDynamicTemplatePath(path: string) {
  return path.includes('/:') || path.includes('*') || path.includes('[') || path.includes(':')
}

function buildBreadcrumbSchema(items: BreadcrumbItem[], baseUrl: string) {
  if (items.length < 2) return null
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(baseUrl, item.path),
    })),
  }
}

function hasCaseInsensitive(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function SiteSEO() {
  const { pathname } = useLocation()
  const { state } = useCMS()
  const { translatedState, language } = useLanguage()

  const seo = useMemo(() => {
    const baseUrl = normalizeBaseUrl(state.site.url)
    const normalizedPath = normalizePath(pathname)
    const isAdmin = normalizedPath.startsWith('/admin')
    const isPreviewHost =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost')

    const serviceMatch = normalizedPath.match(/^\/servicios\/([^/]+)$/)
    const productMatch = normalizedPath.match(/^\/productos\/([^/]+)$/)
    const campaignMatch = normalizedPath.match(/^\/campanias\/([^/]+)$/)

    const serviceSlug = serviceMatch?.[1] ? decodeURIComponent(serviceMatch[1]) : ''
    const productSlug = productMatch?.[1] ? decodeURIComponent(productMatch[1]) : ''

    const service = serviceSlug ? translatedState.services.find((item) => item.slug === serviceSlug) : null
    const product = productSlug ? translatedState.products.find((item) => item.slug === productSlug) : null

    const sitePage = translatedState.siteArchitecture.pages.find(
      (page) => normalizePath(page.path) === normalizedPath && !isDynamicTemplatePath(page.path)
    )

    const siteName = String(translatedState.site.name || state.site.name || 'AlgoritmoT').trim() || 'AlgoritmoT'
    const fallbackDescription = limitText(
      String(translatedState.site.description || state.site.description || 'Soluciones digitales con sentido humano'),
      180
    )

    let title = siteName
    let description = fallbackDescription
    let ogType = 'website'
    let canonicalPath = normalizedPath
    let isKnownRoute = false
    let shouldNoIndex = false

    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Inicio', path: '/empresas' }]

    if (normalizedPath === '/' || normalizedPath === '/inicio') {
      title = `Soluciones digitales con sentdo humano | ${siteName}`
      description = 'Soluciones digitales con sentdo humano para empresas y educacion.'
      canonicalPath = '/empresas'
      isKnownRoute = true
      shouldNoIndex = true
    } else if (isAdmin) {
      title = `Admin Panel | ${siteName}`
      description = 'Panel administrativo interno.'
      isKnownRoute = true
      shouldNoIndex = true
    } else if (service) {
      title = service.seoTitle || service.title
      description = limitText(service.seoDescription || service.description || fallbackDescription, 180)
      ogType = 'article'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Servicios', path: '/empresas#servicios' })
      breadcrumbs.push({ name: service.title, path: normalizedPath })
    } else if (product) {
      title = product.seoTitle || product.title
      description = limitText(product.seoDescription || product.description || fallbackDescription, 180)
      ogType = 'product'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Productos', path: '/empresas#productos' })
      breadcrumbs.push({ name: product.title, path: normalizedPath })
    } else if (sitePage) {
      title = sitePage.title || siteName
      description = limitText(sitePage.description || fallbackDescription, 180)
      isKnownRoute = true
      shouldNoIndex = sitePage.status !== 'published'
      breadcrumbs.push({ name: sitePage.navLabel || sitePage.title || normalizedPath, path: normalizedPath })
    } else if (campaignMatch) {
      const campaignSlug = decodeURIComponent(campaignMatch[1] || '')
      const campaignLabel = campaignSlug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
      title = campaignLabel ? `${campaignLabel} | ${siteName}` : `Campaña | ${siteName}`
      description = 'Landing de campaña con propuesta de valor y formulario de conversión.'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Campañas', path: '/empresas' })
      breadcrumbs.push({ name: campaignLabel || 'Campaña', path: normalizedPath })
    } else if (normalizedPath === '/generador-casos') {
      title = `Generador de casos con IA | ${siteName}`
      description = 'Genera casos y escenarios accionables por industria y proceso.'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Generador de casos', path: normalizedPath })
    } else if (normalizedPath === '/planifico-mi-proyecto') {
      title = `Planifico mi proyecto con IA | ${siteName}`
      description = 'Asistente IA para definir alcance, complejidad, metodología y presupuesto estimado de tu proyecto digital.'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Planifico mi proyecto', path: normalizedPath })
    } else if (normalizedPath === '/empresas/simulador') {
      title = `Simulador transformación digital | ${siteName}`
      description = 'Simula tu transformación digital fase por fase: diagnóstico de madurez, inversión estimada, intervenciones y productos para tu organización.'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Empresas', path: '/empresas' })
      breadcrumbs.push({ name: 'Simulador', path: normalizedPath })
    } else if (normalizedPath.startsWith('/protocolos/')) {
      const map: Record<string, string> = {
        '/protocolos/ingenieria-humana': 'Ingeniería Humana',
        '/protocolos/despliegue-ia': 'Despliegue IA',
        '/protocolos/madurez-organica': 'Madurez Orgánica',
      }
      const protocolName = map[normalizedPath] || 'Protocolo'
      title = `${protocolName} | ${siteName}`
      description = `Conoce ${protocolName.toLowerCase()} como marco operativo para resultados sostenibles.`
      isKnownRoute = true
      breadcrumbs.push({ name: 'Protocolos', path: '/empresas' })
      breadcrumbs.push({ name: protocolName, path: normalizedPath })
    } else if (normalizedPath === '/politica-tratamiento-datos') {
      title = `Política de tratamiento de datos | ${siteName}`
      description = 'Consulta lineamientos de privacidad, consentimiento y tratamiento de datos.'
      isKnownRoute = true
      breadcrumbs.push({ name: 'Política de datos', path: normalizedPath })
    } else if (normalizedPath === '/control' || normalizedPath.startsWith('/control/')) {
      title = `Project Control | ${siteName}`
      description = 'Tableros de seguimiento tipo hoja de cálculo, 100% customizables.'
      isKnownRoute = true
      shouldNoIndex = true
    } else if (normalizedPath === '/ecosistema' || normalizedPath.startsWith('/ecosistema/')) {
      title = `Ecosistema | ${siteName}`
      description = 'Ecosistema digital Algoritmo T: acceso unificado a tus módulos y herramientas.'
      isKnownRoute = true
      shouldNoIndex = true
    } else if (normalizedPath.startsWith('/board/')) {
      title = `Tablero · Project Control | ${siteName}`
      description = 'Vista pública de un tablero de seguimiento.'
      isKnownRoute = true
      shouldNoIndex = true
    } else if (normalizedPath === '/bi' || normalizedPath.startsWith('/bi/')) {
      title = 'Algoritmo BI · Educación Superior Colombia'
      description = 'Inteligencia de mercado sobre la oferta y demanda de educación superior en Colombia.'
      isKnownRoute = true
      shouldNoIndex = true
    }

    if (!isKnownRoute) {
      shouldNoIndex = true
      title = `Página no encontrada | ${siteName}`
      description = 'La ruta solicitada no está disponible en este momento.'
    }

    if (!hasCaseInsensitive(title, siteName) && !title.includes('|')) {
      title = `${title} | ${siteName}`
    }

    const robots = shouldNoIndex || isPreviewHost
      ? 'noindex,nofollow,noarchive,nosnippet,max-image-preview:none'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

    const imageCandidate = state.design.logoUrl || state.design.logoFooterUrl || '/assets/og-default.svg'
    const imageUrl = toAbsoluteUrl(baseUrl, imageCandidate)
    const canonicalUrl = toAbsoluteUrl(baseUrl, canonicalPath)
    const faviconUrl = toAbsoluteUrl(baseUrl, state.design.faviconUrl || DEFAULT_FAVICON_URL)

    const schemas: Array<Record<string, unknown>> = [
      {
        '@type': 'Organization',
        name: siteName,
        url: baseUrl,
        logo: imageUrl,
        sameAs: [state.site.linkedin, state.site.twitter].filter(Boolean),
        contactPoint: state.site.contactEmail
          ? [{
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: state.site.contactEmail,
            }]
          : undefined,
      },
      {
        '@type': 'WebSite',
        name: siteName,
        url: baseUrl,
        inLanguage: language,
      },
      {
        '@type': 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
        inLanguage: language,
      },
    ]

    const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs, baseUrl)
    if (breadcrumbSchema) schemas.push(breadcrumbSchema)

    if (service) {
      schemas.push({
        '@type': 'Service',
        name: service.title,
        serviceType: service.highlight || service.title,
        description: limitText(service.descriptionLong || service.description || '', 260),
        url: canonicalUrl,
        provider: {
          '@type': 'Organization',
          name: siteName,
        },
      })
    }

    if (product) {
      schemas.push({
        '@type': 'Product',
        name: product.title,
        description: limitText(product.descriptionLong || product.description || '', 260),
        image: imageUrl,
        brand: {
          '@type': 'Brand',
          name: siteName,
        },
      })
    }

    return {
      title: limitText(title, 70),
      description: limitText(description, 180),
      canonicalUrl,
      imageUrl,
      robots,
      lang: language,
      siteName,
      ogType,
      twitterCard: 'summary_large_image',
      themeColor: state.design.colorPrimary,
      faviconUrl,
      schemas,
    }
  }, [
    language,
    pathname,
    state.design.colorPrimary,
    state.design.faviconUrl,
    state.design.logoFooterUrl,
    state.design.logoUrl,
    state.site.contactEmail,
    state.site.description,
    state.site.linkedin,
    state.site.name,
    state.site.twitter,
    state.site.url,
    translatedState.products,
    translatedState.services,
    translatedState.site.name,
    translatedState.site.description,
    translatedState.siteArchitecture.pages,
  ])

  useEffect(() => {
    applySeoPayload(seo)
  }, [seo])

  return null
}
