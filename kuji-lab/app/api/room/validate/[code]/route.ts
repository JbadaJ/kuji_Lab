/**
 * GET /api/room/validate/[code]
 * Check whether a room exists on the backend (lightweight check for join flow).
 */
import { NextRequest, NextResponse } from 'next/server'
import { ROOM_SERVER_URL } from '@/lib/room'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const res = await fetch(`${ROOM_SERVER_URL}/room/${code.toUpperCase()}`, {
    method: 'GET',
    next: { revalidate: 0 },
  })
  if (res.status === 404) {
    return NextResponse.json({ exists: false }, { status: 404 })
  }
  return NextResponse.json({ exists: true })
}
