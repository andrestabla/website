import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { translateObject } from '../lib/gemini'

const CACHE_PREFIX = 'algoritmot_static_i18n_v1'

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
      return
    }

    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        setValue(JSON.parse(raw) as T)
        return
      }
    } catch {
      // ignore cache read errors
    }

    setValue(parsedBase)
    translateObject(parsedBase, language)
      .then(translated => {
        if (cancelled) return
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
