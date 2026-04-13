'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { type Locale, type Translations, translations, LOCALES } from '@/lib/i18n'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kuji-locale') as Locale | null
    if (saved && (LOCALES as readonly string[]).includes(saved)) {
      setLocaleState(saved)
    }
  }, [])

  // Sync html lang attribute for accessibility
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  function setLocale(next: Locale) {
    setLocaleState(next)
    localStorage.setItem('kuji-locale', next)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
