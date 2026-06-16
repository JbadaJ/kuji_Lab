'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { getGradeLetter } from '@/lib/utils'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { translateGrade } from '@/lib/i18n'
import type { Ticket, SparkleData, FireworkParticle } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'
import { generateSparkles, generateRareSparkles, generateRainbowSparkles, generateFullscreenFireworks, playDrawSound } from './effects'
import { TicketFront } from './TicketCard'

export default function RevealOverlay({ ticket, onComplete, totalForGrade }: {
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
      {/* Rainbow screen wash */}
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

      {/* Glow behind card */}
      {phase === 'revealed' && isRainbow && (
        <>
          <div className="absolute pointer-events-none" style={{ width: 700, height: 600 }}>
            <div style={{
              width: '100%', height: '100%',
              background: 'conic-gradient(from 0deg, #ff0000, #ff9900, #ffff00, #00ff00, #00ccff, #0000ff, #cc00ff, #ff0000)',
              filter: 'blur(70px)', opacity: 0.55,
              animation: 'kuji-rainbow-spin 3s linear infinite',
            }} />
          </div>
          <div className="absolute pointer-events-none" style={{ width: 500, height: 420 }}>
            <div style={{
              width: '100%', height: '100%',
              background: 'conic-gradient(from 180deg, #ff6600, #ffff00, #00ff44, #00ccff, #cc00ff, #ff0066, #ff6600)',
              filter: 'blur(55px)', opacity: 0.5,
              animation: 'kuji-rainbow-spin 2s linear infinite reverse',
            }} />
          </div>
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
            width: 560, height: 420, background: style.glow, opacity: 0.75,
            animation: 'kuji-rare-pulse 1s ease-in-out infinite',
          }} />
          <div className="absolute rounded-full pointer-events-none" style={{
            width: 300, height: 220,
            background: `radial-gradient(circle, white 0%, ${style.glow} 50%, transparent 70%)`,
            filter: 'blur(25px)', opacity: 0.6,
            animation: 'kuji-rare-pulse 0.9s 0.2s ease-in-out infinite',
          }} />
        </>
      )}
      {phase === 'revealed' && !isRare && (
        <div className="absolute rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{ width: 400, height: 300, background: style.glow }} />
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
        {/* Rainbow border */}
        {phase === 'revealed' && isRainbow && (
          <div style={{
            position: 'absolute', inset: -5, borderRadius: 22,
            background: 'linear-gradient(270deg,#ff0000,#ff9900,#ffff00,#00ff44,#00ccff,#0044ff,#cc00ff,#ff0099,#ff0000)',
            backgroundSize: '300% 100%',
            animation: 'kuji-rainbow-flow 1.2s linear infinite',
            zIndex: 0,
          }} />
        )}
        {/* Rare pulsing border */}
        {phase === 'revealed' && isRare && !isRainbow && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: 21,
            background: style.glow,
            animation: 'kuji-rare-border-pulse 0.8s ease-in-out infinite',
            zIndex: 0,
          }} />
        )}

        {/* Prize back face */}
        <div
          className={`absolute inset-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 ${isRainbow ? 'border-transparent' : style.border} flex flex-col items-center justify-center gap-2 p-3 shadow-2xl ${isLastOne ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
          style={{ zIndex: 1 }}
        >
          {phase === 'revealed' && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ zIndex: 3 }}>
              <div style={{
                position: 'absolute', top: '-50%', width: '45%', height: '200%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                transform: 'skewX(-15deg)',
                animation: `kuji-shine ${isHighTier ? '1.4s' : '2.2s'} 0.25s ease-in-out ${isHighTier ? 'infinite' : '1'}`,
              }} />
            </div>
          )}
          {ticket.prize.images[0] ? (
            <div className="relative flex-1 w-full min-h-0" style={{ zIndex: 1 }}>
              <Image src={ticket.prize.images[0]} alt={ticket.prize.name} fill className="object-contain p-1" sizes="400px" priority />
            </div>
          ) : (
            <span className="text-5xl font-black text-zinc-300 flex-1 flex items-center" style={{ zIndex: 1 }}>
              {getGradeLetter(ticket.grade)}
            </span>
          )}
          <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ zIndex: 2 }}>
            <span className={`text-sm font-bold px-4 py-1 rounded-full ${style.badge}`}>{gradeLabel}</span>
            {phase === 'revealed' && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center line-clamp-1 max-w-[90%]">{ticket.prize.name}</p>
            )}
          </div>
        </div>

        {/* Orange ticket front */}
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

        {/* Sparkle particles */}
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
              '--tx': `${sp.tx}px`, '--ty': `${sp.ty}px`,
              zIndex: 10, pointerEvents: 'none',
              rotate: sp.rotate ? '45deg' : undefined,
            } as React.CSSProperties}
          />
        ))}

        {/* Grade flash */}
        {phase === 'revealed' && !isRainbow && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: style.glow, opacity: 0,
            animation: `kuji-flash ${isRare ? '0.7s' : '0.55s'} ease-out forwards`, zIndex: 5,
          }} />
        )}
        {phase === 'revealed' && isRainbow && (
          <>
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: 'linear-gradient(135deg,#ff0000,#ffcc00,#00ff88,#00ccff,#cc00ff)',
              opacity: 0, animation: 'kuji-flash 0.8s ease-out forwards', zIndex: 5,
            }} />
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: 'white', opacity: 0,
              animation: 'kuji-flash 0.4s 0.05s ease-out forwards', zIndex: 6,
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
            left: `${fw.ox}vw`, top: `${fw.oy}vh`,
            width: fw.size, height: fw.size,
            background: fw.color,
            borderRadius: fw.diamond ? '2px' : '50%',
            animation: `kuji-firework ${fw.duration}s ${fw.delay}s ease-out forwards`,
            '--tx': `${fw.tx}px`, '--ty': `${fw.ty}px`,
            zIndex: 61, pointerEvents: 'none',
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
