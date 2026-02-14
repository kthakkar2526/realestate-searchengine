from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

from core.models import SourceResult


# ---------------------------------------------------------------------------
# Trusted source whitelist – tier 1 = most authoritative, tier 3 = supplementary
# ---------------------------------------------------------------------------

TRUSTED_SOURCES: dict[str, dict[str, Any]] = {
    # Tier 1 – official / authoritative real estate & government sources
    "zillow.com":       {"tier": 1, "name": "Zillow"},
    "realtor.com":      {"tier": 1, "name": "Realtor.com"},
    "redfin.com":       {"tier": 1, "name": "Redfin"},
    "nar.realtor":      {"tier": 1, "name": "National Association of Realtors"},
    "census.gov":       {"tier": 1, "name": "U.S. Census Bureau"},
    "hud.gov":          {"tier": 1, "name": "HUD"},
    "freddiemac.com":   {"tier": 1, "name": "Freddie Mac"},
    "fanniemae.com":    {"tier": 1, "name": "Fannie Mae"},
    # Tier 2 – reputable financial / educational sources
    "bankrate.com":     {"tier": 2, "name": "Bankrate"},
    "nerdwallet.com":   {"tier": 2, "name": "NerdWallet"},
    "wikipedia.org":    {"tier": 2, "name": "Wikipedia"},
    "investopedia.com": {"tier": 2, "name": "Investopedia"},
    "nahb.org":         {"tier": 2, "name": "NAHB"},
    # Tier 3 – smaller real estate portals
    "homes.com":        {"tier": 3, "name": "Homes.com"},
    "trulia.com":       {"tier": 3, "name": "Trulia"},
    "apartments.com":   {"tier": 3, "name": "Apartments.com"},
    "foreclosure.com":  {"tier": 3, "name": "Foreclosure.com"},
}

TRUST_SCORES: dict[int, float] = {
    1: 1.0,
    2: 0.7,
    3: 0.5,
}

UNKNOWN_TRUST_SCORE = 0.2

# Composite score weights
WEIGHT_TRUST = 0.4
WEIGHT_RELEVANCE = 0.4
WEIGHT_RECENCY = 0.2


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def extract_domain(url: str) -> str:
    """Parse root domain from a full URL, stripping 'www.' prefix."""
    hostname = urlparse(url).hostname or ""
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.lower()


def compute_recency_score(published_date: Optional[str]) -> float:
    """Score content freshness on a 0-1 scale based on publication date."""
    if not published_date:
        return 0.3  # conservative default when date is unknown

    try:
        pub = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age_days = (now - pub).days

        if age_days <= 1:
            return 1.0
        if age_days <= 7:
            return 0.8
        if age_days <= 30:
            return 0.6
        if age_days <= 365:
            return 0.4
        return 0.2
    except (ValueError, TypeError):
        return 0.3


def score_source(result: dict[str, Any]) -> SourceResult:
    """Score a raw Tavily result and return a fully populated SourceResult."""
    url: str = result.get("url", "")
    domain = extract_domain(url)

    source_info = TRUSTED_SOURCES.get(domain)
    is_trusted = source_info is not None
    tier = source_info["tier"] if source_info else None
    trust_score = TRUST_SCORES.get(tier, UNKNOWN_TRUST_SCORE) if tier else UNKNOWN_TRUST_SCORE

    relevance_score: float = result.get("score", 0.0)
    published_date: Optional[str] = result.get("published_date")
    recency = compute_recency_score(published_date)

    composite = (
        WEIGHT_TRUST * trust_score
        + WEIGHT_RELEVANCE * relevance_score
        + WEIGHT_RECENCY * recency
    )

    return SourceResult(
        title=result.get("title", ""),
        url=url,
        content=result.get("content", ""),
        score=relevance_score,
        domain=domain,
        is_trusted=is_trusted,
        trust_level="verified" if is_trusted else "unverified",
        recency_score=recency,
        composite_score=round(composite, 4),
        published_date=published_date,
    )


def compute_confidence_score(sources: list[SourceResult]) -> float:
    """Compute overall answer confidence (0-100) from scored sources."""
    if not sources:
        return 0.0

    trusted_count = sum(1 for s in sources if s.is_trusted)
    trusted_ratio = trusted_count / len(sources)

    avg_composite = sum(s.composite_score for s in sources) / len(sources)

    # More sources = more confidence, capped at 1.0 for 5+ sources
    source_count_factor = min(len(sources) / 5, 1.0)

    raw = (
        0.4 * trusted_ratio
        + 0.4 * avg_composite
        + 0.2 * source_count_factor
    )

    return round(raw * 100, 1)


def get_trusted_domain_list() -> list[str]:
    """Return all whitelisted domains for Tavily's include_domains filter."""
    return list(TRUSTED_SOURCES.keys())
