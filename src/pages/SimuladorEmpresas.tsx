import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import {
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Check,
  CheckCircle2,
  Building2,
  Users,
  Layers,
  Gauge,
  Mail,
  X,
  Send,
  Wrench,
  Package,
  TrendingUp,
  Bot,
  Info,
  ChevronRight,
  ListChecks,
  Cog,
  ScanSearch,
  Workflow,
  Scale,
  Code2,
  Rocket,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { getOrCreateVisitorId, getSessionId } from '../lib/privacyConsent'
import { MethodologyChatbot } from '../components/MethodologyChatbot'
import {
  SIMULATOR_PHASES,
  SIMULATOR_SECTORS,
  SIMULATOR_ORG_TYPES,
  SIMULATOR_HEADCOUNTS,
  SIMULATOR_MATURITIES,
  formatUsd,
  formatUsdRange,
  type SimulatorProposal,
  type SimulatorProposalPhase,
  type MaturityDiagnostic,
} from '../data/simulatorPhases'

const PHASE_ICONS: Record<string, LucideIcon> = {
  ScanSearch,
  Workflow,
  Scale,
  Code2,
  Rocket,
  RefreshCw,
}

const AGENT_NAME = 'Atenea'

const THINKING_MESSAGES = [
  'Analizando tu sector y modelo de negocio…',
  'Estimando procesos y soluciones digitales…',
  'Dimensionando la inversión por fase…',
  'Redactando los productos para tu organización…',
]

const MD_LEVEL_STYLES: Record<string, { label: string; badge: string; text: string }> = {
  bajo: { label: 'Bajo', badge: 'bg-red-50 text-red-600 border-red-200', text: 'text-red-600' },
  intermedio: { label: 'Intermedio', badge: 'bg-amber-50 text-amber-600 border-amber-200', text: 'text-amber-600' },
  alto: { label: 'Alto', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', text: 'text-emerald-600' },
}

type Step = 'intro' | 'sector' | 'orgType' | 'headcount' | 'maturity' | 'loading' | 'phase' | 'summary'

function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        visitorId: getOrCreateVisitorId(),
        sessionId: getSessionId(),
        events: [
          {
            eventType,
            path: '/empresas/simulador',
            pageTitle: 'Simulador de Transformación Digital',
            sectionId: 'simulador',
            metadata: metadata || {},
          },
        ],
      }),
    }).catch(() => {})
  } catch {
    // fire and forget
  }
}

function moneyLabel(phase: SimulatorProposalPhase) {
  return phase.recurring
    ? `${formatUsdRange(phase.investment.min, phase.investment.max)} / mes`
    : formatUsdRange(phase.investment.min, phase.investment.max)
}

function AgentAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <div className={`relative flex ${dim} flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-brand-primary`}>
      <Bot className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
    </div>
  )
}

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <AgentAvatar />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">{AGENT_NAME} · Agente IA</div>
        <div className="mt-1 leading-relaxed text-slate-700">{children}</div>
      </div>
    </div>
  )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-7 rounded-full transition-colors duration-500 ${
            i <= current ? 'bg-brand-secondary' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function OptionGrid({
  options,
  onSelect,
  columns = 3,
}: {
  options: Array<{ value: string; label: string }>
  onSelect: (value: string) => void
  columns?: number
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns >= 3 ? 'lg:grid-cols-3' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5 text-left text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-secondary hover:bg-blue-50/60 hover:text-slate-900 active:scale-95"
        >
          {opt.label}
          <ArrowRight className="h-4 w-4 text-brand-secondary opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  )
}

function PhaseRail({
  phases,
  current,
  onSelect,
}: {
  phases: SimulatorProposalPhase[]
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="-mx-6 mb-12 overflow-x-auto px-6 pb-2">
      <div className="flex min-w-max items-start">
        {phases.map((phase, i) => {
          const Icon = PHASE_ICONS[SIMULATOR_PHASES[i]?.icon] || Layers
          const isDone = i < current
          const isCurrent = i === current
          return (
            <div key={phase.id} className="flex items-start">
              <button
                onClick={() => onSelect(i)}
                className="group flex w-24 flex-col items-center gap-3 text-center sm:w-28"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                    isCurrent
                      ? 'border-brand-secondary bg-blue-50 text-brand-primary shadow-[0_0_0_4px_rgba(37,99,235,0.08)]'
                      : isDone
                        ? 'border-brand-secondary bg-brand-secondary text-white'
                        : 'border-slate-300 bg-white text-slate-400 group-hover:border-slate-400'
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isCurrent ? 'text-brand-secondary' : 'text-slate-400'
                    }`}
                  >
                    Fase {phase.index}
                  </span>
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent ? 'text-slate-900' : isDone ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {phase.name}
                  </span>
                </div>
              </button>
              {i < phases.length - 1 && (
                <div
                  className={`mt-6 h-0.5 w-6 flex-shrink-0 rounded sm:w-10 ${
                    i < current ? 'bg-brand-secondary' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MD_SHORT_NAMES: Record<string, string> = {
  estrategia: 'Estrategia',
  infra: 'Infraestructura',
  talento: 'Talento',
  gob: 'Gobernanza',
  procesos: 'Procesos',
  cx: 'Experiencia',
}

function MaturityDiagnosticView({ diagnostic }: { diagnostic: MaturityDiagnostic }) {
  const radarData = diagnostic.dimensions.map((d) => ({
    dimension: MD_SHORT_NAMES[d.id] || d.name,
    Tú: d.score,
    Benchmark: d.benchmark,
  }))

  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-brand-secondary" />
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-600">Diagnóstico de Madurez Digital (MD-IA)</h4>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
          Ejemplo ilustrativo
        </span>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-amber-800">
          Esto es un <strong>ejemplo simulado</strong> a partir del nivel de madurez que indicaste, no un diagnóstico real.
          El diagnóstico MD-IA real se realiza en la Fase 1 con encuestas a tu equipo, entrevistas y análisis de tus datos,
          comparando contra benchmarks de tu sector.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} outerRadius="68%" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#475569', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} />
              <Radar name="Benchmark" dataKey="Benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} />
              <Radar name="Tú" dataKey="Tú" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
              <Legend formatter={(value) => <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{value}</span>} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12, color: '#0f172a' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-brand-primary p-5 text-center text-white">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200">DQ</div>
              <div className="mt-1 text-3xl font-black">{diagnostic.dq}</div>
              <div className="text-[10px] text-blue-200/80">Digital Quotient</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AIQ</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{diagnostic.aiq}</div>
              <div className="text-[10px] text-slate-400">AI Quotient</div>
            </div>
          </div>
          {diagnostic.summary && <p className="text-sm leading-relaxed text-slate-600">{diagnostic.summary}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {diagnostic.dimensions.map((d) => {
          const style = MD_LEVEL_STYLES[d.level] || MD_LEVEL_STYLES.intermedio
          return (
            <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{d.name}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${style.badge}`}>
                  {style.label}
                </span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className={`text-2xl font-black ${style.text}`}>{d.score}</span>
                <span className="mb-0.5 text-xs text-slate-400">/ 100 · bench {d.benchmark}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${Math.min(100, d.score)}%` }} />
              </div>
              {d.interpretation && <p className="mt-3 text-xs leading-relaxed text-slate-500">{d.interpretation}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SimuladorEmpresas() {
  const [step, setStep] = useState<Step>('intro')
  const [sector, setSector] = useState('')
  const [orgType, setOrgType] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [maturity, setMaturity] = useState('')
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [proposal, setProposal] = useState<SimulatorProposal | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thinkingIdx, setThinkingIdx] = useState(0)

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Drawer lateral de detalle por ítem (intervención / producto)
  const [detailItem, setDetailItem] = useState<{ kind: 'intervention' | 'product'; item: string } | null>(null)
  const [detailData, setDetailData] = useState<{ title: string; paragraphs: string[]; examples: string[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const detailCacheRef = useRef<Map<string, { title: string; paragraphs: string[]; examples: string[] }>>(new Map())

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step, phaseIndex])

  useEffect(() => {
    if (step !== 'loading') return
    const id = window.setInterval(() => setThinkingIdx((i) => (i + 1) % THINKING_MESSAGES.length), 1800)
    return () => window.clearInterval(id)
  }, [step])

  const headcountLabel = useMemo(
    () => SIMULATOR_HEADCOUNTS.find((h) => h.value === headcount)?.label || headcount,
    [headcount]
  )
  const maturityLabel = useMemo(
    () => SIMULATOR_MATURITIES.find((m) => m.value === maturity)?.label || maturity,
    [maturity]
  )

  const accumulatedProject = useMemo(() => {
    if (!proposal) return { min: 0, max: 0 }
    return proposal.phases
      .slice(0, phaseIndex + 1)
      .filter((p) => !p.recurring)
      .reduce((acc, p) => ({ min: acc.min + p.investment.min, max: acc.max + p.investment.max }), { min: 0, max: 0 })
  }, [proposal, phaseIndex])

  const handleGenerate = async (selectedMaturity: string) => {
    setStep('loading')
    setThinkingIdx(0)
    setError(null)
    try {
      const res = await fetch('/api/simulator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector,
          orgType,
          headcount,
          maturity: selectedMaturity,
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
        }),
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('El servidor tardó demasiado o devolvió un formato inválido. Intenta de nuevo.')
      }
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la propuesta')
      setProposal(data.proposal)
      setRunId(data.runId || null)
      setPhaseIndex(0)
      setDirection('next')
      setStep('phase')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al generar la propuesta.')
      setStep('maturity')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadName || !leadPhone || !leadEmail || !proposal) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          proposal,
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          sector,
          orgType,
          headcount,
          maturity,
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar la propuesta')
      setSent(true)
      setTimeout(() => setEmailModalOpen(false), 3500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const openDetail = async (kind: 'intervention' | 'product', item: string) => {
    const phase = proposal?.phases[phaseIndex]
    setDetailItem({ kind, item })
    setDetailError(null)
    const key = `${phase?.id}|${kind}|${item}`
    const cached = detailCacheRef.current.get(key)
    if (cached) {
      setDetailData(cached)
      setDetailLoading(false)
      return
    }
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await fetch('/api/simulator/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          item,
          phaseName: phase?.name,
          phaseTagline: phase?.tagline,
          sector,
          orgType,
          headcount,
          maturity,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el detalle')
      detailCacheRef.current.set(key, data.detail)
      setDetailData(data.detail)
    } catch (err: any) {
      setDetailError(err.message || 'Ocurrió un error')
    } finally {
      setDetailLoading(false)
    }
  }

  const goToPhase = (index: number) => {
    if (index === phaseIndex) return
    setDirection(index < phaseIndex ? 'prev' : 'next')
    setPhaseIndex(index)
  }

  const restart = () => {
    setProposal(null)
    setRunId(null)
    setSector('')
    setOrgType('')
    setHeadcount('')
    setMaturity('')
    setPhaseIndex(0)
    setSent(false)
    setLeadName('')
    setLeadPhone('')
    setLeadEmail('')
    setStep('intro')
  }

  const currentPhase = proposal?.phases[phaseIndex]
  const PhaseIcon = currentPhase ? PHASE_ICONS[SIMULATOR_PHASES[phaseIndex]?.icon] || Layers : Layers

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
        <Link
          to="/empresas"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-secondary transition-colors hover:text-brand-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver a Empresas
        </Link>
        <span className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 sm:flex">
          <Sparkles className="h-4 w-4 text-brand-secondary" />
          Simulador de Transformación Digital
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-28 sm:px-6 sm:pt-32">
        {/* INTRO */}
        {step === 'intro' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-xs font-bold uppercase tracking-widest text-brand-secondary">
              <Sparkles className="h-4 w-4" /> Experiencia guiada por IA
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl">
              Simula tu Transformación Digital, fase por fase
            </h1>
            <p className="mb-8 max-w-2xl text-xl text-slate-500">
              La transformación digital no es comprar tecnología: es un proceso ordenado para reducir fricción operativa,
              ganar control interno y servir mejor a tus clientes. Te guiaré por las{' '}
              <strong className="text-slate-800">6 fases</strong> de nuestra metodología, estimando inversión,
              intervenciones y los productos concretos que obtendrías en cada una.
            </p>

            <div className="mb-12 max-w-2xl">
              <AgentBubble>
                Hola, soy <strong className="text-slate-900">{AGENT_NAME}</strong>, tu agente de transformación digital.
                Cuéntame cuatro datos de tu organización y construiré contigo una propuesta personalizada, fase por fase.
              </AgentBubble>
            </div>

            <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SIMULATOR_PHASES.map((phase) => {
                const Icon = PHASE_ICONS[phase.icon] || Layers
                return (
                  <div key={phase.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-brand-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fase {phase.index}</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{phase.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{phase.tagline}</div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => {
                trackEvent('simulator_started')
                setStep('sector')
              }}
              className="inline-flex items-center gap-3 rounded-full bg-brand-primary px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-brand-secondary"
            >
              Comenzar simulación <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* CAPTURE STEPS */}
        {(step === 'sector' || step === 'orgType' || step === 'headcount' || step === 'maturity') && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <div className="mb-12 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-secondary">
                <Sparkles className="h-4 w-4" /> Cuéntame de tu organización
              </span>
              <ProgressDots current={['sector', 'orgType', 'headcount', 'maturity'].indexOf(step)} total={4} />
            </div>

            {step === 'sector' && (
              <>
                <button
                  onClick={() => setStep('intro')}
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a la introducción
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-primary shadow-sm">
                  <Building2 className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">¿Cuál es tu sector?</h2>
                <p className="mb-10 text-xl text-slate-500 md:w-2/3">
                  Selecciona la industria que mejor describe tu organización para personalizar la propuesta.
                </p>
                <OptionGrid
                  options={SIMULATOR_SECTORS.map((s) => ({ value: s, label: s }))}
                  onSelect={(value) => {
                    setSector(value)
                    setStep('orgType')
                  }}
                />
              </>
            )}

            {step === 'orgType' && (
              <>
                <button
                  onClick={() => setStep('sector')}
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a Sector
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-primary shadow-sm">
                  <Layers className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">¿Qué tipo de organización eres?</h2>
                <p className="mb-10 text-xl text-slate-500 md:w-2/3">
                  Ajustamos el alcance y la inversión según la naturaleza de tu organización.
                </p>
                <OptionGrid
                  options={SIMULATOR_ORG_TYPES.map((o) => ({ value: o, label: o }))}
                  onSelect={(value) => {
                    setOrgType(value)
                    setStep('headcount')
                  }}
                />
              </>
            )}

            {step === 'headcount' && (
              <>
                <button
                  onClick={() => setStep('orgType')}
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a Tipo de organización
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-primary shadow-sm">
                  <Users className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">¿Cuántos colaboradores tienen?</h2>
                <p className="mb-10 text-xl text-slate-500 md:w-2/3">
                  El tamaño del equipo nos permite estimar cuántos procesos hay que mapear: a más personas, más procesos.
                </p>
                <OptionGrid
                  columns={2}
                  options={SIMULATOR_HEADCOUNTS}
                  onSelect={(value) => {
                    setHeadcount(value)
                    setStep('maturity')
                  }}
                />
              </>
            )}

            {step === 'maturity' && (
              <>
                <button
                  onClick={() => setStep('headcount')}
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a Colaboradores
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-primary shadow-sm">
                  <Gauge className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">¿Cuál es tu madurez digital?</h2>
                <p className="mb-10 text-xl text-slate-500 md:w-2/3">
                  Esto nos dice si partimos desde cero o construimos sobre sistemas existentes, y ajusta el esfuerzo estimado.
                </p>
                {error && (
                  <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-600">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  {SIMULATOR_MATURITIES.map((mat) => (
                    <button
                      key={mat.value}
                      onClick={() => {
                        setMaturity(mat.value)
                        handleGenerate(mat.value)
                      }}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand-secondary hover:bg-blue-50/60 active:scale-95"
                    >
                      <div>
                        <div className="text-lg font-bold text-slate-900">{mat.label}</div>
                        <div className="mt-1 text-sm text-slate-500">{mat.description}</div>
                      </div>
                      <ArrowRight className="h-5 w-5 flex-shrink-0 text-brand-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-28 text-center animate-in zoom-in duration-500">
            <div className="relative mb-10 flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/10" />
              <div className="absolute inset-4 animate-pulse rounded-full bg-blue-500/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-brand-primary">
                <Bot className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-3xl font-black tracking-tight text-slate-900">{AGENT_NAME} está construyendo tu propuesta…</h3>
            <p className="mt-6 h-7 max-w-md text-lg text-brand-secondary transition-all">{THINKING_MESSAGES[thinkingIdx]}</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Sector <strong className="text-slate-600">{sector}</strong> · {headcountLabel} · Madurez {maturityLabel}
            </p>
          </div>
        )}

        {/* PHASE NAVIGATION */}
        {step === 'phase' && proposal && currentPhase && (
          <div>
            <div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-secondary">
              <Sparkles className="h-4 w-4" /> Navegación por fases · {currentPhase.index} de 6
            </div>

            <PhaseRail phases={proposal.phases} current={phaseIndex} onSelect={goToPhase} />

            <div
              key={phaseIndex}
              className={
                direction === 'prev'
                  ? 'animate-in slide-in-from-left-8 fade-in duration-500'
                  : 'animate-in slide-in-from-right-8 fade-in duration-500'
              }
            >
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-brand-primary">
                <PhaseIcon className="h-8 w-8" />
              </div>

              <div className="text-sm font-bold uppercase tracking-widest text-brand-secondary">{currentPhase.tagline}</div>
              <h2 className="mb-4 mt-2 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                {currentPhase.name}
                {currentPhase.basis && (
                  <span className="ml-3 align-middle text-base font-bold text-brand-secondary">· {currentPhase.basis}</span>
                )}
              </h2>
              <p className="mb-8 max-w-3xl text-lg text-slate-500">{currentPhase.description}</p>

              {currentPhase.agentNote && <div className="mb-10 max-w-3xl"><AgentBubble>{currentPhase.agentNote}</AgentBubble></div>}

              {/* Diagnóstico de Madurez Digital (solo Fase 1) */}
              {currentPhase.id === 'adn' && proposal.diagnostic?.dimensions?.length > 0 && (
                <MaturityDiagnosticView diagnostic={proposal.diagnostic} />
              )}

              {/* Qué se hace / Cómo se hace */}
              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {currentPhase.whatWeDo && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                      <ListChecks className="h-4 w-4 text-brand-secondary" /> ¿Qué se hace?
                    </h4>
                    <p className="leading-relaxed text-slate-700">{currentPhase.whatWeDo}</p>
                  </div>
                )}
                {currentPhase.howWeDo && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                      <Cog className="h-4 w-4 text-brand-secondary" /> ¿Cómo se hace?
                    </h4>
                    <p className="leading-relaxed text-slate-700">{currentPhase.howWeDo}</p>
                  </div>
                )}
              </div>

              <div className="mb-10 flex flex-wrap gap-3">
                {currentPhase.methods.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600"
                  >
                    {m}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Interventions */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h4 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                    <Wrench className="h-4 w-4 text-brand-secondary" /> Intervenciones / Consultoría
                  </h4>
                  <p className="mb-6 border-b border-slate-100 pb-4 text-xs text-slate-400">Toca cada ítem para ver el detalle y ejemplos.</p>
                  <ul className="flex flex-col gap-2">
                    {currentPhase.interventions.map((item, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => openDetail('intervention', item)}
                          className="group flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-secondary" />
                          <span className="flex-1 text-slate-700">{item}</span>
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-secondary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Products */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h4 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                    <Package className="h-4 w-4 text-brand-secondary" /> Productos para tu organización
                  </h4>
                  <p className="mb-6 border-b border-slate-100 pb-4 text-xs text-slate-400">Toca cada ítem para ver qué incluye y ejemplos.</p>
                  <ul className="flex flex-col gap-3">
                    {currentPhase.products.map((item, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => openDetail('product', item)}
                          className="group flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:border-brand-secondary hover:bg-blue-50/60"
                        >
                          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-primary">
                            <Package className="h-3.5 w-3.5" />
                          </div>
                          <span className="flex-1 text-slate-700">{item}</span>
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-secondary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Investment */}
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
                    {currentPhase.recurring ? 'Retainer mensual' : 'Inversión de esta fase'}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{moneyLabel(currentPhase)}</div>
                  {currentPhase.rationale && <p className="mt-3 text-sm text-slate-500">{currentPhase.rationale}</p>}
                </div>
                <div className="rounded-3xl bg-brand-primary p-6 text-white sm:p-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-200">
                    {currentPhase.recurring ? 'Inversión del proyecto (Fases 1–5)' : `Inversión acumulada (Fases 1–${currentPhase.index})`}
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    {formatUsdRange(accumulatedProject.min, accumulatedProject.max)}
                  </div>
                  {currentPhase.kpi && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-100">
                      <TrendingUp className="h-4 w-4" /> {currentPhase.kpi}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-8">
              <button
                onClick={() => {
                  if (phaseIndex === 0) {
                    setStep('maturity')
                  } else {
                    setDirection('prev')
                    setPhaseIndex((i) => i - 1)
                  }
                }}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-slate-600 transition-colors hover:bg-slate-50 sm:px-8 sm:text-sm sm:tracking-[0.2em]"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              {phaseIndex < proposal.phases.length - 1 ? (
                <button
                  onClick={() => {
                    setDirection('next')
                    setPhaseIndex((i) => i + 1)
                  }}
                  className="flex items-center gap-2 rounded-full bg-brand-primary px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-brand-secondary sm:gap-3 sm:px-10 sm:text-sm sm:tracking-[0.2em]"
                >
                  Siguiente fase <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep('summary')}
                  className="flex items-center gap-2 rounded-full bg-brand-primary px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-brand-secondary sm:gap-3 sm:px-10 sm:text-sm sm:tracking-[0.2em]"
                >
                  Ver resumen <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* SUMMARY */}
        {step === 'summary' && proposal && (
          <div className="animate-in slide-in-from-bottom-8 duration-700">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-xs font-bold uppercase tracking-widest text-brand-secondary">
              <CheckCircle2 className="h-4 w-4" /> Propuesta construida
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">{proposal.headline}</h1>

            {(proposal.agentIntro || proposal.executiveSummary) && (
              <div className="mb-10 max-w-3xl">
                <AgentBubble>{proposal.agentIntro || proposal.executiveSummary}</AgentBubble>
              </div>
            )}

            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sector</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{sector}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organización</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{orgType}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tamaño</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{headcountLabel}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Madurez</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{maturityLabel}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Procesos / Soluciones</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {proposal.processes.min}–{proposal.processes.max} / {proposal.solutions.min}–{proposal.solutions.max}
                </div>
              </div>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-3xl bg-brand-primary p-6 text-center text-white sm:p-8">
                <div className="text-xs font-bold uppercase tracking-widest text-blue-200">Inversión del proyecto · Fases 1–5</div>
                <div className="mt-3 text-3xl font-black sm:text-4xl">
                  {formatUsdRange(proposal.totalProject.min, proposal.totalProject.max)}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Mejora continua · Fase 6</div>
                <div className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                  {formatUsd(proposal.monthly.min)} – {formatUsd(proposal.monthly.max)}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Retainer mensual</div>
              </div>
            </div>

            <p className="mb-10 max-w-3xl text-sm text-slate-500">
              Estimación referencial según sector, tamaño y madurez. El diagnóstico (entrada desde {formatUsd(5000)}) precisa
              el alcance real, el número de procesos y las soluciones a desarrollar.
            </p>

            <div className="mb-12 space-y-4">
              {proposal.phases.map((phase) => (
                <div
                  key={phase.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Fase {phase.index} · {phase.tagline}
                      {phase.basis ? ` · ${phase.basis}` : ''}
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{phase.name}</div>
                  </div>
                  <div className="text-base font-black text-brand-secondary">{moneyLabel(phase)}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => {
                  setSent(false)
                  setError(null)
                  setEmailModalOpen(true)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-brand-secondary"
              >
                <Mail className="h-4 w-4" /> Recibir propuesta por correo
              </button>
              <button
                onClick={() => {
                  setPhaseIndex(0)
                  setDirection('next')
                  setStep('phase')
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-700 transition-colors hover:bg-slate-50"
              >
                Revisar fases
              </button>
              <button
                onClick={restart}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:bg-slate-50"
              >
                Reiniciar
              </button>
            </div>
          </div>
        )}

        {/* EMAIL MODAL */}
        {emailModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEmailModalOpen(false)} />
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 md:p-10">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="absolute right-6 top-6 text-slate-400 transition-colors hover:text-slate-700"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-brand-primary">
                <Mail className="h-8 w-8" />
              </div>

              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900">Recibe tu propuesta</h3>
              <p className="mb-8 text-slate-500">
                Déjanos tus datos y te enviaremos la propuesta completa de transformación digital a tu correo.
              </p>

              {sent ? (
                <div className="animate-in fade-in rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-700 duration-500">
                  <CheckCircle2 className="mx-auto mb-4 h-10 w-10" />
                  <p className="font-bold">¡Propuesta enviada con éxito!</p>
                  <p className="mt-1 text-sm text-emerald-600/80">Revisa tu bandeja de entrada en unos instantes.</p>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:border-brand-secondary focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Número de contacto"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:border-brand-secondary focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:border-brand-secondary focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />

                  {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-primary px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-brand-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        Enviar propuesta <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* DETAIL SIDE DRAWER */}
      {detailItem && (
        <div className="fixed inset-0 z-[65]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right-[28rem] duration-300">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                  {detailItem.kind === 'intervention' ? <Wrench className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                  {detailItem.kind === 'intervention' ? 'Intervención / Consultoría' : 'Producto / Entregable'}
                </div>
                <h3 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-900">
                  {detailData?.title || detailItem.item}
                </h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="flex-shrink-0 text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading && (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Atenea está preparando el detalle…
                </div>
              )}

              {detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{detailError}</div>
              )}

              {detailData && !detailLoading && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {detailData.paragraphs.map((p, i) => (
                      <p key={i} className="leading-relaxed text-slate-700">{p}</p>
                    ))}
                  </div>

                  {detailData.examples.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <Info className="h-4 w-4 text-brand-secondary" /> Ejemplos
                      </h4>
                      <ul className="space-y-3">
                        {detailData.examples.map((ex, i) => (
                          <li key={i} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-secondary" />
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
                    Ejemplo orientativo generado para tu organización simulada. El alcance final se define en el diagnóstico.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MethodologyChatbot />
    </div>
  )
}

export default SimuladorEmpresas
