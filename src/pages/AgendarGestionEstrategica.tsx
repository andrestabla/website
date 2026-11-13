import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock, MonitorPlay, Users } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { BookingSystem } from '../components/booking/BookingSystem'
import { useCMS } from '../admin/context/CMSContext'
import { useLanguage } from '../context/LanguageContext'
import { applySeoPayload, limitText, normalizeBaseUrl, resolveFaviconUrl, resolveShareImage, toAbsoluteUrl } from '../lib/seo'

// Agenda de demostraciones de Gestión Estratégica (gestionestrategica.io). El botón «Solicitar una demostración»
// de ese sitio trae aquí; la cita usa los horarios de /admin/bookings y queda marcada con su origen.

const SITIO_GE = 'https://gestionestrategica.io'
const RUTA = '/agendar/gestion-estrategica'

const EN_LA_DEMO = [
  'Recorremos la plataforma con un caso como el tuyo: prioridades, objetivos, iniciativas y tablero.',
  'Te contamos cómo te acompañan los consultores, por fases y en sesiones presenciales o virtuales.',
  'Revisamos qué decisión estratégica quiere trabajar primero tu equipo directivo.',
]

const DATOS = [
  { icon: Clock, label: '30 minutos' },
  { icon: MonitorPlay, label: 'Virtual, por Google Meet' },
  { icon: Users, label: 'Con un consultor de Algoritmo T · 4Shine Empresas' },
]

export function AgendarGestionEstrategica() {
  const { state } = useCMS()
  const { language } = useLanguage()
  const [agendada, setAgendada] = useState(false)

  useEffect(() => {
    const siteName = String(state.site?.name || 'AlgoritmoT').trim() || 'AlgoritmoT'
    const baseUrl = normalizeBaseUrl(state.site?.url)
    const canonicalUrl = toAbsoluteUrl(baseUrl, RUTA)
    const title = 'Agenda una demostración de Gestión Estratégica'
    const description = limitText(
      'Elige el día y la hora para conocer Gestión Estratégica: la plataforma y el acompañamiento de consultores para definir y tomar decisiones estratégicas.',
      180,
    )
    applySeoPayload({
      title: limitText(`${title} | ${siteName}`, 70),
      description,
      canonicalUrl,
      imageUrl: toAbsoluteUrl(baseUrl, resolveShareImage(state.design?.logoUrl, state.design?.logoFooterUrl)),
      robots: 'index,follow',
      lang: language,
      siteName,
      ogType: 'website',
      twitterCard: 'summary',
      themeColor: '#09111d',
      faviconUrl: toAbsoluteUrl(baseUrl, resolveFaviconUrl(state.design?.faviconUrl)),
      schemas: [{ '@type': 'WebPage', name: title, description, url: canonicalUrl, inLanguage: language }],
    })
  }, [language, state.design?.faviconUrl, state.design?.logoFooterUrl, state.design?.logoUrl, state.site?.name, state.site?.url])

  return (
    <Layout isFocusedFlow>
      <section className="bg-[#f6eedf] px-6 pb-20 pt-28 md:pb-28 md:pt-36">
        <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
          <div className="space-y-10">
            <a
              href={SITIO_GE}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              gestionestrategica.io
            </a>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b07a1c]">Gestión Estratégica · Demostración</div>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.045em] text-slate-950 md:text-6xl">
                Agenda una demostración de Gestión Estratégica.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Elige el día y la hora. Te mostramos la plataforma y cómo nuestros consultores acompañan a tu equipo directivo
                a definir y tomar decisiones estratégicas.
              </p>
            </div>

            <ul className="flex flex-wrap gap-3">
              {DATOS.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  <Icon className="h-4 w-4 text-[#b07a1c]" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">En la demostración</div>
              {EN_LA_DEMO.map((item) => (
                <div key={item} className="flex items-start gap-4 rounded-[1.2rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)]">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#b07a1c]" />
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-10">
            <BookingSystem
              origin="gestion-estrategica"
              onSuccess={() => setAgendada(true)}
              texts={{
                calendarTitle: 'Elige el día y la hora',
                calendarHint: 'La demostración dura 30 minutos y es virtual, por Google Meet.',
                formHint: 'Con estos datos preparamos la demostración para tu empresa.',
                messageLabel: '¿Qué te gustaría ver en la demostración? *',
                messagePlaceholder: 'Por ejemplo: cómo priorizar las decisiones del comité, armar el plan 2027 o hacer seguimiento a los objetivos…',
                successTitle: '¡Demostración agendada!',
                successBody: 'Te enviamos a tu correo la confirmación y la invitación con el enlace de la reunión. Si no la ves, revisa la carpeta de correo no deseado.',
                againLabel: 'Agendar otra demostración',
              }}
            />
            {agendada && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Mientras tanto, puedes conocer más en <a href={SITIO_GE} className="font-bold text-slate-900 underline">gestionestrategica.io</a>.
              </p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  )
}
