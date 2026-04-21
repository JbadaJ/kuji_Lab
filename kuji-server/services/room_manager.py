"""
Room state management backed by Redis.

Key layout:
  room:{code}:meta       Hash  — room metadata
  room:{code}:pool       Hash  — grade → remaining count
  room:{code}:members    Hash  — user_id → JSON(MemberInfo)
  room:{code}:queue      List  — ordered user_id list (front = current turn)
  room:{code}:results    List  — JSON(DrawResult), newest at tail
  room:{code}:lock       String — ephemeral mutex (SET NX EX 5)
"""
from __future__ import annotations

import json
import asyncio
import random
from datetime import datetime, timezone
from typing import Optional

from redis_client import get_redis
from models.room import MemberInfo, DrawResult, RoomSnapshot, GradeTally
from services.code_gen import generate_code
from services.ticket_pool import build_pool, build_prize_info


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _key(code: str, part: str) -> str:
    return f"room:{code}:{part}"


# ── Low-level Redis helpers ───────────────────────────────────────────────────

async def _acquire_lock(code: str, timeout: int = 5) -> bool:
    r = get_redis()
    result = await r.set(_key(code, "lock"), "1", nx=True, ex=timeout)
    return result is not None


async def _release_lock(code: str) -> None:
    r = get_redis()
    await r.delete(_key(code, "lock"))


async def room_exists(code: str) -> bool:
    r = get_redis()
    return bool(await r.exists(_key(code, "meta")))


async def _get_meta(code: str) -> dict:
    r = get_redis()
    return await r.hgetall(_key(code, "meta"))


async def _get_pool(code: str) -> dict[str, int]:
    r = get_redis()
    raw = await r.hgetall(_key(code, "pool"))
    return {k: int(v) for k, v in raw.items()}


async def _get_members(code: str) -> list[MemberInfo]:
    r = get_redis()
    raw = await r.hgetall(_key(code, "members"))
    members = [MemberInfo(**json.loads(v)) for v in raw.values()]
    members.sort(key=lambda m: m.joined_at)
    return members


async def _get_queue(code: str) -> list[str]:
    r = get_redis()
    return await r.lrange(_key(code, "queue"), 0, -1)


async def _get_results(code: str, limit: int = 200) -> list[DrawResult]:
    r = get_redis()
    raw = await r.lrange(_key(code, "results"), -limit, -1)
    return [DrawResult(**json.loads(v)) for v in raw]


async def get_snapshot(code: str, viewer_id: str) -> Optional[RoomSnapshot]:
    if not await room_exists(code):
        return None
    meta, pool, members, queue, results = await asyncio.gather(
        _get_meta(code),
        _get_pool(code),
        _get_members(code),
        _get_queue(code),
        _get_results(code),
    )
    return RoomSnapshot(
        code=code,
        slug=meta["slug"],
        title=meta["title"],
        price_yen=int(meta["price_yen"]) if meta.get("price_yen") else None,
        status=meta["status"],
        draws_per_turn=int(meta["draws_per_turn"]),
        tickets_left=int(meta["tickets_left"]),
        total_tickets=int(meta["total_tickets"]),
        pool=pool,
        members=members,
        queue=queue,
        results=results,
        host_id=meta["host_id"],
        you=viewer_id,
    )


# ── Room creation ─────────────────────────────────────────────────────────────

async def create_room(
    slug: str,
    title: str,
    prizes: list[dict],
    draws_per_turn: int,
    host_id: str,
    host_name: str,
    host_avatar: Optional[str],
    price_yen: Optional[int],
) -> str:
    """Create a new room and return its code."""
    r = get_redis()

    # Generate unique code
    for _ in range(10):
        code = generate_code()
        if not await room_exists(code):
            break

    pool = build_pool(prizes)
    total_tickets = sum(pool.values())
    prize_info = build_prize_info(prizes)

    pipe = r.pipeline()

    # Meta
    meta: dict = {
        "slug": slug,
        "title": title,
        "draws_per_turn": str(draws_per_turn),
        "status": "waiting",
        "total_tickets": str(total_tickets),
        "tickets_left": str(total_tickets),
        "host_id": host_id,
        "created_at": _now(),
        "last_activity": _now(),
    }
    if price_yen is not None:
        meta["price_yen"] = str(price_yen)
    pipe.hset(_key(code, "meta"), mapping=meta)

    # Pool
    if pool:
        pipe.hset(_key(code, "pool"), mapping={k: str(v) for k, v in pool.items()})

    # Host as first member
    host_member = MemberInfo(
        user_id=host_id,
        name=host_name,
        avatar=host_avatar,
        joined_at=_now(),
        connected=True,
    )
    pipe.hset(_key(code, "members"), host_id, host_member.model_dump_json())

    # Prize info (grade → {name, image})
    if prize_info:
        pipe.delete(_key(code, "prize_info"))
        for grade, info in prize_info.items():
            pipe.hset(_key(code, "prize_info"), grade, json.dumps(info))

    # Expire all keys after 24h
    for part in ("meta", "pool", "members", "queue", "results", "prize_info"):
        pipe.expire(_key(code, part), 86400)

    await pipe.execute()
    return code


# ── Member management ─────────────────────────────────────────────────────────

async def join_room(
    code: str,
    user_id: str,
    user_name: str,
    user_avatar: Optional[str],
) -> Optional[MemberInfo]:
    """Add/reconnect a member. Returns MemberInfo, or None if room doesn't exist."""
    if not await room_exists(code):
        return None
    r = get_redis()
    existing = await r.hget(_key(code, "members"), user_id)
    if existing:
        member = MemberInfo(**json.loads(existing))
        member.connected = True
        await r.hset(_key(code, "members"), user_id, member.model_dump_json())
    else:
        member = MemberInfo(
            user_id=user_id,
            name=user_name,
            avatar=user_avatar,
            joined_at=_now(),
            connected=True,
        )
        await r.hset(_key(code, "members"), user_id, member.model_dump_json())
    await r.hset(_key(code, "meta"), "last_activity", _now())
    return member


async def get_prize_for_grade(code: str, grade: str) -> tuple[str, Optional[str]]:
    """Look up the prize name and image for a grade. Falls back to the grade string."""
    r = get_redis()
    raw = await r.hget(_key(code, "prize_info"), grade)
    if raw:
        info = json.loads(raw)
        return info.get("name") or grade, info.get("image")
    return grade, None


async def leave_room(code: str, user_id: str) -> None:
    r = get_redis()
    existing = await r.hget(_key(code, "members"), user_id)
    if existing:
        member = MemberInfo(**json.loads(existing))
        member.connected = False
        await r.hset(_key(code, "members"), user_id, member.model_dump_json())


async def kick_member(code: str, user_id: str) -> None:
    r = get_redis()
    await r.hdel(_key(code, "members"), user_id)
    await r.lrem(_key(code, "queue"), 0, user_id)


async def transfer_host_if_needed(code: str, left_user_id: str) -> Optional[str]:
    """If the leaving user was host, assign host to the oldest connected member."""
    r = get_redis()
    meta = await _get_meta(code)
    if meta.get("host_id") != left_user_id:
        return None
    members = await _get_members(code)
    connected = [m for m in members if m.connected and m.user_id != left_user_id]
    if not connected:
        return None
    new_host = connected[0]
    await r.hset(_key(code, "meta"), "host_id", new_host.user_id)
    return new_host.user_id


# ── Game lifecycle ────────────────────────────────────────────────────────────

async def start_game(code: str) -> list[str]:
    """Freeze the member order into the queue and set status=active."""
    r = get_redis()
    members = await _get_members(code)
    connected = [m for m in members if m.connected]
    queue = [m.user_id for m in connected]

    pipe = r.pipeline()
    pipe.delete(_key(code, "queue"))
    if queue:
        pipe.rpush(_key(code, "queue"), *queue)
    pipe.hset(_key(code, "meta"), mapping={"status": "active", "last_activity": _now()})
    await pipe.execute()
    return queue


async def finish_game(code: str) -> None:
    r = get_redis()
    await r.hset(_key(code, "meta"), "status", "finished")


# ── Drawing ───────────────────────────────────────────────────────────────────

async def draw_ticket(
    code: str,
    user_id: str,
    seq: int,
    # prize info resolved by caller from the kuji dataset
    grade: str,
    prize_name: str,
    prize_image: Optional[str],
) -> Optional[DrawResult]:
    """
    Atomically draw one ticket from the pool.
    Returns DrawResult on success, None if pool is empty or not user's turn.
    """
    acquired = False
    for _ in range(20):
        if await _acquire_lock(code):
            acquired = True
            break
        await asyncio.sleep(0.1)
    if not acquired:
        return None

    try:
        r = get_redis()

        # Validate it's user's turn
        queue = await _get_queue(code)
        if not queue or queue[0] != user_id:
            return None

        # Decrement pool
        pool = await _get_pool(code)
        if pool.get(grade, 0) <= 0:
            return None

        tickets_left = int(await r.hget(_key(code, "meta"), "tickets_left") or 0)
        if tickets_left <= 0:
            return None

        pipe = r.pipeline()
        pipe.hincrby(_key(code, "pool"), grade, -1)
        pipe.hincrby(_key(code, "meta"), "tickets_left", -1)
        pipe.hset(_key(code, "meta"), "last_activity", _now())

        # Increment member draw count
        raw_member = await r.hget(_key(code, "members"), user_id)
        if raw_member:
            member = MemberInfo(**json.loads(raw_member))
            member.draws_total += 1
            pipe.hset(_key(code, "members"), user_id, member.model_dump_json())

        result = DrawResult(
            seq=seq,
            user_id=user_id,
            user_name=member.name if raw_member else user_id,
            grade=grade,
            prize_name=prize_name,
            prize_image=prize_image,
            tickets_left=tickets_left - 1,
            drawn_at=_now(),
        )
        pipe.rpush(_key(code, "results"), result.model_dump_json())

        await pipe.execute()
        return result
    finally:
        await _release_lock(code)


async def advance_queue(code: str) -> Optional[str]:
    """Pop front of queue, push to back. Returns the new current user_id."""
    r = get_redis()
    uid = await r.lpop(_key(code, "queue"))
    if uid:
        # Only re-queue if member is still connected
        raw = await r.hget(_key(code, "members"), uid)
        if raw:
            m = MemberInfo(**json.loads(raw))
            if m.connected:
                await r.rpush(_key(code, "queue"), uid)
    queue = await _get_queue(code)
    return queue[0] if queue else None


async def get_draw_seq(code: str) -> int:
    """Get next sequence number for draw results."""
    r = get_redis()
    return await r.llen(_key(code, "results"))


# ── Pool helpers for caller ───────────────────────────────────────────────────

async def pick_random_grade(code: str) -> Optional[tuple[str, int]]:
    """Pick a random grade weighted by remaining ticket count. Returns (grade, tickets_left_after)."""
    pool = await _get_pool(code)
    available = [(g, c) for g, c in pool.items() if c > 0]
    if not available:
        return None
    grades = [g for g, c in available]
    weights = [c for _, c in available]
    chosen = random.choices(grades, weights=weights, k=1)[0]
    return chosen, sum(c for _, c in available) - 1


# ── Change settings ───────────────────────────────────────────────────────────

async def change_settings(code: str, draws_per_turn: int) -> None:
    r = get_redis()
    await r.hset(_key(code, "meta"), "draws_per_turn", str(draws_per_turn))


# ── Cleanup ───────────────────────────────────────────────────────────────────

async def delete_room(code: str) -> None:
    r = get_redis()
    pipe = r.pipeline()
    for part in ("meta", "pool", "members", "queue", "results", "lock"):
        pipe.delete(_key(code, part))
    await pipe.execute()
