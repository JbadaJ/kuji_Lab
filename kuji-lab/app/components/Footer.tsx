'use client'

import { useLanguage } from '@/app/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
        <p>{t.footerDisclaimer}</p>
        <p>{t.footerNoRevenue}</p>
        <p className="text-xs">
          <a
            href="mailto:badajang0712@gmail.com"
            className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            {t.footerBugReport}
          </a>
          {' · '}badajang0712@gmail.com
        </p>
        <p className="text-xs">{t.footerCopyright}</p>
      </div>
    </footer>
  )
}