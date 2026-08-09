/**
 * GET /api/room/token
 * Returns a short-lived JWT signed with ROOM_TOKEN_SECRET.
 * The browser passes this to the FastAPI WebSocket as ?token=...
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { mintRoomToken } from '@/lib/roomToken'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = await mintRoomToken({
      sub: session.user.id,
      name: session.user.name ?? 'Anonymous',
      picture: session.user.image ?? null,
    })
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json(
      { error: 'Room service misconfigured' },
      { status: 500 }
    )
  }
}
