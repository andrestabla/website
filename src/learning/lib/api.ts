/** Cliente de la API del Learning Builder (sesión por cookie del sitio). */
import type { LbIssue } from './blocks.js'
import type { LbResourceContent } from './content.js'
import type { LbDirectives } from './directives.js'
import type { LbContent } from './blocks.js'
import type { LbProvider, LbProviderSpec, LbProviderStatus } from './integrations.js'
import type { LbFinal } from './final.js'
import type { LbMirrorContent } from './mirror.js'
import type { LbPodcastContent } from './podcast.js'
import type { LbCapability, LbRole } from './roles.js'
import type { LbResourceKind, LbShareMode, LbStatus } from './resources.js'
import type { LbReviewTarget } from './review.js'

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

/** Una versión entregada del paquete (V1, V2…) y lo que la revisión dijo de ella. */
export type DeliveryRow = {
  id: string
  version: number
  fileName: string
  bytes: number
  files: number
  /** Qué se ajustó en esta versión. */
  notes: string | null
  createdAt: string
  createdByName: string | null
  live: boolean
  /** Hilos abiertos sobre esta versión: sin atender y atendidos. */
  comments: { open: number; resolved: number }
}

/** Carpeta de la biblioteca de un workspace; parentId null = la raíz. */
export type FolderRow = {
  id: string
  parentId: string | null
  name: string
}

export type ResourceRow = {
  id: string
  /** Identificador legible derivado del workspace: UNICAFAM-OVA-001. */
  code: string
  /**
   * La codificación del cliente, cuando su proyecto trae la suya
   * (`FE_RED5_ACT`). Donde existe, es la que se enseña: `code` queda como
   * identificador interno.
   */
  clientCode?: string | null
  publicId: string
  workspaceId: string
  /** Carpeta de la biblioteca; null = la raíz del workspace. */
  folderId?: string | null
  /** Versión entregada vigente del paquete (V1, V2…). */
  packageVersion?: number
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
  /** Enlace de revisión externa abierto. */
  reviewEnabled?: boolean
  importMode?: string | null
  /** PACKAGE | MEDIA | null — qué se entrega además del guion. */
  finalKind?: 'PACKAGE' | 'MEDIA' | null
  finalFiles?: number
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

export type ResourceDetail = ResourceRow & {
  content: LbResourceContent
  /** La pieza tal como se entregó, cuando el recurso ya se produjo. */
  final: LbFinal | null
  createdAt: string
}

export type SourceRow = {
  id: string
  name: string
  format: string
  charCount: number
  truncated: boolean
  createdAt: string
}

export type VersionRow = { id: string; reason: string; label?: string | null; createdAt: string }

/** Una voz de la cuenta de ElevenLabs del workspace. */
export type VoiceRow = {
  voiceId: string
  name: string
  category: string
  preview: string
  labels: Record<string, string>
}

export type ProbeRow = {
  reachable: boolean
  source: 'own' | 'inherited' | 'none'
  message: string
  detail?: string
}

export type CommentRow = {
  id: string
  anchor: string
  anchorLabel: string | null
  parentId: string | null
  authorId: string | null
  authorName: string | null
  /** Revisor externo (enlace de revisión); null si es del equipo. */
  guest: { name: string; email: string; org: string } | null
  /** El elemento exacto que señaló, cuando se comentó sobre la pieza. */
  target: LbReviewTarget | null
  /** Versión entregada sobre la que se comentó (V1, V2…). */
  version: number | null
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
    integrations: (workspaceId: string): Promise<{
      providers: LbProviderStatus[]
      specs: Record<LbProvider, LbProviderSpec>
      platformReady: Partial<Record<LbProvider, boolean>>
      role: LbRole
    }> => post('/api/learning/workspaces', { op: 'integrations', workspaceId }),
    /** Las claves secretas se mandan solo cuando cambian; el resto va como KEEP. */
    integrationsSave: (
      workspaceId: string,
      provider: LbProvider,
      data: { enabled?: boolean; values?: Record<string, string>; monthlyCap?: number; notes?: string }
    ): Promise<{ providers: LbProviderStatus[] }> =>
      post('/api/learning/workspaces', { op: 'integrations-save', workspaceId, provider, ...data }),
    integrationsTest: (workspaceId: string, provider: LbProvider): Promise<ProbeRow> =>
      post('/api/learning/workspaces', { op: 'integrations-test', workspaceId, provider }),
  },
  folders: {
    create: (workspaceId: string, name: string, parentId: string | null): Promise<{ folder: FolderRow }> =>
      post('/api/learning/folders', { op: 'create', workspaceId, name, parentId }),
    rename: (workspaceId: string, folderId: string, name: string) =>
      post('/api/learning/folders', { op: 'rename', workspaceId, folderId, name }),
    move: (workspaceId: string, folderId: string, parentId: string | null) =>
      post('/api/learning/folders', { op: 'move', workspaceId, folderId, parentId }),
    remove: (workspaceId: string, folderId: string) =>
      post('/api/learning/folders', { op: 'delete', workspaceId, folderId }),
    moveResources: (workspaceId: string, resourceIds: string[], folderId: string | null) =>
      post('/api/learning/folders', { op: 'move-resources', workspaceId, resourceIds, folderId }),
  },
  resources: {
    library: (workspaceCode?: string): Promise<{ resources: ResourceRow[]; folders?: FolderRow[] }> =>
      post('/api/learning/resources', { op: 'library', workspaceCode }),
    /** Acepta el id interno o el código legible (el de la URL). */
    get: (resourceIdOrCode: string): Promise<{
      resource: ResourceDetail
      workspace: { id: string; name: string; slug: string; kind: string }
      directives: LbDirectives
      role: LbRole
      issues: LbIssue[]
      shareCode: string | null
      reviewToken?: string | null
    }> =>
      post('/api/learning/resources', /^[A-Z0-9]+-[A-Z]{3}-\d{3}$/i.test(resourceIdOrCode)
        ? { op: 'get', code: resourceIdOrCode }
        : { op: 'get', resourceId: resourceIdOrCode }),
    create: (data: { workspaceId: string; kind: LbResourceKind; title: string; subtitle?: string; course?: string; unit?: string; tags?: string[]; folderId?: string | null }) =>
      post('/api/learning/resources', { op: 'create', ...data }),
    update: (resourceId: string, data: Record<string, unknown>): Promise<{ resource: ResourceRow; issues: LbIssue[] }> =>
      post('/api/learning/resources', { op: 'update', resourceId, ...data }),
    publish: (resourceId: string) => post('/api/learning/resources', { op: 'publish', resourceId }),
    unpublish: (resourceId: string) => post('/api/learning/resources', { op: 'unpublish', resourceId }),
    archive: (resourceId: string) => post('/api/learning/resources', { op: 'archive', resourceId }),
    share: (resourceId: string, data: { mode: LbShareMode; embedEnabled?: boolean; rotateCode?: boolean }): Promise<{ resource: ResourceRow; shareCode: string | null }> =>
      post('/api/learning/resources', { op: 'share', resourceId, ...data }),
    review: (resourceId: string, data: { enabled: boolean; rotate?: boolean }): Promise<{ resource: ResourceRow; reviewToken: string }> =>
      post('/api/learning/resources', { op: 'review', resourceId, ...data }),
    duplicate: (resourceId: string) => post('/api/learning/resources', { op: 'duplicate', resourceId }),
    remove: (resourceId: string) => post('/api/learning/resources', { op: 'delete', resourceId }),
    /** Versiones entregadas del paquete, con los comentarios que recibió cada una. */
    deliveries: (resourceId: string): Promise<{ live: number; deliveries: DeliveryRow[] }> =>
      post('/api/learning/resources', { op: 'deliveries', resourceId }),
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
  voice: {
    list: (resourceId: string): Promise<{ voices: VoiceRow[]; defaultVoiceId: string }> =>
      post('/api/learning/voice', { op: 'voices', resourceId }),
    speak: (resourceId: string, cueId: string): Promise<{ content: LbPodcastContent; bytes: number }> =>
      post('/api/learning/voice', { op: 'speak', resourceId, cueId }),
  },
  media: {
    /** Sube una imagen al almacenamiento del workspace y devuelve su URL. */
    image: (resourceId: string, dataUrl: string, fileName: string): Promise<{ url: string; bytes: number }> =>
      post('/api/learning/media', { op: 'image', resourceId, dataUrl, fileName }),
  },
  /** Subida por trozos del paquete original de una pieza importada. */
  importPkg: {
    begin: (resourceId: string, bytes: number): Promise<{ uploadId: string; maxPartBytes: number }> =>
      post('/api/learning/import', { op: 'begin', resourceId, bytes }),
    part: (resourceId: string, uploadId: string, index: number, data: string) =>
      post('/api/learning/import', { op: 'part', resourceId, uploadId, index, data }),
    /** Devuelve el guion cuando el recurso es una pieza importada, y si no la pieza final. */
    /**
     * mode «version» abre una versión nueva (V2, V3…) y conserva la anterior;
     * «replace» corrige la vigente.
     */
    /**
     * `as: 'media'` no abre el archivo: lo guarda y lo sirve tal cual —un MP4,
     * un MP3, o la pista `.vtt` que acompaña al que ya está—.
     */
    ingest: (
      resourceId: string, uploadId: string, parts: number, fileName: string,
      options: { mode?: 'version' | 'replace'; notes?: string; as?: 'media' } = {}
    ): Promise<{
      content: LbMirrorContent | null
      final: LbFinal | null
      version: number
      files?: number
      bytes: number
      /** Solo en los medios: si lo subido fue la pista y no el archivo. */
      track?: boolean
    }> => post('/api/learning/import', { op: 'ingest', resourceId, uploadId, parts, fileName, ...options }),
    clear: (resourceId: string): Promise<{ content: LbMirrorContent | null; final: LbFinal | null }> =>
      post('/api/learning/import', { op: 'clear', resourceId }),
  },
  /** Con version, abre esa versión entregada en lugar de la vigente. */
  previewUrl: (resourceId: string, version?: number) =>
    `/api/learning/view?preview=${encodeURIComponent(resourceId)}${version ? `&v=${version}` : ''}`,
  publicUrl: (publicId: string) => `/ova/${encodeURIComponent(publicId)}`,
  /**
   * Con version, descarga esa versión entregada en vez de la vigente.
   * `media` y `captions` son para los recursos cuya pieza es un archivo
   * reproducible: se bajan tal cual, no empaquetados.
   */
  exportUrl: (
    resourceId: string,
    format: 'scorm' | 'html' | 'json' | 'media' | 'captions',
    version?: number
  ) =>
    `/api/learning/export?id=${encodeURIComponent(resourceId)}&format=${format}`
    + (version ? `&version=${version}` : ''),
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

/**
 * Los bytes de un trozo de subida, en base64. Se trocea porque
 * `String.fromCharCode` con un array de megas desborda la pila del navegador.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let at = 0; at < bytes.length; at += step) {
    binary += String.fromCharCode(...bytes.subarray(at, at + step))
  }
  return btoa(binary)
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
