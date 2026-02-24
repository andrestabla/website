import { servicesDetail } from '../../data/details'
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function ManageServices() {
    return (
        <div className="space-y-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Catalogo de Servicios</h1>
                    <p className="text-slate-500 font-light">Gestiona las soluciones de Industria 5.0 visibles en el sitio.</p>
                </div>
                <Button>
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Servicio
                </Button>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-8 py-6">ID / Slug</th>
                            <th className="px-8 py-6">Servicio</th>
                            <th className="px-8 py-6">Estado SEO</th>
                            <th className="px-8 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {servicesDetail.map((service) => (
                            <tr key={service.slug} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-6">
                                    <span className="text-xs font-mono bg-slate-100 px-3 py-1 text-slate-600">
                                        {service.slug}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                                            <service.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{service.title}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{service.highlight}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${service.seoTitle ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Optimizado</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
