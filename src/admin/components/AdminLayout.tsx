import { type ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Briefcase,
    Package,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    ExternalLink,
    SearchCheck,
    Megaphone,
    BarChart2,
    Home,
    Paintbrush,
    Plug
    , CircleHelp
    , CheckCircle2
    , History
    , RotateCcw
    , AlertTriangle
    , Loader2
} from 'lucide-react'
import { useCMS } from '../context/CMSContext'


interface AdminLayoutProps {
    children: ReactNode
    sessionUser?: {
        displayName: string
        role: string
        username: string
    } | null
}

export function AdminLayout({ children, sessionUser }: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const { persistence, rollbackSection, refreshHistory } = useCMS()
    const [isCmsStatusOpen, setIsCmsStatusOpen] = useState(false)

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, group: 'cms' },
        { name: 'Home', href: '/admin/home', icon: Home, group: 'cms' },
        { name: 'Servicios', href: '/admin/services', icon: Briefcase, group: 'cms' },
        { name: 'Productos', href: '/admin/products', icon: Package, group: 'cms' },
        { name: 'Configuración', href: '/admin/settings', icon: Settings, group: 'cms' },
        { name: 'Diseño', href: '/admin/design', icon: Paintbrush, group: 'cms' },
        { name: 'SEO Manager', href: '/admin/seo', icon: SearchCheck, group: 'growth' },
        { name: 'Marketing', href: '/admin/marketing', icon: Megaphone, group: 'growth' },
        { name: 'Analítica', href: '/admin/analytics', icon: BarChart2, group: 'growth' },
        { name: 'Integraciones', href: '/admin/integrations', icon: Plug, group: 'infra' },
    ]

    const confirmLeaveIfPending = () => {
        if (!persistence.pendingChanges) return true
        return window.confirm('Hay cambios pendientes de guardar en el CMS. ¿Deseas salir de esta sección de todas formas?')
    }

    const handleLogout = async () => {
        if (!confirmLeaveIfPending()) return
        try {
            await fetch('/api/admin/logout', { method: 'POST' })
        } catch {
            // Best-effort logout; still clear local hint and redirect.
        } finally {
            localStorage.removeItem('admin_token')
            navigate('/admin/login')
        }
    }

    const pageHelp: Record<string, { title: string; intro: string; data: string; steps: string[]; notes?: string[] }> = {
        '/admin/dashboard': {
            title: 'Dashboard',
            intro: 'Monitorea el estado operativo real del sistema (CMS, traducciones, integraciones y tiempos de respuesta).',
            data: 'Fuente: `/api/admin-metrics` (Vercel Functions + Neon). No usa datos demo.',
            steps: [
                'Revisa KPIs (servicios, productos, traducciones cache, integraciones activas).',
                'Valida “Actividad reciente” para cambios de CMS e integraciones.',
                'Usa “API Response Time” y “Global Node” para diagnosticar performance.',
            ],
        },
        '/admin/home': {
            title: 'Home',
            intro: 'Edita contenido, estilos, imágenes/video y comportamiento visual del Home con vista previa real.',
            data: 'Fuente: CMS real en `/api/cms` + Neon. Uploads de assets pueden ir a R2.',
            steps: [
                'Selecciona una pestaña (Hero, Servicios, Productos, Frameworks, Contacto, Visual Global).',
                'Modifica campos y valida en la “vista previa real” (mismo render del sitio).',
                'Usa “Subir a R2” para imágenes/branding y luego “Guardar Todo”.',
                'Verifica en “Ver Home” que el resultado publicado coincide.',
            ],
            notes: ['La preview del Hero ya usa el mismo componente del sitio público.', 'YouTube en fondo de Hero está soportado.'],
        },
        '/admin/services': {
            title: 'Servicios',
            intro: 'Administra catálogo real de servicios y su contenido de detalle/SEO.',
            data: 'Fuente: CMS real (`services`) en `/api/cms` + Neon.',
            steps: [
                'Editar servicio existente o crear uno nuevo.',
                'Completar slug, textos, features, outcomes y SEO.',
                'Guardar y validar en la ruta pública `/servicios/:slug`.',
            ],
        },
        '/admin/products': {
            title: 'Productos',
            intro: 'Administra catálogo real de productos y detalles/SEO.',
            data: 'Fuente: CMS real (`products`) en `/api/cms` + Neon.',
            steps: [
                'Editar o crear producto.',
                'Completar precio, CTA, descripciones, variantes y SEO.',
                'Guardar y validar en `/productos/:slug`.',
            ],
        },
        '/admin/settings': {
            title: 'Configuración',
            intro: 'Gestiona datos globales del sitio (contacto, links, metadata básica).',
            data: 'Fuente: CMS real (`site`) en `/api/cms` + Neon.',
            steps: [
                'Edita nombre, descripción, URL, correo y enlaces.',
                'Guarda y valida impacto en footer/contacto/marketing.',
            ],
        },
        '/admin/design': {
            title: 'Diseño',
            intro: 'Controla tema global, tipografías, bordes, branding (logo/favicon) y loader público.',
            data: 'Fuente: `design` en CMS real + inyección de tokens CSS en tiempo real.',
            steps: [
                'Usa pestañas Colores / Tipografía / Forma & Layout / Branding & Assets.',
                'Sube logo, favicon y loader logo a R2 desde esta sección.',
                'Activa loader global si deseas una intro visual en el sitio público.',
                'Guarda y verifica cambios en header, footer, favicon y UI.',
            ],
            notes: ['“Restaurar Diseño Default” solo resetea estilos (no contenido CMS).'],
        },
        '/admin/seo': {
            title: 'SEO Manager',
            intro: 'Edita y valida campos SEO de servicios, productos y páginas gestionadas.',
            data: 'Fuente: CMS real (`services/products/site`) + persistencia en `/api/cms`.',
            steps: [
                'Busca una ruta o slug.',
                'Edita SEO title/description.',
                'Guarda y recarga para verificar persistencia.',
            ],
        },
        '/admin/marketing': {
            title: 'Marketing',
            intro: 'Construye URLs/campañas y assets de crecimiento con datos reales del sitio.',
            data: 'Fuente: CMS real (`site.url`, servicios, productos).',
            steps: [
                'Selecciona destino/campaña.',
                'Completa UTM parameters.',
                'Copia/valida la URL generada.',
            ],
        },
        '/admin/analytics': {
            title: 'Analítica',
            intro: 'Visualiza métricas reales de operación (traducciones cache, cobertura SEO, integraciones).',
            data: 'Fuente: `/api/admin-metrics` + CMS local para cobertura SEO.',
            steps: [
                'Revisa series de traducciones por día.',
                'Valida cache por idioma.',
                'Usa cobertura SEO para encontrar rutas incompletas.',
            ],
        },
        '/admin/integrations': {
            title: 'Integraciones',
            intro: 'Configura proveedores (Gemini, OpenAI, SMTP, Cloudflare R2) con persistencia real y uso server-side.',
            data: 'Fuente: `/api/integrations` + Neon. Variables de entorno del servidor tienen prioridad.',
            steps: [
                'Configura credenciales y activa cada integración.',
                'Guarda y recarga para validar persistencia.',
                'Para R2, define `publicUrl` y asegúrate de acceso público habilitado.',
                'Prueba upload desde Home/Diseño para validar extremo a extremo.',
            ],
        },
    }

    const activeHelp = pageHelp[location.pathname]

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside
                className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'
                    }`}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
                        <div className="w-8 h-8 bg-brand-primary flex items-center justify-center font-black">A</div>
                        <span className="font-black tracking-tighter text-xl">ADMIN</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    {(['cms', 'growth', 'infra'] as const).map(group => {
                        const items = navigation.filter(n => n.group === group)
                        if (!items.length) return null
                        const groupLabel: Record<string, string> = { cms: 'Contenido', growth: 'Crecimiento', infra: 'Infraestructura' }
                        return (
                            <div key={group} className="mb-4">
                                {isSidebarOpen && (
                                    <div className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 px-3 py-2">{groupLabel[group]}</div>
                                )}
                                <div className="space-y-0.5">
                                    {items.map(item => {
                                        const isActive = location.pathname === item.href
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.href}
                                                onClick={(e) => {
                                                    if (location.pathname === item.href) return
                                                    if (!confirmLeaveIfPending()) e.preventDefault()
                                                }}
                                                className={`flex items-center gap-4 p-3 transition-all ${isActive
                                                    ? 'bg-brand-primary text-white'
                                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <item.icon className="w-5 h-5 shrink-0" />
                                                <span className={`font-medium transition-opacity ${!isSidebarOpen && 'opacity-0 w-0'}`}>
                                                    {item.name}
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <Link
                        to="/"
                        onClick={(e) => {
                            if (!confirmLeaveIfPending()) e.preventDefault()
                        }}
                        className="flex items-center gap-4 p-3 text-white/40 hover:text-white transition-colors mb-2"
                    >
                        <ExternalLink className="w-5 h-5" />
                        <span className={`${!isSidebarOpen && 'hidden'}`}>Ver Sitio</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className={`font-medium ${!isSidebarOpen && 'opacity-0 w-0'}`}>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Shield className="w-5 h-5 text-brand-primary" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                            {navigation.find(n => n.href === location.pathname)?.name || 'Panel Control'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {activeHelp && (
                            <button
                                onClick={() => setIsHelpOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-500 hover:text-brand-primary hover:border-brand-primary transition-colors text-[11px] font-black uppercase tracking-widest"
                            >
                                <CircleHelp className="w-4 h-4" />
                                Instrucciones
                            </button>
                        )}
                        <button
                            onClick={() => setIsCmsStatusOpen(v => !v)}
                            className={`inline-flex items-center gap-2 px-4 py-2 border transition-colors text-[11px] font-black uppercase tracking-widest ${
                                persistence.pendingChanges
                                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                                    : persistence.status === 'error'
                                        ? 'border-red-300 text-red-700 bg-red-50'
                                        : persistence.status === 'saving' || persistence.status === 'retrying'
                                            ? 'border-blue-300 text-blue-700 bg-blue-50'
                                            : 'border-slate-200 text-slate-500 hover:text-brand-primary hover:border-brand-primary'
                            }`}
                            title="Estado de persistencia CMS"
                        >
                            {(persistence.status === 'saving' || persistence.status === 'retrying') ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                persistence.status === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                                    <History className="w-4 h-4" />}
                            {labelForCmsStatus(persistence.status)}
                        </button>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">{sessionUser?.displayName || 'Admin AlgoritmoT'}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                {sessionUser ? `${sessionUser.role} · @${sessionUser.username}` : 'Nivel de Acceso: 01'}
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-slate-200 rounded-none border-t-2 border-brand-primary"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            {isHelpOpen && activeHelp && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)} />
                    <div className="relative ml-auto w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Ayuda del Administrador</div>
                                <h3 className="text-2xl font-black tracking-tighter text-slate-900">{activeHelp.title}</h3>
                                <p className="text-sm text-slate-500 mt-2">{activeHelp.intro}</p>
                            </div>
                            <button onClick={() => setIsHelpOpen(false)} className="text-slate-300 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                            <div className="bg-slate-50 border border-slate-200 p-5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fuente de datos</div>
                                <div className="text-sm text-slate-700">{activeHelp.data}</div>
                            </div>

                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Cómo usar esta sección</div>
                                <div className="space-y-3">
                                    {activeHelp.steps.map((step, idx) => (
                                        <div key={idx} className="flex items-start gap-3 border border-slate-200 p-4">
                                            <div className="w-6 h-6 shrink-0 bg-slate-900 text-white text-xs font-black flex items-center justify-center">{idx + 1}</div>
                                            <div className="text-sm text-slate-700">{step}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!!activeHelp.notes?.length && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Notas importantes</div>
                                    <div className="space-y-2">
                                        {activeHelp.notes.map((note, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-primary shrink-0" />
                                                <span>{note}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isCmsStatusOpen && (
                <div className="fixed bottom-6 right-6 z-40 w-[460px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 shadow-2xl">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Persistencia CMS</div>
                            <div className="text-sm font-bold text-slate-900">Estado de guardado / historial / rollback</div>
                        </div>
                        <button onClick={() => setIsCmsStatusOpen(false)} className="text-slate-300 hover:text-slate-700">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <StatusCard label="Estado" value={labelForCmsStatus(persistence.status)} tone={statusTone(persistence.status)} />
                            <StatusCard label="Pendientes" value={persistence.pendingChanges ? 'Sí' : 'No'} tone={persistence.pendingChanges ? 'amber' : 'green'} />
                            <StatusCard label="Reintentos" value={String(persistence.retryCount)} />
                            <StatusCard label="Último guardado" value={persistence.lastSavedAt ? new Date(persistence.lastSavedAt).toLocaleTimeString() : '—'} />
                        </div>

                        {!!persistence.changedSections.length && (
                            <div className="border border-slate-200 p-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Secciones con cambios</div>
                                <div className="flex flex-wrap gap-2">
                                    {persistence.changedSections.map((section) => (
                                        <span key={section} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                                            {section}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {persistence.lastError && (
                            <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {persistence.lastError}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historial reciente (rollback por sección)</div>
                            <button
                                onClick={() => void refreshHistory()}
                                className="text-[10px] font-black uppercase tracking-widest text-brand-primary"
                            >
                                Recargar
                            </button>
                        </div>
                        <div className="max-h-72 overflow-auto border border-slate-200 divide-y divide-slate-100">
                            {persistence.historyLoading && (
                                <div className="p-4 text-xs text-slate-500">Cargando historial...</div>
                            )}
                            {!persistence.historyLoading && persistence.history.length === 0 && (
                                <div className="p-4 text-xs text-slate-500">No hay versiones disponibles aún.</div>
                            )}
                            {persistence.history.map((v) => (
                                <div key={v.id} className="p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{v.section}</div>
                                        <div className="text-xs text-slate-700 truncate">
                                            {new Date(v.createdAt).toLocaleString()} · {v.createdBy || 'system'}
                                        </div>
                                        {v.note && <div className="text-[10px] text-slate-400 truncate">{v.note}</div>}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const ok = window.confirm(`Revertir la sección "${v.section}" a esta versión?`)
                                            if (!ok) return
                                            await rollbackSection(v.id)
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-brand-primary hover:text-brand-primary"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Rollback
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function labelForCmsStatus(status: string) {
    const map: Record<string, string> = {
        hydrating: 'Cargando',
        idle: 'Sin cambios',
        draft: 'Borrador',
        saving: 'Guardando',
        retrying: 'Reintentando',
        saved: 'Guardado',
        error: 'Error',
    }
    return map[status] || status
}

function statusTone(status: string): 'slate' | 'blue' | 'green' | 'amber' | 'red' {
    if (status === 'saved' || status === 'idle') return 'green'
    if (status === 'saving' || status === 'retrying' || status === 'hydrating') return 'blue'
    if (status === 'draft') return 'amber'
    if (status === 'error') return 'red'
    return 'slate'
}

function StatusCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red' }) {
    const toneClass: Record<string, string> = {
        slate: 'border-slate-200 bg-slate-50 text-slate-900',
        blue: 'border-blue-200 bg-blue-50 text-blue-900',
        green: 'border-green-200 bg-green-50 text-green-900',
        amber: 'border-amber-200 bg-amber-50 text-amber-900',
        red: 'border-red-200 bg-red-50 text-red-900',
    }
    return (
        <div className={`border p-3 ${toneClass[tone]}`}>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
            <div className="text-sm font-bold truncate">{value}</div>
        </div>
    )
}
