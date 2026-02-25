import * as PrismaModule from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

type PrismaClientInstance = any
const PrismaClient = (PrismaModule as any).PrismaClient as new (...args: any[]) => PrismaClientInstance

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClientInstance | undefined
  // eslint-disable-next-line no-var
  var __prisma_pg_pool__: Pool | undefined
}

function createPrismaClient() {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on the server')
  }

  const pool = global.__prisma_pg_pool__ ?? new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({ adapter } as any)

  if (process.env.NODE_ENV !== 'production') {
    global.__prisma_pg_pool__ = pool
  }

  return client
}

function normalizeDatabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const match = trimmed.match(/postgres(?:ql)?:\/\/[^'"\s]+/i)
  return match ? match[0] : trimmed
}

export const prisma = global.__prisma__ ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma
}
