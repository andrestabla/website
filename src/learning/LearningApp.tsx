/**
 * Learning Builder — raíz del módulo.
 *
 * Tiene su propia puerta, como Algoritmo BI y Project Control: valida la sesión
 * y el permiso del módulo por su cuenta, muestra su propio login y su propio
 * mensaje cuando falta el acceso. Vive bajo /ecosistema/learning, pero no
 * depende de la pantalla de acceso del Ecosistema.
 */
import { type ReactNode } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { Library } from 'lucide-react'
import { useLearningSession } from './lib/session'
import { LearningLogin } from './LearningLogin'
import { LearningHome } from './LearningHome'
import { ResourceBuilder } from './ResourceBuilder'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>{children}</div>
    </div>
  )
}

export default function LearningApp() {
  const { status, user, refresh } = useLearningSession()

  if (status === 'checking') {
    return (
      <Centered>
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Validando sesión…</div>
      </Centered>
    )
  }

  if (status === 'unauthenticated') {
    return <LearningLogin onSuccess={() => void refresh()} />
  }

  if (status === 'noaccess') {
    return (
      <Centered>
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white">
            <Library size={20} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Acceso restringido</h2>
          <p className="mt-2 text-slate-600">
            Tu usuario <b>{user?.displayName || user?.username}</b> no tiene el permiso <b>Learning Builder</b>.
            Solicítalo a un administrador; se gestiona en el panel de Usuarios.
          </p>
          <Link to="/ecosistema" className="mt-5 inline-block text-[13px] font-bold text-rose-600 hover:underline">
            Volver al Ecosistema
          </Link>
        </div>
      </Centered>
    )
  }

  return (
    <Routes>
      <Route index element={<LearningHome />} />
      <Route path=":resourceId" element={<ResourceBuilder />} />
      <Route path="*" element={<Navigate to="/ecosistema/learning" replace />} />
    </Routes>
  )
}
