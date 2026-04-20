'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RoomSnapshot, RoomEvent, DrawResult, MemberInfo } from '@/types/room'
import { getWsUrl } from '@/lib/room'

export type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed'

export interface RoomState {
  room: RoomSnapshot | null
  status: WsStatus
  latestResult: DrawResult | null
  isMyTurn: boolean
  turnsAllowed: number
  timeoutAt: string | null
  send: (msg: object) => void
  close: () => void
}

const MAX_RETRIES = 5
const PING_INTERVAL_MS = 30_000

export function useRoomSocket(code: string, token: string | null): RoomState {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')
  const [latestResult, setLatestResult] = useState<DrawResult | null>(null)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [turnsAllowed, setTurnsAllowed] = useState(1)
  const [timeoutAt, setTimeoutAt] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const retries = useRef(0)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const closedManually = useRef(false)

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const close = useCallback(() => {
    closedManually.current = true
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    if (!token || !code) return
    closedManually.current = false

    function connect() {
      setWsStatus(retries.current === 0 ? 'connecting' : 'reconnecting')
      const ws = new WebSocket(getWsUrl(code, token!))
      wsRef.current = ws

      ws.onopen = () => {
        retries.current = 0
        setWsStatus('connected')
        pingTimer.current = setInterval(() => {
          send({ type: 'ping', ts: Date.now() })
        }, PING_INTERVAL_MS)
      }

      ws.onmessage = (ev) => {
        let event: RoomEvent
        try {
          event = JSON.parse(ev.data)
        } catch {
          return
        }
        applyEvent(event)
      }

      ws.onclose = () => {
        if (pingTimer.current) clearInterval(pingTimer.current)
        if (closedManually.current) {
          setWsStatus('closed')
          return
        }
        if (retries.current < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** retries.current, 16000)
          retries.current++
          setTimeout(connect, delay)
        } else {
          setWsStatus('error')
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    function applyEvent(event: RoomEvent) {
      switch (event.type) {
        case 'room_state': {
          const { type: _, ...snapshot } = event as RoomEvent & { type: 'room_state' }
          setRoom(snapshot as unknown as RoomSnapshot)
          break
        }
        case 'member_joined':
          setRoom(prev => {
            if (!prev) return prev
            const exists = prev.members.some(m => m.user_id === event.member.user_id)
            const members = exists
              ? prev.members.map(m => m.user_id === event.member.user_id ? event.member : m)
              : [...prev.members, event.member]
            return { ...prev, members }
          })
          break
        case 'member_left':
          setRoom(prev => {
            if (!prev) return prev
            return {
              ...prev,
              members: prev.members.map(m =>
                m.user_id === event.user_id ? { ...m, connected: false } : m
              ),
            }
          })
          break
        case 'game_started':
          setRoom(prev => prev ? { ...prev, status: 'active', queue: event.queue } : prev)
          break
        case 'your_turn':
          setIsMyTurn(true)
          setTurnsAllowed(event.draws_allowed)
          setTimeoutAt(event.timeout_at)
          break
        case 'draw_result':
          setLatestResult(event.result)
          setRoom(prev => {
            if (!prev) return prev
            return {
              ...prev,
              pool: event.pool,
              tickets_left: event.result.tickets_left,
              results: [...prev.results, event.result],
              members: prev.members.map(m =>
                m.user_id === event.result.user_id
                  ? { ...m, draws_total: m.draws_total + 1 }
                  : m
              ),
            }
          })
          break
        case 'turn_advanced':
        case 'turn_skipped':
          setIsMyTurn(false)
          setTimeoutAt(null)
          setRoom(prev => {
            if (!prev || !event.next_user_id) return prev
            const queue = [...prev.queue]
            const idx = queue.indexOf(event.user_id)
            if (idx >= 0) queue.splice(idx, 1)
            // Move front user to back (round-robin already done server-side)
            return { ...prev, queue: event.next_user_id ? [event.next_user_id, ...queue.filter(id => id !== event.next_user_id)] : queue }
          })
          break
        case 'game_finished':
          setRoom(prev => prev ? { ...prev, status: 'finished' } : prev)
          setIsMyTurn(false)
          setTimeoutAt(null)
          break
        case 'host_transferred':
          setRoom(prev => prev ? { ...prev, host_id: event.new_host_id } : prev)
          break
        case 'settings_changed':
          setRoom(prev => prev ? { ...prev, draws_per_turn: event.draws_per_turn } : prev)
          break
        case 'kicked':
          closedManually.current = true
          setWsStatus('closed')
          break
      }
    }

    connect()
    return () => {
      closedManually.current = true
      if (pingTimer.current) clearInterval(pingTimer.current)
      wsRef.current?.close()
    }
  }, [code, token]) // eslint-disable-line react-hooks/exhaustive-deps

  return { room, status: wsStatus, latestResult, isMyTurn, turnsAllowed, timeoutAt, send, close }
}
