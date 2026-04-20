'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useRoomSocket } from '@/app/hooks/useRoomSocket'
import { displayCode } from '@/lib/room'
import type { DrawResult, MemberInfo } from '@/types/room'

// ── Grade styles (same as SimulatorModal) ─────────────────────────────────────
const GRADE_STYLE: Record<string, { badge: string; glow: string }> = {
  'A賞':          { badge: 'bg-yellow-400 text-yellow-900', glow: '#fbbf24' },
  'B賞':          { badge: 'bg-sky-500 text-white',         glow: '#38bdf8' },
  'C賞':          { badge: 'bg-emerald-500 text-white',     glow: '#34d399' },
  'D賞':          { badge: 'bg-orange-400 text-white',      glow: '#fb923c' },
  'E賞':          { badge: 'bg-pink-500 text-white',        glow: '#f472b6' },
  'F賞':          { badge: 'bg-violet-500 text-white',      glow: '#a78bfa' },
  'G賞':          { badge: 'bg-red-500 text-white',         glow: '#f87171' },
  'H賞':          { badge: 'bg-teal-500 text-white',        glow: '#2dd4bf' },
  'ラストワン賞': { badge: 'bg-amber-500 text-white',       glow: '#f59e0b' },
}
const DEFAULT_STYLE = { badge: 'bg-zinc-500 text-white', glow: '#888' }

function gradeLetter(grade: string) {
  const m = grade.match(/^([A-Z])賞$/)
  if (m) return `${m[1]}賞`
  if (grade === 'ラストワン賞') return '★賞'
  return grade
}

// ── Member avatar ─────────────────────────────────────────────────────────────

function Avatar({ member, size = 36, isHost }: { member: MemberInfo; size?: number; isHost: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className={`w-full h-full rounded-full overflow-hidden border-2 ${member.connected ? 'border-orange-500' : 'border-zinc-700 opacity-50'}`}>
        {member.avatar
          ? <Image src={member.avatar} alt={member.name} fill className="object-cover" sizes={`${size}px`} />
          : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">{member.name[0]}</div>
        }
      </div>
      {isHost && (
        <span className="absolute -top-1 -right-1 text-[9px]">👑</span>
      )}
    </div>
  )
}

// ── WaitingRoom ───────────────────────────────────────────────────────────────

function WaitingRoom({
  room,
  userId,
  isHost,
  send,
  onCopyCode,
  copied,
}: {
  room: NonNullable<ReturnType<typeof useRoomSocket>['room']>
  userId: string
  isHost: boolean
  send: (msg: object) => void
  onCopyCode: () => void
  copied: boolean
}) {
  const [drawsPerTurn, setDrawsPerTurn] = useState(room.draws_per_turn)

  function applySettings() {
    send({ type: 'change_settings', draws_per_turn: drawsPerTurn })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 max-w-md mx-auto w-full">
      {/* Room code */}
      <div className="text-center space-y-2">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">방 코드</p>
        <p className="text-3xl font-black text-white tracking-widest">{displayCode(room.code)}</p>
        <button
          onClick={onCopyCode}
          className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${copied ? 'border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
        >
          {copied ? '코드 복사됨!' : '코드 복사'}
        </button>
      </div>

      {/* Product info */}
      <div className="w-full px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
        <p className="text-sm font-semibold text-white">{room.title}</p>
        <p className="text-xs text-zinc-500 mt-1">{room.total_tickets}장 · {room.price_yen ? `¥${room.price_yen}/장` : '가격 미정'}</p>
      </div>

      {/* Members */}
      <div className="w-full space-y-2">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">참가자 ({room.members.length}명)</p>
        <div className="space-y-1.5">
          {room.members.map(m => (
            <div key={m.user_id} className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 ${!m.connected ? 'opacity-50' : ''}`}>
              <Avatar member={m} size={32} isHost={m.user_id === room.host_id} />
              <span className="text-sm text-white flex-1">{m.name}</span>
              {m.user_id === userId && <span className="text-[10px] text-zinc-500">나</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Host settings */}
      {isHost && (
        <div className="w-full space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">설정 (방장)</p>
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-800">
            <span className="text-sm text-zinc-300 flex-1">턴당 뽑기 수</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setDrawsPerTurn(v => Math.max(1, v - 1))} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">−</button>
              <span className="text-sm font-bold text-white w-5 text-center">{drawsPerTurn}</span>
              <button onClick={() => setDrawsPerTurn(v => Math.min(10, v + 1))} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">+</button>
            </div>
            <button onClick={applySettings} className="text-xs px-3 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">적용</button>
          </div>
        </div>
      )}

      {/* Start / wait message */}
      {isHost ? (
        <button
          onClick={() => send({ type: 'start_game' })}
          disabled={room.members.filter(m => m.connected).length < 1}
          className="w-full py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors"
        >
          게임 시작
        </button>
      ) : (
        <p className="text-sm text-zinc-500">방장이 게임을 시작하길 기다리는 중...</p>
      )}
    </div>
  )
}

// ── DrawResultCard ────────────────────────────────────────────────────────────

function DrawResultCard({ result, isMe }: { result: DrawResult; isMe: boolean }) {
  const style = GRADE_STYLE[result.grade] ?? DEFAULT_STYLE
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isMe ? 'border-orange-500/50 bg-orange-500/5' : 'border-zinc-700/50 bg-zinc-800/40'}`}>
      <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
        {gradeLetter(result.grade)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white truncate">{result.prize_name}</p>
        <p className="text-[10px] text-zinc-500">{result.user_name}</p>
      </div>
    </div>
  )
}

// ── ActiveRoom ────────────────────────────────────────────────────────────────

function ActiveRoom({
  room,
  userId,
  isMyTurn,
  turnsAllowed,
  timeoutAt,
  latestResult,
  send,
  isFinished,
}: {
  room: NonNullable<ReturnType<typeof useRoomSocket>['room']>
  userId: string
  isMyTurn: boolean
  turnsAllowed: number
  timeoutAt: string | null
  latestResult: DrawResult | null
  send: (msg: object) => void
  isFinished: boolean
}) {
  const [drawCount, setDrawCount] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  // Countdown timer
  useEffect(() => {
    if (!timeoutAt || !isMyTurn) { setSecondsLeft(null); return }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(timeoutAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [timeoutAt, isMyTurn])

  const currentQueue = room.queue[0]
  const currentMember = room.members.find(m => m.user_id === currentQueue)

  function handleDraw() {
    send({ type: 'draw', count: drawCount })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header strip */}
      <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 truncate">{room.title}</p>
          <p className="text-sm font-bold text-white">{displayCode(room.code)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-zinc-400 tabular-nums">{room.tickets_left}/{room.total_tickets}장 남음</span>
          {room.price_yen && (
            <span className="text-xs text-amber-400 font-semibold tabular-nums">
              ¥{((room.total_tickets - room.tickets_left) * room.price_yen).toLocaleString('ja-JP')}
            </span>
          )}
        </div>
      </div>

      {/* Pool bar */}
      <div className="flex-shrink-0 flex gap-1.5 px-4 py-2 bg-zinc-950 border-b border-zinc-800 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {Object.entries(room.pool).map(([grade, count]) => {
          const style = GRADE_STYLE[grade] ?? DEFAULT_STYLE
          return (
            <div key={grade} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${style.badge}`}>{gradeLetter(grade)}</span>
              <span className="text-[10px] font-bold text-white tabular-nums">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
        {/* Left: members + queue */}
        <div className="hidden sm:flex flex-col gap-3 w-56 flex-shrink-0 p-4 bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">참가자</p>
          {room.queue.map((uid, idx) => {
            const m = room.members.find(m => m.user_id === uid)
            if (!m) return null
            return (
              <div key={uid} className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${idx === 0 ? 'bg-orange-500/15 border border-orange-500/30' : 'bg-zinc-800/50'}`}>
                <Avatar member={m} size={28} isHost={m.user_id === room.host_id} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${idx === 0 ? 'text-orange-300' : 'text-zinc-300'}`}>{m.name}</p>
                  <p className="text-[9px] text-zinc-600">{m.draws_total}장 뽑음</p>
                </div>
                {idx === 0 && <span className="text-orange-400 text-[10px]">▶</span>}
              </div>
            )
          })}
          {/* Disconnected members not in queue */}
          {room.members.filter(m => !room.queue.includes(m.user_id)).map(m => (
            <div key={m.user_id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-zinc-800/30 opacity-50">
              <Avatar member={m} size={28} isHost={m.user_id === room.host_id} />
              <p className="text-xs text-zinc-500 truncate">{m.name}</p>
            </div>
          ))}
        </div>

        {/* Center: draw area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          {/* Current turn indicator */}
          <div className="text-center">
            {isMyTurn ? (
              <div className="space-y-1">
                <p className="text-2xl font-black text-orange-400">내 차례!</p>
                {secondsLeft !== null && (
                  <p className={`text-sm tabular-nums ${secondsLeft <= 10 ? 'text-red-400' : 'text-zinc-400'}`}>
                    {secondsLeft}초 남음
                  </p>
                )}
              </div>
            ) : currentMember ? (
              <div className="flex items-center gap-2 justify-center">
                <Avatar member={currentMember} size={28} isHost={currentMember.user_id === room.host_id} />
                <p className="text-sm text-zinc-300">
                  <span className="font-semibold text-white">{currentMember.name}</span>의 차례
                </p>
              </div>
            ) : null}
          </div>

          {/* Latest result card */}
          {latestResult && (
            <div className="w-full max-w-xs">
              <p className="text-[10px] text-zinc-500 text-center mb-2">방금 뽑은 결과</p>
              <div
                className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-3 shadow-xl`}
                style={{ borderColor: (GRADE_STYLE[latestResult.grade] ?? DEFAULT_STYLE).glow }}
              >
                {latestResult.prize_image && (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-800">
                    <Image src={latestResult.prize_image} alt={latestResult.prize_name} fill className="object-contain p-1" sizes="96px" />
                  </div>
                )}
                <span className={`text-sm font-black px-4 py-1 rounded-full ${(GRADE_STYLE[latestResult.grade] ?? DEFAULT_STYLE).badge}`}>
                  {gradeLetter(latestResult.grade)}
                </span>
                <p className="text-sm text-white text-center">{latestResult.prize_name}</p>
                <p className="text-[10px] text-zinc-500">by {latestResult.user_name}</p>
              </div>
            </div>
          )}

          {/* Draw controls */}
          {!isFinished && isMyTurn && (
            <div className="w-full max-w-xs space-y-3">
              {turnsAllowed > 1 && (
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={() => setDrawCount(v => Math.max(1, v - 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">−</button>
                  <span className="text-sm font-bold text-white w-16 text-center">{drawCount}장 뽑기</span>
                  <button onClick={() => setDrawCount(v => Math.min(turnsAllowed, v + 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">+</button>
                </div>
              )}
              <button
                onClick={handleDraw}
                className="w-full py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black text-base transition-all shadow-lg"
              >
                뽑기!
              </button>
              <button
                onClick={() => send({ type: 'skip_turn' })}
                className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                턴 넘기기
              </button>
            </div>
          )}

          {isFinished && (
            <div className="text-center space-y-3">
              <p className="text-2xl font-black text-white">🎉 모든 뽑기 완료!</p>
              <p className="text-sm text-zinc-500">총 {room.total_tickets}장 뽑았습니다</p>
            </div>
          )}
        </div>

        {/* Right: result feed */}
        <div className="hidden sm:flex flex-col w-60 flex-shrink-0 p-4 bg-zinc-900 border-l border-zinc-800 gap-3 overflow-hidden">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex-shrink-0">뽑기 기록 ({room.results.length})</p>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 min-h-0">
            {[...room.results].reverse().map(r => (
              <DrawResultCard key={r.seq} result={r} isMe={r.user_id === userId} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile draw button (floating) */}
      {!isFinished && isMyTurn && (
        <div className="sm:hidden flex-shrink-0 p-3 bg-zinc-950 border-t border-zinc-800">
          <button
            onClick={handleDraw}
            className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-black text-sm transition-all"
          >
            내 차례 — 뽑기!
          </button>
        </div>
      )}
    </div>
  )
}

// ── RoomPageClient ────────────────────────────────────────────────────────────

export default function RoomPageClient({
  code,
  userId,
  userName,
  userAvatar,
}: {
  code: string
  userId: string
  userName: string
  userAvatar: string | null
}) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  // Fetch short-lived JWT
  useEffect(() => {
    fetch('/api/room/token')
      .then(r => r.json())
      .then(d => setToken(d.token ?? null))
      .catch(() => setToken(null))
  }, [])

  const { room, status, latestResult, isMyTurn, turnsAllowed, timeoutAt, send, close } =
    useRoomSocket(code, token)

  const isHost = room?.host_id === userId
  const isFinished = room?.status === 'finished'

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }, [code])

  const handleLeave = useCallback(() => {
    send({ type: 'leave' })
    close()
    router.push('/room')
  }, [send, close, router])

  // Kicked
  useEffect(() => {
    if (status === 'closed') {
      router.push('/room')
    }
  }, [status, router])

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col text-white">
      {/* Global header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <button onClick={handleLeave} className="text-zinc-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-bold text-zinc-200 flex-1">룸 모드</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'connected' ? 'bg-emerald-500' : status === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-zinc-500">{status === 'connected' ? '연결됨' : status === 'reconnecting' ? '재연결 중...' : status === 'error' ? '연결 실패' : '연결 중...'}</span>
        </div>
      </div>

      {/* Content */}
      {!room ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm animate-pulse">방에 연결 중...</p>
        </div>
      ) : room.status === 'waiting' ? (
        <WaitingRoom
          room={room}
          userId={userId}
          isHost={isHost}
          send={send}
          onCopyCode={handleCopyCode}
          copied={codeCopied}
        />
      ) : (
        <ActiveRoom
          room={room}
          userId={userId}
          isMyTurn={isMyTurn}
          turnsAllowed={turnsAllowed}
          timeoutAt={timeoutAt}
          latestResult={latestResult}
          send={send}
          isFinished={isFinished}
        />
      )}
    </div>
  )
}
