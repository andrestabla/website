/**
 * Learning Builder · asistencia de IA.
 *
 * Dos trabajos, ambos gobernados por las directivas del workspace:
 *
 *  - `draft`: a partir de los insumos del experto disciplinar propone el guion
 *    completo (portada y lecciones en bloques). Solo puede usar los bloques que
 *    el workspace habilita y debe cubrir sus secciones obligatorias.
 *  - `revise`: una petición puntual sobre el guion ya escrito (reescribir un
 *    apartado, añadir una comprobación, resumir un cierre).
 *
 * La IA nunca escribe directo en la base de datos: devuelve una propuesta que
 * el editor muestra para aceptar o descartar. Todo lo que vuelve pasa por el
 * saneador antes de llegar a la UI.
 */
import { generateJsonWithAI } from '../_lib/ai.js'
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { lbDataSources, lbSources, loadResource } from '../_lib/lb-store.js'
import { LB_BLOCK_SPECS, sanitizeContent, validateOva, type LbBlockType } from '../../src/learning/lib/blocks.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'

type VercelRequest = any
type VercelResponse = any

/** Cuánto insumo se le pasa al modelo. Por encima de esto se trunca por documento. */
const SOURCE_BUDGET = 60_000

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Describe al modelo, en su propio lenguaje, los bloques que puede usar. */
function blockGuide(allowed: LbBlockType[]): string {
  return allowed
    .map((type) => {
      const spec = LB_BLOCK_SPECS[type]
      const variants = spec.variants ? ` · variant: ${spec.variants.map((v) => v.value).join(' | ')}` : ''
      const itemFields = spec.itemFields ? ` · items[]: { ${spec.itemFields.join(', ')} }` : ''
      const fields = spec.fields.filter((field) => field !== 'items' && field !== 'piles')
      const own = fields.length ? ` · campos: ${fields.join(', ')}` : ''
      return `- "${type}" (${spec.label}): ${spec.hint}${own}${variants}${itemFields}`
    })
    .join('\n')
}

function rulesGuide(directives: LbDirectives): string {
  const structure = directives.instructional
  const rules = structure.rules
  const ai = structure.ai
  const sections = structure.sections
    .map((section) => `  · ${section.key} → «${section.title}»${section.required ? ' (obligatoria)' : ''}${section.hint ? `: ${section.hint}` : ''}`)
    .join('\n')
  return `Cada lección se llama "${structure.lessonLabel}".
Secciones que debe cubrir el OVA (usa sectionKey con la clave exacta):
${sections}
Entre ${structure.minLessons} y ${structure.maxLessons} lecciones.
Comprobaciones: mínimo ${rules.minChecksPerLesson} por lección y ${rules.minChecksTotal} en total.
Párrafos de máximo ${rules.maxParagraphChars} caracteres.
${rules.requireImageAlt ? 'Toda imagen necesita texto alternativo.' : ''}
${rules.requireCoverSummary ? 'La portada necesita un resumen de presentación.' : ''}
${rules.requireOutcomes ? 'La portada necesita resultados de aprendizaje.' : ''}
Tono: ${ai.tone}
Nivel de lectura: ${ai.readingLevel}
Alrededor de ${ai.blocksPerLesson} bloques por lección.
Norma de citación cuando uses una fuente de datos: ${ai.citationStyle}.
${ai.instructions ? `Manual de estilo del cliente:\n${ai.instructions}` : ''}`
}

const SHAPE = `Devuelve SOLO un objeto JSON con esta forma exacta:
{
  "cover": { "kicker": "", "title": "", "subtitle": "", "summary": "", "outcomes": ["…"] },
  "lessons": [
    { "title": "", "sectionKey": "", "blocks": [ { "type": "", "variant": "", "text": "", "caption": "", "items": [ { "title": "", "description": "" } ] } ] }
  ]
}
Reglas del JSON: sin comentarios, sin campos fuera de los descritos, sin Markdown alrededor.
En el texto puedes usar **negrita** y *cursiva*; nada de HTML.
No inventes cifras, fuentes ni citas que no estén en los insumos.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || 'draft')
  const resourceId = text(body.resourceId, 40)
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

  try {
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)

    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace, directives, content } = loaded

    const check = await guard(req, resource.workspaceId, 'ai.use', gate.session)
    if (!check.ok) return denied(res, check)

    // Las fuentes de datos abiertas del workspace se le nombran a la IA para
    // que sepa de dónde puede tomar cifras y cómo citarlas.
    const dataSources = await lbDataSources().findMany({
      where: { workspaceId: resource.workspaceId, active: true },
      select: { name: true, provider: true, notes: true },
    })
    const dataGuide = dataSources.length
      ? `\n\nFUENTES DE DATOS AUTORIZADAS EN ESTE WORKSPACE (cítalas por su nombre; no inventes cifras que no estén en los insumos):\n${dataSources
          .map((source: any) => `- ${source.name} (${source.provider})${source.notes ? `: ${source.notes}` : ''}`)
          .join('\n')}`
      : ''

    const header = `Eres diseñador instruccional de ${workspace.name}. Construyes un objeto virtual de aprendizaje (OVA) para el curso «${resource.course || '—'}», unidad «${resource.unit || '—'}», titulado «${resource.title}».

BLOQUES DISPONIBLES (no uses ningún otro "type"):
${blockGuide(directives.instructional.blocks)}

DIRECTIVAS INSTRUCCIONALES DE ESTE WORKSPACE:
${rulesGuide(directives)}${dataGuide}

${SHAPE}`

    let prompt = ''

    if (op === 'draft') {
      const ids: string[] = Array.isArray(body.sourceIds) ? body.sourceIds.slice(0, 8).map((id: unknown) => String(id)) : []
      const sources = await lbSources().findMany({
        where: ids.length ? { resourceId, id: { in: ids } } : { resourceId },
        orderBy: { createdAt: 'asc' },
        take: 8,
      })
      if (!sources.length) {
        return res.status(400).json({ ok: false, error: 'Sube al menos un insumo antes de pedir el guion' })
      }
      const perSource = Math.max(4000, Math.floor(SOURCE_BUDGET / sources.length))
      const corpus = sources
        .map((source: any) => `### INSUMO: ${source.name}\n${String(source.text).slice(0, perSource)}`)
        .join('\n\n')

      prompt = `${header}

INSUMOS DEL EXPERTO DISCIPLINAR (única fuente de contenido):
${corpus}

${text(body.instruction, 2000) ? `INDICACIÓN ADICIONAL DEL DISEÑADOR:\n${text(body.instruction, 2000)}\n` : ''}
Escribe el guion completo del OVA a partir de esos insumos: respeta su contenido, reordénalo para que se aprenda y reparte las ideas entre los bloques disponibles. Prefiere prosa completa antes que listas de frases sueltas.`
    } else if (op === 'revise') {
      const instruction = text(body.instruction, 2000)
      if (!instruction) return res.status(400).json({ ok: false, error: 'Dime qué quieres cambiar' })
      prompt = `${header}

GUION ACTUAL:
${JSON.stringify(content).slice(0, 90_000)}

PETICIÓN DEL DISEÑADOR:
${instruction}

Devuelve el guion completo ya modificado, conservando intacto todo lo que la petición no toca.`
    } else {
      return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
    }

    const { providerUsed, data } = await generateJsonWithAI({ prompt, temperature: 0.4, maxTokens: 12_000 })
    const proposal = sanitizeContent(data, directives)
    if (!proposal.lessons.length) {
      return res.status(502).json({ ok: false, error: 'La IA no devolvió un guion utilizable. Reintenta o ajusta la indicación.' })
    }

    return res.status(200).json({
      ok: true,
      providerUsed,
      content: proposal,
      issues: validateOva(proposal, directives),
    })
  } catch (error: any) {
    console.error('api/learning/ai error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
