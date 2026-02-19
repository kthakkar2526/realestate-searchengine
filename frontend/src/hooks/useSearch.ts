"use client";

import { useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types matching backend models
// ---------------------------------------------------------------------------

export interface SourceResult {
  title: string;
  url: string;
  content: string;
  score: number;
  domain: string;
  is_trusted: boolean;
  trust_level: "verified" | "unverified";
  recency_score: number;
  composite_score: number;
  published_date: string | null;
}

export interface KPIValue {
  label: string;
  value: string | null;
  direction: "up" | "down" | "flat" | "unknown";
  detail: string | null;
}

export interface MarketKPIs {
  median_price?: KPIValue | null;
  price_per_sqft?: KPIValue | null;
  active_listings?: KPIValue | null;
  days_on_market?: KPIValue | null;
  sale_to_list_ratio?: KPIValue | null;
  inventory_change?: KPIValue | null;
  yoy_price_change?: KPIValue | null;
  median_rent?: KPIValue | null;
}

export interface TrendMetric {
  label: string;
  current: number | null;
  previous: number | null;
  unit: string;
  change_pct: number | null;
}

export interface CompListing {
  address: string | null;
  price: string | null;
  sqft: string | null;
  beds: string | null;
  baths: string | null;
  status: string | null;
  source_url: string | null;
}

export interface SearchState {
  isLoading: boolean;
  answer: string;
  sources: SourceResult[];
  confidenceScore: number | null;
  error: string | null;
  isDomainReject: boolean;
  rejectReason: string;
  status: string;
  plan: any | null;
  kpis: MarketKPIs | null;
  trends: TrendMetric[];
  comps: CompListing[];
  needsClarification: boolean;
  clarificationQuestion: string | null;
  originalQuery: string | null;
}

const INITIAL_STATE: SearchState = {
  isLoading: false,
  answer: "",
  sources: [],
  confidenceScore: null,
  error: null,
  isDomainReject: false,
  rejectReason: "",
  status: "",
  plan: null,
  kpis: null,
  trends: [],
  comps: [],
  needsClarification: false,
  clarificationQuestion: null,
  originalQuery: null,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSearch() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset state for new search
    setState({ ...INITIAL_STATE, isLoading: true, status: "Starting search..." });

    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed" }));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.detail || `Error: ${response.status}`,
        }));
        return;
      }

      if (!response.body) {
        setState((prev) => ({ ...prev, isLoading: false, error: "No response stream" }));
        return;
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        buffer = buffer.replace(/\r\n/g, "\n");
        // SSE events are separated by double newlines
        const parts = buffer.split("\n\n");
        // Keep the last (potentially incomplete) part in the buffer
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          // Parse SSE fields: "event: <type>\ndata: <json>"
          let eventType = "";
          const dataLines: string[] = [];

          for (const line of part.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trim());
            }
          }

          const eventData = dataLines.join("\n");
          if (!eventType || !eventData) continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(eventData);
          } catch {
            continue;
          }

          switch (eventType) {
            case "status":
              setState((prev) => ({ ...prev, status: parsed as string }));
              break;

            case "plan":
              setState((prev) => ({ ...prev, plan: parsed as any }));
              break;

            case "answer_delta":
              setState((prev) => ({
                ...prev,
                answer: prev.answer + (parsed as string),
                status: "",
              }));
              break;

            case "sources":
              setState((prev) => ({ ...prev, sources: parsed as SourceResult[] }));
              break;

            case "confidence":
              setState((prev) => ({ ...prev, confidenceScore: parsed as number }));
              break;

            case "kpis":
              setState((prev) => ({ ...prev, kpis: parsed as MarketKPIs }));
              break;

            case "trends":
              setState((prev) => ({ ...prev, trends: parsed as TrendMetric[] }));
              break;

            case "comps":
              setState((prev) => ({ ...prev, comps: parsed as CompListing[] }));
              break;

            case "clarification_needed": {
              const clarData = parsed as { question: string; original_query: string };
              setState((prev) => ({
                ...prev,
                needsClarification: true,
                clarificationQuestion: clarData.question,
                originalQuery: clarData.original_query,
                isLoading: false,
              }));
              break;
            }

            case "domain_reject":
              setState((prev) => ({
                ...prev,
                isDomainReject: true,
                rejectReason: parsed as string,
              }));
              break;

            case "error":
              setState((prev) => ({ ...prev, error: parsed as string }));
              break;
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  const clarify = useCallback(async (answer: string) => {
    setState((prev) => ({
      ...prev,
      needsClarification: false,
      clarificationQuestion: null,
      originalQuery: null,
    }));
    await search(answer);
  }, [search]);

  return { ...state, search, cancel, clarify };
}
