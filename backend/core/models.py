from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Literal, Optional


class SourceResult(BaseModel):
    title: str
    url: str
    content: str
    score: float
    domain: str
    is_trusted: bool
    trust_level: Literal["verified", "unverified"]
    recency_score: float
    composite_score: float
    published_date: Optional[str] = None


class KPIValue(BaseModel):
    """A single market KPI with its value and trend direction."""
    label: str
    value: Optional[str] = None
    direction: Literal["up", "down", "flat", "unknown"] = "unknown"
    detail: Optional[str] = None  # e.g. "up 4.7% YoY"


class MarketKPIs(BaseModel):
    """Structured market data extracted from sources by the LLM."""
    median_price: Optional[KPIValue] = None
    price_per_sqft: Optional[KPIValue] = None
    active_listings: Optional[KPIValue] = None
    days_on_market: Optional[KPIValue] = None
    sale_to_list_ratio: Optional[KPIValue] = None
    inventory_change: Optional[KPIValue] = None
    yoy_price_change: Optional[KPIValue] = None
    median_rent: Optional[KPIValue] = None


class TrendMetric(BaseModel):
    """A single metric with current and previous values for bar chart comparison."""
    label: str
    current: Optional[float] = None
    previous: Optional[float] = None
    unit: str = ""  # "$", "%", " days", etc.
    change_pct: Optional[float] = None


class CompListing(BaseModel):
    """A comparable property listing extracted from source text."""
    address: Optional[str] = None
    price: Optional[str] = None
    sqft: Optional[str] = None
    beds: Optional[str] = None
    baths: Optional[str] = None
    status: Optional[str] = None  # "for sale", "sold", "pending"
    source_url: Optional[str] = None


class StreamEvent(BaseModel):
    type: Literal[
        "status",
        "plan",
        "answer_delta",
        "sources",
        "confidence",
        "kpis",
        "trends",
        "comps",
        "error",
        "clarification_needed",
        "domain_reject",
    ]
    data: Any


class CachedResult(BaseModel):
    answer: str
    sources: list[SourceResult]
    confidence_score: float
    query_category: Literal["market_data", "general_knowledge"]
    timestamp: float
    kpis: Optional[MarketKPIs] = None
    trends: Optional[list[TrendMetric]] = None
    comps: Optional[list[CompListing]] = None


class SearchRequest(BaseModel):
    query: str
