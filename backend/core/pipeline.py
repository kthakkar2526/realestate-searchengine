from __future__ import annotations

import time
from typing import AsyncGenerator

from core.cache import get_cached, set_cached, track_popular_query
from core.gemini_client import (
    classify_domain,
    classify_intent,
    detect_query_ambiguity,
    extract_comps,
    extract_market_kpis,
    extract_trends,
    generate_answer,
    generate_semantic_key,
)
from core.models import CachedResult, SourceResult, StreamEvent
from core.sources import compute_confidence_score, score_source
from core.tavily_client import search_real_estate


async def search_pipeline(query: str) -> AsyncGenerator[StreamEvent, None]:
    """Orchestrate the full search pipeline, yielding StreamEvents for SSE."""

    try:
        # ------------------------------------------------------------------
        # Step 1: Domain classification
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Checking if query is real estate related...")

        classification = await classify_domain(query)

        if not classification.get("is_real_estate", True):
            yield StreamEvent(
                type="domain_reject",
                data=classification.get("reason", "This query is not related to real estate."),
            )
            return

        # ------------------------------------------------------------------
        # Step 1.5: Ambiguity detection
        # ------------------------------------------------------------------
        ambiguity = await detect_query_ambiguity(query)
        if ambiguity.get("is_ambiguous"):
            yield StreamEvent(
                type="clarification_needed",
                data={
                    "question": ambiguity["clarification_question"],
                    "original_query": query,
                },
            )
            return

        # ------------------------------------------------------------------
        # Step 2: Generate semantic cache key
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Analyzing query...")

        key_result = await generate_semantic_key(query)
        semantic_key = key_result["key"]
        category = key_result["category"]

        # ------------------------------------------------------------------
        # Step 2.5: Intent routing + widget plan
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Planning response layout...")

        plan = await classify_intent(query)

        yield StreamEvent(type="plan", data=plan)

        # ------------------------------------------------------------------
        # Step 3: Check cache
        # ------------------------------------------------------------------
        cached = get_cached(semantic_key)

        if cached is not None:
            yield StreamEvent(type="status", data="Found cached result")
            yield StreamEvent(type="answer_delta", data=cached.answer)
            yield StreamEvent(
                type="sources",
                data=[s.model_dump() for s in cached.sources],
            )
            yield StreamEvent(type="confidence", data=cached.confidence_score)
            # Also emit cached KPIs/trends/comps if present
            if cached.kpis is not None:
                yield StreamEvent(type="kpis", data=cached.kpis.model_dump())
            if cached.trends is not None:
                yield StreamEvent(type="trends", data=[t.model_dump() for t in cached.trends])
            if cached.comps is not None:
                yield StreamEvent(type="comps", data=[c.model_dump() for c in cached.comps])
            return

        # ------------------------------------------------------------------
        # Step 4: Search with Tavily
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Searching trusted real estate sources...")

        raw_results = search_real_estate(query)

        # ------------------------------------------------------------------
        # Step 5: Score and rank sources
        # ------------------------------------------------------------------
        scored_sources: list[SourceResult] = [
            score_source(r) for r in raw_results
        ]
        scored_sources.sort(key=lambda s: s.composite_score, reverse=True)

        yield StreamEvent(
            type="sources",
            data=[s.model_dump() for s in scored_sources],
        )

        # ------------------------------------------------------------------
        # Step 5.5: Extract KPIs, trends, and comps from source text
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Extracting market data...")

        kpis_raw = await extract_market_kpis(scored_sources)
        yield StreamEvent(type="kpis", data=kpis_raw)

        trends_raw = await extract_trends(scored_sources)
        if trends_raw:
            yield StreamEvent(type="trends", data=trends_raw)

        comps_raw = await extract_comps(scored_sources)
        if comps_raw:
            yield StreamEvent(type="comps", data=comps_raw)

        # ------------------------------------------------------------------
        # Step 6: Generate answer with streaming
        # ------------------------------------------------------------------
        yield StreamEvent(type="status", data="Generating answer...")

        full_answer = ""

        if not scored_sources:
            no_source_msg = (
                "I couldn't find enough trusted sources to answer this question "
                "with confidence. Please try rephrasing or asking a more specific "
                "real estate question."
            )
            yield StreamEvent(type="answer_delta", data=no_source_msg)
            full_answer = no_source_msg
        else:
            async for text_chunk in generate_answer(query, scored_sources):
                full_answer += text_chunk
                yield StreamEvent(type="answer_delta", data=text_chunk)

        # ------------------------------------------------------------------
        # Step 7: Compute confidence score
        # ------------------------------------------------------------------
        confidence = compute_confidence_score(scored_sources)
        yield StreamEvent(type="confidence", data=confidence)

        # ------------------------------------------------------------------
        # Step 8: Cache the result and track popularity
        # ------------------------------------------------------------------
        from core.models import MarketKPIs, TrendMetric, CompListing, KPIValue

        # Rebuild pydantic objects for cache storage
        kpis_model = None
        if kpis_raw:
            kpis_fields = {}
            for field_name, kpi_data in kpis_raw.items():
                if isinstance(kpi_data, dict):
                    kpis_fields[field_name] = KPIValue(**kpi_data)
            kpis_model = MarketKPIs(**kpis_fields)

        trends_model = [TrendMetric(**t) for t in trends_raw] if trends_raw else None
        comps_model = [CompListing(**c) for c in comps_raw] if comps_raw else None

        set_cached(
            semantic_key,
            CachedResult(
                answer=full_answer,
                sources=scored_sources,
                confidence_score=confidence,
                query_category=category,
                timestamp=time.time(),
                kpis=kpis_model,
                trends=trends_model,
                comps=comps_model,
            ),
        )

        track_popular_query(query)

    except Exception as exc:
        yield StreamEvent(type="error", data=str(exc))
