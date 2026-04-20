'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from 'next-auth'
import type { KujiProduct } from '@/types/kuji'
import { formatCode } from '@/lib/room'
import Image from 'next/image'

// ── Product search for room creation ─────────────────────────────────────────

function ProductSearch({
  preSlug,
  onSelect,
}: {
  preSlug?: string
  onSelect: (p: KujiProduct) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KujiProduct[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  return (
    <div className="space-y-2">
      <input
        className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder="一番くじ タイトルで検索..."
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
      />
      {loading && <p className="text-xs text-zinc-500 px-1">검색 중...</p>}
      {results.length > 0 && (
        <div className="rounded-xl border border-zinc-700 overflow-hidden divide-y divide-zinc-700/60">
          {results.map(p => (
            <button
              key={p.slug}
              onClick={() => { onSelect(p); setQuery(p.title); setResults([]) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 transition-colors text-left"
            >
              {p.banner_image_url && (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                  <Image src={p.banner_image_url} alt={p.title} fill className="object-cover" sizes="40px" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{p.title}</p>
                <p className="text-[10px] text-zinc-500">{p.prize_count}종 · {p.price_yen ? `¥${p.price_yen}` : '가격 미정'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Create room panel ─────────────────────────────────────────────────────────

function CreateRoomPanel({
  preSlug,
  onCreated,
}: {
  preSlug?: string
  onCreated: (code: string) => void
}) {
  const [selectedProduct, setSelectedProduct] = useState<KujiProduct | null>(null)
  const [drawsPerTurn, setDrawsPerTurn] = useState(1)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!selectedProduct) { setError('상품을 선택하세요'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedProduct.slug,
          title: selectedProduct.title,
          price_yen: selectedProduct.price_yen ?? null,
          prizes: selectedProduct.prizes,
          draws_per_turn: drawsPerTurn,
        }),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      onCreated(data.code)
    } catch {
      setError('방 생성에 실패했습니다. 서버를 확인하세요.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">상품 선택</p>
        <ProductSearch preSlug={preSlug} onSelect={setSelectedProduct} />
        {selectedProduct && (
          <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            선택됨: {selectedProduct.title}
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">턴당 뽑기 수</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawsPerTurn(v => Math.max(1, v - 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">−</button>
          <span className="text-lg font-bold tabular-nums text-white w-6 text-center">{drawsPerTurn}</span>
          <button onClick={() => setDrawsPerTurn(v => Math.min(10, v + 1))} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center">+</button>
          <span className="text-sm text-zinc-500">장 / 턴</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating || !selectedProduct}
        className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors"
      >
        {creating ? '방 생성 중...' : '방 만들기'}
      </button>
    </div>
  )
}

// ── Join room panel ───────────────────────────────────────────────────────────

function JoinRoomPanel({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) { setError('방 코드를 입력하세요'); return }
    setChecking(true)
    setError('')
    try {
      const res = await fetch(`/api/room/validate/${normalized}`)
      if (res.status === 404) { setError('방을 찾을 수 없습니다'); return }
      onJoin(normalized)
    } catch {
      setError('서버 연결에 실패했습니다')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">방 코드 입력</p>
        <input
          className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase tracking-widest font-bold"
          placeholder="BLUE-SHARK"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          maxLength={20}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={checking || !code.trim()}
        className="w-full py-3 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm transition-colors"
      >
        {checking ? '확인 중...' : '방 참가'}
      </button>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export default function RoomLobbyClient({
  session,
  preSlug,
}: {
  session: Session | null
  preSlug?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')

  function handleRoomReady(code: string) {
    router.push(`/room/${formatCode(code)}`)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-300 text-lg font-semibold">로그인이 필요합니다</p>
          <p className="text-zinc-500 text-sm">룸 모드를 사용하려면 소셜 계정으로 로그인하세요.</p>
          <a
            href="/api/auth/signin"
            className="inline-block px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
          >
            로그인
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-white">룸 모드</h1>
          <p className="text-sm text-zinc-500 mt-1">여럿이 함께 뽑기를 즐기세요</p>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
          {session.user.image && (
            <Image src={session.user.image} alt={session.user.name ?? ''} width={32} height={32} className="rounded-full" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
            <p className="text-[10px] text-zinc-500">{session.user.email}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'create' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            방 만들기
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'join' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            방 참가
          </button>
        </div>

        {/* Panel */}
        <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
          {tab === 'create'
            ? <CreateRoomPanel preSlug={preSlug} onCreated={handleRoomReady} />
            : <JoinRoomPanel onJoin={handleRoomReady} />
          }
        </div>
      </div>
    </div>
  )
}
