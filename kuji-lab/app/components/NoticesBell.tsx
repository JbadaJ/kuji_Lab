'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface Notice {
  id: string
  type: 'info' | 'update' | 'warning'
  title: string
  body: string
  created_at: string
}

const TYPE_STYLE: Record<Notice['type'], { dot: string; label: string }> = {
  info:    { dot: 'bg-blue-500',   label: '공지' },
  update:  { dot: 'bg-green-500',  label: '업데이트' },
  warning: { dot: 'bg-yellow-500', label: '중요' },
}

const STORAGE_KEY = 'kuji_read_notices'

function getReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  )
}

export default function NoticesBell() {
  const { locale } = useLanguage()
  const [notices, setNotices] = useState<Notice[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReadIds(getReadIds())
    fetch('/api/notices')
      .then(r => r.json())
      .then(setNotices)
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unreadCount = notices.filter(n => !readIds.has(n.id)).length

  const markAllRead = useCallback(() => {
    const next = new Set([...readIds, ...notices.map(n => n.id)])
    setReadIds(next)
    saveReadIds(next)
  }, [readIds, notices])

  const markRead = useCallback((id: string) => {
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    saveReadIds(next)
  }, [readIds])

  const panelLabels = {
    ko: { title: '공지사항', empty: '새로운 공지가 없습니다.', markAll: '모두 읽음' },
    ja: { title: 'お知らせ', empty: '新しいお知らせはありません。', markAll: 'すべて既読' },
    en: { title: 'Notices', empty: 'No new notices.', markAll: 'Mark all read' },
  }
  const lbl = panelLabels[locale as keyof typeof panelLabels] ?? panelLabels.en

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={lbl.title}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{lbl.title}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {lbl.markAll}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[min(70vh,420px)] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {notices.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">{lbl.empty}</p>
            ) : (
              notices.map(notice => {
                const isUnread = !readIds.has(notice.id)
                const ts = TYPE_STYLE[notice.type]
                return (
                  <div
                    key={notice.id}
                    onClick={() => markRead(notice.id)}
                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${isUnread ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${ts.dot} ${isUnread ? 'opacity-100' : 'opacity-30'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            notice.type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                            notice.type === 'update'  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                                         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          }`}>
                            {ts.label}
                          </span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{notice.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{notice.body}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{formatDate(notice.created_at, locale)}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
