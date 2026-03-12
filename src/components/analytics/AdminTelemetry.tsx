import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function AdminTelemetry() {
  const { pathname, search } = useLocation()
  const previousPathRef = useRef<string>('')

  useEffect(() => {
    if (!pathname.startsWith('/admin')) return
    if (pathname === '/admin/login' || pathname === '/admin/setup') return

    const path = `${pathname}${search || ''}`
    const fromPath = previousPathRef.current || undefined
    previousPathRef.current = path

    const payload = JSON.stringify({
      action: 'NAVIGATE',
      path,
      fromPath,
    })

    void fetch('/api/admin/navigation-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: payload,
    }).catch(() => {})
  }, [pathname, search])

  return null
}
