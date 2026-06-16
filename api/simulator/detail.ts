import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateJsonWithAI } from '../_lib/ai.js'
import { getHeadcountLabel, getMaturityLabel } from '../_lib/simulator.js'

export const maxDuration = 30

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const { kind, item, phaseName, phaseTagline, sector, orgType, headcount, maturity } = body
    const orgContext = typeof body.orgContext === 'string' ? body.orgContext.slice(0, 1500) : ''

    if (!item || (kind !== 'intervention' && kind !== 'product')) {
      return res.status(400).json({ error: 'Datos insuficientes para el detalle' })
    }

    const headcountLabel = getHeadcountLabel(String(headcount || ''))
    const maturityLabel = getMaturityLabel(String(maturity || ''))

    const subject =
      kind === 'intervention'
        ? `esta INTERVENCIÓN / actividad de consultoría: "${item}"`
        : `este PRODUCTO / entregable: "${item}"`

    const guidance =
      kind === 'intervention'
        ? 'Explica qué se hace exactamente, cómo se ejecuta (método, pasos, herramientas) y qué obtiene la organización. Los ejemplos deben mostrar cómo se vería esta actividad aplicada al cliente.'
        : 'Explica qué es el entregable, qué contiene/incluye y cómo lo usaría la organización. Los ejemplos deben ser muestras concretas de lo que tendría ese producto para este cliente.'

    const prompt = `
Eres Atenea, consultora senior de transformación digital de AlgoritmoT. Hablas en español natural y profesional, sin clichés ni muletillas de IA (no uses "en la era digital", "desbloquear el potencial", "robusto", "sin fisuras", "de vanguardia", ni rayas decorativas).

Contexto del cliente:
- Sector: ${sector || 'No definido'}
- Tipo de organización: ${orgType || 'No definido'}
- Tamaño: ${headcountLabel}
- Madurez digital: ${maturityLabel}
- Fase del servicio: ${phaseName || ''} (${phaseTagline || ''})
${orgContext ? `- En sus palabras sobre su organización: "${orgContext}"` : ''}

Profundiza en ${subject}.
${guidance}
Sé específico de este sector y tamaño; nada genérico. Mantén un tono consultivo y aterrizado.

Devuelve SOLO JSON con esta estructura EXACTA:
{
  "title": "título corto del ítem",
  "paragraphs": ["párrafo 1", "párrafo 2", "párrafo 3 (opcional)"],
  "examples": ["ejemplo concreto 1", "ejemplo concreto 2", "ejemplo concreto 3"]
}
- 2 a 3 párrafos claros (cada uno 2-4 frases).
- 2 a 4 ejemplos concretos y específicos del sector.
`

    const { data, providerUsed } = await generateJsonWithAI({
      prompt,
      temperature: 0.5,
      maxTokens: 1000,
    })

    const toStr = (v: unknown) => (typeof v === 'string' ? v : '')
    const toArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 6) : [])

    const detail = {
      title: toStr(data?.title) || String(item),
      paragraphs: toArr(data?.paragraphs),
      examples: toArr(data?.examples),
    }

    return res.status(200).json({ success: true, detail, providerUsed })
  } catch (error: any) {
    console.error('simulator/detail API Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
