import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
    const connectionString = `${process.env.DATABASE_URL}`
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    console.log('--- Integrations Snapshot ---')
    const integrations = await prisma.cmsSnapshot.findUnique({ where: { id: 'integrations' } })
    console.log(JSON.stringify(integrations?.data, null, 2))

    console.log('--- Main Snapshot (Site Config) ---')
    const main = await prisma.cmsSnapshot.findUnique({ where: { id: 'main' } })
    const site = (main?.data as any)?.site
    console.log('Site Config:', JSON.stringify(site, null, 2))

    await prisma.$disconnect()
    pool.end()
}

main().catch(console.error)
