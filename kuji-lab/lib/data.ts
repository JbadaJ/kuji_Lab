import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import type { KujiProduct, Prize, ProductSummary } from '@/types/kuji'
import { getAliases, getIpTags } from './aliases'

/**
 * 같은 상품 내 여러 상(prize)에서 동일하게 공유되는 첫 번째 이미지(시리즈 로고/타이틀)를
 * 제거한다. 스크래핑 시 페이지 상단 이미지가 각 상의 images[0]에 섞여 들어온 경우를 처리.
 */
function cleanPrizeImages(prizes: Prize[]): Prize[] {
  if (prizes.length < 2) return prizes

  const firstImgCount = new Map<string, number>()
  for (const p of prizes) {
    if (p.images[0]) firstImgCount.set(p.images[0], (firstImgCount.get(p.images[0]) ?? 0) + 1)
  }
  const sharedFirstImgs = new Set(
    [...firstImgCount.entries()].filter(([, cnt]) => cnt > 1).map(([url]) => url)
  )
  if (sharedFirstImgs.size === 0) return prizes

  return prizes.map(p => ({
    ...p,
    images: p.images[0] && sharedFirstImgs.has(p.images[0]) ? p.images.slice(1) : p.images,
  }))
}

let _cache: KujiProduct[] | null = null

function loadAll(): KujiProduct[] {
  if (_cache) return _cache
  const dataDir = join(process.cwd(), 'data')
  const files = readdirSync(dataDir)
    .filter(f => /^kuji_products_\w+\.json$/.test(f))
    .sort()
  const all: KujiProduct[] = []
  for (const file of files) {
    const products = JSON.parse(readFileSync(join(dataDir, file), 'utf-8')) as KujiProduct[]
    all.push(...products)
  }
  _cache = all
  return _cache
}

export function clearCache(): void {
  _cache = null
}

export function getValidProducts(): KujiProduct[] {
  const BAD_TITLES = new Set([
    '一番くじ倶楽部｜BANDAI SPIRITS公式 一番くじ情報サイト',
    '이치 반 쿠지 클럽 | BANDAI SPIRITS 공식 이치 반 쿠지 정보 사이트',
    'Ichibankuji Club | BANDAI SPIRITS Official Ichibankuji Information Site',
  ])
  return loadAll().filter(p => !!p.title && !BAD_TITLES.has(p.title))
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
  const p = loadAll().find(p => p.slug === slug)
  if (!p) return undefined
  return { ...p, prizes: cleanPrizeImages(p.prizes) }
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
