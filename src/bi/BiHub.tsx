import { Link } from 'react-router-dom'
import type { BiUser } from './lib/session'
import { biPath } from './lib/base'

const MODULES = [
  {
    n: 1,
    to: biPath('/oferta'),
    title: 'Observatorio de oferta educativa',
    desc: 'Qué se ofrece: programas de educación superior (SNIES) por institución, área, nivel, modalidad y territorio, con mapas.',
    tags: ['27.005 programas', '357 IES', 'Mapas'],
    accent: 'from-blue-600 to-sky-500',
  },
  {
    n: 2,
    to: biPath('/laboral'),
    title: 'Observatorio laboral y de empleabilidad',
    desc: 'Qué demanda el mercado: competencias, reskilling OIT, empleabilidad y vinculación formal de graduados (OLE), indicadores DANE.',
    tags: ['Competencias', 'Empleabilidad', 'OIT · DANE'],
    accent: 'from-emerald-600 to-green-500',
  },
  {
    n: 3,
    to: biPath('/regional'),
    title: 'Análisis regional',
    desc: 'Histórico y prospectivo por territorio: pertinencia, vacíos, demanda potencial por cohortes y recomendación de programas.',
    tags: ['33 departamentos', 'Cohortes', 'Recomendación'],
    accent: 'from-fuchsia-600 to-purple-500',
  },
  {
    n: 4,
    to: biPath('/workspace'),
    title: 'Workspace',
    desc: 'Genera informes y productos derivados: arma un reporte por territorio combinando oferta, demanda y recomendaciones.',
    tags: ['Informes', 'PDF / CSV'],
    accent: 'from-amber-500 to-orange-500',
  },
]

export function BiHub({ user }: { user: BiUser }) {
  return (
    <div className="mx-auto max-w-6xl px-7 py-10">
      <h1 className="text-2xl font-black tracking-tight">Hola, {(user?.displayName || 'usuario').split(' ')[0]}</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">
        Plataforma de inteligencia para la pertinencia de la educación superior. Selecciona un módulo.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg"
          >
            <div className="absolute right-5 top-4 text-4xl font-black text-slate-100">{m.n}</div>
            <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${m.accent} text-xl text-white`}>▤</div>
            <h3 className="mt-3 text-[17px] font-bold tracking-tight">{m.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{m.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.tags.map((t) => (
                <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] text-slate-500">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">Abrir →</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
