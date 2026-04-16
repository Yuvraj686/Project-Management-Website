"""
TeamForge — Projects Router

Endpoints:
    GET    /projects                         — List all projects the user belongs to
    POST   /projects                         — Create a new project
    GET    /projects/{project_id}            — Get a project by ID
    PUT    /projects/{project_id}            — Update a project
    DELETE /projects/{project_id}            — Delete a project (owner only)
    POST   /projects/{project_id}/members    — Add a member to a project
    DELETE /projects/{project_id}/members/{user_id} — Remove a member
    GET    /projects/{project_id}/tasks      — List tasks in a project
    POST   /projects/{project_id}/tasks      — Create a task
    PUT    /projects/{project_id}/tasks/{task_id}   — Update a task
    DELETE /projects/{project_id}/tasks/{task_id}   — Delete a task
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth_middleware import get_current_user
from models.project import Project, Task
from models.user import TeamMember, RoleEnum, User
from models.message import ChatRoom
from schemas.chat import ChatRoomCreate, ChatRoomOut
from schemas.project import (
    AddMemberRequest,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    TeamMemberOut,
)

router = APIRouter()


# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_project_or_404(project_id: int, db: AsyncSession) -> Project:
    """Fetch a project or raise 404."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _require_member(project_id: int, user_id: int, db: AsyncSession) -> TeamMember:
    """Ensure the user is a member of the project; raise 403 otherwise."""
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .where(TeamMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    return member


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all projects the authenticated user is a member of."""
    result = await db.execute(
        select(Project)
        .join(TeamMember, TeamMember.project_id == Project.id)
        .where(TeamMember.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project and add the creator as owner."""
    project = Project(
        name=payload.name,
        description=payload.description,
        stack=payload.stack,
        deadline=payload.deadline,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    # Auto-add creator as owner
    db.add(TeamMember(user_id=current_user.id, project_id=project.id, role=RoleEnum.owner))
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a project by ID. User must be a member."""
    await _require_member(project_id, current_user.id, db)
    return await _get_project_or_404(project_id, db)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project's metadata. User must be owner or pm."""
    member = await _require_member(project_id, current_user.id, db)
    if member.role not in (RoleEnum.owner, RoleEnum.pm):
        raise HTTPException(status_code=403, detail="Only owners and PMs can update projects")

    project = await _get_project_or_404(project_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project. Only the owner can do this."""
    project = await _get_project_or_404(project_id, db)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete it")
    await db.delete(project)


# ── Members ───────────────────────────────────────────────────────────────────

@router.post("/{project_id}/members", status_code=201)
async def add_member(
    project_id: int,
    payload: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a user to a project. Only owners and PMs can invite."""
    member = await _require_member(project_id, current_user.id, db)
    if member.role not in (RoleEnum.owner, RoleEnum.pm):
        raise HTTPException(status_code=403, detail="Only owners and PMs can add members")

    existing = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .where(TeamMember.user_id == payload.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member")

    db.add(TeamMember(user_id=payload.user_id, project_id=project_id, role=payload.role))
    return {"detail": "Member added"}


@router.delete("/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a project."""
    member = await _require_member(project_id, current_user.id, db)
    if member.role not in (RoleEnum.owner, RoleEnum.pm):
        raise HTTPException(status_code=403, detail="Only owners and PMs can remove members")

    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .where(TeamMember.user_id == user_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(target)


@router.get("/{project_id}/members", response_model=List[TeamMemberOut])
async def list_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members of a project."""
    await _require_member(project_id, current_user.id, db)
    
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .options(selectinload(TeamMember.user))
    )
    members = result.scalars().all()
    
    # Map to TeamMemberOut
    return [
        TeamMemberOut(
            id=m.id,
            user_id=m.user_id,
            project_id=m.project_id,
            role=m.role,
            name=m.user.name,
            email=m.user.email,
            joined_at=m.joined_at
        )
        for m in members
    ]


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/tasks", response_model=List[TaskOut])
async def list_tasks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tasks for a project."""
    await _require_member(project_id, current_user.id, db)
    result = await db.execute(select(Task).where(Task.project_id == project_id))
    return result.scalars().all()


@router.post("/{project_id}/tasks", response_model=TaskOut, status_code=201)
async def create_task(
    project_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task in a project."""
    await _require_member(project_id, current_user.id, db)
    task = Task(project_id=project_id, **payload.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.put("/{project_id}/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update task fields."""
    await _require_member(project_id, current_user.id, db)
    result = await db.execute(
        select(Task).where(Task.id == task_id).where(Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.refresh(task)
    return task


@router.delete("/{project_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    await _require_member(project_id, current_user.id, db)
    result = await db.execute(
        select(Task).where(Task.id == task_id).where(Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)


# ── Chat Rooms ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/rooms", response_model=List[ChatRoomOut])
async def list_project_rooms(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all accessible chat rooms for a project.
    - Public channels are visible to all members.
    - Private DM rooms are only visible if the user is in member_ids.
    """
    await _require_member(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ChatRoom).where(ChatRoom.project_id == project_id)
    )
    rooms = result.scalars().all()
    
    visible_rooms = []
    for r in rooms:
        if not r.is_private:
            visible_rooms.append(r)
        else:
            member_ids = r.get_member_ids()
            if current_user.id in member_ids:
                visible_rooms.append(r)
                
    return visible_rooms


@router.post("/{project_id}/rooms", response_model=ChatRoomOut, status_code=201)
async def create_or_get_room(
    project_id: int,
    payload: ChatRoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new chat room or return an existing one (for DMs).
    """
    await _require_member(project_id, current_user.id, db)
    
    # For DMs, check if a room already exists between these members
    if payload.is_private and payload.member_ids:
        # Ensure current user is in member_ids if not already
        mids = payload.member_ids
        if current_user.id not in mids:
            mids.append(current_user.id)
        
        mids_str = ",".join(str(i) for i in sorted(mids))
        
        existing = await db.execute(
            select(ChatRoom)
            .where(ChatRoom.project_id == project_id)
            .where(ChatRoom.is_private == True)
            .where(ChatRoom.member_ids == mids_str)
        )
        room = existing.scalars().first()
        if room:
            return room
            
        new_room = ChatRoom(
            project_id=project_id,
            is_private=True,
            member_ids=mids_str,
            name=payload.name # Could be "User A, User B"
        )
    else:
        # For public channels, check by name
        existing = await db.execute(
            select(ChatRoom)
            .where(ChatRoom.project_id == project_id)
            .where(ChatRoom.name == payload.name)
            .where(ChatRoom.is_private == False)
        )
        room = existing.scalars().first()
        if room:
            return room
            
        new_room = ChatRoom(
            project_id=project_id,
            name=payload.name,
            is_private=False
        )

    db.add(new_room)
    await db.flush()
    await db.refresh(new_room)
    return new_room
