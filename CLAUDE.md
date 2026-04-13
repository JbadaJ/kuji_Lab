# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `kuji-lab/` directory:

```bash
cd kuji-lab

npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server (after build)
npm run lint     # Run ESLint
```

There are no tests configured in this project.

## Architecture

This is a Next.js 16.2.3 app using the App Router (`kuji-lab/app/`). The project is a web app for browsing Japanese kuji (lottery) products and running a draw simulator.

**Important:** Next.js 16 has breaking changes from earlier versions. Before writing any Next.js-specific code, check `kuji-lab/node_modules/next/dist/docs/` for current APIs and conventions.

**Important:** There is no `src/` directory. `app/`, `data/`, `types/` are all at the project root (`kuji-lab/`).

### Key files

- `kuji-lab/app/layout.tsx` — Root layout (Geist font, Tailwind)
- `kuji-lab/app/page.tsx` — Home page (search + product grid)
- `kuji-lab/app/products/[slug]/page.tsx` — Product detail page
- `kuji-lab/app/simulate/[slug]/page.tsx` — Draw simulator page (phase 2)
- `kuji-lab/app/globals.css` — Global styles with Tailwind v4 and CSS variables for dark mode
- `kuji-lab/data/kuji_all_products.json` — ~15MB dataset of 2,495 kuji products
- `kuji-lab/types/kuji.ts` — TypeScript type definitions

### Styling

Tailwind CSS v4 via PostCSS. Uses `@/*` path alias mapped to the `kuji-lab/` root.

---

## Project Background

### What is Ichiban Kuji (一番くじ)?

A monthly lottery product by BANDAI SPIRITS sold at convenience stores and toy shops in Japan. Each kuji has a fixed ticket pool (e.g. 80 tickets), and every ticket is a guaranteed win of a prize (A賞, B賞, ... ラストワン賞). Products are released monthly across hundreds of anime/game IPs (Dragon Ball, One Piece, Animal Crossing, etc.).

### Data Source

Scraped from https://1kuji.com (official BANDAI SPIRITS site) using Playwright + BeautifulSoup. URL patterns:
- Product list: `https://1kuji.com/products?sale_month=4&sale_year=2026`
- Product detail: `https://1kuji.com/products/{slug}`
- Image CDN: `https://assets.1kuji.com/uploads/...`

---

## Data Schema

### `kuji_all_products.json` — array of KujiProduct

```typescript
interface KujiProduct {
  url: string                // "https://1kuji.com/products/doubutsuno_mori6"
  slug: string               // "doubutsuno_mori6"
  scraped_at: string         // "2026-04-08T19:10:01.683910"
  title: string              // "一番くじ どうぶつの森 おかえり！ハッピーメモリーズ"
  sale_type: string[]        // ["店頭販売"] or ["オンライン販売"] or both
  release_date?: string      // "2026年04月04日"
  release_date_raw?: string  // raw text including double chance period
  price_yen?: number         // 790
  price_raw?: string         // "■メーカー希望小売価格：1回790円(税10％込)"
  stores?: string            // "ファミリーマート、Nintendo TOKYOなど"
  double_chance_period?: string
  banner_image_url?: string  // main product banner
  gallery_images: string[]   // additional gallery images
  prizes: Prize[]
  prize_count: number        // 8
}

interface Prize {
  full_name: string    // "A賞 つぶきち＆まめきちのティッシュケース"
  grade: string        // "A賞" — may be "" (empty) for some older products
  name: string         // "つぶきち＆まめきちのティッシュケース"
  variants?: number    // 1 (全N種)
  size?: string        // "約25cm"
  description?: string
  images: string[]     // prize image URLs
}
```

### Data quality issues to handle

- ~7.5% of products have no `title` (scraping failure) → **filter these out before rendering**
- ~2% have Korean-translated titles (wovn.io auto-translation) → treat as valid but may look odd
- ~2% have `prize_count: 0` with a valid title (old page structure) → show product but disable simulator
- `grade` field may be `""` → fall back to parsing `full_name` with regex `/^([A-Z]賞|ラストワン賞)/`
- Next.js `<Image>` requires `assets.1kuji.com` in `next.config.ts` remotePatterns

---

## Type Definitions (`types/kuji.ts`)

```typescript
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

// Used in simulator (phase 2)
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
```

---

## Planned Features by Phase

### Phase 1 — Search & Browse (current)

Build the product discovery experience. No backend needed — everything runs client-side from the JSON file.

**Pages to implement:**
- `app/page.tsx` — Search input + filter bar + product card grid
- `app/products/[slug]/page.tsx` — Product detail with prize list

**Features:**
- Load and index `kuji_all_products.json` at build time (use `import` or `fs.readFile` in Server Components)
- Fuzzy search with `fuse.js` on `title` field
- Filter by: release year, sale type (店頭/オンライン), has prizes
- Product card shows: banner image, title, release date, price, prize count
- Product detail shows: full prize list with images, gallery, "Start Simulator" button
- Filter out products where `!title`

**`next.config.ts` must include:**
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'assets.1kuji.com' }
  ]
}
```

### Phase 2 — Solo Draw Simulator

Client-side only. No backend.

- Build ticket pool from prize data (grade → quantity mapping)
- Set initial state: "start with N tickets already drawn"
- Weighted random sampling from remaining pool
- Animated result reveal per draw
- Remaining ticket visualization by grade
- Draw history (localStorage)
- Shareable URL with settings encoded as query params

### Phase 3 — Room Mode (future, needs backend)

- FastAPI + WebSocket server
- Redis for room state (ticket pool shared across users)
- Queue system: users join a room, take turns drawing N tickets
- Real-time broadcast of draw results to all room members
- Deploy: Vercel (frontend) + Railway (FastAPI + Redis)
