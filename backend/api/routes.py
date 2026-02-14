from __future__ import annotations

import json
import time
from collections import defaultdict
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from core.cache import get_popular_queries
from core.models import SearchRequest, StreamEvent
from core.pipeline import search_pipeline


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


# ---------------------------------------------------------------------------
# Simple in-memory rate limiter – max 10 requests per IP per minute
# ---------------------------------------------------------------------------

MAX_REQUESTS_PER_MINUTE = 10

_rate_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(ip: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.time()
    window_start = now - 60

    # Remove timestamps older than 1 minute
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]

    if len(_rate_store[ip]) >= MAX_REQUESTS_PER_MINUTE:
        return False

    _rate_store[ip].append(now)
    return True


def _get_client_ip(request: Request) -> str:
    """Extract client IP, checking x-forwarded-for for proxied requests."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# SSE event formatter
# ---------------------------------------------------------------------------

async def _stream_events(query: str) -> AsyncGenerator[dict, None]:
    """Wrap the pipeline generator into SSE-compatible dicts."""
    async for event in search_pipeline(query):
        yield {
            "event": event.type,
            "data": json.dumps(event.data),
        }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/search")
async def search(body: SearchRequest, request: Request):
    """Stream real estate search results as Server-Sent Events."""
    # Rate limiting
    client_ip = _get_client_ip(request)
    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute and try again.",
        )

    # Validate query
    query = body.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if len(query) > 500:
        raise HTTPException(status_code=400, detail="Query must be 500 characters or less.")

    return EventSourceResponse(_stream_events(query))


@router.get("/popular")
async def popular():
    """Return the top 10 most frequently asked queries."""
    queries = get_popular_queries(10)
    return {"queries": queries}
