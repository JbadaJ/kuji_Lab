import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge Runtime에서 Web Crypto API로 SHA-256 해시 계산
async function computeToken(id: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${id}:${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 페이지와 로그인 API는 통과
  if (pathname === '/admin/login') return NextResponse.next()
  if (pathname.startsWith('/api/admin/')) return NextResponse.next()

  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value
    const expected = await computeToken(
      process.env.ADMIN_ID ?? '',
      process.env.ADMIN_PASSWORD ?? ''
    )
    if (!session || session !== expected) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
