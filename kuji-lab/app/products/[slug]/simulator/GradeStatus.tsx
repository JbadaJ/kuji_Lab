'use client'

import { useMemo } from 'react'
import type { Prize } from '@/types/kuji'
import { getGradeLetter } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import type { Ticket } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'

export function GradeStatusBar({ tickets }: { tickets: Ticket[] }) {
  const { t: tBar } = useLanguage()
  const stats = useMemo(() => {
    const map = new Map<string, { total: number; drawn: number; prize: Prize }>()
    for (const tk of tickets) {
      if (tk.grade === 'ラストワン賞') continue
      const s = map.get(tk.grade)
      if (s) {
        s.total++
        if (tk.drawn) s.drawn++
      } else {
        map.set(tk.grade, { total: 1, drawn: tk.drawn ? 1 : 0, prize: tk.prize })
      }
    }
    return [...map.entries()]
      .map(([grade, s]) => ({ grade, total: s.total, drawn: s.drawn, remaining: s.total - s.drawn }))
      .sort((a, b) => a.grade.localeCompare(b.grade))
  }, [tickets])

  return (
    <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-3 py-3 bg-zinc-900 border-b border-zinc-800" style={{ scrollbarWidth: 'none' }}>
      {stats.map(({ grade, total, drawn, remaining }) => {
        const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
        const letter = getGradeLetter(grade)
        const pct = total > 0 ? (drawn / total) * 100 : 0
        const allDrawn = remaining === 0
        return (
          <div
            key={grade}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl min-w-[64px] ${allDrawn ? 'opacity-40' : ''}`}
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${style.badge}`}>{letter}賞</span>
            <div className="w-full h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: style.glow }}
              />
            </div>
            <div className="flex flex-col items-center gap-0">
              <div className="flex items-baseline gap-0.5">
                <span className={`text-sm font-bold tabular-nums leading-none ${allDrawn ? 'text-zinc-500' : 'text-white'}`}>
                  {remaining}
                </span>
                <span className="text-[9px] text-zinc-500">/{total}</span>
              </div>
              <span className="text-[9px] text-zinc-500 leading-tight">{allDrawn ? tBar.simulatorCompleted : tBar.simulatorRemaining}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function GradeStatusPanel({ tickets }: { tickets: Ticket[] }) {
  const { t } = useLanguage()
  const stats = useMemo(() => {
    const map = new Map<string, { total: number; drawn: number; prize: Prize }>()
    for (const tk of tickets) {
      const s = map.get(tk.grade)
      if (s) {
        s.total++
        if (tk.drawn) s.drawn++
      } else {
        map.set(tk.grade, { total: 1, drawn: tk.drawn ? 1 : 0, prize: tk.prize })
      }
    }
    return [...map.entries()]
      .map(([grade, s]) => ({ grade, total: s.total, drawn: s.drawn, remaining: s.total - s.drawn, prize: s.prize }))
      .sort((a, b) => a.grade.localeCompare(b.grade))
  }, [tickets])

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1">
      {stats.map(({ grade, total, drawn, remaining, prize }) => {
        const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
        const letter = getGradeLetter(grade)
        const pct = total > 0 ? (drawn / total) * 100 : 0
        const allDrawn = remaining === 0
        return (
          <div
            key={grade}
            className={`flex flex-col gap-2.5 p-4 rounded-xl border border-zinc-700/50 bg-zinc-800/60 transition-opacity ${allDrawn ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-black px-2.5 py-1 rounded-full flex-shrink-0 ${style.badge}`}>
                {letter}賞
              </span>
              <span className="text-sm text-zinc-300 truncate flex-1 min-w-0">{prize.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: style.glow }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-lg font-bold tabular-nums leading-none ${allDrawn ? 'text-zinc-500' : 'text-white'}`}>
                  {remaining}
                </span>
                <span className="text-zinc-500">{t.simulatorRemaining}</span>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-bold tabular-nums leading-none text-zinc-400">{drawn}</span>
                <span className="text-zinc-500">{t.simulatorDrawnCount}</span>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg font-bold tabular-nums leading-none text-zinc-500">{total}</span>
                <span className="text-zinc-600">{t.simulatorTotalCount}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
