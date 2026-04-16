"""
TeamForge — Auth Pydantic Schemas

Defines request/response models for the authentication endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Payload for POST /auth/register."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, description="Plaintext password (hashed server-side)")


class UserLogin(BaseModel):
    """Payload for POST /auth/login."""
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Public representation of a user (no password)."""
    id: int
    email: EmailStr
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    """Decoded JWT payload."""
    user_id: int
    email: str
