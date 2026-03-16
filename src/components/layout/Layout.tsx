import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { LanguageSelector } from './LanguageSelector'
import { useLanguage } from '../../context/LanguageContext'
import { useCMS } from '../../admin/context/CMSContext'

interface LayoutProps {
    children: ReactNode
    isFocusedFlow?: boolean
}


function getRouteTemplate(pathname: string, site: ReturnType<typeof useCMS>['state']['site']) {
    if (pathname === '/') return site.pageTemplateHome || 'immersive'
    if (pathname.startsWith('/servicios')) return site.pageTemplateService || 'balanced'
    if (pathname.startsWith('/productos')) return site.pageTemplateProduct || 'balanced'
    if (pathname.startsWith('/protocolos')) return site.pageTemplateProtocol || 'immersive'
    if (pathname.startsWith('/politica-tratamiento-datos')) return site.pageTemplatePolicy || 'compact'
    return 'balanced'
}

export function Layout({ children, isFocusedFlow }: LayoutProps) {

    const { uiText } = useLanguage()
    const { state } = useCMS()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const site = state.site
    const design = state.design
    const useImageLogo = design.logoMode === 'image' && !!design.logoUrl
    const useImageFooterLogo = design.logoMode === 'image' && !!(design.logoFooterUrl || design.logoUrl)
    const headerVariant = site.headerVariant || 'classic'
    const footerVariant = site.footerVariant || 'detailed'
    const isHeaderSticky = site.headerSticky !== 'false'
    const currentPath = location.pathname
    const baseCandidate = ['/educacion', '/plataformas-de-aprendizaje', '/virtualizacion-programas', '/auditoria-programas-virtuales', '/empresas'].find(p => currentPath.startsWith(p)) || '/empresas'
    const isPlataformasPath = currentPath.startsWith('/plataformas-de-aprendizaje')
    const forceEducationNav =
        isPlataformasPath ||
        currentPath.startsWith('/virtualizacion-programas') ||
        currentPath.startsWith('/auditoria-programas-virtuales')
    const navBasePath = forceEducationNav ? '/educacion' : baseCandidate

    const normalizeLocalAnchor = (url: string) => {
        const trimmed = (url || '').trim()
        if (trimmed.startsWith('#')) return `${baseCandidate}${trimmed}`
        if (trimmed.startsWith('/#')) return `${baseCandidate}${trimmed.slice(1)}`
        
        // If it starts with /empresas# but we are in another context, relink it
        if (trimmed.startsWith('/empresas#') && baseCandidate !== '/empresas') {
            return trimmed.replace('/empresas#', `${baseCandidate}#`)
        }
        
        return trimmed
    }
    const headerCtaHref = normalizeLocalAnchor(site.headerCtaHref || '#contacto')
    const announcementHref = normalizeLocalAnchor(site.announcementHref || '#contacto')
    const isExternalHeaderCta = /^https?:\/\//i.test(headerCtaHref)
    const isExternalAnnouncement = /^https?:\/\//i.test(announcementHref)
    const headerCtaEnabled = site.headerCtaEnabled === 'true' && !!site.headerCtaLabel?.trim() && !!headerCtaHref.trim()
    const announcementEnabled = site.announcementEnabled === 'true' && !!site.announcementText?.trim()
    const announcementHeight = announcementEnabled ? 40 : 0
    const headerHeight = headerVariant === 'minimal' ? 64 : 80
    const headerHeightClass = headerHeight === 64 ? 'h-16' : 'h-20'
    const routeTemplate = useMemo(() => getRouteTemplate(location.pathname, site), [location.pathname, site])
    const servicesHref = `${navBasePath}#servicios`
    const workflowAnchor = navBasePath === '/empresas' ? 'beneficios' : 'flujo'
    const workflowHref = `${navBasePath}#${workflowAnchor}`
    const faqHref = `${navBasePath}#faq`
    const contactHref = `${navBasePath}#contacto`
    const contactNavLabel = uiText.nav.contact
    const closeMobileMenu = () => setMobileMenuOpen(false)
    const isNavigationSelector = location.pathname === '/'
    const isFocusedLanding = location.pathname === '/hazlo-tu-mismo'
    const hideGlobalChrome = isNavigationSelector || isFocusedLanding

    useEffect(() => {
        if (!location.hash) return
        const anchorId = decodeURIComponent(location.hash.replace(/^#/, ''))
        if (!anchorId) return
        const timer = window.setTimeout(() => {
            const target = document.getElementById(anchorId)
            if (!target) return
            const offset = isHeaderSticky ? announcementHeight + headerHeight + 12 : 12
            const top = target.getBoundingClientRect().top + window.scrollY - offset
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        }, 40)
        return () => window.clearTimeout(timer)
    }, [location.pathname, location.hash, isHeaderSticky, announcementHeight, headerHeight])

    const navLinkClass = headerVariant === 'minimal'
        ? 'text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-brand-primary transition-colors'
        : 'text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors'
    const headerShellClass = isHeaderSticky
        ? 'fixed left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-100'
        : 'relative bg-white border-b border-slate-100'

    const renderDetailedFooter = () => (
        <div className="py-32 bg-slate-900 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-24">
                    <a href="https://www.algoritmot.com/" className="text-4xl font-black tracking-tighter text-white inline-flex items-center">
                        {useImageFooterLogo ? (
                            <img src={design.logoFooterUrl || design.logoUrl} alt={design.logoAlt || site.name} className="h-12 w-auto object-contain" />
                        ) : (
                            <>ALGORITMO<span className="text-white/30">T</span></>
                        )}
                    </a>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div>
                            <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">{uiText.footer.protocols}</div>
                            <ul className="space-y-4 text-white/60 font-medium text-sm">
                                <li><Link to="/protocolos/ingenieria-humana" className="hover:text-white transition-colors">{uiText.footer.protocolHuman}</Link></li>
                                <li><Link to="/protocolos/despliegue-ia" className="hover:text-white transition-colors">{uiText.footer.protocolAI}</Link></li>
                                <li><Link to="/protocolos/madurez-organica" className="hover:text-white transition-colors">{uiText.footer.protocolMaturity}</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">{uiText.footer.connection}</div>
                            <ul className="space-y-4 text-white/60 font-medium text-sm">
                                <li><a href={site.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
                                <li><a href={`mailto:${site.contactEmail}`}>Email</a></li>
                                <li><Link to="/politica-tratamiento-datos" className="hover:text-white transition-colors">{site.dataPolicyTitle || 'Política de tratamiento de datos'}</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-white/20 text-xs font-black uppercase tracking-[0.5em]">
                        &copy; {new Date().getFullYear()} AlgoritmoT System. {uiText.footer.rights}
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCompactFooter = () => (
        <div className="py-16 bg-slate-900 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <a href="https://www.algoritmot.com/" className="text-2xl font-black tracking-tighter text-white inline-flex items-center">
                    {useImageFooterLogo ? (
                        <img src={design.logoFooterUrl || design.logoUrl} alt={design.logoAlt || site.name} className="h-10 w-auto object-contain" />
                    ) : (
                        <>ALGORITMO<span className="text-white/30">T</span></>
                    )}
                </a>
                <div className="flex flex-wrap items-center gap-6 text-xs font-black uppercase tracking-[0.22em] text-white/60">
                    <Link to={servicesHref} className="hover:text-white transition-colors">{uiText.nav.services}</Link>
                    <Link to={workflowHref} className="hover:text-white transition-colors">{uiText.nav.workflow}</Link>
                    <Link to={faqHref} className="hover:text-white transition-colors">{uiText.nav.faq}</Link>
                    <Link to={contactHref} className="hover:text-white transition-colors">{uiText.nav.contact}</Link>
                    <Link to="/politica-tratamiento-datos" className="hover:text-white transition-colors">{site.dataPolicyTitle || 'Política de datos'}</Link>
                </div>
            </div>
        </div>
    )

    const renderMinimalFooter = () => (
        <div className="py-10 bg-slate-900 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-white/70 text-xs font-black uppercase tracking-[0.25em]">{site.name}</div>
                <div className="text-white/40 text-[11px] font-semibold">
                    &copy; {new Date().getFullYear()} {site.name}
                </div>
            </div>
        </div>
    )

    return (
        <div className={`selection:bg-brand-primary selection:text-white min-h-screen flex flex-col ${hideGlobalChrome ? 'bg-slate-900' : 'bg-white'}`}>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[120] focus:border focus:border-brand-primary focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:font-black focus:uppercase focus:tracking-[0.2em] focus:text-slate-900"
            >
                Saltar al contenido
            </a>
            {!hideGlobalChrome && announcementEnabled && (
                <div
                    className={isHeaderSticky ? 'fixed top-0 left-0 w-full z-[60] border-b border-white/15' : 'relative border-b border-white/15'}
                    style={{ backgroundColor: site.announcementBgColor || '#0f172a', color: site.announcementTextColor || '#ffffff' }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-center text-center">
                        {isExternalAnnouncement ? (
                            <a
                                href={announcementHref}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-opacity line-clamp-1"
                            >
                                {site.announcementText}
                            </a>
                        ) : (
                            <Link
                                to={announcementHref}
                                className="text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-opacity line-clamp-1"
                            >
                                {site.announcementText}
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {!hideGlobalChrome && (
                <header className={headerShellClass} style={isHeaderSticky ? { top: announcementHeight } : undefined}>
                <div className={`px-6 ${headerHeightClass} ${headerVariant === 'split' ? 'max-w-7xl mx-auto w-full grid grid-cols-[auto_1fr_auto] items-center gap-6' : 'flex items-center justify-between'}`}>
                    <a href="https://www.algoritmot.com/" className="text-2xl font-black tracking-tighter text-slate-900 inline-flex items-center">
                        {useImageLogo ? (
                            <img src={design.logoUrl} alt={design.logoAlt || site.name} className="h-10 w-auto object-contain" />
                        ) : (
                            <>ALGORITMO<span className="text-brand-primary">T</span></>
                        )}
                    </a>

                    <nav className={`hidden md:flex items-center ${headerVariant === 'minimal' ? 'gap-7' : 'gap-12'} ${headerVariant === 'split' ? 'justify-center' : ''}`}>
                        <Link to={servicesHref} target={isFocusedFlow ? "_blank" : undefined} className={navLinkClass}>{uiText.nav.services}</Link>
                        <Link to={workflowHref} target={isFocusedFlow ? "_blank" : undefined} className={navLinkClass}>{uiText.nav.workflow}</Link>
                        <Link to={faqHref} target={isFocusedFlow ? "_blank" : undefined} className={navLinkClass}>{uiText.nav.faq}</Link>
                        <Link to={contactHref} target={isFocusedFlow ? "_blank" : undefined} className={navLinkClass}>{contactNavLabel}</Link>
                    </nav>


                    <div className={`hidden md:flex items-center ${headerVariant === 'minimal' ? 'gap-3' : 'gap-4'} ${headerVariant === 'split' ? 'justify-end' : ''}`}>
                        {headerCtaEnabled && (
                            isExternalHeaderCta ? (
                                <a
                                    href={headerCtaHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-10 px-4 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.22em] inline-flex items-center justify-center hover:bg-blue-800 transition-colors"
                                >
                                    {site.headerCtaLabel}
                                </a>
                            ) : (
                                <Link
                                    to={headerCtaHref}
                                    className="h-10 px-4 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.22em] inline-flex items-center justify-center hover:bg-blue-800 transition-colors"
                                >
                                    {site.headerCtaLabel}
                                </Link>
                            )
                        )}
                        <div className="pl-2 border-l border-slate-100">
                            <LanguageSelector />
                        </div>
                    </div>

                    <div className="flex md:hidden items-center gap-3 justify-self-end">
                        <LanguageSelector />
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                            className="w-10 h-10 border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center"
                        >
                            {mobileMenuOpen ? <X className="w-4 h-4 text-slate-700" /> : <Menu className="w-4 h-4 text-slate-700" />}
                        </button>
                    </div>
                </div>
                </header>
            )}

            {!hideGlobalChrome && mobileMenuOpen && (
                <div
                    className={`${isHeaderSticky ? 'fixed inset-x-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-lg md:hidden' : 'relative border-b border-slate-100 bg-white md:hidden'}`}
                    style={isHeaderSticky ? { top: announcementHeight + headerHeight } : undefined}
                >
                    <nav className="px-6 py-4 flex flex-col gap-2">
                        <Link to={servicesHref} onClick={closeMobileMenu} target={isFocusedFlow ? "_blank" : undefined} className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500 hover:text-brand-primary hover:bg-slate-50">
                            {uiText.nav.services}
                        </Link>
                        <Link to={workflowHref} onClick={closeMobileMenu} target={isFocusedFlow ? "_blank" : undefined} className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500 hover:text-brand-primary hover:bg-slate-50">
                            {uiText.nav.workflow}
                        </Link>
                        <Link to={faqHref} onClick={closeMobileMenu} target={isFocusedFlow ? "_blank" : undefined} className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500 hover:text-brand-primary hover:bg-slate-50">
                            {uiText.nav.faq}
                        </Link>
                        <Link to={contactHref} onClick={closeMobileMenu} target={isFocusedFlow ? "_blank" : undefined} className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500 hover:text-brand-primary hover:bg-slate-50">
                            {contactNavLabel}
                        </Link>

                        {headerCtaEnabled && (
                            isExternalHeaderCta ? (
                                <a
                                    href={headerCtaHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-white bg-brand-primary hover:bg-blue-800"
                                >
                                    {site.headerCtaLabel}
                                </a>
                            ) : (
                                <Link
                                    to={headerCtaHref}
                                    onClick={closeMobileMenu}
                                    className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-white bg-brand-primary hover:bg-blue-800"
                                >
                                    {site.headerCtaLabel}
                                </Link>
                            )
                        )}
                        <Link to="/politica-tratamiento-datos" onClick={closeMobileMenu} className="px-3 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500 hover:text-brand-primary hover:bg-slate-50">
                            {site.dataPolicyTitle || 'Política de tratamiento de datos'}
                        </Link>
                    </nav>
                </div>
            )}

            <main
                id="main-content"
                className={`flex-grow ${routeTemplate === 'immersive' && !isNavigationSelector ? 'bg-slate-50/40' : ''} ${routeTemplate === 'compact' ? 'text-[0.97rem]' : ''}`}
                style={isHeaderSticky && !hideGlobalChrome ? { paddingTop: `${announcementHeight + headerHeight}px` } : undefined}
                data-page-template={routeTemplate}
            >
                {children}
            </main>

            {!hideGlobalChrome && (
                <footer>
                    {footerVariant === 'minimal' && renderMinimalFooter()}
                    {footerVariant === 'compact' && renderCompactFooter()}
                    {footerVariant !== 'minimal' && footerVariant !== 'compact' && renderDetailedFooter()}
                </footer>
            )}
        </div>
    )
}
