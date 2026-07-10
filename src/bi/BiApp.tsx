import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useBiSession } from './lib/session'
import { BI_HOME } from './lib/base'
import { BiLogin } from './BiLogin'
import { BiLayout } from './BiLayout'
import { BiHub } from './BiHub'
import { OfertaModule } from './modules/OfertaModule'
import { LaboralModule } from './modules/LaboralModule'
import { RegionalModule } from './modules/RegionalModule'
import { WorkspaceModule } from './modules/WorkspaceModule'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>{children}</div>
    </div>
  )
}

export default function BiApp() {
  const { status, user, refresh } = useBiSession()

  if (status === 'checking') {
    return (
      <Centered>
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión…</div>
      </Centered>
    )
  }

  if (status === 'unauthenticated') {
    return <BiLogin onSuccess={() => void refresh()} />
  }

  if (status === 'noaccess') {
    return (
      <Centered>
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Acceso restringido</h2>
          <p className="mt-2 text-slate-600">
            Tu usuario <b>{user?.displayName || user?.username}</b> no tiene el permiso <b>Algoritmo BI</b>. Solicítalo
            al administrador (se gestiona en el panel de Usuarios).
          </p>
        </div>
      </Centered>
    )
  }

  return (
    <BiLayout user={user}>
      <Routes>
        <Route index element={<BiHub user={user} />} />
        <Route path="oferta" element={<OfertaModule />} />
        <Route path="laboral" element={<LaboralModule />} />
        <Route path="regional" element={<RegionalModule />} />
        <Route path="workspace" element={<WorkspaceModule />} />
        <Route path="*" element={<Navigate to={BI_HOME} replace />} />
      </Routes>
    </BiLayout>
  )
}
