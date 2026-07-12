import { useCallback, useEffect, useState } from 'react'

export type EcoUser = {
  id: string
  username: string
  displayName: string
  role: string
  permissions?: Record<string, boolean> | null
} | null

export type EcoStatus = 'checking' | 'authenticated' | 'unauthenticated'

/** Sesión del Ecosistema: reutiliza la sesión del sitio. Cualquier usuario autenticado entra. */
export function useEcoSession() {
  const [status, setStatus] = useState<EcoStatus>('checking')
  const [user, setUser] = useState<EcoUser>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session')
      const payload = await res.json().catch(() => null)
      if (res.ok && payload?.authenticated && payload.user) {
        setUser(payload.user)
        setStatus('authenticated')
        return
      }
    } catch {
      /* fall through */
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => { void load() }, [load])
  return { status, user, refresh: load }
}

// ── Login (reutiliza el flujo admin con 2FA); acepta cualquier usuario válido ──
export type EcoLoginResult =
  | { status: 'ok' }
  | { status: 'twoFactor'; email: string }
  | { status: 'error'; error: string; expired?: boolean }

function mapLoginError(payload: any): string {
  if (payload?.noEmail) return 'Tu usuario no tiene correo configurado y la verificación en dos pasos lo requiere. Pide a un administrador que lo añada.'
  if (payload?.error === 'Invalid credentials') return 'Credenciales inválidas.'
  if (payload?.error === 'User suspended') return 'Tu usuario está suspendido.'
  if (payload?.error === 'Password setup required') return 'Debes activar tus credenciales desde el enlace enviado a tu correo.'
  return payload?.error || 'No se pudo iniciar sesión.'
}

export async function ecoStartLogin(identifier: string, password: string): Promise<EcoLoginResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.twoFactor) return { status: 'twoFactor', email: payload.email || '' }
    if (res.ok && payload?.user) return { status: 'ok' }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

export type EcoVerifyResult = { status: 'ok' } | { status: 'error'; error: string; expired?: boolean }

export async function ecoVerifyLoginCode(code: string): Promise<EcoVerifyResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    const payload = await res.json().catch(() => null)
    if (res.ok && payload?.user) return { status: 'ok' }
    if (payload?.twoFactorExpired) return { status: 'error', error: 'El código venció o hubo demasiados intentos. Vuelve a iniciar sesión.', expired: true }
    if (payload?.error === 'Invalid code') {
      return { status: 'error', error: typeof payload?.remaining === 'number' ? `Código incorrecto. Te quedan ${payload.remaining} intento(s).` : 'Código incorrecto.' }
    }
    return { status: 'error', error: mapLoginError(payload) }
  } catch {
    return { status: 'error', error: 'Error de conexión.' }
  }
}

export async function ecoLogout() {
  try { await fetch('/api/admin/logout', { method: 'POST' }) } catch { /* ignore */ }
}
