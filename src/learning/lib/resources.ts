/**
 * Learning Builder · tipos de recurso de la metabiblioteca.
 *
 * Un workspace produce piezas de varias clases y todas viven en la misma
 * tabla y en la misma biblioteca: cambia el editor, no el gobierno. Cada clase
 * declara si su editor ya está disponible, para que la biblioteca muestre lo
 * que viene sin ofrecer un botón que no lleva a ninguna parte.
 */

export const LB_RESOURCE_KINDS = ['OVA', 'LECTURA', 'INTERACTIVE', 'PODCAST', 'VIDEO', 'ROUTE', 'IMPORT'] as const
export type LbResourceKind = (typeof LB_RESOURCE_KINDS)[number]

export type LbResourceKindSpec = {
  kind: LbResourceKind
  label: string
  short: string
  hint: string
  /** Nombre del icono de lucide-react que usa la UI. */
  icon: string
  accent: string
  /** false mientras su editor esté en construcción: la biblioteca lo anuncia pero no deja crearlo. */
  available: boolean
  /** Qué hace falta para habilitarlo, cuando no está disponible. */
  pending?: string
}

export const LB_RESOURCE_KIND_SPECS: Record<LbResourceKind, LbResourceKindSpec> = {
  OVA: {
    kind: 'OVA',
    label: 'OVA navegable',
    short: 'OVA',
    hint: 'Objeto de aprendizaje por lecciones y bloques, al estilo Rise. Exporta a SCORM 1.2 y a HTML.',
    icon: 'GraduationCap',
    accent: 'from-rose-500 to-orange-500',
    available: true,
  },
  LECTURA: {
    kind: 'LECTURA',
    label: 'Lectura interactiva',
    short: 'Lectura',
    hint: 'Documento navegable por bloques con comprobaciones: el mismo motor del OVA, pensado para leer.',
    icon: 'BookOpen',
    accent: 'from-sky-600 to-cyan-500',
    available: true,
  },
  INTERACTIVE: {
    kind: 'INTERACTIVE',
    label: 'Presentación interactiva',
    short: 'Interactiva',
    hint: 'Escenas con puntos activos y navegación libre, al estilo Genially.',
    icon: 'MousePointerClick',
    accent: 'from-violet-600 to-fuchsia-500',
    available: false,
    pending: 'Falta el editor de escenas y puntos activos.',
  },
  PODCAST: {
    kind: 'PODCAST',
    label: 'Pódcast',
    short: 'Pódcast',
    hint: 'Guion a varias voces y locución generada con ElevenLabs.',
    icon: 'Mic',
    accent: 'from-emerald-600 to-teal-500',
    available: false,
    pending: 'Falta la integración con ElevenLabs.',
  },
  VIDEO: {
    kind: 'VIDEO',
    label: 'Video',
    short: 'Video',
    hint: 'Guion, storyboard y piezas visuales; imágenes ampliadas con Magnific.',
    icon: 'Clapperboard',
    accent: 'from-amber-500 to-orange-500',
    available: false,
    pending: 'Falta el storyboard y la integración con Magnific.',
  },
  ROUTE: {
    kind: 'ROUTE',
    label: 'Ruta de aprendizaje',
    short: 'Ruta',
    hint: 'Propuesta de ruta de un curso completo, de la que se derivan los demás recursos.',
    icon: 'Route',
    accent: 'from-blue-600 to-sky-500',
    available: false,
    pending: 'Falta el planificador de rutas.',
  },
  IMPORT: {
    kind: 'IMPORT',
    label: 'Pieza importada',
    short: 'Importado',
    hint: 'SCORM o HTML existente, recreado para editarlo en línea y volver a entregarlo.',
    icon: 'PackageOpen',
    accent: 'from-slate-600 to-slate-400',
    available: false,
    pending: 'Falta el importador de paquetes.',
  },
}

export function isResourceKind(value: unknown): value is LbResourceKind {
  return typeof value === 'string' && (LB_RESOURCE_KINDS as readonly string[]).includes(value)
}

export const LB_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const
export type LbStatus = (typeof LB_STATUSES)[number]

export const LB_STATUS_LABEL: Record<LbStatus, string> = {
  DRAFT: 'Borrador',
  REVIEW: 'En revisión',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

export const LB_STATUS_STYLE: Record<LbStatus, string> = {
  DRAFT: 'border-amber-200 bg-amber-50 text-amber-700',
  REVIEW: 'border-sky-200 bg-sky-50 text-sky-700',
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ARCHIVED: 'border-slate-200 bg-slate-100 text-slate-500',
}

/** Cómo se comparte un recurso hacia afuera del workspace. */
export const LB_SHARE_MODES = ['OFF', 'OPEN', 'CODE'] as const
export type LbShareMode = (typeof LB_SHARE_MODES)[number]

export const LB_SHARE_LABEL: Record<LbShareMode, string> = {
  OFF: 'Sin enlace',
  OPEN: 'Enlace abierto',
  CODE: 'Enlace con código',
}

export const LB_SHARE_HINT: Record<LbShareMode, string> = {
  OFF: 'Solo el equipo del workspace puede verlo.',
  OPEN: 'Cualquiera con el enlace entra sin más.',
  CODE: 'El enlace pide un código de acceso antes de mostrar el recurso.',
}

/** Modo en que se recreó una pieza importada. */
export type LbImportMode = 'BLOCKS' | 'MIRROR'

export const LB_IMPORT_LABEL: Record<LbImportMode, string> = {
  BLOCKS: 'Convertido a bloques',
  MIRROR: 'Copia fiel editable por capa',
}

/**
 * Un recurso guardado con un tipo que esta versión de la interfaz no conoce
 * —por ejemplo tras sembrar datos antes de que el navegador recargue— no debe
 * tumbar la pantalla: se pinta como desconocido y se dice qué hacer.
 */
const UNKNOWN_KIND: LbResourceKindSpec = {
  kind: 'OVA',
  label: 'Tipo no reconocido',
  short: 'Recurso',
  hint: 'Este tipo de recurso no existe en la versión de la interfaz que tienes cargada.',
  icon: 'Library',
  accent: 'from-slate-500 to-slate-400',
  available: false,
  pending: 'Recarga la página para traer la versión más reciente del módulo.',
}

export function kindSpec(kind: string | null | undefined): LbResourceKindSpec {
  return LB_RESOURCE_KIND_SPECS[kind as LbResourceKind] ?? UNKNOWN_KIND
}
