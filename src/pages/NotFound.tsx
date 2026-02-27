import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { useCMS } from '../admin/context/CMSContext'

export function NotFound() {
    const { state } = useCMS()
    const site = state.site

    return (
        <Layout>
            <section
                data-track-section="not-found"
                className="min-h-[65vh] px-6 py-24 bg-slate-50 border-y border-slate-200 flex items-center"
            >
                <div className="max-w-4xl mx-auto w-full">
                    <div className="text-[11px] font-black uppercase tracking-[0.35em] text-brand-primary mb-5">Error 404</div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-6">
                        {site.notFoundTitle || 'Página no encontrada'}
                    </h1>
                    <p className="text-lg text-slate-500 font-light leading-relaxed max-w-2xl">
                        {site.notFoundDescription || 'No encontramos la ruta solicitada. Puedes regresar al inicio.'}
                    </p>
                    <div className="mt-10">
                        <Link to={site.notFoundCtaHref || '/'}>
                            <Button size="lg">{site.notFoundCtaLabel || 'Volver al inicio'}</Button>
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    )
}
