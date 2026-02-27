import { content as defaultContent } from '../../src/data/content.js'
import { siteConfig as defaultSiteConfig } from '../../src/data/config.js'
import { servicesDetail, productsDetail } from '../../src/data/details.js'

type CMSState = {
  services: any[]
  products: any[]
  hero: any
  site: any
  design: any
  homePage: any
}

const defaultDesign = {
  colorPrimary: '#1a2d5a',
  colorSecondary: '#2563eb',
  colorSurface: '#f8faff',
  colorAccent: '#3b82f6',
  colorDark: '#0f172a',
  fontBody: 'Inter',
  fontDisplay: 'Inter',
  borderRadius: 'none',
  buttonStyle: 'sharp',
  gridOpacity: '0.03',
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

const HOME_SECTION_IDS = ['hero', 'services', 'products', 'frameworks', 'contact'] as const
const HOME_RESPONSIVE_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
const HOME_SECTION_BLOCK_IDS = {
  hero: ['headline', 'ctas', 'stats'],
  services: ['header', 'grid'],
  products: ['header', 'cards'],
  frameworks: ['header', 'items'],
  contact: ['header', 'channels', 'form'],
} as const

export function getDefaultCmsSnapshot(): CMSState {
  const services = servicesDetail.map((s) => ({
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
    outcomes: (s as any).outcomes,
    variants: (s as any).variants,
  }))

  const products = productsDetail.map((p) => ({
    slug: p.slug,
    title: p.title,
    highlight: p.highlight,
    description: p.description,
    descriptionLong: p.descriptionLong ?? '',
    price: p.price ?? '',
    ctaText: p.ctaText ?? '',
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    variants: (p as any).variants,
  }))

  return cloneJson({
    services,
    products,
    hero: defaultContent.hero,
    site: {
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
      dataPolicyContent: 'Tratamos datos de navegación con fines de analítica, mejora continua, seguridad y optimización de la experiencia digital. Esto puede incluir ubicación geográfica aproximada por IP, páginas y secciones visitadas y tiempo de permanencia estimado por página, una vez otorgado el consentimiento.',
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
    },
    design: defaultDesign,
    homePage: {
      layout: {
        sectionOrder: [...HOME_SECTION_IDS],
        hiddenSections: [],
        sectionVisibility: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, { desktop: true, tablet: true, mobile: true }])) as any,
        blockVisibility: Object.fromEntries(
          HOME_SECTION_IDS.map((sectionId) => [
            sectionId,
            Object.fromEntries(HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => [blockId, { desktop: true, tablet: true, mobile: true }]))
          ])
        ) as any,
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
        items: defaultContent.frameworks.items.map((item: any) => ({
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
    },
  })
}

export function sanitizeCmsSnapshot(input: unknown): CMSState {
  const base = getDefaultCmsSnapshot()
  if (!input || typeof input !== 'object') return base
  const raw = input as any

  const services = Array.isArray(raw.services) ? raw.services : base.services
  const products = Array.isArray(raw.products) ? raw.products : base.products
  const rawLayout = raw.homePage?.layout || {}
  const validHomeSectionIds = new Set(HOME_SECTION_IDS)
  const rawSectionOrder = Array.isArray(rawLayout.sectionOrder)
    ? rawLayout.sectionOrder.filter((id: any) => validHomeSectionIds.has(id))
    : []
  const sectionOrder = [...new Set([...rawSectionOrder, ...HOME_SECTION_IDS])]
  const hiddenSections = Array.isArray(rawLayout.hiddenSections)
    ? [...new Set(rawLayout.hiddenSections.filter((id: any) => validHomeSectionIds.has(id)))]
    : []
  const sectionVisibility = Object.fromEntries(
    HOME_SECTION_IDS.map((id) => {
      const rawSection = rawLayout.sectionVisibility && typeof rawLayout.sectionVisibility === 'object'
        ? rawLayout.sectionVisibility[id]
        : undefined
      return [
        id,
        Object.fromEntries(
          HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
            viewport,
            typeof rawSection?.[viewport] === 'boolean' ? rawSection[viewport] : true,
          ])
        ),
      ]
    })
  )
  const blockVisibility = Object.fromEntries(
    HOME_SECTION_IDS.map((sectionId) => {
      const rawSectionBlocks = rawLayout.blockVisibility && typeof rawLayout.blockVisibility === 'object'
        ? rawLayout.blockVisibility[sectionId]
        : undefined
      return [
        sectionId,
        Object.fromEntries(
          HOME_SECTION_BLOCK_IDS[sectionId].map((blockId) => {
            const rawBlock = rawSectionBlocks && typeof rawSectionBlocks === 'object'
              ? rawSectionBlocks[blockId]
              : undefined
            return [
              blockId,
              Object.fromEntries(
                HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
                  viewport,
                  typeof rawBlock?.[viewport] === 'boolean' ? rawBlock[viewport] : true,
                ])
              ),
            ]
          })
        ),
      ]
    })
  )
  const normalizeBlockOrder = <T extends string>(rawValue: unknown, fallback: readonly T[]): T[] => {
    const valid = new Set(fallback)
    const fromRaw = Array.isArray(rawValue) ? rawValue.filter((value): value is T => typeof value === 'string' && valid.has(value as T)) : []
    const unique = [...new Set(fromRaw)]
    for (const value of fallback) {
      if (!unique.includes(value)) unique.push(value)
    }
    return unique as T[]
  }
  const baseBlockOrder = (base as any).homePage.layout.blockOrder
  const blockOrder = {
    services: normalizeBlockOrder(rawLayout?.blockOrder?.services, baseBlockOrder.services),
    products: normalizeBlockOrder(rawLayout?.blockOrder?.products, baseBlockOrder.products),
    frameworks: normalizeBlockOrder(rawLayout?.blockOrder?.frameworks, baseBlockOrder.frameworks),
    contact: normalizeBlockOrder(rawLayout?.blockOrder?.contact, baseBlockOrder.contact),
  }
  const baseBlockStyles = (base as any).homePage.layout.blockStyleOverrides
  const rawBlockStyles = rawLayout.blockStyleOverrides && typeof rawLayout.blockStyleOverrides === 'object'
    ? rawLayout.blockStyleOverrides
    : {}
  const responsiveString = (value: any, fallback: any) =>
    Object.fromEntries(
      HOME_RESPONSIVE_VIEWPORTS.map((viewport) => [
        viewport,
        typeof value?.[viewport] === 'string' ? value[viewport] : fallback[viewport],
      ])
    )
  const blockStyleOverrides = {
    services: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.services?.header?.titleSizeRem, baseBlockStyles.services.header.titleSizeRem),
      },
      grid: {
        columns: responsiveString(rawBlockStyles?.services?.grid?.columns, baseBlockStyles.services.grid.columns),
        itemLimit: responsiveString(rawBlockStyles?.services?.grid?.itemLimit, baseBlockStyles.services.grid.itemLimit),
      },
    },
    products: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.products?.header?.titleSizeRem, baseBlockStyles.products.header.titleSizeRem),
      },
      cards: {
        columns: responsiveString(rawBlockStyles?.products?.cards?.columns, baseBlockStyles.products.cards.columns),
        itemLimit: responsiveString(rawBlockStyles?.products?.cards?.itemLimit, baseBlockStyles.products.cards.itemLimit),
      },
    },
    frameworks: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.frameworks?.header?.titleSizeRem, baseBlockStyles.frameworks.header.titleSizeRem),
      },
      items: {
        columns: responsiveString(rawBlockStyles?.frameworks?.items?.columns, baseBlockStyles.frameworks.items.columns),
        itemLimit: responsiveString(rawBlockStyles?.frameworks?.items?.itemLimit, baseBlockStyles.frameworks.items.itemLimit),
      },
    },
    contact: {
      header: {
        titleSizeRem: responsiveString(rawBlockStyles?.contact?.header?.titleSizeRem, baseBlockStyles.contact.header.titleSizeRem),
      },
      channels: {
        gapRem: responsiveString(rawBlockStyles?.contact?.channels?.gapRem, baseBlockStyles.contact.channels.gapRem),
      },
      form: {
        layoutMode: responsiveString(rawBlockStyles?.contact?.form?.layoutMode, baseBlockStyles.contact.form.layoutMode),
      },
    },
  }

  return {
    ...base,
    ...raw,
    services: services.map((item: any, i: number) => ({ ...base.services[i], ...item })),
    products: products.map((item: any, i: number) => ({ ...base.products[i], ...item })),
    hero: { ...base.hero, ...(raw.hero || {}) },
    site: { ...base.site, ...(raw.site || {}) },
    design: { ...base.design, ...(raw.design || {}) },
    homePage: {
      ...(base as any).homePage,
      ...(raw.homePage || {}),
      layout: {
        ...(base as any).homePage.layout,
        ...rawLayout,
        sectionOrder,
        hiddenSections,
        sectionVisibility,
        blockVisibility,
        blockOrder,
        blockStyleOverrides,
      },
      hero: {
        ...(base as any).homePage.hero,
        ...(raw.homePage?.hero || {}),
        stats: Array.isArray(raw.homePage?.hero?.stats) ? raw.homePage.hero.stats : (base as any).homePage.hero.stats,
        style: { ...(base as any).homePage.hero.style, ...(raw.homePage?.hero?.style || {}) },
      },
      servicesSection: {
        ...(base as any).homePage.servicesSection,
        ...(raw.homePage?.servicesSection || {}),
        style: { ...(base as any).homePage.servicesSection.style, ...(raw.homePage?.servicesSection?.style || {}) },
      },
      productsSection: {
        ...(base as any).homePage.productsSection,
        ...(raw.homePage?.productsSection || {}),
        style: { ...(base as any).homePage.productsSection.style, ...(raw.homePage?.productsSection?.style || {}) },
      },
      frameworksSection: {
        ...(base as any).homePage.frameworksSection,
        ...(raw.homePage?.frameworksSection || {}),
        items: Array.isArray(raw.homePage?.frameworksSection?.items) ? raw.homePage.frameworksSection.items : (base as any).homePage.frameworksSection.items,
        style: { ...(base as any).homePage.frameworksSection.style, ...(raw.homePage?.frameworksSection?.style || {}) },
      },
      contactSection: {
        ...(base as any).homePage.contactSection,
        ...(raw.homePage?.contactSection || {}),
        labels: { ...(base as any).homePage.contactSection.labels, ...(raw.homePage?.contactSection?.labels || {}) },
        style: { ...(base as any).homePage.contactSection.style, ...(raw.homePage?.contactSection?.style || {}) },
      },
    },
  }
}
