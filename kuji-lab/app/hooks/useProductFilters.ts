'use client'

import { useState, useMemo, useEffect } from 'react'
import Fuse from 'fuse.js'
import type { ProductSummary } from '@/types/kuji'
import { normalizeSaleType } from '@/lib/utils'

export function useProductFilters(products: ProductSummary[]) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [saleFilter, setSaleFilter] = useState('all')
  const [ipFilter, setIpFilter] = useState('')
  const [page, setPage] = useState(1)

  // Read URL params after mount (client-only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') ?? '')
    setYearFilter(params.get('year') ?? 'all')
    setMonthFilter(params.get('month') ?? 'all')
    setSaleFilter(params.get('type') ?? 'all')
    setIpFilter(params.get('ip') ?? '')
    setMounted(true)
  }, [])

  // Sync filter state → URL (only after mount)
  useEffect(() => {
    if (!mounted) return
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (yearFilter !== 'all') params.set('year', yearFilter)
    if (monthFilter !== 'all') params.set('month', monthFilter)
    if (saleFilter !== 'all') params.set('type', saleFilter)
    if (ipFilter) params.set('ip', ipFilter)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [query, yearFilter, monthFilter, saleFilter, ipFilter, mounted])

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

  function resetAndSet(setter: (v: string) => void, v: string) {
    setter(v)
    setPage(1)
  }

  return {
    query, setQuery: (v: string) => { setQuery(v); setPage(1) },
    yearFilter, setYearFilter: (v: string) => { resetAndSet(setYearFilter, v); setMonthFilter('all') },
    monthFilter, setMonthFilter: (v: string) => resetAndSet(setMonthFilter, v),
    saleFilter, setSaleFilter: (v: string) => resetAndSet(setSaleFilter, v),
    ipFilter, setIpFilter: (v: string) => resetAndSet(setIpFilter, v),
    page, setPage,
    availableIpIds,
    availableMonths,
    filtered,
  }
}
