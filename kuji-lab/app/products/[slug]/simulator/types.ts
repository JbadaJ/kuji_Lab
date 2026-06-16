import type { Prize } from '@/types/kuji'

export interface Ticket {
  id: number
  prize: Prize
  grade: string
  drawn: boolean
  preset: boolean
}

export interface SparkleData {
  id: number
  x: number; y: number
  tx: number; ty: number
  color: string
  size: number
  delay: number
  rotate: boolean
}

export interface FireworkParticle {
  id: number
  ox: number
  oy: number
  tx: number
  ty: number
  color: string
  size: number
  delay: number
  duration: number
  diamond: boolean
}

export interface SimulatorConfig {
  mode: 'default' | 'random' | 'custom'
  preDrawn: Record<string, number>
  drawLimit: number | null
}

export type AutoDrawGoal  = 'grade' | 'all' | 'count'
export type AutoDrawSpeed = 'fast' | 'normal' | 'slow'

export interface AutoDrawConfig {
  goal: AutoDrawGoal
  targetGrade: string
  targetCount: number
  speed: AutoDrawSpeed
}

export interface AutoResult {
  draws: Ticket[]
  goalMet: boolean
}

// ── Grade styles ─────────────────────────────────────────────────────────────

export const GRADE_STYLE: Record<string, { badge: string; border: string; glow: string }> = {
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
export const DEFAULT_STYLE = { badge: 'bg-zinc-500 text-white', border: 'border-zinc-500', glow: '#888' }
