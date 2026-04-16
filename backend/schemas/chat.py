"""
TeamForge — Chat Pydantic Schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ChatRoomCreate(BaseModel):
    """Payload for creating a chat room."""
    project_id: int
    name: Optional[str] = None
    is_private: bool = False
    member_ids: Optional[List[int]] = None


class ChatRoomOut(BaseModel):
    """Chat room representation."""
    id: int
    project_id: int
    name: Optional[str]
    is_private: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageOut(BaseModel):
    """A single chat message."""
    id: int
    room_id: int
    sender_id: int
    sender_name: Optional[str] = None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WebSocketMessage(BaseModel):
    """Message envelope sent/received over WebSocket."""
    type: str  # "message" | "system" | "typing" | "deadline_warning"
    room_id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    content: str
    timestamp: Optional[datetime] = None
