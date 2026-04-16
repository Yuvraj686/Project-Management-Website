"""
TeamForge — Project & Task ORM Models

Tables:
    projects — top-level project records
    tasks    — individual work items assigned to project members
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Float,
    Enum as SAEnum,
    ForeignKey,
    Date,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class TaskStatus(str, enum.Enum):
    """Task lifecycle states."""
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class Project(Base):
    """A team project with a deadline and completion tracking."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    stack = Column(String(512), nullable=True, doc="Comma-separated tech stack tags")
    deadline = Column(DateTime(timezone=True), nullable=True)
    completion_pct = Column(Float, default=0.0, nullable=False, doc="0–100 float")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_projects")
    members = relationship("TeamMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    chat_rooms = relationship("ChatRoom", back_populates="project", cascade="all, delete-orphan")
    changelog_entries = relationship("ChangeLogEntry", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name}>"


class Task(Base):
    """A single work item within a project."""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(SAEnum(TaskStatus), nullable=False, default=TaskStatus.todo)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to])

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title} status={self.status}>"
