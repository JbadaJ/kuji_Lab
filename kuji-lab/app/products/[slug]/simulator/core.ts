import type { Prize } from '@/types/kuji'
import { getPrizeGrade } from '@/lib/utils'
import type { Ticket } from './types'

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildPool(prizes: Prize[]): { regular: Prize[]; factor: number; hasRealCounts: boolean } {
  const regular = prizes.filter(p => getPrizeGrade(p) !== 'ラストワン賞')
  const hasRealCounts = regular.length > 0 && regular.every(p => (p.count ?? 0) > 0)
  if (hasRealCounts) {
    return { regular, factor: 1, hasRealCounts: true }
  }
  const totalWeight = regular.reduce((s, _, i) => s + i + 1, 0)
  const factor = totalWeight > 0 ? Math.max(1, Math.round(80 / totalWeight)) : 1
  return { regular, factor, hasRealCounts: false }
}

export function getGradeCounts(prizes: Prize[]): Array<{ prize: Prize; grade: string; total: number }> {
  const { regular, factor, hasRealCounts } = buildPool(prizes)
  return regular.map((prize, i) => ({
    prize,
    grade: getPrizeGrade(prize),
    total: hasRealCounts ? (prize.count ?? 1) : (i + 1) * factor,
  }))
}

export function buildTickets(prizes: Prize[], preDrawn: Record<string, number> = {}): Ticket[] {
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

export function buildShareUrl(slug: string, mode: 'default' | 'random' | 'custom', preDrawn: Record<string, number>, drawLimit: number | null): string {
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
