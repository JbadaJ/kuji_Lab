'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useCallback, useEffect } from 'react'
import type { KujiProduct, Prize } from '@/types/kuji'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt, translateGrade, translateVariants } from '@/lib/i18n'
import { useTranslate } from '@/app/hooks/useTranslate'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import SimulatorModal from './SimulatorModal'

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="relative max-w-5xl max-h-[90vh] w-full h-full"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A賞': 'bg-yellow-400 text-yellow-900',
  'B賞': 'bg-sky-500 text-white',
  'C賞': 'bg-emerald-500 text-white',
  'D賞': 'bg-orange-400 text-white',
  'E賞': 'bg-pink-500 text-white',
  'F賞': 'bg-violet-500 text-white',
  'G賞': 'bg-red-500 text-white',
  'H賞': 'bg-teal-500 text-white',
  'I賞': 'bg-indigo-500 text-white',
  'ラストワン賞': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
}

function getGrade(prize: Prize): string {
  if (prize.grade) return prize.grade
  const match = prize.full_name.match(/^([A-Z]賞|ラストワン賞)/)
  return match ? match[1] : ''
}

function GradeBadge({ grade, locale }: { grade: string; locale: string }) {
  const color = GRADE_COLORS[grade] ?? 'bg-zinc-400 text-white'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${color}`}>
      {translateGrade(grade, locale as 'ko' | 'ja' | 'en') || '?'}
    </span>
  )
}

function formatReleaseDate(dateStr: string, locale: string): string {
  const match = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/)
  if (!match) return dateStr
  const [, year, month, day] = match
  const y = parseInt(year), m = parseInt(month), d = parseInt(day)
  if (locale === 'ja') return dateStr
  if (locale === 'ko') return `${y}년 ${m}월 ${d}일`
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${monthNames[m - 1]} ${d}, ${y}`
}

function normalizeSaleType(types: string[]): string[] {
  return types.map(t => {
    if (t.includes('店頭') || t.includes('Store') || t.includes('매장')) return '店頭販売'
    if (t.includes('オンライン') || t.includes('online') || t.includes('온라인')) return 'オンライン販売'
    return t
  })
}

// ── Prize list with API translation ──────────────────────────────────────────

function PrizeList({ prizes, locale, t, onImageClick }: {
  prizes: Prize[]
  locale: string
  t: ReturnType<typeof useLanguage>['t']
  onImageClick: (src: string, alt: string) => void
}) {
  // Build flat arrays for translation (names + descriptions interleaved)
  const names        = useMemo(() => prizes.map(p => p.name),        [prizes])
  const descriptions = useMemo(() => prizes.map(p => p.description ?? ''), [prizes])

  const { results: tNames, loading: loadingNames }        = useTranslate(names,        locale as 'ko' | 'ja' | 'en')
  const { results: tDescs, loading: loadingDescs }        = useTranslate(descriptions, locale as 'ko' | 'ja' | 'en')

  const loading = loadingNames || loadingDescs

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        {t.productPrizeList}
        <span className="text-sm font-normal text-zinc-400">({prizes.length}種)</span>
        {loading && (
          <span className="text-xs font-normal text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {locale === 'ko' ? '번역 중...' : locale === 'en' ? 'Translating...' : '翻訳中...'}
          </span>
        )}
      </h2>
      <div className="flex flex-col gap-2">
        {prizes.map((prize, i) => {
          const grade = getGrade(prize)
          const image = prize.images[0]
          const name  = tNames[i] ?? prize.name
          const desc  = tDescs[i] || undefined

          return (
            <div key={i} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              {image ? (
                <button
                  type="button"
                  onClick={() => onImageClick(image, prize.name)}
                  className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700 cursor-zoom-in"
                >
                  <Image src={image} alt={prize.name} fill className="object-cover" sizes="80px" />
                </button>
              ) : (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                  {t.productNoImage}
                </div>
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {grade && <GradeBadge grade={grade} locale={locale} />}
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 line-clamp-1">
                    {name}
                  </span>
                </div>
                {prize.variants && prize.variants > 1 && (
                  <span className="text-xs text-zinc-400">
                    {translateVariants(prize.variants, locale as 'ko' | 'ja' | 'en')}
                  </span>
                )}
                {prize.size && <span className="text-xs text-zinc-400">{prize.size}</span>}
                {desc && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                    {desc}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductDetail({ product }: { product: KujiProduct }) {
  const { t, locale } = useLanguage()
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const openLightbox = useCallback((src: string, alt: string) => setLightbox({ src, alt }), [])
  const closeLightbox = useCallback(() => setLightbox(null), [])

  const metaTexts = useMemo(
    () => [product.title, product.stores ?? ''],
    [product.title, product.stores]
  )
  const { results: metaTranslated } = useTranslate(metaTexts, locale as 'ko' | 'ja' | 'en')
  const translatedTitle  = metaTranslated[0] ?? product.title
  const translatedStores = metaTranslated[1] || product.stores

  const validPrizes = useMemo(
    () => product.prizes.filter(p => {
      const grade = getGrade(p)
      return grade !== '' || p.name !== product.title
    }),
    [product]
  )

  const saleTypes = normalizeSaleType(product.sale_type)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {simulatorOpen && (
        <SimulatorModal
          product={product}
          prizes={validPrizes}
          onClose={() => setSimulatorOpen(false)}
        />
      )}
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={closeLightbox} />}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.productBack}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              一番くじ Lab
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Banner */}
        {product.banner_image_url && (
          <button
            type="button"
            onClick={() => openLightbox(product.banner_image_url!, product.title)}
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 cursor-zoom-in"
          >
            <Image
              src={product.banner_image_url}
              alt={product.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </button>
        )}

        {/* Title & Meta */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
            {translatedTitle}
          </h1>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            {product.release_date && (
              <span>{t.productReleaseDate}：{formatReleaseDate(product.release_date, locale)}</span>
            )}
            {product.price_yen && (
              <span>{t.productPricePerDraw} ¥{product.price_yen.toLocaleString()}</span>
            )}
            {product.prize_count > 0 && (
              <span>{fmt(t.productPrizeCount, { count: product.prize_count })}</span>
            )}
          </div>

          {saleTypes.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {saleTypes.map((type, i) => (
                <span
                  key={i}
                  className={`px-2.5 py-1 text-xs rounded-full border font-medium ${
                    type === '店頭販売'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                      : type === 'オンライン販売'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {type === '店頭販売' ? t.badgeStore : type === 'オンライン販売' ? t.badgeOnline : type}
                </span>
              ))}
            </div>
          )}

          {translatedStores && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
              {t.productStores}：{translatedStores}
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={() => setSimulatorOpen(true)}
              disabled={validPrizes.length === 0}
              className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.productSimulator}
            </button>
          </div>
        </div>

        {/* Gallery */}
        {product.gallery_images.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{t.productGallery}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {product.gallery_images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openLightbox(url, `${product.title} gallery ${i + 1}`)}
                  className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-zoom-in"
                >
                  <Image
                    src={url}
                    alt={`${product.title} gallery ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prizes */}
        {validPrizes.length > 0 && (
          <PrizeList prizes={validPrizes} locale={locale} t={t} onImageClick={openLightbox} />
        )}
      </main>
    </div>
  )
}
