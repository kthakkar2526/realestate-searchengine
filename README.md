# Real Estate Search Engine

An AI-powered real estate Q&A search engine built with a Retrieval-Augmented Generation (RAG) pipeline. Users ask natural language questions about real estate markets, pricing, trends, and home buying/selling — and receive streamed, source-cited answers backed by trusted real estate data.

## Architecture Overview

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19 + TypeScript)      │
│  SSE streaming · Dark/light theme · Responsive UI   │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/search (SSE)
                       ▼
┌─────────────────────────────────────────────────────┐
│  Backend (FastAPI + Python)                          │
│                                                      │
│  1. Domain validation — is it real estate?            │
│  2. Semantic cache lookup (Upstash Redis)             │
│  3. Web search via Tavily (trusted domains only)      │
│  4. Source scoring (trust × relevance × recency)      │
│  5. Market data extraction (KPIs, trends, comps)      │
│  6. Answer generation via Gemini 2.5 Flash            │
│  7. Confidence scoring & cache storage                │
│                                                      │
└─────────┬──────────────┬──────────────┬─────────────┘
          │              │              │
     Gemini LLM     Tavily API    Upstash Redis
     (Google AI)    (Web Search)   (Cache + Analytics)
```

## Key Features

- **RAG Pipeline** — Searches the web for real-time data, scores sources by trust/relevance/recency, and generates cited answers using only verified information
- **Trusted Source System** — 20+ whitelisted real estate domains (Zillow, Redfin, Realtor.com, NAR, HUD, Census Bureau) organized in 3 trust tiers with weighted scoring
- **Streaming Responses** — Server-Sent Events deliver answer tokens, status updates, sources, and structured data in real time
- **Market Data Extraction** — Automatically extracts KPIs (median price, inventory, days on market), trend comparisons, and comparable property listings from search results
- **Buy vs Rent Calculator** — Interactive scenario explorer with state-based property tax rates, PMI calculations, and multi-year cost projections
- **Semantic Caching** — Normalizes queries to canonical keys with category-based TTLs (24h for market data, 7 days for general knowledge)
- **Confidence Scoring** — 0-100 score based on source trustworthiness, composite quality, and coverage depth
- **Domain Validation** — Rejects non-real-estate queries with helpful suggestions
- **Rate Limiting** — 10 requests/minute per IP with sliding window

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.11+, Pydantic |
| LLM | Google Gemini 2.5 Flash |
| Web Search | Tavily API (domain-filtered) |
| Cache | Upstash Redis (serverless, REST-based) |
| Deployment | Vercel (frontend + backend) |
| Icons | Lucide React |

## Project Structure

```
realestate-searchengine/
├── backend/
│   ├── main.py                  # FastAPI app with CORS
│   ├── requirements.txt
│   ├── vercel.json              # Vercel deployment config
│   ├── api/
│   │   └── routes.py            # /api/search, /api/popular, /health
│   └── core/
│       ├── pipeline.py          # RAG pipeline orchestration
│       ├── gemini_client.py     # LLM calls (classify, extract, generate)
│       ├── tavily_client.py     # Web search with domain filtering
│       ├── sources.py           # Trusted domains & scoring algorithm
│       ├── cache.py             # Redis caching layer
│       └── models.py            # Pydantic data models
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main search page
│   │   │   ├── layout.tsx       # Root layout with metadata
│   │   │   └── globals.css      # Tailwind styles
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── AnswerCard.tsx       # Streamed answer display
│   │   │   ├── SourceList.tsx       # Scored sources grid
│   │   │   ├── ConfidenceBadge.tsx  # Color-coded confidence
│   │   │   ├── MarketSnapshot.tsx   # KPI tiles
│   │   │   ├── TrendChart.tsx       # Current vs previous bars
│   │   │   ├── CompsTable.tsx       # Comparable listings
│   │   │   ├── ScenarioExplorer.tsx # Buy vs rent calculator
│   │   │   ├── RecentQueries.tsx    # Popular queries sidebar
│   │   │   └── ...
│   │   └── hooks/
│   │       ├── useSearch.ts     # SSE streaming + state management
│   │       └── useTheme.ts      # Dark/light theme persistence
│   ├── package.json
│   └── next.config.ts
└── .env.example
```

## RAG Pipeline Details

The search pipeline processes each query through 7 stages, streaming results to the frontend as they become available:

### 1. Domain Classification
The LLM determines if the query is real estate related. Non-real-estate queries are rejected with a friendly message and topic suggestions.

### 2. Semantic Cache Key Generation
Queries are normalized into canonical form (e.g., *"What's the best time to buy a house in PA?"* becomes `best-time-buy-home-pennsylvania`). This allows semantically similar queries to share cached results.

### 3. Intent Routing & Widget Planning
The LLM classifies the query intent (`market_context`, `affordability`, `valuation_comps`, etc.) and selects which UI widgets to render — KPI tiles, trend charts, comparables table, or the buy/rent calculator.

### 4. Trusted Source Search
Tavily searches the web filtered to 20+ trusted real estate domains. If fewer than 3 trusted results are found, a broader fallback search runs. Results are deduplicated by URL.

### 5. Source Scoring
Each source receives a composite score:

```
composite = 0.4 × trust_score + 0.4 × relevance_score + 0.2 × recency_score
```

| Factor | Weight | Scoring |
|--------|--------|---------|
| Trust | 40% | Tier 1 = 1.0 (Zillow, NAR, HUD), Tier 2 = 0.7, Tier 3 = 0.5, Unknown = 0.2 |
| Relevance | 40% | Tavily's search relevance ranking |
| Recency | 20% | 1 day = 1.0, 1 week = 0.8, 1 month = 0.6, 1 year = 0.4, older = 0.2 |

### 6. Answer Generation & Data Extraction
The top 8 sources are passed to Gemini, which generates a cited answer streamed token-by-token. In parallel, structured data is extracted:
- **KPIs**: Median price, price/sqft, active listings, days on market, sale-to-list ratio, inventory change, YoY price change, median rent
- **Trends**: Current vs previous period metrics with change percentages
- **Comps**: Individual property listings with address, price, beds/baths, sqft, status

### 7. Confidence Scoring & Caching
A confidence score (0-100) is computed and the full result is cached in Redis with category-based TTL.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Accepts `{"query": string}`, returns SSE stream of pipeline events |
| GET | `/api/popular` | Returns top 10 most searched queries |
| GET | `/health` | Health check |

### SSE Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `status` | string | Pipeline step progress |
| `plan` | object | Intent + widget plan |
| `answer_delta` | string | Streamed answer chunk |
| `sources` | array | Scored source results |
| `confidence` | number | 0-100 score |
| `kpis` | object | Market KPI values |
| `trends` | array | Trend metrics |
| `comps` | array | Comparable listings |
| `domain_reject` | string | Non-real-estate rejection message |
| `error` | string | Error message |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys for [Google Gemini](https://ai.google.dev/), [Tavily](https://tavily.com/), and [Upstash Redis](https://upstash.com/) (Redis is optional)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/realestate-searchengine.git
cd realestate-searchengine
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment variables
cp ../.env.example .env
# Edit .env with your API keys:
#   GEMINI_API_KEY=...
#   TAVILY_API_KEY=...
#   UPSTASH_REDIS_REST_URL=...    (optional)
#   UPSTASH_REDIS_REST_TOKEN=...  (optional)

python -m uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`.

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `TAVILY_API_KEY` | Yes | Tavily search API key |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL (enables caching + popular queries) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (defaults to `http://localhost:8000`) |

## Deployment

Both frontend and backend are configured for **Vercel**:

- **Frontend**: Deploys as a standard Next.js app
- **Backend**: Deploys as a Python serverless function via `vercel.json`. Gemini and Tavily clients use lazy initialization to work within serverless cold-start constraints.

Set environment variables in the Vercel dashboard for each project.

## Design Decisions

- **SSE over WebSockets** — Simpler to deploy on serverless (Vercel), unidirectional streaming is sufficient for search responses
- **Tiered trust scoring** — Ensures answers are grounded in authoritative sources (government data, major listing platforms) rather than random blogs
- **Semantic cache keys** — Different phrasings of the same question hit the same cache entry, reducing API costs
- **Separate TTLs by category** — Market data expires in 24h (prices change), general knowledge lasts 7 days
- **Graceful degradation** — The system works without Redis (no caching/analytics), and falls back to broader search if trusted-only search returns too few results
