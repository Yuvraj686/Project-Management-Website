"""
TeamForge — Project & Task Pydantic Schemas
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

from models.user import RoleEnum
from models.project import TaskStatus


class ProjectCreate(BaseModel):
    """Payload for creating a new project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    stack: Optional[str] = None
    deadline: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    """Payload for partially updating a project."""
    name: Optional[str] = None
    description: Optional[str] = None
    stack: Optional[str] = None
    deadline: Optional[datetime] = None
    completion_pct: Optional[float] = Field(None, ge=0, le=100)


class TeamMemberOut(BaseModel):
    """A flattened view of a team member with their user info."""
    id: int
    user_id: int
    project_id: int
    role: RoleEnum
    name: str
    email: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    """Full project representation returned to clients."""
    id: int
    name: str
    description: Optional[str]
    stack: Optional[str]
    deadline: Optional[datetime]
    completion_pct: float
    owner_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    """Payload for creating a task within a project."""
    title: str = Field(..., min_length=1, max_length=512)
    assigned_to: Optional[int] = None
    status: TaskStatus = TaskStatus.todo
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    """Payload for updating a task."""
    title: Optional[str] = None
    assigned_to: Optional[int] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None


class TaskOut(BaseModel):
    """Task representation returned to clients."""
    id: int
    project_id: int
    title: str
    assigned_to: Optional[int]
    status: TaskStatus
    due_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    """Payload for adding a user to a project."""
    user_id: int
    role: RoleEnum = RoleEnum.viewer
