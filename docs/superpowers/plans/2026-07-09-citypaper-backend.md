# CityPaper Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Express 5 + TypeScript backend that orchestrates 4 AI agents (Weather, News, CityInfo, Editor) via Ollama, validates all I/O with Zod, and exposes `POST /agent` with Swagger docs.

**Architecture:** A single Express app under `apps/backend/` uses ES modules and path aliases. All LLM calls go through Ollama's OpenAI-compatible endpoint; the model switches between `llama3.2:3b` (dev) and `glm-z1-32b` (prod) via `NODE_ENV`. The Orchestrator agent runs Weather/News/CityInfo in parallel, then passes their output to the Editor agent.

**Tech Stack:** Express 5 · TypeScript 6 · Zod 4 · `@openai/agents` SDK · Ollama (OpenAI-compatible) · swagger-ui-express · swagger-jsdoc · vitest

## Global Constraints

- Node ≥ 20, TypeScript ≥ 6, ES modules (`"type": "module"` in package.json)
- Path aliases: `#agents`, `#tools`, `#schemas`, `#guardrails`, `#middlewares`, `#config`, `#routers`, `#controllers`
- All aliases resolve to `./src/<folder>/index.ts` in dev and `./dist/<folder>/index.js` in prod
- Express 5 (not 4) — async errors propagate automatically, no need for `next(err)` wrappers
- Zod 4 (`zod@^4.0.0`) — schema syntax is identical to v3
- OpenAI Agents SDK package: `@openai/agents`
- Ollama must be running locally on port 11434 for any agent task to succeed
- Every file uses `.ts` extension; imports use `.js` extension (ES module resolution)
- `vitest` for all tests; test files live next to source: `src/tools/openweather.tool.test.ts`
- Commit after every task using conventional commits (`feat:`, `test:`, `chore:`)

---

## File Map

| File | Responsibility |
|---|---|
| `apps/backend/package.json` | deps, scripts, path aliases |
| `apps/backend/tsconfig.json` | TS config, paths |
| `apps/backend/src/app.ts` | Express setup, middleware, Swagger, listen |
| `apps/backend/src/config/llm.config.ts` | Ollama client + model name by NODE_ENV |
| `apps/backend/src/schemas/agent.schema.ts` | Zod: AgentRequestSchema, NewspaperSchema |
| `apps/backend/src/guardrails/input.guardrail.ts` | validateInput() — regex + coord check |
| `apps/backend/src/tools/openweather.tool.ts` | fetchWeather(city) → WeatherData |
| `apps/backend/src/tools/newsapi.tool.ts` | fetchNews(city) → NewsData |
| `apps/backend/src/tools/wikipedia.tool.ts` | fetchCityInfo(city) → CityInfoData |
| `apps/backend/src/agents/weather.agent.ts` | WeatherAgent — calls openweather.tool |
| `apps/backend/src/agents/news.agent.ts` | NewsAgent — calls newsapi.tool |
| `apps/backend/src/agents/cityinfo.agent.ts` | CityInfoAgent — calls wikipedia.tool |
| `apps/backend/src/agents/editor.agent.ts` | EditorAgent — LLM only, no tool |
| `apps/backend/src/agents/orchestrator.agent.ts` | OrchestratorAgent — fans out + collects |
| `apps/backend/src/controllers/agent.controller.ts` | agentHandler(req, res) — guardrail → orchestrator |
| `apps/backend/src/routers/agent.router.ts` | POST /agent route |
| `apps/backend/src/middlewares/error.middleware.ts` | Global Express error handler |

---

## Task 1: Scaffold Backend Package

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/app.ts`
- Create: `apps/backend/.env.example`
- Create: `apps/backend/.gitignore`

**Interfaces:**
- Produces: running Express server on `PORT` (default 3001), `GET /health` returns `{ status: "ok" }`

- [ ] **Step 1: Create `apps/backend/package.json`**

```json
{
  "name": "citypaper-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/app.js",
  "scripts": {
    "dev": "node --watch --experimental-strip-types --env-file=.env --conditions=development src/app.ts",
    "build": "tsc",
    "start": "node --env-file=.env dist/app.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "imports": {
    "#agents": {
      "development": "./src/agents/index.ts",
      "default": "./dist/agents/index.js"
    },
    "#tools": {
      "development": "./src/tools/index.ts",
      "default": "./dist/tools/index.js"
    },
    "#schemas": {
      "development": "./src/schemas/index.ts",
      "default": "./dist/schemas/index.js"
    },
    "#guardrails": {
      "development": "./src/guardrails/index.ts",
      "default": "./dist/guardrails/index.js"
    },
    "#middlewares": {
      "development": "./src/middlewares/index.ts",
      "default": "./dist/middlewares/index.js"
    },
    "#config": {
      "development": "./src/config/index.ts",
      "default": "./dist/config/index.js"
    },
    "#routers": {
      "development": "./src/routers/index.ts",
      "default": "./dist/routers/index.js"
    },
    "#controllers": {
      "development": "./src/controllers/index.ts",
      "default": "./dist/controllers/index.js"
    }
  },
  "dependencies": {
    "@openai/agents": "^0.0.11",
    "express": "^5.2.1",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^22.0.0",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.8",
    "typescript": "^6.0.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create `apps/backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/backend/.env.example`**

```
NODE_ENV=development
PORT=3001
OPENWEATHER_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
```

- [ ] **Step 4: Create `apps/backend/.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 5: Create `apps/backend/src/app.ts`**

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`CityPaper backend running on port ${PORT}`));

export default app;
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/backend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Smoke test**

```bash
cd apps/backend && npm run dev
# In another terminal:
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
git add apps/backend/
git commit -m "chore: scaffold backend package with Express 5 + TypeScript"
```

---

## Task 2: Shared Zod Schemas

**Files:**
- Create: `apps/backend/src/schemas/agent.schema.ts`
- Create: `apps/backend/src/schemas/index.ts`
- Create: `apps/backend/src/schemas/agent.schema.test.ts`

**Interfaces:**
- Produces:
  - `AgentRequestSchema` — Zod schema, inferred type `AgentRequest`
  - `NewspaperSchema` — Zod schema, inferred type `Newspaper`
  - `WeatherDataSchema`, `NewsDataSchema`, `CityInfoDataSchema`, `EditorialSchema` — sub-schemas used by agents

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/schemas/agent.schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { AgentRequestSchema, NewspaperSchema } from "./agent.schema.js";

describe("AgentRequestSchema", () => {
  it("accepts valid city-only input", () => {
    const result = AgentRequestSchema.safeParse({ city: "Berlin" });
    expect(result.success).toBe(true);
  });

  it("accepts city with coordinates", () => {
    const result = AgentRequestSchema.safeParse({ city: "Berlin", lat: 52.5, lng: 13.4 });
    expect(result.success).toBe(true);
  });

  it("rejects missing city", () => {
    const result = AgentRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty city string", () => {
    const result = AgentRequestSchema.safeParse({ city: "" });
    expect(result.success).toBe(false);
  });
});

describe("NewspaperSchema", () => {
  it("validates a full newspaper object", () => {
    const newspaper = {
      city: "Berlin",
      generatedAt: new Date().toISOString(),
      weather: {
        current: { temp: 18, feelsLike: 16, description: "Cloudy", icon: "04d" },
        forecast: [
          { day: "Monday", temp: 20, description: "Sunny" },
          { day: "Tuesday", temp: 17, description: "Rainy" },
          { day: "Wednesday", temp: 15, description: "Cloudy" },
        ],
      },
      news: {
        politics: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
        sports: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
        culture: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
      },
      cityInfo: {
        summary: "Berlin is the capital of Germany.",
        highlights: ["Brandenburg Gate", "Museum Island"],
        population: 3700000,
      },
      editorial: {
        storyOfTheDay: "Today in Berlin...",
        editorsNote: "The city never sleeps...",
      },
    };
    const result = NewspaperSchema.safeParse(newspaper);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/backend && npm test
```

Expected: FAIL — `Cannot find module './agent.schema.js'`

- [ ] **Step 3: Create `apps/backend/src/schemas/agent.schema.ts`**

```typescript
import { z } from "zod";

export const AgentRequestSchema = z.object({
  city: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

export const WeatherCurrentSchema = z.object({
  temp: z.number(),
  feelsLike: z.number(),
  description: z.string(),
  icon: z.string(),
});

export const WeatherForecastItemSchema = z.object({
  day: z.string(),
  temp: z.number(),
  description: z.string(),
});

export const WeatherDataSchema = z.object({
  current: WeatherCurrentSchema,
  forecast: z.array(WeatherForecastItemSchema),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export const NewsItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string(),
});

export const NewsDataSchema = z.object({
  politics: z.array(NewsItemSchema),
  sports: z.array(NewsItemSchema),
  culture: z.array(NewsItemSchema),
});
export type NewsData = z.infer<typeof NewsDataSchema>;

export const CityInfoDataSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  population: z.number(),
});
export type CityInfoData = z.infer<typeof CityInfoDataSchema>;

export const EditorialSchema = z.object({
  storyOfTheDay: z.string(),
  editorsNote: z.string(),
});
export type Editorial = z.infer<typeof EditorialSchema>;

export const NewspaperSchema = z.object({
  city: z.string(),
  generatedAt: z.string(),
  weather: WeatherDataSchema,
  news: NewsDataSchema,
  cityInfo: CityInfoDataSchema,
  editorial: EditorialSchema,
});
export type Newspaper = z.infer<typeof NewspaperSchema>;
```

- [ ] **Step 4: Create `apps/backend/src/schemas/index.ts`**

```typescript
export * from "./agent.schema.js";
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd apps/backend && npm test
```

Expected: PASS — all 5 schema tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/schemas/
git commit -m "feat: add Zod schemas for AgentRequest and Newspaper"
```

---

## Task 3: LLM Config

**Files:**
- Create: `apps/backend/src/config/llm.config.ts`
- Create: `apps/backend/src/config/index.ts`

**Interfaces:**
- Consumes: `NODE_ENV` env var
- Produces:
  - `openaiClient` — `OpenAI` instance pointed at Ollama
  - `MODEL_NAME` — `string`, either `"llama3.2:3b"` or `"glm-z1-32b"`

- [ ] **Step 1: Create `apps/backend/src/config/llm.config.ts`**

```typescript
import OpenAI from "openai";

export const MODEL_NAME =
  process.env.NODE_ENV === "development" ? "llama3.2:3b" : "glm-z1-32b";

export const openaiClient = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});
```

- [ ] **Step 2: Create `apps/backend/src/config/index.ts`**

```typescript
export * from "./llm.config.js";
```

- [ ] **Step 3: Verify Ollama is running and model is available**

```bash
curl http://localhost:11434/v1/models
```

Expected: JSON list containing `llama3.2:3b` (in dev). If missing, pull it:

```bash
ollama pull llama3.2:3b
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/config/
git commit -m "feat: add Ollama LLM config with dev/prod model switch"
```

---

## Task 4: Input Guardrail

**Files:**
- Create: `apps/backend/src/guardrails/input.guardrail.ts`
- Create: `apps/backend/src/guardrails/index.ts`
- Create: `apps/backend/src/guardrails/input.guardrail.test.ts`

**Interfaces:**
- Consumes: `AgentRequest` from `#schemas`
- Produces: `validateInput(input: AgentRequest): { valid: true } | { valid: false; reason: string }`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/guardrails/input.guardrail.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateInput } from "./input.guardrail.js";

describe("validateInput", () => {
  it("accepts a valid city name", () => {
    const result = validateInput({ city: "Berlin" });
    expect(result.valid).toBe(true);
  });

  it("accepts a valid city with coordinates", () => {
    const result = validateInput({ city: "Berlin", lat: 52.5, lng: 13.4 });
    expect(result.valid).toBe(true);
  });

  it("rejects a single character city", () => {
    const result = validateInput({ city: "B" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/too short/i);
  });

  it("rejects script injection", () => {
    const result = validateInput({ city: "<script>alert(1)</script>" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/invalid/i);
  });

  it("rejects SQL injection", () => {
    const result = validateInput({ city: "'; DROP TABLE cities;--" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/invalid/i);
  });

  it("rejects out-of-range latitude", () => {
    const result = validateInput({ city: "Berlin", lat: 999, lng: 13.4 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/coordinates/i);
  });

  it("rejects out-of-range longitude", () => {
    const result = validateInput({ city: "Berlin", lat: 52.5, lng: 999 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/coordinates/i);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/backend && npm test
```

Expected: FAIL — `Cannot find module './input.guardrail.js'`

- [ ] **Step 3: Create `apps/backend/src/guardrails/input.guardrail.ts`**

```typescript
import type { AgentRequest } from "#schemas";

const UNSAFE_PATTERN = /<[^>]+>|(['";])\s*(drop|select|insert|update|delete|union)\s/i;

type GuardrailResult = { valid: true } | { valid: false; reason: string };

export function validateInput(input: AgentRequest): GuardrailResult {
  if (input.city.trim().length < 2) {
    return { valid: false, reason: "City name too short (minimum 2 characters)." };
  }

  if (UNSAFE_PATTERN.test(input.city)) {
    return { valid: false, reason: "Invalid input detected." };
  }

  if (input.lat !== undefined || input.lng !== undefined) {
    const lat = input.lat ?? 0;
    const lng = input.lng ?? 0;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { valid: false, reason: "Invalid coordinates provided." };
    }
  }

  return { valid: true };
}
```

- [ ] **Step 4: Create `apps/backend/src/guardrails/index.ts`**

```typescript
export * from "./input.guardrail.js";
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd apps/backend && npm test
```

Expected: PASS — all 7 guardrail tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/guardrails/
git commit -m "feat: add input guardrail with regex and coordinate validation"
```

---

## Task 5: Tool Functions

**Files:**
- Create: `apps/backend/src/tools/openweather.tool.ts`
- Create: `apps/backend/src/tools/newsapi.tool.ts`
- Create: `apps/backend/src/tools/wikipedia.tool.ts`
- Create: `apps/backend/src/tools/index.ts`
- Create: `apps/backend/src/tools/openweather.tool.test.ts`
- Create: `apps/backend/src/tools/newsapi.tool.test.ts`
- Create: `apps/backend/src/tools/wikipedia.tool.test.ts`

**Interfaces:**
- Produces:
  - `fetchWeather(city: string): Promise<WeatherData>`
  - `fetchNews(city: string): Promise<NewsData>`
  - `fetchCityInfo(city: string): Promise<CityInfoData>`
- All three functions validate their API response with Zod and throw on parse failure.

- [ ] **Step 1: Write failing tests for weather tool**

Create `apps/backend/src/tools/openweather.tool.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.stubEnv("OPENWEATHER_API_KEY", "test-key");

describe("fetchWeather", () => {
  it("returns WeatherData shaped object for a valid city", async () => {
    const mockCurrentResponse = {
      main: { temp: 18.5, feels_like: 16.2 },
      weather: [{ description: "scattered clouds", icon: "03d" }],
    };
    const mockForecastResponse = {
      list: [
        { dt: 1720000000, main: { temp: 20 }, weather: [{ description: "sunny" }] },
        { dt: 1720086400, main: { temp: 17 }, weather: [{ description: "rainy" }] },
        { dt: 1720172800, main: { temp: 15 }, weather: [{ description: "cloudy" }] },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockCurrentResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockForecastResponse });

    const { fetchWeather } = await import("./openweather.tool.js");
    const result = await fetchWeather("Berlin");

    expect(result.current.temp).toBeCloseTo(18.5);
    expect(result.current.description).toBe("scattered clouds");
    expect(result.forecast).toHaveLength(3);
  });

  it("throws when API key is missing", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const { fetchWeather } = await import("./openweather.tool.js");
    await expect(fetchWeather("Berlin")).rejects.toThrow(/API key/i);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/backend && npm test -- openweather
```

Expected: FAIL — `Cannot find module './openweather.tool.js'`

- [ ] **Step 3: Create `apps/backend/src/tools/openweather.tool.ts`**

```typescript
import { z } from "zod";
import type { WeatherData } from "#schemas";

const BASE = "https://api.openweathermap.org/data/2.5";

const OWMCurrentSchema = z.object({
  main: z.object({ temp: z.number(), feels_like: z.number() }),
  weather: z.array(z.object({ description: z.string(), icon: z.string() })),
});

const OWMForecastSchema = z.object({
  list: z.array(
    z.object({
      dt: z.number(),
      main: z.object({ temp: z.number() }),
      weather: z.array(z.object({ description: z.string() })),
    })
  ),
});

export async function fetchWeather(city: string): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("OPENWEATHER_API_KEY is missing from environment.");

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`),
    fetch(`${BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&cnt=3&appid=${key}`),
  ]);

  if (!currentRes.ok) throw new Error(`OpenWeatherMap current error: ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`OpenWeatherMap forecast error: ${forecastRes.status}`);

  const current = OWMCurrentSchema.parse(await currentRes.json());
  const forecast = OWMForecastSchema.parse(await forecastRes.json());

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      description: current.weather[0]!.description,
      icon: current.weather[0]!.icon,
    },
    forecast: forecast.list.map((item) => ({
      day: days[new Date(item.dt * 1000).getDay()]!,
      temp: Math.round(item.main.temp),
      description: item.weather[0]!.description,
    })),
  };
}
```

- [ ] **Step 4: Write failing tests for news tool**

Create `apps/backend/src/tools/newsapi.tool.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.stubEnv("NEWS_API_KEY", "test-key");

describe("fetchNews", () => {
  it("returns NewsData with three categories", async () => {
    const mockArticles = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        title: `Title ${i}`,
        description: `Desc ${i}`,
        url: `https://example.com/${i}`,
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articles: mockArticles(5) }),
    });

    const { fetchNews } = await import("./newsapi.tool.js");
    const result = await fetchNews("Berlin");

    expect(result.politics.length).toBeGreaterThan(0);
    expect(result.sports.length).toBeGreaterThan(0);
    expect(result.culture.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Create `apps/backend/src/tools/newsapi.tool.ts`**

```typescript
import { z } from "zod";
import type { NewsData } from "#schemas";

const NewsAPIResponseSchema = z.object({
  articles: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      url: z.string(),
    })
  ),
});

export async function fetchNews(city: string): Promise<NewsData> {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new Error("NEWS_API_KEY is missing from environment.");

  const [politicsRes, sportsRes, cultureRes] = await Promise.all([
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+politics&pageSize=2&apiKey=${key}`
    ),
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+sports&pageSize=2&apiKey=${key}`
    ),
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+culture&pageSize=2&apiKey=${key}`
    ),
  ]);

  const toItems = async (res: Response) => {
    if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
    const data = NewsAPIResponseSchema.parse(await res.json());
    return data.articles
      .filter((a) => a.title && a.description)
      .map((a) => ({
        title: a.title!,
        summary: a.description!,
        url: a.url,
      }));
  };

  const [politics, sports, culture] = await Promise.all([
    toItems(politicsRes),
    toItems(sportsRes),
    toItems(cultureRes),
  ]);

  return { politics, sports, culture };
}
```

- [ ] **Step 6: Write failing tests for Wikipedia tool**

Create `apps/backend/src/tools/wikipedia.tool.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("fetchCityInfo", () => {
  it("returns CityInfoData for a valid city", async () => {
    const mockSummary = {
      extract: "Berlin is the capital and largest city of Germany.",
      infobox: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSummary,
    });

    const { fetchCityInfo } = await import("./wikipedia.tool.js");
    const result = await fetchCityInfo("Berlin");

    expect(result.summary).toContain("Berlin");
    expect(Array.isArray(result.highlights)).toBe(true);
    expect(typeof result.population).toBe("number");
  });
});
```

- [ ] **Step 7: Create `apps/backend/src/tools/wikipedia.tool.ts`**

```typescript
import { z } from "zod";
import type { CityInfoData } from "#schemas";

const WikiSummarySchema = z.object({
  extract: z.string(),
});

const CITY_HIGHLIGHTS: Record<string, string[]> = {};

export async function fetchCityInfo(city: string): Promise<CityInfoData> {
  const encoded = encodeURIComponent(city.replace(/ /g, "_"));
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  );

  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status} for city "${city}"`);

  const data = WikiSummarySchema.parse(await res.json());
  const extract = data.extract;

  const populationMatch = extract.match(/population of ([\d,]+)/i) ??
    extract.match(/([\d,]+) (inhabitants|residents|people)/i);
  const population = populationMatch
    ? parseInt(populationMatch[1]!.replace(/,/g, ""), 10)
    : 0;

  const sentences = extract.split(". ").slice(0, 3);
  const highlights = CITY_HIGHLIGHTS[city.toLowerCase()] ?? sentences.slice(1);

  return {
    summary: extract.slice(0, 500),
    highlights: highlights.slice(0, 4),
    population,
  };
}
```

- [ ] **Step 8: Create `apps/backend/src/tools/index.ts`**

```typescript
export * from "./openweather.tool.js";
export * from "./newsapi.tool.js";
export * from "./wikipedia.tool.js";
```

- [ ] **Step 9: Run all tests — verify they pass**

```bash
cd apps/backend && npm test
```

Expected: PASS — all tool tests green.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/tools/
git commit -m "feat: add OpenWeatherMap, NewsAPI, and Wikipedia tool functions"
```

---

## Task 6: AI Agents

**Files:**
- Create: `apps/backend/src/agents/weather.agent.ts`
- Create: `apps/backend/src/agents/news.agent.ts`
- Create: `apps/backend/src/agents/cityinfo.agent.ts`
- Create: `apps/backend/src/agents/editor.agent.ts`
- Create: `apps/backend/src/agents/orchestrator.agent.ts`
- Create: `apps/backend/src/agents/index.ts`

**Interfaces:**
- Consumes: `openaiClient`, `MODEL_NAME` from `#config`; all tool functions from `#tools`; all Zod types from `#schemas`
- Produces: `runOrchestrator(city: string): Promise<Newspaper>`

> Note: The `@openai/agents` SDK uses `Agent`, `tool`, and `run` from `"@openai/agents"`. Each agent is created with `new Agent({...})` and tools are defined with the `tool()` helper. The orchestrator calls `run(agent, input)` and returns `.finalOutput`.

- [ ] **Step 1: Create `apps/backend/src/agents/weather.agent.ts`**

```typescript
import { Agent, tool } from "@openai/agents";
import { z } from "zod";
import { openaiClient, MODEL_NAME } from "#config";
import { fetchWeather } from "#tools";
import type { WeatherData } from "#schemas";

const weatherTool = tool({
  name: "fetch_weather",
  description: "Fetch current weather and 3-day forecast for a city.",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }): Promise<WeatherData> => fetchWeather(city),
});

export const weatherAgent = new Agent({
  name: "WeatherAgent",
  instructions:
    "You fetch weather data for a given city. Use the fetch_weather tool and return the result as JSON.",
  tools: [weatherTool],
  model: MODEL_NAME,
  modelSettings: { client: openaiClient },
});
```

- [ ] **Step 2: Create `apps/backend/src/agents/news.agent.ts`**

```typescript
import { Agent, tool } from "@openai/agents";
import { z } from "zod";
import { openaiClient, MODEL_NAME } from "#config";
import { fetchNews } from "#tools";
import type { NewsData } from "#schemas";

const newsTool = tool({
  name: "fetch_news",
  description: "Fetch local news articles for a city, categorised by politics, sports, and culture.",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }): Promise<NewsData> => fetchNews(city),
});

export const newsAgent = new Agent({
  name: "NewsAgent",
  instructions:
    "You fetch categorised news for a given city. Use the fetch_news tool and return the result as JSON.",
  tools: [newsTool],
  model: MODEL_NAME,
  modelSettings: { client: openaiClient },
});
```

- [ ] **Step 3: Create `apps/backend/src/agents/cityinfo.agent.ts`**

```typescript
import { Agent, tool } from "@openai/agents";
import { z } from "zod";
import { openaiClient, MODEL_NAME } from "#config";
import { fetchCityInfo } from "#tools";
import type { CityInfoData } from "#schemas";

const cityInfoTool = tool({
  name: "fetch_city_info",
  description: "Fetch city summary, highlights, and population from Wikipedia.",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }): Promise<CityInfoData> => fetchCityInfo(city),
});

export const cityInfoAgent = new Agent({
  name: "CityInfoAgent",
  instructions:
    "You fetch city information for a given city. Use the fetch_city_info tool and return the result as JSON.",
  tools: [cityInfoTool],
  model: MODEL_NAME,
  modelSettings: { client: openaiClient },
});
```

- [ ] **Step 4: Create `apps/backend/src/agents/editor.agent.ts`**

```typescript
import { Agent } from "@openai/agents";
import { openaiClient, MODEL_NAME } from "#config";

export const editorAgent = new Agent({
  name: "EditorAgent",
  instructions: `You are the chief editor of CityPaper, a daily city newspaper.
Given weather data, news articles, and city information as JSON input,
write two things:
1. "storyOfTheDay": A compelling 3-sentence lead story that ties together the city's current weather, top news, and a city highlight.
2. "editorsNote": A warm, witty 2-sentence closing note from the editor about today's city.

Respond ONLY with valid JSON in this format:
{ "storyOfTheDay": "...", "editorsNote": "..." }`,
  model: MODEL_NAME,
  modelSettings: { client: openaiClient },
});
```

- [ ] **Step 5: Create `apps/backend/src/agents/orchestrator.agent.ts`**

```typescript
import { run } from "@openai/agents";
import { EditorialSchema, NewspaperSchema } from "#schemas";
import type { Newspaper, WeatherData, NewsData, CityInfoData } from "#schemas";
import { weatherAgent } from "./weather.agent.js";
import { newsAgent } from "./news.agent.js";
import { cityInfoAgent } from "./cityinfo.agent.js";
import { editorAgent } from "./editor.agent.js";

export async function runOrchestrator(city: string): Promise<Newspaper> {
  const [weatherResult, newsResult, cityInfoResult] = await Promise.all([
    run(weatherAgent, `Fetch weather for ${city}`),
    run(newsAgent, `Fetch news for ${city}`),
    run(cityInfoAgent, `Fetch city info for ${city}`),
  ]);

  const weather = weatherResult.finalOutput as WeatherData;
  const news = newsResult.finalOutput as NewsData;
  const cityInfo = cityInfoResult.finalOutput as CityInfoData;

  const editorInput = JSON.stringify({ city, weather, news, cityInfo });
  const editorResult = await run(editorAgent, editorInput);

  const editorialRaw =
    typeof editorResult.finalOutput === "string"
      ? JSON.parse(editorResult.finalOutput)
      : editorResult.finalOutput;

  const editorial = EditorialSchema.parse(editorialRaw);

  return NewspaperSchema.parse({
    city,
    generatedAt: new Date().toISOString(),
    weather,
    news,
    cityInfo,
    editorial,
  });
}
```

- [ ] **Step 6: Create `apps/backend/src/agents/index.ts`**

```typescript
export * from "./orchestrator.agent.js";
```

- [ ] **Step 7: Type-check the agents**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors. If you see errors about `@openai/agents` types, check that `npm install` completed successfully and the package is listed in `node_modules/@openai/agents`.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/agents/
git commit -m "feat: add Weather, News, CityInfo, Editor, and Orchestrator agents"
```

---

## Task 7: Express Router, Controller, and Middleware

**Files:**
- Create: `apps/backend/src/controllers/agent.controller.ts`
- Create: `apps/backend/src/controllers/index.ts`
- Create: `apps/backend/src/routers/agent.router.ts`
- Create: `apps/backend/src/routers/index.ts`
- Create: `apps/backend/src/middlewares/error.middleware.ts`
- Create: `apps/backend/src/middlewares/index.ts`
- Modify: `apps/backend/src/app.ts`

**Interfaces:**
- Consumes: `validateInput` from `#guardrails`; `AgentRequestSchema` from `#schemas`; `runOrchestrator` from `#agents`
- Produces: `POST /agent` returns `Newspaper` JSON or HTTP 400/500 with `{ error: string }`

- [ ] **Step 1: Create `apps/backend/src/middlewares/error.middleware.ts`**

```typescript
import type { ErrorRequestHandler } from "express";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: message });
};
```

- [ ] **Step 2: Create `apps/backend/src/middlewares/index.ts`**

```typescript
export * from "./error.middleware.js";
```

- [ ] **Step 3: Create `apps/backend/src/controllers/agent.controller.ts`**

```typescript
import type { RequestHandler } from "express";
import { AgentRequestSchema } from "#schemas";
import { validateInput } from "#guardrails";
import { runOrchestrator } from "#agents";

export const agentHandler: RequestHandler = async (req, res) => {
  const parsed = AgentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const guardrail = validateInput(parsed.data);
  if (!guardrail.valid) {
    res.status(400).json({ error: guardrail.reason });
    return;
  }

  const newspaper = await runOrchestrator(parsed.data.city);
  res.json(newspaper);
};
```

- [ ] **Step 4: Create `apps/backend/src/controllers/index.ts`**

```typescript
export * from "./agent.controller.js";
```

- [ ] **Step 5: Create `apps/backend/src/routers/agent.router.ts`**

```typescript
import { Router } from "express";
import { agentHandler } from "#controllers";

/**
 * @openapi
 * /agent:
 *   post:
 *     summary: Generate a CityPaper newspaper edition
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [city]
 *             properties:
 *               city:
 *                 type: string
 *                 example: Berlin
 *               lat:
 *                 type: number
 *                 example: 52.52
 *               lng:
 *                 type: number
 *                 example: 13.405
 *     responses:
 *       200:
 *         description: Newspaper edition generated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Agent or API error
 */
export const agentRouter = Router();
agentRouter.post("/agent", agentHandler);
```

- [ ] **Step 6: Create `apps/backend/src/routers/index.ts`**

```typescript
export * from "./agent.router.js";
```

- [ ] **Step 7: Update `apps/backend/src/app.ts` with all middleware, router, and Swagger**

```typescript
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { agentRouter } from "#routers";
import { errorMiddleware } from "#middlewares";

const app = express();
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "CityPaper API", version: "1.0.0" },
  },
  apis: ["./src/routers/*.ts"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/", agentRouter);
app.use(errorMiddleware);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`CityPaper backend running on port ${PORT}`));

export default app;
```

- [ ] **Step 8: Type-check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Manual smoke test (Ollama must be running)**

```bash
cd apps/backend && npm run dev
# In another terminal:
curl -X POST http://localhost:3001/agent \
  -H "Content-Type: application/json" \
  -d '{"city": "Berlin"}'
```

Expected: JSON newspaper object with all fields populated.

```bash
# Test guardrail rejection:
curl -X POST http://localhost:3001/agent \
  -H "Content-Type: application/json" \
  -d '{"city": "<script>"}'
```

Expected: `{"error":"Invalid input detected."}`

```bash
# Test Swagger UI:
open http://localhost:3001/api-docs
```

Expected: Swagger UI renders with `POST /agent` endpoint.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/controllers/ apps/backend/src/routers/ apps/backend/src/middlewares/ apps/backend/src/app.ts
git commit -m "feat: wire POST /agent endpoint with guardrail, controller, and Swagger UI"
```

---

## Task 8: UML Sequence Diagram + README

**Files:**
- Create: `apps/backend/README.md`
- Create: `docs/uml-sequence.md`

**Interfaces:**
- Produces: documented repo with UML diagram for FR014–FR016

- [ ] **Step 1: Create `docs/uml-sequence.md`**

````markdown
# CityPaper — UML Sequence Diagram

```
Client          Express         Guardrail       Orchestrator
  |                |                |                |
  |  POST /agent   |                |                |
  |--------------->|                |                |
  |                | validateInput()|                |
  |                |--------------->|                |
  |                |    {valid:true}|                |
  |                |<---------------|                |
  |                |                | runOrchestrator|
  |                |--------------------------------->|
  |                |                |                |
  |                |                |      WeatherAgent    OpenWeatherMap
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      NewsAgent       NewsAPI
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      CityInfoAgent   Wikipedia
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      EditorAgent     Ollama
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |   Newspaper{}  |                |
  |<---------------|                |                |
```
````

- [ ] **Step 2: Create `apps/backend/README.md`**

````markdown
# CityPaper — Backend API

AI-powered city newspaper generator. Submit a city name and receive a fully generated newspaper edition with weather, news, city info, and an AI-written story.

## Setup

```bash
cp .env.example .env
# Fill in OPENWEATHER_API_KEY and NEWS_API_KEY
npm install
```

## Running locally (requires Ollama)

```bash
# Pull the development model
ollama pull llama3.2:3b

# Start the server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` uses llama3.2:3b; production uses glm-z1-32b |
| `PORT` | No | Server port (default: 3001) |
| `OPENWEATHER_API_KEY` | Yes | From openweathermap.org (free tier) |
| `NEWS_API_KEY` | Yes | From newsapi.org (free developer plan) |

## API

### POST /agent

Generate a newspaper edition for a city.

**Request:**
```json
{ "city": "Berlin", "lat": 52.52, "lng": 13.405 }
```

**Response:** Full `Newspaper` JSON object.

### GET /api-docs

Swagger UI with full API documentation.

### GET /health

Returns `{ "status": "ok" }`.

## Agent Architecture

```
POST /agent
  └── Input Guardrail (regex + coordinate validation)
        └── Orchestrator Agent
              ├── WeatherAgent  → OpenWeatherMap API
              ├── NewsAgent     → NewsAPI.org
              ├── CityInfoAgent → Wikipedia REST API
              └── EditorAgent   → Ollama LLM (story + note)
```

## LLM

- **Development** (`NODE_ENV=development`): `llama3.2:3b` via Ollama
- **Production**: `glm-z1-32b` via Ollama

See `src/config/llm.config.ts`.
````

- [ ] **Step 3: Commit**

```bash
git add docs/uml-sequence.md apps/backend/README.md
git commit -m "docs: add UML sequence diagram and backend README"
```

---

## Self-Review

**Spec coverage check:**

| FR | Covered in Task |
|---|---|
| FR004 Express + TypeScript | Task 1 |
| FR005 Zod Validation | Task 2 — schemas; Task 5 — tool responses |
| FR006 POST /agent | Task 7 |
| FR007 Input Guardrail | Task 4 |
| FR008 OpenAI Agents SDK | Task 6 |
| FR009 Orchestrator Agent | Task 6, Step 5 |
| FR010 ≥ 3 Sub-Agents | Task 6 — Weather, News, CityInfo, Editor (4 total) |
| FR011 ≥ 2 tools + 1 external API | Task 5 — 3 tools, all external |
| FR012 Local model in dev | Task 3 |
| FR013 Fictitious company | CityPaper throughout |
| FR014 UML Diagram | Task 8 |
| FR015 Diagram in README | Task 8 |
| FR016 README + Swagger | Task 7 (Swagger), Task 8 (README) |

**Placeholder scan:** No TBDs, all code blocks complete. ✓

**Type consistency:**
- `WeatherData`, `NewsData`, `CityInfoData`, `Editorial`, `Newspaper` defined in Task 2, used consistently in Tasks 5, 6, 7. ✓
- `validateInput` defined in Task 4, consumed in Task 7. ✓
- `runOrchestrator` defined in Task 6, consumed in Task 7. ✓
- `openaiClient`, `MODEL_NAME` defined in Task 3, consumed in Task 6. ✓
