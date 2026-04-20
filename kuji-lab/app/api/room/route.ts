/**
 * POST /api/room
 * Proxy: create a room on the FastAPI backend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ROOM_SERVER_URL } from '@/lib/room'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const payload = {
    ...body,
    user_id: session.user.id,
    user_name: session.user.name ?? 'Anonymous',
    user_avatar: session.user.image ?? null,
  }

  const res = await fetch(`${ROOM_SERVER_URL}/room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
