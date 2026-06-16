import type { SparkleData, FireworkParticle } from './types'

// ── Sparkle color palettes ──────────────────────────────────────────────────

export const SPARKLE_COLORS: Record<string, string[]> = {
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

// ── Sparkle generators ──────────────────────────────────────────────────────

function generateParticles(count: number, colors: string[], distMin: number, distMax: number, sizeMin: number, sizeMax: number, delayMax: number, rotateThreshold: number): SparkleData[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI * 2
    const dist  = distMin + Math.random() * (distMax - distMin)
    return {
      id,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      delay: Math.random() * delayMax,
      rotate: Math.random() > rotateThreshold,
    }
  })
}

export function generateRainbowSparkles(): SparkleData[] {
  return generateParticles(70, RAINBOW_COLORS, 120, 400, 7, 23, 0.6, 0.3)
}

export function generateRareSparkles(grade: string): SparkleData[] {
  const colors = SPARKLE_COLORS[grade] ?? ['#fff', '#aaa']
  return generateParticles(36, colors, 100, 300, 6, 18, 0.5, 0.4)
}

export function generateSparkles(grade: string): SparkleData[] {
  const isHighTier = grade === 'A賞' || grade === 'ラストワン賞'
  const count = isHighTier ? 28 : grade === 'B賞' || grade === 'C賞' ? 18 : 12
  const colors = SPARKLE_COLORS[grade] ?? ['#fff', '#aaa']
  return generateParticles(
    count, colors,
    80, 220,
    isHighTier ? 5 : 4, isHighTier ? 15 : 11,
    0.35, 0.5
  )
}

// ── Full-screen fireworks ───────────────────────────────────────────────────

export function generateFullscreenFireworks(grade: string, isRare: boolean, isRainbow: boolean): FireworkParticle[] {
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

// ── Sound effects via Web Audio API ─────────────────────────────────────────

export function playDrawSound(grade: string, isRare: boolean, isRainbow: boolean) {
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
      const fanfare  = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1568.00]
      const harmony  = [392.00, 493.88, 587.33, 783.99]
      fanfare.forEach((f, i) => note(f, 'sine', now + i * 0.09, 0.6, 0.3))
      harmony.forEach((f, i) => note(f, 'sine', now + i * 0.09 + 0.04, 0.5, 0.14))
      note(2093, 'sine', now + 0.5, 0.9, 0.15)
      note(2637, 'sine', now + 0.65, 0.7, 0.1)
      note(880, 'sawtooth', now, 0.07, 0.06, 440)
    } else if (isRare) {
      const arp = [440, 554.37, 659.25]
      arp.forEach((f, i) => note(f, 'sine', now + i * 0.13, 0.5, 0.26))
      note(1318.51, 'sine', now + 0.35, 0.55, 0.13)
    } else {
      note(700, 'sine', now, 0.18, 0.32, 220)
      note(1100, 'sine', now + 0.01, 0.07, 0.14)
    }

    setTimeout(() => ctx.close(), 3000)
  } catch { /* silently ignore — AudioContext may be blocked */ }
}
