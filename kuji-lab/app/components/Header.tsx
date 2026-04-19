'use client'

import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt } from '@/lib/i18n'
import LanguageSwitcher from './LanguageSwitcher'
import NoticesBell from './NoticesBell'
import UserButton from './UserButton'

interface Props {
  productCount: number
}

export default function Header({ productCount }: Props) {
  const { t } = useLanguage()

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            一番くじ Lab
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {fmt(t.headerSubtitle, { count: productCount })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <NoticesBell />
          <LanguageSwitcher />
          <UserButton />
        </div>
      </div>
    </header>
  )
}
