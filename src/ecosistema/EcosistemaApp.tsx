import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { canAccessModule } from '../admin/lib/permissions'
import { useEcoSession } from './lib/session'
import { EcosistemaLogin } from './EcosistemaLogin'
import { EcosistemaHub } from './EcosistemaHub'
import { CotizadorList } from '../cotizador/CotizadorList'
import { QuoteBuilder } from '../cotizador/QuoteBuilder'
import { ClaudiaRemote } from './ClaudiaRemote'
import { LicenciasPage } from './LicenciasPage'
import { LearningHome } from '../learning/LearningHome'
import { ResourceBuilder } from '../learning/ResourceBuilder'

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

  const cotizadorAllowed = canAccessModule(user, 'COTIZADOR')
  const learningAllowed = canAccessModule(user, 'LEARNING_BUILDER')

  return (
    <Routes>
      <Route index element={<EcosistemaHub user={user} onLogout={() => void refresh()} />} />
      <Route
        path="cotizador"
        element={cotizadorAllowed ? <CotizadorList /> : <Navigate to="/ecosistema" replace />}
      />
      <Route
        path="cotizador/:quoteId"
        element={cotizadorAllowed ? <QuoteBuilder /> : <Navigate to="/ecosistema" replace />}
      />
      {/* Learning Builder: constructor de OVA. El API revalida el permiso. */}
      <Route
        path="learning"
        element={learningAllowed ? <LearningHome /> : <Navigate to="/ecosistema" replace />}
      />
      <Route
        path="learning/:resourceId"
        element={learningAllowed ? <ResourceBuilder /> : <Navigate to="/ecosistema" replace />}
      />
      {/* Licencias del plugin de Moodle: el API revalida el permiso. */}
      <Route
        path="licencias"
        element={canAccessModule(user, 'LICENCES') ? <LicenciasPage /> : <Navigate to="/ecosistema" replace />}
      />
      {/* Control remoto del equipo del profe: solo el propietario (el API lo revalida). */}
      <Route
        path="claudia"
        element={user?.role === 'SUPERADMIN' ? <ClaudiaRemote /> : <Navigate to="/ecosistema" replace />}
      />
      <Route path="*" element={<Navigate to="/ecosistema" replace />} />
    </Routes>
  )
}
