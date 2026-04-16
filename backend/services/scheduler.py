"""
TeamForge — APScheduler Deadline Warning Scheduler

Runs a background job every hour that:
1. Queries all projects whose deadline is within 72 hours
2. Generates an AI deadline warning via ai_service
3. Broadcasts the warning to the project's Redis channel
4. Sends emails to all project members via email_service
5. Logs the warning in changelog_entries
"""

import asyncio
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import AsyncSessionLocal
from models.project import Project
from models.user import TeamMember, User
from models.changelog import ChangeLogEntry, ChangeSource
from services import ai_service, email_service, redis_service
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# ── Scheduler instance ───────────────────────────────────────────────────────
_scheduler = AsyncIOScheduler(timezone="UTC")


def start_scheduler() -> None:
    """Start the APScheduler and register the deadline check job."""
    _scheduler.add_job(
        _check_deadlines,
        trigger="interval",
        hours=1,
        id="deadline_check",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc),  # Run immediately on startup
    )
    _scheduler.start()


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)



async def _check_deadlines() -> None:
    """
    Core logic: find projects with deadlines ≤ 72 hours away and act on them.
    """
    now = datetime.now(timezone.utc)
    warning_threshold = now + timedelta(hours=72)

    async with AsyncSessionLocal() as db:
        # Fetch all at-risk projects with their members and tasks
        result = await db.execute(
            select(Project)
            .where(Project.deadline != None)
            .where(Project.deadline <= warning_threshold)
            .where(Project.deadline >= now)
            .options(
                selectinload(Project.members).selectinload(TeamMember.user),
                selectinload(Project.tasks),
            )
        )
        projects = result.scalars().all()

        for project in projects:
            days_remaining = (project.deadline - now).total_seconds() / 86400

            task_dicts = [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status.value,
                    "due_date": str(t.due_date) if t.due_date else None,
                }
                for t in project.tasks
            ]

            project_dict = {
                "name": project.name,
                "deadline": str(project.deadline),
                "completion_pct": project.completion_pct,
                "days_remaining": days_remaining,
                "tasks": task_dicts,
            }

            # Generate AI warning
            try:
                warning_text = await ai_service.generate_deadline_warning(project_dict)
            except Exception as exc:
                print(f"[scheduler] AI warning failed for project {project.id}: {exc}")
                warning_text = (
                    f"⚠️ Deadline in {days_remaining:.1f} days — {project.completion_pct:.0f}% complete."
                )

            # Broadcast to Redis channel
            channel = f"room:{project.id}"
            await redis_service.publish(channel, {
                "type": "deadline_warning",
                "room_id": project.id,
                "content": warning_text,
                "timestamp": now.isoformat(),
            })

            # Log to changelog
            entry = ChangeLogEntry(
                project_id=project.id,
                source=ChangeSource.manual,
                summary=f"[AUTO] Deadline Warning: {warning_text[:500]}",
                author="TeamForge Scheduler",
            )
            db.add(entry)

            # Email all project members
            for member in project.members:
                if member.user and member.user.email:
                    email_service.send_deadline_warning_email(
                        to_email=member.user.email,
                        project_name=project.name,
                        warning_text=warning_text,
                        days_remaining=days_remaining,
                    )

        await db.commit()
        print(f"[scheduler] Deadline check complete — {len(projects)} project(s) at risk.")
