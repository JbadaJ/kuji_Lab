'use client'

import { useState, useMemo } from 'react'
import type { KujiProduct, Prize } from '@/types/kuji'
import { getPrizeGrade } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt } from '@/lib/i18n'
import type { SimulatorConfig } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'
import { getGradeCounts, buildShareUrl } from './core'
import { getGradeLetter } from '@/lib/utils'

export default function SetupScreen({ product, prizes, onStart, onClose, initialConfig }: {
  product: KujiProduct
  prizes: Prize[]
  onStart: (config: SimulatorConfig) => void
  onClose: () => void
  initialConfig?: SimulatorConfig
}) {
  const { t } = useLanguage()
  const [mode, setMode] = useState<SimulatorConfig['mode']>(initialConfig?.mode ?? 'default')
  const [preDrawn, setPreDrawn] = useState<Record<string, number>>(initialConfig?.preDrawn ?? {})
  const [limitEnabled, setLimitEnabled] = useState(initialConfig?.drawLimit !== null && initialConfig?.drawLimit !== undefined)
  const [drawLimit, setDrawLimit] = useState(initialConfig?.drawLimit ?? 10)
  const [copied, setCopied] = useState(false)

  const gradeCounts = useMemo(() => getGradeCounts(prizes), [prizes])
  const totalPool = useMemo(() => gradeCounts.reduce((s, g) => s + g.total, 0), [gradeCounts])
  const hasRealCounts = useMemo(() => prizes.filter(p => getPrizeGrade(p) !== 'ラストワン賞').every(p => (p.count ?? 0) > 0), [prizes])

  const totalPreDrawn = mode === 'custom'
    ? gradeCounts.reduce((s, g) => s + (preDrawn[g.grade] ?? 0), 0)
    : 0
  const remaining = totalPool - totalPreDrawn
  const actualDraws = limitEnabled ? Math.min(drawLimit, remaining) : remaining
  const estimatedCost = product.price_yen ? actualDraws * product.price_yen : null

  function setGradeCount(grade: string, val: number, max: number) {
    setPreDrawn(prev => ({ ...prev, [grade]: Math.max(0, Math.min(max, val)) }))
  }

  function applyPreset(ratio: number) {
    const next: Record<string, number> = {}
    for (const { grade, total } of gradeCounts) next[grade] = Math.round(total * ratio)
    setPreDrawn(next)
  }

  function handleStart() {
    let finalPreDrawn: Record<string, number> = {}
    if (mode === 'custom') {
      finalPreDrawn = { ...preDrawn }
    } else if (mode === 'random') {
      for (const { grade, total } of gradeCounts) {
        const r = Math.random() * Math.random()
        finalPreDrawn[grade] = Math.floor(r * (total + 1))
      }
    }
    onStart({ mode, preDrawn: finalPreDrawn, drawLimit: limitEnabled ? drawLimit : null })
  }

  function handleCopyUrl() {
    const url = buildShareUrl(product.slug, mode, mode === 'custom' ? preDrawn : {}, limitEnabled ? drawLimit : null)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const MODES: { id: SimulatorConfig['mode']; label: string; sub: string }[] = [
    { id: 'default', label: t.simulatorModeDefault, sub: t.simulatorModeDefaultSub },
    { id: 'random',  label: t.simulatorModeRandom,  sub: t.simulatorModeRandomSub },
    { id: 'custom',  label: t.simulatorModeCustom,  sub: t.simulatorModeCustomSub },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.simulatorSetupTitle}</p>
          <p className="text-sm font-semibold truncate">{product.title}</p>
        </div>
        {product.price_yen && (
          <span className="text-xs text-zinc-500 flex-shrink-0">{t.simulatorPerDraw} ¥{product.price_yen.toLocaleString('ja-JP')}</span>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          {/* Mode cards */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{t.simulatorStartMode}</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all text-center ${
                    mode === m.id
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className="text-[10px] text-zinc-400 leading-tight">{m.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Random description */}
          {mode === 'random' && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
              <p className="text-sm text-zinc-400 leading-relaxed">
                {t.simulatorRandomDesc}
              </p>
            </div>
          )}

          {/* Custom: grade table */}
          {mode === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.simulatorPreDrawnLabel}</p>
                <div className="flex gap-1">
                  {([[t.simulatorPresetClear, 0], ['25%', 0.25], ['50%', 0.5], ['75%', 0.75]] as [string, number][]).map(([label, ratio]) => (
                    <button
                      key={label}
                      onClick={() => applyPreset(ratio)}
                      className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden divide-y divide-zinc-800/70">
                {gradeCounts.map(({ prize, grade, total }) => {
                  const count = preDrawn[grade] ?? 0
                  const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
                  return (
                    <div key={grade} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`text-xs font-black w-6 text-center flex-shrink-0 ${style.badge.includes('text-') ? '' : 'text-white'} ${style.badge} px-1.5 py-0.5 rounded-full`}>
                        {getGradeLetter(grade)}
                      </span>
                      <span className="text-xs text-zinc-400 truncate flex-1 min-w-0">{prize.name}</span>
                      <span className="text-[10px] text-zinc-600 flex-shrink-0 tabular-nums">{total} {t.simulatorOf}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setGradeCount(grade, count - 1, total)}
                          disabled={count === 0}
                          className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 flex items-center justify-center text-zinc-200 font-bold text-sm transition-colors"
                        >−</button>
                        <span className={`w-6 text-center text-sm font-bold tabular-nums ${count > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>
                          {count}
                        </span>
                        <button
                          onClick={() => setGradeCount(grade, count + 1, total)}
                          disabled={count === total}
                          className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 flex items-center justify-center text-zinc-200 font-bold text-sm transition-colors"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPreDrawn > 0 && (
                <p className="text-xs text-zinc-500 text-center">
                  {fmt(t.simulatorPreDrawnSummary, { drawn: totalPreDrawn, remaining })}
                </p>
              )}
            </div>
          )}

          {/* Draw limit */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.simulatorDrawLimitSection}</p>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.simulatorDrawLimitToggle}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.simulatorDrawLimitDesc}</p>
                </div>
                <button
                  onClick={() => setLimitEnabled(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${limitEnabled ? 'bg-orange-500' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${limitEnabled ? 'left-[22px]' : 'left-1'}`} />
                </button>
              </div>

              {limitEnabled && (
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                  <span className="text-sm text-zinc-400">{t.simulatorDrawsLabel}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setDrawLimit(v => Math.max(1, v - 1))}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 font-bold"
                    >−</button>
                    <input
                      type="number"
                      value={drawLimit}
                      min={1}
                      onChange={e => setDrawLimit(Math.max(1, Math.min(remaining || 1, Number(e.target.value) || 1)))}
                      className="w-14 text-center bg-zinc-800 rounded-lg py-1 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => setDrawLimit(v => Math.min(remaining || v + 1, v + 1))}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 font-bold"
                    >+</button>
                    {t.simulatorDrawUnit && <span className="text-sm text-zinc-500">{t.simulatorDrawUnit}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950 flex-shrink-0">
        <div className="max-w-lg mx-auto space-y-2.5">
          {/* Preview stats */}
          <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
            <span className="text-zinc-500">
              {fmt(t.simulatorTicketsRemaining, { count: remaining })}
            </span>
            {limitEnabled && remaining > 0 && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">
                  {fmt(t.simulatorSessionDrawsCount, { count: Math.min(drawLimit, remaining) })}
                </span>
              </>
            )}
            {estimatedCost !== null && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">
                  {t.simulatorEstimatedCost} <span className="text-amber-400 font-bold tabular-nums">¥{estimatedCost.toLocaleString('ja-JP')}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {hasRealCounts ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {t.simulatorRealData}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
                {t.simulatorEstimatedData}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={remaining === 0}
              className="flex-1 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors shadow-lg active:scale-[0.98]"
            >
              {remaining === 0 ? t.simulatorNoTickets : t.simulatorStart}
            </button>
            <button
              onClick={handleCopyUrl}
              title={t.simulatorShareButton}
              className={`px-4 py-3.5 rounded-full border font-bold text-sm transition-colors flex-shrink-0 ${
                copied
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              {copied ? (
                t.simulatorShareCopied
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
