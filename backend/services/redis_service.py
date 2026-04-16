"""
TeamForge — Redis Service

Wraps the redis-py async client for pub/sub and cache operations.
Uses the REDIS_URL from settings (Upstash rediss:// or local redis://).
"""

import json
from typing import Any, AsyncGenerator, Optional

import redis.asyncio as aioredis
from config import settings

# ── Singleton async Redis client ─────────────────────────────────────────────
_redis: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    """Return (or lazily create) the async Redis client."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            ssl_cert_reqs=None,  # Required for Upstash TLS
        )
    return _redis


# ── Cache helpers ─────────────────────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """
    Serialise `value` to JSON and store it in Redis with a TTL.

    Args:
        key:   Cache key.
        value: Any JSON-serialisable Python value.
        ttl:   Time-to-live in seconds (default 5 minutes).
    """
    r = get_redis()
    await r.set(key, json.dumps(value), ex=ttl)


async def cache_get(key: str) -> Optional[Any]:
    """
    Retrieve and deserialise a cached value.

    Args:
        key: Cache key.

    Returns:
        Deserialised Python value, or None if key does not exist.
    """
    r = get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_delete(key: str) -> None:
    """Delete a single cache key."""
    r = get_redis()
    await r.delete(key)


# ── Pub/Sub helpers ─────────────────────────────────────────────────────────

async def publish(channel: str, message: dict) -> None:
    """
    Publish a JSON message to a Redis pub/sub channel.

    Args:
        channel: Channel name (e.g. "room:42").
        message: Dict that will be JSON-encoded before publishing.
    """
    r = get_redis()
    await r.publish(channel, json.dumps(message))


async def subscribe(channel: str) -> AsyncGenerator[dict, None]:
    """
    Subscribe to a Redis channel and yield decoded messages.

    Args:
        channel: Channel name.

    Yields:
        Decoded dict for each message received.
    """
    r = get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(channel)
    try:
        async for raw in pubsub.listen():
            if raw["type"] == "message":
                yield json.loads(raw["data"])
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
