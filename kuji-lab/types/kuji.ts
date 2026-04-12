export interface Prize {
  full_name: string
  grade: string
  name: string
  variants?: number
  size?: string
  description?: string
  images: string[]
}

export interface KujiProduct {
  url: string
  slug: string
  scraped_at: string
  title: string
  sale_type: string[]
  release_date?: string
  release_date_raw?: string
  price_yen?: number
  price_raw?: string
  stores?: string
  double_chance_period?: string
  banner_image_url?: string
  gallery_images: string[]
  prizes: Prize[]
  prize_count: number
}

// Lightweight version passed from Server → Client Component
export interface ProductSummary {
  slug: string
  title: string
  release_date?: string
  price_yen?: number
  prize_count: number
  banner_image_url?: string
  sale_type: string[]
  searchText: string   // title + Korean/English aliases, built server-side
  ipTags: string[]     // matched IP ids from aliases dictionary, used for IP filter
}

export interface TicketPool {
  [grade: string]: number
}

export interface SimulatorState {
  kuji: KujiProduct
  totalTickets: number
  pool: TicketPool
  drawn: Prize[]
  isFinished: boolean
}
