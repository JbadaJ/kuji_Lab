# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
kuji_Lab/
├── kuji-lab/      # Next.js 16 frontend (App Router)
├── kuji-server/   # FastAPI + Redis room server (WebSocket multiplayer)
└── missing_counts.csv  # analysis of products missing per-grade ticket counts
```

All three planned phases are **implemented**: search/browse, solo simulator, and room mode.

## Project Status (updated 2026-07-23)

**Deployed**: frontend live at **https://kuji-lab.vercel.app** (Vercel, root dir `kuji-lab`, auto-deploys on push). Room server NOT yet deployed (Railway pending — room mode inactive in production). OAuth provider apps NOT yet registered for the production domain (social login fails in production until redirect URIs + env vars are set; see DEPLOYMENT.md).

**Data** (2,571 products): per-grade ticket counts complete for 1,170, partial for ~754. Older products (2008–2021) cannot be filled — kujimap.com itself lacks the data; the simulator falls back to an estimated pool and labels odds as estimates. Weekly GitHub Actions (`update-data.yml`) scrapes new products + counts for current/next month and commits (production data updates happen ONLY this way — the admin update button cannot work on Vercel serverless).

**Known quirks**:
- 一番くじONLINE-exclusive product pages JS-redirect to on-line.1kuji.com; the scraper detects this and parses the static (no-JS) HTML instead. Such products have real title/banner but often `prize_count: 0` (prizes unpublished) → simulator disabled by design.
- 2 dead products (`godzilla_gold`, `godzilla_gold-2`) have placeholder titles and are hidden by the `BAD_TITLES` filter in `lib/data.ts`.

**Recent feature work**: tiered draw effects (grade × rarity × hidden-gem figure detection, `simulator/effects.ts`) and a synthesized sound engine (shared AudioContext, reverb, drag riser, volume/mute persisted to localStorage, `simulator/sound.ts`).

## Commands

### Frontend (from `kuji-lab/`)

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server (after build)
npm run lint     # Run ESLint
npm test         # Run vitest (tests/ — simulator core + utils)
```

### Room server (from `kuji-server/`)

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # requires Redis (REDIS_URL)
pip install -r requirements-dev.txt && python -m pytest tests/ -q   # unit tests
```

**Important:** `services/ticket_pool.py` must stay behaviorally identical to `buildPool()` in `kuji-lab/app/products/[slug]/simulator/core.ts` — both sides have unit tests asserting the same numbers; change them together.

### Data scrapers (from `kuji-lab/`)

```bash
pip install -r scripts/requirements.txt && python -m playwright install chromium
python scripts/update_kuji.py                        # scrape new products from 1kuji.com
python -X utf8 scripts/fetch_kujimap.py --search-only # fill per-grade ticket counts from kujimap.com
python scripts/fix_bad_titles.py                     # re-scrape products with broken titles
```

Environment variables for both apps are documented in `README.md`.

## Architecture

### Frontend — Next.js 16.2.3, App Router, Tailwind v4

**Important:** Next.js 16 has breaking changes from earlier versions. Before writing any Next.js-specific code, check `kuji-lab/node_modules/next/dist/docs/` for current APIs and conventions.

**Important:** There is no `src/` directory. `app/`, `data/`, `lib/`, `types/` are all at the project root (`kuji-lab/`). Path alias `@/*` maps to that root.

Key areas:

- `app/page.tsx` + `app/components/ProductGrid.tsx` + `app/hooks/useProductFilters.ts` — home page: fuzzy search (fuse.js), year/sale-type/IP filters
- `app/products/[slug]/page.tsx` + `ProductDetail.tsx` — product detail; simulator opens as a modal on this page (there is **no** separate `/simulate` route)
- `app/products/[slug]/simulator/` — simulator split into modules: `core.ts` (pool building, shuffling, share URLs — pure logic), `types.ts`, `effects.ts` (fireworks/sound), plus UI components (`SetupScreen`, `DrawPanels`, `RevealOverlay`, `AutoDraw`, `ProbabilityModal`, `LastOneOverlay`, `GradeStatus`, `TicketCard`)
- `app/room/` — room mode lobby and room pages; `app/hooks/useRoomSocket.ts` talks WebSocket to kuji-server; `app/api/room/*` proxies room create/validate and issues signed tokens (`ROOM_TOKEN_SECRET` shared with kuji-server)
- `app/api/auth/[...nextauth]` + `auth.ts` — Auth.js v5 OAuth login (Google/GitHub/Discord)
- `app/admin/` + `app/api/admin/*` + `app/api/update/route.ts` — admin panel (separate cookie auth: SHA-256 of `ADMIN_ID:ADMIN_PASSWORD`, enforced in `proxy.ts` — Next.js 16's renamed middleware convention). The update route **spawns `python scripts/update_kuji.py` as a child process** and streams progress via SSE — this only works where a Python runtime exists (local/self-hosted; not Vercel serverless)
- `lib/data.ts` — loads and caches all `data/kuji_products_*.json` files; `getValidProducts()` filters known-bad titles; `clearCache()` is called after admin updates
- `lib/i18n.ts` + `app/contexts/LanguageContext.tsx` — UI i18n, locales: `ko`, `ja`, `en`
- `lib/aliases.ts` — Korean/English title aliases per IP, used for search text and IP filter tags
- `app/contexts/ThemeContext.tsx` — dark mode (CSS variables in `app/globals.css`)

`next.config.ts` must keep `assets.1kuji.com` in `images.remotePatterns`.

### Room server — FastAPI + Redis (`kuji-server/`)

- `main.py` — app setup, CORS (`ALLOWED_ORIGINS`), background cleanup of rooms inactive 24h+
- `routers/rooms.py` — REST: create/validate rooms; `routers/ws.py` — WebSocket draw protocol
- `services/room_manager.py`, `services/ticket_pool.py`, `services/code_gen.py` — room state in Redis, shared ticket pool, room codes
- Auth: signed tokens minted by the frontend (`app/api/room/token`) using the shared `ROOM_TOKEN_SECRET`
- Deploy: `Dockerfile` + `railway.toml` (Railway), Redis via Upstash

## Data

### `kuji-lab/data/kuji_products_<year>.json` (2008–2026 + `unknown`)

Product data is split **per release year** (there is no single `kuji_all_products.json` anymore). ~2,570 products total. All files are merged at load time by `lib/data.ts`. Scrapers write back with the same per-year split (`save_by_year` in `scripts/fetch_kujimap.py`).

`data/notices.json` — site notices shown by `NoticesBell`, managed from the admin panel.

### Schema — see `types/kuji.ts` (source of truth)

`KujiProduct` as originally scraped, plus:

- `Prize.count?: number` — **real per-grade ticket count** from kujimap.com; `undefined` means unknown (simulator falls back to an estimated pool)
- `KujiProduct.kujimap_url?: string` — matched kujimap.com page
- `ProductSummary` — lightweight shape passed Server → Client for the home grid (includes `searchText` with aliases and `ipTags`)

### Simulator pool logic (`app/products/[slug]/simulator/core.ts`)

`buildPool()` uses **real counts** only when *every* regular (non-ラストワン) prize has `count > 0`; otherwise it estimates: prize at index i gets weight (i+1), scaled so the pool is ~80 tickets. UI surfaces `hasRealCounts` so users know if odds are real or estimated.

### Data quality notes

- Products with broken titles are filtered by the `BAD_TITLES` set in `lib/data.ts` (scraping failures that captured the site-wide page title); `scripts/fix_bad_titles.py` re-scrapes them
- ~2% have Korean-translated titles (wovn.io auto-translation) → valid but may look odd
- Some old products have `prize_count: 0` → show product but disable simulator
- `grade` may be `""` → fall back to parsing `full_name` via `getPrizeGrade` in `lib/utils.ts` (regex `/^([A-Z]賞|ラストワン賞)/`)
- Per-grade `count` coverage is **partial** (1,170/2,571 complete as of 2026-07-23); a full 185-month kujimap run was already done — remaining gaps are mostly 2008–2021 products missing on kujimap.com itself and cannot be scraped. `fetch_kujimap.py --search-only` skips already-complete products and saves incrementally, so re-running is safe

## Data Sources

- https://1kuji.com (official BANDAI SPIRITS site) — products, prizes, images (`assets.1kuji.com` CDN). List: `/products?sale_month=4&sale_year=2026`, detail: `/products/{slug}`
- https://kujimap.com — per-grade ticket counts (matched by WordPress search `/?s=keyword`, title similarity)

## Background: Ichiban Kuji (一番くじ)

A monthly lottery product by BANDAI SPIRITS sold at convenience stores in Japan. Each kuji has a fixed ticket pool (e.g. 80 tickets); every ticket wins a prize (A賞, B賞, … plus ラストワン賞 for the last ticket). Hundreds of anime/game IPs.
