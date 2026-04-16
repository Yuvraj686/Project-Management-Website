"""
TeamForge — User & TeamMember ORM Models

Tables:
    users        — registered accounts
    team_members — many-to-many join between users and projects with a role
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class RoleEnum(str, enum.Enum):
    """Supported team member roles."""
    owner = "owner"
    dev = "dev"
    designer = "designer"
    pm = "pm"
    viewer = "viewer"


class User(Base):
    """Registered user account."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("ChatMessage", back_populates="sender", cascade="all, delete-orphan")
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class TeamMember(Base):
    """Associates a user with a project and assigns them a role."""

    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_user_project"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SAEnum(RoleEnum), nullable=False, default=RoleEnum.viewer)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="team_memberships")
    project = relationship("Project", back_populates="members")

    def __repr__(self) -> str:
        return f"<TeamMember user={self.user_id} project={self.project_id} role={self.role}>"
