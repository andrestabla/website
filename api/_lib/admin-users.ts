import crypto from 'node:crypto'
import { prisma } from './prisma.js'

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase()
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
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

export async function ensureBootstrapAdminUser() {
  const existingCount = await prisma.adminUser.count()
  if (existingCount > 0) return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const email = process.env.ADMIN_EMAIL || null
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin AlgoritmoT'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

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
}

export async function findAdminUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier)
  return prisma.adminUser.findFirst({
    where: {
      active: true,
      OR: [{ username: normalized }, { email: normalized }],
    },
  } as any)
}

export async function registerAdminLogin(userId: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  } as any)
}

