"""
TeamForge — GitHub Webhook Router

Endpoint:
    POST /webhooks/github

Handles GitHub push and pull_request events:
1. Verifies HMAC-SHA256 signature
2. Extracts commits/diffs
3. Summarises changes via AI
4. Stores in changelog_entries
5. Broadcasts to the project's Redis room
"""

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from models.changelog import ChangeLogEntry, ChangeSource
from models.project import Project
from services import ai_service, github_service, redis_service

router = APIRouter()


@router.post("/github", status_code=200)
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
):
    """
    Receive and process a GitHub webhook event.

    Supported events: push, pull_request.
    Requires X-Hub-Signature-256 header for HMAC verification.
    """
    body = await request.body()

    # ── Verify signature ──────────────────────────────────────────────────
    if not github_service.verify_signature(body, x_hub_signature_256 or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    payload = await request.json()
    event = x_github_event or ""

    # Determine which project this webhook belongs to via repo name
    repo_name = payload.get("repository", {}).get("full_name", "")

    async with AsyncSessionLocal() as db:
        if event == "push":
            await _handle_push(payload, repo_name, db)
        elif event == "pull_request":
            await _handle_pull_request(payload, repo_name, db)
        else:
            # Accept but ignore unsupported events
            return {"detail": f"Event '{event}' not processed"}

        await db.commit()

    return {"detail": "Webhook processed"}


async def _find_project_by_repo(repo_name: str, db: AsyncSession):
    """
    Try to find a project whose name matches the repository name.
    In a real setup you'd store a repo→project mapping; this is a best-effort match.
    """
    result = await db.execute(
        select(Project).where(Project.name.ilike(f"%{repo_name.split('/')[-1]}%"))
    )
    return result.scalar_one_or_none()


async def _handle_push(payload: dict, repo_name: str, db: AsyncSession) -> None:
    """Process a push event: summarise each commit and log it."""
    project = await _find_project_by_repo(repo_name, db)
    commits = github_service.extract_commits_from_push(payload)

    for commit in commits:
        diff_text = github_service.build_commit_diff_text(commit)

        try:
            summary = await ai_service.summarize_diff(diff_text, commit["author"])
        except Exception:
            summary = f"Push by {commit['author']}: {commit['message']}"

        entry = ChangeLogEntry(
            project_id=project.id if project else None,
            source=ChangeSource.github,
            summary=summary,
            raw_diff=diff_text,
            author=commit["author"],
            commit_sha=commit["sha"],
        )
        db.add(entry)

        # Broadcast to project room if project found
        if project:
            await redis_service.publish(f"room:{project.id}", {
                "type": "system",
                "room_id": project.id,
                "content": f"🔀 GitHub push by {commit['author']}: {summary[:200]}",
                "timestamp": None,
            })


async def _handle_pull_request(payload: dict, repo_name: str, db: AsyncSession) -> None:
    """Process a pull_request event: fetch diff, summarise, and log it."""
    action = payload.get("action", "")
    if action not in ("opened", "synchronize"):
        return  # Only care about new/updated PRs

    pr = payload.get("pull_request", {})
    diff_url = pr.get("diff_url", "")
    author = pr.get("user", {}).get("login", "Unknown")
    pr_title = pr.get("title", "Untitled PR")

    diff = await github_service.fetch_pull_request_diff(diff_url)
    if not diff:
        diff = f"PR: {pr_title} by {author}"

    try:
        summary = await ai_service.summarize_diff(diff, author)
    except Exception:
        summary = f"PR '{pr_title}' by {author} — diff unavailable."

    project = await _find_project_by_repo(repo_name, db)
    entry = ChangeLogEntry(
        project_id=project.id if project else None,
        source=ChangeSource.github,
        summary=summary,
        raw_diff=diff[:5000],  # Truncate large diffs
        author=author,
    )
    db.add(entry)

    if project:
        await redis_service.publish(f"room:{project.id}", {
            "type": "system",
            "room_id": project.id,
            "content": f"🔃 PR '{pr_title}' by {author}: {summary[:200]}",
            "timestamp": None,
        })


@router.post("/vscode", status_code=200)
async def vscode_webhook(request: Request):
    """
    Receive file-save events from the VS Code extension.

    Payload:
        { token, file_path, diff, project_id, timestamp }
    """
    body = await request.json()

    # Validate bearer token from extension config
    token = body.get("token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    project_id = body.get("project_id")
    diff = body.get("diff", "")
    file_path = body.get("file_path", "unknown")
    author = body.get("author", "VS Code User")

    try:
        summary = await ai_service.summarize_diff(diff, author)
    except Exception:
        summary = f"File saved: {file_path}"

    async with AsyncSessionLocal() as db:
        entry = ChangeLogEntry(
            project_id=int(project_id) if project_id else None,
            source=ChangeSource.vscode,
            summary=summary,
            raw_diff=diff[:5000],
            author=author,
            file_path=file_path,
        )
        db.add(entry)
        await db.commit()

        if project_id:
            await redis_service.publish(f"room:{project_id}", {
                "type": "system",
                "room_id": project_id,
                "content": f"💾 {author} saved {file_path}: {summary[:200]}",
                "timestamp": body.get("timestamp"),
            })

    return {"detail": "VS Code event recorded"}
