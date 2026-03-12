import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { translateObject } from '../lib/gemini'

const CACHE_PREFIX = 'algoritmot_static_i18n_v1'
const MAX_MEMORY_CACHE_ENTRIES = 80
const memoryCache = new Map<string, unknown>()
const inFlight = new Map<string, Promise<unknown>>()

function setMemoryCache(key: string, value: unknown) {
  if (memoryCache.has(key)) memoryCache.delete(key)
  memoryCache.set(key, value)
  if (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value as string | undefined
    if (oldest) memoryCache.delete(oldest)
  }
}

function runDeduped<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>
  const promise = run().finally(() => inFlight.delete(key))
  inFlight.set(key, promise as Promise<unknown>)
  return promise
}

function stableHash(input: unknown): string {
  const text = JSON.stringify(input)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return `s${Math.abs(hash)}_${text.length}`
}

export function useTranslatedStatic<T>(key: string, base: T): T {
  const { language } = useLanguage()
  const serializedBase = JSON.stringify(base)
  const hash = useMemo(() => stableHash(base), [serializedBase])
  const cacheKey = `${CACHE_PREFIX}:${key}:${language}:${hash}`
  const [value, setValue] = useState<T>(base)

  useEffect(() => {
    let cancelled = false
    const parsedBase = JSON.parse(serializedBase) as T

    if (language === 'es') {
      setValue(parsedBase)
      setMemoryCache(cacheKey, parsedBase)
      return
    }

    const memo = memoryCache.get(cacheKey)
    if (memo) {
      setValue(memo as T)
      return
    }

    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as T
        setMemoryCache(cacheKey, parsed)
        setValue(parsed)
        return
      }
    } catch {
      // ignore cache read errors
    }

    setValue(parsedBase)
    runDeduped<T>(cacheKey, () => translateObject(parsedBase, language))
      .then(translated => {
        if (cancelled) return
        setMemoryCache(cacheKey, translated)
        setValue(translated)
        try {
          localStorage.setItem(cacheKey, JSON.stringify(translated))
        } catch {
          // ignore cache write errors
        }
      })
      .catch(() => {
        if (!cancelled) setValue(parsedBase)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, language, serializedBase])

  return value
}
