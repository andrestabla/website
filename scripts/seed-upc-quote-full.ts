/**
 * Cotización UPC 2026 — espejo editable del documento canónico:
 *   https://www.algoritmot.com/cotizaciones/upc-2026/Propuesta-UPC-2026.html
 *
 * Cada campo corresponde a una página de esa propuesta (23 páginas) mapeada al
 * esquema del editor de contenido, de modo que la vista pública /c/:id diga
 * exactamente lo mismo que la pieza diagramada. Idempotente: se vuelve a correr
 * cuando el documento canónico cambie.
 *
 *   npx tsx scripts/seed-upc-quote-full.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { computeTotals, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any
const QUOTE_ID = 'cmsmcc6o70000h8yqizz8yem4'
const IMG = '/cotizaciones/upc-2026/img'
const DOC_URL = 'https://www.algoritmot.com/cotizaciones/upc-2026'

/* ══ Pág. 19 · Inversión — cuatro conceptos + IVA mixto, alcance fijo ══ */
const items = [
  {
    code: 'UPC-01', name: 'Implementación y parametrización de la plataforma',
    summary: 'Puesta en producción, configuración del instrumento, perfiles y carga de los productos. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 95_000_000, qty: 1, unit: null,
    weeks: 4, deliverables: 6, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-02', name: 'Licencia de uso de la plataforma — 18 meses',
    summary: 'Alojamiento, operación, respaldo, actualizaciones, soporte y observatorios. Computación en la nube (SaaS): excluida de IVA — art. 476, num. 21, E.T.',
    category: 'Inversión', kind: 'CORE', price: 70_000_000, qty: 1, unit: null,
    weeks: 0, deliverables: 1, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-03', name: 'Levantamiento, diagnóstico y formulación de la hoja de ruta',
    summary: 'Fases 0 a 4: línea base, diagnóstico, posicionamiento, Modelo de Universidad Digital y hoja de ruta. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 390_000_000, qty: 1, unit: null,
    weeks: 18, deliverables: 14, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-04', name: 'Acompañamiento, formación y transferencia',
    summary: 'Fase 5: talleres de validación, socialización, formación del equipo administrador y transferencia. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: 95_000_000, qty: 1, unit: null,
    weeks: 4, deliverables: 5, on: true, selectable: false, detail: null,
  },
  {
    code: 'UPC-05', name: 'IVA 19 % sobre conceptos gravados ($ 580.000.000)',
    summary: 'La licencia SaaS está excluida; los servicios de implementación, consultoría, formación y transferencia se gravan a la tarifa general.',
    category: 'Inversión', kind: 'CORE', price: 110_200_000, qty: 1, unit: null,
    weeks: 0, deliverables: 0, on: true, selectable: false, detail: null,
  },
]

const totals = computeTotals(items as any, {
  scale: FLAT_DISCOUNT_SCALE, minWeeks: 1, paymentSplit: [30, 30, 40],
})

/* ══ Contenido ══ */
const content = {
  modulesSelectable: false,
  itemsNoun: 'Componentes',
  paymentSplit: [30, 30, 40],

  /* ── Pág. 2 · Carta ── */
  letterhead: {
    date: 'Bogotá D.C., 5 de agosto de 2026',
    addressee: 'Señores\nUniversidad Popular del Cesar\nVicerrectoría Académica\nValledupar',
    subject: 'Propuesta técnica y económica — Implementación de la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad Popular del Cesar.',
    salutation: 'Reciban un cordial saludo,',
  },

  intro: [
    'Conforme a los lineamientos definidos por la Universidad Popular del Cesar en sus documentos contractuales, presentamos la propuesta técnica y económica formulada por Algoritmo T S.A.S. para implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad. La plataforma se construye y se carga mediante una consultoría de seis meses: cada fase del trabajo entrega su salida en un módulo de la plataforma.',
    'El resultado es una visión integral, accionable y priorizada — y el instrumento permanente para administrarla. El trabajo propuesto contempla: levantar y evaluar el estado actual de personas, procesos, datos y tecnología asociados a las funciones misionales de la Universidad · determinar el nivel de madurez tecnológica e identificar las principales brechas y riesgos en gobierno de datos, interoperabilidad, analítica, seguridad y experiencia de usuario · definir una hoja de ruta estratégica y medible, con iniciativas, responsables, métricas e hitos por fases, que permita orientar inversiones e intervenciones futuras · y alinear decisiones institucionales con los objetivos misionales y las políticas nacionales de CTeI, fortaleciendo la visibilidad, eficiencia y sostenibilidad de la gestión universitaria.',
    'Una diferencia respecto de una consultoría convencional: el resultado de este trabajo no es únicamente un informe. La Universidad recibe, además, la Plataforma de Gestión de la Transformación Digital: un entorno en operación desde el primer mes, donde el diagnóstico queda cargado como una medición repetible, la hoja de ruta como iniciativas con responsable y presupuesto, y el avance como información consultable. La Universidad dispone de acceso a la plataforma durante los seis meses de ejecución y los dieciocho meses siguientes a la entrega final, con renovación anual posterior.',
    'El propósito final es entregar a la UPC un diagnóstico honesto, técnico y estratégico que sirva como punto de partida para construir una transformación digital sólida, escalable y centrada en el valor público de la CTeI como motor de desarrollo de la institución, el país y la región. Agradecemos la confianza y la apertura al permitirnos presentar esta propuesta; quedamos atentos para socializar el alcance y resolver cualquier inquietud que surja.',
  ].join('\n\n'),

  /* ── Págs. 4 y 6 · Generalidades, justificación y objetivos ── */
  diagnosis: {
    lede: 'Desde Algoritmo T S.A.S. identificamos que la Universidad Popular del Cesar enfrenta hoy un momento decisivo en su proceso de modernización y fortalecimiento institucional. Los avances y desafíos globales en transformación digital universitaria, sumados a las nuevas dinámicas en la gestión de la Ciencia, la Tecnología y la Innovación (CTeI), la formación académica y la proyección social, exigen ecosistemas integrados, basados en datos y orientados a resultados, que fortalezcan las tres funciones misionales: docencia, investigación y extensión. A partir de los análisis realizados y de los espacios de diálogo con las diferentes dependencias universitarias, se evidencian brechas estructurales en los procesos, plataformas y flujos de información que limitan la articulación, la eficiencia y el impacto de la gestión institucional. En el contexto actual de la educación superior, la producción de información, la gestión de datos y la interoperabilidad entre sistemas constituyen condiciones habilitantes para la planeación, el seguimiento, la evaluación y la toma de decisiones: la Universidad requiere una arquitectura digital alineada con su direccionamiento estratégico, con capacidades para integrar procesos, asegurar consistencia de la información y soportar decisiones basadas en evidencia. El objetivo general es implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial, construida y cargada mediante ese diagnóstico integral y una hoja de ruta estratégica, de modo que la institución pueda medir, administrar y sostener su transformación en el tiempo. El trabajo se organiza en cuatro líneas misionales, con estos objetivos específicos:',
    fronts: [
      {
        title: 'Línea 4.1 · Academia y Virtualidad',
        body: 'Diagnosticar el estado actual frente a educación digital en dimensiones organizacional, pedagógica, comunicativa y tecnológica.',
        needs: 'Proponer lineamientos para un modelo objetivo de virtualidad y un piloto de despliegue inicial.',
      },
      {
        title: 'Línea 4.2 · Investigación y CTeI',
        body: 'Mapear actores, procesos y servicios de la cadena de valor de la investigación: gestión, visibilidad y posicionamiento. Identificar brechas y riesgos frente a lineamientos y estándares; proponer oportunidades de mejora.',
        needs: 'Definir una ruta de acción alineada a la transformación digital institucional.',
      },
      {
        title: 'Línea 4.3 · Extensión, Relacionamiento y Rankings',
        body: 'Diagnosticar el desempeño misional frente a criterios de rankings seleccionados. Identificar brechas e indicadores críticos y proponer estrategias priorizadas.',
        needs: 'Diseñar un roadmap de posicionamiento con hitos, responsables y metas medibles.',
      },
      {
        title: 'Línea 4.4 · Arquitectura Empresarial y Gobierno Digital',
        body: 'Establecer una Arquitectura Empresarial alineada con TOGAF® 10. Definir principios y lineamientos para interoperabilidad, seguridad y eficiencia.',
        needs: 'Proponer un modelo de gobierno digital y un roadmap priorizado por impacto y factibilidad.',
      },
    ],
    note: {
      title: 'Las cuatro líneas son también los cuatro ejes de medición',
      body: 'Cada línea de objetivos corresponde a un eje del instrumento de madurez de la plataforma. Lo que se diagnostica es exactamente lo que después se mide, se compara y se sigue — sin traducciones intermedias entre el informe y el tablero. El diagnóstico, la hoja de ruta y la plataforma permitirán a la Universidad: establecer su nivel actual de madurez digital y volver a medirlo periódicamente con el mismo instrumento · identificar brechas y riesgos críticos que afecten la toma de decisiones, la calidad de la información, la interoperabilidad y la analítica · definir una estrategia de transformación digital priorizada y ejecutable · alinear la gestión con las políticas nacionales de transformación digital, gobierno de datos, educación digital y ciencia abierta, en coherencia con el Ministerio de Educación Nacional y el Ministerio de Ciencia, Tecnología e Innovación · y hacer seguimiento verificable a las iniciativas derivadas, con responsables, presupuesto asignado, comprometido y ejecutado, e indicadores con dueño y periodicidad declarados.',
    },
  },

  /* ── Págs. 5, 11 y 14 · Propósito, el producto y sus módulos ── */
  architecture: {
    lede: 'Objeto: implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial como instrumento institucional permanente de la Universidad Popular del Cesar. La consultoría de seis meses —que diagnostica el ecosistema digital y formula la hoja de ruta institucional— la construye y la carga: cada fase tiene su salida en un módulo, desde los niveles de madurez del diagnóstico hasta el portafolio de iniciativas y los roadmaps específicos. Es el entorno web donde la Universidad administra su propia transformación digital: consulta su nivel de madurez en cada línea misional, se compara con el sistema de educación superior y con su territorio —los 25 municipios del Cesar—, navega su mapa estratégico y su hoja de ruta, y hace seguimiento a las iniciativas, los presupuestos y los roadmaps específicos. Un diagnóstico de transformación digital tiene vida útil corta: el día que se entrega es exacto, pero seis meses después la Universidad ya cambió de plataformas, ejecutó iniciativas y modificó procesos, y el informe sigue describiendo el semestre anterior. La plataforma resuelve exactamente eso — el diagnóstico queda cargado como una medición fechada y repetible, y la hoja de ruta como iniciativas con responsable, presupuesto y estado. Se entrega, además, una Ruta de Arquitectura Empresarial desarrollada sobre referentes de TOGAF® y DAMA, que articula capacidades, procesos y flujos de información de las tres misiones y sus soportes administrativos; estructura un modelo de gobierno digital —roles, responsables, políticas y métricas—; prioriza iniciativas por impacto y factibilidad; y asegura alineación con las políticas nacionales de transformación digital, ciencia abierta, educación digital y gobierno de datos.',
    layers: [
      { name: 'M1', title: 'Medición de madurez por línea', desc: 'Radar de cuatro ejes con medición actual, meta y medición anterior; mapa de calor de línea × dimensión; detalle por punto de medición con evidencia adjunta, responsable y fecha; historial completo de mediciones.' },
      { name: 'M2', title: 'Comparación nacional y regional', desc: 'Tres cortes: posición frente al universo nacional de instituciones; desempeño del Cesar y su región frente a demanda potencial, vacíos de oferta y pertinencia territorial; y contraste contra pares comparables.' },
      { name: 'M3', title: 'Capacidades y mapa estratégico', desc: 'Catálogo de capacidades con nivel actual, objetivo y brecha; mapa navegable que encadena objetivo institucional → capacidad habilitante → iniciativa → indicador; fichas de fortalecimiento por capacidad.' },
      { name: 'M4', title: 'Indicadores clave de desempeño', desc: 'Ficha por indicador con definición operativa, fórmula, unidad, fuente, responsable, periodicidad, línea base, meta, umbrales de semáforo y serie histórica.' },
      { name: 'M5', title: 'Mapa de ruta y roadmap', desc: 'Ruta hacia el modelo de educación digital con pertinencia contextual, y roadmap operativo por horizontes de corto y mediano plazo, con cronograma tipo Gantt y matriz de impacto × factibilidad.' },
      { name: 'M6 + GP', title: 'Iniciativas y gestor de proyectos', desc: 'Avance frente a lo planeado; presupuesto asignado, comprometido y ejecutado con alerta de desviación; factores críticos en semáforo; y cada roadmap específico traducido a un plan de trabajo con tareas, responsables con nombre propio, fechas, dependencias y evidencia de cierre.' },
      { name: 'M7', title: 'Inteligencia de negocio de Algoritmo T', desc: 'Observatorios con asistente de inteligencia artificial: oferta de educación superior a partir de SNIES (27.005 programas de 357 instituciones), mercado laboral y empleabilidad (OLE, DANE, OIT) y análisis regional sobre los 33 departamentos con modelos de pertinencia territorial y demanda potencial por cohortes. Incluye un espacio de trabajo donde el equipo de la Universidad genera informes propios, exportables en PDF y CSV.' },
    ],
    stackNote: 'El instrumento que sostiene el propósito: una hoja de ruta que no se puede medir es una declaración de intenciones, por eso la consultoría deja instalado el instrumento con el que la ruta se administra. Las cuatro líneas se evalúan en cuatro dimensiones —organizacional, misional o pedagógica, tecnológica, y de datos e información— sobre una escala común de cinco niveles (1 Inicial · 2 En desarrollo · 3 Definido · 4 Gestionado · 5 Optimizado). La combinación produce dieciséis puntos de medición, cada uno con su puntaje, su responsable de información y su evidencia adjunta. Así queda convertido en información viva cada producto de la consultoría:',
    stackHeaders: ['Producto de la consultoría', 'Módulo', 'Cómo queda en la plataforma'],
    stack: [
      { component: 'Diagnóstico de madurez', tech: 'M1', what: 'Medición fechada y repetible en cuatro líneas y cuatro dimensiones, con evidencia adjunta por cada punto de medición.' },
      { component: 'Análisis comparativo', tech: 'M2', what: 'Cortes permanentes contra el sistema nacional de educación superior (357 IES) y contra el contexto regional del Cesar (33 departamentos).' },
      { component: 'Mapa de capacidades', tech: 'M3', what: 'Catálogo con nivel actual, nivel objetivo y brecha, encadenado a objetivos, iniciativas e indicadores.' },
      { component: 'Indicadores', tech: 'M4', what: 'Batería de KPI con definición, fuente, responsable, periodicidad, línea base, meta y serie histórica.' },
      { component: 'Hoja de ruta', tech: 'M5 + M6 + GP', what: 'Iniciativas con horizonte, responsable, presupuesto, dependencias y estado; y sus roadmaps específicos como planes de trabajo con tareas y evidencia.' },
    ],
    ownership: {
      title: 'Perfiles de uso, periodo de acceso y puesta en marcha',
      body: 'Perfiles: Rectoría y Consejo Directivo acceden a la vista ejecutiva de consulta (radar institucional, semáforo de indicadores y estado presupuestal del portafolio); los responsables de línea cargan evidencia, actualizan el avance de sus iniciativas y reportan los valores de sus indicadores; el líder institucional tiene visión completa de las cuatro líneas y administra iniciativas, presupuestos e indicadores; y el equipo consultor configura el instrumento de medición, carga las mediciones y publica los resultados. La Universidad podrá generar un enlace público de solo lectura para socializar el estado de la transformación ante Consejo Directivo, entes de control o procesos de acreditación, sin necesidad de crear usuarios adicionales. Periodo de acceso: los seis (6) meses de ejecución del contrato más dieciocho (18) meses adicionales contados desde la entrega final de la Fase 5, para un periodo efectivo de uso de veinticuatro (24) meses. Puesta en marcha: la plataforma es un módulo del Ecosistema Digital de Algoritmo T, infraestructura ya en operación — sus componentes de observatorios y de seguimiento de iniciativas están construidos y en uso, lo que reduce la puesta en marcha a semanas y permite que el componente comparativo esté disponible con datos desde el primer día, sin requerir aportes de información por parte de la Universidad.',
    },
  },

  /* ── Pág. 19 · Concepto técnico del IVA (junto a la inversión) ── */
  coreNote: {
    title: 'Concepto técnico — liquidación del IVA',
    body: 'En aplicación del principio de independencia de los servicios (DIAN, Oficio 001444 de 2017), cada concepto conserva su naturaleza tributaria: la licencia de uso —servicio de computación en la nube (SaaS), prestado por Algoritmo T S.A.S. como proveedor directo— está excluida de IVA conforme al numeral 21 del artículo 476 del Estatuto Tributario, mientras que los servicios de implementación, consultoría, formación y transferencia no cumplen las características intrínsecas del cloud computing y se gravan de forma independiente a la tarifa general del 19 %. Por ello el IVA se liquida únicamente sobre los conceptos gravados ($ 580.000.000).',
  },

  /* ── Págs. 7 y 22 · Alcance de la consultoría y anexo técnico ── */
  approach: [
    'El alcance comprende la implementación de la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial y la consultoría que la alimenta: el diagnóstico integral del ecosistema digital y la formulación de la hoja de ruta institucional, en coherencia con las políticas nacionales de transformación digital, ciencia abierta, educación virtual y gobierno de datos. El alcance incluye: levantamiento de información institucional, entrevistas, revisión documental y análisis de indicadores · evaluación de madurez digital en las dimensiones organizacional, académica, tecnológica, comunicativa y de gestión · identificación de brechas, riesgos y oportunidades para fortalecer la articulación entre procesos, tecnología y talento humano · diseño de lineamientos estratégicos y una hoja de ruta institucional con iniciativas priorizadas a corto, mediano y largo plazo · integración de resultados bajo un modelo de Arquitectura Empresarial alineado con TOGAF® 10 · implementación, parametrización y puesta en producción de la plataforma, con carga de la totalidad de los productos de la consultoría · licencia de uso durante la ejecución del contrato y los dieciocho meses siguientes a la entrega final, renovable por periodos anuales · y formación y transferencia al equipo de la Universidad para la administración autónoma de la plataforma.',
    'Anexo técnico — la metodología Algoritmo T. Marco propio de medición y gestión de la transformación digital con enfoque territorial, operacionalizado en la plataforma: define qué se mide, con qué evidencia se soporta cada calificación y cómo el resultado se convierte en ejecución gobernable. El instrumento: matriz de cuatro líneas misionales × cuatro dimensiones que produce 16 puntos de medición desagregados en 52 variables; cada variable cuenta con protocolo de indagación —los ítems que se preguntan y a quién se aplican—, la evidencia que se solicita y una rúbrica anclada de cinco niveles. La escala 1–5 (Inicial · Gestionado · Definido · Medido · Optimizado) se asigna contra descriptores observables, no contra juicio libre. La evidencia se soporta por tres vías —Documental (D), Indagación mediante entrevistas e instrumentos (I) y Constatación directa en sistemas (K)—, cada una con criterios de aceptación explícitos. Doble lectura: los responsables de línea reportan su percepción y el equipo consultor califica contra la evidencia; la brecha entre ambas lecturas es, en sí misma, un hallazgo del diagnóstico. Consolidación: cada punto de medición es el promedio de sus variables, publicar una medición exige las 52 variables calificadas y queda versionada con fecha, lo que hace el ejercicio repetible y comparable en el tiempo.',
    'De la medición a la ejecución, el diagnóstico encadena sin traducciones intermedias: capacidades con nivel actual, objetivo y brecha → iniciativas priorizadas por impacto y factibilidad → indicadores con línea base, meta y serie histórica → planes de trabajo con tareas, responsables, dependencias y evidencia de cierre. Toda actividad terminada exige al menos una evidencia adjunta: el avance que reporta la plataforma es avance demostrable. El marco se alinea con TOGAF® 10 en arquitectura empresarial, DAMA-DMBOK en gobierno de datos, los lineamientos de Gobierno Digital de MinTIC y referentes internacionales de madurez digital en educación superior; la metodología, el instrumento y sus protocolos hacen parte del know-how de Algoritmo T S.A.S.',
  ].join('\n\n'),
  scopeNote: 'Delimitación del alcance tecnológico: la consultoría comprende las fases de diagnóstico, diseño y planificación estratégica, e incluye la implementación de la Plataforma de Gestión de la Transformación Digital. No contempla la implementación, adquisición, desarrollo o integración de otros sistemas de información de la Universidad, ni la ejecución de los proyectos derivados de la hoja de ruta, los cuales serán objeto de contrataciones independientes.',

  /* ── Págs. 12, 13, 15 y 16 · Vistas de la plataforma ── */
  screens: {
    intro: 'Las vistas corresponden a la plataforma en operación, con datos ilustrativos de configuración: la primera medición real de la Universidad se produce en la Fase 0. La medición se presenta simultáneamente como radar de las cuatro líneas —con la medición actual, la meta y la anterior superpuestas— y como mapa de calor de línea por dimensión, que permite localizar la debilidad con precisión: no basta saber que una línea está en nivel 2, sino en cuál de sus cuatro dimensiones se concentra el rezago.',
    items: [
      { url: `${IMG}/fig-m1-madurez.png`, caption: 'M1 · Radar institucional de las cuatro líneas y mapa de calor línea × dimensión (/panel/madurez/resumen).', wide: true },
      { url: `${IMG}/fig-m3-territorio.png`, caption: 'M2 · Cobertura y oferta en el territorio: la UPC es una institución con vocación regional y su área de influencia cubre los 25 municipios del Cesar, con realidades muy distintas entre el norte, el centro y el sur (/panel/benchmark/territorio).', wide: true },
      { url: `${IMG}/fig-m2-benchmark.png`, caption: 'M2 · Posición frente a pares y cuadrantes de pertinencia territorial: oferta vigente contra índice de demanda (/panel/benchmark).' },
      { url: `${IMG}/fig-m4-kpi.png`, caption: 'M4 · Batería de indicadores con serie histórica, variación y meta; cada KPI declara quién produce el dato y con qué periodicidad (/panel/kpi).' },
      { url: `${IMG}/fig-m5-ruta.png`, caption: 'M5 · Roadmap por horizontes y matriz de priorización impacto × factibilidad — el insumo para sustentar ante el Consejo qué se ejecuta primero y por qué (/panel/ruta).' },
      { url: `${IMG}/fig-m6-iniciativas.png`, caption: 'M6 · Ejecución presupuestal y factores críticos de éxito en semáforo: cuando un factor acumula dos revisiones en rojo, la conversación se puede tener a tiempo — el mecanismo para detectar que una iniciativa va a fracasar antes de que fracase (/panel/iniciativas/INI-01).' },
      { url: `${IMG}/fig-m7-gp-plan.png`, caption: 'GP · Plan de trabajo con responsable principal y corresponsables, fechas, estados y evidencia por tarea: ninguna tarea puede declararse hecha sin al menos una evidencia adjunta (/panel/proyectos/INI-01).', wide: true },
      { url: `${IMG}/fig-m8-gp-gantt.png`, caption: 'GP · Cronograma con dependencias y reprogramación en cascada: al desplazar una tarea, la plataforma recalcula en cadena todas las dependientes y muestra la desviación contra la línea base congelada antes de aplicar el cambio (/panel/proyectos/INI-01 · cronograma).' },
    ],
    note: 'Frente a una consultoría convencional: el informe de diagnóstico en PDF se vuelve un tablero de madurez navegable y re-medible; la hoja de ruta en un anexo, un roadmap con responsables, presupuesto y estado; la comparación sectorial de una lámina, una comparación permanente contra 357 IES y 33 departamentos; y los indicadores que alguien reconstruye a mano, fichas con dueño, fuente y periodicidad declarados. El proyecto no termina cuando se entrega: la Universidad sigue midiendo su propio avance.',
  },

  /* ── Pág. 8 · Metodología ── */
  timelineNote: 'La metodología se desarrollará mediante un enfoque participativo, basado en la recopilación, contraste y análisis de información institucional, y en la aplicación de referentes nacionales e internacionales de buenas prácticas en transformación digital universitaria. Tres principios la gobiernan: participativo (instrumentos aplicados a directivos, docentes, investigadores, estudiantes y actores de extensión, con talleres de cocreación en la fase de validación), basado en evidencia (cada calificación de madurez se soporta en un documento, un dato o un registro verificable, cargado y trazable en la plataforma) y contrastado (los hallazgos se comparan contra referentes nacionales e internacionales y contra el contexto territorial del Cesar). Los entregables se producen dos veces: cada fase entrega su documento en el formato tradicional —informe, presentación ejecutiva— y, simultáneamente, deja su contenido cargado en la plataforma; la Universidad no espera al mes 6 para ver resultados, pues desde el mes 1 dispone de su radar de madurez publicado. Las fases 1 y 2, y las fases 2 y 3, se traslapan de forma deliberada: el levantamiento de información alimenta simultáneamente el diagnóstico tecnológico y el análisis de posicionamiento, evitando duplicar solicitudes de información a las mismas dependencias.',

  /* ── Págs. 9 y 10 · Plan de trabajo, fases 0 a 5 ── */
  schedule: {
    intro: 'La consultoría se desarrollará en un periodo de seis (6) meses calendario. Cada fase integra componentes académicos, tecnológicos, organizacionales y de gestión, con énfasis en el fortalecimiento de las tres funciones misionales de la Universidad. La plataforma entra en producción en el mes 1 y acompaña toda la ejecución; la licencia continúa 18 meses después del cierre, renovable anualmente.',
    groups: [
      { name: 'Fase 0 · Línea base y madurez digital — mes 1', rows: [
        { label: 'Objetivo: establecer la línea base de madurez digital y del entorno institucional frente a los retos de transformación digital', on: [1, 2, 3, 4], hito: [] },
        { label: 'Actividades: análisis PESTLE; portafolio académico y de servicios; permanencia y éxito estudiantil; capacidades organizacionales, académicas y tecnológicas; brechas y oportunidades', on: [1, 2, 3, 4], hito: [] },
        { label: 'Entregables: informe de madurez digital; presentación ejecutiva de hallazgos iniciales', on: [3, 4], hito: [] },
        { label: 'Salida en la plataforma: M1 · Madurez — puesta en producción, primera medición publicada (niveles por línea y dimensión) y radar institucional disponible', on: [4], hito: [4] },
      ]},
      { name: 'Fase 1 · Diagnóstico institucional y tecnológico — meses 1–2', rows: [
        { label: 'Objetivo: levantar información integral sobre procesos, tecnologías, recursos y servicios institucionales', on: [1, 2, 3, 4, 5, 6, 7, 8], hito: [] },
        { label: 'Actividades: revisión documental y entrevistas con actores misionales; mapeo de tecnologías TIC en uso, adopción, obsolescencia y oportunidades; contraste entre recursos y servicios; riesgos y mejoras', on: [1, 2, 3, 4, 5, 6, 7, 8], hito: [] },
        { label: 'Entregables: inventario tecnológico institucional; mapa de procesos, actores y recursos TIC; análisis de obsolescencia y optimización', on: [6, 7, 8], hito: [] },
        { label: 'Salida en la plataforma: M1 · Madurez + M7 · Inteligencia — inventario cargado y evidencias vinculadas a cada punto de medición; el diagnóstico deja de ser un informe y queda navegable', on: [8], hito: [8] },
      ]},
      { name: 'Fase 2 · Diagnóstico de posicionamiento y rankings — meses 2–3', rows: [
        { label: 'Objetivo: evaluar la posición actual de la UPC frente a estándares nacionales e internacionales', on: [5, 6, 7, 8, 9, 10, 11, 12, 13], hito: [] },
        { label: 'Actividades: análisis frente a Sapiens Research, Scimago Institutions Rankings, THE Impact Rankings y QS World University Rankings; brechas por ranking; recomendaciones de mejora y fortalecimiento de indicadores', on: [5, 6, 7, 8, 9, 10, 11, 12, 13], hito: [] },
        { label: 'Entregables: informe comparativo de rankings; tablero de línea base de indicadores; recomendaciones estratégicas para posicionamiento', on: [11, 12, 13], hito: [] },
        { label: 'Salida en la plataforma: M2 · Comparación territorial + M4 · Indicadores — cortes nacional, regional y de pares con el mapa de cobertura de los 25 municipios; línea 4.3 con línea base cargada — hito de pago 30 %', on: [13], hito: [13] },
      ]},
      { name: 'Fase 3 · Modelo de Universidad Digital — meses 3–4', rows: [
        { label: 'Objetivo: definir el Modelo de Universidad Digital y la arquitectura empresarial que sustentará la transformación', on: [9, 10, 11, 12, 13, 14, 15, 16, 17], hito: [] },
        { label: 'Actividades: diseño del Modelo (visión, objetivos, KPI, ciclo de vida del portafolio); arquitectura bajo TOGAF® 10 (fases Preliminary, Visión y Negocio); integración de investigación, docencia y extensión; priorización de proyectos y quick wins', on: [9, 10, 11, 12, 13, 14, 15, 16, 17], hito: [] },
        { label: 'Entregables: documento del Modelo de Universidad Digital; mapa de procesos y capacidades institucionales; lineamientos de arquitectura empresarial', on: [15, 16, 17], hito: [] },
        { label: 'Salida en la plataforma: M3 · Capacidades y mapa estratégico — catálogo navegable con nivel actual, objetivo y brecha por capacidad, encadenado a objetivos e indicadores', on: [17], hito: [17] },
      ]},
      { name: 'Fase 4 · Hoja de ruta e Iniciativa Mínima Viable — meses 4–5', rows: [
        { label: 'Objetivo: formular la hoja de ruta institucional y consolidar la IMV como demostración de valor de corto plazo', on: [14, 15, 16, 17, 18, 19, 20, 21, 22], hito: [] },
        { label: 'Actividades: elaboración del roadmap con fases, responsables e indicadores; validación técnica y financiera de iniciativas priorizadas; consolidación de la IMV', on: [14, 15, 16, 17, 18, 19, 20, 21, 22], hito: [] },
        { label: 'Entregables: hoja de ruta institucional; plan operativo de la IMV; cronograma tipo Gantt por fases', on: [20, 21, 22], hito: [] },
        { label: 'Salida en la plataforma: M5 · Ruta + M6 · Iniciativas + GP — roadmaps específicos traducidos a planes de trabajo con tareas, fechas y evidencia. La plataforma constituye la IMV: no es un piloto hipotético, sino un sistema en operación con datos reales desde el mes 1', on: [22], hito: [22] },
      ]},
      { name: 'Fase 5 · Validación y socialización institucional — meses 5–6', rows: [
        { label: 'Objetivo: asegurar la apropiación y validación de los resultados con equipos directivos y misionales', on: [18, 19, 20, 21, 22, 23, 24, 25, 26], hito: [] },
        { label: 'Actividades: talleres de cocreación y validación con directivos y docentes; ajustes finales a la hoja de ruta y a la IMV; presentación ejecutiva final ante Rectoría y Consejo Directivo', on: [18, 19, 20, 21, 22, 23, 24, 25, 26], hito: [] },
        { label: 'Entregables: informe de socialización; ajustes finales validados; presentación ejecutiva final; informe final consolidado de la consultoría', on: [24, 25, 26], hito: [] },
        { label: 'Salida en la plataforma: Administración y roles — vista pública de solo lectura para Consejo Directivo, usuarios y permisos transferidos, formación en la operación e inicio de la licencia de 18 meses — hito de pago 40 %', on: [26], hito: [26] },
      ]},
    ],
    legend: 'Cada fase entrega su salida en un módulo de la plataforma',
  },

  /* ── Pág. 19 · Nota de la inversión ── */
  investmentNote: 'Valores expresados en pesos colombianos. Duración: seis (6) meses calendario de ejecución, más dieciocho (18) meses de licencia de uso contados desde la entrega final. Renovación anual de la licencia al vencimiento: $ 80.000.000 COP por año, bajo el régimen de la licencia (SaaS excluido de IVA). Correspondencia con conceptos de gasto: implementación de la plataforma → recursos tecnológicos (1 plataforma) · licencia de uso 18 meses → recursos tecnológicos (1 suscripción) · renovación anual → recursos tecnológicos (1 suscripción/año) · levantamiento, diagnóstico y acompañamiento → talento humano / soporte especializado (N.º de profesionales). La correspondencia definitiva se ajustará conforme a la estructura presupuestal que defina la Universidad.',

  /* ── Pág. 20 · Forma de pago y términos ── */
  milestones: [
    { name: 'Hito 01 · Anticipo (30 %)', week: 'A la firma', criterion: 'A la suscripción del contrato.' },
    { name: 'Hito 02 · Cierre de la Fase 2 (30 %)', week: 'Fin del mes 3', criterion: 'Contra entrega y aceptación del Informe comparativo de rankings y del tablero de línea base de indicadores.' },
    { name: 'Hito 03 · Cierre de la Fase 5 (40 %)', week: 'Fin del mes 6', criterion: 'Contra entrega y aceptación del informe final consolidado y de la plataforma en operación con la transferencia realizada.' },
  ],
  paymentsNote: 'Los hitos de pago se asocian a entregables verificables y no a la denominación de las fases, de modo que no exista ambigüedad sobre el momento de facturación. Una vez emitidas y radicadas las correspondientes facturas, deberán pagarse en un plazo no mayor a quince (15) días calendario; en caso de mora se causarán intereses del 1,5 % mensual. Medio de pago: Banco Caja Social · cuenta de ahorros 2410491798 · titular Algoritmo T S.A.S. · NIT 901.449.696-2.',

  /* ── Pág. 17 · Licencia, soporte y continuidad ── */
  service: {
    includedMonths: 18,
    renewalPrice: 80_000_000,
    exitPrice: 0,
    levelsIntro: 'Qué comprende la licencia durante todo el periodo:',
    levels: [
      { name: 'Uso ilimitado por usuarios de la Universidad', desc: 'Dentro de los perfiles definidos, sin cargo por usuario adicional.' },
      { name: 'Alojamiento, operación y respaldo', desc: 'De la plataforma y de la información institucional cargada.' },
      { name: 'Actualizaciones funcionales', desc: 'Que Algoritmo T libere sobre el producto durante el periodo licenciado, sin costo adicional.' },
      { name: 'Soporte funcional', desc: 'Para el equipo administrador de la Universidad durante el periodo licenciado.' },
      { name: 'Acceso a los observatorios', desc: 'Y a sus actualizaciones de datos durante el periodo licenciado.' },
    ],
    note: 'Portabilidad de la información: la Universidad podrá exportar en cualquier momento, y en formatos abiertos y estándar, la totalidad de la información institucional cargada —mediciones, evidencias, capacidades, indicadores, iniciativas y ejecución presupuestal—; esta condición aplica también al vencimiento del periodo licenciado, de modo que conserva su información con independencia de la continuidad del servicio. Continuidad al vencimiento: al término de los dieciocho meses la Universidad podrá renovar la licencia como suscripción institucional de tarifa plana —usuarios ilimitados dentro de los perfiles definidos, sin cobro por usuario ni por consumo— por periodos anuales de $ 80.000.000 COP (valor 2026, ajustable anualmente por IPC como único mecanismo de incremento), con los mismos servicios del periodo inicial. La no renovación no afecta la propiedad de la Universidad sobre su información ni su derecho a exportarla.',
  },

  /* ── Pág. 18 · Equipo consultor ── */
  teamIntro: 'La ejecución estará a cargo de un equipo multidisciplinario conformado por profesionales con amplia experiencia en transformación digital, gobierno de datos, ciencia, tecnología e innovación, educación superior y gestión institucional.',
  team: [
    { role: 'Consultor líder / Director de proyecto', dedication: 'Fases 0 y 5', functions: ['Dirigir el levantamiento de información y coordinar el equipo consultor', 'Consolidar la línea base institucional y validar el enfoque metodológico con la alta dirección', 'Liderar la validación final de entregables y los talleres con los equipos de la Universidad', 'Asegurar la coherencia técnica y metodológica de los resultados'] },
    { role: 'Arquitecto empresarial y especialista TIC', dedication: 'Fases 1 y 3', functions: ['Mapear procesos, sistemas y plataformas institucionales', 'Identificar tecnologías en uso, obsolescencia y oportunidades; elaborar el inventario TIC', 'Diseñar la arquitectura institucional bajo TOGAF® 10', 'Definir la estructura de gobernanza, los procesos clave y los lineamientos de interoperabilidad'] },
    { role: 'Analista de datos', dedication: 'Fases 1 y 2', functions: ['Sistematizar la información levantada', 'Desarrollar los tableros de control y representar los niveles de madurez y las brechas institucionales', 'Parametrizar y cargar la información en la plataforma'] },
    { role: 'Consultores académico, CTeI y extensión', dedication: 'Fases 2 y 3', functions: ['Analizar la cadena de valor de la investigación y la visibilidad científica', 'Identificar brechas y oportunidades frente a los estándares de rankings', 'Analizar la oferta académica y proponer lineamientos para el ciclo de vida de programas', 'Apoyar la construcción del Modelo de Universidad Digital'] },
    { role: 'Especialista TIC / Tecnologías educativas', dedication: 'Fase 4', functions: ['Definir la arquitectura tecnológica', 'Planificar la ejecución de la Iniciativa Mínima Viable', 'Priorizar los proyectos de modernización con impacto en el corto plazo'] },
    { role: 'Especialista de plataforma', dedication: 'Fases 0 a 5', functions: ['Implementar y parametrizar la plataforma; configurar perfiles y permisos', 'Asegurar la carga de los productos de cada fase', 'Ejecutar la formación y transferencia al equipo administrador de la Universidad'] },
  ],
  workRhythm: {
    title: 'Interlocución con la Universidad',
    body: 'El equipo consultor trabajará de manera articulada con el responsable institucional designado por la UPC y con los responsables de cada una de las cuatro líneas, quienes serán los usuarios permanentes de la plataforma una vez concluida la consultoría.',
  },

  /* ── Pág. 7 · Consideraciones específicas y delimitación del alcance ── */
  assumptions: [
    'Metodología: el diagnóstico se basa en variables y criterios de análisis contrastados con buenas prácticas internacionales en transformación digital universitaria, alineadas a la gestión de la docencia, la investigación y la extensión.',
    'Fuentes: se requiere acceso irrestricto a la información documental, de recursos y servicios institucionales disponibles.',
    'Acceso a sistemas: la Universidad facilitará acceso a los sistemas o repositorios relevantes —investigación, biblioteca, datos institucionales— para análisis y contrastación.',
    'Actores: se requerirá participación activa de los actores misionales —académicos, investigadores y gestores de extensión— y de las dependencias de apoyo.',
    'Interlocutor: la UPC designará un responsable institucional que coordine la entrega de información, el acceso a fuentes y la logística de las sesiones presenciales o virtuales.',
    'Responsables de línea: la UPC designará un responsable por cada una de las cuatro líneas, quien cargará evidencia y reportará avances en la plataforma.',
    'Equipo consultor: profesionales especializados en transformación digital, gobernanza de datos, educación digital, analítica institucional y arquitectura empresarial.',
  ],
  exclusions: [
    'La implementación, adquisición, desarrollo o integración de otros sistemas de información de la Universidad.',
    'La ejecución de los proyectos derivados de la hoja de ruta, que serán objeto de contrataciones independientes.',
    'Impuestos adicionales como estampillas o tributos territoriales: de aplicar por tratarse de contratación con una universidad pública, deberán ser asumidos directamente por la entidad contratante o calculados de manera independiente al valor de la propuesta.',
  ],

  /* ── Pág. 21 · Anexos: confidencialidad y propiedad intelectual ── */
  guarantees: [
    { concept: 'Confidencialidad', text: 'La información que Algoritmo T S.A.S. obtenga, acceda o reciba de la Universidad —oral, escrita, electrónica o por cualquier medio— será considerada confidencial y se utilizará exclusivamente para el desarrollo de los servicios contratados. No será divulgada a terceros sin autorización expresa y por escrito de la Universidad, salvo exigencia de autoridad judicial, administrativa o regulatoria competente, o cuando sea estrictamente necesario compartirla con aliados estratégicos o consultores vinculados al proyecto. Se aplican las medidas técnicas, administrativas y organizacionales de la Ley 1581 de 2012 y el Decreto 1377 de 2013.' },
    { concept: 'Productos e información institucional', text: 'Informes, diagnósticos, modelos, hojas de ruta, tableros y demás productos derivados de la consultoría, así como la totalidad de la información institucional cargada en la plataforma —mediciones, evidencias, capacidades, indicadores, iniciativas y ejecución presupuestal— son propiedad de la Universidad Popular del Cesar, para su uso institucional, sin restricción de tiempo ni de reproducción interna, y exportables en formatos abiertos en cualquier momento.' },
    { concept: 'Plataforma y know-how metodológico', text: 'El software de la Plataforma de Gestión de la Transformación Digital, su código fuente, el modelo e instrumento de medición de madurez, los observatorios y sus componentes analíticos, y las metodologías, herramientas, plantillas y procedimientos técnicos empleados son propiedad de Algoritmo T S.A.S., entregados bajo licencia de uso durante el periodo pactado. Se prohíbe su reproducción, distribución, modificación, descompilación o cesión a terceros sin autorización previa y por escrito.' },
    { concept: 'Validez de la propuesta', text: 'Se mantendrán el valor y los términos de esta propuesta durante treinta (30) días calendario contados a partir de la fecha de su envío.' },
  ],

  /* ── Cierre ── */
  finalNote: `Esta vista interactiva refleja el documento de referencia de la propuesta, disponible en versión diagramada de 23 páginas con descarga en PDF y Word: ${DOC_URL}`,
  backQuote: 'Gracias por la oportunidad de acompañar a la Universidad Popular del Cesar.',

  signature: {
    name: 'Ana Milena Díaz Granados',
    role: 'Directora de Relacionamiento · Algoritmo T S.A.S.',
    email: 'anadiazgrandos@algoritmot.com',
    phone: '+57 300 659 0161',
  },
}

/* ══ Aplicar ══ */
const quote = await db.quote.findUnique({ where: { id: QUOTE_ID }, select: { id: true, publicId: true } })
if (!quote) throw new Error(`No existe la cotización ${QUOTE_ID}`)

await db.quote.update({
  where: { id: quote.id },
  data: {
    title: 'Plataforma de Gestión de la Transformación Digital con Enfoque Territorial',
    subtitle: 'Diagnóstico, hoja de ruta e implementación — cada fase de la consultoría entrega su salida en un módulo de la plataforma. Universidad Popular del Cesar · Vicerrectoría Académica · Valledupar.',
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
console.log(`OK · /c/${quote.publicId} · total ${totals.total} · ${content.schedule.groups.length} fases · ${content.architecture.layers.length} módulos · ${content.screens.items.length} vistas · ${content.team.length} roles · ${content.guarantees.length} anexos`)
await db.$disconnect()
