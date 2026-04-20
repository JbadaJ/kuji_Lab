from fastapi import APIRouter, HTTPException
from models.room import CreateRoomRequest, CreateRoomResponse, RoomSnapshot
from services import room_manager

router = APIRouter(prefix="/room", tags=["rooms"])


@router.post("", response_model=CreateRoomResponse)
async def create_room(req: CreateRoomRequest):
    code = await room_manager.create_room(
        slug=req.slug,
        title=req.title,
        prizes=req.prizes,
        draws_per_turn=req.draws_per_turn,
        host_id=req.user_id,
        host_name=req.user_name,
        host_avatar=req.user_avatar,
        price_yen=req.price_yen,
    )
    snapshot = await room_manager.get_snapshot(code, req.user_id)
    return CreateRoomResponse(code=code, snapshot=snapshot)


@router.get("/{code}", response_model=RoomSnapshot)
async def get_room(code: str, user_id: str = "anonymous"):
    code = code.upper()
    snapshot = await room_manager.get_snapshot(code, user_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return snapshot
