import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BRAND_MARK } from '../lib/seo'
import { pcLogout, type PcUser } from './lib/session'
import { CONTROL_HOME } from './lib/base'

export function ControlLayout({ children, user }: { children: ReactNode; user: PcUser }) {
  const navigate = useNavigate()
  const initials = (user?.displayName || user?.username || 'PC')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await pcLogout()
    navigate(CONTROL_HOME, { replace: true })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-5 print:hidden">
        <NavLink to={CONTROL_HOME} className="flex items-center gap-2.5">
          <img src={BRAND_MARK} alt="Algoritmo T" className="h-8 w-8 shrink-0" />
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">
              PROJECT<span className="text-indigo-600">CONTROL</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">Tableros de seguimiento</div>
          </div>
        </NavLink>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-3 pr-1">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{initials}</div>
          <span className="hidden text-[13px] font-semibold sm:block">{user?.displayName || user?.username}</span>
          <button onClick={handleLogout} title="Cerrar sesión" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:text-rose-600">
            ⏻
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
