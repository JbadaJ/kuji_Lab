'use client'

import { useLanguage } from '@/app/contexts/LanguageContext'
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800">
      {LOCALES.map(l => (
        <button
          key={l}
          onClick={() => setLocale(l as Locale)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            locale === l
              ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-50 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          {LOCALE_NAMES[l as Locale]}
        </button>
      ))}
    </div>
  )
}
