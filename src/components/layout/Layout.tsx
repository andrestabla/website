import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LanguageSelector } from './LanguageSelector'
import { useLanguage } from '../../context/LanguageContext'
import { useCMS } from '../../admin/context/CMSContext'

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    const { uiText } = useLanguage()
    const { state } = useCMS()
    const site = state.site
    const design = state.design
    const useImageLogo = design.logoMode === 'image' && !!design.logoUrl
    const useImageFooterLogo = design.logoMode === 'image' && !!(design.logoFooterUrl || design.logoUrl)
    return (
        <div className="selection:bg-brand-primary selection:text-white min-h-screen bg-white flex flex-col">
            <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-20 flex items-center justify-between">
                <Link to="/" className="text-2xl font-black tracking-tighter text-slate-900 inline-flex items-center">
                    {useImageLogo ? (
                        <img src={design.logoUrl} alt={design.logoAlt || site.name} className="h-10 w-auto object-contain" />
                    ) : (
                        <>ALGORITMO<span className="text-brand-primary">T</span></>
                    )}
                </Link>
                <nav className="hidden md:flex items-center gap-12">
                    <Link to="/#servicios" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">{uiText.nav.services}</Link>
                    <Link to="/#productos" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">{uiText.nav.products}</Link>
                    <Link to="/#contacto" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">{uiText.nav.contact}</Link>
                    <div className="pl-4 border-l border-slate-100">
                        <LanguageSelector />
                    </div>
                </nav>
            </header>

            <main className="flex-grow pt-20">
                {children}
            </main>

            <footer className="py-32 bg-slate-900 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-24">
                        <div className="text-4xl font-black tracking-tighter text-white inline-flex items-center">
                            {useImageFooterLogo ? (
                                <img src={design.logoFooterUrl || design.logoUrl} alt={design.logoAlt || site.name} className="h-12 w-auto object-contain" />
                            ) : (
                                <>ALGORITMO<span className="text-white/30">T</span></>
                            )}
                        </div>
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
            </footer>
        </div>
    )
}
