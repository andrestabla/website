import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCMS } from '../../admin/context/CMSContext'
import { getOrCreateVisitorId, getSessionId, getStoredConsent } from '../../lib/privacyConsent'

function canTrackPopup(policyVersion: string) {
    const consent = getStoredConsent()
    return !!consent && consent.decision === 'accepted' && consent.policyVersion === policyVersion
}

function postPopupEvent(eventType: 'popup_view' | 'popup_cta_click' | 'popup_dismiss', path: string, policyVersion: string) {
    if (!canTrackPopup(policyVersion)) return
    const payload = JSON.stringify({
        visitorId: getOrCreateVisitorId(),
        sessionId: getSessionId(),
        events: [{ eventType, path, metadata: { source: 'smart_popup' } }],
    })
    void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => { })
}

export function SmartPopup() {
    const { state } = useCMS()
    const { pathname, search } = useLocation()
    const site = state.site
    const [visible, setVisible] = useState(false)
    const storageKey = 'algoritmot_popup_seen_v2'
    const currentPath = `${pathname}${search}`
    const popupEnabled = site.popupEnabled === 'true'
    const popupTrigger = site.popupTrigger || 'time'
    const popupPages = site.popupPages || 'all'
    const popupFrequency = site.popupFrequency || 'once_session'
    const popupDelaySeconds = Math.max(1, Math.min(120, Number(site.popupDelaySeconds || '8')))
    const popupScrollPercent = Math.max(10, Math.min(90, Number(site.popupScrollPercent || '40')))
    const popupHref = site.popupCtaHref || '/#contacto'
    const isExternalPopupHref = /^https?:\/\//i.test(popupHref)
    const isPathAllowed = useMemo(() => {
        if (popupPages === 'all') return true
        if (popupPages === 'home') return pathname === '/'
        if (popupPages === 'services') return pathname.startsWith('/servicios')
        if (popupPages === 'products') return pathname.startsWith('/productos')
        if (popupPages === 'protocols') return pathname.startsWith('/protocolos')
        return true
    }, [pathname, popupPages])

    useEffect(() => {
        if (pathname.startsWith('/admin')) return
        if (!popupEnabled) return
        if (!isPathAllowed) return
        if (!site.popupTitle?.trim()) return
        if (!site.popupBody?.trim()) return

        const isSeen = () => {
            if (popupFrequency === 'always') return false
            if (popupFrequency === 'once_session') {
                return sessionStorage.getItem(storageKey) === '1'
            }
            const today = new Date().toISOString().slice(0, 10)
            return localStorage.getItem(storageKey) === today
        }

        if (isSeen()) {
            setVisible(false)
            return
        }

        let timeoutId: number | null = null
        let armed = true
        const open = () => {
            if (!armed) return
            setVisible(true)
            postPopupEvent('popup_view', currentPath, site.dataPolicyVersion || 'v1')
        }

        const onScroll = () => {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight
            if (scrollable <= 0) return
            const ratio = (window.scrollY / scrollable) * 100
            if (ratio >= popupScrollPercent) {
                window.removeEventListener('scroll', onScroll)
                open()
            }
        }

        const onMouseOut = (e: MouseEvent) => {
            if (!e.relatedTarget && e.clientY <= 0) {
                document.removeEventListener('mouseout', onMouseOut)
                open()
            }
        }

        if (popupTrigger === 'scroll') {
            window.addEventListener('scroll', onScroll, { passive: true })
        } else if (popupTrigger === 'exit') {
            document.addEventListener('mouseout', onMouseOut)
        } else {
            timeoutId = window.setTimeout(open, popupDelaySeconds * 1000)
        }

        return () => {
            armed = false
            if (timeoutId) window.clearTimeout(timeoutId)
            window.removeEventListener('scroll', onScroll)
            document.removeEventListener('mouseout', onMouseOut)
        }
    }, [
        currentPath,
        isPathAllowed,
        pathname,
        popupDelaySeconds,
        popupEnabled,
        popupFrequency,
        popupScrollPercent,
        popupTrigger,
        site.dataPolicyVersion,
        site.popupBody,
        site.popupTitle,
    ])

    const markSeen = () => {
        if (popupFrequency === 'always') return
        if (popupFrequency === 'once_session') {
            sessionStorage.setItem(storageKey, '1')
            return
        }
        const today = new Date().toISOString().slice(0, 10)
        localStorage.setItem(storageKey, today)
    }

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-4 sm:p-8">
            <button
                type="button"
                aria-label="Cerrar popup"
                onClick={() => {
                    markSeen()
                    setVisible(false)
                    postPopupEvent('popup_dismiss', currentPath, site.dataPolicyVersion || 'v1')
                }}
                className="absolute inset-0 bg-slate-950/50"
            />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 shadow-2xl p-8 sm:p-10">
                <button
                    type="button"
                    onClick={() => {
                        markSeen()
                        setVisible(false)
                        postPopupEvent('popup_dismiss', currentPath, site.dataPolicyVersion || 'v1')
                    }}
                    className="absolute top-4 right-4 w-9 h-9 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-primary">Conversion Builder</div>
                <h3 className="mt-3 text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                    {site.popupTitle}
                </h3>
                <p className="mt-4 text-slate-600 font-light leading-relaxed">
                    {site.popupBody}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                    {isExternalPopupHref ? (
                        <a
                            href={popupHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                                markSeen()
                                setVisible(false)
                                postPopupEvent('popup_cta_click', currentPath, site.dataPolicyVersion || 'v1')
                            }}
                            className="h-12 px-6 bg-brand-primary text-white text-xs font-black uppercase tracking-[0.2em] inline-flex items-center justify-center hover:bg-blue-800 transition-colors"
                        >
                            {site.popupCtaLabel || 'Ver más'}
                        </a>
                    ) : (
                        <Link
                            to={popupHref}
                            onClick={() => {
                                markSeen()
                                setVisible(false)
                                postPopupEvent('popup_cta_click', currentPath, site.dataPolicyVersion || 'v1')
                            }}
                            className="h-12 px-6 bg-brand-primary text-white text-xs font-black uppercase tracking-[0.2em] inline-flex items-center justify-center hover:bg-blue-800 transition-colors"
                        >
                            {site.popupCtaLabel || 'Ver más'}
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            markSeen()
                            setVisible(false)
                            postPopupEvent('popup_dismiss', currentPath, site.dataPolicyVersion || 'v1')
                        }}
                        className="h-12 px-6 border border-slate-200 text-xs font-black uppercase tracking-[0.2em] text-slate-600 hover:text-slate-900 bg-white"
                    >
                        {site.popupDismissLabel || 'Cerrar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
