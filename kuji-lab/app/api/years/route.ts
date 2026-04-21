/**
 * GET /api/years           → { years: string[] }
 * GET /api/years?year=2026 → { months: string[] }  ("01"~"12")
 */
import { NextRequest, NextResponse } from 'next/server'
import { getValidProducts } from '@/lib/data'

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get('year')
  const products = getValidProducts()

  if (year) {
    const months = [
      ...new Set(
        products
          .filter(p => p.release_date?.startsWith(year))
          .map(p => p.release_date?.slice(5, 7))
          .filter((m): m is string => !!m)
      ),
    ].sort()
    return NextResponse.json({ months })
  }

  const years = [
    ...new Set(
      products
        .map(p => p.release_date?.slice(0, 4))
        .filter((y): y is string => !!y)
    ),
  ].sort((a, b) => b.localeCompare(a))

  return NextResponse.json({ years })
}
