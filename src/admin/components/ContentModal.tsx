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
            <div className={`relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 overflow-hidden ${panelClassName ?? ''}`}>
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                            Módulo de Edición
                        </div>
                        <h2 className="font-black text-3xl tracking-tighter text-slate-900 leading-none">{title}</h2>
                        {subtitle && <p className="text-sm text-slate-500 font-medium mt-2">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-10 py-10 custom-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
                    <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-600 px-6 py-4 transition-colors">
                        Cancelar
                    </button>
                    {onSave && (
                        <button
                            onClick={onSave}
                            className={`px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${danger
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/10'
                                : 'bg-brand-primary hover:bg-blue-800 shadow-brand-primary/10'
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

const inputBase = "w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all duration-200"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>
export function Input(props: InputProps) {
    return <input className={inputBase} {...props} />
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ rows = 4, ...props }: TextareaProps) {
    return <textarea className={`${inputBase} resize-none custom-scrollbar`} rows={rows} {...props} />
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
