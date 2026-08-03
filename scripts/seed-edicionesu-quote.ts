/**
 * Carga en el Cotizador la cotización real de Ediciones de la U, con el
 * contenido final de la propuesta estática (Algoritmo/Cotizaciones/Ediciones
 * de la U). Reemplaza la demo de pruebas. Idempotente: si ya existe una
 * cotización de este cliente creada por este script, la actualiza.
 *
 *   npx tsx scripts/seed-edicionesu-quote.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { loadCatalog, itemsFromCatalog, computeTotals, newPublicId, DEFAULT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any

const content = {
  intro: [
    'Ediciones de la U publica en dos formatos, vende por territorio a universidades y librerías, mueve inventario propio y en consignación, liquida regalías y sostiene un catálogo que crece cada año. Hoy ese trabajo se reparte entre hojas de cálculo, correos, un sistema contable pensado para otra industria y la memoria de quienes lo sostienen. Cada pieza cumple su función por separado; falta el hilo que las una.',
    'Proponemos una plataforma propia, construida sobre el vocabulario de la editorial: obra, edición, ISBN, tiraje, consignación, liquidación, regalía, gestor, institución. Cuando el sistema habla el idioma del negocio, el equipo deja de traducir y empieza a decidir. Una sola pantalla para saber en qué etapa va cada obra, cuántos ejemplares quedan, qué esfuerzos comerciales se están ejecutando y cuánto debe cada cliente.',
    'Este documento es interactivo: el catálogo de módulos trae un interruptor por módulo. Al accionarlo, el alcance, el plazo, la inversión y el plan de pagos se recalculan al instante. Llega con una configuración sugerida —el núcleo y siete módulos de operación editorial, comercial y analítica—, y ustedes suman o quitan lo que corresponda a esta primera fase.',
    'La configuración sugerida se ejecuta en 6 semanas y la plataforma completa en 8. En cualquier escenario la plataforma queda en producción, con los datos migrados y el equipo capacitado. Durante los doce meses siguientes Algoritmo T opera la infraestructura y atiende el soporte de niveles 2, 3 y 4, cubierto por el mismo precio de implementación.',
  ].join('\n\n'),

  diagnosis: {
    lede: 'Una editorial universitaria opera con reglas propias. Sus procesos suelen organizarse en cuatro frentes que los sistemas de estantería atienden por separado. El problema aparece en los puntos de conexión entre esos frentes: allí se fragmenta la información, se duplican registros y se dificulta seguir el recorrido completo de cada publicación.',
    fronts: [
      {
        title: 'Un catálogo que vive en dos formatos',
        body: 'Cada obra existe como libro físico y como edición electrónica, con ISBN, precio, tiraje y disponibilidad distintos. Antes de venderse atraviesa un proceso editorial de varias etapas y varios responsables. El estado real queda en manos de quien la trabaja y llega al resto del equipo por correo.',
        needs: 'expediente de obra, línea de tiempo editorial y catálogo dual',
      },
      {
        title: 'Una fuerza comercial repartida por territorio',
        body: 'Gestores con regiones, ciudades, universidades y librerías asignadas; visitas, cotizaciones, pedidos en firme y en consignación. La información existe, pero vive en agendas y correos personales, y llega a la dirección tarde e incompleta.',
        needs: 'cartera por gestor, agenda de visitas y reporte que se alimente solo',
      },
      {
        title: 'El dinero: presupuesto, cartera y regalías',
        body: 'Metas anuales por línea, región, canal y estrategia; facturas, notas crédito y edades de cartera; liquidaciones de consignación con librerías y regalías a autores. Hoy son cálculos manuales que se rehacen cada mes y cuyo rastro se pierde al cerrar el archivo.',
        needs: 'ejecución presupuestal automática y liquidaciones trazables',
      },
      {
        title: 'El lector como destino final',
        body: 'El catálogo debe ser visible y comprable en línea, y la venta digital debe descontar inventario, generar entrega y quedar registrada junto a la venta institucional. Un canal digital aparte obliga a hacer el mismo trabajo dos veces.',
        needs: 'portal público, tienda y logística sobre el mismo dato',
      },
    ],
  },

  approach: [
    'Una sola base de datos, un solo modelo de dominio y varias puertas de entrada. Todo lo que ocurre en el panel interno, en el portal público y en la tienda escribe sobre la misma información, de modo que cualquier consulta devuelve la misma cifra. Cinco roles y una matriz de permisos gobiernan a la vez el menú, las páginas y las acciones: cada persona ve lo suyo, y la dirección lo ve todo.',
    'Un ERP de estantería suele obligar a la editorial a adaptar su operación al modelo del software. La consignación termina resolviéndose con ajustes parciales, las regalías se gestionan en una hoja aparte y el proceso editorial queda reducido a un campo de texto libre. Además, el cobro por usuario limita la adopción interna justo cuando la meta es que toda la editorial trabaje dentro del sistema. Un desarrollo propio, en cambio, se paga una vez, opera sobre una infraestructura de bajo costo marginal y puede crecer al ritmo del catálogo.',
  ].join('\n\n'),

  scopeNote:
    'El código fuente, la base de datos y el diseño son propiedad de Ediciones de la U desde la primera semana, con licencia perpetua y usuarios ilimitados. Durante los doce primeros meses Algoritmo T provisiona y opera la infraestructura dentro del precio de implementación. Al vencer ese periodo la editorial elige: renovar el servicio, asumir la operación con su propio equipo o trasladarla a un tercero.',

  timelineNote:
    'Las 8 semanas corresponden a la plataforma completa. Un alcance menor se ejecuta en menos tiempo, con un piso de 4 semanas: es lo que toman el núcleo, la migración de datos y la salida a producción, cualquiera sea el número de módulos activos.',

  assumptions: [
    'La editorial designa un contraparte funcional disponible al menos 6 horas por semana, con capacidad de decisión sobre reglas de negocio.',
    'La información histórica a migrar se entrega en archivos estructurados (Excel o CSV) durante las dos primeras semanas.',
    'Los activos de marca —logotipo vectorial, paleta, tipografías— se entregan al inicio del proyecto.',
    'Algoritmo T provisiona y administra la infraestructura durante los doce primeros meses; la titularidad del código, los datos y el diseño es de Ediciones de la U.',
    'Las respuestas a solicitudes de aprobación llegan en un plazo máximo de 3 días hábiles; los retrasos desplazan el cronograma en la misma proporción.',
    'El alcance contractual es el que quede activo en el configurador al momento de firmar.',
  ],

  exclusions: [
    'Facturación electrónica ante la DIAN: la plataforma genera la factura comercial e integra con el proveedor autorizado que la editorial tenga; su contratación va aparte.',
    'Pasarela de pagos: se integra la que la editorial contrate; las comisiones transaccionales son del proveedor.',
    'Producción de contenido: fichas, portadas, textos de catálogo y material de marca.',
    'Aplicaciones móviles nativas. La plataforma es responsive y opera en móvil desde el navegador.',
    'Migración de información en formatos abiertos (papel, PDF escaneado, imágenes): se cotiza aparte según volumen.',
    'Módulos ajenos al catálogo de esta propuesta, y desarrollos nuevos posteriores a la salida a producción.',
  ],

  service: { includedMonths: 12, renewalPrice: 8_000_000, exitPrice: 4_000_000 },

  signature: {
    name: 'Ana Milena Diazgranados',
    role: 'Directora de Relacionamiento · Algoritmo T',
    email: 'anadiazgranados@algoritmot.com',
    phone: '+57 300 659 0161',
  },
}

const admin = await db.adminUser.findFirst({ where: { username: 'admin' }, select: { id: true } })
if (!admin) throw new Error('No existe el usuario admin')

const rows = await loadCatalog()
const items = itemsFromCatalog(rows) // configuración sugerida: los defaults del catálogo
const totals = computeTotals(items)

const data = {
  ownerId: admin.id,
  status: 'PUBLISHED',
  clientName: 'Ediciones de la U',
  clientContact: 'Dirección General y Dirección Comercial',
  sector: 'Editorial universitaria y profesional',
  title: 'Una plataforma editorial hecha a la medida de Ediciones de la U',
  subtitle:
    'Toda la estrategia y operación en un solo lugar: proceso editorial, inventarios, gestión comercial por territorio, presupuesto, cartera, regalías y canal digital. El primer año de infraestructura y soporte va incluido en el precio de implementación.',
  currency: 'COP',
  content,
  pricing: { items, totals },
  discountScale: DEFAULT_DISCOUNT_SCALE,
  totalBase: totals.subtotal,
  totalFinal: totals.total,
  weeks: totals.weeks,
  moduleCount: totals.moduleCount,
  validDays: 45,
}

// borra la demo de pruebas (y sus eventos, por cascada)
const demo = await db.quote.findUnique({ where: { publicId: 'demoedicionesu1' } })
if (demo) {
  await db.quote.delete({ where: { id: demo.id } })
  console.log('demo de pruebas eliminada (demoedicionesu1)')
}

// idempotencia: si ya existe la real, actualízala; si no, créala
const existing = await db.quote.findFirst({
  where: { clientName: 'Ediciones de la U', ownerId: admin.id },
  orderBy: { createdAt: 'desc' },
})
const quote = existing
  ? await db.quote.update({ where: { id: existing.id }, data: { ...data, publishedAt: existing.publishedAt ?? new Date() } })
  : await db.quote.create({ data: { ...data, publicId: newPublicId(), publishedAt: new Date() } })

console.log(`${existing ? 'actualizada' : 'creada'} · /c/${quote.publicId}`)
console.log(`total=${totals.total} semanas=${totals.weeks} modulos=${totals.moduleCount} entregables=${totals.deliverables}`)
