/**
 * Pasa a .webp las rutas de imagen que el CMS tiene guardadas.
 *
 * El codigo ya apunta a los .webp, pero los valores viejos viven en la base y
 * son los que mandan: medido en el navegador, el DOM pedia corporate.png. Las
 * rutas antiguas siguen funcionando por reescritura en vercel.json, asi que
 * esto no arregla nada roto — quita la muleta.
 *
 * Solo se sustituyen las siete rutas convertidas, una por una. Un reemplazo
 * generico de .png por .webp dejaria sin imagen a todo lo que no se convirtio.
 *
 *   npx tsx scripts/cms-imagenes-a-webp.ts            (solo mira)
 *   npx tsx scripts/cms-imagenes-a-webp.ts --escribir (guarda)
 */
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const RUTAS: Record<string, string> = {
  '/assets/landing/education.png': '/assets/landing/education.webp',
  '/assets/landing/corporate.png': '/assets/landing/corporate.webp',
  '/assets/landing/tuprofe-mockup.png': '/assets/landing/tuprofe-mockup.webp',
  '/assets/landing/hazlo-tu-mismo-demo.gif': '/assets/landing/hazlo-tu-mismo-demo.webp',
  '/back-ecosistema.jpg': '/back-ecosistema.webp',
  '/back-project-control.jpg': '/back-project-control.webp',
  '/bi-login-bg.jpg': '/bi-login-bg.webp',
  '/back-learning.jpg': '/back-learning.webp',
}

const hallazgos: Array<{ donde: string; de: string; a: string }> = []

function recorrer(valor: unknown, donde: string): unknown {
  if (typeof valor === 'string') {
    for (const [de, a] of Object.entries(RUTAS)) {
      if (valor.includes(de)) {
        hallazgos.push({ donde, de, a })
        return valor.split(de).join(a)
      }
    }
    return valor
  }
  if (Array.isArray(valor)) return valor.map((v, i) => recorrer(v, `${donde}[${i}]`))
  if (valor && typeof valor === 'object') {
    const salida: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) salida[k] = recorrer(v, `${donde}.${k}`)
    return salida
  }
  return valor
}

async function main() {
  const escribir = process.argv.includes('--escribir')
  const fila = await prisma.cmsSnapshot.findUnique({ where: { id: 'main' } })
  if (!fila) throw new Error('No hay snapshot "main"')

  const antes = JSON.stringify(fila.data)
  const copia = `/tmp/cms-snapshot-${Date.now()}.json`
  writeFileSync(copia, antes)
  console.log(`Copia de seguridad: ${copia}  (${(antes.length / 1024).toFixed(0)} kB)\n`)

  const despues = recorrer(fila.data, 'cms')

  if (!hallazgos.length) {
    console.log('No hay ninguna ruta antigua guardada. Nada que hacer.')
    return
  }
  const porRuta = new Map<string, number>()
  for (const h of hallazgos) porRuta.set(h.de, (porRuta.get(h.de) || 0) + 1)
  console.log(`${hallazgos.length} referencias en ${porRuta.size} rutas distintas:`)
  for (const [de, n] of porRuta) console.log(`  ${n.toString().padStart(3)} ×  ${de}  →  ${RUTAS[de]}`)
  console.log('\nDonde:')
  for (const h of hallazgos.slice(0, 12)) console.log(`  ${h.donde}`)
  if (hallazgos.length > 12) console.log(`  … y ${hallazgos.length - 12} mas`)

  if (!escribir) {
    console.log('\n(solo mirando — pasa --escribir para guardar)')
    return
  }
  await prisma.cmsSnapshot.update({ where: { id: 'main' }, data: { data: despues as any } })
  console.log('\nGuardado.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
