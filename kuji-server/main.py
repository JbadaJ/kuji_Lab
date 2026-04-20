import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import rooms, ws as ws_router
from services import room_manager


# ── Background stale-room cleanup ────────────────────────────────────────────

async def _cleanup_loop() -> None:
    """Delete rooms inactive for 24+ hours every 15 minutes."""
    from redis_client import get_redis
    while True:
        await asyncio.sleep(900)  # 15 min
        try:
            r = get_redis()
            # Scan for all room meta keys
            cursor = 0
            pattern = "room:*:meta"
            now = datetime.now(timezone.utc)
            while True:
                cursor, keys = await r.scan(cursor, match=pattern, count=100)
                for key in keys:
                    last_activity = await r.hget(key, "last_activity")
                    if last_activity:
                        try:
                            last_dt = datetime.fromisoformat(last_activity)
                            if now - last_dt > timedelta(hours=24):
                                code = key.split(":")[1]
                                await room_manager.delete_room(code)
                        except Exception:
                            pass
                if cursor == 0:
                    break
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()


# ── App ───────────────────────────────────────────────────────────────────────

allowed_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app = FastAPI(title="kuji-lab room server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)
app.include_router(ws_router.router)


@app.get("/health")
async def health():
    return {"ok": True}
