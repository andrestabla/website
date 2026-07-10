import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { biLogout, type BiUser } from './lib/session'
import { BI_HOME, biPath } from './lib/base'
import { AssistantProvider } from './assistant/AssistantContext'
import { AssistantBubble } from './assistant/AssistantBubble'

const MODULES = [
  { to: biPath('/oferta'), label: 'Oferta educativa' },
  { to: biPath('/laboral'), label: 'Laboral y empleabilidad' },
  { to: biPath('/regional'), label: 'Análisis regional' },
  { to: biPath('/workspace'), label: 'Workspace' },
]

export function BiLayout({ children, user }: { children: ReactNode; user: BiUser }) {
  const navigate = useNavigate()
  const initials = (user?.displayName || user?.username || 'BI')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await biLogout()
    navigate(BI_HOME, { replace: true })
    window.location.reload()
  }

  return (
    <AssistantProvider>
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-5 print:hidden">
        <NavLink to={BI_HOME} className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-black text-white">◧</div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">
              ALGORITMO<span className="text-indigo-600">BI</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">Educación Superior · Colombia</div>
          </div>
        </NavLink>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {MODULES.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-3 pr-1">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{initials}</div>
          <span className="hidden text-[13px] font-semibold sm:block">{user?.displayName || user?.username}</span>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:text-rose-600"
          >
            ⏻
          </button>
        </div>
      </header>
      <main>{children}</main>
      <AssistantBubble />
    </div>
    </AssistantProvider>
  )
}
