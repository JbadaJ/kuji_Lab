/**
 * Server-only helper: mint short-lived JWTs for the room server.
 * Signed with ROOM_TOKEN_SECRET (shared with kuji-server). There is no
 * insecure fallback — a missing secret throws so it can never ship a
 * predictable dev key to production.
 */
import { SignJWT } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.ROOM_TOKEN_SECRET
  if (!secret) {
    throw new Error('ROOM_TOKEN_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export interface RoomTokenClaims {
  sub: string
  name: string
  picture: string | null
}

/** Sign a 5-minute room token. Throws if ROOM_TOKEN_SECRET is unset. */
export async function mintRoomToken(claims: RoomTokenClaims): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getSecret())
}
