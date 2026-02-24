import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { siteConfig } from '../../data/config'
import { LanguageSelector } from './LanguageSelector'

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="selection:bg-brand-primary selection:text-white min-h-screen bg-white flex flex-col">
            <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-20 flex items-center justify-between">
                <Link to="/" className="text-2xl font-black tracking-tighter text-slate-900">
                    ALGORITMO<span className="text-brand-primary">T</span>
                </Link>
                <nav className="hidden md:flex items-center gap-12">
                    <Link to="/#servicios" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">Servicios</Link>
                    <Link to="/#productos" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">Productos</Link>
                    <Link to="/#contacto" className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-brand-primary transition-colors">Contacto</Link>
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
                        <div className="text-4xl font-black tracking-tighter text-white">
                            ALGORITMO<span className="text-white/30">T</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                            <div>
                                <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">Protocolos</div>
                                <ul className="space-y-4 text-white/60 font-medium text-sm">
                                    <li><Link to="/protocolos/ingenieria-humana" className="hover:text-white transition-colors">Ingeniería Humana</Link></li>
                                    <li><Link to="/protocolos/despliegue-ia" className="hover:text-white transition-colors">Despliegue IA</Link></li>
                                    <li><Link to="/protocolos/madurez-organica" className="hover:text-white transition-colors">Madurez Orgánica</Link></li>
                                </ul>
                            </div>
                            <div>
                                <div className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mb-8">Conexión</div>
                                <ul className="space-y-4 text-white/60 font-medium text-sm">
                                    <li><a href={siteConfig.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
                                    <li><a href={`mailto:${siteConfig.contact.email}`}>Email</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-white/20 text-xs font-black uppercase tracking-[0.5em]">
                            &copy; {new Date().getFullYear()} AlgoritmoT System. All Rights Reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
