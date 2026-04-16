"""
TeamForge — AI Pydantic Schemas
"""

from typing import Optional
from pydantic import BaseModel


class AIReviewRequest(BaseModel):
    """Input for the AI project review endpoint."""
    project_id: int
    extra_context: Optional[str] = None


class AIReviewResponse(BaseModel):
    """AI-generated project review text."""
    review: str
    project_id: int


class DeadlineWarningRequest(BaseModel):
    """Input for the AI deadline warning endpoint."""
    project_id: int


class DeadlineWarningResponse(BaseModel):
    """AI-generated deadline warning."""
    warning: str
    project_id: int
    days_remaining: Optional[float] = None


class DiffSummaryRequest(BaseModel):
    """Input for summarising a code diff."""
    diff: str
    author: str
    project_id: int
