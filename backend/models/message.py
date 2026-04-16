"""
TeamForge — Chat Room & Message ORM Models

Tables:
    chat_rooms    — project-scoped rooms (public or private DM)
    chat_messages — individual messages within a room
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    ARRAY,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class ChatRoom(Base):
    """A chat channel associated with a project."""

    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=True, doc="Human-readable room name (e.g. #general)")
    is_private = Column(Boolean, default=False, nullable=False, doc="True for DM rooms")
    # Stored as a comma-separated string for SQLite compatibility; use ARRAY for PostgreSQL
    member_ids = Column(Text, nullable=True, doc="Comma-separated user IDs for private rooms")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="chat_rooms")
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")

    def get_member_ids(self) -> list[int]:
        """Parse the comma-separated member_ids string into a list of ints."""
        if not self.member_ids:
            return []
        return [int(uid.strip()) for uid in self.member_ids.split(",") if uid.strip()]

    def set_member_ids(self, ids: list[int]) -> None:
        """Serialise a list of user IDs into the member_ids column."""
        self.member_ids = ",".join(str(i) for i in sorted(ids))

    def __repr__(self) -> str:
        return f"<ChatRoom id={self.id} project={self.project_id} private={self.is_private}>"


class ChatMessage(Base):
    """A single chat message posted by a user in a room."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} room={self.room_id} sender={self.sender_id}>"
