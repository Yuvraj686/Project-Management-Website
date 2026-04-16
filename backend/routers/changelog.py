"""
TeamForge — Changelog Router

Endpoints:
    GET /changelog/{project_id}          — List changelog entries for a project
    GET /changelog/{project_id}/{entry_id} — Get a single entry
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.changelog import ChangeLogEntry, ChangeSource
from models.user import TeamMember, User

router = APIRouter()


class ChangeLogEntryOut(BaseModel):
    """Serialised changelog entry."""
    id: int
    project_id: int
    source: ChangeSource
    summary: str
    raw_diff: Optional[str]
    author: Optional[str]
    commit_sha: Optional[str]
    file_path: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{project_id}", response_model=List[ChangeLogEntryOut])
async def list_changelog(
    project_id: int,
    source: Optional[ChangeSource] = Query(None, description="Filter by source (github/vscode)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List changelog entries for a project in reverse chronological order.

    Optionally filter by source (github | vscode | manual).
    Supports pagination via limit/offset query params.
    """
    # Require project membership
    member = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .where(TeamMember.user_id == current_user.id)
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    query = (
        select(ChangeLogEntry)
        .where(ChangeLogEntry.project_id == project_id)
        .order_by(desc(ChangeLogEntry.created_at))
        .limit(limit)
        .offset(offset)
    )
    if source:
        query = query.where(ChangeLogEntry.source == source)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}/{entry_id}", response_model=ChangeLogEntryOut)
async def get_changelog_entry(
    project_id: int,
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single changelog entry including its raw diff."""
    member = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .where(TeamMember.user_id == current_user.id)
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    result = await db.execute(
        select(ChangeLogEntry)
        .where(ChangeLogEntry.id == entry_id)
        .where(ChangeLogEntry.project_id == project_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Changelog entry not found")
    return entry
