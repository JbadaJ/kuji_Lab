import { describe, it, expect } from 'vitest'
import { normalizeSaleType, formatReleaseDate, getPrizeGrade, getGradeLetter } from '@/lib/utils'

describe('normalizeSaleType', () => {
  it('normalizes Japanese, English, and Korean variants to canonical forms', () => {
    expect(normalizeSaleType(['店頭販売'])).toEqual(['店頭販売'])
    expect(normalizeSaleType(['Store sales'])).toEqual(['店頭販売'])
    expect(normalizeSaleType(['매장 판매'])).toEqual(['店頭販売'])
    expect(normalizeSaleType(['オンライン販売'])).toEqual(['オンライン販売'])
    expect(normalizeSaleType(['online'])).toEqual(['オンライン販売'])
    expect(normalizeSaleType(['온라인 판매'])).toEqual(['オンライン販売'])
  })

  it('passes through unknown values unchanged', () => {
    expect(normalizeSaleType(['その他'])).toEqual(['その他'])
  })
})

describe('formatReleaseDate', () => {
  it('keeps Japanese format for ja locale', () => {
    expect(formatReleaseDate('2026年04月04日', 'ja')).toBe('2026年04月04日')
  })

  it('formats for ko locale without zero padding', () => {
    expect(formatReleaseDate('2026年04月04日', 'ko')).toBe('2026년 4월 4일')
  })

  it('formats for en locale with month name', () => {
    expect(formatReleaseDate('2026年04月04日', 'en')).toBe('April 4, 2026')
  })

  it('returns input unchanged when it does not match the pattern', () => {
    expect(formatReleaseDate('unknown date', 'ko')).toBe('unknown date')
  })
})

describe('getPrizeGrade', () => {
  it('returns the grade field when present', () => {
    expect(getPrizeGrade({ grade: 'A賞', full_name: 'A賞 フィギュア' })).toBe('A賞')
  })

  it('falls back to parsing full_name when grade is empty', () => {
    expect(getPrizeGrade({ grade: '', full_name: 'B賞 タオル' })).toBe('B賞')
    expect(getPrizeGrade({ grade: '', full_name: 'ラストワン賞 特別フィギュア' })).toBe('ラストワン賞')
  })

  it('returns empty string when nothing matches', () => {
    expect(getPrizeGrade({ grade: '', full_name: 'ダブルチャンス' })).toBe('')
  })
})

describe('getGradeLetter', () => {
  it('extracts the letter from a regular grade', () => {
    expect(getGradeLetter('A賞')).toBe('A')
    expect(getGradeLetter('I賞')).toBe('I')
  })

  it('maps last-one prize to a star', () => {
    expect(getGradeLetter('ラストワン賞')).toBe('★')
  })

  it('returns ? for unrecognized grades', () => {
    expect(getGradeLetter('')).toBe('?')
    expect(getGradeLetter('特賞')).toBe('?')
  })
})

describe('cleanProductTitle', () => {
  it('strips site-name segments in any position', async () => {
    const { cleanProductTitle } = await import('@/lib/data')
    expect(cleanProductTitle('一番くじ 夏目友人帳｜一番くじ倶楽部｜BANDAI SPIRITS公式 一番くじ情報サイト')).toBe('一番くじ 夏目友人帳')
    expect(cleanProductTitle('一番くじ倶楽部 | 星のカービィ KIRBY HAT STUDIO')).toBe('星のカービィ KIRBY HAT STUDIO')
    expect(cleanProductTitle('Ichibankuji Club | Ichibankuji ONE PIECE')).toBe('Ichibankuji ONE PIECE')
  })

  it('returns empty for site-name-only or special-page titles', async () => {
    const { cleanProductTitle } = await import('@/lib/data')
    expect(cleanProductTitle('一番くじ倶楽部')).toBe('')
    expect(cleanProductTitle('sugar pochette（シュガーポシェット）特設ページ | 一番くじ倶楽部')).toBe('')
  })

  it('keeps normal titles unchanged', async () => {
    const { cleanProductTitle } = await import('@/lib/data')
    expect(cleanProductTitle('一番くじ どうぶつの森')).toBe('一番くじ どうぶつの森')
    expect(cleanProductTitle('一番くじONLINE')).toBe('一番くじONLINE')
  })
})
