from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel


# ── Client → Server ───────────────────────────────────────────────────────────

class AuthMsg(BaseModel):
    type: Literal["auth"] = "auth"
    token: str


class DrawMsg(BaseModel):
    type: Literal["draw"] = "draw"
    count: int = 1


class SkipTurnMsg(BaseModel):
    type: Literal["skip_turn"] = "skip_turn"


class LeaveMsg(BaseModel):
    type: Literal["leave"] = "leave"


class StartGameMsg(BaseModel):
    type: Literal["start_game"] = "start_game"


class KickMsg(BaseModel):
    type: Literal["kick"] = "kick"
    user_id: str


class ChangeSettingsMsg(BaseModel):
    type: Literal["change_settings"] = "change_settings"
    draws_per_turn: int


class PingMsg(BaseModel):
    type: Literal["ping"] = "ping"
    ts: int


# ── Server → Client ───────────────────────────────────────────────────────────

class WsEvent(BaseModel):
    type: str
    payload: Any


def make_event(type_: str, **kwargs: Any) -> dict:
    return {"type": type_, **kwargs}
