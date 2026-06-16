'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import type { Prize } from '@/types/kuji'
import { getGradeLetter, getPrizeGrade } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt, translateGrade } from '@/lib/i18n'
import type { DrawSession } from '@/app/hooks/useDrawHistory'
import type { Ticket } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'

// ── Result Toast ──────────────────────────────────────────────────────────────

export function ResultToast({ prize, locale, onClose }: { prize: Prize; locale: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true))
    const exit = setTimeout(() => { setVisible(false); setTimeout(onClose, 300) }, 2800)
    return () => { cancelAnimationFrame(enter); clearTimeout(exit) }
  }, [onClose])

  const grade = getPrizeGrade(prize)
  const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
  const gradeLabel = translateGrade(grade, locale as 'ko' | 'ja' | 'en')

  return (
    <div className={`pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 transition-all duration-300 whitespace-nowrap ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
      {prize.images[0] && (
        <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700">
          <Image src={prize.images[0]} alt={prize.name} fill className="object-cover" sizes="40px" />
        </div>
      )}
      <div className="min-w-0">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>{gradeLabel}</span>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5 max-w-xs truncate">{prize.name}</p>
      </div>
    </div>
  )
}

// ── Drawn ticket row ──────────────────────────────────────────────────────────

function DrawnTicketRow({ tk, index }: { tk: Ticket; index: number }) {
  const s = GRADE_STYLE[tk.grade] ?? DEFAULT_STYLE
  const { locale } = useLanguage()
  const label = translateGrade(tk.grade, locale as 'ko' | 'ja' | 'en')
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-zinc-600 w-5 flex-shrink-0 tabular-nums text-right">{index}</span>
      <div className={`w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center ${s.badge}`}>
        <span className="text-[10px] font-black">{getGradeLetter(tk.grade)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${s.badge}`}>{label}</span>
        <p className="text-[10px] text-zinc-300 truncate mt-0.5">{tk.prize.name}</p>
      </div>
    </div>
  )
}

// ── Drawn panel ───────────────────────────────────────────────────────────────

export function DrawnPanel({ drawn, locale }: { drawn: Ticket[]; locale: string }) {
  const sessionDrawn = useMemo(() => drawn.filter(tk => !tk.preset), [drawn])
  const presetDrawn  = useMemo(() => drawn.filter(tk => tk.preset),  [drawn])

  const sessionTally = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of sessionDrawn) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return [...map.entries()]
  }, [sessionDrawn])

  const presetTally = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of presetDrawn) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return [...map.entries()]
  }, [presetDrawn])

  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">
      <div className="flex flex-col gap-2 flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
            {t.simulatorMyDraws} <span className="text-orange-400 font-black">({sessionDrawn.length})</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sessionTally.map(([grade, count]) => {
            const s = GRADE_STYLE[grade] ?? DEFAULT_STYLE
            return (
              <span key={grade} className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.badge}`}>
                {getGradeLetter(grade)} ×{count}
              </span>
            )
          })}
          {sessionDrawn.length === 0 && <span className="text-xs text-zinc-500 italic">{t.simulatorNoDrawnYet}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-1 min-h-0 border-b border-zinc-700/60 pb-3">
        {[...sessionDrawn].reverse().map((tk, i) => (
          <DrawnTicketRow key={tk.id} tk={tk} index={sessionDrawn.length - i} />
        ))}
      </div>

      <div className={`flex flex-col gap-2 flex-shrink-0 pt-3 ${presetDrawn.length === 0 ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
            {t.simulatorPreDrawnSection} <span className="text-zinc-400 font-black">({presetDrawn.length})</span>
          </p>
        </div>
        {presetDrawn.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {presetTally.map(([grade, count]) => {
                const s = GRADE_STYLE[grade] ?? DEFAULT_STYLE
                return (
                  <span key={grade} className={`text-xs px-2 py-0.5 rounded-full font-bold opacity-70 ${s.badge}`}>
                    {getGradeLetter(grade)} ×{count}
                  </span>
                )
              })}
            </div>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-1">
              {[...presetDrawn].reverse().map((tk, i) => (
                <DrawnTicketRow key={tk.id} tk={tk} index={presetDrawn.length - i} />
              ))}
            </div>
          </>
        ) : (
          <span className="text-xs text-zinc-600 italic">{t.simulatorPreDrawnEmpty}</span>
        )}
      </div>
    </div>
  )
}

// ── History panel ─────────────────────────────────────────────────────────────

export function HistoryPanel({ sessions, onClear, locale }: {
  sessions: DrawSession[]
  onClear: () => void
  locale: string
}) {
  const { t } = useLanguage()

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-500">
        <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs">{t.historyEmpty}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
          {fmt(t.historySessionCount, { count: sessions.length })}
        </span>
        <button onClick={onClear} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">
          {t.historyClear}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {sessions.map(session => {
          const cost = session.priceYen ? session.totalDraws * session.priceYen : null
          const gradeEntries = Object.entries(session.tally).sort((a, b) => a[0].localeCompare(b[0]))
          const date = new Date(session.date)
          const dateStr = date.toLocaleDateString(
            locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
            { month: 'short', day: 'numeric' }
          ) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={session.id} className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[11px] text-zinc-300 font-medium leading-tight truncate flex-1 min-w-0">{session.title}</p>
                {session.finished && (
                  <span className="text-[9px] text-emerald-400 font-bold flex-shrink-0 mt-0.5">{t.historyFinished}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                <span>{dateStr}</span>
                <span>·</span>
                <span>{fmt(t.historyDrawCount, { count: session.totalDraws })}</span>
                {cost && (
                  <>
                    <span>·</span>
                    <span className="text-amber-400 font-semibold">¥{cost.toLocaleString('ja-JP')}</span>
                  </>
                )}
              </div>
              {gradeEntries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {gradeEntries.map(([grade, count]) => {
                    const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
                    return (
                      <span key={grade} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${style.badge}`}>
                        {getGradeLetter(grade)} ×{count}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
