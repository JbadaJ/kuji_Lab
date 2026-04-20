import { auth } from '@/auth'
import RoomLobbyClient from './RoomLobbyClient'

interface Props {
  searchParams: Promise<{ slug?: string }>
}

export default async function RoomPage({ searchParams }: Props) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  return <RoomLobbyClient session={session} preSlug={sp.slug} />
}
