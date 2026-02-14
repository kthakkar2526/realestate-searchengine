from __future__ import annotations

import json
import os
from typing import Optional

from upstash_redis import Redis

from core.models import CachedResult


# ---------------------------------------------------------------------------
# Redis client setup – uses REST-based Upstash client (works on serverless)
# ---------------------------------------------------------------------------

_redis: Optional[Redis] = None


def _get_redis() -> Optional[Redis]:
    """Lazy-init Redis client. Returns None if env vars are missing."""
    global _redis
    if _redis is not None:
        return _redis

    url = os.environ.get("UPSTASH_REDIS_REST_URL", "")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

    if not url or not token:
        return None

    _redis = Redis(url=url, token=token)
    return _redis


# ---------------------------------------------------------------------------
# TTL configuration (seconds)
# ---------------------------------------------------------------------------

TTL = {
    "market_data": 24 * 60 * 60,          # 24 hours
    "general_knowledge": 7 * 24 * 60 * 60,  # 7 days
}

CACHE_PREFIX = "cache:"
METRICS_KEY = "cache:metrics"
POPULAR_KEY = "popular:queries"


# ---------------------------------------------------------------------------
# Cache read / write
# ---------------------------------------------------------------------------

def get_cached(semantic_key: str) -> Optional[CachedResult]:
    """Look up a cached result by semantic key. Returns None on miss or error."""
    try:
        redis = _get_redis()
        if redis is None:
            return None

        raw = redis.get(f"{CACHE_PREFIX}{semantic_key}")
        if raw is None:
            return None

        # Upstash returns a string; parse it into CachedResult
        data = raw if isinstance(raw, dict) else json.loads(raw)
        redis.hincrby(METRICS_KEY, "hits", 1)
        return CachedResult(**data)
    except Exception:
        return None


def set_cached(semantic_key: str, result: CachedResult) -> None:
    """Store a result in cache with category-based TTL."""
    try:
        redis = _get_redis()
        if redis is None:
            return

        ttl = TTL.get(result.query_category, TTL["general_knowledge"])
        payload = result.model_dump_json()
        redis.set(f"{CACHE_PREFIX}{semantic_key}", payload, ex=ttl)
        redis.hincrby(METRICS_KEY, "misses", 1)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Popular queries tracking
# ---------------------------------------------------------------------------

def track_popular_query(query: str) -> None:
    """Increment frequency counter for a query in a Redis sorted set."""
    try:
        redis = _get_redis()
        if redis is None:
            return

        redis.zincrby(POPULAR_KEY, 1, query)
    except Exception:
        pass


def get_popular_queries(limit: int = 10) -> list[str]:
    """Return the top N most frequently asked queries."""
    try:
        redis = _get_redis()
        if redis is None:
            return []

        # zrange with rev=True returns highest scores first
        results = redis.zrange(POPULAR_KEY, 0, limit - 1, rev=True)
        if results is None:
            return []

        # Results may be strings or bytes depending on client version
        return [r if isinstance(r, str) else r.decode() for r in results]
    except Exception:
        return []
