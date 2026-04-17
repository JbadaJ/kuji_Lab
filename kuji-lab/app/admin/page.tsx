'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type LogEntry = {
  type: 'progress' | 'done' | 'error' | 'warning'
  message: string
  percent?: number
}

type Status = 'idle' | 'running' | 'done' | 'error'

interface Notice {
  id: string
  type: 'info' | 'update' | 'warning'
  title: string
  body: string
  created_at: string
}

const TYPE_LABELS: Record<Notice['type'], string> = {
  info: '일반 공지',
  update: '업데이트',
  warning: '중요',
}

export default function AdminPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [percent, setPercent] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<{ added: number; updated: number; total: number } | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // ── 공지 관련 state ──
  const [notices, setNotices] = useState<Notice[]>([])
  const [noticeType, setNoticeType] = useState<Notice['type']>('info')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeBody, setNoticeBody] = useState('')
  const [noticeSaving, setNoticeSaving] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/notices').then(r => r.json()).then(setNotices).catch(() => {})
  }, [])

  async function submitNotice() {
    if (!noticeTitle.trim() || !noticeBody.trim()) return
    setNoticeSaving(true)
    setNoticeMsg(null)
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: noticeType, title: noticeTitle, body: noticeBody }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json() as Notice
      setNotices(prev => [created, ...prev])
      setNoticeTitle('')
      setNoticeBody('')
      setNoticeMsg({ ok: true, text: '공지가 등록되었습니다.' })
    } catch {
      setNoticeMsg({ ok: false, text: '등록 실패. 다시 시도해주세요.' })
    } finally {
      setNoticeSaving(false)
    }
  }

  async function deleteNotice(id: string) {
    await fetch('/api/notices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  function appendLog(entry: LogEntry) {
    setLogs(prev => [...prev, entry])
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function startUpdate() {
    setStatus('running')
    setPercent(0)
    setLogs([])
    setSummary(null)

    let res: Response
    try {
      res = await fetch('/api/update', { method: 'POST' })
    } catch (e) {
      appendLog({ type: 'error', message: `네트워크 오류: ${String(e)}` })
      setStatus('error')
      return
    }

    if (!res.body) {
      appendLog({ type: 'error', message: '스트림 응답 없음' })
      setStatus('error')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''

      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          const json = JSON.parse(line) as LogEntry & { added?: number; updated?: number; total?: number }
          appendLog(json)
          if (json.percent !== undefined) setPercent(json.percent)
          if (json.type === 'done') {
            setPercent(100)
            if (json.added !== undefined && json.total !== undefined) {
              setSummary({ added: json.added, updated: json.updated ?? 0, total: json.total })
            }
            setStatus('done')
          }
          if (json.type === 'error') setStatus('error')
        } catch {
          appendLog({ type: 'warning', message: line })
        }
      }
    }

    setStatus(prev => (prev === 'running' ? 'done' : prev))
  }

  const isRunning = status === 'running'

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">데이터 업데이트</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              1kuji.com 에서 신규 상품을 스크랩하여 kuji_all_products.json 에 추가합니다.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 버튼 */}
        <button
          onClick={startUpdate}
          disabled={isRunning}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-colors
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
            text-white disabled:cursor-not-allowed"
        >
          {isRunning ? '업데이트 중...' : '업데이트 시작'}
        </button>

        {/* 진행바 */}
        {status !== 'idle' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>진행률</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percent}%`,
                  backgroundColor:
                    status === 'error' ? '#ef4444' :
                    status === 'done'  ? '#22c55e' : '#3b82f6',
                }}
              />
            </div>
          </div>
        )}

        {/* 완료 요약 */}
        {status === 'done' && summary && (summary.added > 0 || summary.updated > 0) && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-3 space-y-0.5">
            {summary.added > 0 && (
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                신규 {summary.added}개 추가
              </p>
            )}
            {summary.updated > 0 && (
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                기존 {summary.updated}개 정보 업데이트
              </p>
            )}
            <p className="text-xs text-green-700 dark:text-green-400">
              총 {summary.total.toLocaleString()}개
            </p>
          </div>
        )}

        {status === 'done' && summary && summary.added === 0 && summary.updated === 0 && (
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">변경사항이 없습니다.</p>
          </div>
        )}

        {/* 로그 */}
        {logs.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-700 text-xs text-zinc-400 font-mono">
              로그
            </div>
            <div className="p-3 max-h-80 overflow-y-auto font-mono text-xs space-y-0.5">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === 'error'   ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    log.type === 'done'    ? 'text-green-400' :
                                             'text-zinc-300'
                  }
                >
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
        {/* ── 공지 작성 ── */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">공지 작성</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              사이트 상단 벨 아이콘에 표시됩니다.
            </p>
          </div>

          {/* 유형 선택 */}
          <div className="flex gap-2">
            {(Object.keys(TYPE_LABELS) as Notice['type'][]).map(t => (
              <button
                key={t}
                onClick={() => setNoticeType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  noticeType === t
                    ? t === 'warning' ? 'bg-yellow-500 border-yellow-500 text-white'
                    : t === 'update'  ? 'bg-green-600 border-green-600 text-white'
                    :                   'bg-blue-600 border-blue-600 text-white'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* 제목 */}
          <input
            type="text"
            placeholder="제목"
            value={noticeTitle}
            onChange={e => setNoticeTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* 내용 */}
          <textarea
            placeholder="내용"
            value={noticeBody}
            onChange={e => setNoticeBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={submitNotice}
              disabled={noticeSaving || !noticeTitle.trim() || !noticeBody.trim()}
              className="px-5 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors disabled:cursor-not-allowed"
            >
              {noticeSaving ? '등록 중...' : '공지 등록'}
            </button>
            {noticeMsg && (
              <p className={`text-sm ${noticeMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {noticeMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* ── 공지 목록 ── */}
        {notices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">등록된 공지 ({notices.length})</h3>
            {notices.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  n.type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                  n.type === 'update'  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                }`}>{TYPE_LABELS[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <button
                  onClick={() => deleteNotice(n.id)}
                  className="flex-shrink-0 text-zinc-400 hover:text-red-500 transition-colors"
                  aria-label="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
