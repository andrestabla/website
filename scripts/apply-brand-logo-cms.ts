/**
 * Actualiza la configuración de diseño guardada del sitio (CmsSnapshot "main")
 * para que deje de apuntar al icono anterior de la marca:
 *
 *   - design.faviconUrl     icono anterior  ->  /favicon.svg
 *   - design.logoFooterUrl  icono anterior  ->  ''   (el sitio usa el logotipo del kit)
 *
 *   npx tsx scripts/apply-brand-logo-cms.ts            (solo muestra qué cambiaría)
 *   npx tsx scripts/apply-brand-logo-cms.ts --apply    (lo guarda)
 *
 * Es idempotente: solo toca esos dos campos y solo si todavía tienen el valor
 * anterior. Antes de guardar deja la sección "design" previa en
 * CmsSnapshotVersion (nota "brand-logo-2026-11"), así que se puede deshacer
 * desde el historial del panel. También informa, sin modificar nada, cuántas
 * cotizaciones y plantillas llevan un logo de marca propio.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const LEGACY = 'https://imageneseiconos.s3.us-east-1.amazonaws.com/sitioweb/T.svg'
const APPLY = process.argv.includes('--apply')

const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: 'main' } })
if (!snapshot) {
  console.log('No hay CmsSnapshot "main": el sitio usa los valores por defecto del código. Nada que cambiar.')
} else {
  const data = snapshot.data as Record<string, any>
  const design = { ...(data.design || {}) }
  console.log('Antes  ->', { faviconUrl: design.faviconUrl, logoFooterUrl: design.logoFooterUrl, logoUrl: design.logoUrl, logoMode: design.logoMode })
  const next = { ...design }
  if (design.faviconUrl === LEGACY) next.faviconUrl = '/favicon.svg'
  if (design.logoFooterUrl === LEGACY) next.logoFooterUrl = ''
  const changed = JSON.stringify(next) !== JSON.stringify(design)
  console.log('Después ->', { faviconUrl: next.faviconUrl, logoFooterUrl: next.logoFooterUrl, logoUrl: next.logoUrl, logoMode: next.logoMode })
  if (!changed) {
    console.log('Sin cambios: la configuración ya no apunta al icono anterior.')
  } else if (!APPLY) {
    console.log('Simulación: no se guardó nada. Ejecuta con --apply para guardar.')
  } else {
    await prisma.$transaction([
      prisma.cmsSnapshotVersion.create({
        data: { snapshotId: 'main', section: 'design', data: design, createdBy: 'script:apply-brand-logo-cms', note: 'brand-logo-2026-11' },
      } as any),
      prisma.cmsSnapshot.update({ where: { id: 'main' }, data: { data: { ...data, design: next } } }),
    ])
    console.log('Guardado. La versión anterior de "design" quedó en el historial (nota brand-logo-2026-11).')
  }
}

// Solo lectura: cotizaciones y plantillas con logo de marca propio (no se tocan).
for (const table of ['Quote', 'QuoteTemplate']) {
  try {
    const rows: Array<{ n: bigint; logo: string | null }> = await prisma.$queryRawUnsafe(
      `SELECT count(*)::bigint AS n, content->'brand'->>'logo' AS logo FROM "${table}" WHERE coalesce(content->'brand'->>'logo','') <> '' GROUP BY 2`
    )
    console.log(`${table}: ${rows.length ? rows.map((r) => `${r.n} con logo "${r.logo}"`).join('; ') : 'ninguna con logo propio (usan /assets/algoritmot-mark.svg)'}`)
  } catch (error) {
    console.log(`${table}: no se pudo consultar (${(error as Error).message.split('\n')[0]})`)
  }
}

await prisma.$disconnect()
