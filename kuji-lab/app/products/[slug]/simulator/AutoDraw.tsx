'use client'

import { useState, useEffect, useMemo } from 'react'
import type { KujiProduct } from '@/types/kuji'
import { getGradeLetter } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt, translateGrade } from '@/lib/i18n'
import type { Ticket, AutoDrawGoal, AutoDrawSpeed, AutoDrawConfig, AutoResult } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'

// ── AutoDrawSetup ─────────────────────────────────────────────────────────────

export function AutoDrawSetup({ tickets, product, onStart, onClose }: {
  tickets: Ticket[]
  product: KujiProduct
  onStart: (cfg: AutoDrawConfig) => void
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [goal, setGoal]               = useState<AutoDrawGoal>('grade')
  const [targetGrade, setTargetGrade] = useState('A賞')
  const [targetCount, setTargetCount] = useState(10)
  const [speed, setSpeed]             = useState<AutoDrawSpeed>('normal')

  const remaining = useMemo(() => tickets.filter(tk => !tk.drawn), [tickets])
  const grades = useMemo(() => {
    const s = new Set<string>()
    for (const tk of remaining) if (tk.grade && tk.grade !== 'ラストワン賞') s.add(tk.grade)
    return [...s].sort()
  }, [remaining])

  useEffect(() => {
    if (grades.length > 0 && !grades.includes(targetGrade)) setTargetGrade(grades[0])
  }, [grades, targetGrade])

  const canStart = remaining.length > 0 && (goal !== 'grade' || grades.length > 0)

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">{t.autoDrawTitle}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.autoDrawGoalLabel}</p>
            <div className="space-y-2">
              {([
                { id: 'grade' as const, label: t.autoDrawGoalGrade },
                { id: 'all'   as const, label: t.autoDrawGoalAll },
                { id: 'count' as const, label: t.autoDrawGoalCount },
              ]).map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all ${
                    goal === g.id ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${goal === g.id ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`} />
                  {g.label}
                </button>
              ))}
            </div>

            {goal === 'grade' && grades.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-zinc-500 mb-2">{t.autoDrawGoalGradeSelect}</p>
                <div className="flex flex-wrap gap-1.5">
                  {grades.map(g => {
                    const style = GRADE_STYLE[g] ?? DEFAULT_STYLE
                    return (
                      <button
                        key={g}
                        onClick={() => setTargetGrade(g)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          targetGrade === g ? style.badge : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {getGradeLetter(g)}賞
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {goal === 'count' && (
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setTargetCount(v => Math.max(1, v - 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">−</button>
                <input
                  type="number"
                  value={targetCount}
                  min={1}
                  max={remaining.length}
                  onChange={e => setTargetCount(Math.max(1, Math.min(remaining.length, Number(e.target.value) || 1)))}
                  className="w-16 text-center bg-zinc-800 rounded-lg py-1.5 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                />
                <button onClick={() => setTargetCount(v => Math.min(remaining.length, v + 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">+</button>
                <span className="text-sm text-zinc-500">/ {remaining.length}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.autoDrawSpeedLabel}</p>
            <div className="flex gap-2">
              {([
                { id: 'fast'   as const, label: t.autoDrawSpeedFast },
                { id: 'normal' as const, label: t.autoDrawSpeedNormal },
                { id: 'slow'   as const, label: t.autoDrawSpeedSlow },
              ]).map(s => (
                <button
                  key={s.id}
                  onClick={() => setSpeed(s.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    speed === s.id ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => onStart({ goal, targetGrade, targetCount, speed })}
            disabled={!canStart}
            className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors active:scale-[0.98]"
          >
            {t.autoDrawStart}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AutoDrawResultModal ─────────────────────────────────────────────────────

export function AutoDrawResultModal({ result, product, onClose, onReset }: {
  result: AutoResult
  product: KujiProduct
  onClose: () => void
  onReset: () => void
}) {
  const { t, locale } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const tally = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of result.draws) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [result.draws])

  const totalCost = product.price_yen != null ? result.draws.length * product.price_yen : null
  const maxCount = Math.max(...tally.map(([, c]) => c), 1)

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.82)' }}
    >
      <div className={`w-full sm:max-w-sm bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-700 overflow-hidden transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-8'}`}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">{t.autoDrawResultTitle}</h2>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${result.goalMet ? 'bg-green-500/10 border-green-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
            <span className="text-2xl">{result.goalMet ? '🎉' : '💨'}</span>
            <div>
              <p className={`text-sm font-bold ${result.goalMet ? 'text-green-400' : 'text-zinc-400'}`}>
                {result.goalMet ? t.autoDrawResultGoalMet : t.autoDrawResultNoMore}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {fmt(t.autoDrawResultTotal, { count: result.draws.length })}
                {totalCost != null && (
                  <> · <span className="text-amber-400 font-bold">¥{totalCost.toLocaleString('ja-JP')}</span></>
                )}
              </p>
            </div>
          </div>

          {tally.length > 0 && (
            <div className="space-y-2">
              {tally.map(([grade, count]) => {
                const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
                const letter = getGradeLetter(grade)
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 w-14 text-center ${style.badge}`}>
                      {letter}賞
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%`, background: style.glow }}
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums text-white w-6 text-right flex-shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm font-medium transition-colors"
          >
            {t.autoDrawClose}
          </button>
          <button
            onClick={() => { onClose(); onReset() }}
            className="flex-1 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
          >
            {t.simulatorDrawAgain}
          </button>
        </div>
      </div>
    </div>
  )
}
