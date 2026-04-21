"""
WebSocket endpoint for room mode.

Connection flow:
  1. Browser opens wss://.../ws/{code}?token=...
  2. Server verifies JWT from query param
  3. Server joins user to room and sends room_state snapshot
  4. Server broadcasts member_joined to others
  5. Game events flow bidirectionally

Turn flow:
  start_game → your_turn (unicast) → draw → draw_result (broadcast)
  → turn_advanced → your_turn (unicast) → ...
"""
from __future__ import annotations

import asyncio
import json
import os
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import jwt, JWTError

from models.messages import make_event
from models.room import MemberInfo
from services import room_manager

router = APIRouter()

SECRET = os.getenv("ROOM_TOKEN_SECRET", "dev-secret-change-in-prod")
ALGORITHM = "HS256"
TURN_TIMEOUT_SECONDS = 60

# ── Connection registry ───────────────────────────────────────────────────────
# code → { user_id → WebSocket }
_connections: dict[str, dict[str, WebSocket]] = {}
# code → asyncio.Task (turn timeout)
_timeout_tasks: dict[str, asyncio.Task] = {}


def _get_ws(code: str, user_id: str) -> Optional[WebSocket]:
    return _connections.get(code, {}).get(user_id)


async def _send(ws: WebSocket, event: dict) -> None:
    try:
        await ws.send_text(json.dumps(event))
    except Exception:
        pass


async def _broadcast(code: str, event: dict, exclude: Optional[str] = None) -> None:
    for uid, ws in list(_connections.get(code, {}).items()):
        if uid != exclude:
            await _send(ws, event)


async def _unicast(code: str, user_id: str, event: dict) -> None:
    ws = _get_ws(code, user_id)
    if ws:
        await _send(ws, event)


# ── Auth helper ───────────────────────────────────────────────────────────────

def _verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Turn timeout ──────────────────────────────────────────────────────────────

async def _run_turn_timeout(code: str, user_id: str) -> None:
    await asyncio.sleep(TURN_TIMEOUT_SECONDS)
    # Still this user's turn?
    queue = await room_manager._get_queue(code)
    if not queue or queue[0] != user_id:
        return
    await _do_advance_turn(code, user_id, reason="timeout")


def _schedule_timeout(code: str, user_id: str) -> None:
    _cancel_timeout(code)
    task = asyncio.create_task(_run_turn_timeout(code, user_id))
    _timeout_tasks[code] = task


def _cancel_timeout(code: str) -> None:
    task = _timeout_tasks.pop(code, None)
    if task and not task.done():
        task.cancel()


# ── Turn helpers ──────────────────────────────────────────────────────────────

async def _announce_turn(code: str, meta: dict) -> None:
    """Send your_turn to current player."""
    queue = await room_manager._get_queue(code)
    if not queue:
        return
    current = queue[0]
    timeout_at = (datetime.now(timezone.utc) + timedelta(seconds=TURN_TIMEOUT_SECONDS)).isoformat()
    draws_per_turn = int(meta.get("draws_per_turn", 1))
    await _unicast(code, current, make_event(
        "your_turn",
        draws_allowed=draws_per_turn,
        timeout_at=timeout_at,
    ))
    _schedule_timeout(code, current)


async def _do_advance_turn(code: str, from_user_id: str, reason: str = "draw") -> None:
    next_uid = await room_manager.advance_queue(code)
    await _broadcast(code, make_event(
        "turn_advanced" if reason == "draw" else "turn_skipped",
        user_id=from_user_id,
        reason=reason,
        next_user_id=next_uid,
    ))
    if next_uid:
        meta = await room_manager._get_meta(code)
        await _announce_turn(code, meta)


# ── Main WebSocket handler ────────────────────────────────────────────────────

@router.websocket("/ws/{code}")
async def room_ws(
    websocket: WebSocket,
    code: str,
    token: str = Query(...),
):
    code = code.upper()

    # Verify token
    claims = _verify_token(token)
    if not claims:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id: str = claims.get("sub", "")
    user_name: str = claims.get("name", "Anonymous")
    user_avatar: Optional[str] = claims.get("picture")

    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Room must exist
    if not await room_manager.room_exists(code):
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    await websocket.accept()

    # Register connection
    _connections.setdefault(code, {})[user_id] = websocket

    # Join / reconnect
    member = await room_manager.join_room(code, user_id, user_name, user_avatar)
    if member is None:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    # Send current state to the newcomer
    snapshot = await room_manager.get_snapshot(code, user_id)
    await _send(websocket, make_event("room_state", **snapshot.model_dump()))

    # Broadcast member_joined to others
    await _broadcast(code, make_event("member_joined", member=member.model_dump()), exclude=user_id)

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            meta = await room_manager._get_meta(code)
            room_status = meta.get("status", "waiting")

            # ── ping ──
            if msg_type == "ping":
                await _send(websocket, make_event("pong", ts=msg.get("ts", 0)))

            # ── start_game ──
            elif msg_type == "start_game":
                if meta.get("host_id") != user_id:
                    await _send(websocket, make_event("error", code="FORBIDDEN", message="Only host can start"))
                    continue
                if room_status != "waiting":
                    await _send(websocket, make_event("error", code="INVALID_STATE", message="Game already started"))
                    continue
                queue = await room_manager.start_game(code)
                await _broadcast(code, make_event("game_started", queue=queue))
                if queue:
                    await _announce_turn(code, meta)

            # ── change_settings ──
            elif msg_type == "change_settings":
                if meta.get("host_id") != user_id:
                    await _send(websocket, make_event("error", code="FORBIDDEN", message="Only host can change settings"))
                    continue
                if room_status != "waiting":
                    await _send(websocket, make_event("error", code="INVALID_STATE", message="Cannot change settings mid-game"))
                    continue
                draws_per_turn = max(1, min(10, int(msg.get("draws_per_turn", 1))))
                await room_manager.change_settings(code, draws_per_turn)
                await _broadcast(code, make_event("settings_changed", draws_per_turn=draws_per_turn))

            # ── draw ──
            elif msg_type == "draw":
                if room_status != "active":
                    await _send(websocket, make_event("error", code="INVALID_STATE", message="Game not active"))
                    continue
                queue = await room_manager._get_queue(code)
                if not queue or queue[0] != user_id:
                    await _send(websocket, make_event("error", code="NOT_YOUR_TURN", message="Not your turn"))
                    continue

                draws_per_turn = int(meta.get("draws_per_turn", 1))
                count = max(1, min(draws_per_turn, int(msg.get("count", 1))))

                pool = await room_manager._get_pool(code)
                tickets_left = int(meta.get("tickets_left", 0))
                if tickets_left == 0:
                    await _send(websocket, make_event("error", code="POOL_EMPTY", message="No tickets left"))
                    continue

                count = min(count, tickets_left)
                _cancel_timeout(code)

                game_over = False
                for _ in range(count):
                    picked = await room_manager.pick_random_grade(code)
                    if not picked:
                        break
                    grade, _ = picked

                    prize_name, prize_image = await room_manager.get_prize_for_grade(code, grade)
                    seq = await room_manager.get_draw_seq(code) + 1

                    result = await room_manager.draw_ticket(
                        code=code,
                        user_id=user_id,
                        seq=seq,
                        grade=grade,
                        prize_name=prize_name,
                        prize_image=prize_image,
                    )
                    if result is None:
                        break

                    updated_pool = await room_manager._get_pool(code)
                    await _broadcast(code, make_event(
                        "draw_result",
                        result=result.model_dump(),
                        pool=updated_pool,
                    ))

                    new_left = int((await room_manager._get_meta(code)).get("tickets_left", 0))
                    if new_left == 0:
                        await room_manager.finish_game(code)
                        results_all = await room_manager._get_results(code, limit=10000)
                        tally = Counter(r.grade for r in results_all)
                        summary = [{"grade": g, "count": c} for g, c in sorted(tally.items())]
                        await _broadcast(code, make_event("game_finished", results_summary=summary))
                        game_over = True
                        break

                if not game_over:
                    await _do_advance_turn(code, user_id, reason="draw")

            # ── skip_turn ──
            elif msg_type == "skip_turn":
                if room_status != "active":
                    continue
                queue = await room_manager._get_queue(code)
                if not queue or queue[0] != user_id:
                    continue
                _cancel_timeout(code)
                await _do_advance_turn(code, user_id, reason="voluntary")

            # ── kick ──
            elif msg_type == "kick":
                if meta.get("host_id") != user_id:
                    continue
                target_id = msg.get("user_id")
                if target_id and target_id != user_id:
                    await room_manager.kick_member(code, target_id)
                    target_ws = _get_ws(code, target_id)
                    if target_ws:
                        await _send(target_ws, make_event("kicked"))
                        await target_ws.close()
                        _connections.get(code, {}).pop(target_id, None)
                    await _broadcast(code, make_event("member_left", user_id=target_id, reason="kicked"))

            # ── leave ──
            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    finally:
        _connections.get(code, {}).pop(user_id, None)
        await room_manager.leave_room(code, user_id)

        # Transfer host if needed
        new_host = await room_manager.transfer_host_if_needed(code, user_id)
        if new_host:
            await _broadcast(code, make_event("host_transferred", new_host_id=new_host))

        # If was current turn player, advance
        meta = await room_manager._get_meta(code)
        if meta.get("status") == "active":
            queue = await room_manager._get_queue(code)
            if queue and queue[0] == user_id:
                _cancel_timeout(code)
                await _do_advance_turn(code, user_id, reason="disconnect")

        await _broadcast(code, make_event("member_left", user_id=user_id, name=user_name))

        # Delete empty waiting room
        members = await room_manager._get_members(code)
        connected = [m for m in members if m.connected]
        if not connected and meta.get("status") == "waiting":
            await room_manager.delete_room(code)
