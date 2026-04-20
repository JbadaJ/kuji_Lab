'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { KujiProduct, Prize } from '@/types/kuji'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt, translateGrade } from '@/lib/i18n'
import { useDrawHistory, type DrawSession } from '@/app/hooks/useDrawHistory'

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

export interface SimulatorConfig {
  mode: 'default' | 'random' | 'custom'
  preDrawn: Record<string, number>   // grade → already-drawn count
  drawLimit: number | null           // null = unlimited
}

function buildShareUrl(slug: string, mode: SimulatorConfig['mode'], preDrawn: Record<string, number>, drawLimit: number | null): string {
  const params = new URLSearchParams({ sim: '1' })
  if (mode !== 'default') params.set('mode', mode)
  const preStr = Object.entries(preDrawn)
    .filter(([, v]) => v > 0)
    .map(([grade, count]) => `${grade.replace('賞', '')}:${count}`)
    .join(',')
  if (preStr) params.set('pre', preStr)
  if (drawLimit !== null) params.set('limit', String(drawLimit))
  return `${window.location.origin}/products/${slug}?${params.toString()}`
}

type AutoDrawGoal  = 'grade' | 'all' | 'count'
type AutoDrawSpeed = 'fast' | 'normal' | 'slow'

interface AutoDrawConfig {
  goal: AutoDrawGoal
  targetGrade: string
  targetCount: number
  speed: AutoDrawSpeed
}

interface AutoResult {
  draws: Ticket[]
  goalMet: boolean
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

const RAINBOW_COLORS = ['#ff0000','#ff6600','#ffcc00','#00ff44','#00ccff','#0044ff','#cc00ff','#ff00aa','#ffffff','#ffee88']

function generateRainbowSparkles(): SparkleData[] {
  return Array.from({ length: 70 }, (_, id) => {
    const angle = Math.random() * Math.PI * 2
    const dist  = 120 + Math.random() * 280
    return {
      id,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)],
      size: 7 + Math.random() * 16,
      delay: Math.random() * 0.6,
      rotate: Math.random() > 0.3,
    }
  })
}

function generateRareSparkles(grade: string): SparkleData[] {
  const colors = SPARKLE_COLORS[grade] ?? ['#fff', '#aaa']
  return Array.from({ length: 36 }, (_, id) => {
    const angle = Math.random() * Math.PI * 2
    const dist  = 100 + Math.random() * 200
    return {
      id,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 12,
      delay: Math.random() * 0.5,
      rotate: Math.random() > 0.4,
    }
  })
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

// ── Full-screen fireworks ─────────────────────────────────────────────────────

interface FireworkParticle {
  id: number
  ox: number      // origin left (vw %)
  oy: number      // origin top  (vh %)
  tx: number      // translate x (px)
  ty: number      // translate y (px)
  color: string
  size: number
  delay: number
  duration: number
  diamond: boolean
}

function generateFullscreenFireworks(grade: string, isRare: boolean, isRainbow: boolean): FireworkParticle[] {
  const colors  = isRainbow ? RAINBOW_COLORS : (SPARKLE_COLORS[grade] ?? ['#fff', '#ffcc00'])
  const bursts  = isRainbow ? 9 : isRare ? 6 : 4
  const perBurst = isRainbow ? 22 : isRare ? 16 : 11
  const result: FireworkParticle[] = []
  let id = 0

  for (let b = 0; b < bursts; b++) {
    const ox = 7 + Math.random() * 86
    const oy = 5 + Math.random() * 82
    const burstDelay = b * 0.14

    for (let p = 0; p < perBurst; p++) {
      const angle = (p / perBurst) * Math.PI * 2 + Math.random() * 0.7
      const dist  = (isRainbow ? 130 : isRare ? 95 : 65) + Math.random() * 110
      result.push({
        id: id++,
        ox, oy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isRainbow ? 7 + Math.random() * 9 : isRare ? 5 + Math.random() * 7 : 4 + Math.random() * 6,
        delay: burstDelay + Math.random() * 0.18,
        duration: 0.75 + Math.random() * 0.55,
        diamond: Math.random() > 0.45,
      })
    }
  }
  return result
}

// ── Sound effects via Web Audio API ──────────────────────────────────────────

function playDrawSound(grade: string, isRare: boolean, isRainbow: boolean) {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()

    const note = (freq: number, type: OscillatorType, start: number, dur: number, vol: number, freqEnd?: number) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, start)
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.start(start); osc.stop(start + dur + 0.01)
    }

    const now = ctx.currentTime

    if (isRainbow) {
      // 화려한 팡파르 — 상승 아르페지오 + 하모니 + 반짝임
      const fanfare  = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1568.00]
      const harmony  = [392.00, 493.88, 587.33, 783.99]
      fanfare.forEach((f, i) => note(f, 'sine', now + i * 0.09, 0.6, 0.3))
      harmony.forEach((f, i) => note(f, 'sine', now + i * 0.09 + 0.04, 0.5, 0.14))
      note(2093, 'sine', now + 0.5, 0.9, 0.15)
      note(2637, 'sine', now + 0.65, 0.7, 0.1)
      note(880, 'sawtooth', now, 0.07, 0.06, 440)
    } else if (isRare) {
      // 3음 상승 아르페지오
      const arp = [440, 554.37, 659.25]
      arp.forEach((f, i) => note(f, 'sine', now + i * 0.13, 0.5, 0.26))
      note(1318.51, 'sine', now + 0.35, 0.55, 0.13)
    } else {
      // 짧고 경쾌한 팝
      note(700, 'sine', now, 0.18, 0.32, 220)
      note(1100, 'sine', now + 0.01, 0.07, 0.14)
    }

    setTimeout(() => ctx.close(), 3000)
  } catch { /* silently ignore — AudioContext may be blocked */ }
}

// ── GradeStatusBar (compact always-visible strip) ────────────────────────────

function GradeStatusBar({ tickets }: { tickets: Ticket[] }) {
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

// ── GradeStatusPanel (detailed view for side panel tab) ───────────────────────

function GradeStatusPanel({ tickets }: { tickets: Ticket[] }) {
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
            {/* 상단: 배지 + 상품명 */}
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-black px-2.5 py-1 rounded-full flex-shrink-0 ${style.badge}`}>
                {letter}賞
              </span>
              <span className="text-sm text-zinc-300 truncate flex-1 min-w-0">{prize.name}</span>
            </div>
            {/* 중단: 진행바 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: style.glow }}
                />
              </div>
            </div>
            {/* 하단: 남음 / 뽑힘 수치 */}
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

// ── SetupScreen ───────────────────────────────────────────────────────────────

function SetupScreen({ product, prizes, onStart, onClose, initialConfig }: {
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
        // 낮은 쪽으로 가중 — 너무 많이 뽑힌 상태 방지
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
      // fallback: select text in a temp input
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

function RevealOverlay({ ticket, onComplete, totalForGrade }: {
  ticket: Ticket
  onComplete: () => void
  totalForGrade: number
}) {
  const { t, locale } = useLanguage()
  const [phase, setPhase] = useState<'sealed' | 'revealed'>('sealed')
  const [dragProgress, setDragProgress] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const [sparkles, setSparkles] = useState<SparkleData[]>([])
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([])

  const isDragging = useRef(false)
  const startX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const style = GRADE_STYLE[ticket.grade] ?? DEFAULT_STYLE
  const gradeLabel = translateGrade(ticket.grade, locale as 'ko' | 'ja' | 'en')
  const isHighTier = ticket.grade === 'A賞' || ticket.grade === 'ラストワン賞'
  const isLastOne = ticket.grade === 'ラストワン賞'

  // 희귀도 판정: 전체 개수 기준
  const isRare    = totalForGrade > 0 && totalForGrade <= 3
  const isRainbow = isRare && ticket.grade === 'A賞'

  const triggerReveal = useCallback(() => {
    isDragging.current = false
    setIsSnapping(true)
    setDragProgress(1)
    setTimeout(() => {
      setPhase('revealed')
      if (isRainbow) setSparkles(generateRainbowSparkles())
      else if (isRare) setSparkles(generateRareSparkles(ticket.grade))
      else setSparkles(generateSparkles(ticket.grade))
      setFireworks(generateFullscreenFireworks(ticket.grade, isRare, isRainbow))
      playDrawSound(ticket.grade, isRare, isRainbow)
    }, 320)
  }, [ticket.grade, isRainbow, isRare])

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
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: isRainbow && phase === 'revealed' ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.88)' }}
    >
      {/* ── Rainbow screen wash (A賞 rare only) ── */}
      {phase === 'revealed' && isRainbow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(270deg,#ff0000,#ff6600,#ffcc00,#00ff44,#00ccff,#0044ff,#cc00ff,#ff0000)',
            backgroundSize: '400% 400%',
            animation: 'kuji-rainbow-screen 3s ease infinite',
          }}
        />
      )}

      {/* ── Glow behind card ── */}
      {phase === 'revealed' && isRainbow && (
        <>
          {/* Outer rotating rainbow orb */}
          <div className="absolute pointer-events-none" style={{ width: 700, height: 600 }}>
            <div style={{
              width: '100%', height: '100%',
              background: 'conic-gradient(from 0deg, #ff0000, #ff9900, #ffff00, #00ff00, #00ccff, #0000ff, #cc00ff, #ff0000)',
              filter: 'blur(70px)',
              opacity: 0.55,
              animation: 'kuji-rainbow-spin 3s linear infinite',
            }} />
          </div>
          {/* Inner counter-rotating orb */}
          <div className="absolute pointer-events-none" style={{ width: 500, height: 420 }}>
            <div style={{
              width: '100%', height: '100%',
              background: 'conic-gradient(from 180deg, #ff6600, #ffff00, #00ff44, #00ccff, #cc00ff, #ff0066, #ff6600)',
              filter: 'blur(55px)',
              opacity: 0.5,
              animation: 'kuji-rainbow-spin 2s linear infinite reverse',
            }} />
          </div>
          {/* Core white-hot glow */}
          <div className="absolute rounded-full pointer-events-none" style={{
            width: 300, height: 220,
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,220,100,0.5) 40%, transparent 70%)',
            filter: 'blur(30px)',
            animation: 'kuji-rare-pulse 0.8s ease-in-out infinite',
          }} />
        </>
      )}
      {phase === 'revealed' && isRare && !isRainbow && (
        <>
          <div className="absolute rounded-full blur-3xl pointer-events-none" style={{
            width: 560, height: 420,
            background: style.glow,
            opacity: 0.75,
            animation: 'kuji-rare-pulse 1s ease-in-out infinite',
          }} />
          <div className="absolute rounded-full pointer-events-none" style={{
            width: 300, height: 220,
            background: `radial-gradient(circle, white 0%, ${style.glow} 50%, transparent 70%)`,
            filter: 'blur(25px)',
            opacity: 0.6,
            animation: 'kuji-rare-pulse 0.9s 0.2s ease-in-out infinite',
          }} />
        </>
      )}
      {phase === 'revealed' && !isRare && (
        <div
          className="absolute rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{ width: 400, height: 300, background: style.glow }}
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
        {/* ── Rainbow border (A賞 rare) ── */}
        {phase === 'revealed' && isRainbow && (
          <div style={{
            position: 'absolute', inset: -5, borderRadius: 22,
            background: 'linear-gradient(270deg,#ff0000,#ff9900,#ffff00,#00ff44,#00ccff,#0044ff,#cc00ff,#ff0099,#ff0000)',
            backgroundSize: '300% 100%',
            animation: 'kuji-rainbow-flow 1.2s linear infinite',
            zIndex: 0,
          }} />
        )}
        {/* ── Rare pulsing border (non-rainbow rare) ── */}
        {phase === 'revealed' && isRare && !isRainbow && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: 21,
            background: style.glow,
            animation: 'kuji-rare-border-pulse 0.8s ease-in-out infinite',
            zIndex: 0,
          }} />
        )}

        {/* ── Prize back face (always present, revealed from left) ── */}
        <div
          className={`absolute inset-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 ${isRainbow ? 'border-transparent' : style.border} flex flex-col items-center justify-center gap-2 p-3 shadow-2xl ${isLastOne ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
          style={{ zIndex: 1 }}
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
              zIndex: 3,
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
        {phase === 'revealed' && !isRainbow && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: style.glow,
              opacity: 0,
              animation: `kuji-flash ${isRare ? '0.7s' : '0.55s'} ease-out forwards`,
              zIndex: 5,
            }}
          />
        )}
        {/* ── Rainbow flash (A賞 rare) ── */}
        {phase === 'revealed' && isRainbow && (
          <>
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: 'linear-gradient(135deg,#ff0000,#ffcc00,#00ff88,#00ccff,#cc00ff)',
              opacity: 0,
              animation: 'kuji-flash 0.8s ease-out forwards',
              zIndex: 5,
            }} />
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: 'white',
              opacity: 0,
              animation: 'kuji-flash 0.4s 0.05s ease-out forwards',
              zIndex: 6,
            }} />
          </>
        )}
      </div>

      {/* Full-screen firework particles */}
      {fireworks.map(fw => (
        <div
          key={fw.id}
          style={{
            position: 'fixed',
            left: `${fw.ox}vw`,
            top: `${fw.oy}vh`,
            width: fw.size,
            height: fw.size,
            background: fw.color,
            borderRadius: fw.diamond ? '2px' : '50%',
            animation: `kuji-firework ${fw.duration}s ${fw.delay}s ease-out forwards`,
            '--tx': `${fw.tx}px`,
            '--ty': `${fw.ty}px`,
            zIndex: 61,
            pointerEvents: 'none',
            rotate: fw.diamond ? '45deg' : undefined,
            boxShadow: `0 0 ${fw.size * 1.5}px ${fw.color}`,
          } as React.CSSProperties}
        />
      ))}

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

  const { t } = useLanguage()
  const myLabel  = t.simulatorMyDraws
  const preLabel = t.simulatorPreDrawnSection

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
          {sessionDrawn.length === 0 && <span className="text-xs text-zinc-500 italic">{t.simulatorNoDrawnYet}</span>}
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
          <span className="text-xs text-zinc-600 italic">{t.simulatorPreDrawnEmpty}</span>
        )}
      </div>
    </div>
  )
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({ sessions, onClear, locale }: {
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
        <button
          onClick={onClear}
          className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
        >
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

// ── LastOne Overlay ───────────────────────────────────────────────────────────

function LastOneOverlay({ prize, locale, onClose }: { prize: Prize; locale: string; onClose: () => void }) {
  const { t } = useLanguage()
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
        {t.simulatorLastOneMsg}
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

// ── AutoDrawSetup ─────────────────────────────────────────────────────────────

function AutoDrawSetup({ tickets, product, onStart, onClose }: {
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

  // ensure targetGrade stays valid when grades change
  useEffect(() => {
    if (grades.length > 0 && !grades.includes(targetGrade)) setTargetGrade(grades[0])
  }, [grades, targetGrade])

  const canStart = remaining.length > 0 && (goal !== 'grade' || grades.length > 0)

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">{t.autoDrawTitle}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Goal */}
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

            {/* Grade selector */}
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

            {/* Count input */}
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

          {/* Speed */}
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

        {/* Footer */}
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

// ── AutoDrawResultModal ───────────────────────────────────────────────────────

function AutoDrawResultModal({ result, product, onClose, onReset }: {
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
      <div
        className={`w-full sm:max-w-sm bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-700 overflow-hidden transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-8'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">{t.autoDrawResultTitle}</h2>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Goal status */}
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

          {/* Grade tally */}
          {tally.length > 0 && (
            <div className="space-y-2">
              {tally.map(([grade, count]) => {
                const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
                const letter = getGradeLetter(grade)
                const label = translateGrade(grade, locale as 'ko' | 'ja' | 'en')
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

        {/* Footer */}
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

// ── ProbabilityModal ─────────────────────────────────────────────────────────

function ProbabilityModal({ tickets, onClose }: { tickets: Ticket[]; onClose: () => void }) {
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

  // 선택된 등급들의 합산 확률
  const selectedStats = useMemo(
    () => stats.filter(s => selected.has(s.grade)),
    [stats, selected]
  )
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
        {/* Header */}
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

        {/* 합산 확률 패널 */}
        {selected.size > 0 && (
          <div className="flex-shrink-0 mx-4 mt-4 p-4 rounded-xl bg-zinc-800 border border-zinc-600">
            {/* 선택된 배지들 */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedStats.map(s => (
                <span key={s.grade} className={`text-xs font-black px-2.5 py-1 rounded-full ${(GRADE_STYLE[s.grade] ?? DEFAULT_STYLE).badge}`}>
                  {getGradeLetter(s.grade)}賞
                </span>
              ))}
              <span className="text-xs text-zinc-500 self-center">{t.simulatorProbCombined}</span>
            </div>
            {/* 합산 확률 */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black tabular-nums text-white">
                  {combinedProb.toFixed(1)}<span className="text-2xl text-zinc-400">%</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">{fmt(t.simulatorProbRemainingInfo, { remaining: combinedRemaining, total: totalRemaining })}</p>
              </div>
              {/* 개별 확률 합산 표시 */}
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

        {/* Grade list */}
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
                {/* 체크 인디케이터 */}
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected ? 'border-white bg-white' : 'border-zinc-600'
                }`}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* 배지 */}
                <span className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ${style.badge}`}>
                  {letter}賞
                </span>

                {/* 상품명 + 바 */}
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

                {/* 개별 확률 */}
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
            <button
              onClick={() => setSelected(new Set())}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.simulatorProbClear}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main SimulatorModal ───────────────────────────────────────────────────────

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
  // ── Auto draw state ──
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

  // 등급별 전체 티켓 수 (drawn 포함) — 희귀도 판정에 사용
  const gradeTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of tickets) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return map
  }, [tickets])
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

    function tick(remaining: Ticket[]) {
      if (!autoDrawActive.current) return

      // Check stop condition before drawing
      const goalMet =
        (cfg.goal === 'grade' && drawnList.some(tk => tk.grade === cfg.targetGrade)) ||
        (cfg.goal === 'count' && drawnList.length >= cfg.targetCount) ||
        (cfg.goal === 'all'   && remaining.length === 0)

      if (goalMet || remaining.length === 0) {
        autoDrawActive.current = false
        setAutoDrawing(false)
        setAutoResult({ draws: [...drawnList], goalMet })
        setShowAutoResult(true)
        return
      }

      const idx  = Math.floor(Math.random() * remaining.length)
      const pick = remaining[idx]
      const next = remaining.filter((_, i) => i !== idx)

      drawnList.push(pick)
      setTickets(prev => prev.map(tk => tk.id === pick.id ? { ...tk, drawn: true } : tk))
      setSessionDraws(n => n + 1)
      setAutoDrawCount(drawnList.length)

      setTimeout(() => tick(next), delay)
    }

    tick(tickets.filter(tk => !tk.drawn))
  }, [tickets])

  const cancelAutoDraw = useCallback(() => {
    autoDrawActive.current = false
    setAutoDrawing(false)
  }, [])

  const cols = 7

  if (phase === 'setup') {
    return <SetupScreen product={product} prizes={prizes} onStart={handleSetupStart} onClose={onClose} initialConfig={initialConfig} />
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950">
      {/* Reveal overlay */}
      {revealTicket && (
        <RevealOverlay
          ticket={revealTicket}
          onComplete={handleRevealComplete}
          totalForGrade={gradeTotals.get(revealTicket.grade) ?? 0}
        />
      )}

      {/* Probability modal */}
      {showProbability && (
        <ProbabilityModal tickets={tickets} onClose={() => setShowProbability(false)} />
      )}

      {/* Auto Draw Setup */}
      {showAutoSetup && (
        <AutoDrawSetup
          tickets={tickets}
          product={product}
          onStart={startAutoDraw}
          onClose={() => setShowAutoSetup(false)}
        />
      )}

      {/* Auto Draw Result */}
      {showAutoResult && autoResult && (
        <AutoDrawResultModal
          result={autoResult}
          product={product}
          onClose={() => setShowAutoResult(false)}
          onReset={reset}
        />
      )}

      {/* Last One bonus overlay */}
      {showLastOne && lastOnePrize && (
        <LastOneOverlay prize={lastOnePrize} locale={locale} onClose={() => setShowLastOne(false)} />
      )}

      {/* ── Main area ── */}
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

        {/* Grade status bar */}
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

        {/* 세션 종료 */}
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
          {/* Panel header + close */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-lg">
              <button
                onClick={() => setPanelTab('status')}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${panelTab === 'status' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                현황판
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
            <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {panelTab === 'status'
            ? <GradeStatusPanel tickets={tickets} />
            : panelTab === 'results'
            ? <DrawnPanel drawn={drawn} locale={locale} />
            : <HistoryPanel sessions={drawHistory} onClear={clearHistory} locale={locale} />
          }
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
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>
            {/* Tabs + close */}
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
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
              <button onClick={() => setPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-6 min-h-0 flex flex-col">
              {panelTab === 'status'
                ? <GradeStatusPanel tickets={tickets} />
                : panelTab === 'results'
                ? <DrawnPanel drawn={drawn} locale={locale} />
                : <HistoryPanel sessions={drawHistory} onClear={clearHistory} locale={locale} />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
