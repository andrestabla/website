import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { askAssistant, type AssistantBlock, type AssistantMessage } from '../lib/assistant-api'

export type RegisteredBlock = { id: string; title: string; getDigest: () => string }

type AssistantState = {
  open: boolean
  busy: boolean
  messages: AssistantMessage[]
  error: string
  activeBlock: AssistantBlock | null
  blocks: RegisteredBlock[]
  section: string
  setSection: (s: string) => void
  openPanel: () => void
  closePanel: () => void
  toggle: () => void
  clear: () => void
  registerBlock: (b: RegisteredBlock) => void
  unregisterBlock: (id: string) => void
  explainBlock: (b: AssistantBlock) => void
  sendMessage: (text: string) => void
  setViewContext: (ctx: string) => void
}

const Ctx = createContext<AssistantState | null>(null)

export function useAssistant(): AssistantState | null {
  return useContext(Ctx)
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [error, setError] = useState('')
  const [activeBlock, setActiveBlock] = useState<AssistantBlock | null>(null)
  const [section, setSection] = useState('workspace')
  const [blocks, setBlocks] = useState<RegisteredBlock[]>([])
  const sectionRef = useRef(section)
  sectionRef.current = section
  // Contexto de la vista (filtros activos, año, selección) que publica cada módulo.
  const viewContextRef = useRef('')
  const setViewContext = useCallback((ctx: string) => { viewContextRef.current = ctx || '' }, [])

  const registerBlock = useCallback((b: RegisteredBlock) => {
    setBlocks((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [...prev, b]))
  }, [])
  const unregisterBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const run = useCallback(async (nextMessages: AssistantMessage[], block: AssistantBlock | null) => {
    setBusy(true)
    setError('')
    try {
      const { reply } = await askAssistant({
        section: sectionRef.current,
        block: block || undefined,
        messages: nextMessages,
        context: viewContextRef.current || undefined,
      })
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  const explainBlock = useCallback((b: AssistantBlock) => {
    setOpen(true)
    setActiveBlock(b)
    const userMsg: AssistantMessage = { role: 'user', content: `Interpreta la gráfica «${b.title || 'este bloque'}».` }
    const next = [...messagesRef.current, userMsg]
    setMessages(next)
    void run(next, b)
  }, [run])

  const sendMessage = useCallback((text: string) => {
    const t = text.trim()
    if (!t) return
    const next = [...messagesRef.current, { role: 'user' as const, content: t }]
    setMessages(next)
    void run(next, activeBlockRef.current)
  }, [run])

  // Refs para leer el estado más reciente dentro de callbacks estables.
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const activeBlockRef = useRef(activeBlock)
  activeBlockRef.current = activeBlock

  const clear = useCallback(() => {
    setMessages([])
    setActiveBlock(null)
    setError('')
  }, [])

  const value = useMemo<AssistantState>(() => ({
    open,
    busy,
    messages,
    error,
    activeBlock,
    blocks,
    section,
    setSection,
    openPanel: () => setOpen(true),
    closePanel: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
    clear,
    registerBlock,
    unregisterBlock,
    explainBlock,
    sendMessage,
    setViewContext,
  }), [open, busy, messages, error, activeBlock, blocks, section, clear, registerBlock, unregisterBlock, explainBlock, sendMessage, setViewContext])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Hook para que un módulo publique su contexto de vista (filtros activos) al asistente. */
export function useAssistantViewContext(context: string) {
  const asst = useAssistant()
  const setViewContext = asst?.setViewContext
  useEffect(() => {
    setViewContext?.(context)
    return () => setViewContext?.('')
  }, [setViewContext, context])
}
