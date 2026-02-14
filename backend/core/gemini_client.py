from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator

from google import genai
from google.genai import types

from core.models import SourceResult

# ---------------------------------------------------------------------------
# Gemini setup
# ---------------------------------------------------------------------------

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
MODEL = "gemini-2.5-flash"


async def _gemini_json(*, system: str, user: str, temperature: float = 0.0) -> dict[str, Any]:
    """Non-streaming Gemini call that returns parsed JSON."""
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    try:
        return json.loads(response.text)
    except (json.JSONDecodeError, AttributeError):
        return {"_raw": getattr(response, "text", "")}


async def _gemini_stream(*, system: str, user: str, temperature: float = 0.3) -> AsyncGenerator[str, None]:
    """Streaming Gemini call that yields text chunks."""
    response = await client.aio.models.generate_content_stream(
        model=MODEL,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
        ),
    )
    async for chunk in response:
        if chunk.text:
            yield chunk.text


# ---------------------------------------------------------------------------
# 1. Domain classification – is this a real estate question?
# ---------------------------------------------------------------------------

CLASSIFY_SYSTEM = """You are a domain classifier. Determine if the user's query is related to real estate.

Real estate topics include: buying, selling, renting, leasing, mortgages, refinancing,
property values, housing markets, home inspection, home improvement, real estate investing,
property taxes, zoning, neighborhoods, HOAs, title insurance, closing costs, appraisals,
property management, commercial real estate, land use, and housing regulations.

Respond with JSON only:
{"is_real_estate": true/false, "reason": "brief one-sentence explanation"}"""


async def classify_domain(query: str) -> dict[str, Any]:
    """Return {"is_real_estate": bool, "reason": str}."""
    result = await _gemini_json(system=CLASSIFY_SYSTEM, user=query, temperature=0.0)
    if "is_real_estate" in result and "reason" in result:
        return {"is_real_estate": bool(result["is_real_estate"]), "reason": str(result["reason"])}
    # Fail open – allow the query through if classification breaks
    return {"is_real_estate": True, "reason": "Classification unavailable"}


# ---------------------------------------------------------------------------
# 2. Semantic cache key generation
# ---------------------------------------------------------------------------

SEMANTIC_KEY_SYSTEM = """Generate a normalized semantic key for caching this real estate query.

Rules:
- The key must be a short, lowercase, hyphenated canonical form that captures the core intent.
- Queries with the same meaning MUST produce identical keys.
- Also classify the query as "market_data" (current prices, rates, trends, timing) or
  "general_knowledge" (how-to, definitions, processes, regulations).

Respond with JSON only:
{"key": "lowercase-hyphenated-key", "category": "market_data" or "general_knowledge"}

Examples:
- "best time to buy home in PA" -> {"key": "best-time-buy-home-pennsylvania", "category": "market_data"}
- "when should I buy a house in Pennsylvania" -> {"key": "best-time-buy-home-pennsylvania", "category": "market_data"}
- "what is a 1031 exchange" -> {"key": "what-is-1031-exchange", "category": "general_knowledge"}
- "average home price in Austin TX" -> {"key": "average-home-price-austin-texas", "category": "market_data"}"""


async def generate_semantic_key(query: str) -> dict[str, str]:
    """Return {"key": str, "category": "market_data" | "general_knowledge"}."""
    result = await _gemini_json(system=SEMANTIC_KEY_SYSTEM, user=query, temperature=0.0)
    key = result.get("key")
    category = result.get("category")
    if isinstance(key, str) and isinstance(category, str):
        if category not in ("market_data", "general_knowledge"):
            category = "general_knowledge"
        return {"key": key, "category": category}

    fallback_key = query.lower().strip().replace(" ", "-")[:80]
    return {"key": fallback_key, "category": "general_knowledge"}


# ---------------------------------------------------------------------------
# 2b. Intent routing + widget plan
# ---------------------------------------------------------------------------

INTENT_SYSTEM = """You are a real estate query router. Classify the user's query into one or more intents
and propose which UI widgets should be shown.

Return JSON only in this schema:

{
  "intents": ["market_context"|"affordability"|"valuation_comps"|"neighborhood_fit"|"process_legal"|"renovation_condition"|"investment_analysis"|"listing_search"|"education"],
  "location": {"state": string|null, "city": string|null, "zip": string|null},
  "timeframe": {"year": number|null, "horizon": "current"|"12_months"|"24_months"|"5_years"|null},
  "widgets": ["market_snapshot"|"trend_chart"|"scenario_explorer"|"comps_table"|"distribution"|"map_view"],
  "notes": "short 1-sentence rationale"
}

Rules:
- If query asks about market/trends/timing/prices/rent-vs-buy -> include market_context + market_snapshot (+ trend_chart if relevant).
- If query asks affordability/payment/mortgage/rent-vs-buy -> include affordability + scenario_explorer.
- If query asks if priced right/offer/comps/rent estimate -> include valuation_comps + comps_table (+ distribution).
- If query asks best neighborhoods/compare areas/commute -> include neighborhood_fit + map_view (+ market_snapshot).
- If query asks steps/taxes/title/closing -> include process_legal.
- If query asks repairs/remodel costs/inspection -> include renovation_condition.
- If query asks cap rate/cashflow/DSCR -> include investment_analysis + scenario_explorer.
- If query asks to find homes matching criteria -> include listing_search + map_view.
- If query asks definitions (PMI/escrow/HOA) -> include education.

Be conservative: choose the minimum widgets needed."""


async def classify_intent(query: str) -> dict[str, Any]:
    """Classify query intent and determine which widgets to render."""
    result = await _gemini_json(system=INTENT_SYSTEM, user=query, temperature=0.0)

    # Hard safety defaults
    widgets = result.get("widgets")
    if not isinstance(widgets, list):
        widgets = []

    intents = result.get("intents")
    if not isinstance(intents, list):
        intents = ["education"]

    location = result.get("location")
    if not isinstance(location, dict):
        location = {"state": None, "city": None, "zip": None}

    timeframe = result.get("timeframe")
    if not isinstance(timeframe, dict):
        timeframe = {"year": None, "horizon": None}

    notes = result.get("notes")
    if not isinstance(notes, str):
        notes = "Intent routing unavailable"

    return {
        "intents": intents,
        "location": {
            "state": location.get("state"),
            "city": location.get("city"),
            "zip": location.get("zip"),
        },
        "timeframe": {"year": timeframe.get("year"), "horizon": timeframe.get("horizon")},
        "widgets": widgets,
        "notes": notes,
    }


# ---------------------------------------------------------------------------
# 3. Answer generation with streaming
# ---------------------------------------------------------------------------

ANSWER_SYSTEM = """You are a knowledgeable real estate assistant. Answer the user's question
using ONLY the provided source context. Follow these rules:

1. Cite sources using [Source N] notation inline where you use information from that source.
2. Be accurate, helpful, and concise.
3. If the sources don't contain enough information to fully answer, say so honestly.
4. Format your answer with clear paragraphs and bullet points where appropriate.
5. Do NOT make up information that isn't in the provided sources.
6. At the end, include a brief "Sources Used" summary listing which sources you cited."""


async def generate_answer(
    query: str,
    sources: list[SourceResult],
) -> AsyncGenerator[str, None]:
    """Stream answer text chunks as an async generator."""
    sorted_sources = sorted(sources, key=lambda s: s.composite_score, reverse=True)
    top_sources = sorted_sources[:8]

    context_parts: list[str] = []
    for i, src in enumerate(top_sources, 1):
        context_parts.append(f"[Source {i}: {src.title} ({src.url})]\n{src.content}")
    context = "\n\n".join(context_parts)

    prompt = f"Query: {query}\n\nContext from trusted sources:\n{context}"

    async for text in _gemini_stream(system=ANSWER_SYSTEM, user=prompt, temperature=0.3):
        if text:
            yield text


# ---------------------------------------------------------------------------
# 4. Market KPI extraction from source text
# ---------------------------------------------------------------------------

KPI_SYSTEM = """You are a real estate data extractor. Read the provided source text and extract
market KPIs (Key Performance Indicators) as structured JSON.

Return JSON only in this exact schema:
{
  "median_price":      {"value": "$294,900" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": "up 3.47% YoY" or null},
  "price_per_sqft":    {"value": "$183" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": null},
  "active_listings":   {"value": "46.8K" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": "up 2.44% YoY" or null},
  "days_on_market":    {"value": "68" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": "up 6.25% YoY" or null},
  "sale_to_list_ratio":{"value": "100%" or null, "direction": "flat"|"unknown", "detail": null},
  "inventory_change":  {"value": "-11.49% MoM" or null, "direction": "down"|"unknown", "detail": null},
  "yoy_price_change":  {"value": "3.47%" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": null},
  "median_rent":       {"value": "$1,685" or null, "direction": "up"|"down"|"flat"|"unknown", "detail": null}
}

Rules:
- Only extract values that are EXPLICITLY stated in the text. Do NOT calculate or infer.
- If a value is not mentioned, set it to null.
- "direction" indicates the trend: "up" if increasing, "down" if decreasing, "flat" if stable, "unknown" if unclear.
- "detail" is an optional short note like "up 4.7% YoY" or "down 11.49% MoM".
- Use the exact numbers from the text, don't round or modify them."""


async def extract_market_kpis(sources: list[SourceResult]) -> dict[str, Any]:
    """Extract structured market KPIs from source text using LLM."""
    blob = "\n\n".join(
        f"[{s.domain}] {s.title}\n{s.content}"
        for s in sources[:8]
    )

    result = await _gemini_json(system=KPI_SYSTEM, user=blob, temperature=0.0)

    # Normalize: ensure every field has the expected shape
    kpis: dict[str, Any] = {}
    for field in [
        "median_price", "price_per_sqft", "active_listings", "days_on_market",
        "sale_to_list_ratio", "inventory_change", "yoy_price_change", "median_rent",
    ]:
        raw = result.get(field)
        if isinstance(raw, dict) and raw.get("value") is not None:
            kpis[field] = {
                "label": field.replace("_", " ").title(),
                "value": str(raw["value"]),
                "direction": raw.get("direction", "unknown"),
                "detail": raw.get("detail"),
            }

    return kpis


# ---------------------------------------------------------------------------
# 5. Trend metrics extraction (current vs previous for bar charts)
# ---------------------------------------------------------------------------

TREND_SYSTEM = """You are a real estate data extractor. From the source text, extract metrics
that have BOTH a current value and a previous/year-ago value, suitable for a comparison chart.

Return JSON only:
{
  "trends": [
    {"label": "Median Home Price", "current": 294900, "previous": 285000, "unit": "$", "change_pct": 3.47},
    {"label": "Days on Market", "current": 68, "previous": 64, "unit": " days", "change_pct": 6.25}
  ]
}

Rules:
- Only include metrics where BOTH current AND previous values are explicitly stated or calculable from a percentage change.
- If the text says "up 4.7% compared to last year, selling for $250,000", previous = 250000 / 1.047 ≈ 238778.
- "current" and "previous" must be raw numbers (no $ or % signs, no commas).
- "unit" is the display prefix/suffix: "$" for dollars, "%" for percentages, " days" for days.
- "change_pct" is the percentage change from previous to current.
- Return an empty array if no comparison data is found.
- Maximum 5 trends."""


async def extract_trends(sources: list[SourceResult]) -> list[dict[str, Any]]:
    """Extract current-vs-previous metrics for bar chart comparison."""
    blob = "\n\n".join(
        f"[{s.domain}] {s.title}\n{s.content}"
        for s in sources[:8]
    )

    result = await _gemini_json(system=TREND_SYSTEM, user=blob, temperature=0.0)

    trends = result.get("trends", [])
    if not isinstance(trends, list):
        return []

    valid: list[dict[str, Any]] = []
    for t in trends[:5]:
        if (
            isinstance(t, dict)
            and isinstance(t.get("current"), (int, float))
            and isinstance(t.get("previous"), (int, float))
        ):
            valid.append({
                "label": str(t.get("label", "Metric")),
                "current": float(t["current"]),
                "previous": float(t["previous"]),
                "unit": str(t.get("unit", "")),
                "change_pct": float(t["change_pct"]) if isinstance(t.get("change_pct"), (int, float)) else None,
            })

    return valid


# ---------------------------------------------------------------------------
# 6. Comparable listings extraction
# ---------------------------------------------------------------------------

COMPS_SYSTEM = """You are a real estate data extractor. From the source text, find any
individual property listings mentioned (specific homes for sale, recently sold, etc.).

Return JSON only:
{
  "listings": [
    {"address": "123 Main St, Pittsburgh PA", "price": "$350,000", "sqft": "1,800", "beds": "3", "baths": "2", "status": "for sale"},
    {"address": "456 Oak Ave, Philadelphia PA", "price": "$275,000", "sqft": "1,200", "beds": "2", "baths": "1", "status": "sold"}
  ]
}

Rules:
- Only extract SPECIFIC properties with at least a price OR address mentioned.
- Do NOT extract aggregate/market-level stats (like "median home price is $294K").
- If a field is not mentioned for a listing, set it to null.
- "status" should be "for sale", "sold", "pending", or null if unknown.
- Return an empty array if no individual listings are found.
- Maximum 10 listings."""


async def extract_comps(sources: list[SourceResult]) -> list[dict[str, Any]]:
    """Extract individual property listings from source text."""
    blob = "\n\n".join(
        f"[{s.domain}] {s.title}\n{s.content}"
        for s in sources[:8]
    )

    result = await _gemini_json(system=COMPS_SYSTEM, user=blob, temperature=0.0)

    listings = result.get("listings", [])
    if not isinstance(listings, list):
        return []

    valid: list[dict[str, Any]] = []
    for item in listings[:10]:
        if not isinstance(item, dict):
            continue
        if not item.get("price") and not item.get("address"):
            continue
        valid.append({
            "address": item.get("address"),
            "price": item.get("price"),
            "sqft": item.get("sqft"),
            "beds": item.get("beds"),
            "baths": item.get("baths"),
            "status": item.get("status"),
        })

    return valid
