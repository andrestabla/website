import { siteConfig } from '../../data/config'
import { Terminal, Save, Globe, MessageSquare } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function ManageSite() {
    return (
        <div className="space-y-12 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Configuración Global</h1>
                    <p className="text-slate-500 font-light">Controla la identidad y el comportamiento del núcleo del sitio.</p>
                </div>
                <Button>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Brand Identity */}
                <div className="bg-white border border-slate-200 p-10 space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                        <Globe className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Identidad Digital</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre del Sitio</label>
                            <input
                                type="text"
                                defaultValue={siteConfig.name}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Titular Principal (SEO)</label>
                            <input
                                type="text"
                                defaultValue={siteConfig.name}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción Meta</label>
                            <textarea
                                rows={3}
                                defaultValue={siteConfig.description}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-medium text-slate-700 focus:border-brand-primary outline-none resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact info */}
                <div className="bg-white border border-slate-200 p-10 space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                        <MessageSquare className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Protocolos de Contacto</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email de Ventas</label>
                            <input
                                type="email"
                                defaultValue={siteConfig.contact.email}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ubicación HQ</label>
                            <input
                                type="text"
                                defaultValue={siteConfig.contact.address}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">LinkedIn Profile URL</label>
                            <input
                                type="text"
                                defaultValue={siteConfig.links.linkedin}
                                className="w-full bg-slate-50 border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced section */}
            <div className="bg-slate-950 border-t-8 border-brand-primary p-12 text-white overflow-hidden relative">
                <Terminal className="absolute -bottom-4 -right-4 w-48 h-48 text-white/5" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter mb-4">Núcleo del Sistema</h3>
                        <p className="text-white/40 text-sm font-light max-w-lg mb-8">
                            Cuidado: Alterar estas configuraciones afectará los despliegues de producción y la integridad del enrutamiento MD-IA.
                        </p>
                        <div className="flex items-center gap-4">
                            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/5">
                                Ver Logs de Despliegue
                            </Button>
                            <Button className="bg-red-500 hover:bg-red-600 border-none">
                                Reiniciar Caché Global
                            </Button>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-2">Versión Kernel</div>
                        <div className="text-4xl font-black text-brand-primary">v6.2.0</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
