/**
 * POST /api/room
 * Proxy: create a room on the FastAPI backend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ROOM_SERVER_URL } from '@/lib/room'
import { mintRoomToken } from '@/lib/roomToken'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let token: string
  try {
    token = await mintRoomToken({
      sub: session.user.id,
      name: session.user.name ?? 'Anonymous',
      picture: session.user.image ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Room service misconfigured' },
      { status: 500 }
    )
  }

  const body = await req.json()

  const res = await fetch(`${ROOM_SERVER_URL}/room`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
