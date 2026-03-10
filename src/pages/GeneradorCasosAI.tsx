import { useState, useEffect } from 'react'
import { ArrowRight, Loader2, Sparkles, Building2, Workflow, TrendingUp, CheckCircle2, ChevronLeft, Package, GitMerge } from 'lucide-react'
import { Link } from 'react-router-dom'
import mermaid from 'mermaid'

const INDUSTRIES = [
    'Finanzas y Banca',
    'Salud y Medicina',
    'Retail y Comercio Electrónico',
    'Manufactura y Logística',
    'Tecnología y Software',
    'Educación',
    'Servicios Profesionales',
    'Bienes Raíces y Construcción',
    'Energía y Servicios Públicos',
    'Agricultura y Tecnología Global',
    'Entretenimiento y Medios',
    'Transporte y Movilidad',
    'Hostelería y Turismo',
    'Telecomunicaciones',
    'Otro'
]

const PROCESSES_MAP: Record<string, string[]> = {
    'Finanzas y Banca': ['Fraude y Riesgo (IA)', 'Atención al Cliente (Chatbots)', 'Automatización de Cumplimiento (RPA)', 'Análisis de Inversiones', 'Procesamiento de Créditos', 'Conciliación Bancaria Automática'],
    'Salud y Medicina': ['Gestión de Turnos Inteligente', 'Triaje de Pacientes AI', 'Análisis de Historial Clínico', 'Optimización de Inventario Médico', 'Facturación Médica Automatizada', 'Telemedicina y Soporte'],
    'Retail y Comercio Electrónico': ['Recomendación de Productos', 'Precios Dinámicos AI', 'Gestión de Inventario (BPMN)', 'Soporte y Chatbots 24/7', 'Logística de Última Milla', 'Predicción de Demanda'],
    'Manufactura y Logística': ['Mantenimiento Predictivo (IoT)', 'Optimización de Rutas (IA)', 'Control de Calidad (Visión)', 'Cadena de Suministro', 'Gestión de Almacenes Inteligente', 'Robótica en Ensamblaje'],
    'Tecnología y Software': ['Generación de Código Asistida', 'QA Técnico Automático', 'Soporte Nivel 1 y 2 (LLMs)', 'Análisis de Logs Centralizado', 'Documentación Automática', 'DevOps Continuous Deployment'],
    'Educación': ['Tutoría Personalizada AI', 'Calificación Automática', 'Análisis de Rendimiento', 'Creación de Contenidos a Medida', 'Gestión de Admisiones', 'Retención de Alumnos (Predictiva)'],
    'Servicios Profesionales': ['Generación de Propuestas (LLMs)', 'Revisión Legal de Contratos (NLP)', 'Organización de Agendas', 'Onboarding de Clientes', 'Análisis Competitivo', 'Gestión Financiera Interna'],
    'Bienes Raíces y Construcción': ['Valoración Predictiva de Propiedades', 'Recorridos Virtuales (Integración)', 'Gestión de Proyectos de Obra', 'Administración de Contratos', 'Mantenimiento de Edificios', 'Análisis de Zonas de Inversión'],
    'Energía y Servicios Públicos': ['Monitoreo Inteligente de Redes', 'Predicción de Consumos', 'Atención Automática a Cortes', 'Mantenimiento de Infraestructuras', 'Cumplimiento Normativo Energético', 'Facturación Dinámica'],
    'Agricultura y Tecnología Global': ['Monitoreo Satelital Inteligente', 'Predicción de Cosechas', 'Automatización de Riego', 'Gestión de Cadena de Frío', 'Trazabilidad con Blockchain', 'Optimización de Maquinaria'],
    'Entretenimiento y Medios': ['Personalización de Contenidos', 'Análisis de Audiencias', 'Moderación Automática (IA)', 'Producción Asistida', 'Gestión de Derechos', 'Predicción de Tendencias'],
    'Transporte y Movilidad': ['Enrutamiento Dinámico', 'Gestión Inteligente de Flotas', 'Precios de Billetaje Dinámico', 'Soporte al Pasajero', 'Mantenimiento Preventivo de Vehículos', 'Logística Autónoma'],
    'Hostelería y Turismo': ['Precios Dinámicos en Reservas', 'Check-in/Check-out Automatizado', 'Soporte Concierge 24/7', 'Gestión de Personal', 'Análisis de Sentimiento (Reviews)', 'Optimización Energética'],
    'Telecomunicaciones': ['Prevención de Churn (Predicción)', 'Optimización de Redes AI', 'Soporte Técnico Bot', 'Facturación y Cobranza', 'Activación de Nuevos Servicios', 'Detección de Fraude'],
    'Otro': ['Planificación Estratégica AI', 'Experiencia de Usuario Analítica', 'Operaciones Base (RPA)', 'Recursos Humanos y Reclutamiento', 'Ventas y CRM Automatizado', 'Control Financiero Ágil']
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
    tangibleProducts?: string[]
    mermaidDiagram?: string
}

function Mermaid({ chart }: { chart?: string }) {
    const [svgData, setSvgData] = useState<string>('')
    const [error, setError] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!chart) return
        
        console.log("Rendering Mermaid Chart:", chart)

        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif'
        })

        const renderChart = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
                const { svg } = await mermaid.render(id, chart)
                if (isMounted) {
                    setSvgData(svg)
                    setError(false)
                }
            } catch (err) {
                console.error("Mermaid Render Error", err)
                if (isMounted) setError(true)
            }
        }

        renderChart()
        return () => { isMounted = false }
    }, [chart])

    if (error || !chart) return null

    return (
        <div 
            className="flex justify-center w-full overflow-x-auto py-8 text-white [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgData }}
        />
    )
}

export function GeneradorCasosAI() {
    const [step, setStep] = useState<Step>('industry')
    const [industry, setIndustry] = useState('')
    const [processName, setProcessName] = useState('')
    const [maturity, setMaturity] = useState('')
    const [result, setResult] = useState<CaseStudyResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [step])

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
            
            console.log('Case Study Generated:', data.caseStudy)
            setResult(data.caseStudy)
            setStep('result')
        } catch (err: any) {
            console.error('AI Generation Error:', err)
            setError(err.message || 'Ocurrió un error al generar el caso.')
            setStep('maturity') 
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            {/* Minimal Header */}
            <header className="fixed top-0 inset-x-0 z-50 flex items-center h-20 px-6 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
                <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                    Volver al Inicio
                </Link>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
                {/* Header Tracker */}
                {step !== 'result' && step !== 'loading' && (
                    <div className="mb-12 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                            <Sparkles className="h-4 w-4" />
                            Generador de Propuestas AI
                        </span>
                        <div className="flex gap-1.5">
                            {['industry', 'process', 'maturity'].map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${
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
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                            <Building2 className="h-8 w-8" />
                        </div>
                        <h2 className="mb-4 text-4xl sm:text-5xl font-black text-white">¿Cuál es tu industria?</h2>
                        <p className="mb-10 text-xl text-slate-400 md:w-2/3">Selecciona el sector que más se ajuste a tu negocio para que nuestra IA especializada personalice la arquitectura de tu empresa.</p>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {INDUSTRIES.map((ind) => (
                                <button
                                    key={ind}
                                    onClick={() => {
                                        setIndustry(ind)
                                        setStep('process')
                                    }}
                                    className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 px-6 py-5 text-left text-sm font-medium text-slate-300 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-white hover:-translate-y-1 active:scale-95 group"
                                >
                                    {ind}
                                    <ArrowRight className="h-4 w-4 text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Process */}
                {step === 'process' && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <button onClick={() => setStep('industry')} className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">
                            <ChevronLeft className="w-4 h-4" /> Volver a Industrias
                        </button>
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                            <Workflow className="h-8 w-8" />
                        </div>
                        <h2 className="mb-4 text-4xl sm:text-5xl font-black text-white">¿Qué proceso buscas optimizar?</h2>
                        <p className="mb-10 text-xl text-slate-400 md:w-2/3">Identifica el proceso core en el sector <strong>{industry}</strong> que requiere intervención de automatización o IA de alto nivel.</p>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(PROCESSES_MAP[industry] || PROCESSES_MAP['Otro']).map((proc: string) => (
                                <button
                                    key={proc}
                                    onClick={() => {
                                        setProcessName(proc)
                                        setStep('maturity')
                                    }}
                                    className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/30 px-6 py-5 text-left text-sm font-medium text-slate-300 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-white hover:-translate-y-1 active:scale-95 group"
                                >
                                    {proc}
                                    <ArrowRight className="h-4 w-4 text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Maturity */}
                {step === 'maturity' && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-3xl">
                        <button onClick={() => setStep('process')} className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">
                            <ChevronLeft className="w-4 h-4" /> Volver a Procesos
                        </button>
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-300 border border-slate-700/50">
                            <TrendingUp className="h-8 w-8" />
                        </div>
                        <h2 className="mb-4 text-4xl sm:text-5xl font-black text-white">Madurez Digital Actual</h2>
                        <p className="mb-10 text-xl text-slate-400">Esto nos informará si partimos desde cero o si diseñaremos una infraestructura sobre sistemas existentes.</p>
                        
                        {error && (
                            <div className="mb-8 rounded-xl bg-red-500/10 border border-red-500/20 p-5 text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            {MATURITIES.map((mat) => (
                                <button
                                    key={mat.value}
                                    onClick={() => setMaturity(mat.value)}
                                    className={`flex items-center justify-between rounded-xl border px-8 py-6 text-left transition-all active:scale-95 ${
                                        maturity === mat.value 
                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                                        : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg font-medium">{mat.label}</span>
                                    {maturity === mat.value && <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-12 flex pt-6 border-t border-white/5">
                            <button
                                onClick={handleGenerate}
                                disabled={!maturity}
                                className="flex items-center gap-3 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-10 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-300 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Sparkles className="h-5 w-5" /> Generar Propuesta AI
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Loading */}
                {step === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in duration-500">
                        <div className="relative mb-12 flex h-32 w-32 items-center justify-center">
                            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                            <div className="absolute inset-4 animate-pulse rounded-full bg-emerald-500/20" />
                            <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
                        </div>
                        <h3 className="text-3xl font-black text-white">Diseñando tu Arquitectura...</h3>
                        <p className="mt-6 text-xl text-slate-400 max-w-md">
                            Nuestra IA está formulando una propuesta consultiva específica para <strong>{processName}</strong> en el sector <strong>{industry}</strong>.
                        </p>
                    </div>
                )}

                {/* Step 5: Result */}
                {step === 'result' && result && (
                    <div className="animate-in slide-in-from-bottom-8 duration-700 mt-10">
                        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" /> Propuesta Generada por IA
                        </div>
                        
                        <h1 className="mb-12 text-4xl md:text-6xl font-black leading-tight text-white tracking-tight">
                            {result.title}
                        </h1>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            {/* Left Column: Context & Results */}
                            <div className="space-y-8">
                                <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8 md:p-10 backdrop-blur-sm">
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 pb-4 border-b border-white/5">
                                        <TrendingUp className="w-4 h-4" /> Contexto y Desafío
                                    </h4>
                                    <p className="text-slate-300 leading-relaxed text-lg">{result.challenge}</p>
                                </div>
                                
                                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-8 md:p-10 backdrop-blur-sm">
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-emerald-500/70 pb-4 border-b border-emerald-500/10">
                                        <CheckCircle2 className="w-4 h-4" /> Solución Algoritmo T
                                    </h4>
                                    <p className="text-slate-200 leading-relaxed text-lg">{result.solution}</p>
                                </div>
                                
                                <div className="rounded-3xl border border-emerald-400/30 bg-emerald-900/40 p-8 md:p-10 backdrop-blur-sm shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-emerald-300 pb-4 border-b border-emerald-300/10">
                                        <Sparkles className="w-4 h-4" /> Impacto Proyectado
                                    </h4>
                                    <p className="text-emerald-50 leading-relaxed text-xl font-medium">{result.results}</p>
                                </div>
                            </div>

                            {/* Right Column: Tangible Products and Diagram */}
                            <div className="space-y-8">
                                {result.tangibleProducts && result.tangibleProducts.length > 0 && (
                                    <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8 md:p-10 backdrop-blur-sm">
                                        <h4 className="flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-widest text-slate-400 pb-4 border-b border-white/5">
                                            <Package className="w-4 h-4" /> Productos Tangibles a Entregar
                                        </h4>
                                        <ul className="flex flex-col gap-4">
                                            {result.tangibleProducts.map((product, idx) => (
                                                <li key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                                                    <div className="mt-0.5 flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-slate-200 text-lg">{product}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {result.mermaidDiagram && (
                                    <div className="rounded-3xl border border-white/5 bg-slate-950 p-8 md:p-10 backdrop-blur-sm overflow-hidden flex flex-col">
                                        <h4 className="flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-widest text-slate-400 pb-4 border-b border-white/5">
                                            <GitMerge className="w-4 h-4" /> Arquitectura Propuesta
                                        </h4>
                                        <div className="flex-1 w-full bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-center">
                                            <Mermaid chart={result.mermaidDiagram} />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8">
                                    <p className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-500">¿Listo para avanzar?</p>
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <a
                                            href="/#contacto"
                                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-8 py-5 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-slate-200"
                                        >
                                            Agendar Consulta <ArrowRight className="h-4 w-4" />
                                        </a>
                                        <button
                                            onClick={() => setStep('industry')}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-center text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
                                        >
                                            Recalcular Demo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
