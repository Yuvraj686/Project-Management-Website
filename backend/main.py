"""
TeamForge Backend — FastAPI Application Entry Point

This module initialises the FastAPI app, registers all routers,
configures CORS, mounts middleware, and starts the APScheduler
background job for deadline warnings.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import engine, Base
from routers import auth, projects, chat, github_webhook, ai, changelog, files
from services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create DB tables and start scheduler on startup,
    gracefully shut down scheduler on shutdown."""
    import sys
    import logging
    logger = logging.getLogger("teamforge.startup")

    # Attempt to create all database tables.
    # If DATABASE_URL credentials are wrong, log a warning and continue —
    # the server will still serve all routes so the frontend UI can be tested.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[DB] Tables created / verified OK.")
    except Exception as db_exc:
        logger.warning(
            "[DB] Connection failed: %s  "
            "-- Update DATABASE_URL in backend/.env and restart.",
            db_exc,
        )

    # Start the APScheduler background job
    try:
        start_scheduler()
        logger.info("[Scheduler] Background scheduler started OK.")
    except Exception as sched_exc:
        logger.warning("[Scheduler] Failed to start: %s", sched_exc)

    yield  # App is running

    # Shutdown scheduler cleanly
    shutdown_scheduler()


app = FastAPI(
    title="TeamForge API",
    description="Real-time collaborative project management platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(chat.router, prefix="/ws", tags=["Chat WebSocket"])
app.include_router(github_webhook.router, prefix="/webhooks", tags=["GitHub Webhook"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(changelog.router, prefix="/changelog", tags=["Changelog"])
app.include_router(files.router, prefix="/files", tags=["Files"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health-check endpoint used by deployment platforms."""
    return {"status": "ok", "version": "1.0.0"}
