import crypto from 'node:crypto'

export const CAMPAIGN_LANDINGS_SNAPSHOT_ID = 'campaign_landings'

export type CampaignLandingStatus = 'draft' | 'published'

export type CampaignLandingSection = {
  id: string
  title: string
  body: string
  bullets: string[]
}

export type CampaignLanding = {
  id: string
  slug: string
  name: string
  objective: string
  audience: string
  tone: string
  provider: 'openai' | 'gemini' | 'manual'
  createdAt: string
  updatedAt: string
  lastGeneratedAt?: string
  status: CampaignLandingStatus
  seoTitle: string
  seoDescription: string
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
  sections: CampaignLandingSection[]
  offerTitle: string
  offerBody: string
  formTitle: string
  thankYouMessage: string
  accentColor: string
  backgroundStyle: string
}

export type CampaignLandingsSnapshot = {
  items: CampaignLanding[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function randomId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function slugify(input: string) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const defaultLandingTemplate: Omit<CampaignLanding, 'id' | 'slug' | 'name' | 'objective' | 'audience' | 'tone' | 'createdAt' | 'updatedAt'> = {
  provider: 'manual',
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
  heroEyebrow: 'Campaña focalizada',
  heroTitle: 'Impulsa tu transformación con foco estratégico',
  heroSubtitle: 'Diseñamos un plan accionable con métricas claras de impacto para tu equipo.',
  primaryCtaLabel: 'Solicitar diagnóstico',
  primaryCtaHref: '/#contacto',
  secondaryCtaLabel: 'Ver servicios',
  secondaryCtaHref: '/#servicios',
  sections: [
    {
      id: 'problema',
      title: 'El desafío',
      body: 'Tu equipo enfrenta presión por resultados con tecnología, pero sin un roadmap priorizado.',
      bullets: ['Visión fragmentada', 'Procesos sin estandarización', 'Baja adopción interna'],
    },
    {
      id: 'solucion',
      title: 'La propuesta',
      body: 'Implementamos una hoja de ruta en fases con quick wins de negocio y criterios de escala.',
      bullets: ['Diagnóstico rápido', 'Plan de ejecución por etapas', 'Acompañamiento del cambio'],
    },
    {
      id: 'prueba',
      title: 'Resultados esperados',
      body: 'Resultados medibles durante el primer ciclo de implementación.',
      bullets: ['Reducción de fricción operativa', 'Mayor velocidad de decisión', 'Visibilidad ejecutiva'],
    },
  ],
  offerTitle: 'Sesión de estrategia de 30 minutos',
  offerBody: 'Agenda una sesión con nuestro equipo para mapear objetivos, brechas y próximos pasos.',
  formTitle: 'Cuéntanos tu desafío',
  thankYouMessage: 'Gracias. Te contactaremos pronto para avanzar con la campaña.',
  accentColor: '#2563eb',
  backgroundStyle: 'dark-grid',
}

export function getDefaultCampaignLandingsSnapshot(): CampaignLandingsSnapshot {
  return { items: [] }
}

function sanitizeSection(input: any, index: number): CampaignLandingSection {
  const safeId = slugify(input?.id || `section-${index + 1}`) || `section-${index + 1}`
  const rawBullets = Array.isArray(input?.bullets) ? input.bullets : []
  const bullets = rawBullets
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
  return {
    id: safeId,
    title: String(input?.title || '').trim().slice(0, 140),
    body: String(input?.body || '').trim().slice(0, 2000),
    bullets,
  }
}

export function sanitizeCampaignLanding(input: unknown): CampaignLanding {
  const raw = (input && typeof input === 'object' ? input : {}) as any
  const now = nowIso()
  const slug = slugify(raw.slug || raw.name || raw.heroTitle || '') || `campaign-${Date.now().toString(36)}`
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : defaultLandingTemplate.sections
  const sections = sectionsRaw.slice(0, 6).map((section: any, index: number) => sanitizeSection(section, index))

  return {
    id: String(raw.id || randomId()),
    slug,
    name: String(raw.name || raw.heroTitle || slug).trim().slice(0, 120),
    objective: String(raw.objective || '').trim().slice(0, 600),
    audience: String(raw.audience || '').trim().slice(0, 600),
    tone: String(raw.tone || '').trim().slice(0, 160),
    provider: raw.provider === 'openai' || raw.provider === 'gemini' ? raw.provider : 'manual',
    createdAt: String(raw.createdAt || now),
    updatedAt: String(raw.updatedAt || now),
    lastGeneratedAt: raw.lastGeneratedAt ? String(raw.lastGeneratedAt) : undefined,
    status: raw.status === 'published' ? 'published' : 'draft',
    seoTitle: String(raw.seoTitle || '').trim().slice(0, 180),
    seoDescription: String(raw.seoDescription || '').trim().slice(0, 300),
    heroEyebrow: String(raw.heroEyebrow || defaultLandingTemplate.heroEyebrow).trim().slice(0, 120),
    heroTitle: String(raw.heroTitle || defaultLandingTemplate.heroTitle).trim().slice(0, 220),
    heroSubtitle: String(raw.heroSubtitle || defaultLandingTemplate.heroSubtitle).trim().slice(0, 1000),
    primaryCtaLabel: String(raw.primaryCtaLabel || defaultLandingTemplate.primaryCtaLabel).trim().slice(0, 80),
    primaryCtaHref: String(raw.primaryCtaHref || defaultLandingTemplate.primaryCtaHref).trim().slice(0, 220),
    secondaryCtaLabel: String(raw.secondaryCtaLabel || defaultLandingTemplate.secondaryCtaLabel).trim().slice(0, 80),
    secondaryCtaHref: String(raw.secondaryCtaHref || defaultLandingTemplate.secondaryCtaHref).trim().slice(0, 220),
    sections: sections.length ? sections : clone(defaultLandingTemplate.sections),
    offerTitle: String(raw.offerTitle || defaultLandingTemplate.offerTitle).trim().slice(0, 180),
    offerBody: String(raw.offerBody || defaultLandingTemplate.offerBody).trim().slice(0, 1500),
    formTitle: String(raw.formTitle || defaultLandingTemplate.formTitle).trim().slice(0, 180),
    thankYouMessage: String(raw.thankYouMessage || defaultLandingTemplate.thankYouMessage).trim().slice(0, 500),
    accentColor: String(raw.accentColor || defaultLandingTemplate.accentColor).trim().slice(0, 40),
    backgroundStyle: String(raw.backgroundStyle || defaultLandingTemplate.backgroundStyle).trim().slice(0, 60),
  }
}

export function sanitizeCampaignLandingsSnapshot(input: unknown): CampaignLandingsSnapshot {
  const base = getDefaultCampaignLandingsSnapshot()
  if (!input || typeof input !== 'object') return base
  const raw = input as any
  const rawItems = Array.isArray(raw.items) ? raw.items : []

  const bySlug = new Map<string, CampaignLanding>()
  for (const item of rawItems) {
    const sanitized = sanitizeCampaignLanding(item)
    const uniqueSlug = bySlug.has(sanitized.slug)
      ? `${sanitized.slug}-${sanitized.id.slice(0, 6)}`
      : sanitized.slug
    bySlug.set(uniqueSlug, { ...sanitized, slug: uniqueSlug })
  }
  return { items: Array.from(bySlug.values()) }
}

export function upsertCampaignLanding(snapshot: CampaignLandingsSnapshot, landing: CampaignLanding): CampaignLandingsSnapshot {
  const now = nowIso()
  const normalized = sanitizeCampaignLanding({ ...landing, updatedAt: now })
  const items = [...snapshot.items]
  const existingIndex = items.findIndex((item) => item.id === normalized.id || item.slug === normalized.slug)
  if (existingIndex === -1) {
    items.unshift({ ...normalized, createdAt: normalized.createdAt || now, updatedAt: now })
  } else {
    const existing = items[existingIndex]
    items[existingIndex] = {
      ...existing,
      ...normalized,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    }
  }
  return sanitizeCampaignLandingsSnapshot({ items })
}

export function deleteCampaignLanding(snapshot: CampaignLandingsSnapshot, idOrSlug: string): CampaignLandingsSnapshot {
  const key = String(idOrSlug || '').trim()
  const items = snapshot.items.filter((item) => item.id !== key && item.slug !== key)
  return sanitizeCampaignLandingsSnapshot({ items })
}
