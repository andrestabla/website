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

export type BiLoginResult =
  | { status: 'ok' }
  | { status: 'twoFactor'; email: string }
  | { status: 'error'; error: string; expired?: boolean }

export type BiVerifyResult = { status: 'ok' } | { status: 'error'; error: string; expired?: boolean }

function biAccessOk(u: NonNullable<BiUser>) {
  return u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.permissions?.BI === true
}

function mapLoginError(payload: any): string {
  if (payload?.noEmail) return 'Tu usuario no tiene correo configurado y la verificación en dos pasos lo requiere. Pide a un administrador que lo añada.'
  if (payload?.error === 'Invalid credentials') return 'Credenciales inválidas.'
  if (payload?.error === 'User suspended') return 'Tu usuario está suspendido.'
  if (payload?.error === 'Password setup required') return 'Debes activar tus credenciales desde el enlace enviado a tu correo.'
  if (payload?.error === 'Could not send verification code') return 'No se pudo enviar el código de verificación.'
  return payload?.error || 'No se pudo iniciar sesión.'
}

/** Paso 1: valida credenciales; el backend envía un código al correo (2FA). */
export async function biStartLogin(identifier: string, password: string): Promise<BiLoginResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.twoFactor) return { status: 'twoFactor', email: payload.email || '' }
    if (res.ok && payload?.user) {
      return biAccessOk(payload.user) ? { status: 'ok' } : { status: 'error', error: 'Tu usuario no tiene acceso al módulo BI.' }
    }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

/** Paso 2: verifica el código enviado al correo. */
export async function biVerifyLoginCode(code: string): Promise<BiVerifyResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.user) {
      return biAccessOk(payload.user) ? { status: 'ok' } : { status: 'error', error: 'Tu usuario no tiene acceso al módulo BI.' }
    }
    if (payload?.twoFactorExpired) {
      return { status: 'error', error: 'El código venció o hubo demasiados intentos. Vuelve a iniciar sesión.', expired: true }
    }
    if (payload?.error === 'Invalid code') {
      return {
        status: 'error',
        error: typeof payload?.remaining === 'number' ? `Código incorrecto. Te quedan ${payload.remaining} intento(s).` : 'Código incorrecto.',
      }
    }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

export async function biLogout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' })
  } catch {
    // ignore
  }
}
