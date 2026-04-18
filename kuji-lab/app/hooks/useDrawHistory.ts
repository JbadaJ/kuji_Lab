'use client'

import { useState, useEffect, useCallback } from 'react'

export interface DrawSession {
  id: string
  slug: string
  title: string
  date: string                    // ISO timestamp
  totalDraws: number
  priceYen?: number
  tally: Record<string, number>   // grade → count (session draws only, no preset)
  finished: boolean
}

const STORAGE_KEY = 'kuji-history'
const MAX_SESSIONS = 50

export function useDrawHistory() {
  const [sessions, setSessions] = useState<DrawSession[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSessions(JSON.parse(stored))
    } catch {}
  }, [])

  const addSession = useCallback((session: DrawSession) => {
    setSessions(prev => {
      const next = [session, ...prev].slice(0, MAX_SESSIONS)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setSessions([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  return { sessions, addSession, clearHistory }
}
