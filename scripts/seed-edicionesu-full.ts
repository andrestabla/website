/**
 * Completa la cotización de Ediciones de la U con TODO el contenido de la
 * propuesta final: arquitectura, base tecnológica, capturas de la plataforma
 * (subidas a R2), cronograma semana a semana, hitos, servicio, equipo,
 * garantías y contraportada. Idempotente.
 *
 *   npx tsx scripts/seed-edicionesu-full.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const { prisma } = await import('../api/_lib/prisma.js')
const { uploadImageToR2 } = await import('../api/_lib/r2.js')

const db = prisma as any
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = JSON.parse(readFileSync(path.join(HERE, 'data/edicionesu-content.json'), 'utf8'))
const IMG_DIR = '/Users/andrestabla/Documents/Algoritmo/Cotizaciones/Ediciones de la U/Propuesta 2026 - Plataforma editorial a la medida/assets/img'

const quote = await db.quote.findFirst({ where: { clientName: 'Ediciones de la U' }, orderBy: { createdAt: 'desc' } })
if (!quote) throw new Error('No existe la cotización de Ediciones de la U')

// ── capturas: sube a R2 solo las que aún no estén subidas ──
const existingShots: any[] = Array.isArray(quote.content?.screens?.items) ? quote.content.screens.items : []
const byCaption = new Map(existingShots.map((s: any) => [s.caption, s]))
const shots: any[] = []
for (const shot of DATA.screens) {
  const existing = byCaption.get(shot.caption)
  if (existing?.url) {
    shots.push(existing)
    console.log(`= ${shot.file} (ya en R2)`)
    continue
  }
  const buffer = readFileSync(path.join(IMG_DIR, shot.file))
  const { url } = await uploadImageToR2({
    buffer,
    contentType: 'image/png',
    filename: shot.file,
    folder: 'cotizador/edicionesu',
    uploadedBy: 'seed',
  })
  shots.push({ url, caption: shot.caption, wide: shot.wide === true })
  console.log(`↑ ${shot.file} → ${url}`)
}

const boxes = DATA.boxes as Record<string, string>

const content = {
  ...(quote.content as any),

  diagnosis: {
    ...(quote.content as any)?.diagnosis,
    note: { title: 'Por qué a la medida', body: boxes['Por qué a la medida'] },
  },

  architecture: {
    lede: 'Una sola base de datos, un solo modelo de dominio y varias puertas de entrada. Todo lo que ocurre en el panel interno, en el portal público y en la tienda escribe sobre la misma información, de modo que cualquier consulta devuelve la misma cifra.',
    layers: DATA.layers,
    stackNote: 'Tecnología estándar y ampliamente adoptada, con documentación abierta y talento disponible en el mercado colombiano.',
    stack: DATA.stack,
    ownership: { title: 'Propiedad, infraestructura y continuidad', body: boxes['Propiedad, infraestructura y continuidad'] },
  },

  coreNote: { title: 'Lectura de la cifra', body: boxes['Lectura de la cifra'] },

  screens: {
    intro: 'Las imágenes corresponden al prototipo funcional que Algoritmo T construyó con el catálogo, los clientes y las regiones reales de Ediciones de la U. Es el punto de partida del proyecto: sobre él se aplica la identidad gráfica de la editorial y se ajustan las reglas de negocio.',
    note: 'Todo lo que aparece aquí ya funciona: las cifras salen de la base de datos, los botones ejecutan la operación real y los permisos del rol deciden qué se muestra. El prototipo se entrega como parte del proyecto.',
    items: shots,
  },

  timelineNote: boxes['Cómo leer el plazo'],

  schedule: {
    intro: 'El plan completo ocupa ocho semanas desde el kickoff. Las dos primeras levantan el núcleo; desde la tercera, los módulos se construyen en bloques y se entregan operando. Las filas atenuadas corresponden a módulos desactivados, que salen del plan.',
    groups: DATA.schedule_groups,
    legend: 'Demostración funcional cada viernes · 45 min',
  },

  investmentNote:
    'Valores en pesos colombianos (COP). El precio de implementación cubre los doce primeros meses de infraestructura y de soporte en niveles 2, 3 y 4. Desde el mes 13, la renovación anual del servicio es de $ 8.000.000 COP. Propuesta válida por 45 días.',

  milestones: DATA.milestones,
  paymentsNote:
    'Los ajustes que aparezcan dentro del alcance acordado se corrigen antes de facturar, sin costo adicional. Los cambios que amplíen el alcance se cotizan aparte, con el mismo precio por módulo de esta propuesta.',

  service: {
    ...(quote.content as any)?.service,
    levelsIntro:
      'El nivel 1 —la mesa de ayuda al usuario final de la editorial— lo atiende el equipo interno, que conoce el negocio. Algoritmo T entra desde el nivel 2.',
    levels: [
      { name: 'Nivel 2 · Atención funcional', desc: 'Dudas de uso, parametrización, permisos, cargas de datos, reportes y configuración de módulos. Respuesta en el día hábil siguiente.' },
      { name: 'Nivel 3 · Corrección técnica', desc: 'Defectos de la plataforma, incidentes de datos, errores de integración y ajustes de rendimiento. Atención inmediata para incidentes que detengan la operación.' },
      { name: 'Nivel 4 · Evolución y plataforma base', desc: 'Cambios de fondo sobre reglas de negocio, actualizaciones de versión del motor de datos y del entorno de ejecución, y mejoras de arquitectura.' },
    ],
    budgetNote: { title: 'Qué implica para el presupuesto de la editorial', body: boxes['Qué implica para el presupuesto de la editorial'] },
    note: 'La renovación se factura por anualidad anticipada y se ajusta cada año con el IPC del año inmediatamente anterior. Los desarrollos nuevos y los módulos que se incorporen después se cotizan aparte, con el mismo criterio de precio por módulo de esta propuesta.',
  },

  teamIntro:
    'Un equipo pequeño y estable durante las ocho semanas: las mismas personas de principio a fin, con experiencia en el negocio editorial además del oficio técnico.',
  team: DATA.team,
  workRhythm: { title: 'Ritmo de trabajo', body: boxes['Ritmo de trabajo'] },

  guarantees: DATA.guarantees,
  finalNote:
    'Propuesta válida por 45 días. Este documento es interactivo: la configuración de módulos activa al momento de la firma constituye el alcance contractual y se anexa impresa al contrato.',
  backQuote: 'Que la editorial vea, en un solo lugar, dónde está cada obra, cada libro y cada peso.',
}

await db.quote.update({ where: { id: quote.id }, data: { content } })
console.log(`\nContenido completo aplicado a /c/${quote.publicId} · ${shots.length} capturas · ${DATA.schedule_groups.length} bloques de cronograma`)
