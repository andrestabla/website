/** Cliente de la API del Learning Builder (sesión por cookie del sitio). */
import type { LbIssue } from './blocks.js'
import type { LbResourceContent } from './content.js'
import type { LbDirectives } from './directives.js'
import type { LbContent } from './blocks.js'
import type { LbCapability, LbRole } from './roles.js'
import type { LbResourceKind, LbShareMode, LbStatus } from './resources.js'

export type WorkspaceRow = {
  id: string
  /** Identificador raíz, el que va en la URL: UNICAFAM. */
  code: string
  name: string
  slug: string
  kind: string
  notes?: string | null
  active: boolean
  directives: LbDirectives
  role: LbRole
  capabilities: LbCapability[]
  resourceCount: number
  updatedAt: string
}

export type MemberRow = {
  id: string
  userId: string
  role: LbRole
  displayName: string
  username: string
  email: string | null
  createdAt: string
}

export type DataSourceRow = {
  id: string
  name: string
  provider: string
  config: { endpoint?: string; format?: string; apiKey?: string; query?: string }
  notes?: string | null
  active: boolean
}

export type ResourceRow = {
  id: string
  /** Identificador legible derivado del workspace: UNICAFAM-OVA-001. */
  code: string
  publicId: string
  workspaceId: string
  workspaceCode: string
  workspaceName: string
  kind: LbResourceKind
  title: string
  subtitle?: string | null
  course?: string | null
  unit?: string | null
  tags: string[]
  status: LbStatus
  shareMode: LbShareMode
  embedEnabled: boolean
  importMode?: string | null
  views: number
  lessonCount: number
  blockCount: number
  checkCount: number
  ownerId: string
  publishedAt: string | null
  updatedAt: string
  /** Solo en la metabiblioteca: el rol de quien consulta en ese workspace. */
  role?: LbRole
  /** Solo en la metabiblioteca: hilos de revisión sin atender. */
  openComments?: number
}

export type ResourceDetail = ResourceRow & { content: LbResourceContent; createdAt: string }

export type SourceRow = {
  id: string
  name: string
  format: string
  charCount: number
  truncated: boolean
  createdAt: string
}

export type VersionRow = { id: string; reason: string; label?: string | null; createdAt: string }

export type CommentRow = {
  id: string
  anchor: string
  anchorLabel: string | null
  parentId: string | null
  authorId: string
  authorName: string | null
  body: string
  status: 'OPEN' | 'RESOLVED'
  resolvedAt: string | null
  resolvedByName: string | null
  createdAt: string
  updatedAt: string
  canDelete: boolean
  canEdit: boolean
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || payload?.ok === false) {
    const error: any = new Error(payload?.error || `Error ${res.status}`)
    error.issues = payload?.issues
    error.status = res.status
    throw error
  }
  return payload
}

export const learningApi = {
  workspaces: {
    list: (): Promise<{ workspaces: WorkspaceRow[]; canCreate: boolean; defaults: LbDirectives; me: { userId: string; adminRole: string } }> =>
      post('/api/learning/workspaces', { op: 'list' }),
    get: (workspaceId: string): Promise<{ workspace: WorkspaceRow; role: LbRole; capabilities: LbCapability[] }> =>
      post('/api/learning/workspaces', { op: 'get', workspaceId }),
    create: (data: { name: string; kind?: string; notes?: string; directives?: LbDirectives }) =>
      post('/api/learning/workspaces', { op: 'create', ...data }),
    update: (workspaceId: string, data: Record<string, unknown>) =>
      post('/api/learning/workspaces', { op: 'update', workspaceId, ...data }),
    remove: (workspaceId: string) => post('/api/learning/workspaces', { op: 'delete', workspaceId }),
    team: (workspaceId: string): Promise<{ members: MemberRow[]; role: LbRole }> =>
      post('/api/learning/workspaces', { op: 'team', workspaceId }),
    memberAdd: (workspaceId: string, identifier: string, role: LbRole) =>
      post('/api/learning/workspaces', { op: 'member-add', workspaceId, identifier, role }),
    memberRole: (workspaceId: string, memberId: string, role: LbRole) =>
      post('/api/learning/workspaces', { op: 'member-role', workspaceId, memberId, role }),
    memberRemove: (workspaceId: string, memberId: string) =>
      post('/api/learning/workspaces', { op: 'member-remove', workspaceId, memberId }),
    dataSources: (workspaceId: string): Promise<{ dataSources: DataSourceRow[] }> =>
      post('/api/learning/workspaces', { op: 'data-sources', workspaceId }),
    dataSave: (workspaceId: string, data: Record<string, unknown>) =>
      post('/api/learning/workspaces', { op: 'data-save', workspaceId, ...data }),
    dataRemove: (workspaceId: string, id: string) =>
      post('/api/learning/workspaces', { op: 'data-delete', workspaceId, id }),
  },
  resources: {
    library: (workspaceCode?: string): Promise<{ resources: ResourceRow[] }> =>
      post('/api/learning/resources', { op: 'library', workspaceCode }),
    /** Acepta el id interno o el código legible (el de la URL). */
    get: (resourceIdOrCode: string): Promise<{
      resource: ResourceDetail
      workspace: { id: string; name: string; slug: string; kind: string }
      directives: LbDirectives
      role: LbRole
      issues: LbIssue[]
      shareCode: string | null
    }> =>
      post('/api/learning/resources', /^[A-Z0-9]+-[A-Z]{3}-\d{3}$/i.test(resourceIdOrCode)
        ? { op: 'get', code: resourceIdOrCode }
        : { op: 'get', resourceId: resourceIdOrCode }),
    create: (data: { workspaceId: string; kind: LbResourceKind; title: string; subtitle?: string; course?: string; unit?: string; tags?: string[] }) =>
      post('/api/learning/resources', { op: 'create', ...data }),
    update: (resourceId: string, data: Record<string, unknown>): Promise<{ resource: ResourceRow; issues: LbIssue[] }> =>
      post('/api/learning/resources', { op: 'update', resourceId, ...data }),
    publish: (resourceId: string) => post('/api/learning/resources', { op: 'publish', resourceId }),
    unpublish: (resourceId: string) => post('/api/learning/resources', { op: 'unpublish', resourceId }),
    archive: (resourceId: string) => post('/api/learning/resources', { op: 'archive', resourceId }),
    share: (resourceId: string, data: { mode: LbShareMode; embedEnabled?: boolean; rotateCode?: boolean }): Promise<{ resource: ResourceRow; shareCode: string | null }> =>
      post('/api/learning/resources', { op: 'share', resourceId, ...data }),
    duplicate: (resourceId: string) => post('/api/learning/resources', { op: 'duplicate', resourceId }),
    remove: (resourceId: string) => post('/api/learning/resources', { op: 'delete', resourceId }),
    versions: (resourceId: string): Promise<{ versions: VersionRow[] }> =>
      post('/api/learning/resources', { op: 'versions', resourceId }),
    restore: (resourceId: string, versionId: string): Promise<{ content: LbResourceContent; issues: LbIssue[] }> =>
      post('/api/learning/resources', { op: 'restore', resourceId, versionId }),
  },
  sources: {
    list: (resourceId: string): Promise<{ sources: SourceRow[] }> =>
      post('/api/learning/sources', { op: 'list', resourceId }),
    upload: (resourceId: string, data: { fileBase64: string; fileName: string; mimeType: string }) =>
      post('/api/learning/sources', { op: 'upload', resourceId, ...data }),
    paste: (resourceId: string, name: string, text: string) =>
      post('/api/learning/sources', { op: 'paste', resourceId, name, text }),
    remove: (resourceId: string, id: string) => post('/api/learning/sources', { op: 'delete', resourceId, id }),
  },
  comments: {
    list: (resourceId: string): Promise<{ comments: CommentRow[]; role: LbRole; me: string }> =>
      post('/api/learning/comments', { op: 'list', resourceId }),
    create: (resourceId: string, data: { anchor: string; body: string; parentId?: string }) =>
      post('/api/learning/comments', { op: 'create', resourceId, ...data }),
    edit: (resourceId: string, commentId: string, body: string) =>
      post('/api/learning/comments', { op: 'edit', resourceId, commentId, body }),
    resolve: (resourceId: string, commentId: string, resolved: boolean) =>
      post('/api/learning/comments', { op: 'resolve', resourceId, commentId, resolved }),
    remove: (resourceId: string, commentId: string) =>
      post('/api/learning/comments', { op: 'delete', resourceId, commentId }),
  },
  ai: {
    draft: (resourceId: string, sourceIds: string[], instruction?: string): Promise<{ content: LbContent; issues: LbIssue[]; providerUsed: string }> =>
      post('/api/learning/ai', { op: 'draft', resourceId, sourceIds, instruction }),
    revise: (resourceId: string, instruction: string): Promise<{ content: LbContent; issues: LbIssue[]; providerUsed: string }> =>
      post('/api/learning/ai', { op: 'revise', resourceId, instruction }),
  },
  previewUrl: (resourceId: string) => `/api/learning/view?preview=${encodeURIComponent(resourceId)}`,
  publicUrl: (publicId: string) => `/ova/${encodeURIComponent(publicId)}`,
  exportUrl: (resourceId: string, format: 'scorm' | 'html' | 'json') =>
    `/api/learning/export?id=${encodeURIComponent(resourceId)}&format=${format}`,
  embedSnippet: (publicId: string, title: string) =>
    `<iframe src="${window.location.origin}/ova/${encodeURIComponent(publicId)}" title="${title.replace(/"/g, '&quot;')}" width="100%" height="720" style="border:0" allowfullscreen></iframe>`,
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '—'
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days === 1 ? '' : 's'}`
}

export function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`No se pudo leer «${file.name}»`))
    reader.readAsDataURL(file)
  })
}

/** Workspace recordado entre visitas, para no volver a elegirlo cada vez. */
const LAST_WORKSPACE_KEY = 'learning:workspace'

export function rememberWorkspace(id: string) {
  try { localStorage.setItem(LAST_WORKSPACE_KEY, id) } catch { /* sin persistencia */ }
}

export function recalledWorkspace(): string {
  try { return localStorage.getItem(LAST_WORKSPACE_KEY) || '' } catch { return '' }
}
