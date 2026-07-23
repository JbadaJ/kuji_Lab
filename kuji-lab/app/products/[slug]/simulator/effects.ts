import type { Prize } from '@/types/kuji'
import type { SparkleData, FireworkParticle } from './types'

// ── Effect tier ─────────────────────────────────────────────────────────────
//
// 연출 강도는 등급만이 아니라 3가지 신호의 조합으로 결정한다:
//   1. 등급 순위 (A=3, B/C=2, D=1, E이하=0)
//   2. 희귀도 — 해당 등급 티켓 수가 3장 이하면 +1
//   3. 숨은 레어 — E賞 이하인데 피규어급 상품이면 최소 티어 2 + 전용 연출
// 티어 4(레인보우)는 "A賞이면서 희귀"일 때만 도달한다.

export type EffectTier = 0 | 1 | 2 | 3 | 4

export interface EffectProfile {
  tier: EffectTier
  isRainbow: boolean
  isHiddenGem: boolean
}

const FIGURE_RE = /フィギュア|ソフビ|スタチュー|masterlise|マスターライズ/i

export function looksLikeFigure(prize: Pick<Prize, 'name' | 'full_name' | 'description'>): boolean {
  return FIGURE_RE.test(`${prize.name} ${prize.full_name} ${prize.description ?? ''}`)
}

/** A賞=0, B賞=1, ... ラストワン賞=-1, 그 외=99 */
export function gradeRank(grade: string): number {
  const m = grade.match(/^([A-Z])賞$/)
  if (m) return m[1].charCodeAt(0) - 65
  if (grade === 'ラストワン賞') return -1
  return 99
}

export function getEffectProfile(
  grade: string,
  totalForGrade: number,
  prize?: Pick<Prize, 'name' | 'full_name' | 'description'>
): EffectProfile {
  const rank = gradeRank(grade)
  if (rank === -1) return { tier: 4, isRainbow: true, isHiddenGem: false }

  const isRare = totalForGrade > 0 && totalForGrade <= 3
  const isHiddenGem = rank >= 4 && rank < 99 && !!prize && looksLikeFigure(prize)

  let tier: number =
    rank === 0 ? 3 :
    rank <= 2  ? 2 :
    rank === 3 ? 1 : 0

  if (isHiddenGem) tier = Math.max(tier, 2)
  if (isRare) tier += 1

  // 레인보우(티어 4)는 A賞 전용 — 다른 등급은 티어 3에서 캡
  const isRainbow = tier >= 4 && rank === 0
  if (tier >= 4 && !isRainbow) tier = 3
  if (tier > 4) tier = 4

  return { tier: tier as EffectTier, isRainbow, isHiddenGem }
}

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
const HIDDEN_GEM_EXTRA = ['#fbbf24', '#fde68a', '#ffffff']

function paletteFor(grade: string, profile?: EffectProfile): string[] {
  if (profile?.isRainbow) return RAINBOW_COLORS
  const base = SPARKLE_COLORS[grade] ?? ['#fff', '#aaa']
  // 숨은 레어는 등급 색상에 금색·흰색을 섞어 "반짝 발견" 느낌을 준다
  return profile?.isHiddenGem ? [...base, ...HIDDEN_GEM_EXTRA] : base
}

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

// 티어별 파티클 수·크기·퍼짐 (0=일반 → 4=레인보우)
const TIER_SPARKLES = [
  { count: 12, distMax: 200, sizeMax: 11 },
  { count: 20, distMax: 240, sizeMax: 13 },
  { count: 32, distMax: 280, sizeMax: 15 },
  { count: 46, distMax: 330, sizeMax: 18 },
  { count: 70, distMax: 400, sizeMax: 23 },
]

export function generateTierSparkles(grade: string, profile: EffectProfile): SparkleData[] {
  const cfg = TIER_SPARKLES[profile.tier]
  const colors = paletteFor(grade, profile)
  return generateParticles(cfg.count, colors, 80, cfg.distMax, 4 + profile.tier, cfg.sizeMax, 0.35 + profile.tier * 0.06, 0.4)
}

/** LastOneOverlay 등 프로필 없이 쓰는 기본 스파클 */
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

// 티어별 폭죽: 터지는 횟수·파편 수·퍼짐이 단계적으로 커진다
const TIER_FIREWORKS = [
  { bursts: 2,  perBurst: 9,  dist: 55,  sizeBase: 3 },
  { bursts: 4,  perBurst: 11, dist: 65,  sizeBase: 4 },
  { bursts: 6,  perBurst: 14, dist: 85,  sizeBase: 5 },
  { bursts: 8,  perBurst: 18, dist: 105, sizeBase: 6 },
  { bursts: 10, perBurst: 22, dist: 130, sizeBase: 7 },
]

export function generateFullscreenFireworks(grade: string, profile: EffectProfile): FireworkParticle[] {
  const cfg = TIER_FIREWORKS[profile.tier]
  const colors = paletteFor(grade, profile)
  const result: FireworkParticle[] = []
  let id = 0

  for (let b = 0; b < cfg.bursts; b++) {
    const ox = 7 + Math.random() * 86
    const oy = 5 + Math.random() * 82
    const burstDelay = b * 0.14

    for (let p = 0; p < cfg.perBurst; p++) {
      const angle = (p / cfg.perBurst) * Math.PI * 2 + Math.random() * 0.7
      const dist  = cfg.dist + Math.random() * 110
      result.push({
        id: id++,
        ox, oy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: cfg.sizeBase + Math.random() * (cfg.sizeBase + 2),
        delay: burstDelay + Math.random() * 0.18,
        duration: 0.75 + Math.random() * 0.55,
        diamond: Math.random() > 0.45,
      })
    }
  }
  return result
}

// 사운드는 ./sound.ts의 playRevealSound/playAutoDrawSound가 담당한다.
