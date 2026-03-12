import crypto from 'node:crypto'
import { prisma } from './prisma.js'

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const DEFAULT_BOOTSTRAP_ADMIN_PASSWORD = 'admin123'
const CREDENTIAL_TOKEN_TTL_HOURS = 24

export const ADMIN_MODULES = [
  'DASHBOARD',
  'SITE_BUILDER',
  'SERVICES',
  'PRODUCTS',
  'LEADS',
  'DESIGN',
  'SEO',
  'MARKETING',
  'ANALYTICS',
  'INTEGRATIONS',
  'SETTINGS',
  'USERS',
] as const

export type AdminModuleKey = (typeof ADMIN_MODULES)[number]
export type AdminRoleKey = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'ANALYST'
export type AdminPermissionMap = Record<AdminModuleKey, boolean>

function isDeployedEnvironment() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  )
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase()
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.startsWith('scrypt$')) return false
  const [, salt, expected] = passwordHash.split('$')
  if (!salt || !expected) return false
  const actual = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS).toString('hex')
  const a = Buffer.from(actual, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function defaultPermissionMap() {
  return ADMIN_MODULES.reduce((acc, module) => {
    acc[module] = false
    return acc
  }, {} as AdminPermissionMap)
}

export function getDefaultPermissionMapForRole(role: AdminRoleKey): AdminPermissionMap {
  const base = defaultPermissionMap()
  if (role === 'SUPERADMIN') {
    for (const module of ADMIN_MODULES) base[module] = true
    return base
  }

  if (role === 'ADMIN') {
    for (const module of ADMIN_MODULES) base[module] = true
    return base
  }

  if (role === 'EDITOR') {
    base.DASHBOARD = true
    base.SITE_BUILDER = true
    base.SERVICES = true
    base.PRODUCTS = true
    base.LEADS = true
    base.DESIGN = true
    base.SEO = true
    base.MARKETING = true
    return base
  }

  // ANALYST
  base.DASHBOARD = true
  base.LEADS = true
  base.ANALYTICS = true
  return base
}

export function mergePermissionMapWithRows(
  role: AdminRoleKey,
  rows: Array<{ module: string; canAccess: boolean }>
): AdminPermissionMap {
  const map = getDefaultPermissionMapForRole(role)
  for (const row of rows || []) {
    const module = String(row.module || '').toUpperCase() as AdminModuleKey
    if (!ADMIN_MODULES.includes(module)) continue
    map[module] = !!row.canAccess
  }
  return map
}

export function sanitizePermissionInput(input: unknown): AdminPermissionMap {
  const fallback = defaultPermissionMap()
  if (!input || typeof input !== 'object') return fallback
  const record = input as Record<string, unknown>
  for (const module of ADMIN_MODULES) {
    fallback[module] = record[module] === true
  }
  return fallback
}

export async function upsertAdminUserPermissions(
  userId: string,
  permissions: AdminPermissionMap,
  tx: any = prisma
) {
  await tx.adminUserPermission.deleteMany({ where: { userId } } as any)
  await tx.adminUserPermission.createMany({
    data: ADMIN_MODULES.map((module) => ({
      userId,
      module,
      canAccess: !!permissions[module],
    })),
    skipDuplicates: true,
  } as any)
}

function hashCredentialToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export function generateSecurePassword(length = 24) {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64url').slice(0, length)
}

export async function issueCredentialSetupToken(input: {
  userId: string
  createdByUserId?: string | null
  createdByName?: string | null
  purpose?: string
  metadata?: Record<string, unknown>
}) {
  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashCredentialToken(rawToken)
  const expiresAt = new Date(Date.now() + CREDENTIAL_TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.adminCredentialToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    } as any),
    prisma.adminCredentialToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt,
        createdByUserId: input.createdByUserId || undefined,
        createdByName: input.createdByName || undefined,
        purpose: input.purpose || 'SETUP_PASSWORD',
        metadata: input.metadata || undefined,
      },
    } as any),
  ])

  return { rawToken, expiresAt }
}

export async function consumeCredentialSetupToken(rawToken: string) {
  const tokenHash = hashCredentialToken(rawToken)
  const token = await prisma.adminCredentialToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { permissions: true } } },
  } as any)
  if (!token) return null
  if (token.usedAt) return null
  if (new Date(token.expiresAt).getTime() <= Date.now()) return null
  return token
}

export async function markCredentialTokenUsed(tokenId: string) {
  await prisma.adminCredentialToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  } as any)
}

export async function setAdminUserPassword(userId: string, plainPassword: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(plainPassword),
      passwordSetupRequired: false,
      active: true,
      suspendedAt: null,
    },
  } as any)
}

export async function ensureBootstrapAdminUser() {
  const existingCount = await prisma.adminUser.count()
  if (existingCount > 0) return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const email = process.env.ADMIN_EMAIL || null
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin AlgoritmoT'
  const configuredPassword = process.env.ADMIN_PASSWORD
  if (isDeployedEnvironment() && (!configuredPassword || configuredPassword === DEFAULT_BOOTSTRAP_ADMIN_PASSWORD)) {
    throw new Error('ADMIN_PASSWORD must be set to a non-default value before bootstrap login in deployed environments')
  }
  const password = configuredPassword || DEFAULT_BOOTSTRAP_ADMIN_PASSWORD

  await prisma.adminUser.create({
    data: {
      username: normalizeIdentifier(username),
      email: email ? normalizeIdentifier(email) : null,
      displayName,
      role: 'SUPERADMIN',
      passwordHash: hashPassword(password),
      active: true,
    } as any,
  })

  const created = await prisma.adminUser.findFirst({
    where: { username: normalizeIdentifier(username) },
  } as any)
  if (created?.id) {
    await upsertAdminUserPermissions(created.id, getDefaultPermissionMapForRole('SUPERADMIN'))
  }
}

export async function findAdminUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier)
  return prisma.adminUser.findFirst({
    where: {
      active: true,
      OR: [{ username: normalized }, { email: normalized }],
    },
    include: {
      permissions: true,
    },
  } as any)
}

export async function findAdminUserByIdentifierAnyStatus(identifier: string) {
  const normalized = normalizeIdentifier(identifier)
  return prisma.adminUser.findFirst({
    where: {
      OR: [{ username: normalized }, { email: normalized }],
    },
    include: {
      permissions: true,
    },
  } as any)
}

export function getSessionPermissionsForUser(user: {
  role: AdminRoleKey
  permissions?: Array<{ module: string; canAccess: boolean }>
}) {
  return mergePermissionMapWithRows(user.role, user.permissions || [])
}

export async function registerAdminLogin(userId: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  } as any)
}

export async function listAdminUsers() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
    include: { permissions: true },
  } as any)
  return users.map((user: any) => ({
    ...user,
    permissionsMap: mergePermissionMapWithRows(user.role as AdminRoleKey, user.permissions || []),
  }))
}
