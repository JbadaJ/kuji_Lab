import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const FILE = join(process.cwd(), 'data', 'notices.json')

function readNotices() {
  return JSON.parse(readFileSync(FILE, 'utf-8')) as Notice[]
}

interface Notice {
  id: string
  type: 'info' | 'update' | 'warning'
  title: string
  body: string
  created_at: string
}

export async function GET() {
  const notices = readNotices().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return Response.json(notices)
}

export async function POST(req: NextRequest) {
  const { type, title, body } = await req.json() as Partial<Notice>

  if (!title?.trim() || !body?.trim()) {
    return Response.json({ error: '제목과 내용을 입력하세요.' }, { status: 400 })
  }

  const notice: Notice = {
    id: String(Date.now()),
    type: type ?? 'info',
    title: title.trim(),
    body: body.trim(),
    created_at: new Date().toISOString(),
  }

  const notices = readNotices()
  notices.push(notice)
  writeFileSync(FILE, JSON.stringify(notices, null, 2), 'utf-8')

  return Response.json(notice, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string }
  const notices = readNotices().filter(n => n.id !== id)
  writeFileSync(FILE, JSON.stringify(notices, null, 2), 'utf-8')
  return Response.json({ ok: true })
}
