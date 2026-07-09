# CityPaper — Design Specification

**Date:** 2026-07-09  
**Project:** CityPaper — AI-powered daily city newspaper  
**Stack:** Turborepo · Next.js 15 · Express 5 · TypeScript · OpenAI Agents SDK · Ollama · Zod

---

## 1. Overview

CityPaper is a fictitious AI-powered city newspaper service. A user selects a city via Google Maps click or text/ZIP input; the backend orchestrates a team of AI agents that fetch real-time weather, local news, and city information, then generate a richly designed newspaper onepager.

**Use-case:** Demonstrate a production-ready Express + TypeScript API that orchestrates multiple OpenAI Agents SDK agents with guardrails, external tool calls, and a locally hosted LLM via Ollama.

---

## 2. Monorepo Structure

```
citypaper/
├── apps/
│   ├── frontend/                        (Next.js 15, App Router)
│   │   ├── app/
│   │   │   ├── page.tsx                 (Landing: Map + SearchBar)
│   │   │   └── newspaper/[city]/
│   │   │       └── page.tsx             (Newspaper Onepager)
│   │   └── components/
│   │       ├── CityMap.tsx              (Google Maps JS API)
│   │       ├── SearchBar.tsx            (city name / ZIP input)
│   │       └── newspaper/
│   │           ├── NewspaperLayout.tsx
│   │           ├── WeatherWidget.tsx
│   │           ├── NewsGrid.tsx
│   │           └── StoryOfTheDay.tsx
│   │
│   └── backend/                         (Express 5, TypeScript, ES modules)
│       └── src/
│           ├── app.ts                   (Express setup, middleware, Swagger)
│           ├── routers/
│           │   └── agent.router.ts
│           ├── controllers/
│           │   └── agent.controller.ts
│           ├── agents/
│           │   ├── orchestrator.agent.ts
│           │   ├── weather.agent.ts
│           │   ├── news.agent.ts
│           │   ├── cityinfo.agent.ts
│           │   └── editor.agent.ts
│           ├── tools/
│           │   ├── openweather.tool.ts  (OpenWeatherMap API)
│           │   ├── newsapi.tool.ts      (NewsAPI.org)
│           │   └── wikipedia.tool.ts    (Wikipedia REST API)
│           ├── guardrails/
│           │   └── input.guardrail.ts
│           ├── middlewares/
│           │   └── error.middleware.ts
│           ├── schemas/
│           │   └── agent.schema.ts      (Zod: request + response)
│           └── config/
│               └── llm.config.ts        (Ollama dev/prod model switch)
│
└── packages/
    └── shared/
        └── src/
            └── schemas/
                └── newspaper.schema.ts  (shared Zod types frontend + backend)
```

---

## 3. API Endpoint

### `POST /agent`

**Request body (Zod-validated):**
```typescript
{
  city: string,     // city name or ZIP code
  lat?: number,     // optional: from Google Maps click
  lng?: number      // optional: from Google Maps click
}
```

**Response (Zod-validated NewspaperSchema):**
```typescript
{
  city: string,
  generatedAt: string,                   // ISO timestamp
  weather: {
    current: {
      temp: number,
      feelsLike: number,
      description: string,
      icon: string
    },
    forecast: Array<{
      day: string,
      temp: number,
      description: string
    }>                                   // 3-day forecast
  },
  news: {
    politics: Array<{ title: string, summary: string, url: string }>,
    sports:   Array<{ title: string, summary: string, url: string }>,
    culture:  Array<{ title: string, summary: string, url: string }>
  },
  cityInfo: {
    summary: string,
    highlights: string[],
    population: number
  },
  editorial: {
    storyOfTheDay: string,
    editorsNote: string
  }
}
```

**Swagger UI** available at `GET /api-docs`.

---

## 4. Agent Architecture

### Orchestrator Agent

Top-level agent that receives the validated city input, fans out to sub-agents, collects results, and returns the final `NewspaperSchema` object.

**Execution order:**
```
[WeatherAgent, NewsAgent, CityInfoAgent]  ← run in parallel
[EditorAgent]                             ← runs after, needs above results
```

### Sub-Agents

| Agent | Responsibility | Tool Used | External API |
|---|---|---|---|
| **WeatherAgent** | Current weather + 3-day forecast | `openweather.tool.ts` | OpenWeatherMap |
| **NewsAgent** | 5 articles categorised: Politics / Sports / Culture | `newsapi.tool.ts` | NewsAPI.org |
| **CityInfoAgent** | City summary, highlights, population | `wikipedia.tool.ts` | Wikipedia REST API |
| **EditorAgent** | Generate "Story of the Day" + "Editor's Note" | *(LLM only, no tool)* | — |

---

## 5. Tool Functions

Each tool is a standalone file under `src/tools/` with a single exported async function and its own Zod schema for the API response.

| Tool | File | API | Key env var |
|---|---|---|---|
| Fetch weather | `openweather.tool.ts` | `api.openweathermap.org` | `OPENWEATHER_API_KEY` |
| Fetch news | `newsapi.tool.ts` | `newsapi.org` | `NEWS_API_KEY` |
| Fetch city info | `wikipedia.tool.ts` | `en.wikipedia.org/api/rest_v1` | *(no key required)* |

---

## 6. Input Guardrail

File: `src/guardrails/input.guardrail.ts`

Runs **before** the orchestrator agent is invoked. Two checks:

1. **Regex sanitisation** — rejects empty strings, inputs shorter than 2 characters, and patterns matching `<script>`, SQL keywords, or special character injections.
2. **Coordinate validation** — if `lat`/`lng` are provided, validates `lat ∈ [-90, 90]` and `lng ∈ [-180, 180]`.

Rejected inputs return HTTP 400 with a structured Zod-shaped error body.

---

## 7. LLM Configuration

File: `src/config/llm.config.ts`

Ollama exposes an OpenAI-compatible REST endpoint at `http://localhost:11434/v1`. The OpenAI Agents SDK connects to it by overriding `baseURL` and `apiKey`.

| Environment | Model | Purpose |
|---|---|---|
| `development` | `llama3.2:3b` | Fast, lightweight, minimal RAM |
| `production` | `glm-z1-32b` | High-quality, fully free via Ollama |

```typescript
const model = process.env.NODE_ENV === "development" ? "llama3.2:3b" : "glm-z1-32b"

const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
})
```

---

## 8. Frontend Design

### Page 1 — Landing (`/`)

- `SearchBar`: text input for city name or ZIP
- `CityMap`: Google Maps with click-to-select; on click extracts `lat/lng` + reverse-geocodes to city name
- "Generate Edition" button triggers `POST /agent` and navigates to `/newspaper/[city]`

### Page 2 — Newspaper Onepager (`/newspaper/[city]`)

Classic broadsheet layout using CSS Grid + `Playfair Display` serif font, black/white with weather-icon colour accents:

```
┌─────────────────────────────────────────────────┐
│  THE CITYPAPER          Wed, July 9, 2026        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  BERLIN DAILY EDITION   "All the news that fits" │
├──────────────────┬──────────────────────────────┤
│ ☁️ WEATHER        │  STORY OF THE DAY            │
│ 18°C, Cloudy     │  AI-generated headline story  │
│ Feels like 16°C  │  with full text from          │
│ MON TUE WED      │  EditorAgent...               │
│ 20° 17° 15°      │                               │
├──────────────────┴──────────────────────────────┤
│  TOP NEWS                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ 🏛️ Politics  │ │ ⚽ Sports    │ │ 🎭 Culture│ │
│  │ Headline 1   │ │ Headline 1   │ │ Headline1 │ │
│  │ Headline 2   │ │ Headline 2   │ │ Headline2 │ │
│  └──────────────┘ └──────────────┘ └──────────┘ │
├─────────────────────────────────────────────────┤
│  CITY SPOTLIGHT                                  │
│  Founded · Population · Key highlights           │
├─────────────────────────────────────────────────┤
│  EDITOR'S NOTE                                   │
│  AI-generated closing paragraph...               │
└─────────────────────────────────────────────────┘
```

---

## 9. Environment Variables

### Backend (`apps/backend/.env`)
```
NODE_ENV=development
PORT=3001
OPENWEATHER_API_KEY=
NEWS_API_KEY=
```

### Frontend (`apps/frontend/.env.local`)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## 10. Requirements Coverage

| ID | Requirement | Implementation |
|---|---|---|
| FR001 | Solo Project | ✓ |
| FR002 | Single Public Repo | ✓ Turborepo monorepo |
| FR003 | PR-Only Workflow | ✓ branch protection on main |
| FR004 | Express + TypeScript | ✓ `apps/backend` |
| FR005 | Zod Validation | ✓ all requests + API responses |
| FR006 | POST /agent | ✓ accepts `{ city, lat?, lng? }` |
| FR007 | Input Guardrail | ✓ regex + coordinate validation |
| FR008 | OpenAI Agents SDK | ✓ all agents use the SDK |
| FR009 | Orchestrator Agent | ✓ `orchestrator.agent.ts` |
| FR010 | ≥ 3 Sub-Agents | ✓ Weather, News, CityInfo, Editor (4 total) |
| FR011 | ≥ 2 Tool Functions + 1 external API | ✓ OpenWeatherMap, NewsAPI, Wikipedia (3 total) |
| FR012 | Local Model in Dev | ✓ Ollama llama3.2 (dev) / glm-z1-32b (prod) |
| FR013 | Fictitious Company | ✓ CityPaper — fictional city newspaper |
| FR014 | UML Sequence Diagram | ✓ to be added in README |
| FR015 | Diagram in Presentation | ✓ to be added in slide deck |
| FR016 | README + Swagger UI | ✓ `/api-docs` via swagger-ui-express |
