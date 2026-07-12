import type { ReactNode } from 'react'
import { useEcoSession } from './lib/session'
import { EcosistemaLogin } from './EcosistemaLogin'
import { EcosistemaHub } from './EcosistemaHub'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>{children}</div>
    </div>
  )
}

export default function EcosistemaApp() {
  const { status, user, refresh } = useEcoSession()

  if (status === 'checking') {
    return <Centered><div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión…</div></Centered>
  }
  if (status === 'unauthenticated') {
    return <EcosistemaLogin onSuccess={() => void refresh()} />
  }
  return <EcosistemaHub user={user} onLogout={() => void refresh()} />
}
