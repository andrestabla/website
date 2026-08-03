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
