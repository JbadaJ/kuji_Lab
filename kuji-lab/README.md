# Kuji Lab

Japanese Ichiban Kuji (lottery) product browser and draw simulator.

Browse 2,500+ kuji products from [1kuji.com](https://1kuji.com), search by IP/character, and simulate draws with realistic probability.

## Features

### Phase 1 - Search & Browse (Complete)
- Fuzzy search with fuse.js across 2,500+ products
- Filters: year, month, sale type, IP/character category
- Wishlist with localStorage persistence
- Responsive grid with pagination
- Dark mode & i18n (ko/ja/en)

### Phase 2 - Solo Draw Simulator (Complete)
- Weighted random sampling from ticket pool
- Three draw modes: default, random, custom preset
- Auto-draw with configurable speed and goal
- Animated reveal with effects and sound
- Probability calculator per grade
- Shareable URL with encoded settings
- Draw history tracking (localStorage)

### Phase 3 - Room Mode (In Progress)
- FastAPI + WebSocket backend (`kuji-server/`)
- Redis for shared room state
- Room creation and code-based join
- Turn-based multiplayer draw (WIP)

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Search | fuse.js |
| Auth | NextAuth v5 (Google, GitHub, Discord) |
| Backend | FastAPI, WebSocket, Redis |
| Data | Scraped from 1kuji.com via Playwright + BeautifulSoup |
| Deploy | Vercel (frontend), Railway (backend) |

## Getting Started

```bash
cd kuji-lab
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend (for Room Mode)

```bash
cd kuji-server
pip install -r requirements.txt
uvicorn main:app --reload
```

Requires Redis running locally or `REDIS_URL` in `.env`.

## Data

- `data/kuji_products_YYYY.json` - Products split by release year
- ~2,556 products total (2008-2026)
- Updated via admin panel (`/admin`) or `scripts/update_kuji.py`

## Project Structure

```
kuji-lab/
  app/
    page.tsx              # Home (search + product grid)
    products/[slug]/      # Product detail + simulator
    room/                 # Multiplayer room lobby
    admin/                # Admin panel
    api/                  # API routes (update, auth, room, notices)
  components/             # Shared UI components
  lib/                    # Data loading, i18n, aliases
  simulator/              # Draw simulator logic & UI
  data/                   # Product JSON files
  scripts/                # Scraper scripts
  types/                  # TypeScript definitions
kuji-server/              # FastAPI backend for Room Mode
```
