/**
 * Learning Builder — el bloque, tal como se va a publicar.
 *
 * No es una imitación de la caja del alumno: es la caja del alumno. Llama al
 * mismo `renderBlock` y a la misma hoja de estilo que producen el HTML
 * publicado, el enlace público y el SCORM. Por eso no puede desfasarse: si un
 * bloque cambia de aspecto al publicarse, cambia aquí en el mismo commit.
 *
 * Va dentro de un shadow root, y eso no es un lujo: la hoja del recurso
 * redefine `body`, `h1`, `*` y las variables de `:root`. Inyectada en la
 * página del builder se llevaría por delante la interfaz entera. El shadow
 * root la encierra, y de paso hace que la marca del cliente —su color, su
 * tipografía, su radio de esquina— se vea exacta al lado del formulario.
 */
import { useEffect, useRef } from 'react'
import type { LbBlock } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import { ovaCss, renderBlock } from '../lib/render-ova'

/**
 * Ajustes para ver un bloque suelto y no una pantalla completa: sin el
 * armazón de navegación, sin fondo propio y sin el margen inferior que separa
 * un bloque del siguiente, que aquí lo pone la tarjeta.
 *
 * Nada más. Los bloques con pasos —pestañas, proceso— traen el primero
 * marcado como activo desde el propio render, así que se ven bien quietos; el
 * acordeón es un <details> y abre sin JavaScript. Lo que aquí no se puede
 * probar es el recorrido completo, y para eso está la pestaña de vista previa.
 */
const LOOSE = `
:host{display:block}
body{background:transparent;padding:0}
.lb-screen{display:block;max-width:none;padding:0}
.lb-block{margin:0}
`

export function BlockPreview({
  block,
  index,
  directives,
}: {
  block: LbBlock
  index: number
  directives: LbDirectives
}) {
  const host = useRef<HTMLDivElement>(null)
  const shadow = useRef<ShadowRoot | null>(null)

  useEffect(() => {
    const node = host.current
    if (!node) return
    if (!shadow.current) shadow.current = node.attachShadow({ mode: 'open' })
    shadow.current.innerHTML =
      `<style>${ovaCss(directives)}${LOOSE}</style>` +
      `<div class="lb-screen"><div class="lb-block">${renderBlock(block, index)}</div></div>`
  }, [block, index, directives])

  return <div ref={host} />
}
