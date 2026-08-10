import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ojos de Claudia en la web: gestos de mano + presencia facial, 100% local
 * en el navegador con MediaPipe Tasks. Nada de video sale del equipo.
 *
 * En la web NO hace falta identidad facial: la sesión del ecosistema (con 2FA
 * y rol SUPERADMIN) ya autentica a la persona. La cámara aquí es para gestos.
 *
 * Gestos → callbacks:
 *   👍 Thumb_Up = enviar · ✋ Open_Palm = callar · ✊ Closed_Fist = (reservado)
 *   👎 Thumb_Down = borrar dictado · ✌️ Victory = (reservado)
 */

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const MODELS = '/claudia/models-vision'

export type Gesture = 'Thumb_Up' | 'Thumb_Down' | 'Open_Palm' | 'Closed_Fist' | 'Victory'

export function useVision(opts: { onGesture: (g: Gesture) => void; enabled: boolean }) {
  const { enabled } = opts
  const cbRef = useRef(opts)
  cbRef.current = opts

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [running, setRunning] = useState(false)
  const [present, setPresent] = useState(false)
  const [error, setError] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const gestureRef = useRef<any>(null)
  const faceRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const lastGesture = useRef('')
  const stableCount = useRef(0)
  const lastActionAt = useRef(0)

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    setRunning(false)
    setPresent(false)
  }, [])

  const tick = useCallback(() => {
    const video = videoRef.current
    const g = gestureRef.current
    const f = faceRef.current
    if (!video || video.readyState < 2 || !g || !f) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const now = performance.now()
    try {
      const gr = g.recognizeForVideo(video, now)
      const top = gr?.gestures?.[0]?.[0]
      const name = top && top.score > 0.6 ? top.categoryName : ''
      if (name && name === lastGesture.current) stableCount.current++
      else stableCount.current = 0
      lastGesture.current = name
      if (name && name !== 'None' && stableCount.current >= 2 && Date.now() - lastActionAt.current > 2500) {
        lastActionAt.current = Date.now()
        cbRef.current.onGesture(name as Gesture)
      }

      const fr = f.detectForVideo(video, now + 0.01)
      setPresent(!!fr?.detections?.length)
    } catch { /* frame suelto */ }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    if (running || streamRef.current) return
    try {
      // 1) cámara primero (pide permiso de inmediato)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return }
      video.srcObject = stream
      await video.play()
      setRunning(true)
      setError('')

      // 2) modelos (con la cámara ya viva)
      const mp: any = await import(/* @vite-ignore */ `${CDN}/vision_bundle.mjs`)
      const files = await mp.FilesetResolver.forVisionTasks(`${CDN}/wasm`)
      gestureRef.current = await mp.GestureRecognizer.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${MODELS}/gesture_recognizer.task`, delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1,
      })
      faceRef.current = await mp.FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${MODELS}/blaze_face_short_range.tflite`, delegate: 'GPU' },
        runningMode: 'VIDEO',
      })
      rafRef.current = requestAnimationFrame(tick)
    } catch (err: any) {
      setError(/NotAllowed/i.test(String(err?.name)) ? 'Permiso de cámara denegado' : String(err?.message || err))
      stop()
    }
  }, [running, stop, tick])

  // arranca/detiene según el interruptor
  useEffect(() => {
    if (enabled) void start()
    else stop()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { videoRef, running, present, error, start, stop }
}
