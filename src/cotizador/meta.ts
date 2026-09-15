/**
 * Cotizador — vocabulario compartido de la interfaz: línea de negocio,
 * seguimiento comercial y estado de publicación. Espejo de QUOTE_LINES y
 * QUOTE_STAGES del servidor (api/_lib/quotes.ts).
 */

export type QuoteLine = 'EDUCATIVA' | 'EMPRESARIAL'
export type QuoteStage = 'ENVIADA' | 'EN_ESTUDIO' | 'APROBADA' | 'DESCARTADA'
export type QuoteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export const LINES: Array<[QuoteLine, string]> = [
  ['EDUCATIVA', 'Educativa'],
  ['EMPRESARIAL', 'Empresarial'],
]
export const LINE_LABEL: Record<string, string> = Object.fromEntries(LINES)
export const LINE_STYLE: Record<string, string> = {
  EDUCATIVA: 'border-violet-200 bg-violet-50 text-violet-700',
  EMPRESARIAL: 'border-sky-200 bg-sky-50 text-sky-700',
}

/** Orden del embudo comercial. null (sin seguimiento) = «Por enviar». */
export const STAGES: Array<[QuoteStage, string]> = [
  ['ENVIADA', 'Enviada'],
  ['EN_ESTUDIO', 'En estudio'],
  ['APROBADA', 'Aprobada'],
  ['DESCARTADA', 'Descartada'],
]
export const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES)
export const STAGE_EMPTY_LABEL = 'Por enviar'
export const STAGE_STYLE: Record<string, string> = {
  ENVIADA: 'border-sky-200 bg-sky-50 text-sky-700',
  EN_ESTUDIO: 'border-amber-200 bg-amber-50 text-amber-700',
  APROBADA: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DESCARTADA: 'border-rose-200 bg-rose-50 text-rose-600',
}
export const STAGE_EMPTY_STYLE = 'border-slate-200 bg-slate-50 text-slate-500'
export const stageLabel = (stage: string | null | undefined) => (stage && STAGE_LABEL[stage]) || STAGE_EMPTY_LABEL
export const stageStyle = (stage: string | null | undefined) => (stage && STAGE_STYLE[stage]) || STAGE_EMPTY_STYLE

export const STATUS_LABEL: Record<string, string> = { DRAFT: 'Borrador', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada' }
export const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'border-amber-200 bg-amber-50 text-amber-700',
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ARCHIVED: 'border-slate-200 bg-slate-100 text-slate-500',
}

/** Línea sugerida por plantilla (misma regla que defaultLineFor en el servidor). */
export const defaultLineFor = (template: string): QuoteLine =>
  template === 'SOLUCIONES' || template === 'TRANSFORMACION' ? 'EMPRESARIAL' : 'EDUCATIVA'
