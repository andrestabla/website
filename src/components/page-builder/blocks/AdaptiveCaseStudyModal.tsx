import { useState, useEffect } from 'react'
import { X, ArrowRight, Loader2, Sparkles, Building2, Workflow, TrendingUp, CheckCircle2 } from 'lucide-react'
import { createPortal } from 'react-dom'

interface AdaptiveCaseStudyModalProps {
    isOpen: boolean
    onClose: () => void
}

const INDUSTRIES = [
    'Finanzas y Banca',
    'Salud y Medicina',
    'Retail y Comercio Electrónico',
    'Manufactura y Logística',
    'Tecnología y Software',
    'Educación',
    'Servicios Profesionales',
    'Otro'
]

const PROCESSES_MAP: Record<string, string[]> = {
    'Finanzas y Banca': ['Fraude y Riesgo', 'Atención al Cliente', 'Automatización de Cumplimiento', 'Análisis de Inversiones', 'Procesamiento de Créditos'],
    'Salud y Medicina': ['Gestión de Turnos', 'Triaje de Pacientes', 'Análisis de Historial Clínico', 'Optimización de Inventario', 'Facturación Médica'],
    'Retail y Comercio Electrónico': ['Recomendación de Productos', 'Precios Dinámicos', 'Gestión de Inventario', 'Soporte y Chatbots', 'Logística de Última Milla'],
    'Manufactura y Logística': ['Mantenimiento Predictivo', 'Optimización de Rutas', 'Control de Calidad AI', 'Cadena de Suministro', 'Gestión de Almacenes'],
    'Tecnología y Software': ['Generación de Código', 'QA Técnico Automático', 'Soporte Nivel 1 y 2', 'Análisis de Logs', 'Documentación Automática'],
    'Educación': ['Tutoría Personalizada', 'Calificación Automática', 'Análisis de Rendimiento', 'Creación de Contenidos', 'Gestión de Admisiones'],
    'Servicios Profesionales': ['Generación de Propuestas', 'Revisión Legal de Contratos', 'Organización de Agendas', 'Onboarding de Clientes', 'Análisis Competitivo'],
    'Otro': ['Planificación Estratégica', 'Experiencia de Usuario', 'Operaciones Base', 'Recursos Humanos', 'Ventas']
}

const MATURITIES = [
    { value: 'Inicial', label: 'Inicial (Procesos manuales o no documentados)' },
    { value: 'En desarrollo', label: 'En desarrollo (Algunos procesos digitales o documentados)' },
    { value: 'Consolidado', label: 'Consolidado (Sistemas integrados, buscando optimización AI)' }
]

type Step = 'industry' | 'process' | 'maturity' | 'loading' | 'result'

interface CaseStudyResult {
    title: string
    challenge: string
    solution: string
    results: string
}

export function AdaptiveCaseStudyModal({ isOpen, onClose }: AdaptiveCaseStudyModalProps) {
    const [step, setStep] = useState<Step>('industry')
    const [industry, setIndustry] = useState('')
    const [processName, setProcessName] = useState('')
    const [maturity, setMaturity] = useState('')
    const [result, setResult] = useState<CaseStudyResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            setTimeout(() => {
                setStep('industry')
                setIndustry('')
                setProcessName('')
                setMaturity('')
                setResult(null)
                setError(null)
            }, 300)
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleGenerate = async () => {
        setStep('loading')
        setError(null)
        try {
            const res = await fetch('/api/generate-case-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ industry, processName, maturity })
            })
            
            const textResponse = await res.text()
            let data: any
            
            try {
                data = JSON.parse(textResponse)
            } catch (jsonError) {
                console.error('Non-JSON response from API:', textResponse)
                throw new Error('El servidor tardó demasiado en responder o devolvió un formato inválido. Por favor, intenta de nuevo.')
            }

            if (!res.ok) throw new Error(data.error || 'Failed to generate case study')
            
            setResult(data.caseStudy)
            setStep('result')
        } catch (err: any) {
            console.error('AI Generation Error:', err)
            setError(err.message || 'Ocurrió un error al generar el caso.')
            setStep('maturity') // Go back so they can try again
        }
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-opacity duration-300">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-[#020617] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8 md:p-12 text-slate-200">
                    {/* Header Tracker */}
                    {step !== 'result' && step !== 'loading' && (
                        <div className="mb-10 flex items-center gap-2">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                                <Sparkles className="h-4 w-4" />
                                Generador de Casos AI
                            </span>
                            <div className="h-px flex-1 bg-slate-800" />
                            <div className="flex gap-1.5">
                                {['industry', 'process', 'maturity'].map((s, i) => (
                                    <div
                                        key={s}
                                        className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
                                            (['industry', 'process', 'maturity'].indexOf(step) >= i)
                                                ? 'bg-emerald-400'
                                                : 'bg-slate-800'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Industry */}
                    {step === 'industry' && (
                        <div className="animate-in slide-in-from-right-8 duration-500">
                            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <h2 className="mb-4 text-3xl font-black text-white">¿Cuál es tu industria?</h2>
                            <p className="mb-8 text-lg text-slate-400">Selecciona el sector que más se ajuste a tu negocio para personalizar la experiencia.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {INDUSTRIES.map((ind) => (
                                    <button
                                        key={ind}
                                        onClick={() => {
                                            setIndustry(ind)
                                            setStep('process')
                                        }}
                                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4 text-left text-sm font-medium text-slate-300 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-white active:scale-95"
                                    >
                                        {ind}
                                        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Process */}
                    {step === 'process' && (
                        <div className="animate-in slide-in-from-right-8 duration-500">
                            <button onClick={() => setStep('industry')} className="mb-8 text-sm font-medium text-slate-500 hover:text-slate-300">← Volver</button>
                            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                                <Workflow className="h-6 w-6" />
                            </div>
                            <h2 className="mb-4 text-3xl font-black text-white">¿Qué área o proceso buscas mejorar?</h2>
                            <p className="mb-8 text-lg text-slate-400">Identifica el proceso core que requiere optimización o automatización.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {(PROCESSES_MAP[industry] || PROCESSES_MAP['Otro']).map((proc: string) => (
                                    <button
                                        key={proc}
                                        onClick={() => {
                                            setProcessName(proc)
                                            setStep('maturity')
                                        }}
                                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4 text-left text-sm font-medium text-slate-300 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-white active:scale-95"
                                    >
                                        {proc}
                                        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Maturity */}
                    {step === 'maturity' && (
                        <div className="animate-in slide-in-from-right-8 duration-500">
                            <button onClick={() => setStep('process')} className="mb-8 text-sm font-medium text-slate-500 hover:text-slate-300">← Volver</button>
                            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <h2 className="mb-4 text-3xl font-black text-white">¿Cuál es tu nivel de madurez digital?</h2>
                            <p className="mb-8 text-lg text-slate-400">Esto nos ayuda a entender si partes desde cero o buscas escalar con IA avanzada.</p>
                            
                            {error && (
                                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                {MATURITIES.map((mat) => (
                                    <button
                                        key={mat.value}
                                        onClick={() => {
                                            setMaturity(mat.value)
                                        }}
                                        className={`flex items-center justify-between rounded-xl border px-6 py-5 text-left transition-all active:scale-95 ${
                                            maturity === mat.value 
                                            ? 'border-emerald-500/50 bg-emerald-500/10 text-white' 
                                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-base font-medium">{mat.label}</span>
                                        {maturity === mat.value && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-10 flex justify-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!maturity}
                                    className="flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Generar mi caso <Sparkles className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Loading */}
                    {step === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
                            <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
                                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                                <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-500/20" />
                                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Analizando arquitectura...</h3>
                            <p className="mt-4 max-w-sm text-slate-400">Nuestra IA está diseñando un caso de éxito específico para {processName} en el sector {industry}.</p>
                        </div>
                    )}

                    {/* Step 5: Result */}
                    {step === 'result' && result && (
                        <div className="animate-in slide-in-from-bottom-8 duration-700">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" /> Caso Generado por IA
                            </div>
                            
                            <h2 className="mb-8 text-3xl font-black leading-tight text-white md:text-4xl">{result.title}</h2>
                            
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-6">
                                    <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">El Desafío</h4>
                                    <p className="text-slate-300 leading-relaxed">{result.challenge}</p>
                                </div>
                                <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-6">
                                    <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-emerald-500/70">La Solución</h4>
                                    <p className="text-slate-300 leading-relaxed">{result.solution}</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-6">
                                    <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-emerald-400">Resultados Obtenidos</h4>
                                    <p className="text-emerald-100/90 leading-relaxed font-medium">{result.results}</p>
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <a
                                    href="#contacto"
                                    onClick={onClose}
                                    className="flex flex-1 justify-center rounded-xl bg-white px-6 py-4 text-center text-sm font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-200"
                                >
                                    Transformar mi negocio
                                </a>
                                <button
                                    onClick={() => setStep('industry')}
                                    className="flex flex-1 justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                                >
                                    Probar otro escenario
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
