/**
 * Siembra el catálogo del Cotizador con la línea de plataformas a la medida.
 * Es idempotente: hace upsert por `code`, así que se puede volver a correr tras
 * ajustar precios sin duplicar filas.
 *
 *   npx tsx scripts/seed-quote-catalog.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any) as any

type Row = {
  code: string
  name: string
  summary: string
  category: string
  template?: string
  unit?: string
  currency?: 'COP' | 'USD'
  kind?: 'CORE' | 'MODULE'
  price: number
  weeks: number
  deliverables: number
  defaultOn?: boolean
  tags?: string[]
  detail?: { entregables: string[] }
}

const CATALOG: Row[] = [
  {
    code: 'NUCLEO',
    name: 'Núcleo de la plataforma',
    summary:
      'Infraestructura, modelo de datos, autenticación, roles, permisos, maestros del negocio, panel responsive e identidad gráfica aplicada. Es lo que convierte un conjunto de módulos en una plataforma.',
    category: 'Núcleo',
    kind: 'CORE',
    price: 12_000_000,
    weeks: 2,
    deliverables: 11,
    defaultOn: false,
    tags: ['obligatorio', 'infraestructura', 'accesos'],
    detail: {
      entregables: [
        'Arquitectura y repositorio con despliegue continuo, ambientes de prueba y producción',
        'Base de datos PostgreSQL gestionada, con migraciones versionadas y respaldos automáticos',
        'Almacenamiento de archivos en Cloudflare R2',
        'Autenticación segura: sesiones, política de contraseñas y control de intentos fallidos',
        'Roles del negocio y matriz de permisos por rol y por persona',
        'Maestros del dominio y catálogo central',
        'Panel responsive y perfil editable por cada usuario',
        'Identidad gráfica aplicada: logo, favicon, paleta, tipografías y pantalla de acceso',
        'Migración inicial de datos',
        'Pruebas automatizadas de los flujos críticos',
        'Capacitación por rol y manual de operación',
      ],
    },
  },

  // ── Operación ──────────────────────────────────────────────────────────────
  {
    code: 'M01',
    name: 'Gestión editorial y plan de producción',
    summary:
      'Expediente por obra con línea de tiempo de todas las etapas, responsable y rol en cada una, fechas comprometidas y plan anual con obras en fila.',
    category: 'Operación',
    price: 4_900_000,
    weeks: 1.2,
    deliverables: 6,
    defaultOn: false,
    tags: ['editorial', 'producción', 'workflow'],
  },
  {
    code: 'M02',
    name: 'Inventarios y almacén',
    summary:
      'Existencias por referencia y bodega, entradas, salidas, ajustes con motivo, kárdex auditable, alertas de stock bajo y actualización manual o por importación de archivo.',
    category: 'Operación',
    price: 3_600_000,
    weeks: 0.9,
    deliverables: 5,
    defaultOn: false,
    tags: ['inventario', 'almacén'],
  },
  {
    code: 'M04',
    name: 'Consignaciones y liquidación',
    summary:
      'Control de lo que está en poder de cada aliado, corte de liquidación con vendido y devuelto, reingreso automático al inventario y documento de liquidación firmable.',
    category: 'Operación',
    price: 3_200_000,
    weeks: 0.8,
    deliverables: 4,
    defaultOn: false,
    tags: ['consignación', 'liquidación'],
  },
  {
    code: 'M09',
    name: 'Regalías de autores',
    summary:
      'Porcentaje pactado por autor y por obra, cálculo automático sobre ventas del periodo, liquidación con detalle por título y soporte descargable.',
    category: 'Operación',
    price: 2_900_000,
    weeks: 0.7,
    deliverables: 4,
    defaultOn: false,
    tags: ['regalías', 'autores'],
  },
  {
    code: 'M10',
    name: 'Costos y rentabilidad por título',
    summary:
      'Costos de producción por referencia, margen real y punto de equilibrio. Responde qué productos sostienen el catálogo.',
    category: 'Operación',
    price: 2_600_000,
    weeks: 0.65,
    deliverables: 3,
    defaultOn: false,
    tags: ['costos', 'rentabilidad'],
  },

  // ── Comercial y financiero ────────────────────────────────────────────────
  {
    code: 'M03',
    name: 'Cotizaciones y pedidos',
    summary:
      'El gestor arma la cotización con inventario y precios reales, elige modalidad en firme o consignación, la envía al cliente con vigencia y la convierte en pedido.',
    category: 'Comercial',
    price: 5_200_000,
    weeks: 1.3,
    deliverables: 6,
    defaultOn: false,
    tags: ['cotización', 'pedidos'],
  },
  {
    code: 'M05',
    name: 'Facturación, cartera y notas crédito',
    summary:
      'Factura consecutiva a partir del pedido, notas crédito con motivo, registro de pagos y tablero de cartera por edades, cliente y gestor.',
    category: 'Comercial',
    price: 4_400_000,
    weeks: 1.1,
    deliverables: 5,
    defaultOn: false,
    tags: ['facturación', 'cartera'],
  },
  {
    code: 'M06',
    name: 'Presupuesto anual y ejecución',
    summary:
      'Metas por línea, región, canal y estrategia comercial, con seguimiento mensual que se alimenta de lo que registra el equipo. La consolidación es automática.',
    category: 'Comercial',
    price: 4_100_000,
    weeks: 1.0,
    deliverables: 5,
    defaultOn: false,
    tags: ['presupuesto', 'metas'],
  },
  {
    code: 'M07',
    name: 'Seguimiento por gestor comercial',
    summary:
      'Cartera de clientes asignados, calendario de visitas, reporte diario y semanal por cliente, rubros y metas, con filtros encadenados.',
    category: 'Comercial',
    price: 4_700_000,
    weeks: 1.2,
    deliverables: 6,
    defaultOn: false,
    tags: ['comercial', 'visitas', 'cartera'],
  },
  {
    code: 'M08',
    name: 'Analítica, tableros y mapas',
    summary:
      'Tableros de venta y cumplimiento por línea, región, canal y gestor, con mapas que ubican clientes e instituciones.',
    category: 'Comercial',
    price: 4_300_000,
    weeks: 1.1,
    deliverables: 5,
    defaultOn: false,
    tags: ['analítica', 'tableros', 'mapas'],
  },

  // ── Canal digital ─────────────────────────────────────────────────────────
  {
    code: 'M11',
    name: 'Portal público y catálogo en línea',
    summary:
      'Catálogo navegable por categoría, autor y formato, ficha de producto con imagen y muestra, novedades y optimización para buscadores.',
    category: 'Canal digital',
    price: 4_800_000,
    weeks: 1.2,
    deliverables: 5,
    defaultOn: false,
    tags: ['portal', 'seo', 'catálogo'],
  },
  {
    code: 'M12',
    name: 'Tienda en línea y portal del cliente',
    summary:
      'Carrito, pago y confirmación de compra que descuenta inventario y genera pedido y entrega. El cliente consulta sus pedidos, facturas y cartera.',
    category: 'Canal digital',
    price: 5_700_000,
    weeks: 1.4,
    deliverables: 6,
    defaultOn: false,
    tags: ['ecommerce', 'checkout', 'portal cliente'],
  },
  {
    code: 'M13',
    name: 'Logística y gestión de entregas',
    summary:
      'Remisión y guía por envío, estados de despacho con su historial, entrega confirmada y devolución que reingresa al inventario.',
    category: 'Canal digital',
    price: 3_400_000,
    weeks: 0.85,
    deliverables: 4,
    defaultOn: false,
    tags: ['logística', 'entregas'],
  },
  {
    code: 'M14',
    name: 'Integraciones e inteligencia artificial',
    summary:
      'Administración de conexiones con contabilidad, pasarela de pago, mensajería y correo; importación masiva asistida, redacción de fichas y búsqueda por lenguaje natural.',
    category: 'Canal digital',
    price: 4_200_000,
    weeks: 1.05,
    deliverables: 5,
    defaultOn: false,
    tags: ['integraciones', 'ia', 'openai'],
  },
]

/**
 * Plantilla SERVICIO: precio POR UNIDAD, anclado al histórico real de la casa
 * (La Salle, USCO/UPC, San Martín, Registro calificado, portafolios). Ajustable
 * por cotización con cantidades.
 */
const SERVICE_CATALOG: Row[] = [
  {
    code: 'SV01',
    name: 'Producción de curso virtual completo',
    summary:
      'Curso virtual completo en 5 fases: ruta de aprendizaje, autoría (corrección de estilo y diseño instruccional), producción de contenidos, montaje en LMS y control de calidad. Precio de tabla USCO/UPC: $13,0 M curso base; sube a $15,6 M y $17,4 M según créditos; precios fábrica a partir de 10 cursos.',
    category: 'Producción académica',
    template: 'CURSOS',
    unit: 'curso',
    price: 13_000_000,
    weeks: 2,
    deliverables: 5,
    defaultOn: false,
    tags: ['curso virtual', 'producción', 'diseño instruccional'],
  },
  {
    code: 'SV02',
    name: 'Recurso educativo digital (unidad)',
    summary:
      'Recurso educativo digital interactivo en versión web (.html): guion, diseño, desarrollo y ajustes. Precio unitario del caso Universidad de La Salle (67 recursos, con escala por volumen).',
    category: 'Producción académica',
    template: 'CURSOS',
    unit: 'recurso',
    price: 680_000,
    weeks: 0.12,
    deliverables: 1,
    defaultOn: false,
    tags: ['recurso digital', 'RED', 'html'],
  },
  {
    code: 'SV03',
    name: 'Programa de formación docente',
    summary:
      'Programa de formación docente en competencias digitales y pedagógicas, con talleres, acompañamiento y certificación. Precio del caso Fundación Universitaria San Martín.',
    category: 'Formación docente',
    template: 'FORMACION',
    unit: 'programa',
    price: 17_600_000,
    weeks: 4,
    deliverables: 6,
    defaultOn: false,
    tags: ['formación docente', 'talleres'],
  },
  {
    code: 'SV04',
    name: 'Estudio de mercado para nuevos programas académicos',
    summary:
      'Consultoría de estudio de mercado para registro calificado: demanda, oferta comparada, empleabilidad y pertinencia. Precio del caso Registro calificado.',
    category: 'Consultoría académica',
    template: 'ESTUDIO',
    unit: 'estudio',
    price: 98_000_000,
    weeks: 8,
    deliverables: 5,
    defaultOn: false,
    tags: ['estudio de mercado', 'registro calificado'],
  },
  {
    code: 'SV05',
    name: 'Programa de maestría (documento maestro completo)',
    summary:
      'Documento maestro, anexos, PEP, syllabus y acceso a dashboards para un programa de maestría. Precio por nivel del portafolio de creación de programas (antes de impuestos).',
    category: 'Por nivel del programa',
    template: 'PROGRAMAS',
    unit: 'programa',
    price: 40_000_000,
    weeks: 10,
    deliverables: 8,
    defaultOn: false,
    tags: ['creación de programas', 'registro calificado', 'documento maestro'],
  },
]

/** Resto de líneas de servicio, ancladas al histórico y al simulador del sitio. */
const LINES_CATALOG: Row[] = [
  // ── Consultoría en transformación digital (USD · modelo del simulador del sitio) ──
  {
    code: 'TD01',
    name: 'Diagnóstico de madurez digital',
    summary: 'Levantamiento de madurez digital, entrevistas, inventario de sistemas y hoja de ruta priorizada. Piso de entrada del modelo de transformación (USD 5.000–8.000 según tamaño).',
    category: 'Transformación digital', template: 'TRANSFORMACION', unit: 'diagnóstico', currency: 'USD',
    price: 5_000, weeks: 2, deliverables: 3, defaultOn: false, tags: ['diagnóstico', 'madurez digital'],
  },
  {
    code: 'TD02',
    name: 'Mapeo de proceso (BPMN as-is / to-be)',
    summary: 'Levantamiento y rediseño de un proceso de negocio con notación BPMN. Precio unitario del modelo (USD 600–1.200 por proceso según complejidad).',
    category: 'Transformación digital', template: 'TRANSFORMACION', unit: 'proceso', currency: 'USD',
    price: 600, weeks: 0.3, deliverables: 2, defaultOn: false, tags: ['bpmn', 'procesos'],
  },
  {
    code: 'TD03',
    name: 'Diseño y desarrollo de solución digital',
    summary: 'Solución digital sobre procesos priorizados: diseño, desarrollo, pruebas y puesta en producción. Desde USD 8.000 por solución (hasta 30.000 según alcance técnico).',
    category: 'Transformación digital', template: 'TRANSFORMACION', unit: 'solución', currency: 'USD',
    price: 8_000, weeks: 4, deliverables: 4, defaultOn: false, tags: ['solución digital', 'automatización'],
  },
  {
    code: 'TD04',
    name: 'Mejora continua (retainer mensual)',
    summary: 'Acompañamiento mensual de mejora continua: evolución de soluciones, medición y soporte. Desde USD 1.200 por mes según tamaño de la organización.',
    category: 'Transformación digital', template: 'TRANSFORMACION', unit: 'mes', currency: 'USD',
    price: 1_200, weeks: 0, deliverables: 1, defaultOn: false, tags: ['retainer', 'mejora continua'],
  },

  // ── Producción de cursos · fases sueltas (tabla USCO/UPC, curso base) ──
  {
    code: 'CU03',
    name: 'Fase 1 · Adaptación de syllabus y ruta de aprendizaje',
    summary: 'Adaptación del syllabus y creación de la ruta de aprendizaje del curso. Tabla USCO/UPC: $1,5 M curso base; $1,6 M y $1,7 M según créditos.',
    category: 'Fases sueltas', template: 'CURSOS', unit: 'curso',
    price: 1_500_000, weeks: 0.3, deliverables: 1, defaultOn: false, tags: ['syllabus', 'ruta'],
  },
  {
    code: 'CU04',
    name: 'Fase 2 · Autoría (corrección de estilo y diseño instruccional)',
    summary: 'Autoría del curso con corrección de estilo y diseño instruccional. Tabla USCO/UPC: $6,0 M curso base; $7,5 M y $8,5 M según créditos.',
    category: 'Fases sueltas', template: 'CURSOS', unit: 'curso',
    price: 6_000_000, weeks: 0.8, deliverables: 2, defaultOn: false, tags: ['autoría', 'diseño instruccional'],
  },
  {
    code: 'CU05',
    name: 'Fases 3–5 · Producción, montaje en LMS y control de calidad',
    summary: 'Producción de contenidos, montaje sobre LMS y control de calidad. Tabla USCO/UPC: $5,5 M curso base; $6,5 M y $7,2 M según créditos.',
    category: 'Fases sueltas', template: 'CURSOS', unit: 'curso',
    price: 5_500_000, weeks: 0.9, deliverables: 2, defaultOn: false, tags: ['producción', 'montaje', 'calidad'],
  },

  // ── ProfeTabla · experiencias (portafolio: precio por rango de profesores) ──
  {
    code: 'PT01',
    name: 'Experiencia Tipo 01 · Proyecto (6 sesiones)',
    summary: 'Experiencia de formación docente tipo Proyecto, 6 sesiones sobre ProfeTabla. Portafolio: $2,4 M (1–5 profesores); $3,2 M (6–10); $3,9 M (11–15).',
    category: 'Experiencias', template: 'PROFETABLA', unit: 'experiencia',
    price: 2_400_000, weeks: 1.5, deliverables: 2, defaultOn: false, tags: ['profetabla', 'proyecto'],
  },
  {
    code: 'PT02',
    name: 'Experiencia Tipo 02 · Reto (3 sesiones)',
    summary: 'Experiencia de formación docente tipo Reto, 3 sesiones sobre ProfeTabla. Portafolio: $1,2 M (1–5 profesores); $2,0 M (6–10); $2,6 M (11–15).',
    category: 'Experiencias', template: 'PROFETABLA', unit: 'experiencia',
    price: 1_200_000, weeks: 0.8, deliverables: 1, defaultOn: false, tags: ['profetabla', 'reto'],
  },

  // ── LMS como servicio (portafolio: licencia anual) ──
  {
    code: 'LMS01',
    name: 'Licencia anual · primer año (implementación incluida)',
    summary: 'Plataforma de aprendizaje Algoritmo T: usuarios ilimitados, infraestructura y soporte N1–N4, hasta 5 TB de almacenamiento nuevo por año. Portafolio: $160 M el primer año; 5% de descuento por pago anticipado.',
    category: 'Licencia', template: 'LMS', unit: 'año',
    price: 160_000_000, weeks: 6, deliverables: 4, defaultOn: false, tags: ['lms', 'licencia', 'saas'],
  },
  {
    code: 'LMS02',
    name: 'Licencia anual · renovación (desde el segundo año)',
    summary: 'Renovación anual de la plataforma con el mismo alcance: usuarios ilimitados, soporte N1–N4 y 5 TB nuevos por año. Portafolio: $130 M/año desde el segundo año.',
    category: 'Licencia', template: 'LMS', unit: 'año',
    price: 130_000_000, weeks: 0, deliverables: 1, defaultOn: false, tags: ['lms', 'renovación'],
  },

  // ── Construcción de programas · por nivel (portafolio + caso USCO) ──
  {
    code: 'PR01',
    name: 'Programa de pregrado (documento maestro completo)',
    summary: 'Documento maestro, anexos, PEP, syllabus y acceso a dashboards para un programa de pregrado. Portafolio: $65 M antes de impuestos.',
    category: 'Por nivel del programa', template: 'PROGRAMAS', unit: 'programa',
    price: 65_000_000, weeks: 12, deliverables: 8, defaultOn: false, tags: ['pregrado', 'documento maestro'],
  },
  {
    code: 'PR03',
    name: 'Programa de especialización (documento maestro completo)',
    summary: 'Documento maestro, anexos, PEP, syllabus y acceso a dashboards para una especialización. Portafolio: $30 M antes de impuestos.',
    category: 'Por nivel del programa', template: 'PROGRAMAS', unit: 'programa',
    price: 30_000_000, weeks: 8, deliverables: 8, defaultOn: false, tags: ['especialización', 'documento maestro'],
  },
]
CATALOG.push(...SERVICE_CATALOG, ...LINES_CATALOG)

async function main() {
  let created = 0
  let updated = 0
  for (const [index, row] of CATALOG.entries()) {
    const data = {
      name: row.name,
      summary: row.summary,
      category: row.category,
      template: (row as any).template ?? 'SOLUCIONES',
      unit: (row as any).unit ?? null,
      kind: row.kind ?? 'MODULE',
      price: row.price,
      currency: (row as any).currency ?? 'COP',
      deliverables: row.deliverables,
      weeks: row.weeks,
      defaultOn: row.defaultOn ?? true,
      active: true,
      tags: row.tags ?? [],
      detail: row.detail ?? undefined,
      sortOrder: index,
    }
    const existing = await prisma.quoteCatalogItem.findUnique({ where: { code: row.code } })
    await prisma.quoteCatalogItem.upsert({
      where: { code: row.code },
      create: { code: row.code, ...data },
      update: data,
    })
    existing ? updated++ : created++
  }
  const total = await prisma.quoteCatalogItem.count()
  console.log(`Catálogo listo · ${created} creados · ${updated} actualizados · ${total} ítems activos`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
