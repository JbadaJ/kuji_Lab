/**
 * GET /api/search?q=...&limit=8
 * Simple title search for room creation product picker.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getValidProducts } from '@/lib/data'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim() ?? ''
  const limit = Math.min(20, parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10))

  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const products = getValidProducts()
  const results = products
    .filter(p => p.title.toLowerCase().includes(q))
    .slice(0, limit)
    .map(p => ({
      slug: p.slug,
      title: p.title,
      prize_count: p.prize_count,
      price_yen: p.price_yen,
      banner_image_url: p.banner_image_url,
      prizes: p.prizes,
    }))

  return NextResponse.json({ results })
}
