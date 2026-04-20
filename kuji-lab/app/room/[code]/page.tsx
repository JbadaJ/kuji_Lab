import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import RoomPageClient from './RoomPageClient'

interface Props {
  params: Promise<{ code: string }>
}

export default async function RoomPage({ params }: Props) {
  const [session, { code }] = await Promise.all([auth(), params])

  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=/room/${code}`)
  }

  return (
    <RoomPageClient
      code={code.toUpperCase()}
      userId={session.user.id}
      userName={session.user.name ?? 'Anonymous'}
      userAvatar={session.user.image ?? null}
    />
  )
}
