import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useCMS } from '../../admin/context/CMSContext'
import { getOrCreateVisitorId, getSessionId, getStoredConsent } from '../../lib/privacyConsent'

type TelemetryEvent = {
  eventType: 'page_view' | 'section_view' | 'page_exit'
  path?: string
  pageTitle?: string
  sectionId?: string
  durationMs?: number
  referrer?: string
  metadata?: any
}

function canTrack(policyVersion: string) {
  const consent = getStoredConsent()
  return !!consent && consent.decision === 'accepted' && consent.policyVersion === policyVersion
}

function postEvents(events: TelemetryEvent[]) {
  if (!events.length) return
  const payload = JSON.stringify({
    visitorId: getOrCreateVisitorId(),
    sessionId: getSessionId(),
    events,
  })
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/track', blob)
      return
    } catch {
      // fallback fetch below
    }
  }
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: payload,
  }).catch(() => {})
}

export function SiteTelemetry() {
  const { pathname, search } = useLocation()
  const { state } = useCMS()
  const currentPathRef = useRef<string>('')
  const startedAtRef = useRef<number>(0)
  const sectionsSeenRef = useRef<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (state.site.dataPolicyEnabled === 'false') return
    const policyVersion = state.site.dataPolicyVersion || 'v1'
    if (!canTrack(policyVersion)) return

    const path = `${pathname}${search}`
    const prevPath = currentPathRef.current
    if (prevPath) {
      postEvents([{
        eventType: 'page_exit',
        path: prevPath,
        durationMs: Date.now() - startedAtRef.current,
        metadata: { sections: Array.from(sectionsSeenRef.current) },
      }])
    }

    currentPathRef.current = path
    startedAtRef.current = Date.now()
    sectionsSeenRef.current = new Set()

    postEvents([{
      eventType: 'page_view',
      path,
      pageTitle: document.title,
      referrer: document.referrer || undefined,
    }])

    observerRef.current?.disconnect()
    const observer = new IntersectionObserver((entries) => {
      const newEvents: TelemetryEvent[] = []
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue
        const target = entry.target as HTMLElement
        const id = (target.dataset.trackSection || target.id || '').trim()
        if (!id || id.length > 120) continue
        if (sectionsSeenRef.current.has(id)) continue
        sectionsSeenRef.current.add(id)
        newEvents.push({
          eventType: 'section_view',
          path,
          sectionId: id,
          pageTitle: document.title,
        })
      }
      if (newEvents.length) postEvents(newEvents)
    }, { threshold: [0.35, 0.6] })
    observerRef.current = observer

    const targets = Array.from(document.querySelectorAll<HTMLElement>('main [data-track-section], main section[id], main > div[id]'))
    targets.forEach((el) => observer.observe(el))

    const handleBeforeUnload = () => {
      postEvents([{
        eventType: 'page_exit',
        path: currentPathRef.current,
        durationMs: Date.now() - startedAtRef.current,
        metadata: { sections: Array.from(sectionsSeenRef.current) },
      }])
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      observer.disconnect()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname, search, state.site.dataPolicyEnabled, state.site.dataPolicyVersion])

  return null
}
