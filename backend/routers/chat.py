"""
TeamForge — Chat WebSocket Router

WebSocket endpoint: GET /ws/chat/{room_id}

Flow:
    1. Client connects with JWT in query param (?token=<jwt>)
    2. Server validates token and verifies room membership
    3. Client subscribes to Redis channel `room:{room_id}`
    4. Incoming messages are persisted to PostgreSQL and published to Redis
    5. Redis subscriber task broadcasts messages to all connected clients
    6. On disconnect: tasks are cancelled and Redis is unsubscribed
"""

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from models.message import ChatMessage, ChatRoom
from models.user import TeamMember, User
from services.redis_service import get_redis, publish, cache_get

router = APIRouter()


async def _authenticate_ws(token: str) -> int | None:
    """Decode a JWT from a WebSocket query param and return user_id or None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


@router.websocket("/chat/{room_id}")
async def websocket_chat(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time chat in a project room.

    Query params:
        token: JWT access token for authentication.
    """
    # ── Authenticate ──────────────────────────────────────────────────────
    user_id = await _authenticate_ws(token)
    if user_id is None:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # ── Verify room exists and user has access ────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))
        room = result.scalar_one_or_none()
        if not room:
            await websocket.close(code=4004, reason="Room not found")
            return

        # Check project membership
        member = await db.execute(
            select(TeamMember)
            .where(TeamMember.project_id == room.project_id)
            .where(TeamMember.user_id == user_id)
        )
        if not member.scalar_one_or_none():
            await websocket.close(code=4003, reason="Not a project member")
            return

        # Fetch sender name
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        sender_name = user.name if user else "Unknown"

    await websocket.accept()

    redis = get_redis()
    channel = f"room:{room_id}"
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    async def _redis_listener():
        """Listen to Redis channel and forward messages to this WebSocket."""
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    listener_task = asyncio.create_task(_redis_listener())

    try:
        while True:
            data = await websocket.receive_text()
            now = datetime.now(timezone.utc)

            # Persist to database
            async with AsyncSessionLocal() as db:
                msg = ChatMessage(
                    room_id=room_id,
                    sender_id=user_id,
                    content=data,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            # Publish to Redis so all subscribers receive it
            payload = {
                "type": "message",
                "room_id": room_id,
                "sender_id": user_id,
                "sender_name": sender_name,
                "content": data,
                "timestamp": now.isoformat(),
            }
            await publish(channel, payload)

    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe(channel)
        await pubsub.close()
