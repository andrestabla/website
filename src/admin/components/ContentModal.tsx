/**
 * ContentModal — slide-over panel for creating/editing CMS content.
 */
import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: ReactNode
    onSave?: () => void
    saveLabel?: string
    danger?: boolean
    panelClassName?: string
}

export function ContentModal({ isOpen, onClose, title, subtitle, children, onSave, saveLabel = 'Guardar', danger, panelClassName }: ModalProps) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        if (isOpen) window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className={`relative ml-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl border-l-8 border-brand-primary overflow-hidden ${panelClassName ?? ''}`}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="font-black text-xl tracking-tighter text-slate-900">{title}</h2>
                        {subtitle && <p className="text-sm text-slate-400 font-light mt-1">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-700 transition-colors mt-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-8">
                    {children}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
                    <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors px-4 py-3">
                        Cancelar
                    </button>
                    {onSave && (
                        <button
                            onClick={onSave}
                            className={`px-8 py-3 font-black text-[11px] uppercase tracking-widest text-white transition-all ${danger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-brand-primary hover:bg-blue-800'
                                }`}
                        >
                            {saveLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Field helpers ────────────────────────────────────────────────────────────

type FieldProps = {
    label: string
    children: ReactNode
    hint?: string
}

export function Field({ label, children, hint }: FieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-slate-400 font-light">{hint}</p>}
        </div>
    )
}

const inputBase = "w-full bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-900 focus:border-brand-primary focus:bg-white outline-none transition-colors"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>
export function Input(props: InputProps) {
    return <input className={inputBase} {...props} />
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ rows = 4, ...props }: TextareaProps) {
    return <textarea className={`${inputBase} resize-none`} rows={rows} {...props} />
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

type ConfirmDeleteProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    itemName: string
}

export function ConfirmDelete({ isOpen, onClose, onConfirm, itemName }: ConfirmDeleteProps) {
    return (
        <ContentModal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirmar eliminación"
            subtitle={`Esta acción no se puede deshacer.`}
            onSave={onConfirm}
            saveLabel="Eliminar"
            danger
        >
            <div className="space-y-4">
                <p className="text-slate-600 font-light">
                    ¿Estás seguro de que deseas eliminar <strong className="font-bold text-slate-900">"{itemName}"</strong>?
                    El contenido dejará de mostrarse en el sitio web.
                </p>
                <div className="bg-red-50 border border-red-200 p-4 text-red-700 text-sm font-medium">
                    ⚠ Esta operación es permanente en esta sesión y no tiene deshacer.
                </div>
            </div>
        </ContentModal>
    )
}
