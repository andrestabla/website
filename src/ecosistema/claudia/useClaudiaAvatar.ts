import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Avatar 3D de Claudia en la web (TalkingHead + Ready Player Me) con voz.
 *
 * Misma experiencia que la interfaz local: la cara habla sincronizada con el
 * audio real. Si el 3D o la voz de Azure no están disponibles, degrada solo
 * (sin avatar / con la voz del navegador) en vez de romperse.
 */

export type ClaudiaMood = 'idle' | 'listening' | 'thinking' | 'working' | 'speaking' | 'error'

const MOOD_MAP: Record<ClaudiaMood, string> = {
  idle: 'neutral',
  listening: 'happy',
  thinking: 'neutral',
  working: 'neutral',
  speaking: 'happy',
  error: 'sad',
}

/** Reparte el tiempo del audio entre las palabras, proporcional a su longitud. */
function wordTimings(text: string, durMs: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  if (!words.length) return { words: [], wtimes: [], wdurations: [] }
  const total = words.reduce((a, w) => a + w.length + 1, 0)
  const wtimes: number[] = []
  const wdurations: number[] = []
  let t = 0
  for (const w of words) {
    const d = durMs * ((w.length + 1) / total)
    wtimes.push(Math.round(t))
    wdurations.push(Math.round(d * 0.9))
    t += d
  }
  return { words, wtimes, wdurations }
}

export function useClaudiaAvatar(container: React.RefObject<HTMLDivElement | null>) {
  const headRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null)
  const [ready, setReady] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [failed, setFailed] = useState(false)
  /** Qué voz se usó la última vez: la de Azure (Salomé) o la del navegador. */
  const [voiceSource, setVoiceSource] = useState<'salome' | 'navegador' | null>(null)

  // ── carga del avatar ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!container.current) return

    ;(async () => {
      try {
        const { TalkingHead } = await import(/* @vite-ignore */ 'talkinghead')
        if (cancelled || !container.current) return
        const head = new TalkingHead(container.current, {
          ttsEndpoint: '/api/claudia?action=tts', // no se usa: hablamos con speakAudio
          lipsyncModules: ['en'],
          cameraView: 'head',
          cameraRotateEnable: false,
          avatarMood: 'neutral',
          modelFPS: 30,
          lightAmbientIntensity: 2,
          lightDirectIntensity: 22,
        })
        await head.showAvatar({
          url: '/claudia/claudia.glb',
          body: 'F',
          avatarMood: 'neutral',
          lipsyncLang: 'en',
          baseline: { eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1 },
        })
        if (cancelled) { try { head.stop() } catch { /* noop */ } return }
        headRef.current = head
        setReady(true)
      } catch (err) {
        console.warn('Avatar 3D no disponible:', err)
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      try { headRef.current?.stop?.() } catch { /* noop */ }
      headRef.current = null
    }
  }, [container])

  const setMood = useCallback((mood: ClaudiaMood) => {
    const head = headRef.current
    if (!head) return
    try {
      head.setMood(MOOD_MAP[mood] || 'neutral')
      if (mood === 'listening') head.makeEyeContact?.(1200)
      else if (mood === 'thinking') head.lookAt?.(null, -120, 900)
      else if (mood === 'idle') head.lookAhead?.(800)
    } catch { /* noop */ }
  }, [])

  const stop = useCallback(() => {
    try { headRef.current?.stopSpeaking?.() } catch { /* noop */ }
    if (htmlAudioRef.current) {
      try { htmlAudioRef.current.pause() } catch { /* noop */ }
      htmlAudioRef.current = null
    }
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    setSpeaking(false)
  }, [])

  /** Voz del navegador: respaldo cuando Azure no está configurado. */
  const speakLocal = useCallback((text: string) => new Promise<void>((resolve) => {
    if (!window.speechSynthesis) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'es-CO'
    u.rate = 1.05
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find((x) => x.lang?.startsWith('es'))
    if (v) u.voice = v
    u.onend = u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  }), [])

  /** Dice un texto: audio de Azure + lip-sync con visemas; si falla, voz local. */
  const speak = useCallback(async (text: string) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    stop()
    setSpeaking(true)
    setMood('speaking')
    try {
      const res = await fetch('/api/claudia?action=tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const buf = await res.arrayBuffer()
      setVoiceSource('salome')

      const head = headRef.current
      if (head) {
        const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
        audioCtxRef.current = ctx
        if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* noop */ } }
        const audio = await ctx.decodeAudioData(buf.slice(0))
        const durMs = audio.duration * 1000
        head.speakAudio({ audio, ...wordTimings(clean, durMs) }, { lipsyncLang: 'en' })
        await new Promise<void>((r) => setTimeout(r, durMs + 200))
      } else {
        // sin 3D: solo reproducir el audio
        const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))
        const el = new Audio(url)
        htmlAudioRef.current = el
        await new Promise<void>((r) => {
          el.onended = el.onerror = () => { URL.revokeObjectURL(url); r() }
          el.play().catch(() => r())
        })
      }
    } catch {
      setVoiceSource('navegador')
      await speakLocal(clean) // Azure no disponible → voz del navegador
    } finally {
      setSpeaking(false)
      setMood('idle')
    }
  }, [setMood, speakLocal, stop])

  return { ready, failed, speaking, speak, stop, setMood, voiceSource }
}
