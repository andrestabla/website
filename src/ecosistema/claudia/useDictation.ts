import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Dictado por voz para la web, con el mismo modelo que la interfaz local:
 * lo que hablas se acumula en un borrador y solo se envía al decir
 * «adelante» (o pulsando enviar). Así puedes pensar y hacer pausas.
 */

const SR: any = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

const ADELANTE = /^(?:(.*?)[,.;\s]+)?(?:adelante|dale pues|dale ya|mandalo|m[áa]ndalo|env[íi]alo|hazlo ya)[.!\s]*$/i
const BORRAR = /^(?:borra eso|b[óo]rralo|olv[íi]dalo|borra el dictado)[.!]*$/i

export function useDictation(opts: {
  onDraft: (text: string) => void
  onSubmit: (text: string) => void
  getDraft: () => string
}) {
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [denied, setDenied] = useState(false)
  const recRef = useRef<any>(null)
  const cbRef = useRef(opts)
  cbRef.current = opts

  const supported = !!SR

  const stop = useCallback(() => {
    try { recRef.current?.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    if (!SR || listening) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'es-CO'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setPartial(interim)
    }
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed') setDenied(true)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      setPartial('')
      const said = finalText.trim()
      if (!said) return

      if (BORRAR.test(said)) { cbRef.current.onDraft(''); return }
      const m = said.match(ADELANTE)
      if (m) {
        const full = `${cbRef.current.getDraft()} ${m[1] || ''}`.replace(/\s+/g, ' ').trim()
        if (full) cbRef.current.onSubmit(full)
        return
      }
      const next = `${cbRef.current.getDraft()} ${said}`.replace(/\s+/g, ' ').trim()
      cbRef.current.onDraft(next)
    }

    try {
      rec.start()
      setListening(true)
    } catch { setListening(false) }
  }, [listening])

  useEffect(() => () => { try { recRef.current?.abort?.() } catch { /* noop */ } }, [])

  return { supported, listening, partial, denied, start, stop, toggle: () => (listening ? stop() : start()) }
}
