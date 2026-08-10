import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, Gauge, Mail, Calendar, FolderOpen, BarChart2, ShieldCheck, ArrowRight, GraduationCap, ClipboardList, ExternalLink, FileSignature, Bot } from 'lucide-react'
import { canAccessModule, hasAdminBridge, type AdminModuleKey } from '../admin/lib/permissions'
import { ecoLogout, type EcoUser } from './lib/session'

type Mod = { module: AdminModuleKey; name: string; desc: string; to: string; accent: string; icon: any; tag: string; external?: boolean }

const MODULES: Mod[] = [
  { module: 'BI', name: 'Algoritmo BI', desc: 'Observatorios de oferta educativa, laboral y análisis regional con asistente de IA.', to: '/bi', accent: 'from-blue-600 to-sky-500', icon: Gauge, tag: 'Inteligencia' },
  { module: 'PROJECT_CONTROL', name: 'Project Control', desc: 'Tableros de seguimiento tipo hoja de cálculo, 100% customizables y compartibles.', to: '/control', accent: 'from-indigo-600 to-sky-500', icon: LayoutGrid, tag: 'Tableros' },
  { module: 'COTIZADOR', name: 'Cotizador', desc: 'Cotizaciones interactivas construidas con IA, con URL propia y métricas de lectura.', to: '/ecosistema/cotizador', accent: 'from-cyan-600 to-teal-500', icon: FileSignature, tag: 'Comercial' },
  { module: 'PROFE_TABLA', name: 'ProfeTabla', desc: 'Plataforma educativa ProfeTabla.', to: 'https://profetabla.com', accent: 'from-rose-500 to-orange-500', icon: GraduationCap, tag: 'Educación', external: true },
  { module: 'MIS_PROYECTOS', name: 'Mis Proyectos', desc: 'Tableros y seguimiento de proyectos (plataforma hermana).', to: 'https://misproyectos.com.co', accent: 'from-teal-600 to-emerald-500', icon: ClipboardList, tag: 'Proyectos', external: true },
  { module: 'LEADS', name: 'Contactos', desc: 'Ver y atender los contactos y solicitudes recibidas.', to: '/admin/leads', accent: 'from-emerald-600 to-green-500', icon: Mail, tag: 'CRM' },
  { module: 'BOOKINGS', name: 'Citas', desc: 'Gestiona reservas, citas y disponibilidad.', to: '/admin/bookings', accent: 'from-amber-500 to-orange-500', icon: Calendar, tag: 'Agenda' },
  { module: 'DOCUMENTS', name: 'Gestor Documental', desc: 'Sube, organiza y comparte archivos con trazabilidad.', to: '/admin/documentos', accent: 'from-fuchsia-600 to-purple-500', icon: FolderOpen, tag: 'Documentos' },
  { module: 'ANALYTICS', name: 'Analítica', desc: 'Consulta estadísticas de tráfico y comportamiento.', to: '/admin/analytics', accent: 'from-cyan-600 to-blue-500', icon: BarChart2, tag: 'Métricas' },
]

export function EcosistemaHub({ user, onLogout }: { user: EcoUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const modules = MODULES.filter((m) => canAccessModule(user, m.module))
  const admin = hasAdminBridge(user)

  const initials = (user?.displayName || user?.username || 'AT')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const logout = async () => { await ecoLogout(); onLogout(); navigate('/ecosistema', { replace: true }); window.location.reload() }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><LayoutGrid size={16} /></div>
        <div className="leading-tight">
          <div className="text-sm font-black tracking-tight">Ecosistema digital <span className="text-indigo-600">Algoritmo T</span></div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-3 pr-1">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{initials}</div>
          <span className="hidden text-[13px] font-semibold sm:block">{user?.displayName || user?.username}</span>
          <button onClick={logout} title="Cerrar sesión" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:text-rose-600">⏻</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-black tracking-tight">Hola, {(user?.displayName || 'usuario').split(' ')[0]}</h1>
        <p className="mb-8 mt-1 text-sm text-slate-500">Estos son los módulos habilitados para tu cuenta. Entra con un clic.</p>

        {modules.length === 0 && !admin ? (
          <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
            <div>
              <div className="text-sm font-semibold text-slate-600">Aún no tienes módulos habilitados</div>
              <div className="mt-1 text-[13px] text-slate-400">Solicita acceso a un administrador.</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const inner = (
                <>
                  <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${m.accent} text-white`}><m.icon size={22} /></div>
                  <h3 className="mt-3 flex items-center gap-1.5 text-[17px] font-bold tracking-tight">
                    {m.name}
                    {m.external && <ExternalLink size={14} className="text-slate-300" />}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{m.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] text-slate-500">{m.tag}</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">Abrir <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></div>
                </>
              )
              const cls = 'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg'
              return m.external ? (
                <a key={m.module} href={m.to} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
              ) : (
                <Link key={m.module} to={m.to} className={cls}>{inner}</Link>
              )
            })}

            {user?.role === 'SUPERADMIN' && (
              <Link
                to="/ecosistema/claudia"
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white"><Bot size={22} /></div>
                <h3 className="mt-3 text-[17px] font-bold tracking-tight">Claudia remoto</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">Envía tareas a tu asistente en la Mac desde cualquier lugar y consulta los resultados.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] text-slate-500">Asistente</span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10.5px] text-violet-600">Solo propietario</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">Abrir <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></div>
              </Link>
            )}

            {admin && (
              <Link
                to="/admin/dashboard"
                className="group relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 p-6 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur"><ShieldCheck size={22} /></div>
                <h3 className="mt-3 text-[17px] font-bold tracking-tight">Panel de administración</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-300">Gestión del sitio, usuarios, marketing, SEO y configuración.</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-300">Abrir <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></div>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
