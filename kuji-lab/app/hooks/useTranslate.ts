'use client'

import { useState, useEffect, useRef } from 'react'
import type { Locale } from '@/lib/i18n'

// ── Fixed-term replacements ───────────────────────────────────────────────────
// These terms have known translations and must NOT be sent to the API.
// They are replaced with a placeholder before the API call and restored after.

interface FixedTerm {
  placeholder: string   // must survive round-trip through translation API
  ja: string            // source text to replace
  ko: string
  en: string
}

const FIXED_TERMS: FixedTerm[] = [
  { placeholder: '{{ICHIBAN_KUJI}}', ja: '一番くじ',  ko: '이치방 쿠지', en: 'Ichiban Kuji' },
  { placeholder: '{{PREMIUM_KUJI}}', ja: 'プレミアム一番くじ', ko: '프리미엄 이치방 쿠지', en: 'Premium Ichiban Kuji' },
]

function applyFixed(text: string): string {
  let s = text
  for (const t of FIXED_TERMS) s = s.replaceAll(t.ja, t.placeholder)
  return s
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function restoreFixed(text: string, targetLang: string): string {
  let s = text
  for (const t of FIXED_TERMS) {
    const word = targetLang === 'ko' ? t.ko : t.en
    // Case-insensitive: the API sometimes changes placeholder casing (e.g. {{ichiban_Kuji}})
    s = s.replace(new RegExp(escapeRegex(t.placeholder), 'gi'), word)
    // Also fix if the API stripped the braces entirely (e.g. ICHIBAN_KUJI)
    const withoutBraces = t.placeholder.replace(/\{|\}/g, '')
    s = s.replace(new RegExp(escapeRegex(withoutBraces), 'gi'), word)
  }
  return s
}

// ── Cache ─────────────────────────────────────────────────────────────────────
// Bump version when fixed-term logic changes to invalidate stale entries.

const STORAGE_KEY = 'kuji-translate-v3'
const memCache = new Map<string, string>()
let storageLoaded = false

function ensureStorageLoaded() {
  if (storageLoaded) return
  storageLoaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) {
      memCache.set(k, v)
    }
  } catch {}
}

function saveEntry(key: string, value: string) {
  memCache.set(key, value)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const obj: Record<string, string> = raw ? JSON.parse(raw) : {}
    obj[key] = value
    const keys = Object.keys(obj)
    if (keys.length > 500) delete obj[keys[0]]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {}
}

// ── API call ──────────────────────────────────────────────────────────────────

const API_LANG: Partial<Record<Locale, string>> = { ko: 'ko', en: 'en' }

async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text

  const cacheKey = `${targetLang}:${text}`
  ensureStorageLoaded()
  if (memCache.has(cacheKey)) return memCache.get(cacheKey)!

  const processed = applyFixed(text)

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(processed)}&langpair=ja|${targetLang}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return text
    const data = await res.json()
    const raw: string = data.responseData?.translatedText ?? processed
    if (raw.startsWith('PLEASE SELECT')) return text

    const final = restoreFixed(raw, targetLang)
    saveEntry(cacheKey, final)
    return final
  } catch {
    return text
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTranslate(texts: string[], locale: Locale) {
  const [results, setResults] = useState<string[]>(texts)
  const [loading, setLoading] = useState(false)
  const resolvedKey = useRef('')

  useEffect(() => {
    const targetLang = API_LANG[locale]
    const textsKey = texts.join('\x00')
    const stateKey = `${locale}:${textsKey}`

    if (!targetLang) {
      setResults(texts)
      setLoading(false)
      resolvedKey.current = stateKey
      return
    }

    if (resolvedKey.current === stateKey) return

    ensureStorageLoaded()

    const fromCache = texts.map(t =>
      !t.trim() ? t : memCache.get(`${targetLang}:${t}`) ?? null
    )
    if (fromCache.every(v => v !== null)) {
      setResults(fromCache as string[])
      setLoading(false)
      resolvedKey.current = stateKey
      return
    }

    setLoading(true)
    let cancelled = false

    Promise.all(texts.map(t => translateOne(t, targetLang))).then(translated => {
      if (cancelled) return
      setResults(translated)
      setLoading(false)
      resolvedKey.current = stateKey
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, texts.join('\x00')])

  return { results, loading }
}
