'use client'

import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import SignInModal from './SignInModal'

export default function UserButton() {
  const { data: session, status } = useSession()
  const { t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {t.authSignIn}
        </button>
        {modalOpen && <SignInModal onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-400"
          aria-label={session.user?.name ?? 'User menu'}
        >
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'avatar'}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {session.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-1 z-50">
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {session.user?.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {session.user?.email}
              </p>
            </div>
            <button
              onClick={() => { signOut(); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              {t.authSignOut}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
