import type { Plugin } from 'vite'
import type { OutputBundle, OutputChunk } from 'rollup'

/**
 * Las rutas publicas se resuelven con React.lazy, asi que el navegador solo
 * descubre su chunk despues de descargar y ejecutar el bundle de entrada, y la
 * raiz "/" ademas espera a que /api/cms diga que pagina gestionada toca. Eso son
 * dos saltos en serie antes de pintar nada.
 *
 * Este plugin emite <link rel="modulepreload"> en index.html para los chunks que
 * la primera pantalla necesita si o si, con sus dependencias transitivas, de modo
 * que bajen en paralelo con el bundle de entrada en vez de encadenarse.
 */
export function preloadCriticalChunks(entryNames: string[]): Plugin {
  return {
    name: 'algoritmot:preload-critical-chunks',
    apply: 'build',
    enforce: 'post',

    transformIndexHtml(html, ctx) {
      const bundle = ctx.bundle as OutputBundle | undefined
      if (!bundle) return html

      const chunks = Object.values(bundle).filter(
        (item): item is OutputChunk => item.type === 'chunk'
      )
      const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))

      // Los chunks que ya cuelgan estaticamente del entry los precarga Vite.
      const alreadyPreloaded = new Set<string>()
      for (const chunk of chunks) {
        if (!chunk.isEntry) continue
        collect(chunk.fileName, byFileName, alreadyPreloaded, false)
      }

      const wanted = new Set<string>()
      for (const name of entryNames) {
        const match = chunks.find((chunk) => chunk.name === name)
        if (!match) {
          this.warn(`preload-critical-chunks: no se encontro el chunk "${name}"`)
          continue
        }
        collect(match.fileName, byFileName, wanted, true)
      }

      const files = [...wanted].filter((file) => !alreadyPreloaded.has(file))
      if (files.length === 0) return html

      return {
        html,
        tags: files.map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${file}` },
          injectTo: 'head' as const,
        })),
      }
    },
  }
}

/**
 * Recorre las dependencias de un chunk. `includeSelf` distingue el arranque desde
 * un entry (cuyo propio archivo ya lo carga el <script>) de un chunk critico que
 * si queremos precargar entero.
 */
function collect(
  fileName: string,
  byFileName: Map<string, OutputChunk>,
  seen: Set<string>,
  includeSelf: boolean
) {
  const chunk = byFileName.get(fileName)
  if (!chunk) return
  if (includeSelf) {
    if (seen.has(fileName)) return
    seen.add(fileName)
  }
  // Solo importaciones estaticas: las dinamicas son justamente las que no
  // queremos arrastrar a la primera pantalla.
  for (const imported of chunk.imports) {
    collect(imported, byFileName, seen, true)
  }
}
