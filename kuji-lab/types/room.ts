// Mirror of kuji-server/models/room.py Pydantic models

export interface MemberInfo {
  user_id: string
  name: string
  avatar?: string | null
  joined_at: string
  draws_total: number
  connected: boolean
}

export interface DrawResult {
  seq: number
  user_id: string
  user_name: string
  grade: string
  prize_name: string
  prize_image?: string | null
  tickets_left: number
  drawn_at: string
}

export interface GradeTally {
  grade: string
  count: number
}

export interface RoomSnapshot {
  code: string
  slug: string
  title: string
  price_yen?: number | null
  status: 'waiting' | 'active' | 'finished'
  draws_per_turn: number
  tickets_left: number
  total_tickets: number
  pool: Record<string, number>
  members: MemberInfo[]
  queue: string[]
  results: DrawResult[]
  host_id: string
  you: string
}

// ── WebSocket events (server → client) ───────────────────────────────────────

export type RoomEvent =
  | { type: 'room_state' } & RoomSnapshot
  | { type: 'member_joined'; member: MemberInfo }
  | { type: 'member_left'; user_id: string; name?: string; reason?: string }
  | { type: 'game_started'; queue: string[] }
  | { type: 'your_turn'; draws_allowed: number; timeout_at: string }
  | { type: 'draw_result'; result: DrawResult; pool: Record<string, number> }
  | { type: 'turn_advanced'; user_id: string; reason: string; next_user_id: string | null }
  | { type: 'turn_skipped'; user_id: string; reason: string; next_user_id: string | null }
  | { type: 'pool_update'; pool: Record<string, number> }
  | { type: 'game_finished'; results_summary: GradeTally[] }
  | { type: 'host_transferred'; new_host_id: string }
  | { type: 'settings_changed'; draws_per_turn: number }
  | { type: 'kicked' }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong'; ts: number }
