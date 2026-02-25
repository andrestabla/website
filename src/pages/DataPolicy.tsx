import { Layout } from '../components/layout/Layout'
import { useCMS } from '../admin/context/CMSContext'

export function DataPolicy() {
  const { state } = useCMS()
  const site = state.site
  const lines = (site.dataPolicyContent || '').split('\n').map((p) => p.trim()).filter(Boolean)
  const paragraphs = lines.filter((line) => !line.startsWith('- '))
  const bullets = lines.filter((line) => line.startsWith('- ')).map((line) => line.replace(/^- /, '').trim())
  const effectiveVersion = site.dataPolicyVersion || 'v1'

  return (
    <Layout>
      <section className="px-6 py-20 md:py-28 bg-white" data-track-section="data-policy">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] font-black uppercase tracking-[0.35em] text-brand-primary mb-4">Política y Consentimiento</div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4">
            {site.dataPolicyTitle || 'Política de tratamiento de datos'}
          </h1>
          <div className="text-sm text-slate-500 font-semibold mb-10">Versión {effectiveVersion}</div>
          {!!site.dataPolicySummary && (
            <div className="mb-10 p-6 border border-slate-200 bg-slate-50 text-slate-700 leading-relaxed">
              {site.dataPolicySummary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="border border-slate-200 p-5 bg-white">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Datos que podemos registrar</div>
              <ul className="space-y-2 text-sm text-slate-700 leading-relaxed">
                <li>Ubicación geográfica aproximada por IP (país, región, ciudad).</li>
                <li>Páginas y secciones consultadas en el sitio.</li>
                <li>Tiempo de permanencia estimado por página.</li>
                <li>Eventos de interacción técnica para analítica operativa.</li>
              </ul>
            </div>
            <div className="border border-slate-200 p-5 bg-white">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Finalidad del tratamiento</div>
              <ul className="space-y-2 text-sm text-slate-700 leading-relaxed">
                <li>Mejorar experiencia de navegación y usabilidad.</li>
                <li>Medir interacción con páginas y secciones.</li>
                <li>Optimizar contenido y rendimiento del sitio.</li>
                <li>Generar trazabilidad de aceptación del consentimiento.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-8 text-slate-700">
            <section>
              <h2 className="text-lg font-black tracking-tight text-slate-900 mb-3">1. Alcance y consentimiento</h2>
              <p className="leading-relaxed">
                El tratamiento descrito en esta política aplica a datos técnicos y de navegación recolectados en este sitio una vez otorgado el consentimiento.
                Puedes continuar sin analítica; en ese caso, no se registran eventos de navegación para fines analíticos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black tracking-tight text-slate-900 mb-3">2. Datos tratados</h2>
              {bullets.length > 0 ? (
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  {bullets.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              ) : (
                <p className="leading-relaxed">No hay lista de datos configurada aún en el CMS. Puedes completarla en Admin &gt; Configuración.</p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-black tracking-tight text-slate-900 mb-3">3. Conservación y uso de la información</h2>
              <p className="leading-relaxed">
                Los datos de consentimiento y navegación se almacenan en infraestructura de servidor y base de datos asociada al sitio para analítica,
                operación y trazabilidad. Se utilizan de forma agregada y operativa, y no para decisiones automatizadas sobre el usuario final.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black tracking-tight text-slate-900 mb-3">4. Derechos del usuario</h2>
              <p className="leading-relaxed">
                Puedes negarte al uso de analítica mediante la opción “Continuar sin analítica”. También puedes revocar el consentimiento limpiando los datos
                locales del navegador (cookies/localStorage/sessionStorage) y dejando de usar el sitio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black tracking-tight text-slate-900 mb-3">5. Texto administrado en CMS</h2>
              <div className="space-y-5 leading-relaxed">
                {paragraphs.length
                  ? paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
                  : <p>No hay texto de política configurado aún.</p>}
              </div>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  )
}
