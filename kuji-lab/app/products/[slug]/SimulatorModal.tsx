'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { KujiProduct, Prize } from '@/types/kuji'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt, translateGrade } from '@/lib/i18n'

// ── Types & helpers ───────────────────────────────────────────────────────────

interface Ticket {
  id: number
  prize: Prize
  grade: string
  drawn: boolean
  preset: boolean   // true = pre-drawn via setup config
}

interface SparkleData {
  id: number
  x: number; y: number
  tx: number; ty: number
  color: string
  size: number
  delay: number
  rotate: boolean
}

function getPrizeGrade(prize: Prize): string {
  if (prize.grade) return prize.grade
  const m = prize.full_name.match(/^([A-Z]賞|ラストワン賞)/)
  return m ? m[1] : ''
}

function getGradeLetter(grade: string): string {
  const m = grade.match(/^([A-Z])賞$/)
  if (m) return m[1]
  if (grade === 'ラストワン賞') return '★'
  return '?'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface SimulatorConfig {
  mode: 'default' | 'random' | 'custom'
  preDrawn: Record<string, number>   // grade → already-drawn count
  drawLimit: number | null           // null = unlimited
}

function buildPool(prizes: Prize[]): { regular: Prize[]; factor: number; hasRealCounts: boolean } {
  const regular = prizes.filter(p => getPrizeGrade(p) !== 'ラストワン賞')
  const hasRealCounts = regular.length > 0 && regular.every(p => (p.count ?? 0) > 0)
  if (hasRealCounts) {
    return { regular, factor: 1, hasRealCounts: true }
  }
  const totalWeight = regular.reduce((s, _, i) => s + i + 1, 0)
  const factor = totalWeight > 0 ? Math.max(1, Math.round(80 / totalWeight)) : 1
  return { regular, factor, hasRealCounts: false }
}

function getGradeCounts(prizes: Prize[]): Array<{ prize: Prize; grade: string; total: number }> {
  const { regular, factor, hasRealCounts } = buildPool(prizes)
  return regular.map((prize, i) => ({
    prize,
    grade: getPrizeGrade(prize),
    total: hasRealCounts ? (prize.count ?? 1) : (i + 1) * factor,
  }))
}

function buildTickets(prizes: Prize[], preDrawn: Record<string, number> = {}): Ticket[] {
  const { regular, factor, hasRealCounts } = buildPool(prizes)
  const pool: Prize[] = []
  regular.forEach((p, i) => {
    const ticketCount = hasRealCounts ? (p.count ?? 1) : (i + 1) * factor
    for (let j = 0; j < ticketCount; j++) pool.push(p)
  })
  const gradeRemaining = { ...preDrawn }
  return shuffle(pool).map((prize, id) => {
    const grade = getPrizeGrade(prize)
    const shouldBeDrawn = (gradeRemaining[grade] ?? 0) > 0
    if (shouldBeDrawn) gradeRemaining[grade]--
    return { id, prize, grade, drawn: shouldBeDrawn, preset: shouldBeDrawn }
  })
}

// ── Grade styles ──────────────────────────────────────────────────────────────

const GRADE_STYLE: Record<string, { badge: string; border: string; glow: string }> = {
  'A賞':          { badge: 'bg-yellow-400 text-yellow-900', border: 'border-yellow-400', glow: '#fbbf24' },
  'B賞':          { badge: 'bg-sky-500 text-white',         border: 'border-sky-500',     glow: '#38bdf8' },
  'C賞':          { badge: 'bg-emerald-500 text-white',     border: 'border-emerald-500', glow: '#34d399' },
  'D賞':          { badge: 'bg-orange-400 text-white',      border: 'border-orange-400',  glow: '#fb923c' },
  'E賞':          { badge: 'bg-pink-500 text-white',        border: 'border-pink-500',    glow: '#f472b6' },
  'F賞':          { badge: 'bg-violet-500 text-white',      border: 'border-violet-500',  glow: '#a78bfa' },
  'G賞':          { badge: 'bg-red-500 text-white',         border: 'border-red-500',     glow: '#f87171' },
  'H賞':          { badge: 'bg-teal-500 text-white',        border: 'border-teal-500',    glow: '#2dd4bf' },
  'I賞':          { badge: 'bg-indigo-500 text-white',      border: 'border-indigo-500',  glow: '#818cf8' },
  'ラストワン賞': { badge: 'bg-amber-500 text-white',       border: 'border-amber-400',   glow: '#f59e0b' },
}
const DEFAULT_STYLE = { badge: 'bg-zinc-500 text-white', border: 'border-zinc-500', glow: '#888' }

// ── Sparkle helpers ───────────────────────────────────────────────────────────

const SPARKLE_COLORS: Record<string, string[]> = {
  'A賞':          ['#fbbf24', '#fcd34d', '#fef08a', '#fff'],
  'B賞':          ['#38bdf8', '#7dd3fc', '#bae6fd'],
  'C賞':          ['#34d399', '#6ee7b7', '#a7f3d0'],
  'D賞':          ['#fb923c', '#fca5a1', '#fed7aa'],
  'E賞':          ['#f472b6', '#f9a8d4', '#fce7f3'],
  'F賞':          ['#a78bfa', '#c4b5fd', '#ddd6fe'],
  'G賞':          ['#f87171', '#fca5a5', '#fee2e2'],
  'H賞':          ['#2dd4bf', '#5eead4', '#99f6e4'],
  'I賞':          ['#818cf8', '#a5b4fc', '#c7d2fe'],
  'ラストワン賞': ['#fbbf24', '#f472b6', '#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#fff'],
}

function generateSparkles(grade: string): SparkleData[] {
  const isHighTier = grade === 'A賞' || grade === 'ラストワン賞'
  const count = isHighTier ? 28 : grade === 'B賞' || grade === 'C賞' ? 18 : 12
  const colors = SPARKLE_COLORS[grade] ?? ['#fff', '#aaa']
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI * 2
    const dist = 80 + Math.random() * 140
    return {
      id,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: isHighTier ? 5 + Math.random() * 10 : 4 + Math.random() * 7,
      delay: Math.random() * 0.35,
      rotate: Math.random() > 0.5,
    }
  })
}

// ── SetupScreen ───────────────────────────────────────────────────────────────

function SetupScreen({ product, prizes, onStart, onClose }: {
  product: KujiProduct
  prizes: Prize[]
  onStart: (config: SimulatorConfig) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<SimulatorConfig['mode']>('default')
  const [preDrawn, setPreDrawn] = useState<Record<string, number>>({})
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [drawLimit, setDrawLimit] = useState(10)

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
        // 낮은 쪽으로 가중 — 너무 많이 뽑힌 상태 방지
        const r = Math.random() * Math.random()
        finalPreDrawn[grade] = Math.floor(r * (total + 1))
      }
    }
    onStart({ mode, preDrawn: finalPreDrawn, drawLimit: limitEnabled ? drawLimit : null })
  }

  const MODES: { id: SimulatorConfig['mode']; label: string; sub: string }[] = [
    { id: 'default', label: '기본',     sub: '전체 티켓으로 처음부터' },
    { id: 'random',  label: '랜덤',     sub: '이미 뽑힌 수 무작위' },
    { id: 'custom',  label: '상세 설정', sub: '등급별 직접 설정' },
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
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">뽑기 설정</p>
          <p className="text-sm font-semibold truncate">{product.title}</p>
        </div>
        {product.price_yen && (
          <span className="text-xs text-zinc-500 flex-shrink-0">1회 ¥{product.price_yen.toLocaleString('ja-JP')}</span>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          {/* Mode cards */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">시작 방식</p>
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
                시작 시 각 등급의 티켓 일부가 이미 뽑혀있는 상태로 시작합니다. 뽑을수록 희귀 상품 확률이 올라가는 상황을 시뮬레이션합니다.
              </p>
            </div>
          )}

          {/* Custom: grade table */}
          {mode === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">등급별 이미 뽑힌 수</p>
                <div className="flex gap-1">
                  {([['초기화', 0], ['25%', 0.25], ['50%', 0.5], ['75%', 0.75]] as [string, number][]).map(([label, ratio]) => (
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
                      <span className="text-[10px] text-zinc-600 flex-shrink-0 tabular-nums">{total}장 중</span>
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
                  {totalPreDrawn}장 이미 뽑힘 → 남은 티켓 <span className="text-white font-semibold">{remaining}</span>장
                </p>
              )}
            </div>
          )}

          {/* Draw limit */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">이번 세션 뽑기 횟수</p>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">횟수 제한</p>
                  <p className="text-xs text-zinc-500 mt-0.5">설정한 횟수만큼만 뽑고 자동 종료</p>
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
                  <span className="text-sm text-zinc-400">뽑을 횟수</span>
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
                    <span className="text-sm text-zinc-500">회</span>
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
              남은 티켓 <span className="text-white font-bold tabular-nums">{remaining}</span>장
            </span>
            {limitEnabled && remaining > 0 && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">
                  이번 세션 <span className="text-orange-400 font-bold tabular-nums">{Math.min(drawLimit, remaining)}</span>회
                </span>
              </>
            )}
            {estimatedCost !== null && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">
                  예상 비용 <span className="text-amber-400 font-bold tabular-nums">¥{estimatedCost.toLocaleString('ja-JP')}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {hasRealCounts ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                실제 구성 데이터 반영
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
                추정 구성 (kujimap 데이터 미등록)
              </span>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={remaining === 0}
            className="w-full py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors shadow-lg active:scale-[0.98]"
          >
            {remaining === 0 ? '뽑을 티켓이 없습니다' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TicketFront (reusable orange ticket face) ─────────────────────────────────

function TicketFront({ small = false }: { small?: boolean }) {
  const logoSize = small ? 36 : 80
  const inset = small ? 6 : 14
  return (
    <>
      {/* Top barcode */}
      <div className="absolute left-[6px] right-[6px] flex gap-[1.5px]" style={{ top: small ? 5 : 10, height: small ? 4 : 8 }}>
        {[2,1,3,1,1,2,1,3,1,2,1,1,3,1,2].map((w, i) => (
          <div key={i} style={{ flex: w }} className="bg-white/70 rounded-[1px]" />
        ))}
      </div>

      {/* Diamond logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: logoSize, height: logoSize, position: 'relative', flexShrink: 0 }}>
          <div className="absolute inset-0 bg-white rounded-[4px] shadow-sm" style={{ transform: 'rotate(45deg)' }} />
          <div
            className="absolute bg-blue-900 rounded-[3px] flex items-center justify-center"
            style={{ inset, transform: 'rotate(45deg)' }}
          >
            <span
              className="text-white font-black select-none text-center leading-[1.2]"
              style={{ fontSize: small ? 5 : 11, transform: 'rotate(-45deg)' }}
            >
              一番<br />くじ
            </span>
          </div>
        </div>
      </div>

      {/* Bottom barcode */}
      <div className="absolute left-[6px] right-[6px] flex gap-[1.5px]" style={{ bottom: small ? 5 : 10, height: small ? 4 : 8 }}>
        {[1,3,1,2,1,1,3,1,2,1,3,1,1,2,1].map((w, i) => (
          <div key={i} style={{ flex: w }} className="bg-white/70 rounded-[1px]" />
        ))}
      </div>
    </>
  )
}

// ── TicketCard (board tile) ───────────────────────────────────────────────────

function TicketCard({ ticket, onReveal }: { ticket: Ticket; onReveal: (t: Ticket) => void }) {
  // 프리셋으로 이미 뽑혀있던 티켓인지 마운트 시점에 기록
  const isPreset = useRef(ticket.drawn)
  const [flipped, setFlipped] = useState(ticket.drawn)
  const wasDrawn = useRef(ticket.drawn)

  useEffect(() => {
    if (ticket.drawn && !wasDrawn.current) {
      wasDrawn.current = true
      const t = setTimeout(() => setFlipped(true), 30)
      return () => clearTimeout(t)
    }
  }, [ticket.drawn])

  const style = GRADE_STYLE[ticket.grade] ?? DEFAULT_STYLE
  const letter = getGradeLetter(ticket.grade)

  return (
    <div style={{ perspective: '500px', aspectRatio: '3/2' }}>
      <div
        style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          opacity: 1,
        } as React.CSSProperties}
      >
        {/* Front: orange ticket */}
        <button
          onClick={() => !ticket.drawn && onReveal(ticket)}
          disabled={ticket.drawn}
          className="absolute inset-0 w-full h-full rounded-lg overflow-hidden bg-orange-500 shadow-md enabled:hover:bg-orange-400 enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:scale-95 transition-all duration-100 cursor-pointer disabled:cursor-default"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <TicketFront small />
        </button>

        {/* Back: grade letter */}
        <div
          className="absolute inset-0 rounded-lg flex flex-col items-center justify-center gap-1 shadow-md bg-black border-2 border-orange-500/60"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="font-black text-2xl sm:text-3xl leading-none select-none text-white">
            {letter}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── RevealOverlay ─────────────────────────────────────────────────────────────

function RevealOverlay({ ticket, onComplete }: { ticket: Ticket; onComplete: () => void }) {
  const { t, locale } = useLanguage()
  const [phase, setPhase] = useState<'sealed' | 'revealed'>('sealed')
  const [dragProgress, setDragProgress] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const [sparkles, setSparkles] = useState<SparkleData[]>([])

  const isDragging = useRef(false)
  const startX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const style = GRADE_STYLE[ticket.grade] ?? DEFAULT_STYLE
  const gradeLabel = translateGrade(ticket.grade, locale as 'ko' | 'ja' | 'en')
  const isHighTier = ticket.grade === 'A賞' || ticket.grade === 'ラストワン賞'
  const isLastOne = ticket.grade === 'ラストワン賞'

  const triggerReveal = useCallback(() => {
    isDragging.current = false
    setIsSnapping(true)
    setDragProgress(1)
    setTimeout(() => {
      setPhase('revealed')
      setSparkles(generateSparkles(ticket.grade))
    }, 320)
  }, [ticket.grade])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === 'revealed') return
    isDragging.current = true
    startX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || phase === 'revealed') return
    const delta = e.clientX - startX.current
    const cardW = cardRef.current?.offsetWidth ?? 320
    const progress = Math.max(0, Math.min(1, delta / (cardW * 0.65)))
    if (progress >= 1) { triggerReveal(); return }
    setDragProgress(progress)
  }

  const handlePointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    if (dragProgress >= 0.38) {
      triggerReveal()
    } else {
      setIsSnapping(true)
      setDragProgress(0)
      setTimeout(() => setIsSnapping(false), 300)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      {/* Grade glow behind card */}
      {phase === 'revealed' && (
        <div
          className="absolute rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{
            width: 400, height: 300,
            background: style.glow,
            animation: 'none',
          }}
        />
      )}

      {/* Card container */}
      <div
        ref={cardRef}
        className="relative select-none touch-none"
        style={{ width: 'min(85vw, 400px)', aspectRatio: '3/2', cursor: phase === 'sealed' ? 'grab' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── Prize back face (always present, revealed from left) ── */}
        <div
          className={`absolute inset-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 ${style.border} flex flex-col items-center justify-center gap-2 p-3 shadow-2xl ${isLastOne ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
        >
          {/* Shine sweep */}
          {phase === 'revealed' && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ zIndex: 3 }}>
              <div
                style={{
                  position: 'absolute', top: '-50%', width: '45%', height: '200%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                  transform: 'skewX(-15deg)',
                  animation: `kuji-shine ${isHighTier ? '1.4s' : '2.2s'} 0.25s ease-in-out ${isHighTier ? 'infinite' : '1'}`,
                }}
              />
            </div>
          )}

          {ticket.prize.images[0] ? (
            <div className="relative flex-1 w-full min-h-0" style={{ zIndex: 1 }}>
              <Image
                src={ticket.prize.images[0]}
                alt={ticket.prize.name}
                fill
                className="object-contain p-1"
                sizes="400px"
                priority
              />
            </div>
          ) : (
            <span className="text-5xl font-black text-zinc-300 flex-1 flex items-center" style={{ zIndex: 1 }}>
              {getGradeLetter(ticket.grade)}
            </span>
          )}

          <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ zIndex: 2 }}>
            <span className={`text-sm font-bold px-4 py-1 rounded-full ${style.badge}`}>
              {gradeLabel}
            </span>
            {phase === 'revealed' && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center line-clamp-1 max-w-[90%]">
                {ticket.prize.name}
              </p>
            )}
          </div>
        </div>

        {/* ── Orange ticket front (slides right on drag) ── */}
        {phase === 'sealed' && (
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-orange-500 shadow-2xl"
            style={{
              transform: `translateX(${dragProgress * 100}%)`,
              transition: isSnapping ? 'transform 0.3s ease-out' : 'none',
              zIndex: 2,
            }}
          >
            <TicketFront />
          </div>
        )}

        {/* ── Sparkle particles ── */}
        {sparkles.map(sp => (
          <div
            key={sp.id}
            style={{
              position: 'absolute',
              left: `${sp.x}%`, top: `${sp.y}%`,
              width: sp.size, height: sp.size,
              background: sp.color,
              borderRadius: sp.rotate ? '2px' : '50%',
              transform: 'scale(0)',
              animation: `kuji-sparkle 0.9s ${sp.delay}s ease-out forwards`,
              '--tx': `${sp.tx}px`,
              '--ty': `${sp.ty}px`,
              zIndex: 10,
              pointerEvents: 'none',
              rotate: sp.rotate ? '45deg' : undefined,
            } as React.CSSProperties}
          />
        ))}

        {/* ── Grade flash ── */}
        {phase === 'revealed' && (
          <div
            className={`absolute inset-0 rounded-2xl pointer-events-none`}
            style={{
              background: style.glow,
              opacity: 0,
              animation: 'kuji-flash 0.55s ease-out forwards',
              zIndex: 5,
            }}
          />
        )}
      </div>

      {/* Drag hint */}
      {phase === 'sealed' && (
        <div className="mt-8 flex items-center gap-2 text-white/50 text-sm animate-pulse select-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t.simulatorPullHint}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* Confirm button */}
      {phase === 'revealed' && (
        <button
          onClick={onComplete}
          className="mt-8 px-10 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-colors"
        >
          {t.simulatorConfirm}
        </button>
      )}
    </div>
  )
}

// ── Result Toast ──────────────────────────────────────────────────────────────

function ResultToast({ prize, locale, onClose }: { prize: Prize; locale: string; onClose: () => void }) {
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

// ── Drawn panel ───────────────────────────────────────────────────────────────

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

function DrawnPanel({ drawn, locale }: { drawn: Ticket[]; locale: string }) {
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

  const myLabel    = locale === 'ko' ? '내가 뽑은 결과' : locale === 'en' ? 'My draws'   : '引いた結果'
  const preLabel   = locale === 'ko' ? '기존 뽑힌 결과' : locale === 'en' ? 'Pre-drawn'  : '設定済み'

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">

      {/* ── Section A: My session draws ── */}
      <div className="flex flex-col gap-2 flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
            {myLabel} <span className="text-orange-400 font-black">({sessionDrawn.length})</span>
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
          {sessionDrawn.length === 0 && <span className="text-xs text-zinc-500 italic">아직 없음</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-1 min-h-0 border-b border-zinc-700/60 pb-3">
        {[...sessionDrawn].reverse().map((tk, i) => (
          <DrawnTicketRow key={tk.id} tk={tk} index={sessionDrawn.length - i} />
        ))}
      </div>

      {/* ── Section B: Preset (pre-drawn) ── */}
      <div className={`flex flex-col gap-2 flex-shrink-0 pt-3 ${presetDrawn.length === 0 ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
            {preLabel} <span className="text-zinc-400 font-black">({presetDrawn.length})</span>
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
          <span className="text-xs text-zinc-600 italic">설정에서 뽑힌 티켓 없음</span>
        )}
      </div>
    </div>
  )
}

// ── LastOne Overlay ───────────────────────────────────────────────────────────

function LastOneOverlay({ prize, locale, onClose }: { prize: Prize; locale: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  const [sparkles, setSparkles] = useState<SparkleData[]>([])
  const style = GRADE_STYLE['ラストワン賞']
  const gradeLabel = translateGrade('ラストワン賞', locale as 'ko' | 'ja' | 'en')

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setVisible(true)
      setSparkles(generateSparkles('ラストワン賞'))
    })
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      {/* Glow */}
      <div
        className="absolute rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ width: 500, height: 400, background: '#f59e0b' }}
      />

      {/* Banner */}
      <div
        className={`mb-6 px-6 py-2 rounded-full bg-amber-500 text-white font-black text-lg tracking-widest shadow-xl transition-all duration-700 ${visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        style={{ letterSpacing: '0.15em' }}
      >
        LAST ONE !
      </div>

      {/* Card */}
      <div
        className={`relative select-none transition-all duration-700 ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-8'}`}
        style={{ width: 'min(85vw, 380px)', aspectRatio: '3/2' }}
      >
        <div className={`absolute inset-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 ${style.border} ring-4 ring-yellow-400 ring-offset-2 ring-offset-black flex flex-col items-center justify-center gap-2 p-3 shadow-2xl`}>
          {/* Shine */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ zIndex: 3 }}>
            <div
              style={{
                position: 'absolute', top: '-50%', width: '45%', height: '200%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                transform: 'skewX(-15deg)',
                animation: 'kuji-shine 1.4s 0.4s ease-in-out infinite',
              }}
            />
          </div>

          {prize.images[0] ? (
            <div className="relative flex-1 w-full min-h-0" style={{ zIndex: 1 }}>
              <Image src={prize.images[0]} alt={prize.name} fill className="object-contain p-1" sizes="380px" priority />
            </div>
          ) : (
            <span className="text-5xl font-black text-amber-400 flex-1 flex items-center" style={{ zIndex: 1 }}>★</span>
          )}

          <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ zIndex: 2 }}>
            <span className={`text-sm font-bold px-4 py-1 rounded-full ${style.badge}`}>{gradeLabel}</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center line-clamp-1 max-w-[90%]">{prize.name}</p>
          </div>
        </div>

        {/* Sparkles */}
        {sparkles.map(sp => (
          <div
            key={sp.id}
            style={{
              position: 'absolute',
              left: `${sp.x}%`, top: `${sp.y}%`,
              width: sp.size, height: sp.size,
              background: sp.color,
              borderRadius: sp.rotate ? '2px' : '50%',
              transform: 'scale(0)',
              animation: `kuji-sparkle 0.9s ${sp.delay}s ease-out forwards`,
              '--tx': `${sp.tx}px`,
              '--ty': `${sp.ty}px`,
              zIndex: 10,
              pointerEvents: 'none',
              rotate: sp.rotate ? '45deg' : undefined,
            } as React.CSSProperties}
          />
        ))}

        {/* Flash */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: '#f59e0b', opacity: 0, animation: 'kuji-flash 0.55s ease-out forwards', zIndex: 5 }}
        />
      </div>

      {/* Subtitle */}
      <p className={`mt-4 text-sm text-amber-300/80 text-center transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        마지막 1장을 뽑은 행운의 주인공!
      </p>

      <button
        onClick={onClose}
        className={`mt-6 px-10 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        확인
      </button>
    </div>
  )
}

// ── Main SimulatorModal ───────────────────────────────────────────────────────

export default function SimulatorModal({ product, prizes, onClose }: {
  product: KujiProduct
  prizes: Prize[]
  onClose: () => void
}) {
  const { t, locale } = useLanguage()
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [config, setConfig] = useState<SimulatorConfig>({ mode: 'default', preDrawn: {}, drawLimit: null })
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [resetCount, setResetCount] = useState(0)
  const [revealTicket, setRevealTicket] = useState<Ticket | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const [toastPrize, setToastPrize] = useState<Prize | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showLastOne, setShowLastOne] = useState(false)
  const [sessionDraws, setSessionDraws] = useState(0)

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
  const remaining = tickets.length - drawn.length
  const isFinished = remaining === 0
  const drawsLeft = config.drawLimit !== null ? config.drawLimit - sessionDraws : null
  const sessionDone = drawsLeft !== null && drawsLeft <= 0

  // 이번 세션에서 뽑은 장수 기준 비용 (setup에서 이미 뽑힌 것 제외)
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

  // Called when user picks a specific ticket (direct click or board click)
  const openReveal = useCallback((ticket: Ticket) => {
    if (ticket.drawn) return
    setRevealTicket(ticket)
  }, [])

  // Called after user confirms reveal overlay
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

  const reset = useCallback(() => {
    setTickets(buildTickets(prizes, config.preDrawn))
    setToastPrize(null)
    setRevealTicket(null)
    setShowLastOne(false)
    setSessionDraws(0)
    setResetCount(c => c + 1)
  }, [prizes, config.preDrawn])

  const cols = 7

  if (phase === 'setup') {
    return <SetupScreen product={product} prizes={prizes} onStart={handleSetupStart} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950">
      {/* Reveal overlay */}
      {revealTicket && (
        <RevealOverlay ticket={revealTicket} onComplete={handleRevealComplete} />
      )}

      {/* Last One bonus overlay */}
      {showLastOne && lastOnePrize && (
        <LastOneOverlay prize={lastOnePrize} locale={locale} onClose={() => setShowLastOne(false)} />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-200 truncate flex-1 min-w-0">{product.title}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-xs text-zinc-500 tabular-nums">{drawn.length} / {tickets.length}</span>
              {drawsLeft !== null && (
                <span className={`text-[10px] tabular-nums font-semibold ${drawsLeft <= 3 ? 'text-red-400' : 'text-orange-400'}`}>
                  세션 {drawsLeft}회 남음
                </span>
              )}
              {totalCost && (
                <span className="text-xs font-semibold text-amber-400 tabular-nums">¥{totalCost}</span>
              )}
            </div>
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
              설정
            </button>
            <button
              onClick={reset}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {t.simulatorReset}
            </button>
          </div>
        </div>

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

        {/* Footer */}
        {!isFinished && !sessionDone && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800">
            <button
              onClick={drawRandom}
              className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg"
            >
              {fmt(t.simulatorDrawRandom, { count: remaining })}
            </button>
          </div>
        )}

        {/* 세션 종료 */}
        {sessionDone && !isFinished && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800 flex flex-col items-center gap-2">
            <p className="text-sm text-zinc-400">
              설정한 <span className="text-white font-bold">{config.drawLimit}회</span> 완료
              {totalCost && <> · <span className="text-amber-400 font-bold">¥{totalCost}</span> 사용</>}
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setPhase('setup')}
                className="flex-1 py-2.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm font-medium transition-colors"
              >
                설정 변경
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
              >
                같은 설정으로 다시
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results side panel (desktop) */}
      <div className={`hidden sm:block flex-shrink-0 bg-zinc-900 border-l border-zinc-800 transition-all duration-300 overflow-hidden ${panelOpen ? 'w-72' : 'w-0'}`}>
        <div className="p-4 h-full flex flex-col gap-3 overflow-hidden" style={{ width: 288 }}>
          <div className="flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-bold text-zinc-200">{t.simulatorResults}</h3>
            <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <DrawnPanel drawn={drawn} locale={locale} />
        </div>
      </div>

      {/* Results bottom sheet (mobile) */}
      {panelOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPanelOpen(false)}>
          <div
            className="bg-zinc-900 rounded-t-2xl border-t border-zinc-700 flex flex-col"
            style={{ maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
              <h3 className="text-sm font-bold text-zinc-200">{t.simulatorResults}</h3>
              <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-6 min-h-0">
              <DrawnPanel drawn={drawn} locale={locale} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
