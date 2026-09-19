/**
 * Learning Builder · acceso a datos compartido por los endpoints.
 *
 * Centraliza lo que se repetía: resolver un recurso junto con las directivas
 * de su workspace (nunca se usa uno sin las otras), generar identificadores
 * públicos y códigos de acceso, y guardar instantáneas del guion.
 */
import crypto from 'node:crypto'
import { prisma } from './prisma.js'
import { sanitizeContent, type LbContent } from '../../src/learning/lib/blocks.js'
import { sanitizeDirectives, type LbDirectives } from '../../src/learning/lib/directives.js'

export const lbWorkspaces = () => (prisma as any).lbWorkspace
export const lbMembers = () => (prisma as any).lbWorkspaceMember
export const lbResources = () => (prisma as any).lbResource
export const lbVersions = () => (prisma as any).lbResourceVersion
export const lbSources = () => (prisma as any).lbResourceSource
export const lbFiles = () => (prisma as any).lbResourceFile
export const lbDataSources = () => (prisma as any).lbDataSource
export const lbComments = () => (prisma as any).lbComment

/** Id público de la URL /ova/:publicId — no adivinable y corto de leer. */
export function newPublicId(): string {
  return crypto.randomBytes(9).toString('base64url')
}

/**
 * Código de acceso de un enlace protegido. Seis caracteres sin vocales ni
 * parecidos (0/O, 1/I): se dicta por teléfono sin equivocaciones.
 */
export function newShareCode(): string {
  const alphabet = 'ABCDFGHJKLMNPQRSTVWXYZ23456789'
  let code = ''
  for (const byte of crypto.randomBytes(6)) code += alphabet[byte % alphabet.length]
  return code
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'workspace'
  )
}

/** Slug libre dentro de la tabla, añadiendo sufijo si hace falta. */
export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base)
  let candidate = root
  let attempt = 1
  while (await lbWorkspaces().findUnique({ where: { slug: candidate } })) {
    attempt += 1
    candidate = `${root}-${attempt}`
  }
  return candidate
}

export type LoadedResource = {
  resource: any
  workspace: any
  directives: LbDirectives
  content: LbContent
}

export async function loadResource(id: string): Promise<LoadedResource | null> {
  const resource = await lbResources().findUnique({ where: { id }, include: { workspace: true } })
  if (!resource) return null
  const directives = sanitizeDirectives(resource.workspace?.directives)
  return { resource, workspace: resource.workspace, directives, content: sanitizeContent(resource.content, directives) }
}

export async function loadResourceByPublicId(publicId: string): Promise<LoadedResource | null> {
  const resource = await lbResources().findUnique({ where: { publicId }, include: { workspace: true } })
  if (!resource) return null
  const directives = sanitizeDirectives(resource.workspace?.directives)
  return { resource, workspace: resource.workspace, directives, content: sanitizeContent(resource.content, directives) }
}

/**
 * Guarda una instantánea del guion. Se conservan las 30 más recientes por
 * recurso: suficiente para deshacer una jornada de trabajo sin que la tabla
 * crezca sin control.
 */
export async function snapshot(resourceId: string, content: unknown, reason: string, userId?: string, label?: string) {
  await lbVersions().create({
    data: { resourceId, reason, label: label || null, content: content as any, createdById: userId || null },
  })
  const extra = await lbVersions().findMany({
    where: { resourceId },
    orderBy: { createdAt: 'desc' },
    skip: 30,
    select: { id: true },
  })
  if (extra.length) {
    await lbVersions().deleteMany({ where: { id: { in: extra.map((row: any) => row.id) } } })
  }
}

/** Resumen de un recurso para la metabiblioteca. */
export function summarize(resource: any) {
  const content = (resource.content && typeof resource.content === 'object' ? resource.content : {}) as any
  const lessons = Array.isArray(content.lessons) ? content.lessons : []
  const blocks = lessons.reduce(
    (total: number, lesson: any) => total + (Array.isArray(lesson.blocks) ? lesson.blocks.length : 0),
    0
  )
  const checks = lessons.reduce(
    (total: number, lesson: any) =>
      total + (Array.isArray(lesson.blocks) ? lesson.blocks.filter((block: any) => block?.type === 'check').length : 0),
    0
  )
  return {
    id: resource.id,
    publicId: resource.publicId,
    workspaceId: resource.workspaceId,
    workspaceName: resource.workspace?.name || '',
    kind: resource.kind,
    title: resource.title,
    subtitle: resource.subtitle,
    course: resource.course,
    unit: resource.unit,
    tags: Array.isArray(resource.tags) ? resource.tags : [],
    status: resource.status,
    shareMode: resource.shareMode,
    embedEnabled: !!resource.embedEnabled,
    importMode: resource.importMode,
    views: resource.views || 0,
    lessonCount: lessons.length,
    blockCount: blocks,
    checkCount: checks,
    ownerId: resource.ownerId,
    publishedAt: resource.publishedAt,
    updatedAt: resource.updatedAt,
  }
}

/** Nombres a mostrar de los miembros del equipo, en una sola consulta. */
export async function usersByIds(ids: string[]): Promise<Map<string, { displayName: string; username: string; email: string | null }>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map()
  const users = await (prisma as any).adminUser.findMany({
    where: { id: { in: unique } },
    select: { id: true, displayName: true, username: true, email: true },
  })
  return new Map(users.map((user: any) => [user.id, { displayName: user.displayName, username: user.username, email: user.email }]))
}
