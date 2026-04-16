"""
TeamForge — Auth Middleware

Provides a FastAPI dependency `get_current_user` that:
1. Reads the `Authorization: Bearer <token>` header
2. Verifies the JWT signature and expiry
3. Returns the authenticated User ORM object

Usage:
    current_user: User = Depends(get_current_user)
"""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models.user import User
from services.redis_service import cache_get

bearer_scheme = HTTPBearer()


def create_access_token(user_id: int, email: str) -> str:
    """
    Create a signed JWT access token.

    Args:
        user_id: Database primary key of the user.
        email:   User's email address.

    Returns:
        Signed JWT string.
    """
    from datetime import timedelta

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: decode JWT and return the authenticated User.

    Raises:
        HTTPException 401 if the token is missing, expired, or invalid.
        HTTPException 404 if the user no longer exists.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
