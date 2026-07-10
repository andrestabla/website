import { createContext, useContext } from 'react'

/**
 * Canal por el que cada gráfica (EChart) publica su resumen de datos al bloque
 * (Card) que la contiene, para que el asistente IA pueda interpretarla.
 */
export type BlockDigestSink = {
  add: (id: string, digest: string) => void
  remove: (id: string) => void
}

export const BlockDigestContext = createContext<BlockDigestSink | null>(null)

export function useBlockDigestSink(): BlockDigestSink | null {
  return useContext(BlockDigestContext)
}
