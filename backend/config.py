"""
TeamForge — Configuration Module

Loads all environment variables via pydantic-settings BaseSettings.
A single `settings` instance is imported everywhere in the application.
Never hardcode secrets — always reference `settings.<VAR>`.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """All application settings loaded from environment variables / .env file."""

    # ── App ────────────────────────────────────────────────────────────────
    APP_SECRET_KEY: str = Field(..., description="Random 32-char secret for app-level signing")
    APP_ENV: str = Field("development", description="development | staging | production")
    FRONTEND_URL: str = Field("http://localhost:3000", description="Allowed CORS origin")

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")

    # ── Redis ──────────────────────────────────────────────────────────────
    REDIS_URL: str = Field(..., description="Redis connection string (Upstash rediss://...)")

    # -- Google Gemini AI (FREE tier: 1,500 req/day) ---------------------------
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key — free at aistudio.google.com")

    # ── AWS S3 ─────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = Field(..., description="AWS IAM access key ID")
    AWS_SECRET_ACCESS_KEY: str = Field(..., description="AWS IAM secret access key")
    AWS_S3_BUCKET_NAME: str = Field("teamforge-uploads", description="S3 bucket name")
    AWS_S3_REGION: str = Field("us-east-1", description="AWS S3 region")

    # ── SendGrid ───────────────────────────────────────────────────────────
    SENDGRID_API_KEY: str = Field(..., description="SendGrid API key")
    EMAIL_FROM: str = Field("noreply@teamforge.app", description="Sender email address")

    # ── GitHub Webhook ─────────────────────────────────────────────────────
    GITHUB_WEBHOOK_SECRET: str = Field(..., description="HMAC secret for GitHub webhook verification")

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET: str = Field(..., description="Secret key for JWT signing")
    JWT_ALGORITHM: str = Field("HS256", description="JWT signing algorithm")
    JWT_EXPIRE_MINUTES: int = Field(1440, description="JWT token TTL in minutes (default 24h)")

    # ── VS Code Extension ──────────────────────────────────────────────────
    VSCODE_EXTENSION_API_URL: str = Field(
        "http://localhost:8000",
        description="Backend URL used by the VS Code extension",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Singleton settings object — import this everywhere
settings = Settings()
