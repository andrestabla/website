/**
 * Cotizador — contexto de la plataforma.
 *
 * Todo lo que algoritmot.com dice de Algoritmo T, en texto plano, para que la
 * IA del Cotizador construya cada propuesta con el portafolio completo: la
 * portada (/), la línea Empresas (/empresas, servicios, productos, protocolos,
 * método MD-IA) y la línea Educación (/educacion y sus páginas hijas).
 *
 * Se lee la instantánea viva del CMS —lo que ve el visitante hoy— y se cae a
 * la instantánea por defecto si la base no responde. Los protocolos viven en
 * páginas estáticas del sitio, así que van transcritos aquí.
 */
import { prisma } from './prisma.js'
import { getDefaultCmsSnapshot, sanitizeCmsSnapshot } from './cms.js'
import { METHODOLOGY_KB } from './methodology.js'
import { SIMULATOR_PHASES } from './simulator.js'

const SNAPSHOT_ID = 'main'
const CACHE_TTL_MS = 5 * 60 * 1000
/** Tope del bloque completo, en caracteres. El sitio entero cabe de sobra. */
const PLATFORM_BUDGET = 70_000

/** Páginas públicas que forman el contexto, en el orden en que se leen. */
const PAGES: Array<{ path: string; heading: string }> = [
  { path: '/', heading: 'PORTADA (/) · las dos líneas de la casa' },
  { path: '/empresas', heading: 'LÍNEA EMPRESAS (/empresas)' },
  { path: '/educacion', heading: 'LÍNEA EDUCACIÓN (/educacion)' },
  { path: '/plataformas-de-aprendizaje', heading: 'Educación · Plataformas de aprendizaje (/plataformas-de-aprendizaje)' },
  { path: '/virtualizacion-programas', heading: 'Educación · Virtualización de programas (/virtualizacion-programas)' },
  { path: '/auditoria-programas-virtuales', heading: 'Educación · Auditoría de programas virtuales (/auditoria-programas-virtuales)' },
]

/** Los tres protocolos de la línea Empresas, tal como los publican sus páginas. */
const PROTOCOLS = `
### Protocolo 01 · Ingeniería Humana (/protocolos/ingenieria-humana)
El factor limitante de la transformación digital es la capacidad humana de adoptarla, adaptarla y mantenerla viva.
Ingeniería Humana es la metodología para diseñar, implementar y sostener el cambio organizacional: la organización se analiza como un sistema donde personas, procesos y tecnología deben alinearse. Se trabaja sobre las personas que usarán las herramientas: un ERP sin adopción es un gasto.
Los 4 pilares:
- Arquitectura Cognitiva: flujos de trabajo que respetan los límites cognitivos del equipo. Menos fricción, mayor adopción.
- Diseño de Hábitos Digitales: las herramientas se vuelven rutinas; cada sistema se integra en el día a día sin resistencia cultural.
- Redes de Confianza Interna: se identifican los nodos de influencia de la organización para acelerar la adopción.
- Liderazgo Habilitador: los líderes se forman como amplificadores del cambio.
Resultados que promete la página: reducción del 60% en resistencia al cambio; adopción digital en menos de 90 días; equipos autónomos capaces de escalar sin dependencias; cultura de mejora continua instalada.
Entrada: diagnóstico de madurez organizacional sin costo.

### Protocolo 02 · Despliegue IA (/protocolos/despliegue-ia)
La IA se despliega con estrategia, gobernanza y una hoja de ruta que convierte el potencial en valor medible. La página parte de un dato: el 87% de los proyectos de IA no llegan a producción, por ausencia de estrategia, datos de pobre calidad y organizaciones sin preparación para operar modelos.
Las 4 fases:
- 01 Evaluación de Readiness: auditoría de infraestructura de datos, procesos y cultura para determinar la preparación real antes de desplegar un modelo.
- 02 Arquitectura de Solución: qué modelos usar, cómo conectarlos con los sistemas actuales y cómo gobernarlos.
- 03 Despliegue Controlado: implementación por fases con pilotos medibles; cada etapa con métricas de éxito y criterios de escalabilidad.
- 04 Gobierno y Sostenibilidad: políticas, controles y capacidades internas para que la IA sea un activo sostenible.
Resultados que promete la página: modelos de IA en producción en menos de 120 días; ROI medible desde la primera fase; equipos internos capacitados para operar la IA; marco de gobernanza alineado con NIST AI RMF e ISO 42001.
Entrada: evaluación técnica gratuita de 45 minutos.

### Protocolo 03 · Madurez Orgánica (/protocolos/madurez-organica)
La transformación digital es un estado organizacional, y Madurez Orgánica es el camino para llegar y quedarse.
Modelo de 5 niveles de madurez digital:
1. Inicial: procesos ad-hoc, tecnología aislada.
2. Repetible: prácticas documentadas, dependencia de personas clave.
3. Definida: procesos estandarizados, gobierno establecido.
4. Gestionada: métricas continuas, decisiones basadas en datos.
5. Optimizada: mejora continua autónoma, innovación sistemática.
4 dimensiones de intervención:
- Estrategia Digital Coherente (nivel 1 → 3): cada iniciativa tecnológica alineada con los objetivos del negocio.
- Procesos Vivos (nivel 2 → 4): procesos clave documentados, automatizados y en mejora.
- Datos como Activo (nivel 1 → 4): infraestructura de datos que convierte información dispersa en inteligencia de negocio.
- Capacidad de Cambio Continuo (nivel 3 → 5): mentalidad y estructuras para que la organización mejore por sí sola.
Entregables: diagnóstico de madurez digital con mapa de brechas; hoja de ruta priorizada a 12 y 24 meses; indicadores de madurez monitoreados; capacidad interna de sostenimiento del modelo.
Duración típica: 6 a 12 meses según la complejidad organizacional y el delta de madurez, con revisiones de estado cada 30 días. Entrada: diagnóstico de 45 minutos.
`.trim()

// ── Serialización de bloques ─────────────────────────────────────────────────

const text = (v: unknown, max = 2000) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Cuerpos que en realidad son rutas o URL (el CMS a veces los guarda así). */
const looksLikeLink = (s: string) => /^\/?https?:\/\//i.test(s) || /^\/[^\s]*$/.test(s) || /^#/.test(s)

const prose = (v: unknown, max = 2000) => {
  const s = text(v, max)
  return s && !looksLikeLink(s) ? s : ''
}

const stripHtml = (html: string) =>
  html
    .replace(/<\/(p|div|li|h\d|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()

/** wa.me/57… → número legible; cualquier otro enlace se omite. */
const whatsappFrom = (href: unknown) => {
  const m = text(href, 200).match(/wa\.me\/(\d{10,13})/)
  if (!m) return ''
  const digits = m[1]
  return digits.startsWith('57') ? `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : `+${digits}`
}

function itemToLines(item: unknown): string[] {
  if (typeof item === 'string') {
    const s = prose(item, 400)
    return s ? [`- ${s}`] : []
  }
  if (!item || typeof item !== 'object') return []
  const it = item as Record<string, unknown>
  const title = text(it.title, 200) || text(it.label, 200) || text(it.name, 200)
  const body = prose(it.body, 1200) || prose(it.description, 1200) || prose(it.desc, 1200)
  if (!title && !body) return []
  const head = title && body ? `- ${title}: ${body}` : `- ${title || body}`
  const out = [head]
  const simple = prose(it.inSimpleWords, 600)
  if (simple) out.push(`  En palabras simples: ${simple}`)
  const benefit = prose(it.businessBenefit, 600)
  if (benefit) out.push(`  Beneficio para el cliente: ${benefit}`)
  const ideal = prose(it.idealWhen, 400)
  if (ideal) out.push(`  Ideal cuando ${ideal}`)
  const level = text(it.level, 80)
  if (level) out.push(`  ${level}`)
  if (Array.isArray(it.outcomes)) {
    const outcomes = it.outcomes.map((o) => prose(o, 200)).filter(Boolean)
    if (outcomes.length) out.push(`  Resultados: ${outcomes.join('; ')}`)
  }
  if (Array.isArray(it.features)) {
    const features = it.features.map((o) => prose(o, 200)).filter(Boolean)
    if (features.length) out.push(`  Incluye: ${features.join('; ')}`)
  }
  return out
}

function blockToText(block: any): string {
  if (!block || block.visible === false) return ''
  const c = (block.content && typeof block.content === 'object' ? block.content : {}) as Record<string, unknown>
  const lines: string[] = []

  if (block.type === 'navigation-selector') {
    const corp = [text(c.corporateTitle, 200), prose(c.corporateDescription, 600)].filter(Boolean).join(': ')
    const edu = [text(c.educationTitle, 200), prose(c.educationDescription, 600)].filter(Boolean).join(': ')
    if (corp) lines.push(`- Empresas → /empresas · ${corp}`)
    if (edu) lines.push(`- Educación → /educacion · ${edu}`)
    return lines.join('\n')
  }

  const title = text(c.title, 300) || text(block.name, 200)
  const eyebrow = text(c.eyebrow, 200)
  if (title) lines.push(`### ${title}${eyebrow && eyebrow !== title ? ` (${eyebrow})` : ''}`)
  const subtitle = prose(c.subtitle, 600)
  if (subtitle) lines.push(subtitle)
  const body = prose(c.body, 3000)
  if (body) lines.push(body)
  if (typeof c.html === 'string') {
    const html = stripHtml(c.html).slice(0, 4000)
    if (html) lines.push(html)
  }

  if (Array.isArray(c.items)) {
    // Carruseles de logos: basta la lista de nombres (los clientes que respaldan la línea).
    const isLogoWall =
      block.type === 'carousel' &&
      c.items.every((it: any) => it && typeof it === 'object' && !prose(it.body) && !prose(it.description))
    if (isLogoWall) {
      const names = c.items.map((it: any) => text(it?.title, 120)).filter(Boolean)
      if (names.length) lines.push(`Clientes: ${names.join(', ')}.`)
    } else {
      for (const item of c.items) lines.push(...itemToLines(item))
    }
  }

  if (Array.isArray(c.badges)) {
    const badges = c.badges.map((b: unknown) => text(b, 60)).filter(Boolean)
    if (badges.length) lines.push(`Sellos: ${badges.join(' · ')}`)
  }

  if (block.type === 'contact' || block.type === 'cta') {
    const email = text(c.email, 120)
    const wa = whatsappFrom(c.primaryHref) || whatsappFrom(c.secondaryHref)
    const channels = [email && `correo ${email}`, wa && `WhatsApp ${wa}`].filter(Boolean)
    if (channels.length) lines.push(`Contacto: ${channels.join(' · ')}.`)
  }

  // Un bloque que solo trae título no aporta: se omite.
  return lines.length > 1 ? lines.join('\n') : ''
}

function pageToText(page: any): string {
  const blocks: any[] = Array.isArray(page?.blocks) ? page.blocks : []
  const parts = blocks
    .slice()
    .sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))
    .map(blockToText)
    .filter(Boolean)
  const description = prose(page?.description, 400)
  return [description, ...parts].filter(Boolean).join('\n\n')
}

function servicesToText(services: any[]): string {
  return services
    .map((s, i) => {
      const lines = [`### ${i + 1}. ${text(s.title, 160)}${s.highlight ? ` · ${text(s.highlight, 120)}` : ''} (/servicios/${text(s.slug, 80)})`]
      const subtitle = prose(s.subtitle, 400)
      if (subtitle) lines.push(subtitle)
      const long = prose(s.descriptionLong, 2000) || prose(s.description, 600)
      if (long) lines.push(long)
      const features = Array.isArray(s.features) ? s.features.map((f: unknown) => text(f, 120)).filter(Boolean) : []
      if (features.length) lines.push(`Instrumentos: ${features.join(' · ')}`)
      const outcomes = Array.isArray(s.outcomes) ? s.outcomes.map((o: unknown) => prose(o, 240)).filter(Boolean) : []
      if (outcomes.length) lines.push('Entregables:', ...outcomes.map((o: string) => `- ${o}`))
      return lines.join('\n')
    })
    .join('\n\n')
}

function productsToText(products: any[]): string {
  return products
    .map((p) => {
      const lines = [`### ${text(p.title, 160)}${p.highlight ? ` · ${text(p.highlight, 120)}` : ''} (/productos/${text(p.slug, 80)})`]
      const long = prose(p.descriptionLong, 1200) || prose(p.description, 600)
      if (long) lines.push(long)
      const price = text(p.price, 120)
      if (price) lines.push(`Modalidad que anuncia la página: ${price}.`)
      return lines.join('\n')
    })
    .join('\n\n')
}

function phasesToText(): string {
  return SIMULATOR_PHASES.map(
    (p) => `- Fase ${p.index} · ${p.name} (${p.tagline}): ${p.description} Instrumentos: ${p.methods.join(', ')}.`
  ).join('\n')
}

// ── Composición ──────────────────────────────────────────────────────────────

/** Texto completo a partir de una instantánea del CMS. Pura: sirve para probar sin base de datos. */
export function platformContextFromSnapshot(snapshot: any): string {
  const site = snapshot?.site ?? {}
  const hero = snapshot?.hero ?? {}
  const pages: any[] = Array.isArray(snapshot?.siteArchitecture?.pages) ? snapshot.siteArchitecture.pages : []
  const byPath = new Map<string, any>(
    pages
      .filter((p) => p?.status === 'published')
      .map((p) => [String(p.path || '').replace(/\/+$/, '') || '/', p])
  )

  const sections: string[] = []

  sections.push(
    [
      `# ${text(site.name, 80) || 'Algoritmo T'} · lo que publica algoritmot.com`,
      prose(site.description, 400),
      hero.title ? `Posicionamiento: "${text(hero.title, 200)}" — ${prose(hero.subtitle, 400)}${hero.highlight ? ` (${text(hero.highlight, 60)})` : ''}` : '',
      `Sede: ${text(site.contactAddress, 120) || 'Bogotá, Colombia'}. Cobertura en Latinoamérica.`,
      'Dos líneas de negocio: Empresas (transformación digital, procesos, IA y soluciones a la medida) y Educación (plataformas de aprendizaje, virtualización de programas, auditoría de calidad y formación docente).',
    ]
      .filter(Boolean)
      .join('\n')
  )

  for (const { path, heading } of PAGES) {
    const page = byPath.get(path)
    if (!page) continue
    const body = pageToText(page)
    if (!body) continue
    sections.push(`## ${heading}\n${body}`)

    // Tras /empresas van el detalle de servicios, productos, protocolos y método: son la misma línea.
    if (path === '/empresas') {
      const services = Array.isArray(snapshot?.services) ? snapshot.services : []
      if (services.length) sections.push(`## Empresas · Las 6 fases del servicio (detalle de /servicios)\n${servicesToText(services)}`)
      const products = Array.isArray(snapshot?.products) ? snapshot.products : []
      if (products.length) sections.push(`## Empresas · Soluciones empaquetadas (detalle de /productos)\n${productsToText(products)}`)
      sections.push(`## Empresas · Los 3 protocolos\n${PROTOCOLS}`)
      sections.push(`## Empresas · Fases del simulador de transformación (/empresas/simulador)\nLa inversión del simulador es referencial en USD y se precisa tras el diagnóstico; en una cotización el precio sale del catálogo.\n${phasesToText()}`)
      // Los títulos del método bajan un nivel para colgar de esta sección.
      sections.push(`## Empresas · Método MD-IA (base del agente Atenea y del diagnóstico)\n${METHODOLOGY_KB.replace(/^#+ /gm, '### ')}`)
    }
  }

  return sections.join('\n\n').slice(0, PLATFORM_BUDGET)
}

let cache: { text: string; at: number } | null = null

/** Contexto de la plataforma a partir del CMS vivo, con caché corta por instancia. */
export async function loadPlatformContext(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.text
  let snapshot: any
  try {
    const row = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
    snapshot = row?.data ? sanitizeCmsSnapshot(row.data) : getDefaultCmsSnapshot()
  } catch (error) {
    console.error('platform-context: CMS snapshot unavailable, using defaults', error)
    snapshot = getDefaultCmsSnapshot()
  }
  const built = platformContextFromSnapshot(snapshot)
  cache = { text: built, at: Date.now() }
  return built
}
