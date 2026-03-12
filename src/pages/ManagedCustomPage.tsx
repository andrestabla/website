import { DynamicPageRenderer } from '../components/page-builder/DynamicPageRenderer'
import { Layout } from '../components/layout/Layout'
import { useLanguage } from '../context/LanguageContext'

type ManagedCustomPageProps = {
    page: any // Using any here to allow both initial and translated versions
}

export function ManagedCustomPage({ page: initialPage }: ManagedCustomPageProps) {
    const { translatedState } = useLanguage()
    const page = (translatedState.siteArchitecture.pages as any[])?.find(p => p.id === initialPage.id) || initialPage

    const hasBlocks = Array.isArray(page.blocks) && page.blocks.length > 0
    const accentColor = page.accentColor || '#2563eb'

    return (
        <Layout>
            {hasBlocks ? (
                <DynamicPageRenderer page={page as any} />
            ) : (
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-5xl border border-slate-200 bg-white p-10 md:p-14">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: accentColor }}>
                            Página gestionada desde Site Builder
                        </p>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">{page.title}</h1>
                        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
                            {page.description || 'Esta página fue creada desde el panel de arquitectura y está lista para ampliarse con contenido específico.'}
                        </p>
                        <div className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-500">
                            <p className="font-bold uppercase tracking-[0.2em] text-slate-400">Ruta</p>
                            <p className="mt-1 font-mono text-slate-600">{page.path}</p>
                            {page.notes && <p className="mt-4 whitespace-pre-wrap">{page.notes}</p>}
                            <p className="mt-6">Gestionado por {translatedState.site.name}.</p>
                        </div>
                    </div>
                </section>
            )}
        </Layout>
    )
}
