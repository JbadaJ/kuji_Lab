'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Prize } from '@/types/kuji'
import { getGradeLetter, getPrizeGrade } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt } from '@/lib/i18n'
import type { Ticket } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'

export default function ProbabilityModal({ tickets, onClose }: { tickets: Ticket[]; onClose: () => void }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; remaining: number; prize: Prize }>()
    for (const tk of tickets) {
      if (tk.grade === 'ラストワン賞') continue
      const s = map.get(tk.grade)
      if (s) {
        s.total++
        if (!tk.drawn) s.remaining++
      } else {
        map.set(tk.grade, { total: 1, remaining: tk.drawn ? 0 : 1, prize: tk.prize })
      }
    }
    const totalRemaining = [...map.values()].reduce((s, v) => s + v.remaining, 0)
    return [...map.entries()]
      .map(([grade, s]) => ({
        grade,
        remaining: s.remaining,
        total: s.total,
        prize: s.prize,
        prob: totalRemaining > 0 ? (s.remaining / totalRemaining) * 100 : 0,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade))
  }, [tickets])

  const totalRemaining = useMemo(() => stats.reduce((s, g) => s + g.remaining, 0), [stats])
  const maxProb = Math.max(...stats.map(s => s.prob), 1)

  const selectedStats = useMemo(() => stats.filter(s => selected.has(s.grade)), [stats, selected])
  const combinedProb = selectedStats.reduce((s, g) => s + g.prob, 0)
  const combinedRemaining = selectedStats.reduce((s, g) => s + g.remaining, 0)

  function toggleGrade(grade: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(grade)) next.delete(grade)
      else next.add(grade)
      return next
    })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">{t.simulatorProbTitle}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{fmt(t.simulatorProbSubtitle, { count: totalRemaining })}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selected.size > 0 && (
          <div className="flex-shrink-0 mx-4 mt-4 p-4 rounded-xl bg-zinc-800 border border-zinc-600">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedStats.map(s => (
                <span key={s.grade} className={`text-xs font-black px-2.5 py-1 rounded-full ${(GRADE_STYLE[s.grade] ?? DEFAULT_STYLE).badge}`}>
                  {getGradeLetter(s.grade)}賞
                </span>
              ))}
              <span className="text-xs text-zinc-500 self-center">{t.simulatorProbCombined}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black tabular-nums text-white">
                  {combinedProb.toFixed(1)}<span className="text-2xl text-zinc-400">%</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">{fmt(t.simulatorProbRemainingInfo, { remaining: combinedRemaining, total: totalRemaining })}</p>
              </div>
              {selected.size > 1 && (
                <div className="text-right text-[10px] text-zinc-600 space-y-0.5">
                  {selectedStats.map(s => (
                    <p key={s.grade}>{getGradeLetter(s.grade)}賞 {s.prob.toFixed(1)}%</p>
                  ))}
                  <p className="text-zinc-500 border-t border-zinc-700 pt-0.5">= {combinedProb.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {stats.map(({ grade, remaining, total, prize, prob }) => {
            const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
            const letter = getGradeLetter(grade)
            const isSelected = selected.has(grade)
            const isZero = remaining === 0
            return (
              <button
                key={grade}
                onClick={() => !isZero && toggleGrade(grade)}
                disabled={isZero}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'border-zinc-400 bg-zinc-700/80'
                    : isZero
                    ? 'border-zinc-800 bg-zinc-800/30 opacity-40 cursor-default'
                    : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected ? 'border-white bg-white' : 'border-zinc-600'
                }`}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ${style.badge}`}>
                  {letter}賞
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-400 truncate">{prize.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${(prob / maxProb) * 100}%`, background: style.glow }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 tabular-nums flex-shrink-0">{remaining}/{total}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right min-w-[48px]">
                  <span className={`text-base font-bold tabular-nums ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{prob.toFixed(1)}</span>
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">{t.simulatorProbHint}</p>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
              {t.simulatorProbClear}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
