/**
 * Biblioteca de íconos para el editor: los de lucide (más de mil, modernos,
 * de trazo). Se buscan por nombre en inglés y se cargan bajo demanda, así el
 * documento solo descarga los íconos que usa.
 */
import { useMemo, useState } from 'react'
import { DynamicIcon, dynamicIconImports } from 'lucide-react/dynamic'

export type IconName = keyof typeof dynamicIconImports
const ALL = Object.keys(dynamicIconImports) as IconName[]

/** Atajos en español → nombres frecuentes. */
const ALIASES: Record<string, string[]> = {
  cohete: ['rocket'], objetivo: ['target', 'goal'], grafica: ['chart-line', 'chart-bar', 'chart-pie'], gráfica: ['chart-line', 'chart-bar'],
  usuario: ['user', 'users'], equipo: ['users', 'users-round'], educacion: ['graduation-cap', 'book-open'], educación: ['graduation-cap', 'book-open'],
  libro: ['book', 'book-open'], calendario: ['calendar'], reloj: ['clock', 'timer'], dinero: ['banknote', 'coins', 'dollar-sign'], pago: ['credit-card', 'banknote'],
  candado: ['lock'], seguridad: ['shield', 'shield-check'], nube: ['cloud'], datos: ['database', 'chart-bar'], ia: ['brain', 'sparkles', 'bot'],
  robot: ['bot'], cerebro: ['brain'], estrella: ['star', 'sparkles'], check: ['check', 'circle-check', 'badge-check'], correo: ['mail'], telefono: ['phone'],
  mapa: ['map', 'map-pin'], ubicacion: ['map-pin'], descarga: ['download'], subir: ['upload'], ajustes: ['settings', 'sliders-horizontal'],
  proceso: ['workflow', 'git-branch', 'route'], flujo: ['workflow'], capas: ['layers'], puzzle: ['puzzle'], herramienta: ['wrench', 'hammer'],
  luz: ['lightbulb'], idea: ['lightbulb'], escudo: ['shield'], trofeo: ['trophy', 'award'], medalla: ['award', 'medal'], corazon: ['heart'],
  pantalla: ['monitor', 'laptop'], celular: ['smartphone'], video: ['video', 'play'], audio: ['mic', 'volume-2'], documento: ['file-text', 'file'],
  carpeta: ['folder'], edificio: ['building', 'building-2'], casa: ['house'], mundo: ['globe'], flecha: ['arrow-right', 'move-right'],
}

export function IconPicker({ value, onPick, onClose }: { value?: string; onPick: (name: IconName) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return ['sparkles', 'rocket', 'target', 'graduation-cap', 'users', 'chart-line', 'lightbulb', 'shield-check', 'workflow', 'calendar', 'clock', 'banknote', 'brain', 'bot', 'book-open', 'award', 'layers', 'database', 'globe', 'map-pin', 'mail', 'phone', 'monitor', 'file-text', 'check-circle', 'star', 'heart', 'zap', 'puzzle', 'settings', 'trophy', 'briefcase', 'building-2', 'handshake', 'message-square', 'search', 'send', 'video', 'wrench', 'compass'].filter((n) => n in dynamicIconImports) as IconName[]
    const aliased = Object.entries(ALIASES).filter(([k]) => k.includes(term)).flatMap(([, v]) => v)
    const direct = ALL.filter((n) => n.includes(term))
    return [...new Set([...aliased, ...direct])].filter((n) => n in dynamicIconImports).slice(0, 96) as IconName[]
  }, [q])
  return (
    <div className="qv-modal-wrap" onClick={onClose}>
      <div className="qv-modal qv-iconpicker" onClick={(e) => e.stopPropagation()}>
        <h3>Elegir ícono</h3>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en inglés (rocket, chart, users…) o en español (cohete, equipo…)" />
        <div className="qv-icongrid">
          {results.map((name) => (
            <button key={name} className={name === value ? 'is-active' : ''} onClick={() => onPick(name)} title={name}>
              <DynamicIcon name={name} size={22} />
              <span>{name}</span>
            </button>
          ))}
          {results.length === 0 && <p>Sin resultados para «{q}».</p>}
        </div>
        <div className="qv-modal-actions"><button onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}
