'use client'

import { useState, useEffect, useRef } from 'react'
import { getGradeLetter } from '@/lib/utils'
import type { Ticket } from './types'
import { GRADE_STYLE, DEFAULT_STYLE } from './types'

export function TicketFront({ small = false }: { small?: boolean }) {
  const logoSize = small ? 36 : 80
  const inset = small ? 6 : 14
  return (
    <>
      <div className="absolute left-[6px] right-[6px] flex gap-[1.5px]" style={{ top: small ? 5 : 10, height: small ? 4 : 8 }}>
        {[2,1,3,1,1,2,1,3,1,2,1,1,3,1,2].map((w, i) => (
          <div key={i} style={{ flex: w }} className="bg-white/70 rounded-[1px]" />
        ))}
      </div>
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
      <div className="absolute left-[6px] right-[6px] flex gap-[1.5px]" style={{ bottom: small ? 5 : 10, height: small ? 4 : 8 }}>
        {[1,3,1,2,1,1,3,1,2,1,3,1,1,2,1].map((w, i) => (
          <div key={i} style={{ flex: w }} className="bg-white/70 rounded-[1px]" />
        ))}
      </div>
    </>
  )
}

export function TicketCard({ ticket, onReveal }: { ticket: Ticket; onReveal: (t: Ticket) => void }) {
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
        <button
          onClick={() => !ticket.drawn && onReveal(ticket)}
          disabled={ticket.drawn}
          className="absolute inset-0 w-full h-full rounded-lg overflow-hidden bg-orange-500 shadow-md enabled:hover:bg-orange-400 enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:scale-95 transition-all duration-100 cursor-pointer disabled:cursor-default"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <TicketFront small />
        </button>
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
