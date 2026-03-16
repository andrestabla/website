import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Mail,
  Rocket,
  Send,
  Sparkles,
  Wand2,
  Workflow,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { getOrCreateVisitorId, getSessionId } from '../lib/privacyConsent'
import {
  buildLocalPlannerResponse,
  buildPlannerProposals,
  COMPLEXITY_LABELS,
  formatUsd,
  getIndustryLabel,
  getMethodologyLabel,
  getNeedLabel,
  INDUSTRY_OPTIONS,
  KNOWLEDGE_OPTIONS,
  METHODOLOGY_OPTIONS,
  NEED_OPTIONS,
  type MethodologyChoice,
  type PlannerAiPayload,
  type PlannerProfile,
  type ProjectNeedType,
  type SelfServiceAnswers,
} from '../lib/projectPlanner'

type Screen = 'intro' | 'basic' | 'need' | 'methodology' | 'viability' | 'proposal'
type FlowStep = Exclude<Screen, 'intro'>

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const INITIAL_ASSISTANT_MESSAGE =
  'Cuéntame con la mayor precisión posible qué necesitas construir o automatizar. Puedes comenzar con una opción rápida y luego explicar quién usa la solución, cómo se hace hoy y qué resultado esperas.'

const FLOW_STEPS: Array<{ value: FlowStep; label: string; shortLabel: string }> = [
  { value: 'basic', label: 'Datos básicos', shortLabel: 'Datos' },
  { value: 'need', label: 'Necesidad y alcance', shortLabel: 'Alcance' },
  { value: 'methodology', label: 'Metodología', shortLabel: 'Metodología' },
  { value: 'viability', label: 'Viabilidad de ejecución', shortLabel: 'Viabilidad' },
  { value: 'proposal', label: 'Propuesta', shortLabel: 'Propuesta' },
]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const panelClass = 'rounded-[1.75rem] border border-slate-200 bg-white p-7 md:p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)]'
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950'
const backButton =
  'inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-900'

function StepBadge({ step, currentStep }: { step: (typeof FLOW_STEPS)[number]; currentStep: FlowStep }) {
  const currentIndex = FLOW_STEPS.findIndex((item) => item.value === currentStep)
  const stepIndex = FLOW_STEPS.findIndex((item) => item.value === step.value)
  const isActive = currentIndex === stepIndex
  const isDone = currentIndex > stepIndex

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
        isActive && 'border-slate-900 bg-white text-slate-900',
        isDone && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        !isActive && !isDone && 'border-slate-200 bg-white text-slate-500'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black uppercase tracking-[0.14em]',
          isActive && 'bg-slate-900 text-white',
          isDone && 'bg-emerald-500 text-white',
          !isActive && !isDone && 'bg-slate-100 text-slate-500'
        )}
      >
        {isDone ? '✓' : stepIndex + 1}
      </span>
      <span className="text-[11px] font-black uppercase tracking-[0.18em]">{step.shortLabel}</span>
    </div>
  )
}

function MethodologyCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[1.5rem] border p-6 text-left transition-all',
        active ? 'border-slate-900 bg-slate-50 shadow-[0_18px_48px_rgba(15,23,42,0.06)]' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={cn('inline-flex rounded-2xl p-3', active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>
            {icon}
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{title}</h3>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p>
        </div>
        {active && <CheckCircle2 className="h-6 w-6 text-slate-900" />}
      </div>
    </button>
  )
}

function trackPlannerEvent(eventType: string, metadata?: Record<string, unknown>) {
  const visitorId = getOrCreateVisitorId()
  const sessionId = getSessionId()
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      sessionId,
      events: [
        {
          eventType,
          path: '/planifico-mi-proyecto',
          pageTitle: 'Planifico mi proyecto',
          sectionId: 'planner-flow',
          metadata,
        },
      ],
    }),
  }).catch(() => undefined)
}

export default function PlanificoMiProyecto() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [profile, setProfile] = useState<PlannerProfile>({ name: '', email: '', industry: 'otro' })
  const [selectedNeedType, setSelectedNeedType] = useState<ProjectNeedType>('otro')
  const [needDraft, setNeedDraft] = useState('')
  const [conversation, setConversation] = useState<ChatMessage[]>([
    { id: 'assistant-initial', role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE },
  ])
  const [aiState, setAiState] = useState<PlannerAiPayload | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [methodology, setMethodology] = useState<MethodologyChoice | null>(null)
  const [selfServiceAnswers, setSelfServiceAnswers] = useState<SelfServiceAnswers>({
    knowledgeLevel: 'muy-basico',
    hasLicensedAi: true,
    willingToPayTools: true,
  })
  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const conversationEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [screen])

  useEffect(() => {
    if (screen === 'need') {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [conversation, aiLoading, screen])

  const currentStep = screen === 'intro' ? 'basic' : screen
  const currentStepIndex = FLOW_STEPS.findIndex((item) => item.value === currentStep)

  const canContinueBasic = useMemo(() => {
    const emailOk = /.+@.+\..+/.test(profile.email)
    return profile.name.trim().length >= 3 && emailOk && Boolean(profile.industry)
  }, [profile])

  const canContinueNeed = Boolean(aiState?.summary?.trim())
  const requiresSelfServiceQuestions = methodology === 'hazlo-tu-mismo' || methodology === 'ambas'

  const proposals = useMemo(() => {
    if (!aiState || !methodology) return null
    return buildPlannerProposals({
      complexity: aiState.complexity,
      methodology,
      selfServiceAnswers: requiresSelfServiceQuestions ? selfServiceAnswers : null,
    })
  }, [aiState, methodology, requiresSelfServiceQuestions, selfServiceAnswers])

  const methodologyMeta: Record<MethodologyChoice, { icon: ReactNode; eyebrow: string; title: string; description: string }> = {
    'hazlo-tu-mismo': {
      icon: <Wand2 className="h-6 w-6" />,
      eyebrow: 'Ruta guiada',
      title: 'Construye con criterio y acompañamiento real.',
      description:
        'Validemos si tienes la base técnica y operativa para avanzar con sesiones guiadas, herramientas adecuadas y decisiones bien orientadas.',
    },
    'algoritmot-por-mi': {
      icon: <Building2 className="h-6 w-6" />,
      eyebrow: 'Ruta ejecutada por el equipo',
      title: 'Delega la ejecución sin perder control.',
      description:
        'En esta ruta la viabilidad depende de claridad de requerimientos, accesos y tiempos de decisión. No necesitas asumir la construcción operativa.',
    },
    ambas: {
      icon: <Workflow className="h-6 w-6" />,
      eyebrow: 'Comparativo',
      title: 'Compara las dos rutas antes de invertir.',
      description:
        'Evaluemos si la ruta Hazlo tú mismo es realmente viable para ti y, al mismo tiempo, dejemos lista la alternativa ejecutada por AlgoritmoT.',
    },
  }

  const selectedMethodologyMeta = methodology ? methodologyMeta[methodology] : null

  const goToScreen = (next: Screen) => {
    setError(null)
    setScreen(next)
  }

  const handleNeedOption = (value: ProjectNeedType) => {
    setSelectedNeedType(value)
    const option = NEED_OPTIONS.find((item) => item.value === value)
    if (option?.prompt) {
      setNeedDraft(option.prompt)
    }
  }

  const handleNeedSubmit = async () => {
    const content = needDraft.trim()
    if (!content) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    const nextConversation = [...conversation, userMessage]
    setConversation(nextConversation)
    setNeedDraft('')
    setAiLoading(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/project-planner-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          selectedNeedType,
          messages: nextConversation.map((message) => ({ role: message.role, content: message.content })),
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) {
        throw new Error(data?.error || 'No pudimos analizar la necesidad en este momento.')
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.assistantMessage,
      }

      setConversation([...nextConversation, assistantMessage])
      setAiState(data)
      setSelectedNeedType(data.detectedNeedType)
      trackPlannerEvent('project_planner_ai_client', {
        complexity: data.complexity,
        needType: data.detectedNeedType,
        readyForProposal: data.readyForProposal,
      })
    } catch {
      const fallback = buildLocalPlannerResponse({
        text: content,
        selectedNeedType,
      })

      const assistantMessage: ChatMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: 'assistant',
        content: `${fallback.assistantMessage} Esta lectura se generó con un análisis local para no detener tu flujo.`,
      }

      setConversation([...nextConversation, assistantMessage])
      setAiState({
        ...fallback,
        assistantMessage: assistantMessage.content,
      })
      setSelectedNeedType(fallback.detectedNeedType)
      setNotice('Usamos una lectura rápida local porque el análisis extendido no respondió a tiempo. Puedes continuar sin perder información.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleMethodologyContinue = () => {
    if (!methodology) return
    trackPlannerEvent('project_planner_methodology_selected', { methodology })
    goToScreen('viability')
  }

  const handleViabilityContinue = () => {
    if (!methodology) return
    trackPlannerEvent('project_planner_results_generated', {
      methodology,
      complexity: aiState?.complexity,
      knowledgeLevel: requiresSelfServiceQuestions ? selfServiceAnswers.knowledgeLevel : undefined,
      hasLicensedAi: requiresSelfServiceQuestions ? selfServiceAnswers.hasLicensedAi : undefined,
      willingToPayTools: requiresSelfServiceQuestions ? selfServiceAnswers.willingToPayTools : undefined,
    })
    goToScreen('proposal')
  }

  const handleSendProposal = async () => {
    if (!aiState || !methodology || !proposals) return
    setEmailSending(true)
    setError(null)
    setNotice(null)
    setEmailSuccess(false)

    try {
      const response = await fetch('/api/project-planner-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          industryLabel: getIndustryLabel(profile.industry),
          needSummary: aiState.summary,
          methodology,
          complexity: aiState.complexity,
          complexityLabel: aiState.complexityLabel,
          proposals,
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'No pudimos enviar la propuesta por correo.')
      }
      setEmailSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar la propuesta por correo.')
    } finally {
      setEmailSending(false)
    }
  }

  const whatsappHref = useMemo(() => {
    const summary = aiState?.summary ? `Resumen: ${aiState.summary}` : 'Quiero revisar mi proyecto'
    const text = encodeURIComponent(`Hola, quiero revisar mi proyecto. ${summary}`)
    return `https://wa.me/573044544525?text=${text}`
  }, [aiState?.summary])

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {screen === 'intro' ? (
          <section className="px-6 py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <Link
                to="/empresas"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver a empresas
              </Link>

              <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)] md:p-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-800">
                    <Sparkles className="h-4 w-4" />
                    Asistente IA de planeación
                  </div>
                  <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-900 md:text-7xl">
                    Planifico mi proyecto
                  </h1>
                  <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 md:text-[1.15rem]">
                    Define con claridad qué necesitas construir, qué tan complejo es, qué camino te conviene y cuánto podría costar antes de comprometer tiempo o presupuesto.
                  </p>
                  <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {[
                      'Una lectura inicial del alcance con apoyo de IA.',
                      'Una recomendación de ruta: tú construyes o nosotros lo hacemos por ti.',
                      'Una propuesta inicial con tiempo, sesiones e inversión estimada.',
                    ].map((item) => (
                      <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-relaxed text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        goToScreen('basic')
                        trackPlannerEvent('project_planner_started')
                      }}
                      className={primaryButton}
                    >
                      Iniciar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link to="/hazlo-tu-mismo" className={secondaryButton}>
                      Conocer metodología
                    </Link>
                  </div>
                </div>

                <aside className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)] md:p-10">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Flujo de la experiencia</p>
                  <div className="mt-6 space-y-4">
                    {[
                      'Presentación',
                      'Datos básicos',
                      'Necesidad y alcance',
                      'Metodología',
                      'Viabilidad de ejecución',
                      'Propuesta',
                    ].map((item, index) => (
                      <div key={item} className="flex items-start gap-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                        <div>
                          <p className="text-sm font-black tracking-tight text-slate-900">{item}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {index === 0 && 'Entiendes qué resolveremos antes de comenzar.'}
                            {index === 1 && 'Recogemos contexto mínimo para personalizar la propuesta.'}
                            {index === 2 && 'La IA ayuda a precisar la necesidad y la complejidad.'}
                            {index === 3 && 'Eliges si construyes contigo, con nosotros o comparas ambas rutas.'}
                            {index === 4 && 'Validamos si la ejecución es viable según tu escenario.'}
                            {index === 5 && 'Recibes tiempo e inversión estimada para avanzar.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </section>
        ) : (
          <section className="px-6 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button type="button" onClick={() => goToScreen('intro')} className={backButton}>
                  <ChevronLeft className="h-4 w-4" />
                  Volver a presentación
                </button>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Pantalla {currentStepIndex + 2} de 6
                </div>
              </div>

              <div className="-mx-2 mt-6 overflow-x-auto px-2 pb-1">
                <div className="grid min-w-[760px] gap-3 md:min-w-0 md:grid-cols-5">
                  {FLOW_STEPS.map((item) => (
                    <StepBadge key={item.value} step={item} currentStep={currentStep} />
                  ))}
                </div>
              </div>

              <div className="mt-8">
                {screen === 'basic' && (
                  <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
                    <div className={panelClass}>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">Segunda pantalla</p>
                      <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Datos básicos para personalizar la propuesta.</h2>
                      <p className="mt-4 text-lg leading-relaxed text-slate-600">
                        Solo necesitamos tres datos para contextualizar la recomendación y enviarte después la propuesta al correo correcto.
                      </p>
                      <div className="mt-8 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
                        <p>Usamos tu industria para aterrizar mejor ejemplos y ruta sugerida.</p>
                        <p>El correo se usa para entregarte la propuesta y dar continuidad si decides avanzar.</p>
                      </div>
                    </div>

                    <div className={panelClass}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Nombre</span>
                          <input
                            value={profile.name}
                            onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Tu nombre o el de tu empresa"
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-base text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:bg-white"
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Correo electrónico</span>
                          <input
                            type="email"
                            value={profile.email}
                            onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                            placeholder="tu@correo.com"
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-base text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:bg-white"
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Industria o sector</span>
                          <select
                            value={profile.industry}
                            onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value as PlannerProfile['industry'] }))}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-base text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:bg-white"
                          >
                            {INDUSTRY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                        <button type="button" onClick={() => goToScreen('intro')} className={backButton}>
                          <ChevronLeft className="h-4 w-4" />
                          Volver
                        </button>
                        <button type="button" disabled={!canContinueBasic} onClick={() => goToScreen('need')} className={primaryButton}>
                          Continuar
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {screen === 'need' && (
                  <div className="space-y-6">
                    <div className={panelClass}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 text-cyan-700">
                            <BrainCircuit className="h-6 w-6" />
                            <p className="text-[11px] font-black uppercase tracking-[0.24em]">Tercera pantalla</p>
                          </div>
                          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Necesidad y alcance.</h2>
                          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
                            En esta pantalla trabajamos como conversación. Cuéntame qué necesitas, la IA te hará preguntas para precisar el caso y solo avanzamos cuando tengamos una lectura útil.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {aiState?.providerUsed && (
                            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                              {aiState.providerUsed === 'openai'
                                ? 'OpenAI'
                                : aiState.providerUsed === 'gemini'
                                  ? 'Gemini'
                                  : 'Lectura local'}
                            </span>
                          )}
                          {aiState?.complexity && (
                            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-800">
                              {aiState.complexityLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={panelClass}>
                      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Conversación guiada</p>
                            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Trabajemos tu caso como si ya estuviéramos en sesión.</h3>
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Paso a paso
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Opciones rápidas para empezar</p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {NEED_OPTIONS.map((option) => {
                              const active = selectedNeedType === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleNeedOption(option.value)}
                                  className={cn(
                                    'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
                                    active
                                      ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                  )}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white">
                          <div className="max-h-[52vh] min-h-[320px] space-y-4 overflow-y-auto p-4 md:max-h-[60vh] md:p-5">
                            {conversation.map((message) => (
                              <div
                                key={message.id}
                                className={cn(
                                  'max-w-[92%] rounded-[1.5rem] px-4 py-4 text-sm leading-relaxed shadow-sm md:max-w-[80%] md:px-5',
                                  message.role === 'assistant'
                                    ? 'border border-slate-200 bg-slate-50 text-slate-700'
                                    : 'ml-auto bg-slate-950 text-white'
                                )}
                              >
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                  {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                                  {message.role === 'assistant' ? 'Asistente IA' : 'Tú'}
                                </div>
                                <p>{message.content}</p>
                              </div>
                            ))}

                            {aiLoading && (
                              <div className="max-w-[92%] rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 shadow-sm md:max-w-[80%] md:px-5">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Asistente IA
                                </div>
                                <p className="mt-2">Estoy leyendo tu caso y afinando la siguiente pregunta útil...</p>
                              </div>
                            )}
                            <div ref={conversationEndRef} />
                          </div>

                          <div className="border-t border-slate-200 bg-slate-50/70 p-4 md:p-5">
                            <textarea
                              value={needDraft}
                              onChange={(event) => setNeedDraft(event.target.value)}
                              rows={5}
                              placeholder="Escríbeme qué necesitas, cómo se hace hoy, quién usa la solución, qué resultado esperas y para cuándo lo necesitas."
                              className="w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-base leading-relaxed text-slate-900 outline-none transition-colors focus:border-cyan-400"
                            />

                            {aiState?.followUpQuestions.length ? (
                              <div className="mt-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Conviene responder ahora</p>
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {aiState.followUpQuestions.map((question) => (
                                    <button
                                      key={question}
                                      type="button"
                                      onClick={() => setNeedDraft(question)}
                                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm leading-relaxed text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                                    >
                                      {question}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm leading-relaxed text-slate-500">
                                Mientras más contexto des, mejor será la clasificación y la propuesta.
                              </p>
                              <button type="button" onClick={handleNeedSubmit} disabled={aiLoading || !needDraft.trim()} className={cn(primaryButton, 'w-full sm:w-auto')}>
                                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Enviar mensaje
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {aiState && (
                        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Tipo detectado</p>
                            <p className="mt-2 text-xl font-black tracking-tight text-slate-900">{aiState.detectedNeedLabel}</p>
                            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Resumen actual</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{aiState.summary}</p>
                          </div>
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Estado de la conversación</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                              {aiState.readyForProposal
                                ? 'Ya hay suficiente información para avanzar a la definición de metodología.'
                                : 'Aún conviene seguir conversando uno o dos turnos más para afinar la propuesta.'}
                            </p>
                            {aiState.missingInfo.length > 0 && (
                              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                                {aiState.missingInfo.map((item) => (
                                  <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="button" onClick={() => goToScreen('basic')} className={backButton}>
                          <ChevronLeft className="h-4 w-4" />
                          Volver
                        </button>
                        <button type="button" disabled={!canContinueNeed} onClick={() => goToScreen('methodology')} className={cn(primaryButton, 'w-full sm:w-auto')}>
                          Continuar
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {screen === 'methodology' && (
                  <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
                    <div className={panelClass}>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">Cuarta pantalla</p>
                      <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Elige la metodología.</h2>
                      <p className="mt-4 text-lg leading-relaxed text-slate-600">
                        Ya entendemos el caso. Ahora define si quieres construir con acompañamiento, delegar el desarrollo o comparar ambas rutas antes de tomar una decisión.
                      </p>
                      {aiState && (
                        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Lectura actual</p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-800">{aiState.complexityLabel}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{aiState.detectedNeedLabel}</span>
                          </div>
                          <p className="mt-4 text-sm leading-relaxed text-slate-600">{aiState.summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-5">
                      {METHODOLOGY_OPTIONS.map((option) => {
                        const icons: Record<MethodologyChoice, ReactNode> = {
                          'hazlo-tu-mismo': <Wand2 className="h-6 w-6" />,
                          'algoritmot-por-mi': <Building2 className="h-6 w-6" />,
                          ambas: <Workflow className="h-6 w-6" />,
                        }
                        return (
                          <MethodologyCard
                            key={option.value}
                            active={methodology === option.value}
                            icon={icons[option.value]}
                            title={option.label}
                            description={option.description}
                            onClick={() => setMethodology(option.value)}
                          />
                        )
                      })}

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <button type="button" onClick={() => goToScreen('need')} className={backButton}>
                          <ChevronLeft className="h-4 w-4" />
                          Volver
                        </button>
                        <button type="button" disabled={!methodology} onClick={handleMethodologyContinue} className={primaryButton}>
                          Continuar
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {screen === 'viability' && methodology && (
                  <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
                    <div className={panelClass}>
                      <div className="flex items-center gap-3 text-cyan-700">
                        {selectedMethodologyMeta?.icon}
                        <p className="text-[11px] font-black uppercase tracking-[0.24em]">Quinta pantalla</p>
                      </div>
                      <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Viabilidad de ejecución.</h2>
                      <p className="mt-4 text-lg leading-relaxed text-slate-600">{selectedMethodologyMeta?.description}</p>

                      {methodology === 'algoritmot-por-mi' && (
                        <div className="mt-8 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
                          <p>En esta ruta no necesitas licencias de IA ni asumir infraestructura desde el primer momento.</p>
                          <p>La propuesta formal dependerá del levantamiento detallado de requerimientos, accesos, integraciones y criterio de aceptación.</p>
                          <p>La pantalla siguiente te mostrará tiempo e inversión estimada para tomar una decisión inicial.</p>
                        </div>
                      )}

                      {methodology === 'ambas' && (
                        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
                          Evaluaremos si la ruta <strong>Hazlo tú mismo</strong> es viable para ti. En la propuesta también verás la alternativa <strong>AlgoritmoT lo hace por ti</strong> para comparar ambos escenarios con claridad.
                        </div>
                      )}
                    </div>

                    <div className={panelClass}>
                      {requiresSelfServiceQuestions ? (
                        <div className="grid gap-8">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">4.1 Conocimientos actuales</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              {KNOWLEDGE_OPTIONS.map((option) => {
                                const active = selfServiceAnswers.knowledgeLevel === option.value
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelfServiceAnswers((current) => ({ ...current, knowledgeLevel: option.value }))}
                                    className={cn(
                                      'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
                                      active ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">4.2 ¿Tienes acceso a Claude, GPT o Gemini con licencia?</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              {[
                                { label: 'Sí', value: true },
                                { label: 'No', value: false },
                              ].map((option) => {
                                const active = selfServiceAnswers.hasLicensedAi === option.value
                                return (
                                  <button
                                    key={String(option.value)}
                                    type="button"
                                    onClick={() => setSelfServiceAnswers((current) => ({ ...current, hasLicensedAi: option.value }))}
                                    className={cn(
                                      'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
                                      active ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">4.3 ¿Estás dispuesto a asumir herramientas adicionales entre USD 10 y USD 30 al mes?</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              {[
                                { label: 'Sí', value: true },
                                { label: 'No', value: false },
                              ].map((option) => {
                                const active = selfServiceAnswers.willingToPayTools === option.value
                                return (
                                  <button
                                    key={String(option.value)}
                                    type="button"
                                    onClick={() => setSelfServiceAnswers((current) => ({ ...current, willingToPayTools: option.value }))}
                                    className={cn(
                                      'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
                                      active ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {(!selfServiceAnswers.hasLicensedAi || !selfServiceAnswers.willingToPayTools) && (
                            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-900">
                              <p className="text-[11px] font-black uppercase tracking-[0.18em]">Lectura de viabilidad</p>
                              <p className="mt-3 text-sm leading-relaxed">
                                Con estas respuestas, la ruta más recomendable probablemente será <strong>AlgoritmoT lo hace por ti</strong>. Aun así, en la pantalla siguiente te mostraremos el comparativo completo.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {[
                            'Nuestro equipo asume la arquitectura, la construcción y la coordinación de herramientas necesarias.',
                            'Lo que realmente necesitamos de tu lado es claridad de objetivo, feedback oportuno y acceso a la información crítica del proceso.',
                            'La siguiente pantalla te dará un rango inicial de tiempo e inversión para decidir si vale la pena avanzar a cotización formal.',
                          ].map((item) => (
                            <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-relaxed text-slate-700">
                              {item}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                        <button type="button" onClick={() => goToScreen('methodology')} className={backButton}>
                          <ChevronLeft className="h-4 w-4" />
                          Volver
                        </button>
                        <button type="button" onClick={handleViabilityContinue} className={primaryButton}>
                          Ver propuesta
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {screen === 'proposal' && aiState && methodology && proposals && (
                  <div className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
                      <div className={panelClass}>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">Sexta pantalla</p>
                        <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Propuesta inicial.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                          Esta lectura te da una base razonable para decidir si avanzar, comparar caminos o pedir una cotización formal más detallada.
                        </p>

                        <div className="mt-8 grid gap-4">
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Resumen</p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-700">{aiState.summary}</p>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Complejidad</p>
                              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{aiState.complexityLabel}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tipo</p>
                              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{aiState.detectedNeedLabel}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Metodología</p>
                              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{getMethodologyLabel(methodology)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        {proposals.selfService && (
                          <article
                            className={cn(
                              'rounded-[1.75rem] border p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)]',
                              proposals.selfService.eligible ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">
                                  <Wand2 className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Hazlo tú mismo</h3>
                              </div>
                              {proposals.selfService.eligible ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                                  Viable
                                </span>
                              ) : (
                                <span className="rounded-full border border-amber-300 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                                  No recomendado
                                </span>
                              )}
                            </div>

                            <p className="mt-5 text-sm leading-relaxed text-slate-700">{proposals.selfService.reason}</p>

                            {proposals.selfService.eligible && (
                              <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sesiones</p>
                                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{proposals.selfService.sessions}</p>
                                </div>
                                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Valor sesión</p>
                                  <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{formatUsd(proposals.selfService.ratePerSessionUsd || 0)}</p>
                                </div>
                                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Inversión</p>
                                  <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{formatUsd(proposals.selfService.investmentUsd || 0)}</p>
                                </div>
                              </div>
                            )}

                            <p className="mt-5 text-sm leading-relaxed text-slate-600">{proposals.selfService.note}</p>
                          </article>
                        )}

                        {proposals.doneForYou && (
                          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                            <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">
                              <Building2 className="h-6 w-6" />
                            </div>
                            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900">AlgoritmoT lo hace por ti</h3>
                            <p className="mt-5 text-sm leading-relaxed text-slate-700">
                              Ruta pensada para avanzar más rápido y con menor carga operativa interna. Nuestro equipo estructura, construye e implementa la solución contigo.
                            </p>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tiempo estimado</p>
                                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{proposals.doneForYou.timeline}</p>
                              </div>
                              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Inversión</p>
                                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatUsd(proposals.doneForYou.investmentUsd)}</p>
                              </div>
                            </div>
                            <p className="mt-5 text-sm leading-relaxed text-slate-600">{proposals.doneForYou.note}</p>
                          </article>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-8 rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">Siguiente paso</p>
                        <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Envíate la propuesta o habla con un asesor.</h3>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                          La inversión es aproximada. La cotización formal se presenta cuando levantamos requerimientos específicos, integraciones y criterios de aceptación.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{getIndustryLabel(profile.industry)}</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{getNeedLabel(aiState.detectedNeedType)}</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{COMPLEXITY_LABELS[aiState.complexity]}</span>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <button type="button" onClick={handleSendProposal} disabled={emailSending} className={cn(primaryButton, 'w-full')}>
                          {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          Enviarme la propuesta
                        </button>
                        <a href={whatsappHref} target="_blank" rel="noreferrer" className={cn(secondaryButton, 'w-full')}>
                          <BadgeDollarSign className="h-4 w-4" />
                          Contactar a un asesor
                        </a>
                        {emailSuccess && (
                          <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                            Te enviamos la propuesta a <strong>{profile.email}</strong>.
                          </div>
                        )}
                        <button type="button" onClick={() => goToScreen('viability')} className={backButton}>
                          <ChevronLeft className="h-4 w-4" />
                          Ajustar respuestas
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {notice && (
                <div className="mt-8 rounded-[1.5rem] border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-900">
                  {notice}
                </div>
              )}

              {error && (
                <div className="mt-8 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
                  {error}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </Layout>
  )
}
