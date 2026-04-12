import { readFileSync } from 'fs'
import { join } from 'path'
import type { KujiProduct, ProductSummary } from '@/types/kuji'
import { getAliases, getIpTags } from './aliases'

let _cache: KujiProduct[] | null = null

function loadAll(): KujiProduct[] {
  if (_cache) return _cache
  const filePath = join(process.cwd(), 'data', 'kuji_all_products.json')
  _cache = JSON.parse(readFileSync(filePath, 'utf-8')) as KujiProduct[]
  return _cache
}

export function getValidProducts(): KujiProduct[] {
  return loadAll().filter(p => !!p.title)
}

// Returns lightweight summaries sorted newest-first for the home page
export function getProductSummaries(): ProductSummary[] {
  return getValidProducts()
    .sort((a, b) => {
      if (!a.release_date) return 1
      if (!b.release_date) return -1
      return b.release_date > a.release_date ? 1 : -1
    })
    .map(p => {
      const aliases = getAliases(p.title)
      return {
        slug: p.slug,
        title: p.title,
        release_date: p.release_date,
        price_yen: p.price_yen,
        prize_count: p.prize_count,
        banner_image_url: p.banner_image_url,
        sale_type: p.sale_type,
        searchText: aliases.length > 0 ? `${p.title} ${aliases.join(' ')}` : p.title,
        ipTags: getIpTags(p.title),
      }
    })
}

export function getProductBySlug(slug: string): KujiProduct | undefined {
  return loadAll().find(p => p.slug === slug)
}

export function getAvailableYears(): string[] {
  return [
    ...new Set(
      getValidProducts()
        .map(p => p.release_date?.slice(0, 4))
        .filter((y): y is string => !!y)
    ),
  ].sort((a, b) => b.localeCompare(a))
}
