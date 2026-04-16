"""
TeamForge — Auth Router

Endpoints:
    POST /auth/register  — Create a new account
    POST /auth/login     — Authenticate and receive a JWT
    GET  /auth/me        — Return the authenticated user's profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import create_access_token, get_current_user
from models.user import User
from schemas.auth import Token, UserCreate, UserLogin, UserOut

router = APIRouter()
def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    # bcrypt rejects passwords > 72 bytes; truncate safely to prevent server crashes
    pwd_bytes = password[:72].encode('utf-8')
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    plain_bytes = plain[:72].encode('utf-8')
    hashed_bytes = hashed.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except ValueError:
        return False


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.

    - Checks that the email is not already taken.
    - Hashes the password before storing.
    - Returns a JWT token immediately so the user is logged in.
    """
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()  # Get the auto-generated ID
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate with email and password.

    Returns a JWT token on success, 401 on invalid credentials.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user.id, user.email)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user
