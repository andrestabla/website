/** Bus mínimo para reaccionar a un 401 en cualquier llamada al API del BI:
 *  la sesión (12 h) pudo vencer; devolvemos al usuario al login sin mostrar
 *  un error crudo. */
type Cb = () => void
const subs = new Set<Cb>()

export function onBiUnauthorized(cb: Cb): () => void {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

export function emitBiUnauthorized() {
  subs.forEach((cb) => {
    try {
      cb()
    } catch {
      /* ignore */
    }
  })
}
