/**
 * Learning Builder — el historial de versiones entregadas, para los paneles.
 *
 * Vive aparte de la lista que lo pinta porque lo piden dos paneles igual —el
 * del paquete y el de la pieza de medios— y porque un archivo que exporta
 * componentes no debe exportar también sus ganchos: el recargado en caliente
 * deja de funcionar en todo el módulo.
 */
import { useCallback, useEffect, useState } from 'react'
import { learningApi, type DeliveryRow } from './api'

/** Qué se entrega en un recurso: un sitio navegable o un archivo reproducible. */
export type DeliveryPiece = 'package' | 'media'

/**
 * Carga el historial y lo recarga cuando haga falta. Si falla no tumba el
 * panel: el historial informa, no es lo que se está editando.
 */
export function useDeliveries(resourceId: string) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [live, setLive] = useState(1)
  const reload = useCallback(async () => {
    try {
      const payload = await learningApi.resources.deliveries(resourceId)
      setDeliveries(payload.deliveries || [])
      setLive(payload.live || 1)
    } catch { /* el historial es informativo: si falla, el panel sigue */ }
  }, [resourceId])
  useEffect(() => { void reload() }, [reload])
  return { deliveries, live, reload }
}
