import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useControlSession } from './lib/session'
import { CONTROL_HOME } from './lib/base'
import { ControlLogin } from './ControlLogin'
import { ControlLayout } from './ControlLayout'
import { BoardsList } from './BoardsList'
import { BoardEditor } from './BoardEditor'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>{children}</div>
    </div>
  )
}

export default function ControlApp() {
  const { status, user, refresh } = useControlSession()

  if (status === 'checking') {
    return <Centered><div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión…</div></Centered>
  }

  if (status === 'unauthenticated') {
    return <ControlLogin onSuccess={() => void refresh()} />
  }

  if (status === 'noaccess') {
    return (
      <Centered>
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Acceso restringido</h2>
          <p className="mt-2 text-slate-600">
            Tu usuario <b>{user?.displayName || user?.username}</b> no tiene el permiso <b>Project Control</b>. Solicítalo
            al administrador (se gestiona en el panel de Usuarios).
          </p>
        </div>
      </Centered>
    )
  }

  return (
    <ControlLayout user={user}>
      <Routes>
        <Route index element={<BoardsList />} />
        <Route path=":id" element={<BoardEditor />} />
        <Route path="*" element={<Navigate to={CONTROL_HOME} replace />} />
      </Routes>
    </ControlLayout>
  )
}
