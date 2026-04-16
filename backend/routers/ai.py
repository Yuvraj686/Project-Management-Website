"""
TeamForge — AI Router

Endpoints:
    POST /ai/review             — Full AI project review
    POST /ai/deadline-warning   — Context-aware deadline warning
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth_middleware import get_current_user
from models.project import Project, Task
from models.user import TeamMember, User
from schemas.ai import (
    AIReviewRequest,
    AIReviewResponse,
    DeadlineWarningRequest,
    DeadlineWarningResponse,
)
from services import ai_service

router = APIRouter()


async def _get_project_dict(project_id: int, db: AsyncSession) -> dict:
    """Load a project with its tasks and return a dict for AI functions."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.tasks))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_dicts = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status.value,
            "due_date": str(t.due_date) if t.due_date else None,
        }
        for t in project.tasks
    ]

    return {
        "name": project.name,
        "description": project.description or "",
        "stack": project.stack or "",
        "deadline": str(project.deadline) if project.deadline else "Not set",
        "completion_pct": project.completion_pct,
        "tasks": task_dicts,
    }


@router.post("/review", response_model=AIReviewResponse)
async def ai_review(
    payload: AIReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a comprehensive AI review for a project.

    Ensures the requesting user is a member of the project before calling Claude.
    """
    # Check membership
    member = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == payload.project_id)
        .where(TeamMember.user_id == current_user.id)
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    project_dict = await _get_project_dict(payload.project_id, db)
    if payload.extra_context:
        project_dict["extra_context"] = payload.extra_context

    try:
        review = await ai_service.review_project(project_dict)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    return AIReviewResponse(review=review, project_id=payload.project_id)


@router.post("/deadline-warning", response_model=DeadlineWarningResponse)
async def ai_deadline_warning(
    payload: DeadlineWarningRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a smart, specific deadline warning for a project.
    """
    from datetime import datetime, timezone

    member = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == payload.project_id)
        .where(TeamMember.user_id == current_user.id)
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    project_dict = await _get_project_dict(payload.project_id, db)

    # Calculate days remaining
    days_remaining = None
    if project_dict["deadline"] != "Not set":
        try:
            deadline_dt = datetime.fromisoformat(project_dict["deadline"])
            if deadline_dt.tzinfo is None:
                deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
            days_remaining = (deadline_dt - datetime.now(timezone.utc)).total_seconds() / 86400
            project_dict["days_remaining"] = days_remaining
        except ValueError:
            pass

    try:
        warning = await ai_service.generate_deadline_warning(project_dict)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    return DeadlineWarningResponse(
        warning=warning,
        project_id=payload.project_id,
        days_remaining=days_remaining,
    )
