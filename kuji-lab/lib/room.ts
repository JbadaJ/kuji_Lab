import type { RoomSnapshot, DrawResult, GradeTally } from '@/types/room'

export const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL ?? 'http://localhost:8000'

/** Format room code for display: "BLUE-SHARK" */
export function formatCode(code: string): string {
  return code.toUpperCase()
}

/** Format code as human-friendly with spaces: "BLUE SHARK" */
export function displayCode(code: string): string {
  return code.toUpperCase().replace('-', ' · ')
}

export function getWsUrl(code: string, token: string): string {
  const base = ROOM_SERVER_URL.replace(/^http/, 'ws')
  return `${base}/ws/${code}?token=${encodeURIComponent(token)}`
}

export function computeGradeTally(results: DrawResult[]): GradeTally[] {
  const map = new Map<string, number>()
  for (const r of results) {
    map.set(r.grade, (map.get(r.grade) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => a.grade.localeCompare(b.grade))
}
