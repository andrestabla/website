/**
 * TalkingHead se resuelve en el navegador vía el importmap de index.html
 * (CDN), no por node_modules. Esta declaración es solo para TypeScript.
 */
declare module 'talkinghead' {
  export class TalkingHead {
    constructor(node: HTMLElement, opts?: Record<string, unknown>)
    showAvatar(opts: Record<string, unknown>): Promise<void>
    speakAudio(audio: Record<string, unknown>, opts?: Record<string, unknown>, onSubtitle?: (s: string) => void): void
    speakMarker(cb: () => void): void
    stopSpeaking(): void
    setMood(mood: string): void
    lookAt(x: number | null, y: number | null, t?: number): void
    lookAhead(t?: number): void
    lookAtCamera(t?: number): void
    makeEyeContact(t?: number): void
    playGesture(name: string, dur?: number, mirror?: boolean, ms?: number): void
    start(): void
    stop(): void
  }
}
