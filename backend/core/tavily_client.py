from __future__ import annotations

import os
from typing import Any

from tavily import TavilyClient

from core.sources import get_trusted_domain_list


# ---------------------------------------------------------------------------
# Client setup
# ---------------------------------------------------------------------------

tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))

MIN_TRUSTED_RESULTS = 3


# ---------------------------------------------------------------------------
# Search functions
# ---------------------------------------------------------------------------

def _deduplicate(
    primary: list[dict[str, Any]],
    fallback: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge two result lists, removing duplicates by URL."""
    seen_urls: set[str] = set()
    merged: list[dict[str, Any]] = []

    for result in primary + fallback:
        url = result.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            merged.append(result)

    return merged


def search_real_estate(query: str) -> list[dict[str, Any]]:
    """Search for real estate content, preferring trusted domains.

    Strategy:
    1. Search only within trusted domains (advanced depth, 10 results).
    2. If fewer than 3 results come back, do a broader search and merge.
    """
    trusted_domains = get_trusted_domain_list()

    # Primary search – trusted domains only
    trusted_response = tavily.search(
        query=query,
        search_depth="advanced",
        max_results=10,
        include_domains=trusted_domains,
    )
    trusted_results: list[dict[str, Any]] = trusted_response.get("results", [])

    # If we got enough trusted results, return them as-is
    if len(trusted_results) >= MIN_TRUSTED_RESULTS:
        return trusted_results

    # Fallback – broader search without domain restriction
    broad_response = tavily.search(
        query=query,
        search_depth="basic",
        max_results=5,
    )
    broad_results: list[dict[str, Any]] = broad_response.get("results", [])

    return _deduplicate(trusted_results, broad_results)
