'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { KujiProduct, Prize } from '@/types/kuji'
import { getPrizeGrade } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt } from '@/lib/i18n'
import { useDrawHistory } from '@/app/hooks/useDrawHistory'

import type { Ticket, SimulatorConfig, AutoDrawConfig, AutoDrawSpeed, AutoResult } from './simulator/types'
import { buildTickets } from './simulator/core'
import { getEffectProfile } from './simulator/effects'
import { playAutoDrawSound } from './simulator/sound'
import SoundControl from './simulator/SoundControl'
import SetupScreen from './simulator/SetupScreen'
import RevealOverlay from './simulator/RevealOverlay'
import { GradeStatusBar, GradeStatusPanel } from './simulator/GradeStatus'
import { TicketCard } from './simulator/TicketCard'
import { ResultToast, DrawnPanel, HistoryPanel } from './simulator/DrawPanels'
import { AutoDrawSetup, AutoDrawResultModal } from './simulator/AutoDraw'
import ProbabilityModal from './simulator/ProbabilityModal'
import LastOneOverlay from './simulator/LastOneOverlay'

export type { SimulatorConfig } from './simulator/types'

export default function SimulatorModal({ product, prizes, onClose, initialConfig }: {
  product: KujiProduct
  prizes: Prize[]
  onClose: () => void
  initialConfig?: SimulatorConfig
}) {
  const { t, locale } = useLanguage()
  const { sessions: drawHistory, addSession, clearHistory } = useDrawHistory()
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [config, setConfig] = useState<SimulatorConfig>({ mode: 'default', preDrawn: {}, drawLimit: null })
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [resetCount, setResetCount] = useState(0)
  const [revealTicket, setRevealTicket] = useState<Ticket | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const [toastPrize, setToastPrize] = useState<Prize | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'status' | 'results' | 'history'>('status')
  const [showProbability, setShowProbability] = useState(false)
  const [showLastOne, setShowLastOne] = useState(false)
  const [sessionDraws, setSessionDraws] = useState(0)
  const [showAutoSetup,  setShowAutoSetup]  = useState(false)
  const [autoDrawing,    setAutoDrawing]    = useState(false)
  const [autoDrawCount,  setAutoDrawCount]  = useState(0)
  const [showAutoResult, setShowAutoResult] = useState(false)
  const [autoResult,     setAutoResult]     = useState<AutoResult | null>(null)
  const autoDrawActive = useRef(false)

  const lastOnePrize = useMemo(
    () => prizes.find(p => getPrizeGrade(p) === 'ラストワン賞') ?? null,
    [prizes]
  )

  function handleSetupStart(cfg: SimulatorConfig) {
    setConfig(cfg)
    setTickets(buildTickets(prizes, cfg.preDrawn))
    setSessionDraws(0)
    setShowLastOne(false)
    setToastPrize(null)
    setRevealTicket(null)
    setResetCount(c => c + 1)
    setPhase('playing')
  }

  const drawn = useMemo(() => tickets.filter(tk => tk.drawn), [tickets])

  const gradeTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of tickets) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return map
  }, [tickets])
  const remaining = tickets.length - drawn.length
  const isFinished = remaining === 0
  const drawsLeft = config.drawLimit !== null ? config.drawLimit - sessionDraws : null
  const sessionDone = drawsLeft !== null && drawsLeft <= 0

  const totalCost = product.price_yen != null && sessionDraws > 0
    ? (sessionDraws * product.price_yen).toLocaleString('ja-JP')
    : null

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (revealTicket) setRevealTicket(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, revealTicket])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const openReveal = useCallback((ticket: Ticket) => {
    if (ticket.drawn) return
    setRevealTicket(ticket)
  }, [])

  const handleRevealComplete = useCallback(() => {
    if (!revealTicket) return
    const newTickets = tickets.map(tk => tk.id === revealTicket.id ? { ...tk, drawn: true } : tk)
    const nowRemaining = newTickets.filter(tk => !tk.drawn).length
    setTickets(newTickets)
    setToastPrize(revealTicket.prize)
    setToastKey(k => k + 1)
    setRevealTicket(null)
    setSessionDraws(n => n + 1)
    if (nowRemaining === 0 && lastOnePrize) {
      setShowLastOne(true)
    }
  }, [revealTicket, tickets, lastOnePrize])

  const drawRandom = useCallback(() => {
    const undrawn = tickets.filter(tk => !tk.drawn)
    if (undrawn.length === 0) return
    const pick = undrawn[Math.floor(Math.random() * undrawn.length)]
    openReveal(pick)
  }, [tickets, openReveal])

  const saveCurrentSession = useCallback((currentTickets: Ticket[]) => {
    const sessionDrawnTickets = currentTickets.filter(tk => tk.drawn && !tk.preset)
    if (sessionDrawnTickets.length === 0) return
    const tally: Record<string, number> = {}
    for (const tk of sessionDrawnTickets) {
      tally[tk.grade] = (tally[tk.grade] ?? 0) + 1
    }
    addSession({
      id: `${Date.now()}`,
      slug: product.slug,
      title: product.title,
      date: new Date().toISOString(),
      totalDraws: sessionDrawnTickets.length,
      priceYen: product.price_yen,
      tally,
      finished: currentTickets.filter(tk => !tk.drawn).length === 0,
    })
  }, [addSession, product])

  const reset = useCallback(() => {
    saveCurrentSession(tickets)
    autoDrawActive.current = false
    setAutoDrawing(false)
    setTickets(buildTickets(prizes, config.preDrawn))
    setToastPrize(null)
    setRevealTicket(null)
    setShowLastOne(false)
    setSessionDraws(0)
    setResetCount(c => c + 1)
  }, [prizes, config.preDrawn, tickets, saveCurrentSession])

  const handleClose = useCallback(() => {
    if (phase === 'playing') saveCurrentSession(tickets)
    onClose()
  }, [phase, tickets, saveCurrentSession, onClose])

  const startAutoDraw = useCallback((cfg: AutoDrawConfig) => {
    setShowAutoSetup(false)
    setAutoDrawing(true)
    setAutoDrawCount(0)
    autoDrawActive.current = true

    const speedMs: Record<AutoDrawSpeed, number> = { fast: 70, normal: 220, slow: 500 }
    const delay = speedMs[cfg.speed]
    const drawnList: Ticket[] = []

    function tick(rem: Ticket[]) {
      if (!autoDrawActive.current) return

      const goalMet =
        (cfg.goal === 'grade' && drawnList.some(tk => tk.grade === cfg.targetGrade)) ||
        (cfg.goal === 'count' && drawnList.length >= cfg.targetCount) ||
        (cfg.goal === 'all'   && rem.length === 0)

      if (goalMet || rem.length === 0) {
        autoDrawActive.current = false
        setAutoDrawing(false)
        setAutoResult({ draws: [...drawnList], goalMet })
        setShowAutoResult(true)
        return
      }

      const idx  = Math.floor(Math.random() * rem.length)
      const pick = rem[idx]
      const next = rem.filter((_, i) => i !== idx)

      drawnList.push(pick)
      setTickets(prev => prev.map(tk => tk.id === pick.id ? { ...tk, drawn: true } : tk))
      setSessionDraws(n => n + 1)
      setAutoDrawCount(drawnList.length)
      // 연속 뽑기 중에는 짧은 틱만, 티어 2 이상만 풀 사운드
      playAutoDrawSound(getEffectProfile(pick.grade, gradeTotals.get(pick.grade) ?? 0, pick.prize))

      setTimeout(() => tick(next), delay)
    }

    tick(tickets.filter(tk => !tk.drawn))
  }, [tickets, gradeTotals])

  const cancelAutoDraw = useCallback(() => {
    autoDrawActive.current = false
    setAutoDrawing(false)
  }, [])

  const cols = 7

  if (phase === 'setup') {
    return <SetupScreen product={product} prizes={prizes} onStart={handleSetupStart} onClose={onClose} initialConfig={initialConfig} />
  }

  // ── Panel tabs (shared between desktop sidebar and mobile bottom sheet) ──
  const panelTabs = (
    <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-lg">
      <button
        onClick={() => setPanelTab('status')}
        className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${panelTab === 'status' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        {t.simulatorStatusTab}
      </button>
      <button
        onClick={() => setPanelTab('results')}
        className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${panelTab === 'results' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        {t.simulatorResults}
      </button>
      <button
        onClick={() => setPanelTab('history')}
        className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${panelTab === 'history' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        {t.historyTab}
        {drawHistory.length > 0 && (
          <span className="ml-1 text-[9px] bg-orange-500 text-white rounded-full px-1">{drawHistory.length}</span>
        )}
      </button>
    </div>
  )

  const panelContent = panelTab === 'status'
    ? <GradeStatusPanel tickets={tickets} />
    : panelTab === 'results'
    ? <DrawnPanel drawn={drawn} locale={locale} />
    : <HistoryPanel sessions={drawHistory} onClear={clearHistory} locale={locale} />

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950">
      {revealTicket && (
        <RevealOverlay
          ticket={revealTicket}
          onComplete={handleRevealComplete}
          totalForGrade={gradeTotals.get(revealTicket.grade) ?? 0}
        />
      )}

      {showProbability && (
        <ProbabilityModal tickets={tickets} onClose={() => setShowProbability(false)} />
      )}

      {showAutoSetup && (
        <AutoDrawSetup
          tickets={tickets}
          product={product}
          onStart={startAutoDraw}
          onClose={() => setShowAutoSetup(false)}
        />
      )}

      {showAutoResult && autoResult && (
        <AutoDrawResultModal
          result={autoResult}
          product={product}
          onClose={() => setShowAutoResult(false)}
          onReset={reset}
        />
      )}

      {showLastOne && lastOnePrize && (
        <LastOneOverlay prize={lastOnePrize} locale={locale} onClose={() => setShowLastOne(false)} />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-200 truncate flex-1 min-w-0">{product.title}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SoundControl />
            <div className="flex flex-col items-end leading-tight">
              <span className="text-xs text-zinc-500 tabular-nums">{drawn.length} / {tickets.length}</span>
              {drawsLeft !== null && (
                <span className={`text-[10px] tabular-nums font-semibold ${drawsLeft <= 3 ? 'text-red-400' : 'text-orange-400'}`}>
                  {fmt(t.simulatorSessionLeft, { count: drawsLeft })}
                </span>
              )}
              {totalCost && (
                <span className="text-xs font-semibold text-amber-400 tabular-nums">¥{totalCost}</span>
              )}
            </div>
            <button
              onClick={() => setShowProbability(true)}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {t.simulatorProbButton}
            </button>
            <button
              onClick={() => setPanelOpen(v => !v)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${panelOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
            >
              {t.simulatorResults}
            </button>
            <button
              onClick={() => setPhase('setup')}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {t.simulatorSetupButton}
            </button>
            <button
              onClick={reset}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {t.simulatorReset}
            </button>
          </div>
        </div>

        <GradeStatusBar tickets={tickets} />

        {/* Ticket board */}
        <div className="flex-1 relative overflow-hidden">
          {toastPrize && (
            <ResultToast key={toastKey} prize={toastPrize} locale={locale} onClose={() => setToastPrize(null)} />
          )}

          <div
            className="h-full overflow-y-auto"
            style={{
              background: '#1e3a8a',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div className="flex justify-center py-4 sm:py-5">
              <div
                className="grid gap-2 sm:gap-2.5"
                style={{ width: '80%', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {tickets.map(tk => (
                  <TicketCard key={`${resetCount}-${tk.id}`} ticket={tk} onReveal={openReveal} />
                ))}
              </div>
            </div>

            {isFinished && (
              <div className="flex flex-col items-center gap-4 py-10 px-4">
                <p className="text-white text-xl font-bold text-center">{t.simulatorFinished}</p>
                <button
                  onClick={reset}
                  className="px-8 py-3 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                >
                  {t.simulatorDrawAgain}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Auto Draw progress footer */}
        {autoDrawing && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-3">
            <div className="flex gap-1 flex-shrink-0">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-orange-500"
                  style={{ animation: `kuji-bounce 0.8s ${i * 0.15}s ease-in-out infinite` }}
                />
              ))}
            </div>
            <span className="flex-1 text-sm text-zinc-300 tabular-nums">
              {fmt(t.autoDrawProgress, { count: autoDrawCount })}
            </span>
            <button
              onClick={cancelAutoDraw}
              className="flex-shrink-0 px-4 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-400 text-sm font-medium transition-colors"
            >
              {t.autoDrawCancel}
            </button>
          </div>
        )}

        {/* Normal footer */}
        {!isFinished && !sessionDone && !autoDrawing && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800 space-y-2">
            <button
              onClick={drawRandom}
              className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg"
            >
              {fmt(t.simulatorDrawRandom, { count: remaining })}
            </button>
            <button
              onClick={() => setShowAutoSetup(true)}
              className="w-full py-2 rounded-full border border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.autoDrawButton}
            </button>
          </div>
        )}

        {/* Session done footer */}
        {sessionDone && !isFinished && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800 flex flex-col items-center gap-2">
            <p className="text-sm text-zinc-400">
              {fmt(t.simulatorSessionDone, { count: config.drawLimit ?? 0 })}
              {totalCost && <> · <span className="text-amber-400 font-bold">¥{totalCost}</span> {t.simulatorCostUsed}</>}
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setPhase('setup')}
                className="flex-1 py-2.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm font-medium transition-colors"
              >
                {t.simulatorChangeSetup}
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
              >
                {t.simulatorSameAgain}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results side panel (desktop) */}
      <div className={`hidden sm:block flex-shrink-0 bg-zinc-900 border-l border-zinc-800 transition-all duration-300 overflow-hidden ${panelOpen ? 'w-72' : 'w-0'}`}>
        <div className="p-4 h-full flex flex-col gap-3 overflow-hidden" style={{ width: 288 }}>
          <div className="flex items-center justify-between flex-shrink-0">
            {panelTabs}
            <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {panelContent}
        </div>
      </div>

      {/* Results bottom sheet (mobile) */}
      {panelOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPanelOpen(false)}>
          <div
            className="bg-zinc-900 rounded-t-2xl border-t border-zinc-700 flex flex-col"
            style={{ maxHeight: '75vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
              {panelTabs}
              <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-6 min-h-0 flex flex-col">
              {panelContent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
