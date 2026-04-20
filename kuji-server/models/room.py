from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


class MemberInfo(BaseModel):
    user_id: str
    name: str
    avatar: Optional[str] = None
    joined_at: str
    draws_total: int = 0
    connected: bool = True


class DrawResult(BaseModel):
    seq: int
    user_id: str
    user_name: str
    grade: str
    prize_name: str
    prize_image: Optional[str] = None
    tickets_left: int
    drawn_at: str


class GradeTally(BaseModel):
    grade: str
    count: int


class RoomSnapshot(BaseModel):
    code: str
    slug: str
    title: str
    price_yen: Optional[int] = None
    status: Literal["waiting", "active", "finished"]
    draws_per_turn: int
    tickets_left: int
    total_tickets: int
    pool: dict[str, int]
    members: list[MemberInfo]
    queue: list[str]
    results: list[DrawResult]
    host_id: str
    you: str


class CreateRoomRequest(BaseModel):
    slug: str
    title: str
    price_yen: Optional[int] = None
    prizes: list[dict]   # raw Prize dicts from frontend
    draws_per_turn: int = 1
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None


class CreateRoomResponse(BaseModel):
    code: str
    snapshot: RoomSnapshot
