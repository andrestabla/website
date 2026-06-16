import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  Mail,
  X,
  Send,
  Wrench,
  Package,
  TrendingUp,
  ScanSearch,
  Workflow,
  Scale,
  Code2,
  Rocket,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { getOrCreateVisitorId, getSessionId } from '../lib/privacyConsent'
import {
  SIMULATOR_PHASES,
  SIMULATOR_SECTORS,
  SIMULATOR_ORG_TYPES,
  SIMULATOR_HEADCOUNTS,
  formatUsdRange,
  type SimulatorProposal,
  type SimulatorProposalPhase,
} from '../data/simulatorPhases'

const PHASE_ICONS: Record<string, LucideIcon> = {
  ScanSearch,
  Workflow,
  Scale,
  Code2,
  Rocket,
  RefreshCw,
}

type Step = 'intro' | 'sector' | 'orgType' | 'headcount' | 'loading' | 'phase' | 'summary'

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

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-7 rounded-full transition-colors duration-500 ${
            i <= current ? 'bg-emerald-400' : 'bg-slate-800'
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
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns >= 3 ? 'lg:grid-cols-3' : ''}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="group flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 px-6 py-5 text-left text-sm font-medium text-slate-300 transition-all hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-white active:scale-95"
        >
          {opt.label}
          <ArrowRight className="h-4 w-4 text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
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
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                      : isDone
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-700 bg-slate-800/40 text-slate-500 group-hover:border-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isCurrent ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    Fase {phase.index}
                  </span>
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {phase.name}
                  </span>
                </div>
              </button>
              {i < phases.length - 1 && (
                <div
                  className={`mt-6 h-0.5 w-6 flex-shrink-0 rounded sm:w-10 ${
                    i < current ? 'bg-emerald-500/60' : 'bg-slate-700'
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

export function SimuladorEmpresas() {
  const [step, setStep] = useState<Step>('intro')
  const [sector, setSector] = useState('')
  const [orgType, setOrgType] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [proposal, setProposal] = useState<SimulatorProposal | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step, phaseIndex])

  const headcountLabel = useMemo(
    () => SIMULATOR_HEADCOUNTS.find((h) => h.value === headcount)?.label || headcount,
    [headcount]
  )

  const accumulatedInvestment = useMemo(() => {
    if (!proposal) return { min: 0, max: 0 }
    return proposal.phases.slice(0, phaseIndex + 1).reduce(
      (acc, p) => ({ min: acc.min + (p.investment?.min || 0), max: acc.max + (p.investment?.max || 0) }),
      { min: 0, max: 0 }
    )
  }, [proposal, phaseIndex])

  const handleGenerate = async (selectedHeadcount: string) => {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/simulator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector,
          orgType,
          headcount: selectedHeadcount,
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
      setStep('phase')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al generar la propuesta.')
      setStep('headcount')
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
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between px-6 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <Link
          to="/empresas"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400 transition-colors hover:text-emerald-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Volver a Empresas
        </Link>
        <span className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 sm:flex">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Simulador de Transformación Digital
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        {/* INTRO */}
        {step === 'intro' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
              <Sparkles className="h-4 w-4" /> Experiencia guiada por IA
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight text-white sm:text-6xl">
              Simula tu Transformación Digital, fase por fase
            </h1>
            <p className="mb-10 max-w-2xl text-xl text-slate-400">
              La transformación digital no es comprar tecnología: es un proceso ordenado para reducir fricción operativa,
              ganar control interno y servir mejor a tus clientes. Te guiaremos por las <strong className="text-slate-200">6 fases</strong> de
              nuestra metodología, calculando inversión, intervenciones y los productos que obtendrías en cada una.
            </p>

            <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SIMULATOR_PHASES.map((phase) => {
                const Icon = PHASE_ICONS[phase.icon] || Layers
                return (
                  <div
                    key={phase.id}
                    className="rounded-2xl border border-white/5 bg-slate-800/30 p-6 backdrop-blur-sm"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Fase {phase.index}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">{phase.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{phase.tagline}</div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => {
                trackEvent('simulator_started')
                setStep('sector')
              }}
              className="inline-flex items-center gap-3 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-300 transition-all hover:bg-emerald-400/20"
            >
              Comenzar simulación <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* CAPTURE STEPS */}
        {(step === 'sector' || step === 'orgType' || step === 'headcount') && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <div className="mb-12 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                <Sparkles className="h-4 w-4" /> Cuéntanos de tu organización
              </span>
              <ProgressDots current={['sector', 'orgType', 'headcount'].indexOf(step)} total={3} />
            </div>

            {step === 'sector' && (
              <>
                <button
                  onClick={() => setStep('intro')}
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a la introducción
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 text-slate-300">
                  <Building2 className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">¿Cuál es tu sector?</h2>
                <p className="mb-10 text-xl text-slate-400 md:w-2/3">
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
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a Sector
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 text-slate-300">
                  <Layers className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">¿Qué tipo de organización eres?</h2>
                <p className="mb-10 text-xl text-slate-400 md:w-2/3">
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
                  className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver a Tipo de organización
                </button>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 text-slate-300">
                  <Users className="h-8 w-8" />
                </div>
                <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">¿Cuántos colaboradores tienen?</h2>
                <p className="mb-10 text-xl text-slate-400 md:w-2/3">
                  El tamaño del equipo determina el rango de inversión estimada de la transformación.
                </p>
                {error && (
                  <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-medium text-red-400">
                    {error}
                  </div>
                )}
                <OptionGrid
                  columns={2}
                  options={SIMULATOR_HEADCOUNTS}
                  onSelect={(value) => {
                    setHeadcount(value)
                    handleGenerate(value)
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in duration-500">
            <div className="relative mb-12 flex h-32 w-32 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <div className="absolute inset-4 animate-pulse rounded-full bg-emerald-500/20" />
              <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-white">Construyendo tu propuesta...</h3>
            <p className="mt-6 max-w-md text-xl text-slate-400">
              Nuestra IA está personalizando las 6 fases de transformación digital para el sector{' '}
              <strong>{sector}</strong>.
            </p>
          </div>
        )}

        {/* PHASE NAVIGATION */}
        {step === 'phase' && proposal && currentPhase && (
          <div>
            <div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
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
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <PhaseIcon className="h-8 w-8" />
            </div>

            <div className="text-sm font-bold uppercase tracking-widest text-slate-500">{currentPhase.tagline}</div>
            <h2 className="mb-6 mt-2 text-4xl font-black text-white sm:text-5xl">{currentPhase.name}</h2>
            <p className="mb-8 max-w-3xl text-lg text-slate-400">{currentPhase.description}</p>

            <div className="mb-10 flex flex-wrap gap-3">
              {currentPhase.methods.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300"
                >
                  {m}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Interventions */}
              <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8 backdrop-blur-sm">
                <h4 className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4 text-sm font-bold uppercase tracking-widest text-slate-400">
                  <Wrench className="h-4 w-4" /> Intervenciones / Consultoría
                </h4>
                <ul className="flex flex-col gap-4">
                  {currentPhase.interventions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                      <span className="text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Products */}
              <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8 backdrop-blur-sm">
                <h4 className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4 text-sm font-bold uppercase tracking-widest text-slate-400">
                  <Package className="h-4 w-4" /> Productos obtenidos
                </h4>
                <ul className="flex flex-col gap-4">
                  {currentPhase.products.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-4"
                    >
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Investment */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-8">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-500/70">Inversión de esta fase</div>
                <div className="mt-2 text-2xl font-black text-white">
                  {formatUsdRange(currentPhase.investment.min, currentPhase.investment.max)}
                </div>
                {currentPhase.rationale && <p className="mt-3 text-sm text-slate-400">{currentPhase.rationale}</p>}
              </div>
              <div className="rounded-3xl border border-emerald-400/30 bg-emerald-900/40 p-8 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Inversión acumulada (Fases 1–{currentPhase.index})</div>
                <div className="mt-2 text-2xl font-black text-emerald-50">
                  {formatUsdRange(accumulatedInvestment.min, accumulatedInvestment.max)}
                </div>
                {currentPhase.kpi && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
                    <TrendingUp className="h-4 w-4" /> {currentPhase.kpi}
                  </p>
                )}
              </div>
            </div>
            </div>

            {/* Navigation */}
            <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8">
              <button
                onClick={() => {
                  if (phaseIndex === 0) {
                    setStep('headcount')
                  } else {
                    setDirection('prev')
                    setPhaseIndex((i) => i - 1)
                  }
                }}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              {phaseIndex < proposal.phases.length - 1 ? (
                <button
                  onClick={() => {
                    setDirection('next')
                    setPhaseIndex((i) => i + 1)
                  }}
                  className="flex items-center gap-3 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-300 transition-all hover:bg-emerald-400/20"
                >
                  Siguiente fase <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep('summary')}
                  className="flex items-center gap-3 rounded-full bg-emerald-500 px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-400"
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
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Propuesta construida
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight text-white sm:text-5xl">{proposal.headline}</h1>
            {proposal.executiveSummary && (
              <p className="mb-10 max-w-3xl text-lg text-slate-400">{proposal.executiveSummary}</p>
            )}

            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sector</div>
                <div className="mt-1 font-bold text-white">{sector}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Organización</div>
                <div className="mt-1 font-bold text-white">{orgType}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tamaño</div>
                <div className="mt-1 font-bold text-white">{headcountLabel}</div>
              </div>
            </div>

            <div className="mb-10 rounded-3xl border border-emerald-400/30 bg-emerald-900/40 p-10 text-center shadow-[0_0_50px_rgba(16,185,129,0.12)]">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Inversión total estimada</div>
              <div className="mt-3 text-4xl font-black text-white sm:text-5xl">
                {formatUsdRange(proposal.total.min, proposal.total.max)}
              </div>
              <p className="mx-auto mt-4 max-w-xl text-sm text-emerald-200/70">
                Estimación referencial basada en el tamaño de tu organización. Se ajusta tras el diagnóstico inicial.
              </p>
            </div>

            <div className="mb-12 space-y-4">
              {proposal.phases.map((phase) => (
                <div
                  key={phase.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-slate-800/30 p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Fase {phase.index} · {phase.tagline}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">{phase.name}</div>
                  </div>
                  <div className="text-base font-black text-emerald-300">
                    {formatUsdRange(phase.investment.min, phase.investment.max)}
                  </div>
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
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-400"
              >
                <Mail className="h-4 w-4" /> Recibir propuesta por correo
              </button>
              <button
                onClick={() => setStep('phase')}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
              >
                Revisar fases
              </button>
              <button
                onClick={restart}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white/50 transition-colors hover:bg-white/10"
              >
                Reiniciar
              </button>
            </div>
          </div>
        )}

        {/* EMAIL MODAL */}
        {emailModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setEmailModalOpen(false)} />
            <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl animate-in zoom-in-95 duration-300 md:p-10">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="absolute right-6 top-6 text-slate-500 transition-colors hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Mail className="h-8 w-8" />
              </div>

              <h3 className="mb-2 text-2xl font-black text-white">Recibe tu propuesta</h3>
              <p className="mb-8 text-slate-400">
                Déjanos tus datos y te enviaremos la propuesta completa de transformación digital a tu correo.
              </p>

              {sent ? (
                <div className="animate-in fade-in rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-400 duration-500">
                  <CheckCircle2 className="mx-auto mb-4 h-10 w-10" />
                  <p className="font-bold">¡Propuesta enviada con éxito!</p>
                  <p className="mt-1 text-sm text-emerald-400/70">Revisa tu bandeja de entrada en unos instantes.</p>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-4 font-medium text-white placeholder:text-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Número de contacto"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-4 font-medium text-white placeholder:text-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-4 font-medium text-white placeholder:text-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />

                  {error && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  )
}

export default SimuladorEmpresas
