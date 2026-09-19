/**
 * Learning Builder · sesión del módulo.
 *
 * Reutiliza la sesión del sitio (cookie admin_session), como hacen BI y Project
 * Control, pero decide por su cuenta si deja pasar: hace falta el permiso
 * LEARNING_BUILDER. Así el módulo tiene su propia puerta y su propio mensaje
 * cuando falta el acceso, en vez de heredar el del Ecosistema.
 *
 * Los permisos los resuelve el servidor contra la base de datos, así que se
 * revalidan al volver a la pestaña y cada 30 s: lo que un administrador guarde
 * en /admin/users aplica sin que nadie cierre sesión.
 */
import { useCallback, useEffect, useState } from 'react'

export type LearningUser = {
  id: string
  username: string
  displayName: string
  role: string
  permissions?: Record<string, boolean> | null
} | null

export type LearningStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'noaccess'

const REFRESH_INTERVAL_MS = 30_000

function hasLearningAccess(user: NonNullable<LearningUser>): boolean {
  return user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.permissions?.LEARNING_BUILDER === true
}

export function useLearningSession() {
  const [status, setStatus] = useState<LearningStatus>('checking')
  const [user, setUser] = useState<LearningUser>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' })
      const payload = await res.json().catch(() => null)
      if (res.ok && payload?.authenticated && payload.user) {
        setUser(payload.user)
        setStatus(hasLearningAccess(payload.user) ? 'authenticated' : 'noaccess')
        return
      }
    } catch {
      /* se cae a no autenticado */
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' })
        const payload = await res.json().catch(() => null)
        if (cancelled) return
        if (res.ok && payload?.authenticated && payload.user) {
          setUser(payload.user)
          setStatus(hasLearningAccess(payload.user) ? 'authenticated' : 'noaccess')
          return
        }
      } catch {
        /* se cae a no autenticado */
      }
      if (cancelled) return
      setUser(null)
      setStatus('unauthenticated')
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const revalidate = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(revalidate, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [refresh])

  return { status, user, refresh }
}
