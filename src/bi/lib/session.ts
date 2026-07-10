import { useCallback, useEffect, useState } from 'react'

export type BiUser = {
  id: string
  username: string
  displayName: string
  role: string
  permissions?: Record<string, boolean> | null
} | null

export type BiStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'noaccess'

function hasBiAccess(user: NonNullable<BiUser>): boolean {
  return user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.permissions?.BI === true
}

/** Sesión del módulo BI: reutiliza la sesión del sitio (/api/admin/session) y valida el permiso BI. */
export function useBiSession() {
  const [status, setStatus] = useState<BiStatus>('checking')
  const [user, setUser] = useState<BiUser>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session')
      const payload = await res.json().catch(() => null)
      if (res.ok && payload?.authenticated && payload.user) {
        setUser(payload.user)
        setStatus(hasBiAccess(payload.user) ? 'authenticated' : 'noaccess')
        return
      }
    } catch {
      // fall through
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/session')
        const payload = await res.json().catch(() => null)
        if (cancelled) return
        if (res.ok && payload?.authenticated && payload.user) {
          setUser(payload.user)
          setStatus(hasBiAccess(payload.user) ? 'authenticated' : 'noaccess')
          return
        }
      } catch {
        // fall through
      }
      if (cancelled) return
      setUser(null)
      setStatus('unauthenticated')
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { status, user, refresh, setStatus, setUser }
}

export async function biLogin(identifier: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.ok) {
      const u = payload.user
      if (!(u && (u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.permissions?.BI === true))) {
        return { ok: false, error: 'Tu usuario no tiene acceso al módulo BI.' }
      }
      return { ok: true }
    }
    return { ok: false, error: payload?.error === 'Invalid credentials' ? 'Credenciales inválidas.' : (payload?.error || 'No se pudo iniciar sesión.') }
  } catch {
    return { ok: false, error: 'Error de conexión.' }
  }
}

export async function biLogout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' })
  } catch {
    // ignore
  }
}
