import { spawn } from 'child_process'
import path from 'path'
import { clearCache } from '@/lib/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const scriptPath = path.join(process.cwd(), 'scripts', 'update_kuji.py')
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('python', [scriptPath], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      })

      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      let buffer = ''
      proc.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`))
          } catch {
            // controller already closed
          }
        }
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8').trim()
        if (text) send({ type: 'warning', message: text })
      })

      proc.on('close', (code: number | null) => {
        if (buffer.trim()) {
          try {
            controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`))
          } catch { /* ignore */ }
        }
        if (code !== 0 && code !== null) {
          send({ type: 'error', message: `프로세스 비정상 종료 (코드: ${code})` })
        } else {
          clearCache()
        }
        try { controller.close() } catch { /* ignore */ }
      })

      proc.on('error', (err: Error) => {
        send({ type: 'error', message: `실행 오류: ${err.message}\n\npython 이 PATH에 있는지 확인하세요.` })
        try { controller.close() } catch { /* ignore */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
