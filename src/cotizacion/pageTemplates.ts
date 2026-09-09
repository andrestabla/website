/**
 * Banco de páginas plantilla del Cotizador.
 *
 * Páginas A4 completas, con contenido demo construido sobre las propuestas
 * reales de Algoritmo T (Unicafam, Gestionna, UPC, USCO, La Salle…). Se
 * insertan enteras y sirven tal cual o editándolas; el consultor cambia los
 * nombres y las cifras y la IA las adapta al cliente. No se crean en vivo:
 * es un banco cerrado, agrupado por momento de la propuesta.
 *
 * Marcas de texto: **negrita**, *cursiva*, viñetas con «- », párrafos con
 * línea en blanco. Cada página cabe en una hoja A4 del visor.
 */
import type { Page, Block } from '../cotizador/PagesEditor'

export type PageTemplate = {
  id: string
  category: string
  label: string
  /** Para qué sirve y cuándo va, en una frase. */
  description: string
  make: (n: number) => Page
}

const num = (n: number) => String(n).padStart(2, '0')
const p = (text: string): Block => ({ type: 'p', text })
const lede = (text: string): Block => ({ type: 'lede', text })
const h3 = (text: string): Block => ({ type: 'h3', text })
const note = (text: string): Block => ({ type: 'note', text })
const box = (title: string, body: string): Block => ({ type: 'box', title, body })
const list = (items: string[], marker?: 'number' | 'check'): Block => ({ type: 'list', items, ...(marker ? { marker } : {}) })
const table = (headers: string[], rows: string[][], tableStyle?: string): Block => ({ type: 'table', headers, rows, firstCol: 'key', ...(tableStyle ? { tableStyle } : {}) })
const cards = (items: Array<{ tag?: string; title: string; body: string; foot?: string }>, cols: 2 | 3 = 2): Block => ({ type: 'cards', cols, items })
const phase = (id: string, name: string, when: string, defs: Array<[string, string]>): Block => ({ type: 'phase', id, name, when, defs: defs.map(([term, desc]) => ({ term, desc })) })
const icon = (name: string, label: string, color: 'navy' | 'cyan' | 'gold' | 'muted' = 'cyan'): Block => ({ type: 'icon', name, size: 32, color, label })
const grid = (cols: number, cells: Block[][]): Block => ({ type: 'grid', cols, cells })
const button = (label: string, url: string, align: 'left' | 'center' = 'center'): Block => ({ type: 'button', label, url, style: 'primary', align })

const page = (id: string, n: number, kicker: string, title: string, blocks: Block[], extra: Partial<Page> = {}): Page => ({ id: `${id}-${n}`, num: num(n), kicker, title, blocks, ...extra })

export const PAGE_TEMPLATE_CATEGORIES = ['Apertura', 'Diagnóstico', 'Método', 'Plan', 'Inversión', 'Condiciones', 'Cierre', 'Anexos'] as const

export const PAGE_TEMPLATES: PageTemplate[] = [
  // ── Apertura ──────────────────────────────────────────────────────────────
  {
    id: 'indice', category: 'Apertura', label: 'Tabla de contenido',
    description: 'Índice automático con las páginas del documento y una caja con lo que recibe el cliente al cierre.',
    make: () => ({ id: 'indice', num: '—', kicker: 'Índice', title: 'Tabla de contenido', blocks: [
      { type: 'toc', note: '' },
      box('Qué recibe la institución al cierre', 'La solución en producción con sus módulos operando · el equipo formado para usarla por su cuenta · la documentación técnica y funcional · doce meses de soporte con respuesta en el día hábil siguiente.'),
    ] }),
  },
  {
    id: 'carta', category: 'Apertura', label: 'Carta de presentación',
    description: 'Encabezado formal y cuatro párrafos: contexto, qué proponemos, cómo se lee el documento y cierre cordial.',
    make: (n) => page('carta', n, 'Presentación', 'Objeto de la propuesta', [
      { type: 'letterhead', date: 'Bogotá D. C., [día] de [mes] de 2026', addressee: 'Señores\n[Nombre de la institución]\n[Cargo del destinatario]\n[Ciudad]', subject: 'Propuesta técnica y económica · [nombre del servicio]', salutation: 'Reciban un cordial saludo,' },
      p('Durante los últimos meses hemos conversado con su equipo sobre [el reto que motiva esta propuesta]. Conocimos cómo opera hoy, quién toma cada decisión y qué información falta cuando hay que tomarla. Esta propuesta recoge esa conversación y la convierte en un plan de trabajo con alcance, tiempos e inversión definidos.'),
      p('Proponemos [nombre del servicio]: **[qué es en una frase]**. El trabajo parte de lo que la institución ya tiene en operación y agrega lo que hace falta para que [el resultado esperado] ocurra sin depender de procesos manuales.'),
      p('El documento presenta primero el punto de partida, luego el método por fases con sus entregables, el cronograma, el equipo, la inversión y las condiciones del servicio. Cada fase cierra con una aprobación escrita, de manera que la institución sigue el avance contra entregas verificables.'),
      p('Quedamos atentos a sus comentarios y agradecemos la confianza depositada en Algoritmo T a lo largo de este proceso.'),
    ]),
  },
  {
    id: 'resumen', category: 'Apertura', label: 'Resumen ejecutivo',
    description: 'Una página para quien decide: el reto, la propuesta en tres tarjetas y las cifras clave.',
    make: (n) => page('resumen', n, 'Resumen ejecutivo', 'La propuesta en una página', [
      lede('La institución necesita [resultado concreto] y hoy lo resuelve con procesos manuales que llegan tarde. Proponemos construir [la solución] en [N] semanas, con el equipo formado para operarla y doce meses de soporte.'),
      cards([
        { tag: 'Qué', title: 'Lo que se construye', body: '[Solución] en producción, con [N] módulos operando sobre la plataforma institucional y permisos por rol.' },
        { tag: 'Cómo', title: 'Cómo se hace', body: 'Cuatro fases encadenadas: definición, construcción, apropiación y soporte. Una aprobación escrita al cierre de cada una.' },
        { tag: 'Cuándo', title: 'En cuánto tiempo', body: '[N] semanas de implementación y dos de apropiación. El equipo lee cifras reales desde la tercera semana.' },
      ], 3),
      grid(3, [
        [icon('banknote', 'Inversión · $ [valor] + IVA', 'gold')],
        [icon('calendar-clock', '[N] semanas desde el kickoff', 'cyan')],
        [icon('shield-check', '12 meses de soporte incluidos', 'navy')],
      ]),
      box('Por qué ahora', 'Cada semestre que pasa sin [la solución] repite el mismo costo: días de trabajo manual, decisiones sin datos y estudiantes que se pierden antes de que alguien lo note.'),
    ]),
  },
  {
    id: 'objeto', category: 'Apertura', label: 'Objeto y alcance general',
    description: 'Qué se contrata, qué queda dentro y qué queda fuera, en lenguaje contractual claro.',
    make: (n) => page('objeto', n, 'Objeto', 'Qué se contrata', [
      p('El objeto de esta propuesta es **[el servicio]** para **[la institución]**, con el alcance, los entregables y las condiciones que se describen en las páginas siguientes.'),
      h3('Dentro del alcance'),
      list(['Diagnóstico del punto de partida y definición de indicadores con la dirección.', 'Diseño, construcción y puesta en producción de [la solución] sobre la plataforma institucional.', 'Formación del equipo y acompañamiento en la primera lectura conjunta de resultados.', 'Soporte durante doce meses con respuesta en el día hábil siguiente.'], 'check'),
      h3('Fuera del alcance'),
      list(['Producción de contenidos, facilitación de sesiones y curaduría editorial, que corren por cuenta del equipo de la institución.', 'Licencias de terceros no incluidas en la tabla de inversión.', 'Desarrollos posteriores al cierre del catálogo aprobado en la fase 1, que se gestionan como orden de cambio.']),
      note('El alcance detallado por fase, con sus entregables y criterios de aprobación, está en las páginas de método y de plan de pagos.'),
    ]),
  },

  // ── Diagnóstico ──────────────────────────────────────────────────────────
  {
    id: 'reto', category: 'Diagnóstico', label: 'Contexto y lectura del reto',
    description: 'Entradilla, tres frentes del reto en tarjetas y una caja con por qué a la medida.',
    make: (n) => page('reto', n, 'Diagnóstico', 'Lectura del reto', [
      lede('La institución ya cuenta con [lo que tiene en operación]. Desde el primer día esos sistemas generan registros; y con los registros aparecen las preguntas de quienes acompañan la operación: quién se está quedando atrás, qué frena al grupo y dónde intervenir primero.'),
      cards([
        { tag: 'Frente 01', title: 'Información dispersa', body: 'Los datos existen en tres sistemas que no se hablan. Cruzarlos toma días de exportaciones a hojas de cálculo y llega tarde para decidir.', foot: 'Necesita: una sola vista con los filtros ya aplicados' },
        { tag: 'Frente 02', title: 'Decisiones sin evidencia', body: 'Las reuniones de seguimiento trabajan con percepciones. Sin cifras comparables, cada área defiende su lectura del problema.', foot: 'Necesita: indicadores acordados con la dirección' },
        { tag: 'Frente 03', title: 'Dependencia de personas clave', body: 'El conocimiento del proceso vive en dos personas. Si una falta, el reporte no sale y nadie más sabe reconstruirlo.', foot: 'Necesita: proceso documentado y automatizado' },
      ], 3),
      box('Por qué a la medida', 'Una herramienta genérica mide lo que trae de fábrica. Esta propuesta parte de las decisiones que la institución toma cada mes y construye hacia atrás: primero los indicadores, después la herramienta que los muestra.'),
    ]),
  },
  {
    id: 'punto-partida', category: 'Diagnóstico', label: 'Punto de partida con tabla',
    description: 'Qué pregunta de gestión responde cada dato que ya existe: una tabla de tres columnas.',
    make: (n) => page('punto-partida', n, 'Punto de partida', 'Lo que ya existe y lo que falta', [
      lede('La materia prima ya está. Lo que hoy toma días de exportaciones y cruces manuales puede organizarse en una pantalla disponible para cada perfil.'),
      p('La siguiente tabla relaciona cada pregunta de gestión con el dato que la institución ya registra y con la vista que permite responderla.'),
      table(['Pregunta de gestión', 'Dato que ya existe', 'Cómo se responde'], [
        ['¿Quién se está quedando atrás esta semana?', 'Registro de actividad por sesión', 'Vista de permanencia y riesgo, con la regla de horas y días activos que la institución defina.'],
        ['¿Qué actividad frena al grupo completo?', 'Finalización por actividad y calificaciones', 'Detalle del curso con la actividad de menor avance y su fecha de vencimiento.'],
        ['¿Qué programa necesita intervención primero?', 'Matrícula, progreso y certificación', 'Vista de dirección con la comparación entre programas mes a mes.'],
        ['¿El acompañamiento está funcionando?', 'Mensajes enviados y reactivaciones', 'Indicador de reactivación tras mensaje, por curso y por docente.'],
      ], 'striped'),
      note('Fuente: sistemas en operación de la institución, verificados en la sesión de levantamiento del [fecha].'),
    ]),
  },
  {
    id: 'objetivos', category: 'Diagnóstico', label: 'Objetivos',
    description: 'Objetivo general, objetivos específicos numerados y los tres resultados esperados con ícono.',
    make: (n) => page('objetivos', n, 'Objetivos', 'Qué buscamos lograr', [
      h3('Objetivo general'),
      p('Poner en operación [la solución] para que la institución tome decisiones sobre [permanencia, calidad y desempeño] con información oportuna, comparable y disponible para cada perfil.'),
      h3('Objetivos específicos'),
      list([
        'Definir con la dirección el catálogo de indicadores que orienta las decisiones mensuales.',
        'Construir [la solución] sobre la plataforma institucional, con permisos por rol y sin dependencias externas.',
        'Formar al equipo para que lea, interprete y actúe sobre los resultados por su cuenta.',
        'Sostener la operación durante doce meses con soporte, seguimiento y evolución del catálogo.',
      ], 'number'),
      grid(3, [
        [icon('target', 'Decisiones con evidencia', 'navy')],
        [icon('users', 'Equipo autónomo', 'cyan')],
        [icon('trending-up', 'Mejora sostenida', 'gold')],
      ]),
    ]),
  },
  {
    id: 'alcance-entregables', category: 'Diagnóstico', label: 'Alcance y entregables',
    description: 'Tabla de entregables por fase con su criterio de aceptación.',
    make: (n) => page('alcance', n, 'Alcance', 'Entregables y criterios de aceptación', [
      lede('Cada fase produce entregables verificables. La institución los recibe con tres días hábiles de anticipación a la sesión de cierre y firma el acta de aprobación una vez revisados.'),
      table(['Fase', 'Entregable', 'Criterio de aceptación'], [
        ['1 · Definición', 'Catálogo de indicadores y línea base', 'Aprobado por la dirección académica en acta de comité.'],
        ['2 · Construcción', '[Solución] en producción con [N] módulos', 'Instalada en el servidor institucional, con permisos por rol comprobados.'],
        ['3 · Apropiación', 'Sesiones de formación y guía de uso', 'Cada perfil abre su vista y responde las preguntas de gestión con datos propios.'],
        ['4 · Soporte', 'Bitácora de atención y revisión semestral', 'Respuesta en el día hábil siguiente y catálogo revisado al cierre del semestre.'],
      ]),
      box('Criterio de alcance', 'Lo construido responde al catálogo aprobado en la fase 1. Todo indicador adicional se documenta con su fórmula y se gestiona como orden de cambio, con su propia valoración.'),
    ]),
  },

  // ── Método ───────────────────────────────────────────────────────────────
  {
    id: 'metodo-4-fases', category: 'Método', label: 'Método en cuatro fases',
    description: 'Entradilla, cuatro fases con objetivo, actividades y entregables, y una caja de cierre.',
    make: (n) => page('metodo', n, 'Método', 'Cómo lo hacemos', [
      lede('Cuatro fases encadenadas: la definición da forma a lo que se construye, la construcción entrega la herramienta, la apropiación instala su uso y el soporte lo mantiene vigente.'),
      phase('Fase 01', 'Definición', 'Semanas 1 y 2', [['Objetivo', 'Acordar con la dirección qué decisiones se toman y qué indicador las cambia.'], ['Actividades', 'Taller de definición, taller de validación, contraste con la plataforma.'], ['Entregables', 'Catálogo de indicadores aprobado y línea base del periodo.']]),
      phase('Fase 02', 'Construcción', 'Semanas 3 a 6', [['Objetivo', 'Poner [la solución] en producción sobre la plataforma institucional.'], ['Actividades', 'Desarrollo, pruebas con datos reales, permisos por rol, documentación.'], ['Entregables', '[Solución] operando con [N] módulos y manual técnico.']]),
      phase('Fase 03', 'Apropiación', 'Semanas 7 y 8', [['Objetivo', 'Que el equipo lea y use los resultados por su cuenta.'], ['Actividades', 'Dos sesiones por perfil con datos propios y primera lectura conjunta.'], ['Entregables', 'Guía de uso por perfil y acta de cierre.']]),
      phase('Fase 04', 'Soporte y evolución', '12 meses', [['Objetivo', 'Sostener la operación y ajustar lo entregado.'], ['Actividades', 'Atención en el día hábil siguiente, revisión semestral, ventanas de actualización.'], ['Entregables', 'Bitácora de atención y catálogo revisado.']]),
      box('Cerramos cuando', 'El equipo de la institución abre la herramienta un lunes cualquiera y sabe qué hacer con lo que ve.'),
    ]),
  },
  {
    id: 'metodo-transformacion', category: 'Método', label: 'Transformación digital · seis fases',
    description: 'El método MD-IA de Algoritmo T para empresas: del ADN digital a la madurez orgánica.',
    make: (n) => page('transformacion', n, 'Método MD-IA', 'Seis fases de la transformación', [
      lede('El método de Algoritmo T combina madurez digital e inteligencia artificial. Cada fase entrega su salida en un módulo de la plataforma de gestión, de manera que el diagnóstico queda como una medición repetible y la hoja de ruta como iniciativas con responsable y presupuesto.'),
      cards([
        { tag: 'Fase 1', title: 'Captura del ADN Digital', body: 'Diagnóstico de madurez con los marcos DQ y AIQ de McKinsey, contrastados con Capgemini y Deloitte. Índice de 0 a 100 por dimensión.' },
        { tag: 'Fase 2', title: 'Mapeo de procesos', body: 'Procesos misionales y de apoyo modelados en BPMN 2.x, con tiempos de ciclo, reprocesos y puntos de decisión.' },
        { tag: 'Fase 3', title: 'Decisión Humano vs Tecnología', body: 'Qué actividad automatizar, cuál asistir con IA y cuál conservar en manos de personas. Matriz de valor y esfuerzo.' },
        { tag: 'Fase 4', title: 'Ingeniería Humana', body: 'Roles, competencias y ritmo de trabajo rediseñados para operar los procesos nuevos.' },
        { tag: 'Fase 5', title: 'Despliegue IA', body: 'Soluciones digitales y asistentes de IA en producción sobre los procesos priorizados.' },
        { tag: 'Fase 6', title: 'Madurez orgánica', body: 'Tablero de seguimiento, mejora continua y nueva medición del ADN digital al cierre.' },
      ], 3),
      note('Los tres protocolos de Algoritmo T (diagnóstico, mapeo e implementación) fijan los plazos de cada fase y sus entregables. Las cantidades se cotizan por proceso, por solución y por mes de acompañamiento.'),
    ]),
  },
  {
    id: 'metodo-virtualizacion', category: 'Método', label: 'Virtualización de cursos · cinco fases',
    description: 'Ruta de aprendizaje, autoría, producción, montaje en LMS y calidad, con entregables por fase.',
    make: (n) => page('virtualizacion', n, 'Método', 'Producción de un curso virtual', [
      lede('Cada curso recorre cinco fases. El insumo es el plan de curso y los lineamientos institucionales; el resultado, un aula virtual lista para operar con sus recursos, actividades, navegación y control de calidad.'),
      phase('Fase 01', 'Ruta de aprendizaje', 'Semana 1', [['Qué se hace', 'Adecuación instruccional: secuencia por unidades, resultados de aprendizaje, criterios de evaluación y producto integrador.'], ['Entregable', 'Ruta aprobada por el docente autor y la coordinación.']]),
      phase('Fase 02', 'Autoría', 'Semanas 2 y 3', [['Qué se hace', 'Guiones de contenido, actividades e instrumentos de evaluación por unidad, con validación pedagógica.'], ['Entregable', 'Guiones y matriz de actividades.']]),
      phase('Fase 03', 'Producción', 'Semanas 4 a 6', [['Qué se hace', 'Recursos educativos digitales: videos, infografías, lecturas interactivas y cuestionarios, con identidad institucional.'], ['Entregable', 'Banco de recursos por unidad.']]),
      phase('Fase 04', 'Montaje en LMS', 'Semanas 7 y 8', [['Qué se hace', 'Configuración del aula: contenidos, actividades evaluativas, foros, calificaciones, instrucciones y navegación.'], ['Entregable', 'Aula operando en el LMS institucional.']]),
      phase('Fase 05', 'Control de calidad', 'Semana 9', [['Qué se hace', 'Revisión pedagógica y funcional con la rúbrica Quality Matters: coherencia, accesibilidad, enlaces y evaluación.'], ['Entregable', 'Informe de calidad y aula aprobada.']]),
    ]),
  },
  {
    id: 'metodo-formacion', category: 'Método', label: 'Formación docente · programa',
    description: 'Estructura de un programa de formación con talleres, acompañamiento y certificación.',
    make: (n) => page('formacion', n, 'Método', 'Programa de formación docente', [
      lede('La formación combina talleres en vivo, práctica sobre el aula propia de cada docente y acompañamiento entre sesiones. Nadie termina con una presentación: termina con su curso transformado.'),
      cards([
        { tag: 'Módulo 1', title: 'Diseño de la experiencia', body: 'Resultados de aprendizaje, secuencia y evaluación con la rúbrica Quality Matters. Taller de 4 horas y práctica sobre un curso propio.' },
        { tag: 'Módulo 2', title: 'Recursos y actividades', body: 'Producción de recursos con herramientas de autor y diseño de actividades con retroalimentación. Taller de 4 horas.' },
        { tag: 'Módulo 3', title: 'Aula en el LMS', body: 'Montaje, navegación, calificaciones y seguimiento del estudiante. Taller de 4 horas y acompañamiento de dos semanas.' },
        { tag: 'Módulo 4', title: 'IA en la práctica docente', body: 'Asistentes para planear, retroalimentar y analizar el avance del grupo, con criterios de uso responsable. Taller de 4 horas.' },
      ]),
      table(['Componente', 'Cantidad', 'Modalidad'], [['Talleres', '4 sesiones de 4 horas', 'Sincrónica'], ['Acompañamiento', '8 semanas', 'Asincrónica, con revisión semanal'], ['Certificación', '1 por docente', 'Con el aula transformada como evidencia']], 'minimal'),
    ]),
  },
  {
    id: 'metodo-analitica', category: 'Método', label: 'Learning Analytics · cuatro fases y un tablero',
    description: 'Cómo circula el dato desde el aula hasta la decisión, con las cuatro fases del plan a la medida.',
    make: (n) => page('analitica', n, 'Arquitectura', 'Cuatro fases, un solo tablero', [
      lede('La definición de indicadores abre el cronograma: establece lo que debe integrar el tablero. Las tres fases siguientes sostienen la operación, instalan su uso y lo mantienen vigente durante el año.'),
      cards([
        { tag: '01', title: 'Actividad', body: 'El estudiante trabaja en el aula.' },
        { tag: '02', title: 'Registro', body: 'La plataforma guarda cada evento.' },
        { tag: '03', title: 'Agregación', body: 'Tarea programada cada 30 minutos.' },
      ], 3),
      p('**Cómo circula el dato.** Todo ocurre dentro del servidor de la institución. El plugin lee la base de datos del LMS, agrega los valores y dibuja las gráficas con la librería que el propio núcleo ya trae. Nada sale de la infraestructura institucional.'),
      p('**Por qué se desarrollan de manera articulada.** Un catálogo de indicadores sin tablero limita su uso a la consulta documental, mientras que un tablero diseñado antes de definir el catálogo termina midiendo lo que la herramienta trae por defecto.'),
      note('Quién ve cada tablero se define con **capacidades reales del LMS**: un docente accede a los datos de sus cursos; la dirección, a los agregados por programa.'),
    ]),
  },
  {
    id: 'arquitectura', category: 'Método', label: 'Arquitectura tecnológica',
    description: 'Capas de la solución y tabla de componentes con la tecnología y lo que aporta cada una.',
    make: (n) => page('arquitectura', n, 'Solución', 'Arquitectura y base tecnológica', [
      lede('La solución se construye sobre el núcleo que Algoritmo T ya opera en producción: infraestructura, autenticación, pagos, perfil y comunidad. Cada módulo propio cuesta una fracción de lo que costaría por separado.'),
      table(['Componente', 'Tecnología', 'Qué aporta'], [
        ['Aplicación', 'React + TypeScript', 'Interfaz responsiva, accesible y rápida en cualquier dispositivo.'],
        ['Servicios', 'Node.js sin servidor', 'Escala con la demanda y cobra solo por uso.'],
        ['Base de datos', 'PostgreSQL gestionado', 'Datos relacionales con respaldos diarios y cifrado en reposo.'],
        ['Archivos', 'Almacenamiento de objetos', 'Documentos e imágenes con CDN global.'],
        ['IA', 'Modelos de lenguaje vía API', 'Asistentes y análisis en lenguaje natural sobre datos propios.'],
        ['Seguridad', 'Roles, MFA y auditoría', 'Quién entra, qué ve y qué cambió, con trazabilidad.'],
      ], 'navy'),
      box('Propiedad y continuidad', 'El código fuente, los datos y la documentación son propiedad de la institución desde la entrega. La operación puede trasladarse a un tercero con acompañamiento de Algoritmo T durante la migración.'),
    ]),
  },

  // ── Plan ─────────────────────────────────────────────────────────────────
  {
    id: 'cronograma', category: 'Plan', label: 'Cronograma de barras',
    description: 'Ocho semanas en barras con las aprobaciones marcadas, y qué sigue después de la implementación.',
    make: (n) => page('cronograma', n, 'Tiempos', 'Cronograma', [
      p('Seis semanas de implementación y dos de apropiación. La fase 1 abre con el catálogo y cierra la construcción en la semana 6; la fase 3 ocupa las dos últimas. Barra cian = ejecución · barra dorada = aprobación escrita.'),
      { type: 'gantt', cols: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'], rows: [
        { label: 'Fase 1 · Definición', from: 1, to: 2, tone: 'deep', bold: true },
        { label: 'Talleres de definición y validación', from: 1, to: 2, tone: 'cyan' },
        { label: 'Aprobación del catálogo', from: 2, to: 2, tone: 'gold' },
        { label: 'Fase 2 · Construcción', from: 3, to: 6, tone: 'deep', bold: true },
        { label: 'Desarrollo y pruebas con datos reales', from: 3, to: 6, tone: 'cyan' },
        { label: 'Aprobación de la entrega', from: 6, to: 6, tone: 'gold' },
        { label: 'Fase 3 · Apropiación', from: 7, to: 8, tone: 'deep', bold: true },
        { label: 'Sesiones por perfil y primera lectura', from: 7, to: 8, tone: 'cyan' },
        { label: 'Acta de cierre', from: 8, to: 8, tone: 'gold' },
      ], note: 'Ritmo de decisión: una sesión semanal de 45 a 60 minutos. La sesión de la semana con aprobación revisa los entregables y firma el acta.' },
      p('**Qué sigue a la semana 8.** La solución queda operando y el equipo formado. Durante el resto del año entra la fase 4: soporte prioritario, hasta dos ventanas de actualización y la revisión semestral del catálogo.'),
    ]),
  },
  {
    id: 'periodos-hitos', category: 'Plan', label: 'Banda de periodos e hitos',
    description: 'Banda proporcional de etapas con sus hitos y la tabla de qué se aprueba en cada uno.',
    make: (n) => page('hitos', n, 'Tiempos', 'Etapas e hitos de aprobación', [
      lede('El proyecto se organiza en tres etapas de peso distinto. Cada límite entre etapas es un hito con acta.'),
      { type: 'timeline', segments: [{ label: 'Definición · 2 sem', weight: 2, tone: 'cyan' }, { label: 'Construcción · 4 sem', weight: 4, tone: 'deep' }, { label: 'Apropiación · 2 sem', weight: 2, tone: 'gold' }], marks: ['Kickoff', 'Hito 01', 'Hito 02', 'Cierre'], note: '' },
      table(['Hito', 'Semana', 'Criterio de aprobación'], [
        ['Hito 01', 'Fin S2', 'Catálogo de indicadores aprobado y línea base documentada.'],
        ['Hito 02', 'Fin S6', 'Solución en producción, probada con datos reales y con permisos por rol.'],
        ['Cierre', 'Fin S8', 'Equipo formado, guía de uso entregada y primera lectura conjunta realizada.'],
      ]),
      note('Las observaciones menores de cada hito se incorporan dentro del tramo siguiente, con el acta firmada.'),
    ]),
  },
  {
    id: 'equipo', category: 'Plan', label: 'Equipo y forma de trabajo',
    description: 'Roles con responsabilidades, la caja del ritmo de trabajo y la regla de gobernanza.',
    make: (n) => page('equipo', n, 'Talento', 'Equipo y forma de trabajo', [
      p('El proyecto se trabaja con un equipo mixto. Algoritmo T asume la coordinación técnica, pedagógica y analítica; la institución aporta el acceso a los sistemas, la lectura institucional de los indicadores y la validación de cada entrega.'),
      { type: 'team', items: [
        { role: 'Dirección de proyecto', dedication: 'Todo el proyecto', functions: ['Coordinar el plan de trabajo, las sesiones con la institución y el seguimiento a compromisos.', 'Cuidar la relación entre alcance, cronograma, entregables y criterios de aceptación.'] },
        { role: 'Consultoría pedagógica y de indicadores', dedication: 'Fases 1 y 3', functions: ['Facilitar los talleres de definición y traducir las decisiones en indicadores con fórmula y fuente.', 'Diseñar y conducir las sesiones de apropiación por perfil.'] },
        { role: 'Ingeniería de datos y desarrollo', dedication: 'Fases 2 y 4', functions: ['Construir los módulos, integrarlos con la plataforma y comprobar cada cifra contra su fuente.', 'Atender el soporte y las ventanas de actualización.'] },
        { role: 'Enlace institucional (institución)', dedication: 'Todo el proyecto', functions: ['Convocar a los perfiles, dar acceso a los sistemas y firmar las actas de aprobación.'] },
      ] },
      box('Ritmo de trabajo', 'Una sesión semanal de seguimiento, más sesiones técnicas puntuales para acceso, validación de datos y revisión de pantallas. Cada semana cierra con acuerdos visibles: decisiones tomadas, pendientes y responsables.'),
    ]),
  },

  // ── Inversión ────────────────────────────────────────────────────────────
  {
    id: 'inversion', category: 'Inversión', label: 'Propuesta económica',
    description: 'Tabla de inversión con las líneas de la cotización, qué cubre la vigencia y la nota tributaria.',
    make: (n) => page('inversion', n, 'Inversión', 'Propuesta económica', [
      p('Las fases se contratan como un solo servicio y comparten un valor único. Se ejecutan encadenadas: la definición da forma a lo que se construye, la construcción entrega la herramienta, la apropiación instala su uso y el soporte lo mantiene vigente.'),
      { type: 'invoice', note: 'Valores expresados en pesos colombianos antes de IVA. El IVA del 19 % aplica sobre los componentes gravados; las retenciones se practican según el régimen tributario de la institución.' },
      p('**Qué sostiene la vigencia.** Los doce meses cubren:'),
      list(['Soporte prioritario · respuesta en el día hábil siguiente', 'Hasta dos ventanas de actualización', 'Revisión semestral del catálogo de indicadores', 'Acceso del equipo a la documentación y a las guías de uso'], 'check'),
      p('**A partir del segundo año**, la continuidad del servicio se ofrece en **$ [valor] + IVA** anuales, con el mismo alcance de soporte y seguimiento.'),
    ]),
  },
  {
    id: 'plan-pagos', category: 'Inversión', label: 'Plan de pagos',
    description: 'Pagos por hito con porcentaje y momento, y la nota de facturación.',
    make: (n) => page('pagos', n, 'Condiciones', 'Plan de pagos', [
      lede('Cuatro pagos atados a hitos verificables. La institución paga contra entregas, no contra promesas.'),
      { type: 'payments', items: [
        { pct: '30 %', label: 'A la firma · orden de inicio, accesos entregados y kickoff realizado' },
        { pct: '25 %', label: 'Hito 01 · catálogo de indicadores aprobado en acta de comité' },
        { pct: '25 %', label: 'Hito 02 · solución en producción, probada con datos reales' },
        { pct: '20 %', label: 'Cierre · equipo formado y acta de cierre firmada' },
      ] },
      h3('Facturación'),
      p('Cada factura se radica el día del hito con el acta firmada y el pago corre según el plazo que fije el área financiera de la institución. La vigencia de doce meses del soporte se cuenta desde la aprobación del hito 02.'),
      note('Un retraso en la aprobación de un hito por causas ajenas a Algoritmo T desplaza el cronograma en la misma proporción, sin cambiar el valor.'),
    ]),
  },
  {
    id: 'aprobaciones', category: 'Inversión', label: 'Aprobaciones y facturación',
    description: 'Tabla de aprobaciones con producto verificable y acta, y las reglas de facturación y habilitación.',
    make: (n) => page('aprobaciones', n, 'Inversión', 'Aprobaciones y facturación', [
      p('Cuatro aprobaciones escritas marcan el avance. Cada una tiene su producto verificable y su acta, de manera que la institución sigue el trabajo contra entregas reales.'),
      table(['Momento', 'Fase', 'Producto verificable', 'Evidencia'], [
        ['Semana 2', 'Fase 1', 'Catálogo de indicadores contrastado con la plataforma y línea base del periodo', 'Acta de comité'],
        ['Semana 3', 'Fase 2', 'Solución instalada en producción y permisos por rol configurados', 'Acta técnica'],
        ['Semana 6', 'Fase 2', 'Módulos operando con cifras comprobadas contra su fuente', 'Acta de entrega'],
        ['Semana 8', 'Fase 3', 'Sesiones realizadas y guía de uso entregada', 'Acta de cierre'],
      ], 'striped'),
      p('**Facturación.** La factura se radica con la orden de inicio y el pago corre según el plazo del área financiera. **Habilitación.** El servicio queda operando completo cuando se recibe el pago; desde ese momento cuentan los doce meses de vigencia.'),
      note('La institución recibe los entregables de cada tramo con tres días hábiles de anticipación a la sesión de cierre. Las observaciones menores se incorporan en el tramo siguiente.'),
    ]),
  },

  // ── Condiciones ──────────────────────────────────────────────────────────
  {
    id: 'supuestos', category: 'Condiciones', label: 'Supuestos y exclusiones',
    description: 'Dos columnas: lo que asumimos y lo que queda fuera, más la validez de la propuesta.',
    make: (n) => page('supuestos', n, 'Letra clara', 'Supuestos y exclusiones', [
      grid(2, [
        [h3('Lo que asumimos'), list(['Un interlocutor único por cada lado, con capacidad de decisión.', 'Acceso a los sistemas y a la información en la primera semana.', 'Respuesta a las validaciones dentro de los tres días hábiles siguientes.', 'Infraestructura institucional disponible para la instalación.'], 'check')],
        [h3('Lo que queda fuera'), list(['Producción de contenidos y facilitación de sesiones académicas.', 'Licencias de terceros no incluidas en la tabla de inversión.', 'Desarrollos posteriores al catálogo aprobado en la fase 1.', 'Migraciones de datos históricos de sistemas retirados.'])],
      ]),
      table(['Concepto', 'Condición'], [
        ['Validez', 'Esta propuesta es válida por [45] días a partir de su fecha de emisión.'],
        ['Cambios de alcance', 'Se documentan como orden de cambio, con su valoración y su efecto en el cronograma, antes de ejecutarse.'],
        ['Confidencialidad', 'La información de la institución se usa solo para este proyecto y se protege con las medidas de Algoritmo T.'],
      ], 'minimal'),
      note('El alcance contractual es el descrito en este documento con la configuración de líneas vigente al momento de la firma.'),
    ]),
  },
  {
    id: 'garantias', category: 'Condiciones', label: 'Garantía, propiedad y ampliación',
    description: 'Tabla con los compromisos de garantía, propiedad intelectual, datos y ampliación futura.',
    make: (n) => page('garantias', n, 'Letra clara', 'Garantía, propiedad y ampliación', [
      table(['Concepto', 'Alcance'], [
        ['Garantía', 'Corrección sin costo de cualquier defecto de lo entregado durante los doce meses de vigencia, con respuesta en el día hábil siguiente.'],
        ['Propiedad', 'El código, los datos, los diseños y la documentación son propiedad de la institución desde la entrega.'],
        ['Datos', 'La información permanece en la infraestructura de la institución. Algoritmo T accede solo con autorización y para el soporte.'],
        ['Continuidad', 'La operación puede trasladarse a un tercero con acompañamiento durante la migración.'],
        ['Ampliación', 'Los indicadores o módulos adicionales se cotizan como orden de cambio sobre la misma base construida.'],
      ]),
      box('Compromiso de servicio', 'Soporte por correo y por el canal directo con el equipo de Algoritmo T. Los incidentes que detengan la operación se atienden el mismo día hábil; el resto, en el siguiente.'),
    ]),
  },
  {
    id: 'servicio', category: 'Condiciones', label: 'Servicio, soporte y renovación',
    description: 'Tabla de periodos con lo que cubre cada uno, los niveles de soporte y la renovación anual.',
    make: (n) => page('servicio', n, 'Después de la entrega', 'Servicio, soporte y renovación', [
      table(['Periodo', 'Qué cubre', 'Valor'], [
        ['Meses 1 a 12', 'Infraestructura, monitoreo, respaldos y soporte de niveles 2, 3 y 4', 'Incluido'],
        ['Mes 13 en adelante', 'Renovación anual con el mismo alcance y mantenimiento evolutivo menor', '$ [valor] / año'],
        ['Salida del servicio', 'Traslado de la operación al cliente o a un tercero, con acompañamiento', '$ [valor] por una vez'],
      ]),
      h3('Niveles de soporte'),
      list(['**Nivel 1 · institución.** Primera atención al usuario y registro del caso.', '**Nivel 2 · funcional.** Dudas de uso, configuración y revisión de cifras.', '**Nivel 3 · técnico.** Corrección de defectos y ajustes de integración.', '**Nivel 4 · evolutivo.** Ventanas de actualización y mejoras menores.']),
      note('El ajuste anual de la renovación sigue el IPC del año anterior.'),
    ]),
  },
  {
    id: 'riesgos', category: 'Condiciones', label: 'Riesgos y mitigación',
    description: 'Tabla de riesgos del proyecto con probabilidad, impacto y la acción que los mitiga.',
    make: (n) => page('riesgos', n, 'Gestión', 'Riesgos y cómo se mitigan', [
      lede('Nombrar los riesgos desde el inicio permite decidir sobre ellos antes de que aparezcan.'),
      table(['Riesgo', 'Probabilidad', 'Impacto', 'Mitigación'], [
        ['Demora en accesos a los sistemas', 'Media', 'Alto', 'Lista de accesos acordada en el kickoff; el cronograma arranca con la orden de inicio.'],
        ['Indicadores que cambian tras la aprobación', 'Media', 'Medio', 'Catálogo cerrado en acta; los cambios entran como orden de cambio.'],
        ['Datos de origen incompletos', 'Baja', 'Alto', 'Validación de fuentes en la semana 1 y línea base documentada.'],
        ['Baja adopción del equipo', 'Media', 'Alto', 'Fase de apropiación con datos propios y sesiones mensuales de seguimiento.'],
      ], 'striped'),
      note('Los riesgos se revisan en la sesión semanal y se registran en el acta con su estado.'),
    ]),
  },

  // ── Cierre ───────────────────────────────────────────────────────────────
  {
    id: 'por-que', category: 'Cierre', label: 'Por qué Algoritmo T',
    description: 'Cuatro razones con ícono y una caja con la trayectoria de la casa.',
    make: (n) => page('por-que', n, 'Cierre', 'Por qué Algoritmo T', [
      lede('Soluciones digitales con sentido humano: tecnología que se construye alrededor de las decisiones que la gente toma, no al revés.'),
      grid(2, [
        [icon('graduation-cap', 'Educación y empresa', 'navy'), p('Más de [N] docentes formados y [N] cursos virtualizados con estándares Quality Matters, junto a diagnósticos de madurez digital en empresas de varios sectores.')],
        [icon('workflow', 'Método propio', 'cyan'), p('Seis fases y tres protocolos con plazos definidos. El cliente sabe desde el inicio qué recibe, cuándo y contra qué criterio se aprueba.')],
        [icon('database', 'Datos que se quedan en casa', 'gold'), p('Las soluciones operan sobre la infraestructura del cliente. Nada sale sin autorización y la propiedad es del cliente desde la entrega.')],
        [icon('handshake', 'Acompañamiento real', 'navy'), p('Cerramos cuando el equipo usa la herramienta por su cuenta. El soporte responde en el día hábil siguiente durante todo el año.')],
      ]),
      box('Trayectoria', 'Algoritmo T S.A.S. acompaña a instituciones de educación superior y a empresas en Colombia con plataformas de aprendizaje, analítica, producción de cursos y transformación digital con IA.'),
    ]),
  },
  {
    id: 'beneficios', category: 'Cierre', label: 'Beneficios para la institución',
    description: 'Tres beneficios con ícono y cifra, y un párrafo que los conecta con el reto.',
    make: (n) => page('beneficios', n, 'Valor', 'Qué cambia para la institución', [
      grid(3, [
        [icon('clock', 'De días a minutos', 'cyan'), p('El reporte que hoy toma días de cruces manuales queda disponible en una pantalla, con los filtros ya aplicados.')],
        [icon('bell-ring', 'Alertas a tiempo', 'gold'), p('Quien acompaña al estudiante recibe la señal cuando todavía hay margen para actuar, no al cierre del periodo.')],
        [icon('line-chart', 'Decisiones comparables', 'navy'), p('La dirección compara programas y periodos con los mismos indicadores, acordados y documentados.')],
      ]),
      p('Cada beneficio responde a uno de los frentes del diagnóstico. La información dispersa se reúne en una vista; las decisiones sin evidencia pasan a apoyarse en un catálogo acordado; y la dependencia de personas clave se reemplaza por un proceso automatizado y documentado.'),
      box('En cifras', 'Instituciones con tableros de permanencia reducen entre 15 % y 25 % la deserción temprana cuando el acompañamiento actúa en las dos primeras semanas de inactividad. [Fuente o dato propio]'),
    ]),
  },
  {
    id: 'casos', category: 'Cierre', label: 'Casos y credenciales',
    description: 'Tres casos recientes en tarjetas con el resultado obtenido.',
    make: (n) => page('casos', n, 'Credenciales', 'Trabajos recientes', [
      lede('Tres proyectos que muestran cómo trabajamos: el punto de partida, lo que se construyó y lo que cambió.'),
      cards([
        { tag: 'Educación superior', title: 'Analítica del aprendizaje en Moodle', body: 'Tablero de permanencia y riesgo para una institución con [N] estudiantes. Definición de KPIs con la dirección, construcción en seis semanas y apropiación del equipo.', foot: 'Resultado: lectura semanal de riesgo por programa' },
        { tag: 'Educación superior', title: 'Virtualización de un programa', body: '[N] cursos producidos en cinco fases con rúbrica Quality Matters, montados en el LMS institucional y aprobados por control de calidad.', foot: 'Resultado: programa operando en modalidad virtual' },
        { tag: 'Empresa', title: 'Plataforma de afiliaciones', body: 'Núcleo común y diez módulos propios en doce semanas: home pública, pasarela de pagos, acceso por plan y comunidad.', foot: 'Resultado: operación digital del programa' },
      ], 3),
      note('Referencias y contactos disponibles a solicitud de la institución.'),
    ]),
  },
  {
    id: 'cierre-cta', category: 'Cierre', label: 'Siguiente paso',
    description: 'Cierre con el llamado a la acción, un botón de contacto y los datos de la firma.',
    make: (n) => page('siguiente-paso', n, 'Cierre', 'Siguiente paso', [
      lede('Si esta propuesta responde a lo que la institución necesita, el siguiente paso es una sesión de 45 minutos para ajustar el alcance, confirmar el cronograma y fijar la fecha de inicio.'),
      list(['Revisión conjunta del alcance y de las líneas cotizadas.', 'Confirmación del interlocutor institucional y de los accesos.', 'Orden de inicio y kickoff en la semana siguiente.'], 'number'),
      button('Agendar la sesión', 'https://www.algoritmot.com/agenda'),
      grid(3, [
        [icon('mail', 'anadiazgranados@algoritmot.com', 'navy')],
        [icon('phone', '+57 300 659 0161', 'cyan')],
        [icon('globe', 'www.algoritmot.com', 'gold')],
      ]),
      note('Ana Milena Diazgranados · Directora de Relacionamiento · Algoritmo T S.A.S.'),
    ]),
  },

  // ── Anexos ───────────────────────────────────────────────────────────────
  {
    id: 'kpis', category: 'Anexos', label: 'Catálogo de indicadores',
    description: 'Tabla de KPIs con fórmula, fuente y frecuencia, lista para completar con la institución.',
    make: (n) => page('kpis', n, 'Anexo', 'Catálogo de indicadores', [
      lede('Cada indicador tiene una decisión que lo justifica, una fórmula, una fuente y una frecuencia. Sin esos cuatro datos no entra al catálogo.'),
      table(['Indicador', 'Fórmula', 'Fuente', 'Frecuencia'], [
        ['Permanencia semanal', 'Estudiantes con actividad significativa en 7 días / matriculados', 'Registro de sesiones', 'Semanal'],
        ['Riesgo de abandono', 'Estudiantes sin actividad en 14 días y sin entregas vencidas resueltas', 'Sesiones y entregas', 'Semanal'],
        ['Avance del curso', 'Actividades completadas / actividades programadas a la fecha', 'Finalización de actividades', 'Semanal'],
        ['Reactivación tras mensaje', 'Estudiantes que vuelven en 7 días tras un mensaje / mensajes enviados', 'Mensajería', 'Mensual'],
        ['Certificación', 'Estudiantes certificados / matriculados al cierre', 'Calificaciones', 'Por periodo'],
      ], 'compact'),
      note('Los indicadores restantes se documentan con su fórmula en la fase 1 y se priorizan para ventanas de actualización.'),
    ]),
  },
  {
    id: 'glosario', category: 'Anexos', label: 'Glosario',
    description: 'Términos del documento con su definición en dos columnas.',
    make: (n) => page('glosario', n, 'Anexo', 'Glosario', [
      table(['Término', 'Definición'], [
        ['LMS', 'Sistema de gestión del aprendizaje donde operan las aulas virtuales (Moodle, Canvas, Blackboard).'],
        ['Quality Matters', 'Rúbrica internacional de calidad para cursos virtuales: objetivos, evaluación, materiales, interacción y accesibilidad.'],
        ['KPI', 'Indicador clave de desempeño: una medida acordada que orienta una decisión concreta.'],
        ['Actividad significativa', 'Regla configurable de horas y días activos que separa la presencia real de la conexión ocasional.'],
        ['Orden de cambio', 'Documento que describe un ajuste de alcance con su valoración y su efecto en el cronograma.'],
        ['Hito', 'Punto de aprobación escrita con producto verificable y acta.'],
      ], 'minimal'),
    ]),
  },
  {
    id: 'faq', category: 'Anexos', label: 'Preguntas frecuentes',
    description: 'Cinco preguntas que suelen surgir al leer la propuesta, con respuesta breve.',
    make: (n) => page('faq', n, 'Anexo', 'Preguntas frecuentes', [
      h3('¿Los datos salen de la institución?'),
      p('No. La solución opera sobre la infraestructura institucional. Algoritmo T accede solo con autorización y para el soporte.'),
      h3('¿Qué pasa si cambian los indicadores después de aprobarlos?'),
      p('El catálogo cierra en acta. Un cambio posterior entra como orden de cambio, con su valoración; los ajustes menores se atienden en las ventanas de actualización.'),
      h3('¿Quién puede ver cada vista?'),
      p('Lo definen los roles reales de la plataforma: un docente ve sus cursos; la coordinación, su programa; la dirección, los agregados.'),
      h3('¿Qué incluye el soporte de doce meses?'),
      p('Atención en el día hábil siguiente, revisión semestral del catálogo, hasta dos ventanas de actualización y acceso a la documentación.'),
      h3('¿Se puede ampliar después?'),
      p('Sí. Los módulos e indicadores adicionales se cotizan sobre la misma base construida, sin rehacer lo entregado.'),
    ]),
  },
  {
    id: 'comparativa', category: 'Anexos', label: 'Comparativa de planes',
    description: 'Tabla con lo que incluye cada plan, para propuestas con dos o tres niveles.',
    make: (n) => page('comparativa', n, 'Anexo', 'Qué incluye cada plan', [
      lede('Tres niveles para tres necesidades. El plan a la medida incluye todo lo anterior y agrega la construcción propia.'),
      table(['Componente', 'Estándar', 'Anual', 'A la medida'], [
        ['Tableros de fábrica', '✓', '✓', '✓'],
        ['Usuarios y cursos', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
        ['Consultas del asistente de IA', '100', '500', '500'],
        ['Soporte', 'Correo · 3 días', 'Prioritario · 1 día', 'Prioritario · 1 día'],
        ['Ventanas de actualización', '—', '2', '2'],
        ['Indicadores propios', '—', '—', 'Catálogo definido con la dirección'],
        ['Formación del equipo', '—', 'Sesión de arranque', 'Dos sesiones por perfil y seguimiento'],
      ], 'navy'),
      note('Los valores de cada plan están en la página de inversión.'),
    ]),
  },
  {
    id: 'galeria', category: 'Anexos', label: 'Galería de pantallas',
    description: 'Dos imágenes con pie y la nota de que las cifras son de ejemplo. Reemplaza las imágenes con un clic.',
    make: (n) => page('galeria', n, 'En pantalla', 'Así se ve funcionando', [
      lede('Las vistas que más se consultan a diario. Las cifras son un ejemplo; la composición corresponde al comportamiento real de la herramienta.'),
      { type: 'img', url: '/assets/algoritmot-mark.svg', caption: 'Fig. 01 · Vista de dirección: permanencia, riesgo y certificación por programa. Haz clic para reemplazar la imagen.', wide: true },
      { type: 'img', url: '/assets/algoritmot-mark.svg', caption: 'Fig. 02 · Detalle del curso: avance por actividad y estudiantes en riesgo. Haz clic para reemplazar la imagen.', wide: true },
      note('Las cifras de la maqueta son un ejemplo. Las vistas finales se aprueban al cierre de la fase 1 con los indicadores del catálogo ya operando.'),
    ]),
  },
  {
    id: 'timeline-h', category: 'Plan', label: 'Línea de tiempo horizontal',
    description: 'Cinco hitos en una banda horizontal numerada, con fecha y descripción; se agregan o quitan hitos desde el editor.',
    make: (n) => page('linea-tiempo', n, 'Tiempos', 'Ruta del proyecto', [
      lede('Cinco hitos marcan el recorrido. Cada uno tiene un producto verificable y cierra con un acta.'),
      { type: 'htimeline', items: [
        { title: 'Kickoff', date: 'Semana 1', desc: 'Orden de inicio, accesos entregados y plan de trabajo acordado.', tone: 'cyan' },
        { title: 'Definición', date: 'Semana 2', desc: 'Catálogo de indicadores aprobado en acta de comité.', tone: 'cyan' },
        { title: 'Construcción', date: 'Semanas 3 a 6', desc: 'Solución en producción, probada con datos reales.', tone: 'deep' },
        { title: 'Apropiación', date: 'Semanas 7 y 8', desc: 'Equipo formado y primera lectura conjunta.', tone: 'deep' },
        { title: 'Cierre', date: 'Semana 8', desc: 'Acta de cierre y arranque de los doce meses de soporte.', tone: 'gold' },
      ] },
      p('**Qué sigue al cierre.** El soporte responde en el día hábil siguiente durante doce meses, con revisión semestral del catálogo y hasta dos ventanas de actualización.'),
      note('Un retraso en la aprobación de un hito por causas ajenas a Algoritmo T desplaza los siguientes en la misma proporción.'),
    ]),
  },
  {
    id: 'timeline-v', category: 'Plan', label: 'Línea de tiempo vertical',
    description: 'Cinco hitos en columna con fecha y descripción amplia; ideal cuando cada hito necesita más texto.',
    make: (n) => page('hitos-vertical', n, 'Tiempos', 'Hitos del proyecto', [
      { type: 'vtimeline', items: [
        { title: 'Kickoff y accesos', date: 'Semana 1', desc: 'Reunión de arranque con el interlocutor institucional. Se entregan los accesos a los sistemas, se confirma el plan de trabajo y se fija el calendario de sesiones semanales.', tone: 'cyan' },
        { title: 'Catálogo de indicadores', date: 'Semana 2', desc: 'Dos talleres con la dirección: definición y validación. El catálogo aprobado fija qué se construye y cierra con acta de comité.', tone: 'cyan' },
        { title: 'Solución en producción', date: 'Semana 6', desc: 'Módulos operando sobre la plataforma institucional, con permisos por rol y cifras comprobadas contra su fuente. Acta de entrega.', tone: 'deep' },
        { title: 'Equipo formado', date: 'Semana 8', desc: 'Dos sesiones por perfil con datos propios y primera lectura conjunta de resultados. Guía de uso entregada y acta de cierre.', tone: 'deep' },
        { title: 'Soporte y evolución', date: '12 meses', desc: 'Atención en el día hábil siguiente, revisión semestral del catálogo y hasta dos ventanas de actualización.', tone: 'gold' },
      ] },
    ]),
  },
  {
    id: 'firma', category: 'Cierre', label: 'Firma y aceptación',
    description: 'Cierre formal con la firma de Algoritmo T y el espacio de aceptación del cliente, en dos columnas.',
    make: (n) => page('firma', n, 'Cierre', 'Firma y aceptación', [
      p('Con la firma de esta propuesta, la institución acepta el alcance, el cronograma, la inversión y las condiciones descritas en este documento. Algoritmo T se compromete a ejecutarlo con los entregables y criterios de aprobación aquí definidos.'),
      grid(2, [
        [{ type: 'signature', name: 'Ana Milena Diazgranados', role: 'Directora de Relacionamiento', org: 'Algoritmo T S.A.S.', email: 'anadiazgranados@algoritmot.com', phone: '+57 300 659 0161', place: 'Bogotá D. C.', date: '[fecha]', note: '' }],
        [{ type: 'signature', name: '[Nombre de quien acepta]', role: '[Cargo]', org: '[Nombre de la institución]', email: '', phone: '', place: '', date: '[fecha]', note: 'Aceptación de la propuesta', accept: true }],
      ]),
      note('Propuesta válida por [45] días desde su emisión. El alcance contractual es el descrito en este documento con la configuración de líneas vigente al momento de la firma.'),
    ]),
  },
  {
    id: 'dos-secciones', category: 'Anexos', label: 'Dos secciones en una hoja',
    description: 'Ejemplo de página con dos numerales: la primera sección va en el encabezado y la segunda como bloque de sección.',
    make: (n) => page('dos-secciones', n, 'Condiciones', 'Supuestos', [
      list(['Un interlocutor único por cada lado, con capacidad de decisión.', 'Acceso a los sistemas y a la información en la primera semana.', 'Respuesta a las validaciones dentro de los tres días hábiles siguientes.'], 'check'),
      { type: 'sechead', num: num(n + 1), kicker: 'Condiciones', title: 'Exclusiones' },
      list(['Producción de contenidos y facilitación de sesiones académicas.', 'Licencias de terceros no incluidas en la tabla de inversión.', 'Desarrollos posteriores al catálogo aprobado en la fase 1.']),
      note('Las dos secciones aparecen en el índice con su número y la misma hoja.'),
    ]),
  },
  {
    id: 'esquemas', category: 'Método', label: 'Esquemas: proceso y matriz',
    description: 'Un proceso en cinco pasos y una matriz de priorización 2×2, ambos editables y con elementos agregables.',
    make: (n) => page('esquemas', n, 'Método', 'Cómo se prioriza y se ejecuta', [
      lede('Primero se ordena lo que hay que hacer según su valor y su esfuerzo; después se ejecuta en cinco pasos encadenados.'),
      { type: 'diagram', kind: 'matrix', title: 'Matriz de priorización', axes: { x: ['Menor esfuerzo', 'Mayor esfuerzo'], y: ['Mayor valor', 'Menor valor'] }, items: [
        { label: 'Ganancias rápidas', desc: 'Se hacen primero: alto valor con poco esfuerzo.', tone: 'gold' },
        { label: 'Apuestas mayores', desc: 'Alto valor y alto esfuerzo: se planean por fases.', tone: 'deep' },
        { label: 'Relleno', desc: 'Bajo valor y poco esfuerzo: solo si sobra tiempo.', tone: 'cyan' },
        { label: 'Descartar', desc: 'Bajo valor y alto esfuerzo: fuera del alcance.', tone: 'cyan' },
      ] },
      { type: 'diagram', kind: 'process', title: 'Ruta de ejecución', items: [
        { label: 'Diagnóstico', desc: 'Punto de partida y catálogo', tone: 'cyan' },
        { label: 'Diseño', desc: 'Qué se construye y cómo', tone: 'cyan' },
        { label: 'Construcción', desc: 'Solución en producción', tone: 'deep' },
        { label: 'Apropiación', desc: 'Equipo formado', tone: 'deep' },
        { label: 'Mejora', desc: 'Soporte y evolución', tone: 'gold' },
      ] },
      note('Cada esquema se cambia de tipo desde «⋯»: ciclo, pirámide, mapa mental, mapa conceptual, cuadro sinóptico o causa-efecto.'),
    ]),
  },
  {
    id: 'libre', category: 'Anexos', label: 'Página en blanco',
    description: 'Solo un título y un párrafo, para empezar desde cero.',
    make: (n) => page('pagina', n, '', 'Nueva página', [p('Escribe aquí…')]),
  },
]

export const templatesByCategory = () =>
  PAGE_TEMPLATE_CATEGORIES.map((category) => ({ category, items: PAGE_TEMPLATES.filter((t) => t.category === category) })).filter((g) => g.items.length)
