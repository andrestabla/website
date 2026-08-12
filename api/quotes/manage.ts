/**
 * Cotizador — CRUD de cotizaciones (privado, requiere módulo COTIZADOR).
 *
 * op: list | get | create | update | publish | unpublish | archive | duplicate
 *     | recipients | add-recipient | remove-recipient
 */
import { prisma } from '../_lib/prisma.js'
import {
  quoteSessionState,
  newPublicId,
  newRecipientToken,
  computeTotals,
  normalizeItems,
  itemsFromCatalog,
  loadCatalog,
  catalogMap,
  DEFAULT_DISCOUNT_SCALE,
  FLAT_DISCOUNT_SCALE,
  QUOTE_TEMPLATES,
  normalizeTemplate,
  type QuoteItem,
  type QuoteTemplateKey,
} from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).quote
const recipientDb = () => (prisma as any).quoteRecipient
const eventDb = () => (prisma as any).quoteEvent

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Documento por defecto: la IA lo va reescribiendo sección por sección. */
function emptyContent() {
  return {
    intro: '',
    diagnosis: { lede: '', fronts: [] as Array<{ title: string; body: string; needs: string }> },
    approach: '',
    scopeNote: '',
    timelineNote: '',
    assumptions: [] as string[],
    exclusions: [] as string[],
    service: { includedMonths: 12, renewalPrice: 8_000_000, exitPrice: 4_000_000 },
    signature: {
      name: 'Ana Milena Diazgranados',
      role: 'Directora de Relacionamiento · Algoritmo T',
      email: 'anadiazgranados@algoritmot.com',
      phone: '+57 300 659 0161',
    },
  }
}

/** Recalcula totales en el servidor y devuelve el registro listo para guardar. */
async function priced(items: QuoteItem[], scale: any, template: QuoteTemplateKey = 'SOLUCIONES') {
  const totals = computeTotals(items, {
    scale: Array.isArray(scale) && scale.length ? scale : undefined,
    minWeeks: QUOTE_TEMPLATES[template].minWeeks,
  })
  return {
    pricing: { items, totals },
    totalBase: totals.subtotal,
    totalFinal: totals.total,
    weeks: totals.weeks,
    moduleCount: totals.moduleCount,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const userId = session.userId
  const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const op = str(body.op, 40)
    const quoteId = str(body.quoteId, 40)

    // Toda operación sobre una cotización valida propiedad (o rol admin).
    const own = async () => {
      if (!quoteId) throw Object.assign(new Error('quoteId requerido'), { status: 400 })
      const quote = await db().findUnique({ where: { id: quoteId } })
      if (!quote) throw Object.assign(new Error('Cotización no encontrada'), { status: 404 })
      if (quote.ownerId !== userId && !isAdmin) {
        throw Object.assign(new Error('Esta cotización es de otro usuario'), { status: 403 })
      }
      return quote
    }

    if (op === 'list') {
      // Los administradores ven las cotizaciones de todo el equipo; los demás, las suyas.
      const where = isAdmin ? {} : { ownerId: userId }
      const quotes = await db().findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true, publicId: true, status: true, template: true, clientName: true, title: true,
          currency: true, totalFinal: true, weeks: true, moduleCount: true,
          publishedAt: true, createdAt: true, updatedAt: true, ownerId: true,
        },
      })
      // Una sola pasada por métricas y dueños para no hacer N+1.
      const ids = quotes.map((q: any) => q.id)
      const ownerIds = [...new Set(quotes.map((q: any) => q.ownerId))]
      const [views, owners] = await Promise.all([
        ids.length
          ? eventDb().groupBy({ by: ['quoteId'], where: { quoteId: { in: ids }, type: 'view' }, _count: { _all: true } })
          : [],
        ownerIds.length
          ? (prisma as any).adminUser.findMany({ where: { id: { in: ownerIds } }, select: { id: true, displayName: true, username: true } })
          : [],
      ])
      const viewsBy = new Map(views.map((v: any) => [v.quoteId, v._count._all]))
      const ownerBy = new Map(owners.map((o: any) => [o.id, o.displayName || o.username]))
      return res.status(200).json({
        ok: true,
        quotes: quotes.map((q: any) => ({
          ...q,
          views: viewsBy.get(q.id) ?? 0,
          ownerName: ownerBy.get(q.ownerId) ?? null,
        })),
      })
    }

    if (op === 'get') {
      const quote = await own()
      const [recipients, messages, catalog] = await Promise.all([
        recipientDb().findMany({ where: { quoteId: quote.id }, orderBy: { createdAt: 'asc' } }),
        (prisma as any).quoteMessage.findMany({ where: { quoteId: quote.id }, orderBy: { createdAt: 'asc' }, take: 200 }),
        loadCatalog(normalizeTemplate(quote.template)),
      ])
      return res.status(200).json({ ok: true, quote, recipients, messages, catalog })
    }

    if (op === 'create') {
      const clientName = str(body.clientName, 160)
      if (!clientName) return res.status(400).json({ ok: false, error: 'Falta el nombre del cliente' })

      // Cotización-documento: una pieza diagramada aparte (HTML propio) que
      // igual vive en el sistema — URL pública con métricas, destinatarios,
      // estados. No usa catálogo ni módulos.
      if (body.documentUrl !== undefined) {
        const total = Math.max(0, Math.round(Number(body.total) || 0))
        const content = { ...emptyContent(), documentUrl: str(body.documentUrl, 500), modulesSelectable: false }
        const quote = await db().create({
          data: {
            publicId: newPublicId(),
            ownerId: userId,
            template: 'SOLUCIONES',
            clientName,
            clientContact: str(body.clientContact, 160) || null,
            clientEmail: str(body.clientEmail, 200) || null,
            sector: str(body.sector, 120) || null,
            title: str(body.title, 200) || `Propuesta para ${clientName}`,
            subtitle: str(body.subtitle, 400) || null,
            currency: 'COP',
            content,
            discountScale: FLAT_DISCOUNT_SCALE,
            pricing: { items: [], totals: null },
            totalBase: total,
            totalFinal: total,
            weeks: 0,
            moduleCount: 0,
          },
        })
        return res.status(200).json({ ok: true, quote })
      }

      const template = normalizeTemplate(body.template)
      const catalog = await loadCatalog(template)
      if (!catalog.length) {
        return res.status(400).json({ ok: false, error: `El catálogo de la plantilla ${template} está vacío` })
      }

      const items = itemsFromCatalog(catalog)
      const def = QUOTE_TEMPLATES[template]
      const scale = def.kind === 'MODULAR' ? DEFAULT_DISCOUNT_SCALE : FLAT_DISCOUNT_SCALE
      const p = await priced(items, scale, template)
      const defaultTitle = `${def.titlePrefix} para ${clientName}`
      const content = emptyContent()
      if (def.kind === 'UNIDADES') {
        // los servicios por unidad no traen año de infraestructura por defecto
        ;(content as any).service = { includedMonths: 0, renewalPrice: 0, exitPrice: 0 }
      }
      const quote = await db().create({
        data: {
          publicId: newPublicId(),
          ownerId: userId,
          template,
          clientName,
          clientContact: str(body.clientContact, 160) || null,
          clientEmail: str(body.clientEmail, 200) || null,
          sector: str(body.sector, 120) || null,
          title: str(body.title, 200) || defaultTitle,
          subtitle: str(body.subtitle, 400) || null,
          currency: catalog[0]?.currency || 'COP',
          content,
          discountScale: scale,
          ...p,
        },
      })
      return res.status(200).json({ ok: true, quote })
    }

    if (op === 'update') {
      const quote = await own()
      const data: Record<string, unknown> = {}

      for (const field of ['clientName', 'clientContact', 'clientEmail', 'sector', 'title', 'subtitle'] as const) {
        if (body[field] === undefined) continue
        const value = str(body[field], 400)
        // el nombre del cliente y el título son obligatorios: vacío = no tocar
        if (!value && (field === 'clientName' || field === 'title')) continue
        data[field] = value || null
      }
      if (body.validDays !== undefined) {
        data.validDays = Math.min(365, Math.max(1, Math.round(Number(body.validDays) || 45)))
      }
      // Cotizaciones-documento: la inversión se fija a mano (no hay ítems).
      if (body.documentTotal !== undefined) {
        const total = Math.max(0, Math.round(Number(body.documentTotal) || 0))
        data.totalBase = total
        data.totalFinal = total
      }
      if (body.content !== undefined && body.content && typeof body.content === 'object') {
        data.content = { ...(quote.content as object), ...(body.content as object) }
      }
      if (body.discountScale !== undefined && Array.isArray(body.discountScale)) {
        data.discountScale = body.discountScale
      }
      if (body.items !== undefined) {
        const catalog = await loadCatalog(normalizeTemplate(quote.template))
        const items = normalizeItems(body.items, catalogMap(catalog))
        if (!items.length) return res.status(400).json({ ok: false, error: 'La cotización necesita al menos una línea con nombre' })
        Object.assign(data, await priced(items, data.discountScale ?? quote.discountScale, normalizeTemplate(quote.template)))
      }

      const updated = await db().update({ where: { id: quote.id }, data })
      return res.status(200).json({ ok: true, quote: updated })
    }

    if (op === 'publish' || op === 'unpublish' || op === 'archive') {
      const quote = await own()
      const status = op === 'publish' ? 'PUBLISHED' : op === 'archive' ? 'ARCHIVED' : 'DRAFT'
      const updated = await db().update({
        where: { id: quote.id },
        data: { status, publishedAt: op === 'publish' ? (quote.publishedAt ?? new Date()) : quote.publishedAt },
      })
      return res.status(200).json({ ok: true, quote: updated })
    }

    if (op === 'duplicate') {
      const quote = await own()
      const copy = await db().create({
        data: {
          publicId: newPublicId(),
          ownerId: userId,
          status: 'DRAFT',
          template: quote.template,
          clientName: str(body.clientName, 160) || `${quote.clientName} (copia)`,
          clientContact: quote.clientContact,
          clientEmail: quote.clientEmail,
          sector: quote.sector,
          title: quote.title,
          subtitle: quote.subtitle,
          currency: quote.currency,
          content: quote.content,
          pricing: quote.pricing,
          discountScale: quote.discountScale,
          totalBase: quote.totalBase,
          totalFinal: quote.totalFinal,
          weeks: quote.weeks,
          moduleCount: quote.moduleCount,
          validDays: quote.validDays,
        },
      })
      return res.status(200).json({ ok: true, quote: copy })
    }

    if (op === 'add-recipient') {
      const quote = await own()
      const name = str(body.name, 160)
      if (!name) return res.status(400).json({ ok: false, error: 'Falta el nombre del destinatario' })
      const recipient = await recipientDb().create({
        data: {
          quoteId: quote.id,
          token: newRecipientToken(),
          name,
          email: str(body.email, 200) || null,
          role: str(body.role, 120) || null,
        },
      })
      return res.status(200).json({ ok: true, recipient })
    }

    if (op === 'remove-recipient') {
      const quote = await own()
      const recipientId = str(body.recipientId, 40)
      await recipientDb().deleteMany({ where: { id: recipientId, quoteId: quote.id } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'delete') {
      const quote = await own()
      await db().delete({ where: { id: quote.id } })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op || '(vacía)'}` })
  } catch (error: any) {
    const status = error?.status || 500
    if (status === 500) console.error('quotes/manage error:', error)
    return res.status(status).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
