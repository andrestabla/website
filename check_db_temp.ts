import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const snapshots = await prisma.cmsSnapshot.findMany({
    select: { id: true }
  })
  
  console.log('Available CMS Snapshots:')
  snapshots.forEach(s => console.log(`- ${s.id}`))
  
  const auditoria = await prisma.cmsSnapshot.findUnique({
    where: { id: 'auditoria-programas-virtuales' }
  })
  
  if (auditoria) {
    console.log('\n✅ Auditoria page data FOUND in database.')
  } else {
    console.log('\n❌ Auditoria page data NOT FOUND in database.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
