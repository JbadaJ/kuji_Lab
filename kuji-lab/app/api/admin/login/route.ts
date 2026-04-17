import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function computeToken(id: string, password: string): string {
  return createHash('sha256').update(`${id}:${password}`).digest('hex')
}

export async function POST(req: Request) {
  const { id, password } = await req.json()

  if (id !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 }
    )
  }

  const token = computeToken(id, password)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7일
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
