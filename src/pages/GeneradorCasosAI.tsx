import { useState, useEffect } from 'react'
import { ArrowRight, Loader2, Sparkles, Building2, Workflow, TrendingUp, CheckCircle2, ChevronLeft, Package, GitMerge, Mail, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import mermaid from 'mermaid'
import { getOrCreateVisitorId, getSessionId } from '../lib/privacyConsent'

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
    'Finanzas y Banca': [
        'Detección de Fraude en Tiempo Real (IA)', 'Evaluación de Riesgo Crediticio (ML)', 'Automatización de Cumplimiento (KYC/AML)', 
        'Optimización de Tesorería', 'Conciliación Bancaria Automatizada', 'Procesamiento de Hipotecas (OCR)', 
        'Chatbots de Atención 24/7', 'Análisis de Sentimiento de Inversores', 'Gestión de Activos Inteligente',
        'Prevención de Lavado de Activos', 'Seguridad en Transacciones Digitales', 'Automatización de Auditoría Interna',
        'Sistemas de Recomendación de Productos', 'Mapeo de Customer Journey Bancario', 'Optimización de Cajeros (IoT)',
        'Personalización de Ofertas en App', 'Reporting Regulatorio Automático', 'Gestión de Reclamaciones (IA)',
        'Análisis de Churn de Clientes', 'Ciberseguridad Proactiva', 'Modernización de Core Bancario'
    ],
    'Salud y Medicina': [
        'Triaje de Pacientes Asistido por IA', 'Análisis de Imágenes Diagnósticas (Visión)', 'Gestión de Historias Clínicas Electrónicas',
        'Optimización de Turnos Quirúrgicos', 'Seguimiento Remoto de Pacientes (IoT)', 'Automatización de Facturación Médica',
        'Gestión de Suministros Hospitalarios', 'Predicción de Reingresos Hospitalarios', 'Análisis Genómico de Datos',
        'Telemedicina y Videoconsulta', 'Soporte a la Decisión Clínica', 'Automatización de Farmacia y Recetas',
        'Monitorización de Signos Vitales', 'Gestión de Biobancos', 'Optimización de Logística de Ambulancias',
        'Análisis de Satisfacción del Paciente', 'Cumplimiento Normativo (HIPAA)', 'Marketing de Salud Personalizado',
        'Mantenimiento de Equipos Médicos', 'Investigación Clínica Digitalizada', 'Onboarding de Personal Sanitario'
    ],
    'Retail y Comercio Electrónico': [
        'Personalización de Recomendaciones (IA)', 'Precios Dinámicos y Competitivos', 'Gestión de Inventario Predictiva',
        'Optimización de Logística de Última Milla', 'Chatbots de Venta y Soporte', 'Análisis de Tráfico en Tiendas Físicas',
        'Detección de Fraude en Pagos', 'Gestión de Devoluciones Automatizada', 'Sistemas de Fidelización Inteligentes',
        'Búsqueda Visual de Productos', 'Optimización de Campañas de Email', 'Prevención de Quiebre de Stock',
        'Análisis de Cesta de la Compra', 'Automatización de Almacenes', 'Sistemas de POS en la Nube',
        'Omnicanalidad (Click & Collect)', 'Gestión de Marketplace de Terceros', 'Procesamiento de Pedidos (RPA)',
        'Análisis de Reseñas y Feedback', 'Planificación de Espacio (Planogramas)', 'Segmentación de Audiencias'
    ],
    'Manufactura y Logística': [
        'Mantenimiento Predictivo de Maquinaria', 'Optimización de Rutas de Transporte', 'Control de Calidad por Visión Artificial',
        'Planificación de la Producción (BPMN)', 'Gestión de Inventarios (WMS)', 'Trazabilidad de Cadena de Suministro',
        'Automatización de Líneas de Ensamblaje', 'Seguridad Industrial (IoT)', 'Gestión de Flotas con Telemetría',
        'Análisis de Eficiencia Energética', 'Diseño de Productos Asistido (CIM)', 'Gemelos Digitales (Digital Twins)',
        'Gestión de Compras y Sourcing', 'Optimización de Carga de Vehículos', 'Sistemas de Alerta Temprana',
        'Reporte de Sostenibilidad Automático', 'Onboarding de Operarios', 'Gestión de Documentación de Aduana',
        'Monitorización de Condiciones de Carga', 'Predicción de Demanda de Materia Prima', 'Lean Manufacturing Digital'
    ],
    'Tecnología y Software': [
        'Generación de Código Asistida (IA)', 'QA y Pruebas Automatizadas', 'Gestión de Incidentes (SRE)',
        'Optimización de Infraestructura Cloud', 'Documentación de Código Automática', 'Análisis de Ciberseguridad Proactiva',
        'Soporte Técnico de Nivel 1 (LLMs)', 'Monitoreo de Performance (APM)', 'Gestión de Ciclo de Vida de API',
        'Análisis de Uso de Producto', 'Automatización de Pipelines CI/CD', 'Onboarding de Desarrolladores',
        'Gestión de Cumplimiento (SOC2/GDPR)', 'Modernización de Aplicaciones Legacy', 'Sistemas de Recomendación SaaS',
        'Facturación por Consumo (Billing)', 'Gestión de Backlog de Producto', 'Análisis de Sentimiento en GitHub',
        'Predicción de Capacidad de Servidores', 'Automatización de Ventas B2B', 'Arquitectura de Microservicios'
    ],
    'Educación': [
        'Plataformas de Aprendizaje Adaptativo', 'Calificación Automática de Ensayos', 'Sistemas de Gestión Escolar (LMS)',
        'Análisis de Riesgo de Deserción', 'Tutoría Virtual 24/7 (AI)', 'Gestión de Admisiones Automatizada',
        'Creación de Contenidos Educativos', 'Certificación con Blockchain', 'Optimización de Horarios Docentes',
        'Bibliotecas Digitales Inteligentes', 'Seguimiento de Egresados', 'Marketing para Captación de Alumnos',
        'Sistemas de Pagos de Colegiaturas', 'Evaluaciones de Desempeño Docente', 'Inclusión y Accesibilidad Digital',
        'Gestión de Investigaciones Académicas', 'Gamificación del Aprendizaje', 'Análisis de Feedback de Alumnos',
        'Optimización de Mantenimiento de Campus', 'Realidad Virtual en el Aula', 'Onboarding de Nuevos Estudiantes'
    ],
    'Servicios Profesionales': [
        'Generación de Propuestas de Consultoría', 'Revisión Legal Automática de Contratos', 'Gestión de Proyectos (PMO Digital)',
        'Facturación y Seguimiento de Tiempos', 'Análisis de Rentabilidad por Cliente', 'Onboarding de Clientes (Digital)',
        'Automatización de Auditorías Fiscales', 'Búsqueda de Talentos (Recruiting AI)', 'Asistentes de Agenda Inteligentes',
        'Gestión de Documentos y Archivos', 'Business Intelligence para Decisores', 'Sistemas de Gestión del Conocimiento',
        'Automatización de Marketing de Contenidos', 'Gestión de Alianzas y Partners', 'Análisis de Riesgo Regulatorio',
        'Reporting para Clientes Automático', 'Colaboración en Remoto Segura', 'Investigación de Mercado Digital',
        'Optimización de Estrategia de Precios', 'Soporte Multi-idioma para Clientes', 'Transformación Cultural Digital'
    ],
    'Bienes Raíces y Construcción': [
        'Valoración Predictiva de Inmuebles', 'Gestión de Proyectos de Construcción', 'Marketing Digital Inmobiliario',
        'Administración de Propiedades (PropTech)', 'Automatización de Contratos de Arrendamiento', 'Sistemas de Recorridos 3D',
        'Análisis de Inversión Inmobiliaria', 'Mantenimiento de Edificios (BIM)', 'CRM para Agentes Inmobiliarios',
        'Seguridad en Obras (Visión Artificial)', 'Gestión de Permisos y Licencias', 'Optimización Energética de Edificios',
        'Logística de Materiales de Obra', 'Reporting de Avance a Inversores', 'Análisis de Zonas de Desarrollo',
        'Firma Digital de Escrituras', 'Gestión de Postventa y Garantías', 'Sistemas de Control de Acceso',
        'Venta de Propiedades sobre Planos', 'Modelado 4D de Construcción', 'Automatización de Presupuestos'
    ],
    'Energía y Servicios Públicos': [
        'Gestión de Redes Eléctricas Inteligentes', 'Mantenimiento de Infraestructura Crítica', 'Predicción de Demanda Energética',
        'Facturación y Lectura de Medidores', 'Atención a Cortes de Servicio (IA)', 'Gestión de Energías Renovables',
        'Cumplimiento Normativo Ambiental', 'Optimización de Plantas de Tratamiento', 'Seguridad en Instalaciones (Drones)',
        'Análisis de Pérdidas no Técnicas', 'Mercados de Energía en Tiempo Real', 'Movilidad Eléctrica y Carga',
        'Gestión de Residuos Urbanos', 'Sistemas de Alerta por Emergencias', 'Monitoreo de Tuberías y Fugas',
        'Onboarding de Clientes de Servicios', 'Reporting de Impacto de Carbono', 'Automatización de Despacho',
        'Mantenimiento de Parques Eólicos/Solares', 'Educación al Usuario en Consumo', 'Ciberseguridad en OT/IT'
    ],
    'Agricultura y Tecnología Global': [
        'Agricultura de Precisión (Sensores/GPS)', 'Predicción de Cosechas por Clima', 'Monitorización de Suelos Digital',
        'Automatización de Riego Inteligente', 'Gestión de Maquinaria Autónoma', 'Trazabilidad con Blockchain',
        'Control de Plagas y Enfermedades (IA)', 'Gestión de Mercados de Commodities', 'Logística de Perecederos',
        'Análisis Satelital de Cultivos', 'Seguros Agrícolas Basados en Índices', 'Bienestar Animal (Monitoreo IoT)',
        'Gestión de Recursos Hídricos', 'Cumplimiento de Estándares de Exportación', 'Optimización de Fertilizantes',
        'E-commerce Directo del Productor', 'Onboarding de Trabajadores Agrícolas', 'Gestión Documental de Exportación',
        'Desarrollo de Invernaderos Inteligentes', 'Análisis Genético de Semillas', 'Sostenibilidad de Cadenas de Valor'
    ],
    'Entretenimiento y Medios': [
        'Recomendación de Contenido Personalizada', 'Moderación de Comentarios (NLP)', 'Optimización de Publicidad Digital',
        'Producción de Video Asistida por IA', 'Gestión de Derechos de Autor (Rights)', 'Análisis de Tendencias de Audiencia',
        'Distribución de Contenido Multiplataforma', 'Periodismo de Datos Automatizado', 'Personalización de Eventos Digitales',
        'Venta de Entradas y Ticketing', 'Detección de Piratería Digital', 'Traducción y Doblaje Automático',
        'Análisis de Sentimiento en Redes Sociales', 'Gestión de Activos Digitales (DAM)', 'Optimización de Streaming (Video)',
        'Influencer Marketing Analítico', 'Creación de Guiones con IA', 'Realidad Aumentada para Fan Engagement',
        'Gamificación de Experiencias de Marca', 'Monetización de Contenidos (Paywalls)', 'Estrategia de Suscripciones'
    ],
    'Transporte y Movilidad': [
        'Optimización de Rutas Urbanas', 'Gestión de Flotas Públicas', 'Sistemas de Pago sin Contacto',
        'Mantenimiento Preventivo de Autobuses', 'Análisis de Demanda en Tiempo Real', 'Movilidad como Servicio (MaaS)',
        'Control de Tráfico Inteligente', 'Gestión de Logística Aeroportuaria', 'Seguridad Vial y Monitoreo (IA)',
        'Atención al Pasajero Multicanal', 'Gestión de Puertos y Terminales', 'Micro-movilidad (Scooters/Bicis)',
        'Optimización de Almacenamiento Ferroviario', 'Facturación Automática de Peajes', 'Reporte de Huella de Carbono',
        'Gestión de Entregas con Drones', 'Mantenimiento de Vías e Infraestructura', 'Analítica de Desempeño de Conductores',
        'Onboarding de Choferes y Personal', 'Sistemas de Navegación de Flota', 'Optimización de Carga y Descarga'
    ],
    'Hostelería y Turismo': [
        'Revenue Management (Precios Dinámicos)', 'Check-in y Check-out Digital', 'Personalización de Experiencias de Huésped',
        'Gestión de Reservas y Sincronización', 'Atención al Cliente vía WhatsApp/Bot', 'Optimización de Limpieza y Habitaciones',
        'Análisis de Reseñas (Reputación Online)', 'Gestión de Inventario de F&B', 'Sistemas de Recomendación Turística',
        'Marketing de Destinos Digital', 'Programas de Lealtad Inteligentes', 'Optimización de Energía en Hoteles',
        'Onboarding de Personal Estacional', 'Gestión de Eventos y Convenciones', 'Análisis de Sentimiento del Turista',
        'Sistemas de Seguridad y Acceso', 'Tour Virtuales por Instalaciones', 'Gestión de Compras y Proveedores',
        'Digitalización de Menús y Pedidos', 'Control de Costos Operativos', 'Sostenibilidad en Operación Turística'
    ],
    'Telecomunicaciones': [
        'Prevención de Fuga de Clientes (Churn)', 'Optimización de Redes 5G (IA)', 'Soporte Técnico Especializado (Bots)',
        'Análisis de Experiencia del Usuario (QoE)', 'Detección de Fraude en Llamadas/Datos', 'Automatización de Facturación',
        'Gestión de Inventario de Red', 'Mantenimiento Preventivo de Antenas', 'Marketing de Ofertas en Tiempo Real',
        'Onboarding de Nuevos Abonados', 'Gestión de Cumplimiento Regulatorio', 'Sistemas de Cobranza Inteligentes',
        'Análisis de Tráfico de Datos', 'Despliegue de Infraestructura (Planificación)', 'Optimización de Contact Center',
        'Venta Cruzada de Servicios Digitales', 'Gestión de Interconexión', 'Análisis de Competencia en Tarifas',
        'Ciberseguridad de Red Core', 'Soporte a Operadores Virtuales (MVNO)', 'Transformación hacia Telco Cloud'
    ],
    'Otro': [
        'Planificación Estratégica Digital', 'Optimización de Operaciones Internas', 'Automatización de Flujos Documentales',
        'Análisis de Datos para Toma de Decisiones', 'Implementación de IA en Procesos Base', 'Gestión de Talento y Cultura Digital',
        'Marketing y Ventas Automatizadas', 'Control de Gestión Financiera', 'Gestión de Riesgos y Cumplimiento',
        'Mejora de la Experiencia del Cliente', 'Modernización de Infraestructura IT', 'Migración a la Nube (Cloud)',
        'Gestión de Proyectos Ágiles', 'Seguridad de la Información', 'Desarrollo de Nuevos Productos Digitales',
        'Automatización de Reportes Gerenciales', 'Análisis de Viabilidad de Innovación', 'Onboarding Digital General',
        'Optimización de Canales de Comunicación', 'Diseño de Arquitectura Empresarial', 'Estrategia de Transformación Digital'
    ]
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
            theme: 'default',
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
            className="flex justify-center w-full overflow-x-auto py-8 text-slate-900 [&>svg]:max-w-full [&>svg]:h-auto"
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
    const [emailModalOpen, setEmailModalOpen] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [sendingEmail, setSendingEmail] = useState(false)
    const [emailSuccess, setEmailSuccess] = useState(false)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [step])

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userEmail || !result) return
        
        setSendingEmail(true)
        setError(null)
        try {
            const res = await fetch('/api/send-case-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: userEmail, 
                    caseStudy: result,
                    industry,
                    processName,
                    visitorId: getOrCreateVisitorId(),
                    sessionId: getSessionId(),
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al enviar el correo')
            
            setEmailSuccess(true)
            setTimeout(() => {
                setEmailModalOpen(false)
                setEmailSuccess(false)
            }, 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSendingEmail(false)
        }
    }

    const handleGenerate = async () => {
        setStep('loading')
        setError(null)
        try {
            const res = await fetch('/api/generate-case-study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    industry,
                    processName,
                    maturity,
                    visitorId: getOrCreateVisitorId(),
                    sessionId: getSessionId(),
                })
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
                <Link to="/empresas" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">
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
                                        <TrendingUp className="w-4 h-4" /> Contexto
                                    </h4>
                                    <p className="text-slate-300 leading-relaxed text-lg">{result.challenge}</p>
                                </div>
                                
                                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 p-8 md:p-10 backdrop-blur-sm">
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-emerald-500/70 pb-4 border-b border-emerald-500/10">
                                        <CheckCircle2 className="w-4 h-4" /> Esbozo de propuesta
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
                                            <Package className="w-4 h-4" /> Productos tangibles
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
                                    <div className="rounded-3xl border border-white/5 bg-white p-8 md:p-10 shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
                                        <h4 className="flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-widest text-slate-500 pb-4 border-b border-slate-100">
                                            <GitMerge className="w-4 h-4" /> Arquitectura del proceso propuesta
                                        </h4>
                                        <div className="flex-1 w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-center">
                                            <Mermaid chart={result.mermaidDiagram} />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8">
                                    <p className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-500">¿Listo para avanzar?</p>
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <a
                                            href={`https://wa.me/573044544525?text=${encodeURIComponent(
                                                `Hola, estoy interesado(a) en digitalización para el sector ${industry}. Específicamente en el proceso de ${processName}.\n\nVi la propuesta generada por IA: "${result.title}" y me gustaría agendar una consulta para profundizar en esta arquitectura.`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-8 py-5 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-slate-200"
                                        >
                                            Agendar Consulta <ArrowRight className="h-4 w-4" />
                                        </a>
                                        <button
                                            onClick={() => setEmailModalOpen(true)}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-center text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
                                        >
                                            <Mail className="h-4 w-4" /> Enviar por Correo
                                        </button>
                                        <button
                                            onClick={() => {
                                                setResult(null)
                                                setIndustry('')
                                                setProcessName('')
                                                setMaturity('')
                                                setStep('industry')
                                            }}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-center text-sm font-black uppercase tracking-[0.2em] text-white/50 transition-colors hover:bg-white/10"
                                        >
                                            Recalcular Demo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Email Modal */}
                        {emailModalOpen && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
                                <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setEmailModalOpen(false)} />
                                <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                                    <button 
                                        onClick={() => setEmailModalOpen(false)}
                                        className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                    
                                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <Mail className="h-8 w-8" />
                                    </div>
                                    
                                    <h3 className="mb-2 text-2xl font-black text-white">Recibe tu propuesta</h3>
                                    <p className="mb-8 text-slate-400">Ingresa tu correo electrónico para enviarte los detalles técnicos de esta arquitectura.</p>
                                    
                                    {emailSuccess ? (
                                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-emerald-400 text-center animate-in fade-in duration-500">
                                            <CheckCircle2 className="h-10 w-10 mx-auto mb-4" />
                                            <p className="font-bold">¡Enviado con éxito!</p>
                                            <p className="text-sm mt-1 text-emerald-400/70">Revisa tu bandeja de entrada en unos instantes.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendEmail} className="space-y-6">
                                            <div>
                                                <input 
                                                    type="email" 
                                                    required
                                                    placeholder="tu@correo.com"
                                                    value={userEmail}
                                                    onChange={(e) => setUserEmail(e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-4 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                                                />
                                            </div>
                                            
                                            {error && (
                                                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                                    {error}
                                                </p>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={sendingEmail}
                                                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {sendingEmail ? (
                                                    <>
                                                        <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        Enviar Propuesta <ArrowRight className="h-4 w-4" />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
