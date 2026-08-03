/** Crea (o reinicia) una cotización demo publicada para probar el visor /c/:id. */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { loadCatalog, itemsFromCatalog, computeTotals, DEFAULT_DISCOUNT_SCALE, newRecipientToken } = await import('../api/_lib/quotes.js')

const db = prisma as any
const PUBLIC_ID = 'demoedicionesu1'

const rows = await loadCatalog()
const items = itemsFromCatalog(rows)
const totals = computeTotals(items)

const content = {
  intro: 'Ediciones de la U publica en dos formatos, vende por territorio a universidades y librerías, mueve inventario propio y en consignación, liquida regalías y sostiene un catálogo que crece cada año. Hoy ese trabajo se reparte entre hojas de cálculo, correos y un sistema contable pensado para otra industria.\n\nProponemos una plataforma propia, construida sobre el vocabulario de la editorial: obra, edición, ISBN, tiraje, consignación, liquidación, regalía, gestor, institución. Cuando el sistema habla el idioma del negocio, el equipo deja de traducir y empieza a decidir.',
  diagnosis: {
    lede: 'Una editorial universitaria opera con reglas propias. Sus procesos suelen organizarse en cuatro frentes que los sistemas de estantería atienden por separado.',
    fronts: [
      { title: 'Un catálogo que vive en dos formatos', body: 'Cada obra existe como libro físico y como edición electrónica, con ISBN, precio, tiraje y disponibilidad distintos.', needs: 'expediente de obra, línea de tiempo editorial y catálogo dual' },
      { title: 'Una fuerza comercial repartida por territorio', body: 'Gestores con regiones, ciudades, universidades y librerías asignadas; visitas, cotizaciones, pedidos en firme y en consignación.', needs: 'cartera por gestor, agenda de visitas y reporte que se alimente solo' },
    ],
  },
  approach: 'Una sola base de datos, un solo modelo de dominio y varias puertas de entrada. Todo lo que ocurre en el panel interno, en el portal público y en la tienda escribe sobre la misma información.',
  scopeNote: 'El alcance contractual es el que quede activo en el configurador al momento de firmar.',
  timelineNote: 'Las 8 semanas corresponden a la plataforma completa. Un alcance menor se ejecuta en menos tiempo, con un piso de 4 semanas.',
  assumptions: ['La editorial designa un contraparte funcional con al menos 6 horas semanales.', 'La información histórica se entrega en archivos estructurados (Excel o CSV).'],
  exclusions: ['Facturación electrónica ante la DIAN: se integra con el proveedor que la editorial tenga.', 'Aplicaciones móviles nativas: la plataforma es responsive desde el navegador.'],
  service: { includedMonths: 12, renewalPrice: 8000000, exitPrice: 4000000 },
  signature: { name: 'Ana Milena Diazgranados', role: 'Directora de Relacionamiento · Algoritmo T', email: 'anadiazgranados@algoritmot.com', phone: '+57 300 659 0161' },
}

const owner = await db.adminUser.findFirst({ select: { id: true } })
if (!owner) throw new Error('No hay AdminUser para asignar como dueño')

await db.quote.deleteMany({ where: { publicId: PUBLIC_ID } })
const quote = await db.quote.create({
  data: {
    publicId: PUBLIC_ID,
    ownerId: owner.id,
    status: 'PUBLISHED',
    publishedAt: new Date(),
    clientName: 'Ediciones de la U',
    sector: 'Editorial universitaria',
    title: 'Una plataforma editorial hecha a la medida de Ediciones de la U',
    subtitle: 'Toda la estrategia y operación en un solo lugar: proceso editorial, inventarios, gestión comercial por territorio, presupuesto, cartera, regalías y canal digital.',
    currency: 'COP',
    content,
    pricing: { items, totals },
    discountScale: DEFAULT_DISCOUNT_SCALE,
    totalBase: totals.subtotal,
    totalFinal: totals.total,
    weeks: totals.weeks,
    moduleCount: totals.moduleCount,
  },
})
const recipient = await db.quoteRecipient.create({
  data: { quoteId: quote.id, token: newRecipientToken(), name: 'Dirección General', email: 'direccion@edicionesdelau.com' },
})
console.log(`OK · /c/${PUBLIC_ID}  · con destinatario: /c/${PUBLIC_ID}?d=${recipient.token}`)
console.log(`total=${totals.total} semanas=${totals.weeks} modulos=${totals.moduleCount}`)
