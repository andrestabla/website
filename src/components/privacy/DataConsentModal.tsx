import { useMemo, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Shield, ChevronRight } from 'lucide-react'
import { useCMS } from '../../admin/context/CMSContext'
import { getOrCreateVisitorId, getSessionId, getStoredConsent, setStoredConsent } from '../../lib/privacyConsent'

type Props = {
  onDecision?: (decision: 'accepted' | 'rejected') => void
}

export function DataConsentModal({ onDecision }: Props) {
  const { state } = useCMS()
  const { pathname } = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dismissedForVersion, setDismissedForVersion] = useState<string | null>(null)

  const site = state.site
  const policyVersion = site.dataPolicyVersion || 'v1'
  const enabled = site.dataPolicyEnabled !== 'false'

  const shouldShow = useMemo(() => {
    if (!enabled) return false
    if (pathname.startsWith('/admin')) return false
    if (dismissedForVersion === policyVersion) return false
    const consent = getStoredConsent()
    if (!consent) return true
    return consent.policyVersion !== policyVersion
  }, [enabled, pathname, policyVersion, dismissedForVersion])

  if (!shouldShow) return null

  const stopEvent = (e: ReactMouseEvent | ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDecision = async (decision: 'accepted' | 'rejected', e?: ReactMouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const now = new Date().toISOString()
    // Hide immediately in UI while persisting the decision.
    setDismissedForVersion(policyVersion)
    setStoredConsent({
      decision,
      policyVersion,
      acceptedAt: decision === 'accepted' ? now : undefined,
      updatedAt: now,
    })
    onDecision?.(decision)
    if (decision !== 'accepted') return

    try {
      setSubmitting(true)
      await fetch('/api/privacy-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          visitorId: getOrCreateVisitorId(),
          sessionId: getSessionId(),
          path: window.location.pathname + window.location.search + window.location.hash,
          policyVersion,
          policyText: site.dataPolicyContent || site.dataPolicySummary || '',
        }),
      })
    } catch {
      // Local consent still stands; server trace can be retried on next page.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] md:inset-x-6 pointer-events-none">
      <div
        className="mx-auto max-w-5xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_16px_60px_rgba(15,23,42,0.12)] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 md:px-5 md:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-9 h-9 shrink-0 border border-slate-200 bg-brand-surface text-brand-primary flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Datos y Analítica</div>
                <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{site.dataPolicyTitle || 'Política de tratamiento de datos'}</h3>
                <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl">
                  {expanded ? (site.dataPolicyContent || site.dataPolicySummary) : (site.dataPolicySummary || site.dataPolicyContent)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExpanded(v => !v)
                    }}
                    className="font-semibold text-slate-500 hover:text-slate-700"
                  >
                    {expanded ? 'Ver menos' : 'Ver más'}
                  </button>
                  <Link
                    to="/politica-tratamiento-datos"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-black uppercase tracking-[0.15em] text-brand-primary hover:opacity-80"
                  >
                    {site.dataPolicyLinkLabel || 'Leer política'}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                  <span className="text-slate-400">Versión {policyVersion}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:pl-4">
              <button
                type="button"
                onMouseDown={stopEvent}
                onClick={(e) => handleDecision('rejected', e)}
                className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {site.dataPolicyRejectLabel || 'Continuar sin analítica'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onMouseDown={stopEvent}
                onClick={(e) => handleDecision('accepted', e)}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] bg-brand-primary text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Guardando...' : (site.dataPolicyAcceptLabel || 'Aceptar')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
