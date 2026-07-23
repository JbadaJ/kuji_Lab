import { describe, it, expect } from 'vitest'
import { gradeRank, looksLikeFigure, getEffectProfile } from '@/app/products/[slug]/simulator/effects'

function prize(name: string, description?: string) {
  return { name, full_name: `X賞 ${name}`, description }
}

describe('gradeRank', () => {
  it('ranks grades alphabetically from A=0', () => {
    expect(gradeRank('A賞')).toBe(0)
    expect(gradeRank('D賞')).toBe(3)
    expect(gradeRank('I賞')).toBe(8)
  })

  it('treats last-one and unknown specially', () => {
    expect(gradeRank('ラストワン賞')).toBe(-1)
    expect(gradeRank('')).toBe(99)
    expect(gradeRank('特賞')).toBe(99)
  })
})

describe('looksLikeFigure', () => {
  it('detects figure-class prizes by keyword', () => {
    expect(looksLikeFigure(prize('孫悟空 フィギュア'))).toBe(true)
    expect(looksLikeFigure(prize('ソフビキーホルダー'))).toBe(true)
    expect(looksLikeFigure(prize('MASTERLISE 孫悟空'))).toBe(true)
    expect(looksLikeFigure(prize('スタチュー'))).toBe(true)
  })

  it('does not match ordinary goods', () => {
    expect(looksLikeFigure(prize('タオル'))).toBe(false)
    expect(looksLikeFigure(prize('ぬいぐるみ'))).toBe(false)
    expect(looksLikeFigure(prize('クリアファイルセット'))).toBe(false)
  })

  it('matches keyword in description too', () => {
    expect(looksLikeFigure(prize('スペシャル賞品', '豪華フィギュアです'))).toBe(true)
  })
})

describe('getEffectProfile', () => {
  const towel = prize('タオル')
  const figure = prize('フィギュア')

  it('gives A grade tier 3, rainbow tier 4 only when rare', () => {
    expect(getEffectProfile('A賞', 20, towel)).toEqual({ tier: 3, isRainbow: false, isHiddenGem: false })
    expect(getEffectProfile('A賞', 2, towel)).toEqual({ tier: 4, isRainbow: true, isHiddenGem: false })
  })

  it('scales base tier down the grades: B/C=2, D=1, E+=0', () => {
    expect(getEffectProfile('B賞', 20, towel).tier).toBe(2)
    expect(getEffectProfile('C賞', 20, towel).tier).toBe(2)
    expect(getEffectProfile('D賞', 20, towel).tier).toBe(1)
    expect(getEffectProfile('E賞', 20, towel).tier).toBe(0)
    expect(getEffectProfile('G賞', 20, towel).tier).toBe(0)
  })

  it('boosts rare grades by one tier but never to rainbow except A', () => {
    expect(getEffectProfile('B賞', 3, towel).tier).toBe(3)
    expect(getEffectProfile('B賞', 3, towel).isRainbow).toBe(false)
    expect(getEffectProfile('E賞', 2, towel).tier).toBe(1)
  })

  it('estimated pools (totalForGrade large) are not rare', () => {
    expect(getEffectProfile('A賞', 27, towel).tier).toBe(3)
  })

  it('lifts low-grade figures to at least tier 2 with hidden-gem flag', () => {
    const p = getEffectProfile('F賞', 30, figure)
    expect(p.tier).toBe(2)
    expect(p.isHiddenGem).toBe(true)
  })

  it('hidden gem + rare stacks to tier 3', () => {
    const p = getEffectProfile('E賞', 2, figure)
    expect(p).toEqual({ tier: 3, isRainbow: false, isHiddenGem: true })
  })

  it('figures at high grades are not hidden gems (already expected)', () => {
    expect(getEffectProfile('A賞', 20, figure).isHiddenGem).toBe(false)
    expect(getEffectProfile('D賞', 20, figure).isHiddenGem).toBe(false)
  })

  it('handles last-one and unknown grades safely', () => {
    expect(getEffectProfile('ラストワン賞', 1, figure)).toEqual({ tier: 4, isRainbow: true, isHiddenGem: false })
    expect(getEffectProfile('', 20, figure).tier).toBe(0)
    expect(getEffectProfile('', 20, figure).isHiddenGem).toBe(false)
  })
})
