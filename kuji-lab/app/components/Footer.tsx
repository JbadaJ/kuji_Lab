'use client'

import { useLanguage } from '@/app/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          이 사이트는 Ichiban Kuji 팬이 만든 <strong>비공식 팬사이트</strong>입니다.<br />
          모든 이미지와 상품 정보의 저작권은 BANDAI SPIRITS 및 각 원저작권자에게 있습니다.
        </p>
        <p className="mt-3 text-xs">
          © 2026 一番くじ Lab • Non-commercial Fan Project • All Rights Reserved to Original Copyright Holders
        </p>
      </div>
    </footer>
  )
}