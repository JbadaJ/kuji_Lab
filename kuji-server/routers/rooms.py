import os

from fastapi import APIRouter, HTTPException, Header
from models.room import CreateRoomRequest, CreateRoomResponse, RoomSnapshot
from services import room_manager
from services.auth import verify_token
from services.rate_limit import check_rate_limit

router = APIRouter(prefix="/room", tags=["rooms"])

# Per-user room-creation cap (fixed window).
CREATE_RATE_LIMIT = int(os.getenv("ROOM_CREATE_RATE_LIMIT", "10"))
CREATE_RATE_WINDOW = int(os.getenv("ROOM_CREATE_RATE_WINDOW", "60"))


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization[len("Bearer ") :]


@router.post("", response_model=CreateRoomResponse)
async def create_room(
    req: CreateRoomRequest,
    authorization: str | None = Header(default=None),
):
    # Authenticate: identity comes from the signed token, NOT the request body,
    # so a client can neither create rooms unauthenticated nor spoof a user.
    claims = verify_token(_bearer_token(authorization))
    if not claims or not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = claims["sub"]
    user_name = claims.get("name") or "Anonymous"
    user_avatar = claims.get("picture")

    if not await check_rate_limit(
        f"create:{user_id}", CREATE_RATE_LIMIT, CREATE_RATE_WINDOW
    ):
        raise HTTPException(
            status_code=429, detail="Too many rooms created, slow down"
        )

    try:
        code = await room_manager.create_room(
            slug=req.slug,
            title=req.title,
            prizes=req.prizes,
            draws_per_turn=req.draws_per_turn,
            host_id=user_id,
            host_name=user_name,
            host_avatar=user_avatar,
            price_yen=req.price_yen,
        )
    except room_manager.RoomCodeAllocationError:
        raise HTTPException(
            status_code=503, detail="Could not allocate a room code, please retry"
        )

    snapshot = await room_manager.get_snapshot(code, user_id)
    return CreateRoomResponse(code=code, snapshot=snapshot)


@router.get("/{code}", response_model=RoomSnapshot)
async def get_room(code: str, user_id: str = "anonymous"):
    code = code.upper()
    snapshot = await room_manager.get_snapshot(code, user_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return snapshot
