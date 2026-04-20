/**
 * GET /api/room/token
 * Returns a short-lived JWT signed with ROOM_TOKEN_SECRET.
 * The browser passes this to the FastAPI WebSocket as ?token=...
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(
  process.env.ROOM_TOKEN_SECRET ?? 'dev-secret-change-in-prod'
)

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await new SignJWT({
    sub: session.user.id,
    name: session.user.name ?? 'Anonymous',
    picture: session.user.image ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)

  return NextResponse.json({ token })
}
