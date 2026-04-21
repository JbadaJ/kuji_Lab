/**
 * GET /api/search?q=...&limit=8
 * Simple title search for room creation product picker.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getValidProducts } from '@/lib/data'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim() ?? ''
  const year = req.nextUrl.searchParams.get('year') ?? ''
  const month = req.nextUrl.searchParams.get('month') ?? ''
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10))

  if (!q && !year) {
    return NextResponse.json({ results: [] })
  }

  let products = getValidProducts()

  if (year) products = products.filter(p => p.release_date?.startsWith(year))
  if (month) products = products.filter(p => p.release_date?.slice(5, 7) === month)
  if (q) products = products.filter(p => p.title.toLowerCase().includes(q))

  // year/month 브라우징: 최신순 정렬 / 텍스트 검색: 관련성순 유지
  if (!q && year) {
    products = [...products].sort((a, b) => {
      if (!a.release_date) return 1
      if (!b.release_date) return -1
      return b.release_date > a.release_date ? 1 : -1
    })
  }

  const results = products.slice(0, limit).map(p => ({
    slug: p.slug,
    title: p.title,
    release_date: p.release_date,
    prize_count: p.prize_count,
    price_yen: p.price_yen,
    banner_image_url: p.banner_image_url,
    prizes: p.prizes,
  }))

  return NextResponse.json({ results })
}
