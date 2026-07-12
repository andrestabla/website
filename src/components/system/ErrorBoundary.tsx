import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isChunkLoadError, reloadOnceForChunkError } from '../../lib/lazyWithRetry'

type Props = { children: ReactNode }
type State = { hasError: boolean; isChunk: boolean }

/**
 * Red de seguridad global: captura errores de render (incluidos fallos de carga de
 * chunks lazy que afloran durante el render) para evitar la pantalla en blanco.
 * Ante un chunk obsoleto, recarga una vez; para cualquier otro error, muestra un
 * fallback con opción de recargar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunk: false }

  static getDerivedStateFromError(error: unknown): State {
    const isChunk = isChunkLoadError(error)
    if (isChunk) reloadOnceForChunkError()
    return { hasError: true, isChunk }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-8 max-w-md text-center">
          <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2">
            {this.state.isChunk ? 'Actualizando la aplicación…' : 'Algo salió mal'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {this.state.isChunk
              ? 'Se detectó una versión nueva del sitio. Recargando para continuar.'
              : 'Ocurrió un error inesperado. Recarga la página para continuar.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-11 px-6 bg-brand-primary text-white text-xs font-black uppercase tracking-[0.25em] hover:bg-blue-800 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
