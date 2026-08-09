/**
 * Convierte la cotización UPC en una cotización nativa totalmente editable:
 * todo el contenido de la propuesta final (23 páginas) mapeado al esquema del
 * editor — carta, diagnóstico por líneas, módulos de la plataforma, capturas,
 * cronograma por fases, hitos de pago 30/30/40, equipo, supuestos, exclusiones,
 * garantías y régimen tributario — más la inversión con IVA mixto como ítems
 * fijos. Deja de usar el modo documento (iframe). Idempotente.
 *
 *   npx tsx scripts/seed-upc-quote-full.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { computeTotals, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any

const IMG = '/cotizaciones/upc-2026/img'

/* ── Inversión: los cuatro conceptos + IVA mixto, como alcance fijo ── */
const items = [
  {
    code: 'UPC-01', name: 'Implementación y parametrización de la plataforma',
    summary: 'Puesta en producción, configuración del instrumento de medición, perfiles y permisos, y carga de la totalidad de los productos de la consultoría. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 95_000_000, qty: 1, unit: null,
    weeks: 4, deliverables: 6, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-02', name: 'Licencia de uso de la plataforma — 18 meses',
    summary: 'Alojamiento, operación, respaldo, actualizaciones funcionales, soporte y acceso a observatorios durante el periodo licenciado. Computación en la nube (SaaS): excluida de IVA — art. 476, num. 21, E.T.',
    category: 'Inversión', kind: 'CORE', price: 70_000_000, qty: 1, unit: null,
    weeks: 0, deliverables: 1, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-03', name: 'Levantamiento, diagnóstico y formulación de la hoja de ruta',
    summary: 'Fases 0 a 4: línea base y madurez, diagnóstico institucional y tecnológico, posicionamiento y rankings, Modelo de Universidad Digital y hoja de ruta institucional. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 390_000_000, qty: 1, unit: null,
    weeks: 18, deliverables: 14, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-04', name: 'Acompañamiento, formación y transferencia',
    summary: 'Fase 5: talleres de validación, socialización institucional, formación del equipo administrador y transferencia de la plataforma. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 95_000_000, qty: 1, unit: null,
    weeks: 4, deliverables: 5, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-05', name: 'IVA 19 % sobre conceptos gravados ($ 580.000.000)',
    summary: 'Principio de independencia de los servicios (DIAN, Oficio 001444 de 2017): la licencia SaaS está excluida del IVA; los servicios de implementación, consultoría, formación y transferencia se gravan a la tarifa general.',
    category: 'Inversión', kind: 'CORE', price: 110_200_000, qty: 1, unit: null,
    weeks: 0, deliverables: 0, on: true, selectable: false, detail: null,
  },
]

const totals = computeTotals(items as any, {
  scale: FLAT_DISCOUNT_SCALE, minWeeks: 1, paymentSplit: [30, 30, 40],
})

/* ── Contenido: la propuesta final, sección por sección ── */
const content = {
  modulesSelectable: false,
  itemsNoun: 'Componentes',
  paymentSplit: [30, 30, 40],

  intro: [
    'Conforme a los lineamientos definidos por la Universidad Popular del Cesar en sus documentos contractuales, presentamos la propuesta técnica y económica formulada por Algoritmo T S.A.S. para implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad. La plataforma se construye y se carga mediante una consultoría de seis meses: cada fase del trabajo entrega su salida en un módulo de la plataforma.',
    'El resultado no es únicamente un informe. La Universidad recibe un entorno en operación desde el primer mes, donde el diagnóstico queda cargado como una medición repetible, la hoja de ruta como iniciativas con responsable y presupuesto, y el avance como información consultable. El acceso cubre los seis meses de ejecución y los dieciocho meses siguientes a la entrega final, con renovación anual posterior.',
    'El propósito final es entregar a la UPC un diagnóstico honesto, técnico y estratégico que sirva como punto de partida para construir una transformación digital sólida, escalable y centrada en el valor público de la CTeI como motor de desarrollo de la institución, el país y la región.',
  ].join('\n\n'),

  diagnosis: {
    lede: 'La Universidad Popular del Cesar enfrenta un momento decisivo en su modernización institucional: las dinámicas de la CTeI, la formación académica y la proyección social exigen ecosistemas integrados, basados en datos y orientados a resultados. Los análisis y espacios de diálogo con las dependencias evidencian brechas estructurales en procesos, plataformas y flujos de información. El trabajo se organiza en cuatro líneas misionales, que son también los cuatro ejes del instrumento de medición.',
    fronts: [
      {
        title: '4.1 · Academia y Virtualidad',
        body: 'Diagnóstico del estado actual frente a educación digital en las dimensiones organizacional, pedagógica, comunicativa y tecnológica.',
        needs: 'Lineamientos para un modelo objetivo de virtualidad y un piloto de despliegue inicial.',
      },
      {
        title: '4.2 · Investigación y CTeI',
        body: 'Mapeo de actores, procesos y servicios de la cadena de valor de la investigación: gestión, visibilidad y posicionamiento; brechas y riesgos frente a lineamientos y estándares.',
        needs: 'Una ruta de acción alineada a la transformación digital institucional.',
      },
      {
        title: '4.3 · Extensión, Relacionamiento y Rankings',
        body: 'Diagnóstico del desempeño misional frente a criterios de rankings seleccionados (Sapiens, Scimago, THE Impact, QS); brechas e indicadores críticos.',
        needs: 'Un roadmap de posicionamiento con hitos, responsables y metas medibles.',
      },
      {
        title: '4.4 · Arquitectura Empresarial y Gobierno Digital',
        body: 'Arquitectura Empresarial alineada con TOGAF® 10; principios y lineamientos de interoperabilidad, seguridad y eficiencia.',
        needs: 'Un modelo de gobierno digital y un roadmap priorizado por impacto y factibilidad.',
      },
    ],
    note: {
      title: 'Qué recibe la Universidad al cierre del contrato',
      body: 'Informe de diagnóstico con análisis de brechas · inventario tecnológico institucional · informe comparativo de rankings · Modelo de Universidad Digital con su mapa de capacidades · hoja de ruta institucional priorizada · plan operativo de la Iniciativa Mínima Viable · y la Plataforma de Gestión de la Transformación Digital en operación, con toda esa información cargada y licencia de uso por dieciocho meses, renovable anualmente.',
    },
  },

  approach:
    'La metodología es participativa, basada en evidencia y contrastada: instrumentos aplicados a directivos, docentes, investigadores, estudiantes y actores de extensión; cada calificación de madurez soportada en un documento, un dato o un registro verificable, cargado y trazable en la plataforma; y hallazgos comparados contra referentes nacionales e internacionales y contra el contexto territorial del Cesar. Se estructura en seis fases iterativas (0 a 5) durante seis meses calendario, que constituyen el marco de referencia de los hitos de pago. Cada fase entrega su documento en el formato tradicional y, simultáneamente, deja su contenido cargado en la plataforma: la Universidad no espera al mes 6 para ver resultados — desde el mes 1 dispone de su radar de madurez publicado.',

  scopeNote:
    'La consultoría comprende las fases de diagnóstico, diseño y planificación estratégica, e incluye la implementación de la Plataforma de Gestión de la Transformación Digital. No contempla la implementación, adquisición, desarrollo o integración de otros sistemas de información de la Universidad, ni la ejecución de los proyectos derivados de la hoja de ruta, los cuales serán objeto de contrataciones independientes.',

  architecture: {
    lede: 'Cada fase de la consultoría entrega su salida en un módulo: la plataforma no se puebla al final, se construye con el proyecto. La madurez se mide sobre una matriz de cuatro líneas misionales × cuatro dimensiones — 16 puntos de medición desagregados en 52 variables, cada una con protocolo de indagación, evidencia D·I·K y rúbrica anclada de cinco niveles.',
    layers: [
      { name: 'M1', title: 'Medición de madurez por línea', desc: 'Radar de cuatro ejes con medición actual, meta y medición anterior; mapa de calor línea × dimensión; detalle por punto de medición con evidencia adjunta; historial completo de mediciones.' },
      { name: 'M2', title: 'Comparación nacional y territorial', desc: 'Posición frente al universo nacional de instituciones y lectura de cobertura y oferta en los 25 municipios del Cesar: la priorización responde al territorio que la Universidad sirve.' },
      { name: 'M3', title: 'Capacidades y mapa estratégico', desc: 'Catálogo de capacidades con nivel actual, objetivo y brecha; mapa navegable que encadena objetivo institucional → capacidad → iniciativa → indicador.' },
      { name: 'M4', title: 'Indicadores clave de desempeño', desc: 'Ficha por indicador con definición operativa, fórmula, fuente, responsable, periodicidad, línea base, meta, semáforo y serie histórica.' },
      { name: 'M5', title: 'Mapa de ruta y roadmap', desc: 'Ruta hacia el modelo de educación digital y roadmap operativo por horizontes, con cronograma tipo Gantt y matriz de impacto × factibilidad.' },
      { name: 'M6', title: 'Seguimiento de iniciativas', desc: 'Avance frente a lo planeado; presupuesto asignado, comprometido y ejecutado con alerta de desviación; factores críticos de éxito en semáforo.' },
      { name: 'M7', title: 'Inteligencia de negocio de Algoritmo T', desc: 'Observatorios con asistente de IA: oferta de educación superior (SNIES, 27.005 programas de 357 instituciones), mercado laboral y análisis regional sobre 33 departamentos.' },
      { name: 'GP', title: 'Gestor de proyectos', desc: 'Cada iniciativa del roadmap como plan de trabajo con ruta propia: tareas con responsables y corresponsables, fechas contra línea base, dependencias, evidencia obligatoria al cierre y reprogramación en cascada.' },
    ],
    ownership: {
      title: 'Licencia, portabilidad y continuidad',
      body: 'Acceso durante los seis meses de ejecución y dieciocho meses adicionales desde la entrega final (periodo efectivo de 24 meses): uso ilimitado por usuarios institucionales, alojamiento, respaldo, actualizaciones, soporte y observatorios. La Universidad puede exportar toda su información en formatos abiertos en cualquier momento, también al vencimiento. La renovación es una suscripción institucional de tarifa plana: $ 80.000.000 COP por año (valor 2026, ajustable solo por IPC).',
    },
  },

  coreNote: {
    title: 'Concepto técnico — liquidación del IVA',
    body: 'En aplicación del principio de independencia de los servicios (DIAN, Oficio 001444 de 2017), cada concepto conserva su naturaleza tributaria: la licencia de uso —computación en la nube (SaaS), prestada por Algoritmo T como proveedor directo— está excluida de IVA conforme al numeral 21 del artículo 476 del Estatuto Tributario, mientras que los servicios de implementación, consultoría, formación y transferencia se gravan de forma independiente al 19 %. Por ello el IVA se liquida únicamente sobre los conceptos gravados ($ 580.000.000).',
  },

  screens: {
    intro: 'Las vistas corresponden a la plataforma en operación, con datos ilustrativos de configuración: la primera medición real de la Universidad se produce en la Fase 0.',
    note: 'Todo lo que aparece aquí ya funciona: el instrumento de 52 variables, la comparación territorial, los indicadores, la ruta y el gestor de proyectos con evidencia obligatoria.',
    items: [
      { url: `${IMG}/fig-m1-madurez.png`, caption: 'M1 · Radar institucional de las cuatro líneas y mapa de calor línea × dimensión.', wide: true },
      { url: `${IMG}/fig-m3-territorio.png`, caption: 'M2 · Cobertura y oferta en el territorio: mapa nacional y departamental de los 25 municipios del Cesar.', wide: true },
      { url: `${IMG}/fig-m2-benchmark.png`, caption: 'M2 · Posición frente a pares y cuadrantes de pertinencia territorial.' },
      { url: `${IMG}/fig-m4-kpi.png`, caption: 'M4 · Batería de indicadores con serie histórica, variación y meta.' },
      { url: `${IMG}/fig-m5-ruta.png`, caption: 'M5 · Roadmap por horizontes y matriz de priorización impacto × factibilidad.' },
      { url: `${IMG}/fig-m6-iniciativas.png`, caption: 'M6 · Ejecución presupuestal y factores críticos de éxito en semáforo.' },
      { url: `${IMG}/fig-m7-gp-plan.png`, caption: 'GP · Plan de trabajo con responsables, fechas, estados y evidencia por tarea.', wide: true },
      { url: `${IMG}/fig-m8-gp-gantt.png`, caption: 'GP · Cronograma con dependencias y reprogramación en cascada contra línea base.' },
    ],
  },

  timelineNote:
    'Seis meses calendario (26 semanas) de ejecución. La plataforma entra en producción en el mes 1 y acompaña todas las fases; la licencia continúa 18 meses después del cierre, renovable anualmente. Las fases se traslapan de forma deliberada para no duplicar solicitudes de información a las mismas dependencias.',

  schedule: {
    intro: 'Seis fases iterativas en seis meses. Cada fase entrega su documento y, simultáneamente, deja su salida cargada en un módulo de la plataforma.',
    groups: [
      { name: 'Fase 0 · Línea base y madurez — mes 1', rows: [
        { label: 'Puesta en producción de la plataforma y primera medición publicada (M1)', on: [1, 2, 3, 4], hito: [4] },
      ]},
      { name: 'Fase 1 · Diagnóstico institucional y tecnológico — meses 1–2', rows: [
        { label: 'Levantamiento, entrevistas, inventario tecnológico y evidencias (M1 + M7)', on: [1, 2, 3, 4, 5, 6, 7, 8], hito: [] },
      ]},
      { name: 'Fase 2 · Posicionamiento y rankings — meses 2–3', rows: [
        { label: 'Análisis frente a rankings y cortes de comparación territorial (M2 + M4)', on: [5, 6, 7, 8, 9, 10, 11, 12, 13], hito: [13] },
      ]},
      { name: 'Fase 3 · Modelo de Universidad Digital — meses 3–4', rows: [
        { label: 'Modelo, arquitectura TOGAF® 10 y mapa de capacidades (M3)', on: [9, 10, 11, 12, 13, 14, 15, 16, 17], hito: [] },
      ]},
      { name: 'Fase 4 · Hoja de ruta e IMV — meses 4–5', rows: [
        { label: 'Roadmap, iniciativas priorizadas y planes de trabajo (M5 + M6 + GP)', on: [14, 15, 16, 17, 18, 19, 20, 21, 22], hito: [] },
      ]},
      { name: 'Fase 5 · Validación y socialización — meses 5–6', rows: [
        { label: 'Talleres, transferencia, formación e inicio de la licencia (Administración)', on: [18, 19, 20, 21, 22, 23, 24, 25, 26], hito: [26] },
      ]},
    ],
    legend: 'Cada fase entrega su salida en un módulo de la plataforma',
  },

  investmentNote:
    'Valores en pesos colombianos. Duración: seis (6) meses de ejecución más dieciocho (18) meses de licencia desde la entrega final. Renovación anual: $ 80.000.000 COP/año, bajo el régimen de la licencia (SaaS excluido de IVA). Propuesta válida por 30 días.',

  milestones: [
    { name: 'Hito 01 · Anticipo', week: 'Firma', criterion: '30 % a la suscripción del contrato.' },
    { name: 'Hito 02 · Fase 2', week: 'Fin mes 3', criterion: '30 % contra entrega y aceptación del informe comparativo de rankings y del tablero de línea base de indicadores.' },
    { name: 'Hito 03 · Cierre', week: 'Fin mes 6', criterion: '40 % contra entrega y aceptación del informe final consolidado y de la plataforma en operación con la transferencia realizada.' },
  ],
  paymentsNote:
    'Los hitos de pago se asocian a entregables verificables y no a la denominación de las fases. Facturas pagaderas a quince (15) días calendario; en mora se causan intereses del 1,5 % mensual.',

  service: {
    includedMonths: 18,
    renewalPrice: 80_000_000,
    exitPrice: 0,
    levelsIntro: 'La licencia comprende, durante todo el periodo:',
    levels: [
      { name: 'Operación y respaldo', desc: 'Alojamiento, operación y respaldo de la plataforma y de la información institucional cargada.' },
      { name: 'Actualizaciones y soporte', desc: 'Actualizaciones funcionales del producto sin costo adicional y soporte funcional para el equipo administrador.' },
      { name: 'Observatorios', desc: 'Acceso a los observatorios de Algoritmo T y a sus actualizaciones de datos.' },
    ],
    note: 'Al término de los dieciocho meses, la renovación es una suscripción institucional de tarifa plana —usuarios ilimitados, sin cobro por usuario ni por consumo— de $ 80.000.000 COP por año (valor 2026, ajustable anualmente por IPC como único mecanismo de incremento). La no renovación no afecta la propiedad de la Universidad sobre su información ni su derecho a exportarla.',
  },

  teamIntro:
    'Equipo multidisciplinario con experiencia en transformación digital, gobierno de datos, CTeI, educación superior y gestión institucional.',
  team: [
    { role: 'Consultor líder / Director de proyecto', dedication: 'Fases 0 y 5', functions: ['Dirección del levantamiento y coordinación del equipo', 'Validación final de entregables y talleres con la Universidad', 'Coherencia técnica y metodológica de los resultados'] },
    { role: 'Arquitecto empresarial y especialista TIC', dedication: 'Fases 1 y 3', functions: ['Mapeo de procesos, sistemas y plataformas; inventario TIC', 'Arquitectura institucional bajo TOGAF® 10', 'Gobernanza y lineamientos de interoperabilidad'] },
    { role: 'Analista de datos', dedication: 'Fases 1 y 2', functions: ['Sistematización de la información y tableros de control', 'Representación de niveles de madurez y brechas', 'Parametrización y carga en la plataforma'] },
    { role: 'Consultores académico, CTeI y extensión', dedication: 'Fases 2 y 3', functions: ['Cadena de valor de la investigación y visibilidad científica', 'Brechas frente a estándares de rankings', 'Apoyo al Modelo de Universidad Digital'] },
    { role: 'Especialista TIC / Tecnologías educativas', dedication: 'Fase 4', functions: ['Arquitectura tecnológica', 'Planificación de la Iniciativa Mínima Viable', 'Priorización de proyectos de corto plazo'] },
    { role: 'Especialista de plataforma', dedication: 'Fases 0 a 5', functions: ['Implementación y parametrización de la plataforma', 'Carga de los productos de cada fase', 'Formación y transferencia al equipo administrador'] },
  ],

  assumptions: [
    'Acceso irrestricto a la información documental, de recursos y servicios institucionales disponibles.',
    'La Universidad facilitará acceso a los sistemas o repositorios relevantes —investigación, biblioteca, datos institucionales— para análisis y contrastación.',
    'Participación activa de los actores misionales —académicos, investigadores y gestores de extensión— y de las dependencias de apoyo.',
    'La UPC designará un responsable institucional que coordine la entrega de información y la logística de las sesiones.',
    'La UPC designará un responsable por cada una de las cuatro líneas, quien cargará evidencia y reportará avances en la plataforma.',
  ],
  exclusions: [
    'Implementación, adquisición, desarrollo o integración de otros sistemas de información de la Universidad.',
    'Ejecución de los proyectos derivados de la hoja de ruta (objeto de contrataciones independientes).',
    'Estampillas y tributos territoriales: de aplicar por tratarse de una universidad pública, serán asumidos por la entidad contratante o calculados de manera independiente al valor de la propuesta.',
  ],

  guarantees: [
    { concept: 'Licencia', text: '18 meses desde la entrega final, con uso ilimitado por usuarios institucionales dentro de los perfiles definidos; periodo efectivo de uso de 24 meses.' },
    { concept: 'Portabilidad', text: 'Exportación de la totalidad de la información institucional en formatos abiertos, en cualquier momento y también al vencimiento del periodo licenciado.' },
    { concept: 'Renovación', text: 'Suscripción anual de tarifa plana: $ 80.000.000 COP/año (valor 2026), ajustable únicamente por IPC. Sin renegociación.' },
    { concept: 'Propiedad intelectual', text: 'Los productos y la información institucional son de la Universidad, sin restricción de tiempo. La plataforma, el instrumento de medición y el know-how metodológico son de Algoritmo T S.A.S., bajo licencia de uso.' },
  ],

  workRhythm: {
    title: 'Ritmo de trabajo',
    body: 'La plataforma entra en producción en el mes 1 y acompaña toda la ejecución. Cada fase produce sus entregables dos veces: el documento tradicional y su salida cargada en el módulo correspondiente.',
  },

  finalNote:
    'Agradecemos la confianza y la apertura al permitirnos presentar esta propuesta. Quedamos atentos para socializar el alcance y resolver cualquier inquietud.',
  backQuote: 'Que la Universidad mida, administre y sostenga su transformación digital — con evidencia y en su territorio.',

  signature: {
    name: 'Ana Milena Díaz Granados',
    role: 'Directora de Relacionamiento · Algoritmo T S.A.S.',
    email: 'anadiazgrandos@algoritmot.com',
    phone: '+57 300 659 0161',
  },
}

/* ── Aplicar sobre la cotización UPC existente ── */
const quote = await db.quote.findFirst({
  where: { clientName: 'Universidad Popular del Cesar' },
  select: { id: true, publicId: true },
})
if (!quote) throw new Error('No existe la cotización UPC (corre antes seed-upc-document-quote.ts)')

await db.quote.update({
  where: { id: quote.id },
  data: {
    content,
    pricing: { items, totals },
    discountScale: FLAT_DISCOUNT_SCALE,
    totalBase: totals.subtotal,
    totalFinal: totals.total,
    weeks: totals.weeks,
    moduleCount: 0,
    validDays: 30,
  },
})
console.log(`Contenido completo aplicado a /c/${quote.publicId} · total ${totals.total} · ${totals.weeks} semanas`)
await db.$disconnect()
