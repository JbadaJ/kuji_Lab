'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Fuse from 'fuse.js'
import type { ProductSummary } from '@/types/kuji'
import { IP_CATEGORIES, IP_LIST, getDisplayName } from '@/lib/aliases'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { fmt } from '@/lib/i18n'
import { useTranslate } from '@/app/hooks/useTranslate'

interface Props {
  products: ProductSummary[]
  years: string[]
}

const PAGE_SIZE = 24

function normalizeSaleType(types: string[]): string[] {
  return types.map(t => {
    if (t.includes('店頭') || t.includes('Store') || t.includes('매장') || t.includes('점포')) return '店頭販売'
    if (t.includes('オンライン') || t.includes('online') || t.includes('온라인')) return 'オンライン販売'
    return t
  })
}

// Maps category ID → translation key in `t`
const CATEGORY_KEY: Record<string, keyof import('@/lib/i18n').Translations> = {
  shonen:    'categoryShonen',
  shoujo:    'categoryShoujo',
  games:     'categoryGames',
  robot:     'categoryRobot',
  tokusatsu: 'categoryTokusatsu',
  idol:      'categoryIdol',
  western:   'categoryWestern',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SaleBadge({ types }: { types: string[] }) {
  const { t } = useLanguage()
  const normalized = normalizeSaleType(types)
  return (
    <div className="flex gap-1 flex-wrap">
      {normalized.includes('店頭販売') && (
        <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
          {t.badgeStore}
        </span>
      )}
      {normalized.includes('オンライン販売') && (
        <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
          {t.badgeOnline}
        </span>
      )}
    </div>
  )
}

function ProductCard({ product, displayTitle }: { product: ProductSummary; displayTitle: string }) {
  const { t } = useLanguage()
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow border border-zinc-100 dark:border-zinc-700"
    >
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-700">
        {product.banner_image_url ? (
          <Image
            src={product.banner_image_url}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
            {t.gridNoImage}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <p className="text-sm font-medium leading-snug line-clamp-2 text-zinc-800 dark:text-zinc-100">
          {displayTitle}
        </p>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col gap-1">
            {product.release_date && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {product.release_date}
              </span>
            )}
            <div className="flex items-center gap-2">
              {product.price_yen && (
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  ¥{product.price_yen.toLocaleString()}
                </span>
              )}
              {product.prize_count > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {product.prize_count}種
                </span>
              )}
            </div>
          </div>
          <SaleBadge types={product.sale_type} />
        </div>
      </div>
    </Link>
  )
}

// ── IP Selector Panel ───────────────────────────────────────────────────────

interface IpPanelProps {
  selected: string
  onSelect: (id: string) => void
  onClose: () => void
  availableIds: Set<string>
}

function IpSelectorPanel({ selected, onSelect, onClose, availableIds }: IpPanelProps) {
  const { t, locale } = useLanguage()
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelQuery, setPanelQuery] = useState('')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filteredCategories = useMemo(() => {
    const q = panelQuery.trim().toLowerCase()
    return IP_CATEGORIES.map(({ category, entries }) => ({
      category,
      entries: entries.filter(e =>
        availableIds.has(e.id) &&
        (!q ||
          getDisplayName(e, locale).toLowerCase().includes(q) ||
          e.aliases.some(a => a.toLowerCase().includes(q)))
      ),
    })).filter(c => c.entries.length > 0)
  }, [panelQuery, availableIds])

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full mt-2 z-50 w-[90vw] max-w-4xl bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-700">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            value={panelQuery}
            onChange={e => setPanelQuery(e.target.value)}
            placeholder={t.filterSearchCharacter}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {selected && (
          <button
            onClick={() => { onSelect(''); onClose() }}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 whitespace-nowrap"
          >
            {t.filterClearSelection}
          </button>
        )}
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-72 px-4 py-3 flex flex-col gap-4">
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">{t.filterNoCharacterResults}</p>
        ) : (
          filteredCategories.map(({ category, entries }) => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                {t[CATEGORY_KEY[category] ?? 'categoryShonen']}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => { onSelect(entry.id); onClose() }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selected === entry.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {getDisplayName(entry, locale)}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ProductGrid({ products, years }: Props) {
  const { t, locale } = useLanguage()
  const [query, setQuery] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [saleFilter, setSaleFilter] = useState('all')
  const [ipFilter, setIpFilter] = useState('')
  const [ipPanelOpen, setIpPanelOpen] = useState(false)
  const [page, setPage] = useState(1)
  const ipButtonRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(
    () => new Fuse(products, { keys: ['searchText'], threshold: 0.35 }),
    [products]
  )

  const availableIpIds = useMemo(() => {
    const ids = new Set<string>()
    for (const p of products) for (const id of p.ipTags) ids.add(id)
    return ids
  }, [products])

  const availableMonths = useMemo(() => {
    if (yearFilter === 'all') return []
    return [
      ...new Set(
        products
          .filter(p => p.release_date?.startsWith(yearFilter))
          .map(p => p.release_date?.slice(5, 7))
          .filter((m): m is string => !!m)
      ),
    ].sort()
  }, [yearFilter, products])

  const filtered = useMemo(() => {
    let result = query.trim()
      ? fuse.search(query.trim()).map(r => r.item)
      : products

    if (yearFilter !== 'all') result = result.filter(p => p.release_date?.startsWith(yearFilter))
    if (monthFilter !== 'all') result = result.filter(p => p.release_date?.slice(5, 7) === monthFilter)
    if (saleFilter !== 'all') result = result.filter(p => normalizeSaleType(p.sale_type).includes(saleFilter))
    if (ipFilter) result = result.filter(p => p.ipTags.includes(ipFilter))

    return result
  }, [query, yearFilter, monthFilter, saleFilter, ipFilter, products, fuse])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length
  const selectedIpEntry = ipFilter ? IP_LIST.find(e => e.id === ipFilter) : null
  const selectedIpName = selectedIpEntry ? getDisplayName(selectedIpEntry, locale) : null

  // Translate visible card titles (cached — only new items trigger API calls)
  const visibleTitles = useMemo(() => visible.map(p => p.title), [visible])
  const { results: translatedTitles, loading: translatingTitles } = useTranslate(visibleTitles, locale)

  function reset(setter: (v: string) => void, v: string) {
    setter(v); setPage(1)
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
    }`

  return (
    <div className="flex flex-col gap-6">
      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1) }}
          placeholder={t.searchPlaceholder}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        {/* Year */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12 shrink-0">{t.filterYear}</span>
          {['all', ...years].map(y => (
            <button key={y} onClick={() => { reset(setYearFilter, y); setMonthFilter('all') }} className={filterBtn(yearFilter === y)}>
              {y === 'all' ? t.filterAll : y}
            </button>
          ))}
        </div>

        {/* Month */}
        {yearFilter !== 'all' && availableMonths.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12 shrink-0">{t.filterMonth}</span>
            {['all', ...availableMonths].map(m => (
              <button key={m} onClick={() => reset(setMonthFilter, m)} className={filterBtn(monthFilter === m)
                .replace('bg-indigo-600', 'bg-indigo-400').replace('bg-indigo-600', 'bg-indigo-400')}>
                {m === 'all' ? t.filterAll : `${m}月`}
              </button>
            ))}
          </div>
        )}

        {/* Sale type */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12 shrink-0">{t.filterType}</span>
          {([
            { value: 'all',       label: t.filterAll },
            { value: '店頭販売', label: t.filterStore },
            { value: 'オンライン販売', label: t.filterOnline },
          ] as const).map(({ value, label }) => (
            <button key={value} onClick={() => reset(setSaleFilter, value)} className={filterBtn(saleFilter === value)}>
              {label}
            </button>
          ))}
        </div>

        {/* IP / Character */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 w-12 shrink-0">{t.filterCharacter}</span>
          <div ref={ipButtonRef} className="relative">
            <button
              onClick={() => setIpPanelOpen(v => !v)}
              className={filterBtn(!!ipFilter) + ' flex items-center gap-1.5'}
            >
              {selectedIpName ?? t.filterSelectCharacter}
              <svg className={`w-3 h-3 transition-transform ${ipPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {ipPanelOpen && (
              <IpSelectorPanel
                selected={ipFilter}
                onSelect={id => { setIpFilter(id); setPage(1) }}
                onClose={() => setIpPanelOpen(false)}
                availableIds={availableIpIds}
              />
            )}
          </div>
          {ipFilter && (
            <button
              onClick={() => reset(setIpFilter, '')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t.filterClear}
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
        <span>
          {fmt(t.gridCount, { count: filtered.length })}
          {selectedIpName && <span> — {selectedIpName}</span>}
          {query && <span> — {fmt(t.gridSearchSuffix, { query })}</span>}
        </span>
        {translatingTitles && locale !== 'ja' && (
          <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {locale === 'ko' ? '번역 중...' : 'Translating...'}
          </span>
        )}
      </p>

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              displayTitle={translatedTitles[i] ?? p.title}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-400 dark:text-zinc-500">{t.gridEmpty}</div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-8 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            {t.gridLoadMore} ({fmt(t.gridRemaining, { count: filtered.length - visible.length })})
          </button>
        </div>
      )}
    </div>
  )
}
