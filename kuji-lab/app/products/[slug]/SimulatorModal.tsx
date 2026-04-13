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

function buildTickets(prizes: Prize[]): Ticket[] {
  const lastOnePrize = prizes.find(p => getPrizeGrade(p) === 'ラストワン賞')
  const regular = prizes.filter(p => getPrizeGrade(p) !== 'ラストワン賞')
  const totalWeight = regular.reduce((s, _, i) => s + i + 1, 0)
  const factor = totalWeight > 0 ? Math.max(1, Math.round(80 / totalWeight)) : 1
  const pool: Prize[] = []
  regular.forEach((p, i) => {
    for (let j = 0; j < (i + 1) * factor; j++) pool.push(p)
  })
  if (lastOnePrize) pool.push(lastOnePrize)
  return shuffle(pool).map((prize, id) => ({ id, prize, grade: getPrizeGrade(prize), drawn: false }))
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
  const [flipped, setFlipped] = useState(false)
  const wasDrawn = useRef(false)

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

        {/* Back: grade letter only */}
        <div
          className="absolute inset-0 rounded-lg flex items-center justify-center shadow-md bg-black border-2 border-orange-500/60"
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

function DrawnPanel({ drawn, locale }: { drawn: Ticket[]; locale: string }) {
  const tally = useMemo(() => {
    const map = new Map<string, number>()
    for (const tk of drawn) map.set(tk.grade, (map.get(tk.grade) ?? 0) + 1)
    return [...map.entries()]
  }, [drawn])

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
        {tally.map(([grade, count]) => {
          const s = GRADE_STYLE[grade] ?? DEFAULT_STYLE
          return (
            <span key={grade} className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.badge}`}>
              {getGradeLetter(grade)} ×{count}
            </span>
          )
        })}
        {drawn.length === 0 && <span className="text-xs text-zinc-500">-</span>}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
        {[...drawn].reverse().map((tk, i) => {
          const s = GRADE_STYLE[tk.grade] ?? DEFAULT_STYLE
          const label = translateGrade(tk.grade, locale as 'ko' | 'ja' | 'en')
          return (
            <div key={tk.id} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-zinc-600 w-4 flex-shrink-0 tabular-nums">{drawn.length - i}</span>
              <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center ${s.badge}`}>
                <span className="text-[9px] font-black">{getGradeLetter(tk.grade)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${s.badge}`}>{label}</span>
                <p className="text-[10px] text-zinc-300 truncate mt-0.5">{tk.prize.name}</p>
              </div>
            </div>
          )
        })}
      </div>
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
  const [tickets, setTickets] = useState<Ticket[]>(() => buildTickets(prizes))
  const [resetCount, setResetCount] = useState(0)
  const [revealTicket, setRevealTicket] = useState<Ticket | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const [toastPrize, setToastPrize] = useState<Prize | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const drawn = useMemo(() => tickets.filter(tk => tk.drawn), [tickets])
  const remaining = tickets.length - drawn.length
  const isFinished = remaining === 0

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
    setTickets(prev => prev.map(tk => tk.id === revealTicket.id ? { ...tk, drawn: true } : tk))
    setToastPrize(revealTicket.prize)
    setToastKey(k => k + 1)
    setRevealTicket(null)
  }, [revealTicket])

  const drawRandom = useCallback(() => {
    const undrawn = tickets.filter(tk => !tk.drawn)
    if (undrawn.length === 0) return
    const pick = undrawn[Math.floor(Math.random() * undrawn.length)]
    openReveal(pick)
  }, [tickets, openReveal])

  const reset = useCallback(() => {
    setTickets(buildTickets(prizes))
    setToastPrize(null)
    setRevealTicket(null)
    setResetCount(c => c + 1)
  }, [prizes])

  const cols = 7

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950">
      {/* Reveal overlay */}
      {revealTicket && (
        <RevealOverlay ticket={revealTicket} onComplete={handleRevealComplete} />
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
            <span className="text-xs text-zinc-500 tabular-nums">{drawn.length} / {tickets.length}</span>
            <button
              onClick={() => setPanelOpen(v => !v)}
              className={`hidden sm:block text-xs px-3 py-1 rounded-full border transition-colors ${panelOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
            >
              {t.simulatorResults}
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
        {!isFinished && (
          <div className="flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800">
            <button
              onClick={drawRandom}
              className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg"
            >
              {fmt(t.simulatorDrawRandom, { count: remaining })}
            </button>
          </div>
        )}
      </div>

      {/* Results side panel */}
      <div className={`flex-shrink-0 bg-zinc-900 border-l border-zinc-800 transition-all duration-300 overflow-hidden ${panelOpen ? 'w-64' : 'w-0'}`}>
        <div className="p-4 h-full flex flex-col gap-3 overflow-hidden" style={{ width: 256 }}>
          <h3 className="text-sm font-bold text-zinc-200 flex-shrink-0">{t.simulatorResults} ({drawn.length})</h3>
          <DrawnPanel drawn={drawn} locale={locale} />
        </div>
      </div>
    </div>
  )
}
