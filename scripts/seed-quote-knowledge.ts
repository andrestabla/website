/**
 * Carga en la base de contexto del Cotizador las cotizaciones ya enviadas por
 * Algoritmo T (histórico real). Sirven de entrenamiento para el asistente:
 * estructura, tono, alcances y rangos de precio de la casa.
 *
 * Extrae el texto plano del index.html de cada propuesta y lo guarda como
 * QuoteKnowledgeDoc kind=CASE. Idempotente: upsert por título.
 *
 *   npx tsx scripts/seed-quote-knowledge.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
import { readFileSync } from 'node:fs'
const { prisma } = await import('../api/_lib/prisma.js')

const db = prisma as any
const BASE = '/Users/andrestabla/Documents/Algoritmo/Cotizaciones'
/** Tope por documento: deja espacio para que los cuatro casos convivan en el presupuesto de contexto del chat. */
const MAX_CHARS = 24_000

type Source = { file: string; title: string; summary: string; header: string }

const SOURCES: Source[] = [
  {
    file: `${BASE}/Ediciones de la U/Propuesta 2026 - Plataforma editorial a la medida/index.html`,
    title: 'Caso 2026 · Ediciones de la U — Plataforma editorial a la medida',
    summary: 'Plataforma de gestión editorial, comercial y canal digital. Núcleo + 14 módulos, configuración sugerida $37.208.000 y completa $61.300.000 COP, 6–8 semanas. Documento interactivo con módulos activables.',
    header: [
      '[COTIZACIÓN HISTÓRICA · CASO REAL DE ALGORITMO T]',
      'Cliente: Ediciones de la U (editorial universitaria y profesional, Bogotá)',
      'Año: 2026 · Moneda: COP (sin IVA en el documento)',
      'Inversión: configuración sugerida $37.208.000 (núcleo + 7 módulos, 6 semanas); plataforma completa $61.300.000 (14 módulos, 8 semanas); solo núcleo $12.000.000 (4 semanas).',
      'Modelo: catálogo de módulos con interruptores; descuento por economía de escala 0–15% sobre módulos; 4 pagos 30/25/25/20 atados a hitos; 12 meses de infraestructura y soporte N2-N4 incluidos; renovación anual $8.000.000; salida del servicio $4.000.000.',
    ].join('\n'),
  },
  {
    file: `${BASE}/4Shine/Propuesta 2026 - Shine Empresas e Instituto/index.html`,
    title: 'Caso 2026 · 4Shine Empresas e Institute for Human Expansion',
    summary: 'Dossier y framework 4Shine Empresas, serie de 5 papers, estudio de observación y metodología 4Shine Experience. USD 14.000, 4 líneas, 28 entregables, 4 meses con pagos mensuales por hitos.',
    header: [
      '[COTIZACIÓN HISTÓRICA · CASO REAL DE ALGORITMO T]',
      'Cliente: Carmenza Alarcón · Sistema 4Shine (consultoría en desarrollo humano/organizacional)',
      'Año: 2026 · Moneda: USD',
      'Inversión: USD 14.000 en 4 líneas de trabajo (4.000 + 3.500 + 2.500 + 4.000) · 28 entregables · 4 meses.',
      'Modelo: pago mensual al cierre de cada mes, atado a hitos de avance verificables; entregables en editable y final diagramado con versionado.',
    ].join('\n'),
  },
  {
    file: `${BASE}/Unisalle/julio2026/index.html`,
    title: 'Caso jul-2026 · Universidad de La Salle — Recursos Educativos Digitales',
    summary: 'Diseño y producción de Recursos Educativos Digitales: 8 asignaturas, 67 recursos en versión web (.html). Inversión $45.400.000 COP con escala de precio por volumen de recursos.',
    header: [
      '[COTIZACIÓN HISTÓRICA · CASO REAL DE ALGORITMO T]',
      'Cliente: Universidad de La Salle (educación superior, Bogotá)',
      'Año: 2026 · Moneda: COP',
      'Inversión: $45.400.000 por 8 asignaturas · 67 recursos educativos digitales en versión web (.html).',
      'Modelo: precio unitario por recurso con escala por volumen; producción por asignatura con revisiones de la universidad.',
    ].join('\n'),
  },
  {
    file: `${BASE}/Unidad Médica/Propuesta Orluz - Actualización TRD/index.html`,
    title: 'Caso 2026 · Unidad Médica Orluz — Actualización de las TRD',
    summary: 'Gestión documental en salud: actualización de Tablas de Retención Documental, Cuadro de Clasificación y valoración documental. COP 14.000.000 + IVA, 6 a 8 semanas.',
    header: [
      '[COTIZACIÓN HISTÓRICA · CASO REAL DE ALGORITMO T]',
      'Cliente: Unidad Médica Orluz (sector salud)',
      'Año: 2026 · Moneda: COP',
      'Inversión: COP 14.000.000 + IVA · 6 a 8 semanas.',
      'Alcance: TRD · CCD · valoración documental, con normativa archivística colombiana.',
    ].join('\n'),
  },
]

/** HTML de las propuestas → texto plano legible (títulos, párrafos, listas y tablas). */
function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<h([1-4])[^>]*>/gi, '\n\n## ')
    .replace(/<\/h[1-4]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<(td|th)[^>]*>/gi, ' | ')
    .replace(/<(br|\/p|\/li|\/tr|\/div|\/section|\/figure|\/figcaption|\/table)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&middot;': '·', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  }
  s = s.replace(/&[a-z#0-9]+;/gi, (m) => entities[m] ?? ' ')

  const lines = s
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').replace(/^(\s*\|\s*)+/, '').replace(/(\s*\|\s*)+$/, '').trim())
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

let created = 0
let updated = 0

for (const source of SOURCES) {
  const html = readFileSync(source.file, 'utf8')
  const body = htmlToText(html).slice(0, MAX_CHARS)
  const content = `${source.header}\n\n--- TEXTO COMPLETO DE LA PROPUESTA ---\n\n${body}`

  const existing = await db.quoteKnowledgeDoc.findFirst({ where: { title: source.title } })
  const data = {
    title: source.title,
    kind: 'CASE',
    sourceName: source.file.split('/').slice(-2).join('/'),
    mimeType: 'text/html',
    content,
    summary: source.summary,
    charCount: content.length,
    active: true,
  }
  if (existing) {
    await db.quoteKnowledgeDoc.update({ where: { id: existing.id }, data })
    updated++
  } else {
    await db.quoteKnowledgeDoc.create({ data })
    created++
  }
  console.log(`${existing ? '↻' : '+'} ${source.title} · ${(content.length / 1000).toFixed(1)}k caracteres`)
}

const total = await db.quoteKnowledgeDoc.count({ where: { active: true } })
console.log(`\nBase de contexto: ${created} creados · ${updated} actualizados · ${total} documentos activos`)

// ─── Segunda tanda: líneas de servicio de educación digital y plataformas ────
// Carpetas con formatos mixtos (docx, pdf, html). Se extrae el texto y se carga
// un documento por archivo relevante, con tope de 16k caracteres cada uno.

const MAX_CHARS_2 = 16_000

async function extractFile(file: string): Promise<string> {
  const buffer = readFileSync(file)
  const lower = file.toLowerCase()
  if (lower.endsWith('.docx')) {
    const mammoth: any = await import('mammoth')
    const result = await (mammoth.default ?? mammoth).extractRawText({ buffer })
    return String(result?.value || '')
  }
  if (lower.endsWith('.pdf')) {
    // pdf-parse v2: API de clase (PDFParse → getText)
    const mod: any = await import('pdf-parse')
    const parser = new mod.PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      return String(result?.text || '')
    } finally {
      await parser.destroy().catch(() => undefined)
    }
  }
  return htmlToText(buffer.toString('utf8'))
}

type BatchSource = { file: string; title: string; summary: string; line: string }

const BATCH2: BatchSource[] = [
  {
    file: `${BASE}/USCO/Producción de contenidos.docx`,
    title: 'Caso · USCO — Producción de contenidos',
    summary: 'Propuesta de producción de contenidos educativos digitales para la Universidad Surcolombiana.',
    line: 'Producción de contenidos educativos',
  },
  {
    file: `${BASE}/USCO/Creación de programas.docx`,
    title: 'Caso · USCO — Creación de programas académicos',
    summary: 'Propuesta de acompañamiento en creación de programas académicos para la Universidad Surcolombiana.',
    line: 'Creación de programas académicos',
  },
  {
    file: `${BASE}/Unicafam/Propuesta 20260304.docx`,
    title: 'Caso mar-2026 · Unicafam',
    summary: 'Propuesta comercial para la Fundación Universitaria Cafam (versión 2026-03-04).',
    line: 'Educación digital',
  },
  {
    file: `${BASE}/SanMartín/formacion-docente/index.html`,
    title: 'Caso · Fundación Universitaria San Martín — Formación docente',
    summary: 'Programa de formación docente para la Fundación Universitaria San Martín.',
    line: 'Formación docente',
  },
  {
    file: `${BASE}/UPC/Propuesta 20260303.docx`,
    title: 'Caso mar-2026 · UPC',
    summary: 'Propuesta comercial para la Universidad Popular del Cesar (versión 2026-03-03).',
    line: 'Educación digital',
  },
  {
    file: `${BASE}/UPC/Propuesta producción de contenidos.docx`,
    title: 'Caso · UPC — Producción de contenidos',
    summary: 'Propuesta de producción de contenidos educativos para la Universidad Popular del Cesar.',
    line: 'Producción de contenidos educativos',
  },
  {
    file: `${BASE}/Registro calificado/Insumos/Propuesta comercial de consultoría para estudio de mercado de nuevos programas académicos.docx`,
    title: 'Caso · Estudio de mercado para nuevos programas académicos',
    summary: 'Consultoría de estudio de mercado para registro calificado de nuevos programas académicos.',
    line: 'Registro calificado y estudios de mercado',
  },
  {
    file: `${BASE}/Registro calificado/Creación de programas — AlgoritmoT.pdf`,
    title: 'Portafolio · Creación de programas académicos',
    summary: 'Portafolio de servicio: acompañamiento integral en creación de programas y registro calificado.',
    line: 'Registro calificado y estudios de mercado',
  },
  {
    file: `${BASE}/ProfeTabla/ProfeTabla_Brochure_AlgoritmoT.pdf`,
    title: 'Portafolio · ProfeTabla',
    summary: 'Brochure de ProfeTabla, la plataforma educativa de Algoritmo T.',
    line: 'Plataformas educativas',
  },
  {
    file: `${BASE}/Plataforma LMS/Plataforma_LMS_AlgoritmoT.pdf`,
    title: 'Portafolio · Plataforma LMS Algoritmo T',
    summary: 'Oferta de plataforma LMS de Algoritmo T: alcance, características y modelo de servicio.',
    line: 'Plataformas educativas · LMS',
  },
]

for (const source of BATCH2) {
  let raw = ''
  try {
    raw = (await extractFile(source.file)).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  } catch (error: any) {
    console.log(`✗ ${source.title}: ${error?.message || error}`)
    continue
  }
  if (raw.length < 200) {
    console.log(`✗ ${source.title}: sin texto aprovechable (${raw.length} caracteres)`) // p. ej. PDF escaneado
    continue
  }
  const header = [
    '[COTIZACIÓN / PORTAFOLIO HISTÓRICO · ALGORITMO T]',
    `Línea de servicio: ${source.line}`,
    `Documento: ${source.title}`,
    'Uso: referencia de alcances, estructura y rangos de precio para cotizaciones de esta línea.',
  ].join('\n')
  const content = `${header}\n\n--- TEXTO DEL DOCUMENTO ---\n\n${raw.slice(0, MAX_CHARS_2)}`

  const existing = await db.quoteKnowledgeDoc.findFirst({ where: { title: source.title } })
  const data = {
    title: source.title,
    kind: 'CASE',
    sourceName: source.file.split('/').slice(-2).join('/'),
    mimeType: source.file.endsWith('.pdf') ? 'application/pdf' : source.file.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/html',
    content,
    summary: source.summary,
    charCount: content.length,
    active: true,
  }
  if (existing) {
    await db.quoteKnowledgeDoc.update({ where: { id: existing.id }, data })
    console.log(`↻ ${source.title} · ${(content.length / 1000).toFixed(1)}k`)
  } else {
    await db.quoteKnowledgeDoc.create({ data })
    console.log(`+ ${source.title} · ${(content.length / 1000).toFixed(1)}k`)
  }
}

const total2 = await db.quoteKnowledgeDoc.count({ where: { active: true } })
console.log(`\nBase de contexto total: ${total2} documentos activos`)
