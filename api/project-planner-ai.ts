import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/prisma.js'
import { generateJsonWithAI, getAiAvailability } from './_lib/ai.js'
import { getGeoFromRequest, safeString } from './_lib/analytics.js'
import { detectNeedType, getComplexityLabel, getNeedLabel, inferComplexity, type ProjectComplexity, type ProjectNeedType } from './_lib/project-planner.js'

type ChatMessage = {
  role?: 'user' | 'assistant'
  content?: string
}

function buildFallbackResponse({
  text,
  selectedNeedType,
}: {
  text: string
  selectedNeedType?: string
}) {
  const needType = detectNeedType(text, selectedNeedType)
  const complexity = inferComplexity(text)
  const normalized = text.toLowerCase()
  const missingInfo: string[] = []

  if (!/(cliente|usuario|equipo|área|area|rol|ventas|operaci[oó]n|admisiones|soporte)/.test(normalized)) missingInfo.push('usuario o equipo impactado')
  if (!/(hoy|actual|manual|excel|correo|whatsapp|crm|sistema)/.test(normalized)) missingInfo.push('cómo se hace hoy')
  if (!/(quiero|necesito|resultado|objetivo|salida|entregar|automatizar|medir)/.test(normalized)) missingInfo.push('resultado esperado')
  if (!/(tiempo|semana|urgente|mes|fecha|antes de)/.test(normalized)) missingInfo.push('urgencia o plazo')

  const followUpQuestions = [
    missingInfo.includes('usuario o equipo impactado') ? '¿Quién va a usar esta solución o qué equipo será el más impactado?' : null,
    missingInfo.includes('cómo se hace hoy') ? '¿Cómo lo hacen hoy y en qué punto aparece el mayor cuello de botella?' : null,
    missingInfo.includes('resultado esperado') ? '¿Qué salida concreta esperas: cotización, tablero, respuestas automáticas, sitio publicado o algo más?' : null,
    missingInfo.includes('urgencia o plazo') ? '¿Para cuándo necesitas tener una primera versión funcionando?' : null,
  ].filter(Boolean) as string[]

  const readyForProposal = missingInfo.length <= 1 && text.trim().length >= 140
  const summary = text.trim().length > 0
    ? text.trim().slice(0, 420)
    : 'Necesidad aún insuficiente para construir una propuesta precisa.'

  return {
    assistantMessage: readyForProposal
      ? `Ya tenemos un nivel de precisión suficiente para bosquejar una propuesta. Clasifiqué tu caso como ${getComplexityLabel(complexity).toLowerCase()} dentro de ${getNeedLabel(needType).toLowerCase()}.`
      : `Voy entendiendo tu necesidad. Por ahora la clasifiqué como ${getComplexityLabel(complexity).toLowerCase()} dentro de ${getNeedLabel(needType).toLowerCase()}, pero todavía necesito uno o dos datos para afinar la propuesta.`,
    summary,
    complexity,
    complexityLabel: getComplexityLabel(complexity),
    detectedNeedType: needType,
    detectedNeedLabel: getNeedLabel(needType),
    missingInfo,
    followUpQuestions,
    readyForProposal,
    providerUsed: 'local' as const,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {}
    const messages = Array.isArray(body.messages) ? body.messages : []
    const selectedNeedType = safeString(body.selectedNeedType, 80)
    const visitorId = safeString(body.visitorId, 120) || 'planner'
    const sessionId = safeString(body.sessionId, 120)

    const trimmedMessages = messages
      .map((message: ChatMessage) => ({
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content: safeString(message?.content, 2000) || '',
      }))
      .filter((message: { content: string }) => message.content)
      .slice(-10)

    if (trimmedMessages.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un mensaje para analizar la necesidad.' })
    }

    const combinedText = trimmedMessages.map((message: { role: string; content: string }) => `${message.role}: ${message.content}`).join('\n')
    let payload = null as null | {
      assistantMessage: string
      summary: string
      complexity: ProjectComplexity
      complexityLabel: string
      detectedNeedType: ProjectNeedType
      detectedNeedLabel: string
      missingInfo: string[]
      followUpQuestions: string[]
      readyForProposal: boolean
      providerUsed: 'openai' | 'gemini' | 'local'
    }

    const availability = await getAiAvailability().catch(() => ({ openai: false, gemini: false }))

    if (availability.openai || availability.gemini) {
      try {
        const prompt = `
Responde solo JSON válido con esta estructura exacta:
{
  "assistantMessage": string,
  "summary": string,
  "complexity": "muy-facil" | "facil" | "moderado" | "complejo" | "muy-complejo",
  "complexityLabel": string,
  "detectedNeedType": "sitio-web" | "automatizacion" | "analitica" | "chatbot" | "otro",
  "detectedNeedLabel": string,
  "missingInfo": string[],
  "followUpQuestions": string[],
  "readyForProposal": boolean
}

Contexto:
- Estás ayudando a planificar un proyecto digital o de automatización.
- Debes hablar en español, con tono consultivo, ejecutivo y claro.
- El usuario puede querer construir un sitio web, automatizar un proceso, hacer analítica de datos o crear un agente/chatbot.
- Tu tarea es pedir precisión suficiente para estimar complejidad y proponer caminos de ejecución.
- La clasificación de complejidad debe ser realista: muy-facil, fácil, moderado, complejo o muy-complejo.
- Debes buscar claridad sobre: quién usa la solución, cómo se hace hoy, qué salida espera, qué herramientas o datos intervienen y qué urgencia existe.
- Marca readyForProposal en true solo cuando ya exista contexto suficiente para armar una propuesta inicial.
- Si aún falta información, assistantMessage debe resumir lo entendido y pedir máximo 3 precisiones.
- Prioriza OpenAI si está disponible.

Perfil del usuario:
Nombre: ${safeString(profile.name, 120) || 'No informado'}
Correo: ${safeString(profile.email, 160) || 'No informado'}
Industria: ${safeString(profile.industry, 120) || 'No informada'}
Necesidad preseleccionada: ${selectedNeedType || 'No definida'}

Conversación:
${combinedText}
        `.trim()

        const preferredProvider = availability.openai ? 'openai' : 'gemini'
        const ai = await generateJsonWithAI({ prompt, provider: preferredProvider, temperature: 0.2, maxTokens: 1000 })
        const data = ai.data && typeof ai.data === 'object' ? ai.data : {}
        const aiComplexity = safeString(data.complexity, 40) as ProjectComplexity | undefined
        const aiNeedType = safeString(data.detectedNeedType, 40) as ProjectNeedType | undefined
        const complexity = aiComplexity && ['muy-facil', 'facil', 'moderado', 'complejo', 'muy-complejo'].includes(aiComplexity)
          ? aiComplexity
          : inferComplexity(combinedText)
        const detectedNeedType = aiNeedType && ['sitio-web', 'automatizacion', 'analitica', 'chatbot', 'otro'].includes(aiNeedType)
          ? aiNeedType
          : detectNeedType(combinedText, selectedNeedType || undefined)

        payload = {
          assistantMessage: safeString(data.assistantMessage, 1200) || buildFallbackResponse({ text: combinedText, selectedNeedType }).assistantMessage,
          summary: safeString(data.summary, 1600) || combinedText.slice(0, 420),
          complexity,
          complexityLabel: safeString(data.complexityLabel, 80) || getComplexityLabel(complexity),
          detectedNeedType,
          detectedNeedLabel: safeString(data.detectedNeedLabel, 120) || getNeedLabel(detectedNeedType),
          missingInfo: Array.isArray(data.missingInfo) ? data.missingInfo.map((item) => safeString(item, 120)).filter(Boolean) as string[] : [],
          followUpQuestions: Array.isArray(data.followUpQuestions)
            ? data.followUpQuestions.map((item) => safeString(item, 220)).filter(Boolean).slice(0, 3) as string[]
            : [],
          readyForProposal: Boolean(data.readyForProposal),
          providerUsed: ai.providerUsed,
        }
      } catch {
        payload = buildFallbackResponse({ text: combinedText, selectedNeedType: selectedNeedType || undefined })
      }
    }

    if (!payload) {
      payload = buildFallbackResponse({ text: combinedText, selectedNeedType: selectedNeedType || undefined })
    }

    try {
      const geo = getGeoFromRequest(req)
      await prisma.analyticsEvent.create({
        data: {
          visitorId,
          sessionId,
          eventType: 'project_planner_ai',
          path: '/planifico-mi-proyecto',
          pageTitle: 'Planifico mi proyecto',
          sectionId: 'planner-ai',
          country: geo.country,
          region: geo.region,
          city: geo.city,
          metadata: {
            industry: safeString(profile.industry, 120),
            selectedNeedType,
            detectedNeedType: payload.detectedNeedType,
            complexity: payload.complexity,
            readyForProposal: payload.readyForProposal,
            providerUsed: payload.providerUsed,
          },
        },
      } as any)
    } catch (analyticsError) {
      console.error('project-planner-ai analytics error', analyticsError)
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('project-planner-ai error', error)
    return res.status(500).json({ error: 'No pudimos analizar la necesidad en este momento.' })
  }
}
