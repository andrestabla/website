/**
 * Cotización UPC 2026 — páginas del documento (content.pages), espejo exacto de
 * la propuesta diagramada:
 *   https://www.algoritmot.com/cotizaciones/upc-2026/Propuesta-UPC-2026.html
 *
 * Cada página de aquí es una página de ese documento, en el mismo orden, con la
 * misma estructura de bloques y el mismo texto. Todo es editable desde el
 * builder (Contenido → Páginas del documento).
 *
 *   npx tsx scripts/seed-upc-pages.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')

const db = prisma as any
const QUOTE_ID = 'cmsmcc6o70000h8yqizz8yem4'
const IMG = '/cotizaciones/upc-2026/img'

const pages = [
  /* ── Pág. 2 · Carta ── */
  {
    id: 'carta', num: '—', kicker: 'Presentación', title: 'Carta de presentación',
    blocks: [
      {
        type: 'letterhead',
        date: 'Bogotá D.C., 5 de agosto de 2026',
        addressee: 'Señores\nUniversidad Popular del Cesar\nVicerrectoría Académica\nValledupar',
        subject: 'Propuesta técnica y económica — Implementación de la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad Popular del Cesar.',
        salutation: 'Reciban un cordial saludo,',
      },
      { type: 'p', text: 'Conforme a los lineamientos definidos por la Universidad Popular del Cesar en sus documentos contractuales, presentamos la propuesta técnica y económica formulada por Algoritmo T S.A.S. para implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad. La plataforma se construye y se carga mediante una consultoría de seis meses: cada fase del trabajo entrega su salida en un módulo de la plataforma.\n\nEl resultado es una visión integral, accionable y priorizada — y el instrumento permanente para administrarla. El trabajo propuesto contempla:' },
      { type: 'list', items: [
        'Levantar y evaluar el estado actual de personas, procesos, datos y tecnología asociados a las funciones misionales de la Universidad.',
        'Determinar el nivel de madurez tecnológica e identificar las principales brechas y riesgos en gobierno de datos, interoperabilidad, analítica, seguridad y experiencia de usuario.',
        'Definir una hoja de ruta estratégica y medible, con iniciativas, responsables, métricas e hitos por fases, que permita orientar inversiones e intervenciones futuras.',
        'Alinear decisiones institucionales con los objetivos misionales y las políticas nacionales de CTeI, fortaleciendo la visibilidad, eficiencia y sostenibilidad de la gestión universitaria.',
      ]},
      { type: 'box', title: 'Una diferencia respecto de una consultoría convencional', body: 'El resultado de este trabajo no es únicamente un informe. La Universidad recibe, además, la Plataforma de Gestión de la Transformación Digital: un entorno en operación desde el primer mes, donde el diagnóstico queda cargado como una medición repetible, la hoja de ruta como iniciativas con responsable y presupuesto, y el avance como información consultable. La Universidad dispone de acceso a la plataforma durante los seis meses de ejecución y los dieciocho meses siguientes a la entrega final, con renovación anual posterior.' },
      { type: 'p', text: 'El propósito final es entregar a la UPC un diagnóstico honesto, técnico y estratégico que sirva como punto de partida para construir una transformación digital sólida, escalable y centrada en el valor público de la CTeI como motor de desarrollo de la institución, el país y la región.\n\nAgradecemos la confianza y la apertura al permitirnos presentar esta propuesta. Quedamos atentos para socializar el alcance y resolver cualquier inquietud que surja.\n\nCordialmente,\n\nAna Milena Díaz Granados\nDirectora de Relacionamiento — Algoritmo T S.A.S.\nanadiazgrandos@algoritmot.com · +57 300 659 0161 · www.algoritmot.com' },
    ],
  },

  /* ── Pág. 3 · Índice ── */
  {
    id: 'indice', num: '—', kicker: 'Índice', title: 'Tabla de contenido',
    blocks: [
      { type: 'toc' },
      { type: 'box', title: 'Qué recibe la Universidad al cierre del contrato', body: 'Un informe de diagnóstico con análisis de brechas · un inventario tecnológico institucional · un informe comparativo de rankings · el documento del Modelo de Universidad Digital con su mapa de capacidades · la hoja de ruta institucional priorizada · el plan operativo de la Iniciativa Mínima Viable · y la Plataforma de Gestión de la Transformación Digital en operación, con toda esa información cargada y licencia de uso por dieciocho meses, renovable anualmente.' },
    ],
  },

  /* ── Pág. 4 · Generalidades ── */
  {
    id: 'generalidades', num: '01', kicker: 'Contexto', title: 'Generalidades y justificación',
    blocks: [
      { type: 'p', text: 'Desde Algoritmo T S.A.S. identificamos que la Universidad Popular del Cesar enfrenta hoy un momento decisivo en su proceso de modernización y fortalecimiento institucional.\n\nLos avances y desafíos globales en transformación digital universitaria, sumados a las nuevas dinámicas en la gestión de la Ciencia, la Tecnología y la Innovación (CTeI), la formación académica y la proyección social, exigen ecosistemas integrados, basados en datos y orientados a resultados, que fortalezcan las tres funciones misionales de la Universidad: docencia, investigación y extensión.\n\nA partir de los análisis realizados y de los espacios de diálogo con las diferentes dependencias universitarias, se evidencian brechas estructurales en los procesos, plataformas y flujos de información que limitan la articulación, la eficiencia y el impacto de la gestión institucional. Estas condiciones hacen necesario un diagnóstico técnico y organizacional profundo que permita definir una Ruta de Transformación Digital institucional, transversal a las tres misiones universitarias, y alineada con las prioridades, capacidades y proyección estratégica de la UPC como universidad pública comprometida con el desarrollo regional y nacional.' },
      { type: 'h3', text: 'Objeto' },
      { type: 'p', text: 'Implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial como instrumento institucional permanente de la Universidad Popular del Cesar. La consultoría de seis meses —que diagnostica el ecosistema digital y formula la hoja de ruta institucional— la construye y la carga: cada fase tiene su salida en un módulo de la plataforma, desde los niveles de madurez del diagnóstico hasta el portafolio de iniciativas y los roadmaps específicos.\n\nEl alcance del proyecto comprende el análisis de capacidades institucionales, procesos, flujos de información, datos, plataformas, esquemas de gobernanza y condiciones organizacionales que inciden en el desempeño universitario. Desde esta perspectiva, la transformación digital se aborda como un proceso de rediseño institucional orientado al fortalecimiento de la calidad académica, la eficiencia operativa, la gestión del conocimiento, la visibilidad científica y la sostenibilidad organizacional.\n\nEn el contexto actual de la educación superior, la producción de información, la gestión de datos y la interoperabilidad entre sistemas constituyen condiciones habilitantes para la planeación, el seguimiento, la evaluación y la toma de decisiones. Por ello, la Universidad requiere una arquitectura digital alineada con su direccionamiento estratégico, con capacidades para integrar procesos, asegurar consistencia de la información y soportar decisiones basadas en evidencia.' },
      { type: 'h3', text: 'El diagnóstico, la hoja de ruta y la plataforma permitirán a la Universidad' },
      { type: 'table', firstCol: 'key', headers: ['#', 'Resultado esperado'], rows: [
        ['01', 'Establecer su nivel actual de madurez digital, mediante un análisis integral de personas, procesos, datos, tecnologías y cultura organizacional en las tres funciones misionales — y volver a medirlo periódicamente con el mismo instrumento.'],
        ['02', 'Identificar brechas y riesgos críticos que afecten la toma de decisiones, la calidad de la información, la interoperabilidad entre sistemas y la analítica institucional.'],
        ['03', 'Definir una estrategia de transformación digital institucional, priorizada y ejecutable, que sirva como marco de acción para la modernización de los procesos académicos, investigativos y de extensión.'],
        ['04', 'Alinear la gestión universitaria con las políticas nacionales de transformación digital, gobierno de datos, educación digital y ciencia abierta, asegurando coherencia con las iniciativas del Ministerio de Educación Nacional y del Ministerio de Ciencia, Tecnología e Innovación.'],
        ['05', 'Hacer seguimiento verificable a las iniciativas derivadas, con responsables, presupuesto asignado, comprometido y ejecutado, e indicadores con dueño y periodicidad declarados.'],
      ]},
    ],
  },

  /* ── Pág. 5 · Propósito ── */
  {
    id: 'proposito', num: '02', kicker: 'Enfoque', title: 'Propósito de la consultoría',
    blocks: [
      { type: 'lede', text: 'Dejar operando en la Universidad Popular del Cesar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial, alimentada por una consultoría que diagnostica el estado actual del ecosistema digital y formula la hoja de ruta institucional — transversal a docencia, investigación y extensión y a las áreas de apoyo, con foco en gobierno de datos, interoperabilidad, analítica y experiencia de usuario.' },
      { type: 'p', text: 'Nuestro enfoque integra análisis técnico y comprensión organizacional —personas, procesos, información, aplicaciones y tecnología—, para que la UPC pase del reconocimiento de brechas a la ejecución de soluciones concretas, medibles y sostenibles.\n\nComo resultado, entregaremos una visión integral de transformación digital acompañada de una Ruta de Arquitectura Empresarial, que:' },
      { type: 'list', items: [
        'Articule capacidades, procesos y flujos de información de las tres misiones y sus soportes administrativos.',
        'Estructure un modelo de gobierno digital —roles, responsables, políticas y métricas— que habilite decisiones basadas en evidencia.',
        'Priorice iniciativas por impacto y factibilidad.',
        'Asegure alineación con marcos y políticas nacionales de transformación digital, ciencia abierta, educación digital y gobierno de datos.',
      ]},
      { type: 'p', text: 'La Ruta de Arquitectura Empresarial se desarrollará siguiendo referentes del TOGAF® y DAMA para definir principios, visión y modelo de capacidades y procesos que soporten la ejecución del plan y la evolución ordenada del portafolio de iniciativas.' },
      { type: 'h3', text: 'El instrumento que sostiene el propósito' },
      { type: 'p', text: 'Una hoja de ruta que no se puede medir es una declaración de intenciones. Por eso el propósito de esta consultoría incorpora un componente adicional: dejar instalado en la Universidad el instrumento con el que la ruta se administra. La Plataforma de Gestión de la Transformación Digital convierte cada elemento del diagnóstico en información viva:' },
      { type: 'table', firstCol: 'key', headers: ['Producto de la consultoría', 'Cómo queda en la plataforma'], rows: [
        ['Diagnóstico de madurez', 'Medición fechada y repetible en cuatro líneas y cuatro dimensiones, con evidencia adjunta por cada punto de medición'],
        ['Análisis comparativo', 'Cortes permanentes contra el sistema nacional de educación superior y contra el contexto regional del Cesar'],
        ['Mapa de capacidades', 'Catálogo con nivel actual, nivel objetivo y brecha, encadenado a objetivos, iniciativas e indicadores'],
        ['Hoja de ruta', 'Iniciativas con horizonte, responsable, presupuesto, dependencias y estado'],
        ['Indicadores', 'Batería de KPI con definición, fuente, responsable, periodicidad, línea base, meta y serie histórica'],
      ]},
    ],
  },

  /* ── Pág. 6 · Objetivos ── */
  {
    id: 'objetivos', num: '03', kicker: 'Qué se busca', title: 'Objetivos',
    blocks: [
      { type: 'h3', text: 'Objetivo general' },
      { type: 'p', text: 'Implementar la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial de la Universidad Popular del Cesar, construida y cargada mediante un diagnóstico integral de su ecosistema digital y una hoja de ruta estratégica que articule docencia, investigación, extensión y áreas de apoyo con las capacidades tecnológicas, organizacionales y de gestión requeridas — de modo que la institución pueda medir, administrar y sostener su transformación digital en el tiempo, con decisiones basadas en evidencia.' },
      { type: 'h3', text: 'Objetivos específicos' },
      { type: 'cards', cols: 2, items: [
        { tag: 'Línea 4.1', title: 'Academia y Virtualidad', body: 'Diagnosticar el estado actual frente a educación digital en dimensiones organizacional, pedagógica, comunicativa y tecnológica.\n\nProponer lineamientos para un modelo objetivo de virtualidad y un piloto de despliegue inicial.' },
        { tag: 'Línea 4.2', title: 'Investigación y CTeI', body: 'Mapear actores, procesos y servicios de la cadena de valor de la investigación: gestión, visibilidad y posicionamiento.\n\nIdentificar brechas y riesgos frente a lineamientos y estándares; proponer oportunidades de mejora.\n\nDefinir una ruta de acción alineada a la transformación digital institucional.' },
        { tag: 'Línea 4.3', title: 'Extensión, Relacionamiento y Rankings', body: 'Diagnosticar el desempeño misional frente a criterios de rankings seleccionados.\n\nIdentificar brechas e indicadores críticos y proponer estrategias priorizadas.\n\nDiseñar un roadmap de posicionamiento con hitos, responsables y metas medibles.' },
        { tag: 'Línea 4.4', title: 'Arquitectura Empresarial y Gobierno Digital', body: 'Establecer una Arquitectura Empresarial alineada con TOGAF® 10.\n\nDefinir principios y lineamientos para interoperabilidad, seguridad y eficiencia.\n\nProponer modelo de gobierno digital y un roadmap priorizado por impacto y factibilidad.' },
      ]},
      { type: 'box', title: 'Las cuatro líneas son también los cuatro ejes de medición', body: 'Cada línea de objetivos corresponde a un eje del instrumento de madurez de la plataforma. Lo que se diagnostica es exactamente lo que después se mide, se compara y se sigue — sin traducciones intermedias entre el informe y el tablero.' },
    ],
  },

  /* ── Pág. 7 · Alcance ── */
  {
    id: 'alcance', num: '04', kicker: 'Qué comprende', title: 'Alcance de la consultoría',
    blocks: [
      { type: 'lede', text: 'El alcance comprende la implementación de la Plataforma de Gestión de la Transformación Digital con Enfoque Territorial y la consultoría que la alimenta: el diagnóstico integral del ecosistema digital y la formulación de la hoja de ruta institucional, en coherencia con las políticas nacionales de transformación digital, ciencia abierta, educación virtual y gobierno de datos.' },
      { type: 'h3', text: 'El alcance incluye' },
      { type: 'list', items: [
        'Levantamiento de información institucional, entrevistas, revisión documental y análisis de indicadores.',
        'Evaluación de madurez digital en las dimensiones organizacional, académica, tecnológica, comunicativa y de gestión.',
        'Identificación de brechas, riesgos y oportunidades para fortalecer la articulación entre procesos, tecnología y talento humano.',
        'Diseño de lineamientos estratégicos y una hoja de ruta institucional, con iniciativas priorizadas a corto, mediano y largo plazo.',
        'Integración de resultados bajo un modelo de Arquitectura Empresarial alineado con el estándar TOGAF® 10, que articule personas, procesos, información, aplicaciones y tecnología.',
        'Implementación, parametrización y puesta en producción de la Plataforma de Gestión de la Transformación Digital, con carga de la totalidad de los productos de la consultoría.',
        'Licencia de uso de la plataforma durante la ejecución del contrato y los dieciocho meses siguientes a la entrega final, renovable por periodos anuales.',
        'Formación y transferencia al equipo de la Universidad para la administración autónoma de la plataforma.',
      ]},
      { type: 'box', title: 'Delimitación del alcance tecnológico', body: 'La consultoría comprende las fases de diagnóstico, diseño y planificación estratégica, e incluye la implementación de la Plataforma de Gestión de la Transformación Digital descrita en el capítulo 06. No contempla la implementación, adquisición, desarrollo o integración de otros sistemas de información de la Universidad, ni la ejecución de los proyectos derivados de la hoja de ruta, los cuales serán objeto de contrataciones independientes.' },
      { type: 'h3', text: 'Consideraciones específicas' },
      { type: 'table', firstCol: 'key', rows: [
        ['Metodología', 'El diagnóstico se basa en variables y criterios de análisis contrastados con buenas prácticas internacionales en transformación digital universitaria, alineadas a la gestión de la docencia, la investigación y la extensión.'],
        ['Fuentes', 'Se requiere acceso irrestricto a la información documental, de recursos y servicios institucionales disponibles.'],
        ['Acceso a sistemas', 'La Universidad facilitará acceso a los sistemas o repositorios relevantes —investigación, biblioteca, datos institucionales— para análisis y contrastación.'],
        ['Actores', 'Se requerirá participación activa de los actores misionales —académicos, investigadores y gestores de extensión— y de las dependencias de apoyo.'],
        ['Interlocutor', 'La UPC designará un responsable institucional que coordine la entrega de información, el acceso a fuentes y la logística de las sesiones presenciales o virtuales.'],
        ['Responsables de línea', 'La UPC designará un responsable por cada una de las cuatro líneas, quien cargará evidencia y reportará avances en la plataforma.'],
        ['Equipo consultor', 'Profesionales especializados en transformación digital, gobernanza de datos, educación digital, analítica institucional y arquitectura empresarial.'],
      ]},
    ],
  },

  /* ── Pág. 8 · Metodología ── */
  {
    id: 'metodologia', num: '04', kicker: 'Cómo se ejecuta', title: 'Metodología',
    blocks: [
      { type: 'lede', text: 'La metodología se desarrollará mediante un enfoque participativo, basado en la recopilación, contraste y análisis de información institucional, y en la aplicación de referentes nacionales e internacionales de buenas prácticas en transformación digital universitaria. Se estructura en seis fases iterativas, numeradas de 0 a 5, que constituyen el único esquema de fases de esta propuesta y el marco de referencia de los hitos de pago.' },
      { type: 'gantt',
        cols: ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6'],
        rows: [
          { label: 'Fase 0 · Línea base y madurez', from: 1, to: 1, tone: 'cyan' },
          { label: 'Fase 1 · Diagnóstico institucional', from: 1, to: 2, tone: 'cyan' },
          { label: 'Fase 2 · Posicionamiento y rankings', from: 2, to: 3, tone: 'cyan' },
          { label: 'Fase 3 · Modelo de Universidad Digital', from: 3, to: 4, tone: 'deep' },
          { label: 'Fase 4 · Hoja de ruta e IMV', from: 4, to: 5, tone: 'deep' },
          { label: 'Fase 5 · Validación y socialización', from: 5, to: 6, tone: 'deep' },
          { label: 'Plataforma en operación', from: 1, to: 6, tone: 'gold', bold: true },
        ],
        note: 'La plataforma entra en producción en el mes 1 y acompaña toda la ejecución. La licencia continúa 18 meses después del cierre, renovable anualmente.',
      },
      { type: 'h3', text: 'Principios metodológicos' },
      { type: 'cards', cols: 3, items: [
        { title: 'Participativo', body: 'Instrumentos aplicados a directivos, docentes, investigadores, estudiantes y actores de extensión; talleres de cocreación en la fase de validación.' },
        { title: 'Basado en evidencia', body: 'Cada calificación de madurez se soporta en un documento, un dato o un registro verificable, cargado y trazable en la plataforma.' },
        { title: 'Contrastado', body: 'Los hallazgos se comparan contra referentes nacionales e internacionales y contra el contexto territorial del Cesar.' },
      ]},
      { type: 'box', title: 'Los entregables se producen dos veces', body: 'Cada fase entrega su documento en el formato tradicional —informe, presentación ejecutiva— y, simultáneamente, deja su contenido cargado en la plataforma. La Universidad no espera al mes 6 para ver resultados: desde el mes 1 dispone de su radar de madurez publicado.' },
    ],
  },

  /* ── Pág. 9 · Plan de trabajo, fases 0 a 2 ── */
  {
    id: 'plan-1', num: '05', kicker: 'Fases 0 a 2', title: 'Plan de trabajo',
    blocks: [
      { type: 'p', text: 'La consultoría se desarrollará en un periodo de seis (6) meses calendario. Cada fase integra componentes académicos, tecnológicos, organizacionales y de gestión, con énfasis en el fortalecimiento de las tres funciones misionales de la Universidad.' },
      { type: 'phase', id: 'FASE 0', name: 'Línea base y madurez digital', when: 'Mes 1', defs: [
        { term: 'Objetivo', desc: 'Establecer la línea base de madurez digital y del entorno institucional frente a los retos de transformación digital.' },
        { term: 'Actividades', desc: 'Análisis PESTLE; evaluación del portafolio académico y de servicios; análisis de permanencia y éxito estudiantil; valoración de capacidades organizacionales, académicas y tecnológicas; identificación de brechas y oportunidades.' },
        { term: 'Entregables', desc: 'Informe de madurez digital; presentación ejecutiva de hallazgos iniciales.' },
        { term: 'Salida en la plataforma', desc: 'M1 · Madurez — puesta en producción de la plataforma. Primera medición de madurez publicada (niveles por línea y dimensión) y radar institucional disponible para la Universidad.', strong: true },
      ]},
      { type: 'phase', id: 'FASE 1', name: 'Diagnóstico institucional y tecnológico', when: 'Meses 1–2', defs: [
        { term: 'Objetivo', desc: 'Levantar información integral sobre procesos, tecnologías, recursos y servicios institucionales.' },
        { term: 'Actividades', desc: 'Revisión documental y entrevistas con actores misionales; mapeo de tecnologías TIC en uso, nivel de adopción, obsolescencia y oportunidades; contraste entre recursos y servicios institucionales; identificación de riesgos y oportunidades de mejora.' },
        { term: 'Entregables', desc: 'Inventario tecnológico institucional; mapa de procesos, actores y recursos TIC; análisis de obsolescencia y oportunidades de optimización.' },
        { term: 'Salida en la plataforma', desc: 'M1 · Madurez y M7 · Inteligencia — inventario tecnológico cargado y evidencias vinculadas a cada punto de medición; el diagnóstico deja de ser un informe y queda navegable.', strong: true },
      ]},
      { type: 'phase', id: 'FASE 2', name: 'Diagnóstico de posicionamiento y rankings universitarios', when: 'Meses 2–3', defs: [
        { term: 'Objetivo', desc: 'Evaluar la posición actual de la UPC frente a estándares nacionales e internacionales.' },
        { term: 'Actividades', desc: 'Análisis de desempeño institucional frente a los rankings Sapiens Research, Scimago Institutions Rankings, THE Impact Rankings y QS World University Rankings; identificación de brechas y oportunidades frente a cada ranking; formulación de recomendaciones de mejora y fortalecimiento de indicadores.' },
        { term: 'Entregables', desc: 'Informe comparativo de rankings; tablero de línea base de indicadores; recomendaciones estratégicas para posicionamiento.' },
        { term: 'Salida en la plataforma', desc: 'M2 · Comparación territorial y M4 · Indicadores — cortes de comparación nacional, regional y de pares habilitados, con el mapa de cobertura y oferta de los 25 municipios del Cesar; indicadores de la línea 4.3 con línea base cargada.', strong: true },
      ]},
    ],
  },

  /* ── Pág. 10 · Plan de trabajo, fases 3 a 5 ── */
  {
    id: 'plan-2', num: '05', kicker: 'Fases 3 a 5', title: 'Plan de trabajo', tocHidden: true,
    blocks: [
      { type: 'phase', id: 'FASE 3', name: 'Planificación y diseño estratégico — Modelo de Universidad Digital', when: 'Meses 3–4', defs: [
        { term: 'Objetivo', desc: 'Definir el Modelo de Universidad Digital y la arquitectura empresarial que sustentará la transformación.' },
        { term: 'Actividades', desc: 'Diseño del Modelo de Universidad Digital —visión, objetivos, KPI, ciclo de vida del portafolio—; diseño de arquitectura empresarial y tecnológica bajo TOGAF® 10 (fases Preliminary, Visión y Negocio); integración de componentes de investigación, docencia y extensión; priorización de proyectos tecnológicos y quick wins.' },
        { term: 'Entregables', desc: 'Documento del Modelo de Universidad Digital; mapa de procesos y capacidades institucionales; lineamientos de arquitectura empresarial.' },
        { term: 'Salida en la plataforma', desc: 'M3 · Capacidades y mapa estratégico — catálogo de capacidades y mapa estratégico navegable cargados, con nivel actual, nivel objetivo y brecha por capacidad, encadenados a objetivos e indicadores.', strong: true },
      ]},
      { type: 'phase', id: 'FASE 4', name: 'Hoja de ruta e Iniciativa Mínima Viable', when: 'Meses 4–5', defs: [
        { term: 'Objetivo', desc: 'Formular la hoja de ruta institucional de transformación digital y consolidar la Iniciativa Mínima Viable como demostración de valor de corto plazo.' },
        { term: 'Actividades', desc: 'Elaboración del roadmap de implementación con fases, responsables e indicadores; validación técnica y financiera de iniciativas priorizadas; consolidación de la IMV.' },
        { term: 'Entregables', desc: 'Hoja de ruta institucional; plan operativo de la IMV; cronograma tipo Gantt por fases.' },
        { term: 'Salida en la plataforma', desc: 'M5 · Ruta, M6 · Iniciativas y GP · Gestor de proyectos — roadmap por horizontes, portafolio de iniciativas con responsable, presupuesto y factores críticos, y los roadmaps específicos traducidos a planes de trabajo con tareas, fechas y evidencia. La plataforma constituye la Iniciativa Mínima Viable: no es un piloto hipotético, sino un sistema en operación con datos reales desde el mes 1.', strong: true },
      ]},
      { type: 'phase', id: 'FASE 5', name: 'Validación y socialización institucional', when: 'Meses 5–6', defs: [
        { term: 'Objetivo', desc: 'Asegurar la apropiación y validación de los resultados con equipos directivos y misionales.' },
        { term: 'Actividades', desc: 'Talleres de cocreación y validación con directivos y docentes; ajustes finales a la hoja de ruta y a la IMV; presentación ejecutiva final ante Rectoría y Consejo Directivo.' },
        { term: 'Entregables', desc: 'Informe de socialización; ajustes finales validados; presentación ejecutiva final; informe final consolidado de la consultoría.' },
        { term: 'Salida en la plataforma', desc: 'Administración y roles — vista pública de solo lectura para Consejo Directivo, usuarios y permisos por rol transferidos al equipo de la Universidad, y formación en la operación. Inicio del periodo de licencia de 18 meses.', strong: true },
      ]},
      { type: 'box', title: 'Sobre el traslape de fases', body: 'Las fases 1 y 2, y las fases 2 y 3, se traslapan de forma deliberada: el levantamiento de información alimenta simultáneamente el diagnóstico tecnológico y el análisis de posicionamiento, evitando duplicar solicitudes de información a las mismas dependencias de la Universidad.' },
    ],
  },

  /* ── Pág. 11 · El producto ── */
  {
    id: 'plataforma', num: '06', kicker: 'El producto', title: 'Plataforma de Gestión de la Transformación Digital con Enfoque Territorial',
    blocks: [
      { type: 'lede', text: 'El entorno web donde la Universidad Popular del Cesar administra su propia transformación digital: consulta su nivel de madurez en cada línea misional, se compara con el sistema de educación superior y con su territorio —los 25 municipios del Cesar—, navega su mapa estratégico y su hoja de ruta, y hace seguimiento a las iniciativas, los presupuestos y los roadmaps específicos. Cada fase de la consultoría entrega su salida en un módulo: la plataforma se va poblando a medida que el trabajo avanza y queda operando cuando la consultoría termina.' },
      { type: 'h3', text: 'Por qué se incorpora' },
      { type: 'p', text: 'Un diagnóstico de transformación digital tiene vida útil corta. El día que se entrega es exacto; seis meses después la Universidad ya cambió de plataformas, ejecutó iniciativas, contrató personal y modificó procesos, pero el informe sigue describiendo el estado del semestre anterior. El desenlace habitual es conocido: un documento riguroso que se consulta dos veces y luego se archiva, y una hoja de ruta que nadie puede verificar si se está cumpliendo.\n\nLa plataforma resuelve exactamente eso. El diagnóstico queda cargado como una medición fechada y repetible; la hoja de ruta, como iniciativas con responsable, presupuesto y estado. Y la Universidad puede volver a medirse cuando quiera, con el mismo instrumento y la misma escala, para ver cuánto avanzó.' },
      { type: 'table', firstCol: 'key', headers: ['Consultoría convencional', 'Con la plataforma'], rows: [
        ['Informe de diagnóstico en PDF', 'Tablero de madurez navegable y re-medible'],
        ['Hoja de ruta en un anexo', 'Roadmap con responsables, presupuesto y estado'],
        ['Comparación sectorial en una lámina', 'Comparación permanente contra 357 IES y 33 departamentos'],
        ['Indicadores que alguien reconstruye a mano', 'Indicadores con dueño, fuente y periodicidad declarados'],
        ['El proyecto termina cuando se entrega', 'La Universidad sigue midiendo su propio avance'],
      ]},
      { type: 'h3', text: 'El instrumento de medición' },
      { type: 'p', text: 'Las cuatro líneas se evalúan en cuatro dimensiones —organizacional, misional o pedagógica, tecnológica, y de datos e información— sobre una escala común de cinco niveles. La combinación produce dieciséis puntos de medición, cada uno con su puntaje, su responsable de información y su evidencia adjunta.' },
      { type: 'table', firstCol: 'key', headers: ['Nivel', 'Denominación', 'Descriptor'], rows: [
        ['1', 'Inicial', 'Prácticas informales, dependientes de personas; sin registro sistemático.'],
        ['2', 'En desarrollo', 'Prácticas documentadas en algunas unidades; herramientas aisladas, sin integración.'],
        ['3', 'Definido', 'Procesos institucionalizados y estandarizados; responsables asignados; datos capturados con consistencia.'],
        ['4', 'Gestionado', 'Procesos medidos con indicadores; decisiones soportadas en datos; interoperabilidad entre sistemas.'],
        ['5', 'Optimizado', 'Mejora continua sobre evidencia; analítica avanzada; capacidad de escalar y de servir de referente.'],
      ]},
    ],
  },

  /* ── Pág. 12 · Vistas: madurez y comparación ── */
  {
    id: 'vistas-madurez', num: '06', kicker: 'Vistas de la plataforma', title: 'Medición de madurez y comparación sectorial',
    blocks: [
      { type: 'p', text: 'La medición se presenta simultáneamente como radar de las cuatro líneas —con la medición actual, la meta y la medición anterior superpuestas— y como mapa de calor de línea por dimensión, que permite localizar la debilidad con precisión: no basta saber que una línea está en nivel 2, sino en cuál de sus cuatro dimensiones se concentra el rezago.' },
      { type: 'img', url: `${IMG}/fig-m1-madurez.png`, caption: '/panel/madurez/resumen — radar institucional de las cuatro líneas y mapa de calor línea × dimensión.', wide: true },
      { type: 'img', url: `${IMG}/fig-m2-benchmark.png`, caption: '/panel/benchmark — posición frente a pares y cuadrantes de pertinencia territorial: oferta vigente contra índice de demanda.', wide: true },
      { type: 'h3', text: 'Qué permite esta vista' },
      { type: 'cards', cols: 3, items: [
        { title: 'Abrir el detalle', body: 'Cada celda despliega sus variables y cada variable tiene ficha propia: protocolo de indagación, evidencia D·I·K y rúbrica anclada de cinco niveles.' },
        { title: 'Comparar en el tiempo', body: 'El radar superpone la medición anterior, de modo que el avance entre periodos es visible sin necesidad de rehacer el análisis.' },
        { title: 'Sustentar ante terceros', body: 'Los cortes de comparación producen la lámina que un consejo directivo o un par evaluador espera: dónde está la Universidad y frente a quién.' },
      ]},
      { type: 'note', text: 'Vistas ilustrativas de la interfaz. Los valores mostrados no corresponden a mediciones reales de la Universidad: la primera medición se produce en la Fase 0.' },
    ],
  },

  /* ── Pág. 13 · Vistas: territorio ── */
  {
    id: 'vistas-territorio', num: '06', kicker: 'Vistas de la plataforma', title: 'Cobertura y oferta en el territorio',
    blocks: [
      { type: 'p', text: 'La Universidad Popular del Cesar es una institución con presencia y vocación regional: su área de influencia directa cubre los veinticinco municipios del departamento, con realidades muy distintas entre el norte, el centro y el sur. La plataforma incorpora esa dimensión territorial, de modo que las decisiones de oferta y virtualización se tomen contra la geografía real de la demanda y no contra un promedio departamental.' },
      { type: 'img', url: `${IMG}/fig-m3-territorio.png`, caption: '/panel/benchmark/territorio — posición nacional y cobertura municipal: matrícula y oferta en los 25 municipios del Cesar.', wide: true },
      { type: 'h3', text: 'Lectura territorial de la oferta' },
      { type: 'table', firstCol: 'key', headers: ['Subregión', 'Municipios', 'Lectura para la transformación digital'], rows: [
        ['Norte', 'Valledupar, La Paz, Manaure, San Diego, Agustín Codazzi, Pueblo Bello, El Copey, Becerril', 'Concentra la matrícula y la sede principal; la virtualización libera capacidad instalada.'],
        ['Centro', 'Bosconia, El Paso, La Jagua de Ibirico, Astrea, Chiriguaná, Chimichagua, Curumaní, Pailitas', 'Corredor minero-agroindustrial con demanda técnica y tecnológica desatendida.'],
        ['Sur', 'Aguachica, San Alberto, San Martín, Río de Oro, González, Gamarra, La Gloria, Pelaya, Tamalameque', 'Mayor distancia a la sede principal: es donde la modalidad virtual e híbrida más aumenta la cobertura.'],
      ]},
      { type: 'box', title: 'Por qué esto importa para la hoja de ruta', body: 'El módulo territorial cruza la oferta vigente de la Universidad con la demanda potencial por cohortes y los vacíos de programa de cada subregión. El resultado no es un mapa decorativo: es el criterio con el que se decide **qué programa se virtualiza primero y para qué territorio**, y el sustento de esa decisión ante el Consejo Superior o ante una convocatoria de financiación.' },
      { type: 'note', text: 'Mapas construidos sobre la geometría oficial del departamento. Los niveles de cobertura y los tamaños de punto son ilustrativos: se parametrizan con los datos reales de la Universidad en las Fases 0 y 2.' },
    ],
  },

  /* ── Pág. 14 · Módulos ── */
  {
    id: 'modulos', num: '06', kicker: 'Composición', title: 'Los módulos de la plataforma',
    blocks: [
      { type: 'cards', cols: 2, items: [
        { tag: 'M1', title: 'Medición de madurez por línea', body: 'Radar de cuatro ejes con medición actual, meta y medición anterior; mapa de calor de línea × dimensión; detalle por punto de medición con evidencia adjunta, responsable y fecha; historial completo de mediciones.' },
        { tag: 'M2', title: 'Comparación nacional y regional', body: 'Tres cortes: posición frente al universo nacional de instituciones; desempeño del Cesar y su región frente a demanda potencial, vacíos de oferta y pertinencia territorial; y contraste contra pares comparables.' },
        { tag: 'M3', title: 'Capacidades y mapa estratégico', body: 'Catálogo de capacidades con nivel actual, objetivo y brecha; mapa navegable que encadena objetivo institucional → capacidad habilitante → iniciativa → indicador; fichas de fortalecimiento por capacidad.' },
        { tag: 'M4', title: 'Indicadores clave de desempeño', body: 'Ficha por indicador con definición operativa, fórmula, unidad, fuente, responsable, periodicidad, línea base, meta, umbrales de semáforo y serie histórica.' },
        { tag: 'M5', title: 'Mapa de ruta y roadmap', body: 'Ruta hacia el modelo de educación digital con pertinencia contextual, y roadmap operativo por horizontes de corto y mediano plazo, con cronograma tipo Gantt y matriz de impacto × factibilidad.' },
        { tag: 'M6 + GP', title: 'Iniciativas y gestor de proyectos', body: 'Avance frente a lo planeado; presupuesto asignado, comprometido y ejecutado con alerta de desviación; factores críticos en semáforo; y cada roadmap específico traducido a un plan de trabajo con tareas, responsables con nombre propio, fechas, dependencias y evidencia de cierre.' },
        { tag: 'M7', title: 'Módulo de inteligencia de negocio de Algoritmo T', body: 'Acceso a los observatorios de Algoritmo T con asistente de inteligencia artificial: oferta de educación superior a partir de SNIES (27.005 programas de 357 instituciones), mercado laboral y empleabilidad a partir de fuentes OLE, DANE y OIT, y análisis regional sobre los 33 departamentos con modelos de pertinencia territorial y demanda potencial por cohortes. Incluye un espacio de trabajo donde el equipo de la Universidad genera informes propios, exportables en PDF y CSV.' },
      ]},
      { type: 'h3', text: 'Perfiles de uso' },
      { type: 'table', firstCol: 'key', headers: ['Perfil', 'Alcance de uso'], rows: [
        ['Rectoría y Consejo Directivo', 'Vista ejecutiva de consulta: radar institucional, semáforo de indicadores y estado presupuestal del portafolio.'],
        ['Responsables de línea', 'Cargan evidencia, actualizan el avance de sus iniciativas y reportan valores de sus indicadores.'],
        ['Líder institucional', 'Visión completa de las cuatro líneas; administra iniciativas, presupuestos e indicadores.'],
        ['Equipo consultor', 'Configura el instrumento de medición, carga las mediciones y publica los resultados.'],
      ]},
      { type: 'note', text: 'La Universidad podrá generar un enlace público de solo lectura para socializar el estado de la transformación ante Consejo Directivo, entes de control o procesos de acreditación, sin necesidad de crear usuarios adicionales.' },
    ],
  },

  /* ── Pág. 15 · Vistas: indicadores, ruta e iniciativas ── */
  {
    id: 'vistas-kpi', num: '06', kicker: 'Vistas de la plataforma', title: 'Indicadores, ruta y seguimiento de iniciativas',
    blocks: [
      { type: 'img', url: `${IMG}/fig-m4-kpi.png`, caption: '/panel/kpi — batería de indicadores con serie histórica, variación y meta.', wide: true },
      { type: 'img', url: `${IMG}/fig-m5-ruta.png`, caption: '/panel/ruta — roadmap por horizontes y matriz de priorización impacto × factibilidad.', wide: true },
      { type: 'img', url: `${IMG}/fig-m6-iniciativas.png`, caption: '/panel/iniciativas — ejecución presupuestal y factores críticos de éxito en semáforo. Cuando un factor acumula dos revisiones en rojo, la conversación se puede tener a tiempo: es el mecanismo que permite detectar que una iniciativa va a fracasar antes de que fracase.', wide: true },
      { type: 'cards', cols: 3, items: [
        { title: 'Del indicador al responsable', body: 'Cada KPI declara quién produce el dato y con qué periodicidad: deja de ser una cifra que se reconstruye a mano y pasa a ser una responsabilidad asignada.' },
        { title: 'De la ruta a la decisión', body: 'La matriz de impacto por factibilidad es el insumo con el que se sustenta ante el Consejo qué se ejecuta primero y por qué.' },
        { title: 'Del avance a la madurez', body: 'La ejecución registrada alimenta la siguiente medición: ejecutar iniciativas es lo que hace subir el nivel, y aquí queda demostrado con datos.' },
      ]},
      { type: 'note', text: 'Vistas ilustrativas de la interfaz. Las iniciativas, montos y estados corresponden a un ejemplo de configuración y no a datos de la Universidad.' },
    ],
  },

  /* ── Pág. 16 · Vistas: gestor de proyectos ── */
  {
    id: 'vistas-gp', num: '06', kicker: 'Vistas de la plataforma', title: 'Gestor de proyectos: del roadmap a las tareas',
    blocks: [
      { type: 'p', text: 'Cada iniciativa de la hoja de ruta se administra como un plan de trabajo con ruta propia. Las tareas tienen descripción, responsable principal y corresponsables, fechas contra línea base, dependencias y estado — y ninguna tarea puede declararse hecha sin al menos una evidencia adjunta.' },
      { type: 'img', url: `${IMG}/fig-m7-gp-plan.png`, caption: '/panel/proyectos/INI-01 — plan de trabajo con responsables, fechas, estados y evidencia por tarea.', wide: true },
      { type: 'img', url: `${IMG}/fig-m8-gp-gantt.png`, caption: '/panel/proyectos/INI-01 · cronograma — dependencias y reprogramación en cascada contra la línea base congelada.', wide: true },
      { type: 'cards', cols: 3, items: [
        { title: 'Responsabilidad con nombre propio', body: 'Cada tarea tiene un responsable principal y corresponsables. La carga de trabajo por persona es visible, y las notificaciones internas avisan vencimientos y cambios.' },
        { title: 'Avance demostrable', body: 'Cerrar una tarea exige adjuntar evidencia. El porcentaje de avance de la iniciativa que ve el directivo se sostiene en entregables verificables, no en autorreporte.' },
        { title: 'Trazabilidad completa', body: 'Del nivel de madurez a la brecha, de la brecha a la iniciativa, de la iniciativa a la tarea y de la tarea a su evidencia: una sola cadena navegable de extremo a extremo.' },
      ]},
      { type: 'note', text: 'Vistas ilustrativas de la interfaz. Tareas, responsables y fechas corresponden a un ejemplo de configuración y no a datos de la Universidad.' },
    ],
  },

  /* ── Pág. 17 · Licencia ── */
  {
    id: 'licencia', num: '06', kicker: 'Vigencia y condiciones', title: 'Licencia, soporte y continuidad',
    blocks: [
      { type: 'h3', text: 'Periodo de acceso' },
      { type: 'p', text: 'La Universidad Popular del Cesar dispondrá de acceso a la Plataforma de Gestión de la Transformación Digital durante los seis (6) meses de ejecución del contrato y durante dieciocho (18) meses adicionales contados a partir de la entrega final de la Fase 5, para un periodo efectivo de uso de veinticuatro (24) meses.' },
      { type: 'h3', text: 'Qué comprende la licencia' },
      { type: 'list', items: [
        'Uso ilimitado por usuarios de la Universidad dentro de los perfiles definidos, sin cargo por usuario adicional.',
        'Alojamiento, operación y respaldo de la plataforma y de la información institucional cargada.',
        'Actualizaciones funcionales que Algoritmo T libere sobre el producto durante el periodo licenciado, sin costo adicional.',
        'Soporte funcional para el equipo administrador de la Universidad durante el periodo licenciado.',
        'Acceso a los observatorios y a sus actualizaciones de datos durante el periodo licenciado.',
      ]},
      { type: 'h3', text: 'Portabilidad de la información' },
      { type: 'p', text: 'La Universidad podrá exportar en cualquier momento, y en formatos abiertos y estándar, la totalidad de la información institucional cargada: mediciones, evidencias, capacidades, indicadores, iniciativas y ejecución presupuestal. Esta condición aplica también al vencimiento del periodo licenciado, de modo que la Universidad conserva su información con independencia de la continuidad del servicio.' },
      { type: 'h3', text: 'Continuidad al vencimiento' },
      { type: 'p', text: 'Al término de los dieciocho meses, la Universidad podrá renovar la licencia como suscripción institucional de tarifa plana —usuarios ilimitados dentro de los perfiles definidos, sin cobro por usuario ni por consumo—, por periodos anuales de $ 80.000.000 COP por año (valor 2026, ajustable anualmente por IPC como único mecanismo de incremento), con los mismos servicios del periodo inicial: alojamiento, operación, respaldo, actualizaciones, soporte y observatorios. La no renovación no afecta la propiedad de la Universidad sobre su información ni su derecho a exportarla, conforme al párrafo anterior y al anexo de propiedad intelectual.' },
      { type: 'box', title: 'Puesta en marcha', body: 'La plataforma es un módulo del Ecosistema Digital de Algoritmo T, infraestructura ya en operación. Sus componentes de observatorios y de seguimiento de iniciativas están construidos y en uso, lo que reduce la puesta en marcha a semanas y permite que el componente comparativo esté disponible con datos desde el primer día, sin requerir aportes de información por parte de la Universidad.' },
    ],
  },

  /* ── Pág. 18 · Equipo ── */
  {
    id: 'equipo', num: '07', kicker: 'Talento', title: 'Equipo consultor',
    blocks: [
      { type: 'lede', text: 'La ejecución estará a cargo de un equipo multidisciplinario conformado por profesionales con amplia experiencia en transformación digital, gobierno de datos, ciencia, tecnología e innovación, educación superior y gestión institucional.' },
      { type: 'team', items: [
        { role: 'Consultor líder / Director de proyecto', dedication: 'Fases 0 y 5', functions: ['Dirigir el levantamiento de información, coordinar el equipo consultor, consolidar la línea base institucional y validar el enfoque metodológico con la alta dirección.', 'Liderar la validación final de entregables, coordinar los talleres con los equipos de la Universidad y asegurar la coherencia técnica y metodológica de los resultados.'] },
        { role: 'Arquitecto empresarial y especialista TIC', dedication: 'Fases 1 y 3', functions: ['Mapear procesos, sistemas y plataformas institucionales; identificar tecnologías en uso, obsolescencia y oportunidades de mejora; elaborar el inventario TIC.', 'Diseñar la arquitectura institucional bajo TOGAF® 10, definir la estructura de gobernanza, los procesos clave y los lineamientos de interoperabilidad.'] },
        { role: 'Analista de datos', dedication: 'Fases 1 y 2', functions: ['Sistematizar la información levantada, desarrollar los tableros de control y representar gráficamente los niveles de madurez y las brechas institucionales.', 'Parametrizar y cargar la información en la plataforma.'] },
        { role: 'Consultores académico, CTeI y extensión', dedication: 'Fases 2 y 3', functions: ['Analizar la cadena de valor de la investigación y la visibilidad científica; identificar brechas y oportunidades frente a los estándares de rankings.', 'Analizar la oferta académica, proponer lineamientos para el ciclo de vida de programas y apoyar la construcción del Modelo de Universidad Digital.'] },
        { role: 'Especialista TIC / Tecnologías educativas', dedication: 'Fase 4', functions: ['Definir la arquitectura tecnológica, planificar la ejecución de la Iniciativa Mínima Viable y priorizar los proyectos de modernización con impacto en el corto plazo.'] },
        { role: 'Especialista de plataforma', dedication: 'Fases 0 a 5', functions: ['Implementar y parametrizar la Plataforma de Gestión de la Transformación Digital, configurar perfiles y permisos, asegurar la carga de los productos de cada fase y ejecutar la formación y transferencia al equipo administrador de la Universidad.'] },
      ]},
      { type: 'box', title: 'Interlocución con la Universidad', body: 'El equipo consultor trabajará de manera articulada con el responsable institucional designado por la UPC y con los responsables de cada una de las cuatro líneas, quienes serán los usuarios permanentes de la plataforma una vez concluida la consultoría.' },
    ],
  },

  /* ── Pág. 19 · Inversión ── */
  {
    id: 'inversion', num: '08', kicker: 'Propuesta económica', title: 'Inversión',
    blocks: [
      { type: 'invoice', note: 'Valores expresados en pesos colombianos. Duración: seis (6) meses calendario de ejecución, más dieciocho (18) meses de licencia de uso contados desde la entrega final. Renovación anual de la licencia al vencimiento: $ 80.000.000 COP por año, bajo el régimen de la licencia (SaaS excluido de IVA).' },
      { type: 'box', title: 'Concepto técnico — liquidación del IVA', body: 'En aplicación del principio de independencia de los servicios (DIAN, Oficio 001444 de 2017), cada concepto conserva su naturaleza tributaria: la licencia de uso —servicio de computación en la nube (SaaS)— está excluida de IVA conforme al numeral 21 del artículo 476 del Estatuto Tributario, mientras que los servicios de implementación, consultoría, formación y transferencia no cumplen las características intrínsecas del cloud computing y se gravan de forma independiente a la tarifa general del 19 %. Por ello el IVA se liquida únicamente sobre los conceptos gravados ($ 580.000.000).' },
      { type: 'h3', text: 'Correspondencia con conceptos de gasto' },
      { type: 'p', text: 'Para efectos de imputación presupuestal, los conceptos se corresponden con estos rubros:' },
      { type: 'table', firstCol: 'key', headers: ['Concepto de la propuesta', 'Concepto de gasto', 'Unidad de medida'], rows: [
        ['Implementación de la plataforma', 'Recursos tecnológicos', '1 plataforma'],
        ['Licencia de uso — 18 meses', 'Recursos tecnológicos', '1 suscripción'],
        ['Renovación anual de la suscripción', 'Recursos tecnológicos', '1 suscripción / año'],
        ['Levantamiento, diagnóstico y acompañamiento', 'Talento humano / soporte especializado', 'N.º de profesionales'],
      ]},
      { type: 'note', text: 'La correspondencia definitiva se ajustará conforme a la estructura presupuestal que defina la Universidad.' },
    ],
  },

  /* ── Pág. 20 · Términos comerciales ── */
  {
    id: 'terminos', num: '09', kicker: 'Condiciones', title: 'Términos comerciales',
    blocks: [
      { type: 'h3', text: 'Forma de pago' },
      { type: 'payments', items: [
        { pct: '30 %', label: 'Anticipo. A la suscripción del contrato.' },
        { pct: '30 %', label: 'Contra entrega y aceptación del Informe comparativo de rankings y del tablero de línea base de indicadores — cierre de la Fase 2.' },
        { pct: '40 %', label: 'Contra entrega y aceptación del informe final consolidado y de la plataforma en operación con la transferencia realizada — cierre de la Fase 5.' },
      ]},
      { type: 'note', text: 'Los hitos de pago se asocian a entregables verificables y no a la denominación de las fases, de modo que no exista ambigüedad sobre el momento de facturación.' },
      { type: 'p', text: 'Una vez emitidas y radicadas las correspondientes facturas, estas deberán ser pagadas en un plazo no mayor a quince (15) días calendario. En caso de mora se causarán intereses del 1,5 % mensual con posterioridad al plazo.' },
      { type: 'h3', text: 'Impuestos y régimen tributario' },
      { type: 'list', items: [
        'El objeto contractual —la implementación y el licenciamiento de la Plataforma bajo el modelo de computación en la nube (SaaS)— se encuentra, por regla general, excluido de IVA conforme al numeral 21 del artículo 476 del Estatuto Tributario. Se contrata y factura conforme al principio de independencia de los servicios; el sustento doctrinal se desarrolla en el concepto técnico del capítulo 08.',
        'El valor propuesto no incluye impuestos adicionales como estampillas o tributos territoriales. En caso de que apliquen por tratarse de contratación con una universidad pública, dichos valores deberán ser asumidos directamente por la entidad contratante o calculados de manera independiente al valor de la propuesta.',
      ]},
      { type: 'h3', text: 'Medio de pago' },
      { type: 'table', firstCol: 'key', rows: [
        ['Banco', 'Banco Caja Social'],
        ['Tipo de cuenta', 'Ahorros'],
        ['Número de cuenta', '2410491798'],
        ['Titular', 'Algoritmo T S.A.S.'],
        ['NIT', '901.449.696-2'],
      ]},
      { type: 'h3', text: 'Confidencialidad' },
      { type: 'p', text: 'Esta propuesta ha sido elaborada exclusivamente para la Universidad Popular del Cesar. Toda la información contenida en este documento, sus anexos y las reuniones sostenidas en el marco del proceso será considerada confidencial entre las partes.' },
      { type: 'h3', text: 'Validez de la propuesta' },
      { type: 'p', text: 'Se mantendrán el valor y los términos de esta propuesta durante treinta (30) días calendario contados a partir de la fecha de su envío.' },
    ],
  },

  /* ── Pág. 21 · Anexos ── */
  {
    id: 'anexos', num: '10', kicker: 'Anexos', title: 'Confidencialidad y propiedad intelectual',
    blocks: [
      { type: 'h3', text: 'Confidencialidad' },
      { type: 'p', text: 'La información que Algoritmo T S.A.S. obtenga, acceda o reciba de la Universidad Popular del Cesar en el marco de la presente consultoría —sea en forma oral, escrita, electrónica o por cualquier otro medio— será considerada información confidencial y se utilizará exclusivamente para el desarrollo de los servicios contratados. Dicha información no será divulgada a terceros sin la autorización expresa y por escrito de la Universidad, salvo en los siguientes casos:' },
      { type: 'list', items: [
        'Cuando sea exigida por autoridad judicial, administrativa o regulatoria competente.',
        'Cuando sea compartida con aliados estratégicos o consultores vinculados al proyecto, en la medida en que sea estrictamente necesario para la adecuada prestación del servicio.',
      ]},
      { type: 'p', text: 'Algoritmo T se compromete a aplicar las medidas técnicas, administrativas y organizacionales necesarias para proteger la información confidencial, conforme a lo establecido en la Ley 1581 de 2012 y el Decreto 1377 de 2013 sobre protección de datos personales.' },
      { type: 'h3', text: 'Propiedad intelectual' },
      { type: 'p', text: 'Para efectos del presente contrato se distinguen dos categorías de bienes:' },
      { type: 'cards', cols: 2, items: [
        { tag: 'Universidad Popular del Cesar', title: 'Productos y contenido institucional', body: 'Informes, diagnósticos, modelos, hojas de ruta, tableros y demás productos derivados de la consultoría, así como la totalidad de la información institucional cargada en la plataforma: mediciones, evidencias, capacidades, indicadores, iniciativas y ejecución presupuestal.', foot: 'Propiedad de la Universidad, para su uso institucional, sin restricción de tiempo ni de reproducción interna, y exportables en formatos abiertos en cualquier momento.' },
        { tag: 'Algoritmo T S.A.S.', title: 'Plataforma y know-how metodológico', body: 'El software de la Plataforma de Gestión de la Transformación Digital, su código fuente, el modelo e instrumento de medición de madurez, los observatorios y sus componentes analíticos, y las metodologías, herramientas, plantillas y procedimientos técnicos empleados.', foot: 'Propiedad de Algoritmo T S.A.S., entregados a la Universidad bajo licencia de uso durante el periodo pactado. Constituyen parte de su know-how y propiedad intelectual empresarial.' },
      ]},
      { type: 'p', text: 'Se prohíbe la reproducción, distribución, modificación, descompilación o cesión a terceros de la plataforma y de los contenidos metodológicos presentados en esta propuesta o en los entregables, sin autorización previa y por escrito de un representante legal autorizado de Algoritmo T S.A.S.\n\nLa distinción anterior no limita en modo alguno el derecho de la Universidad a usar, reproducir internamente, publicar y explotar los productos de la consultoría y su propia información institucional, incluso con posterioridad al vencimiento del periodo licenciado.' },
    ],
  },

  /* ── Pág. 22 · Anexo técnico ── */
  {
    id: 'metodologia-algoritmo', num: '11', kicker: 'Anexo técnico', title: 'La metodología Algoritmo T',
    blocks: [
      { type: 'lede', text: 'Marco propio de medición y gestión de la transformación digital con enfoque territorial, desarrollado por Algoritmo T y operacionalizado en la plataforma: define qué se mide, con qué evidencia se soporta cada calificación y cómo el resultado se convierte en ejecución gobernable.' },
      { type: 'h3', text: '1 · El instrumento de medición' },
      { type: 'p', text: 'La madurez se evalúa sobre una matriz de cuatro líneas misionales × cuatro dimensiones —organizacional, pedagógica, comunicativa y tecnológica—, que produce 16 puntos de medición desagregados en 52 variables. Cada variable cuenta con un protocolo de indagación: los ítems que se preguntan y a quién se aplican, la evidencia que se solicita y una rúbrica anclada de cinco niveles.' },
      { type: 'table', firstCol: 'key', headers: ['Componente', 'Definición operativa'], rows: [
        ['Escala 1–5', 'Niveles Inicial · Gestionado · Definido · Medido · Optimizado, con anclajes observables por variable: la calificación se asigna contra descriptores verificables, no contra juicio libre.'],
        ['Evidencia D · I · K', 'Tres vías de soporte — Documental (D), Indagación mediante entrevistas e instrumentos (I) y Constatación directa en sistemas (K) — cada una con criterios de aceptación explícitos.'],
        ['Doble lectura', 'Los responsables de línea reportan su percepción; el equipo consultor califica contra la evidencia. La brecha entre ambas lecturas es, en sí misma, un hallazgo del diagnóstico.'],
        ['Consolidación', 'Cada punto de medición es el promedio de sus variables. Publicar una medición exige las 52 variables calificadas y queda versionada con fecha, lo que hace el ejercicio repetible y comparable en el tiempo.'],
      ]},
      { type: 'h3', text: '2 · De la medición a la ejecución' },
      { type: 'p', text: 'El diagnóstico encadena sin traducciones intermedias: capacidades con nivel actual, nivel objetivo y brecha → iniciativas priorizadas por impacto y factibilidad → indicadores con línea base, meta y serie histórica → planes de trabajo con tareas, responsables, dependencias y evidencia de cierre. Toda actividad terminada exige al menos una evidencia adjunta: el avance que reporta la plataforma es avance demostrable.' },
      { type: 'h3', text: '3 · Enfoque territorial' },
      { type: 'p', text: 'La institución no se mide en el vacío: la metodología incorpora la comparación permanente contra el sistema nacional de educación superior y la lectura de cobertura y oferta en los 25 municipios del Cesar, de modo que la priorización de iniciativas responda al territorio que la Universidad sirve.' },
      { type: 'h3', text: '4 · Régimen tributario del servicio' },
      { type: 'p', text: 'La liquidación aplica el principio de independencia de los servicios (DIAN, Oficio 001444 de 2017): cada componente conserva su naturaleza tributaria. La licencia de uso cumple las cinco características que la DIAN exige del cloud computing (Concepto Unificado 017056 de 2017) —autoservicio bajo demanda, acceso amplio por red, multitenencia, elasticidad y servicio medido— y Algoritmo T S.A.S. la presta como proveedor directo que gestiona la infraestructura (Concepto 190 de 2024), por lo que está excluida de IVA (art. 476, num. 21, E.T.). Los servicios de implementación, consultoría, formación y transferencia, al requerir intervención humana especializada, no cumplen esas características y se gravan de forma independiente al 19 %.' },
      { type: 'box', title: 'Referentes', body: 'El marco se alinea con TOGAF® 10 en arquitectura empresarial, DAMA-DMBOK en gobierno de datos, los lineamientos de Gobierno Digital de MinTIC y referentes internacionales de madurez digital en educación superior. La metodología, el instrumento y sus protocolos hacen parte del know-how de Algoritmo T S.A.S. (ver capítulo 10).' },
    ],
  },
]

/* ══ Aplicar: conserva el resto del contenido y agrega las páginas ══ */
const quote = await db.quote.findUnique({ where: { id: QUOTE_ID }, select: { id: true, publicId: true, content: true } })
if (!quote) throw new Error(`No existe la cotización ${QUOTE_ID}`)

const content = { ...(quote.content as any), pages }
await db.quote.update({ where: { id: quote.id }, data: { content } })

const blocks = pages.reduce((n, p) => n + p.blocks.length, 0)
console.log(`OK · /c/${quote.publicId} · ${pages.length} páginas · ${blocks} bloques`)
await db.$disconnect()
