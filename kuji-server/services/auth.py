"""Shared JWT auth for the room server.

Tokens are minted by the Next.js frontend (`app/api/room/token`) and signed with
ROOM_TOKEN_SECRET. The SAME secret must be configured on both sides.

There is no insecure fallback: the server refuses to start if ROOM_TOKEN_SECRET
is unset, so a predictable dev secret can never reach production.
"""
from __future__ import annotations

import os
from typing import Optional

from jose import jwt, JWTError

ALGORITHM = "HS256"

_secret = os.getenv("ROOM_TOKEN_SECRET")
if not _secret:
    raise RuntimeError(
        "ROOM_TOKEN_SECRET is not set. Generate one with `openssl rand -base64 32` "
        "and set the SAME value on the frontend and the room server."
    )
SECRET: str = _secret


def verify_token(token: str) -> Optional[dict]:
    """Return the JWT claims, or None if the token is missing/invalid/expired."""
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
