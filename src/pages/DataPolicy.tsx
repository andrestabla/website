import { Layout } from '../components/layout/Layout'
import { useCMS } from '../admin/context/CMSContext'

export function DataPolicy() {
  const { state } = useCMS()
  const site = state.site
  const paragraphs = (site.dataPolicyContent || '').split('\n').map((p) => p.trim()).filter(Boolean)

  return (
    <Layout>
      <section className="px-6 py-20 md:py-28 bg-white" data-track-section="data-policy">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] font-black uppercase tracking-[0.35em] text-brand-primary mb-4">Política y Consentimiento</div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4">
            {site.dataPolicyTitle || 'Política de tratamiento de datos'}
          </h1>
          <div className="text-sm text-slate-500 font-semibold mb-10">Versión {site.dataPolicyVersion || 'v1'}</div>
          {!!site.dataPolicySummary && (
            <div className="mb-10 p-6 border border-slate-200 bg-slate-50 text-slate-700 leading-relaxed">
              {site.dataPolicySummary}
            </div>
          )}
          <div className="space-y-5 text-slate-700 leading-relaxed">
            {paragraphs.length
              ? paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
              : <p>No hay texto de política configurado aún.</p>}
          </div>
        </div>
      </section>
    </Layout>
  )
}

