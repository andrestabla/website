import { useEffect, useRef, useState } from 'react'
import { Check, Sparkles, Download, Mail, Send, RotateCcw } from 'lucide-react'

/**
 * Maquetas del tablero de Learning Analytics.
 *
 * No son capturas: se dibujan aquí, con SVG y CSS, para que se vean nítidas a
 * cualquier tamaño y para poder animar la conversación con el asistente. Las
 * cifras son de ejemplo y así se declara en el marco de cada maqueta; la
 * disposición, los bloques y las acciones sí son los del plugin.
 */

/** Marco de ventana. Hace que la maqueta se lea como lo que representa. */
function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 truncate rounded-md bg-white px-3 py-1 text-[11px] text-slate-500">
          {title}
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Cifras de ejemplo
        </span>
      </div>
      <div className="bg-slate-50 p-4 sm:p-6">{children}</div>
    </div>
  )
}

/** Tarjeta de indicador, con el mismo peso visual que en el tablero. */
function Kpi({ value, label, tone = 'plain' }: { value: string; label: string; tone?: 'plain' | 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'bad' ? 'text-rose-600'
    : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center">
      <div className={`text-xl font-black leading-none tabular-nums sm:text-2xl ${color}`}>{value}</div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[13px] font-black text-slate-900">{title}</h4>
        {action && <span className="shrink-0 text-[10px] font-semibold text-slate-400">{action}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

/** Área de línea. Las etiquetas se dibujan dentro del viewBox para que nunca
 *  se salgan del recuadro al escalar. */
function Area({ values, labels, accent = '#4f46e5' }: { values: number[]; labels: string[]; accent?: string }) {
  const w = 320, h = 96, top = 8, bottom = 74
  // La base no arranca en cero: con valores parecidos entre sí, hacerlo
  // aplanaría la línea y escondería justo lo que hay que ver, la tendencia.
  const alto = Math.max(...values)
  const bajo = Math.min(...values)
  const base = bajo - Math.max((alto - bajo) * 0.45, alto * 0.06)
  const rango = Math.max(alto - base, 1)
  const punto = (v: number, i: number) => {
    const x = 10 + (i * (w - 24)) / (values.length - 1)
    const y = bottom - ((v - base) / rango) * (bottom - top)
    return [x, y] as const
  }
  const linea = values.map((v, i) => punto(v, i).join(',')).join(' ')
  const area = `10,${bottom} ${linea} ${punto(values[values.length - 1], values.length - 1)[0]},${bottom}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Serie de ejemplo">
      <polygon points={area} fill={accent} fillOpacity="0.12" />
      <polyline points={linea} fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = punto(v, i)
        return <circle key={i} cx={x} cy={y} r="2.8" fill="#ffffff" stroke={accent} strokeWidth="2" />
      })}
      {labels.map((l, i) => (
        <text key={l} x={10 + (i * (w - 24)) / (labels.length - 1)} y={h - 6}
          textAnchor="middle" fontSize="7" fill="#94a3b8">{l}</text>
      ))}
    </svg>
  )
}

/** Anillo de reparto, con su leyenda. */
function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const r = 32, c = 2 * Math.PI * r
  let acumulado = 0
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 90 90" className="h-24 w-24 shrink-0" role="img" aria-label="Reparto de ejemplo">
        {slices.map((s) => {
          const largo = (s.value / total) * c
          const el = (
            <circle key={s.label} cx="45" cy="45" r={r} fill="none" stroke={s.color} strokeWidth="15"
              strokeDasharray={`${largo} ${c - largo}`} strokeDashoffset={-acumulado}
              transform="rotate(-90 45 45)" />
          )
          acumulado += largo
          return el
        })}
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto font-bold tabular-nums text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras horizontales con su porcentaje. */
function Bars({ rows, accent = '#4f46e5' }: { rows: { label: string; pct: number }[]; accent?: string }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <span className="truncate text-[11px] text-slate-600">{r.label}</span>
          <span className="text-[11px] font-bold tabular-nums text-slate-900">{r.pct}%</span>
          <span className="col-span-2 block h-2 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: accent }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Badge({ tone, children }: { tone: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const cls = tone === 'good' ? 'bg-emerald-50 text-emerald-700'
    : tone === 'warn' ? 'bg-amber-50 text-amber-700'
    : 'bg-rose-50 text-rose-700'
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{children}</span>
}

function Tabla({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
            {head.map((h) => <th key={h} className="py-2 pr-3 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="text-slate-700">{children}</tbody>
      </table>
    </div>
  )
}

const fila = 'border-b border-slate-100 last:border-0'

/** Barra de filtros, para que la maqueta muestre que todo es acotable. */
function Filtros({ items }: { items: string[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {items.map((f) => (
        <span key={f} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
          {f}
        </span>
      ))}
      <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">Aplicar filtros</span>
    </div>
  )
}

export function MockPlataforma() {
  return (
    <Frame title="tu-moodle.edu / Administración del sitio › Informes › Learning Analytics">
      <Filtros items={['Categoría: todas', 'Curso: todos', 'Rol: Estudiante', 'País: todos', 'Desde 01/02/2026']} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value="1.284" label="Usuarios" />
        <Kpi value="4.912" label="Matriculaciones" />
        <Kpi value="613" label="Certificados emitidos" />
        <Kpi value="47,7%" label="Tasa de certificación" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Panel title="Crecimiento de usuarios" action="PDF · XLSX · JPG">
          <Area values={[42, 68, 55, 91, 120, 104, 158, 186]}
            labels={['2025-07', '', '2025-11', '', '2026-01', '', '2026-05', '2026-07']} />
        </Panel>
        <Panel title="Actividad por último acceso">
          <Bars rows={[
            { label: 'Últimos 7 días', pct: 41 },
            { label: 'Últimos 30 días', pct: 24 },
            { label: 'Últimos 90 días', pct: 17 },
            { label: 'Más de 90 días', pct: 14 },
            { label: 'Nunca accedió', pct: 4 },
          ]} />
        </Panel>
      </div>
    </Frame>
  )
}

export function MockRiesgo() {
  return (
    <Frame title="tu-moodle.edu / Learning Analytics › Permanencia y riesgo">
      <p className="mb-3 text-[11px] text-slate-500">
        Regla: activo con al menos 7 h de permanencia en los últimos 7 días.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value="812 (63,2%)" label="Activos" tone="good" />
        <Kpi value="268" label="Con poca actividad" tone="warn" />
        <Kpi value="204" label="Sin actividad" tone="bad" />
        <Kpi value="54,1%" label="Regulares" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value="3,4" label="Días activos por persona" />
        <Kpi value="88/104" label="Entrada temprana" />
        <Kpi value="61/97" label="Reactivación tras mensaje" tone="good" />
        <Kpi value="12,4%" label="Salida temprana" tone="warn" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Personas activas por ventana">
          <Area values={[904, 878, 861, 843, 866, 838, 824, 812]} accent="#0ea5e9"
            labels={['9 jul', '', '23 jul', '', '6 ago', '', '20 ago', '27 ago']} />
        </Panel>
        <Panel title="Reparto por actividad">
          <Donut slices={[
            { label: 'Activo', value: 812, color: '#059669' },
            { label: 'Poca actividad', value: 268, color: '#f59e0b' },
            { label: 'Sin actividad', value: 204, color: '#e11d48' },
          ]} />
        </Panel>
      </div>
      <div className="mt-3">
        <Panel title="Personas por debajo de la regla" action="Mensaje a los filtrados">
          <Tabla head={['Nombre', 'Horas', 'Días', 'Ventanas', 'Actividad', '']}>
            {[
              { n: 'L. Ospina', h: '1,2', d: 2, v: '1 de 4', t: 'warn' as const, e: 'Poca actividad' },
              { n: 'M. Cardona', h: '0,4', d: 1, v: '0 de 4', t: 'bad' as const, e: 'Sin actividad' },
              { n: 'J. Restrepo', h: '0,0', d: 0, v: '0 de 4', t: 'bad' as const, e: 'Sin actividad' },
            ].map((r) => (
              <tr key={r.n} className={fila}>
                <td className="py-2 pr-3 font-medium text-slate-900">{r.n}</td>
                <td className="py-2 pr-3 tabular-nums">{r.h}</td>
                <td className="py-2 pr-3 tabular-nums">{r.d}</td>
                <td className="py-2 pr-3 tabular-nums">{r.v}</td>
                <td className="py-2 pr-3"><Badge tone={r.t}>{r.e}</Badge></td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-700">
                    <Mail size={11} /> Mensaje
                  </span>
                </td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </div>
    </Frame>
  )
}

export function MockCurso() {
  return (
    <Frame title="tu-moodle.edu / Curso: Fundamentos de Física › Informes › Learning Analytics">
      <Filtros items={['Estudiante: todos', 'Actividad: todas', 'Progreso 0–100', 'Calificación 0–100']} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value="34" label="Estudiantes" />
        <Kpi value="64,2%" label="Progreso promedio" />
        <Kpi value="78,4%" label="Calificación promedio" />
        <Kpi value="4 h 12 min" label="Permanencia promedio" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Panel title="Progreso por sección">
          <Bars rows={[
            { label: 'Presentación', pct: 97 },
            { label: 'Cinemática', pct: 84 },
            { label: 'Dinámica', pct: 61 },
            { label: 'Trabajo y energía', pct: 38 },
            { label: 'Proyecto final', pct: 12 },
          ]} />
        </Panel>
        <Panel title="Calificación promedio por actividad">
          <Bars accent="#0ea5e9" rows={[
            { label: 'Quiz 1 · Magnitudes', pct: 88 },
            { label: 'Taller · Vectores', pct: 76 },
            { label: 'Quiz 2 · Movimiento', pct: 64 },
            { label: 'Informe de laboratorio', pct: 81 },
          ]} />
        </Panel>
      </div>
    </Frame>
  )
}

export function MockEvaluacion() {
  return (
    <Frame title="tu-moodle.edu / Curso: Fundamentos de Física › Evaluación y foros">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value="82,4%" label="Entregas a tiempo" />
        <Kpi value="91,2%" label="Cuestionarios completados" tone="good" />
        <Kpi value="76,5%" label="Alcanzan el aprobado" />
        <Kpi value="+9,3 pp" label="Ganancia entre intentos" tone="good" />
      </div>
      <div className="mt-3">
        <Panel title="Actividades evaluables" action="PDF · XLSX · CSV">
          <Tabla head={['Actividad', 'Tipo', 'A tiempo', 'Retroalimentación', 'Aprobado', 'Calificación']}>
            {[
              { a: 'Taller · Vectores', t: 'Tarea', p: '31/34 (91%)', f: '31/31 (100%)', ap: '27/31 (87%)', s: 'good' as const, e: 'Al día' },
              { a: 'Quiz 2 · Movimiento', t: 'Cuestionario', p: '28/34 (82%)', f: '—', ap: '19/28 (68%)', s: 'good' as const, e: 'Al día' },
              { a: 'Informe de laboratorio', t: 'Tarea', p: '22/34 (65%)', f: '9/22 (41%)', ap: '17/22 (77%)', s: 'warn' as const, e: '13 sin calificar' },
            ].map((r) => (
              <tr key={r.a} className={fila}>
                <td className="py-2 pr-3 font-medium text-slate-900">{r.a}</td>
                <td className="py-2 pr-3">{r.t}</td>
                <td className="py-2 pr-3 tabular-nums">{r.p}</td>
                <td className="py-2 pr-3 tabular-nums">{r.f}</td>
                <td className="py-2 pr-3 tabular-nums">{r.ap}</td>
                <td className="py-2"><Badge tone={r.s}>{r.e}</Badge></td>
              </tr>
            ))}
          </Tabla>
        </Panel>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Kpi value="71,4%" label="Participan en foros" />
        <Kpi value="58,3%" label="Responden a un compañero" />
        <Kpi value="9,1%" label="Hilos sin respuesta" tone="good" />
        <Kpi value="6,2 h" label="Respuesta docente" />
      </div>
    </Frame>
  )
}

/** Guion de la conversación con el asistente. */
const PREGUNTA = '¿Qué cursos debería revisar esta semana?'

const RESPUESTA = [
  { tipo: 'h', texto: 'Situación' },
  { tipo: 'p', texto: 'Tres cursos concentran el riesgo esta semana. Los ordeno por urgencia.' },
  { tipo: 'h', texto: 'Qué encontré' },
  { tipo: 'li', texto: 'Fundamentos de Física: 41 % sin actividad y 18 entregas vencidas sin presentar. Es el que más urge.' },
  { tipo: 'li', texto: 'Cálculo I: los activos caen por segunda ventana seguida, de 78 % a 61 %.' },
  { tipo: 'li', texto: 'Química General: la participación se sostiene, pero el 46 % de la retroalimentación llega fuera de plazo.' },
  { tipo: 'h', texto: 'Qué haría primero' },
  { tipo: 'p', texto: 'Escribir hoy a las 14 personas sin actividad de Física y revisar con su equipo docente las entregas vencidas.' },
  { tipo: 'h', texto: 'Lo que estos datos no dicen' },
  { tipo: 'p', texto: 'La permanencia es una estimación desde los registros. No mide lo que se estudió fuera de la plataforma.' },
]

/**
 * Simulación de la conversación con el asistente.
 *
 * Se escribe la pregunta, se marca la espera y aparece la respuesta por
 * bloques. Con «prefers-reduced-motion» se muestra completa de una vez: el
 * contenido es el mismo, sin movimiento.
 */
export function MockAsistente() {
  const [escrito, setEscrito] = useState('')
  const [fase, setFase] = useState<'escribiendo' | 'pensando' | 'respondiendo' | 'listo'>('escribiendo')
  const [lineas, setLineas] = useState(0)
  const [ronda, setRonda] = useState(0)
  const temporizadores = useRef<number[]>([])

  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducido) {
      setEscrito(PREGUNTA); setLineas(RESPUESTA.length); setFase('listo')
      return
    }

    temporizadores.current.forEach(clearTimeout)
    temporizadores.current = []
    setEscrito(''); setLineas(0); setFase('escribiendo')

    const programar = (ms: number, fn: () => void) => {
      temporizadores.current.push(window.setTimeout(fn, ms))
    }

    PREGUNTA.split('').forEach((_, i) => {
      programar(500 + i * 38, () => setEscrito(PREGUNTA.slice(0, i + 1)))
    })
    const finEscritura = 500 + PREGUNTA.length * 38
    programar(finEscritura + 350, () => setFase('pensando'))
    programar(finEscritura + 1500, () => setFase('respondiendo'))
    RESPUESTA.forEach((_, i) => {
      programar(finEscritura + 1700 + i * 260, () => setLineas(i + 1))
    })
    programar(finEscritura + 1700 + RESPUESTA.length * 260, () => setFase('listo'))

    return () => temporizadores.current.forEach(clearTimeout)
  }, [ronda])

  return (
    <Frame title="tu-moodle.edu / Learning Analytics › Asistente">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <h4 className="text-[13px] font-black text-slate-900">Pregunta sobre estas cifras</h4>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Solo se envían las cifras agregadas de los bloques visibles: ninguna persona, ningún correo.
          </p>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Informe detallado
          </div>
          <div className="mt-2 min-h-[52px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-800">
            {escrito}
            {fase === 'escribiendo' && <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-slate-800 align-middle" />}
          </div>

          <div className={`mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold text-white ${
            fase === 'pensando' ? 'bg-indigo-400' : 'bg-indigo-600'
          }`}>
            <Send size={13} />
            {fase === 'pensando' ? 'Consultando…' : 'Preguntar'}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Quedan 47 consultas en tu bolsa.</p>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tus consultas anteriores</div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-500">
              <li className="truncate">¿Dónde se está cayendo el progreso?</li>
              <li className="truncate">Resumen de certificación del semestre</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-black text-slate-900">Respuesta</h4>
            <button type="button" onClick={() => setRonda((r) => r + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50">
              <RotateCcw size={11} /> Repetir
            </button>
          </div>

          <div className="mt-3 min-h-[260px] space-y-2">
            {fase === 'pensando' && (
              <div className="flex gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                    style={{ animationDelay: `${i * 130}ms` }} />
                ))}
              </div>
            )}
            {RESPUESTA.slice(0, lineas).map((l, i) => {
              if (l.tipo === 'h') {
                return <div key={i} className="pt-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-700">{l.texto}</div>
              }
              if (l.tipo === 'li') {
                return (
                  <div key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-700">
                    <Check size={13} className="mt-1 shrink-0 text-emerald-600" />
                    <span>{l.texto}</span>
                  </div>
                )
              }
              return <p key={i} className="text-[12px] leading-relaxed text-slate-700">{l.texto}</p>
            })}
          </div>

          {fase === 'listo' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600">
                Ir al curso: Fundamentos de Física
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                <Download size={11} /> Informe en PDF
              </span>
            </div>
          )}
        </div>
      </div>
    </Frame>
  )
}
