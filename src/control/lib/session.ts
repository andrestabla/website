import { useCallback, useEffect, useState } from 'react'

export type PcUser = {
  id: string
  username: string
  displayName: string
  role: string
  permissions?: Record<string, boolean> | null
} | null

export type PcStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'noaccess'

function hasControlAccess(user: NonNullable<PcUser>): boolean {
  return user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.permissions?.PROJECT_CONTROL === true
}

// ── Evento global para volver al login cuando el API responde 401 ────────────
const UNAUTH_EVENT = 'pc:unauthorized'
export function emitPcUnauthorized() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTH_EVENT))
}
export function onPcUnauthorized(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(UNAUTH_EVENT, cb)
  return () => window.removeEventListener(UNAUTH_EVENT, cb)
}

/** Sesión del módulo: reutiliza la sesión del sitio y valida el permiso PROJECT_CONTROL. */
export function useControlSession() {
  const [status, setStatus] = useState<PcStatus>('checking')
  const [user, setUser] = useState<PcUser>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session')
      const payload = await res.json().catch(() => null)
      if (res.ok && payload?.authenticated && payload.user) {
        setUser(payload.user)
        setStatus(hasControlAccess(payload.user) ? 'authenticated' : 'noaccess')
        return
      }
    } catch {
      /* fall through */
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => onPcUnauthorized(() => {
    setUser(null)
    setStatus('unauthenticated')
  }), [])

  return { status, user, refresh: load }
}

// ── Login (reutiliza el flujo admin con 2FA) ────────────────────────────────
export type PcLoginResult =
  | { status: 'ok' }
  | { status: 'twoFactor'; email: string }
  | { status: 'error'; error: string; expired?: boolean }

function accessOk(u: NonNullable<PcUser>) {
  return u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.permissions?.PROJECT_CONTROL === true
}

function mapLoginError(payload: any): string {
  if (payload?.noEmail) return 'Tu usuario no tiene correo configurado y la verificación en dos pasos lo requiere. Pide a un administrador que lo añada.'
  if (payload?.error === 'Invalid credentials') return 'Credenciales inválidas.'
  if (payload?.error === 'User suspended') return 'Tu usuario está suspendido.'
  if (payload?.error === 'Password setup required') return 'Debes activar tus credenciales desde el enlace enviado a tu correo.'
  return payload?.error || 'No se pudo iniciar sesión.'
}

export async function pcStartLogin(identifier: string, password: string): Promise<PcLoginResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.twoFactor) return { status: 'twoFactor', email: payload.email || '' }
    if (res.ok && payload?.user) {
      return accessOk(payload.user) ? { status: 'ok' } : { status: 'error', error: 'Tu usuario no tiene acceso a Project Control.' }
    }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

export type PcVerifyResult = { status: 'ok' } | { status: 'error'; error: string; expired?: boolean }

export async function pcVerifyLoginCode(code: string): Promise<PcVerifyResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.user) {
      return accessOk(payload.user) ? { status: 'ok' } : { status: 'error', error: 'Tu usuario no tiene acceso a Project Control.' }
    }
    if (payload?.twoFactorExpired) return { status: 'error', error: 'El código venció o hubo demasiados intentos. Vuelve a iniciar sesión.', expired: true }
    if (payload?.error === 'Invalid code') {
      return { status: 'error', error: typeof payload?.remaining === 'number' ? `Código incorrecto. Te quedan ${payload.remaining} intento(s).` : 'Código incorrecto.' }
    }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

export async function pcLogout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' })
  } catch {
    /* ignore */
  }
}

// ── Recuperación de contraseña ("olvidé mi contraseña") ──
export type PcResetResult = { status: 'ok'; message: string } | { status: 'error'; error: string }

export async function pcRequestPasswordReset(identifier: string): Promise<PcResetResult> {
  try {
    const res = await fetch('/api/admin/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim() }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.ok) return { status: 'ok', message: payload.message || 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.' }
    return { status: 'error', error: payload?.error || 'No se pudo procesar la solicitud.' }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}
