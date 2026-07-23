import { readFileSync, readdirSync, statSync } from 'fs'
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

// 캐시는 반드시 globalThis에 저장한다. Turbopack이 이 모듈을 라우트(청크)마다
// 별도 사본으로 번들하므로, 모듈 변수로 두면 /api/update의 clearCache()가
// 페이지들이 쓰는 캐시 인스턴스를 비우지 못한다. 파일 stamp(mtime+size)를 함께
// 저장해 외부 스크립트가 데이터를 갱신한 경우에도 자동으로 다시 읽는다.
interface DataCache {
  products: KujiProduct[]
  stamp: string
}

const globalCache = globalThis as unknown as { __kujiDataCache?: DataCache | null }

function listDataFiles(dataDir: string): string[] {
  return readdirSync(dataDir)
    .filter(f => /^kuji_products_\w+\.json$/.test(f))
    .sort()
}

function computeStamp(dataDir: string, files: string[]): string {
  return files
    .map(f => {
      try {
        const s = statSync(join(dataDir, f))
        return `${f}:${s.mtimeMs}:${s.size}`
      } catch {
        return `${f}:missing`
      }
    })
    .join('|')
}

function loadAll(): KujiProduct[] {
  const dataDir = join(process.cwd(), 'data')
  const files = listDataFiles(dataDir)
  const stamp = computeStamp(dataDir, files)

  const cached = globalCache.__kujiDataCache
  if (cached && cached.stamp === stamp) return cached.products

  const all: KujiProduct[] = []
  for (const file of files) {
    try {
      const raw = readFileSync(join(dataDir, file), 'utf-8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        console.error(`[data] ${file}: expected array, got ${typeof parsed}`)
        continue
      }
      all.push(...(parsed as KujiProduct[]))
    } catch (err) {
      console.error(`[data] Failed to load ${file}:`, err)
    }
  }
  globalCache.__kujiDataCache = { products: all, stamp }
  return all
}

export function clearCache(): void {
  globalCache.__kujiDataCache = null
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
