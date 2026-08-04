/**
 * GET /api/summaries
 * 홈 그리드가 지연 로드하는 전체 상품 요약 목록.
 * 데이터는 배포(주간 스크랩 커밋) 시에만 바뀌므로 CDN 캐시를 길게 잡는다.
 */
import { NextResponse } from 'next/server'
import { getProductSummaries } from '@/lib/data'

export async function GET() {
  return NextResponse.json(getProductSummaries(), {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
