'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Prize } from '@/types/kuji'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { translateGrade } from '@/lib/i18n'
import type { SparkleData } from './types'
import { GRADE_STYLE } from './types'
import { generateSparkles } from './effects'
import { playRevealSound } from './sound'

export default function LastOneOverlay({ prize, locale, onClose }: { prize: Prize; locale: string; onClose: () => void }) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [sparkles, setSparkles] = useState<SparkleData[]>([])
  const style = GRADE_STYLE['ラストワン賞']
  const gradeLabel = translateGrade('ラストワン賞', locale as 'ko' | 'ja' | 'en')

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setVisible(true)
      setSparkles(generateSparkles('ラストワン賞'))
      playRevealSound({ tier: 4, isRainbow: true, isHiddenGem: false })
    })
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div className="absolute rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ width: 500, height: 400, background: '#f59e0b' }} />

      <div
        className={`mb-6 px-6 py-2 rounded-full bg-amber-500 text-white font-black text-lg tracking-widest shadow-xl transition-all duration-700 ${visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        style={{ letterSpacing: '0.15em' }}
      >
        LAST ONE !
      </div>

      <div
        className={`relative select-none transition-all duration-700 ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-8'}`}
        style={{ width: 'min(85vw, 380px)', aspectRatio: '3/2' }}
      >
        <div className={`absolute inset-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 ${style.border} ring-4 ring-yellow-400 ring-offset-2 ring-offset-black flex flex-col items-center justify-center gap-2 p-3 shadow-2xl`}>
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ zIndex: 3 }}>
            <div style={{
              position: 'absolute', top: '-50%', width: '45%', height: '200%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
              transform: 'skewX(-15deg)',
              animation: 'kuji-shine 1.4s 0.4s ease-in-out infinite',
            }} />
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

        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: '#f59e0b', opacity: 0, animation: 'kuji-flash 0.55s ease-out forwards', zIndex: 5 }} />
      </div>

      <p className={`mt-4 text-sm text-amber-300/80 text-center transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {t.simulatorLastOneMsg}
      </p>

      <button
        onClick={onClose}
        className={`mt-6 px-10 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {t.simulatorConfirm}
      </button>
    </div>
  )
}
