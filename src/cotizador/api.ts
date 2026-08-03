/** Cliente de la API del Cotizador (sesión por cookie del sitio). */

export type QuoteListItem = {
  id: string
  publicId: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  clientName: string
  title: string
  currency: string
  totalFinal: number
  weeks: number
  moduleCount: number
  views: number
  publishedAt: string | null
  updatedAt: string
}

export type QuoteRecipient = {
  id: string
  token: string
  name: string
  email: string | null
  role: string | null
  sentAt: string | null
  firstSeenAt: string | null
  lastSeenAt: string | null
  openCount: number
}

export type QuoteMessageRow = {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: { providerUsed?: string; changes?: string[] } | null
  createdAt: string
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Error ${res.status}`)
  }
  return payload
}

export const quotesApi = {
  list: () => post('/api/quotes/manage', { op: 'list' }),
  get: (quoteId: string) => post('/api/quotes/manage', { op: 'get', quoteId }),
  create: (data: { clientName: string; sector?: string; clientContact?: string; clientEmail?: string }) =>
    post('/api/quotes/manage', { op: 'create', ...data }),
  update: (quoteId: string, data: Record<string, unknown>) =>
    post('/api/quotes/manage', { op: 'update', quoteId, ...data }),
  publish: (quoteId: string) => post('/api/quotes/manage', { op: 'publish', quoteId }),
  unpublish: (quoteId: string) => post('/api/quotes/manage', { op: 'unpublish', quoteId }),
  duplicate: (quoteId: string) => post('/api/quotes/manage', { op: 'duplicate', quoteId }),
  remove: (quoteId: string) => post('/api/quotes/manage', { op: 'delete', quoteId }),
  addRecipient: (quoteId: string, data: { name: string; email?: string; role?: string }) =>
    post('/api/quotes/manage', { op: 'add-recipient', quoteId, ...data }),
  removeRecipient: (quoteId: string, recipientId: string) =>
    post('/api/quotes/manage', { op: 'remove-recipient', quoteId, recipientId }),
  chat: (quoteId: string, message: string) => post('/api/quotes/chat', { quoteId, message }),
  metrics: (quoteId: string) => post('/api/quotes/metrics', { quoteId }),
  send: (quoteId: string, recipientId: string, note?: string) =>
    post('/api/quotes/send', { quoteId, recipientId, note }),
  knowledge: {
    list: () => post('/api/quotes/knowledge', { op: 'list' }),
    create: (data: Record<string, unknown>) => post('/api/quotes/knowledge', { op: 'create', ...data }),
    update: (id: string, data: Record<string, unknown>) => post('/api/quotes/knowledge', { op: 'update', id, ...data }),
    remove: (id: string) => post('/api/quotes/knowledge', { op: 'delete', id }),
  },
}

export function money(amount: number, currency = 'COP') {
  const value = Math.round(Number(amount) || 0)
  const grouped = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return currency === 'USD' ? `USD ${grouped}` : `$ ${grouped}`
}

export function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days === 1 ? '' : 's'}`
}

export function fmtDuration(ms: number) {
  if (!ms) return '—'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${seconds % 60} s`
}
