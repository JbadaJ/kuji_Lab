import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Prize } from '@/types/kuji'
import { shuffle, buildPool, getGradeCounts, buildTickets, buildShareUrl } from '@/app/products/[slug]/simulator/core'

function prize(grade: string, count?: number): Prize {
  return {
    full_name: `${grade} テスト賞品`,
    grade,
    name: 'テスト賞品',
    count,
    images: [],
  }
}

describe('buildPool', () => {
  it('uses real counts when every regular prize has count > 0', () => {
    const prizes = [prize('A賞', 2), prize('B賞', 10), prize('ラストワン賞')]
    const { regular, factor, hasRealCounts } = buildPool(prizes)
    expect(hasRealCounts).toBe(true)
    expect(factor).toBe(1)
    expect(regular).toHaveLength(2)
  })

  it('excludes ラストワン賞 from the regular pool', () => {
    const prizes = [prize('A賞', 2), prize('ラストワン賞', 1)]
    const { regular } = buildPool(prizes)
    expect(regular.map(p => p.grade)).toEqual(['A賞'])
  })

  it('falls back to estimation when any prize is missing count', () => {
    const prizes = [prize('A賞', 2), prize('B賞')]
    const { factor, hasRealCounts } = buildPool(prizes)
    expect(hasRealCounts).toBe(false)
    // totalWeight = 1 + 2 = 3 → factor = round(80 / 3) = 27
    expect(factor).toBe(27)
  })

  it('estimated pool totals roughly 80 tickets', () => {
    const prizes = ['A賞', 'B賞', 'C賞', 'D賞', 'E賞'].map(g => prize(g))
    const { regular, factor } = buildPool(prizes)
    const total = regular.reduce((s, _, i) => s + (i + 1) * factor, 0)
    expect(total).toBeGreaterThanOrEqual(60)
    expect(total).toBeLessThanOrEqual(100)
  })
})

describe('getGradeCounts', () => {
  it('returns real counts per grade when available', () => {
    const prizes = [prize('A賞', 3), prize('B賞', 7)]
    const counts = getGradeCounts(prizes)
    expect(counts).toEqual([
      expect.objectContaining({ grade: 'A賞', total: 3 }),
      expect.objectContaining({ grade: 'B賞', total: 7 }),
    ])
  })

  it('gives rarer (earlier) grades fewer tickets when estimating', () => {
    const prizes = [prize('A賞'), prize('B賞'), prize('C賞')]
    const counts = getGradeCounts(prizes)
    expect(counts[0].total).toBeLessThan(counts[1].total)
    expect(counts[1].total).toBeLessThan(counts[2].total)
  })
})

describe('buildTickets', () => {
  it('creates one ticket per count with real data', () => {
    const prizes = [prize('A賞', 2), prize('B賞', 5)]
    const tickets = buildTickets(prizes)
    expect(tickets).toHaveLength(7)
    expect(tickets.filter(t => t.grade === 'A賞')).toHaveLength(2)
    expect(tickets.filter(t => t.grade === 'B賞')).toHaveLength(5)
  })

  it('assigns sequential ids and no drawn tickets by default', () => {
    const tickets = buildTickets([prize('A賞', 3)])
    expect(tickets.map(t => t.id)).toEqual([0, 1, 2])
    expect(tickets.every(t => !t.drawn && !t.preset)).toBe(true)
  })

  it('marks exactly the requested pre-drawn tickets per grade', () => {
    const prizes = [prize('A賞', 2), prize('B賞', 5)]
    const tickets = buildTickets(prizes, { 'B賞': 3 })
    const drawnB = tickets.filter(t => t.grade === 'B賞' && t.drawn)
    const drawnA = tickets.filter(t => t.grade === 'A賞' && t.drawn)
    expect(drawnB).toHaveLength(3)
    expect(drawnA).toHaveLength(0)
    expect(drawnB.every(t => t.preset)).toBe(true)
  })

  it('never marks more pre-drawn than exist in a grade', () => {
    const tickets = buildTickets([prize('A賞', 2)], { 'A賞': 99 })
    expect(tickets.filter(t => t.drawn)).toHaveLength(2)
  })

  it('resolves grade via full_name when grade field is empty', () => {
    const p: Prize = { full_name: 'C賞 マグカップ', grade: '', name: 'マグカップ', count: 4, images: [] }
    const tickets = buildTickets([p])
    expect(tickets.every(t => t.grade === 'C賞')).toBe(true)
  })
})

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const copy = [...input]
    const out = shuffle(input)
    expect(input).toEqual(copy)
    expect([...out].sort((a, b) => a - b)).toEqual(copy)
  })
})

describe('buildShareUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('encodes mode, pre-drawn counts, and draw limit as query params', () => {
    vi.stubGlobal('window', { location: { origin: 'https://kuji.example' } })
    const url = buildShareUrl('doubutsuno_mori6', 'custom', { 'A賞': 1, 'B賞': 2, 'C賞': 0 }, 10)
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/products/doubutsuno_mori6')
    expect(parsed.searchParams.get('sim')).toBe('1')
    expect(parsed.searchParams.get('mode')).toBe('custom')
    expect(parsed.searchParams.get('pre')).toBe('A:1,B:2')
    expect(parsed.searchParams.get('limit')).toBe('10')
  })

  it('omits optional params in default mode', () => {
    vi.stubGlobal('window', { location: { origin: 'https://kuji.example' } })
    const url = buildShareUrl('slug1', 'default', {}, null)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('mode')).toBeNull()
    expect(parsed.searchParams.get('pre')).toBeNull()
    expect(parsed.searchParams.get('limit')).toBeNull()
  })
})
