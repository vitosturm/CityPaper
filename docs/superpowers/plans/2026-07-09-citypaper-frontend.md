# CityPaper Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Next.js 15 frontend with a Google Maps city selector and a classic broadsheet newspaper onepager that displays the backend's AI-generated content.

**Architecture:** Two pages under `apps/frontend/app/`: a landing page (`/`) with a Google Maps click handler and text search, and a newspaper page (`/newspaper/[city]`) that fetches from `POST /agent` on the backend and renders a CSS Grid broadsheet layout. Shared Zod types live in `packages/shared`.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · `@react-google-maps/api` · Zod (shared types from `packages/shared`)

## Global Constraints

- Next.js 15 with App Router; no Pages Router
- TypeScript strict mode
- Tailwind CSS for all styling (no CSS modules, no styled-components)
- `Playfair Display` font via `next/font/google` for newspaper headings
- Backend URL from `NEXT_PUBLIC_BACKEND_URL` env var (default `http://localhost:3001`)
- Google Maps API key from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- All backend fetch calls go through a single `lib/api.ts` client
- Commit after every task using conventional commits

---

## File Map

| File | Responsibility |
|---|---|
| `apps/frontend/package.json` | deps and scripts |
| `apps/frontend/next.config.ts` | Next.js config |
| `apps/frontend/tailwind.config.ts` | Tailwind + Playfair Display font |
| `apps/frontend/app/layout.tsx` | Root layout, font injection |
| `apps/frontend/app/page.tsx` | Landing page: SearchBar + CityMap |
| `apps/frontend/app/newspaper/[city]/page.tsx` | Newspaper onepager (server component, fetches backend) |
| `apps/frontend/lib/api.ts` | `generateNewspaper(city, lat?, lng?)` — calls POST /agent |
| `apps/frontend/components/SearchBar.tsx` | Controlled text input + submit |
| `apps/frontend/components/CityMap.tsx` | Google Maps click handler |
| `apps/frontend/components/newspaper/NewspaperLayout.tsx` | CSS Grid broadsheet wrapper |
| `apps/frontend/components/newspaper/WeatherWidget.tsx` | Current + forecast display |
| `apps/frontend/components/newspaper/NewsGrid.tsx` | Three-column news categories |
| `apps/frontend/components/newspaper/StoryOfTheDay.tsx` | Lead story + Editor's Note |
| `packages/shared/src/schemas/newspaper.schema.ts` | Shared Zod `NewspaperSchema` + `Newspaper` type |
| `packages/shared/package.json` | shared package config |

---

## Task 1: Shared Package + Frontend Scaffold

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/schemas/newspaper.schema.ts`
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/next.config.ts`
- Create: `apps/frontend/.env.local.example`
- Create: `apps/frontend/.gitignore`

**Interfaces:**
- Produces:
  - `NewspaperSchema` and `Newspaper` type exported from `packages/shared`
  - Runnable Next.js dev server at `http://localhost:3000`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@citypaper/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/schemas/newspaper.schema.ts",
  "exports": {
    ".": "./src/schemas/newspaper.schema.ts"
  }
}
```

- [ ] **Step 2: Create `packages/shared/src/schemas/newspaper.schema.ts`**

This must match the `NewspaperSchema` in `apps/backend/src/schemas/agent.schema.ts` exactly:

```typescript
import { z } from "zod";

export const NewspaperSchema = z.object({
  city: z.string(),
  generatedAt: z.string(),
  weather: z.object({
    current: z.object({
      temp: z.number(),
      feelsLike: z.number(),
      description: z.string(),
      icon: z.string(),
    }),
    forecast: z.array(
      z.object({
        day: z.string(),
        temp: z.number(),
        description: z.string(),
      })
    ),
  }),
  news: z.object({
    politics: z.array(z.object({ title: z.string(), summary: z.string(), url: z.string() })),
    sports: z.array(z.object({ title: z.string(), summary: z.string(), url: z.string() })),
    culture: z.array(z.object({ title: z.string(), summary: z.string(), url: z.string() })),
  }),
  cityInfo: z.object({
    summary: z.string(),
    highlights: z.array(z.string()),
    population: z.number(),
  }),
  editorial: z.object({
    storyOfTheDay: z.string(),
    editorsNote: z.string(),
  }),
});

export type Newspaper = z.infer<typeof NewspaperSchema>;
```

- [ ] **Step 3: Create `apps/frontend/package.json`**

```json
{
  "name": "citypaper-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@citypaper/shared": "*",
    "@react-google-maps/api": "^2.20.3",
    "next": "15.3.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.1.8",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 4: Create `apps/frontend/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@citypaper/shared"],
};

export default nextConfig;
```

- [ ] **Step 5: Create `apps/frontend/.env.local.example`**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

- [ ] **Step 6: Create `apps/frontend/.gitignore`**

```
node_modules/
.next/
.env.local
```

- [ ] **Step 7: Install dependencies**

```bash
cd packages/shared && npm install zod
cd ../../apps/frontend && npm install
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/ apps/frontend/
git commit -m "chore: scaffold shared package and Next.js frontend"
```

---

## Task 2: Root Layout + API Client

**Files:**
- Create: `apps/frontend/app/layout.tsx`
- Create: `apps/frontend/lib/api.ts`

**Interfaces:**
- Produces:
  - `generateNewspaper(city: string, lat?: number, lng?: number): Promise<Newspaper>` — calls `POST /agent`

- [ ] **Step 1: Create `apps/frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CityPaper",
  description: "Your Daily City Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `apps/frontend/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --font-playfair: "Playfair Display", serif;
  --font-inter: "Inter", sans-serif;
}
```

- [ ] **Step 3: Create `apps/frontend/lib/api.ts`**

```typescript
import { NewspaperSchema, type Newspaper } from "@citypaper/shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export async function generateNewspaper(
  city: string,
  lat?: number,
  lng?: number
): Promise<Newspaper> {
  const res = await fetch(`${BACKEND_URL}/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, lat, lng }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return NewspaperSchema.parse(await res.json());
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/ apps/frontend/lib/
git commit -m "feat: add root layout with Playfair Display and API client"
```

---

## Task 3: Landing Page (SearchBar + CityMap)

**Files:**
- Create: `apps/frontend/components/SearchBar.tsx`
- Create: `apps/frontend/components/CityMap.tsx`
- Create: `apps/frontend/app/page.tsx`

**Interfaces:**
- Produces: Landing page at `/` with working search and map; "Generate Edition" navigates to `/newspaper/[city]`

- [ ] **Step 1: Create `apps/frontend/components/SearchBar.tsx`**

```tsx
"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (city: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-2 w-full max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSearch(value.trim())}
        placeholder="Enter city name or ZIP code..."
        className="flex-1 border border-gray-300 rounded px-4 py-2 font-[--font-inter] text-sm focus:outline-none focus:border-gray-600"
      />
      <button
        onClick={() => value.trim() && onSearch(value.trim())}
        className="bg-black text-white px-4 py-2 rounded text-sm font-[--font-inter] hover:bg-gray-800"
      >
        Search
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/frontend/components/CityMap.tsx`**

```tsx
"use client";

import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useCallback } from "react";

interface CityMapProps {
  onCitySelect: (city: string, lat: number, lng: number) => void;
}

const MAP_STYLES = { width: "100%", height: "400px" };
const DEFAULT_CENTER = { lat: 51.0, lng: 10.0 };

export function CityMap({ onCitySelect }: CityMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["geocoding"],
  });

  const handleClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      const locality =
        result.results[0]?.address_components?.find((c) =>
          c.types.includes("locality")
        )?.long_name ?? result.results[0]?.formatted_address ?? "Unknown";

      onCitySelect(locality, lat, lng);
    },
    [onCitySelect]
  );

  if (!isLoaded) return <div className="h-96 bg-gray-100 animate-pulse rounded" />;

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLES}
      center={DEFAULT_CENTER}
      zoom={4}
      onClick={handleClick}
      options={{ streetViewControl: false, mapTypeControl: false }}
    />
  );
}
```

- [ ] **Step 3: Create `apps/frontend/app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "../components/SearchBar";
import { CityMap } from "../components/CityMap";

export default function LandingPage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleSearch = (city: string) => {
    router.push(`/newspaper/${encodeURIComponent(city)}`);
  };

  const handleMapSelect = (city: string, lat: number, lng: number) => {
    setSelectedCity(city);
    setCoords({ lat, lng });
  };

  const handleGenerate = () => {
    if (!selectedCity) return;
    const params = coords
      ? `?lat=${coords.lat}&lng=${coords.lng}`
      : "";
    router.push(`/newspaper/${encodeURIComponent(selectedCity)}${params}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="font-[--font-playfair] text-5xl font-bold tracking-tight">
          🗞️ CityPaper
        </h1>
        <p className="text-gray-500 mt-2 font-[--font-inter] text-sm">
          Your Daily City Intelligence
        </p>
      </div>

      <SearchBar onSearch={handleSearch} />

      <div className="w-full max-w-3xl rounded overflow-hidden border border-gray-200 shadow">
        <CityMap onCitySelect={handleMapSelect} />
      </div>

      {selectedCity && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600 font-[--font-inter]">
            Selected: <strong>{selectedCity}</strong>
          </p>
          <button
            onClick={handleGenerate}
            className="bg-black text-white px-6 py-3 rounded font-[--font-inter] text-sm hover:bg-gray-800"
          >
            Generate Edition
          </button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run dev server and verify**

```bash
cd apps/frontend && npm run dev
open http://localhost:3000
```

Expected: Landing page renders with title, search bar, and Google Maps. Typing a city and pressing Enter navigates to `/newspaper/[city]` (will show 404 until Task 4).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/ apps/frontend/app/page.tsx
git commit -m "feat: add landing page with SearchBar and Google Maps city selector"
```

---

## Task 4: Newspaper Components

**Files:**
- Create: `apps/frontend/components/newspaper/WeatherWidget.tsx`
- Create: `apps/frontend/components/newspaper/NewsGrid.tsx`
- Create: `apps/frontend/components/newspaper/StoryOfTheDay.tsx`
- Create: `apps/frontend/components/newspaper/NewspaperLayout.tsx`

**Interfaces:**
- Consumes: `Newspaper` type from `@citypaper/shared`
- Produces: Four pure display components, each accepting typed props

- [ ] **Step 1: Create `apps/frontend/components/newspaper/WeatherWidget.tsx`**

```tsx
import type { Newspaper } from "@citypaper/shared";

type Props = { weather: Newspaper["weather"] };

export function WeatherWidget({ weather }: Props) {
  return (
    <div className="border-r border-gray-300 pr-4">
      <h3 className="font-[--font-playfair] text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
        Weather
      </h3>
      <div className="flex items-center gap-2">
        <img
          src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
          alt={weather.current.description}
          className="w-12 h-12"
        />
        <div>
          <p className="font-[--font-playfair] text-3xl font-bold">{weather.current.temp}°C</p>
          <p className="text-xs text-gray-500 capitalize">{weather.current.description}</p>
          <p className="text-xs text-gray-400">Feels like {weather.current.feelsLike}°C</p>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        {weather.forecast.map((day) => (
          <div key={day.day} className="text-center">
            <p className="text-xs font-bold text-gray-600">{day.day.slice(0, 3).toUpperCase()}</p>
            <p className="text-sm font-[--font-playfair]">{day.temp}°</p>
            <p className="text-xs text-gray-400 capitalize">{day.description.split(" ")[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/frontend/components/newspaper/StoryOfTheDay.tsx`**

```tsx
import type { Newspaper } from "@citypaper/shared";

type Props = { editorial: Newspaper["editorial"] };

export function StoryOfTheDay({ editorial }: Props) {
  return (
    <div className="pl-4">
      <h3 className="font-[--font-playfair] text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
        Story of the Day
      </h3>
      <p className="font-[--font-playfair] text-base leading-snug">{editorial.storyOfTheDay}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/frontend/components/newspaper/NewsGrid.tsx`**

```tsx
import type { Newspaper } from "@citypaper/shared";

type Props = { news: Newspaper["news"] };

const CATEGORIES = [
  { key: "politics" as const, label: "🏛️ Politics" },
  { key: "sports" as const, label: "⚽ Sports" },
  { key: "culture" as const, label: "🎭 Culture" },
];

export function NewsGrid({ news }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-300 py-4">
      {CATEGORIES.map(({ key, label }) => (
        <div key={key}>
          <h3 className="font-[--font-playfair] text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            {label}
          </h3>
          <ul className="space-y-2">
            {news[key].map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[--font-playfair] text-sm font-bold leading-tight hover:underline"
                >
                  {item.title}
                </a>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/frontend/components/newspaper/NewspaperLayout.tsx`**

```tsx
import type { Newspaper } from "@citypaper/shared";
import { WeatherWidget } from "./WeatherWidget";
import { StoryOfTheDay } from "./StoryOfTheDay";
import { NewsGrid } from "./NewsGrid";

type Props = { newspaper: Newspaper };

export function NewspaperLayout({ newspaper }: Props) {
  const date = new Date(newspaper.generatedAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border border-gray-300 shadow-md font-[--font-inter]">
      {/* Masthead */}
      <div className="text-center border-b-4 border-black pb-3 mb-3">
        <h1 className="font-[--font-playfair] text-6xl font-bold tracking-tight">THE CITYPAPER</h1>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{date}</span>
          <span className="font-[--font-playfair] italic">"All the news that fits"</span>
          <span>{newspaper.city.toUpperCase()} DAILY EDITION</span>
        </div>
      </div>

      {/* Weather + Story of the Day */}
      <div className="grid grid-cols-[1fr_2fr] gap-4 mb-4">
        <WeatherWidget weather={newspaper.weather} />
        <StoryOfTheDay editorial={newspaper.editorial} />
      </div>

      {/* News Grid */}
      <NewsGrid news={newspaper.news} />

      {/* City Spotlight */}
      <div className="mt-4 border-t border-gray-300 pt-4">
        <h3 className="font-[--font-playfair] text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          City Spotlight — {newspaper.city}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-2">{newspaper.cityInfo.summary}</p>
        {newspaper.cityInfo.population > 0 && (
          <p className="text-xs text-gray-500">
            Population: {newspaper.cityInfo.population.toLocaleString()}
          </p>
        )}
        <ul className="flex flex-wrap gap-2 mt-2">
          {newspaper.cityInfo.highlights.map((h) => (
            <li key={h} className="bg-gray-100 text-xs px-2 py-1 rounded">{h}</li>
          ))}
        </ul>
      </div>

      {/* Editor's Note */}
      <div className="mt-4 border-t border-gray-300 pt-4">
        <h3 className="font-[--font-playfair] text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          Editor's Note
        </h3>
        <p className="font-[--font-playfair] italic text-sm leading-relaxed text-gray-700">
          "{newspaper.editorial.editorsNote}"
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/newspaper/
git commit -m "feat: add newspaper display components (weather, news, story, layout)"
```

---

## Task 5: Newspaper Page (Server Component)

**Files:**
- Create: `apps/frontend/app/newspaper/[city]/page.tsx`

**Interfaces:**
- Consumes: `generateNewspaper` from `lib/api.ts`; `NewspaperLayout` component
- Produces: Server-rendered newspaper page at `/newspaper/[city]`

- [ ] **Step 1: Create `apps/frontend/app/newspaper/[city]/page.tsx`**

```tsx
import { generateNewspaper } from "../../../lib/api";
import { NewspaperLayout } from "../../../components/newspaper/NewspaperLayout";

interface Props {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}

export default async function NewspaperPage({ params, searchParams }: Props) {
  const { city } = await params;
  const { lat, lng } = await searchParams;

  const decodedCity = decodeURIComponent(city);
  const latNum = lat ? parseFloat(lat) : undefined;
  const lngNum = lng ? parseFloat(lng) : undefined;

  let newspaper;
  try {
    newspaper = await generateNewspaper(decodedCity, latNum, lngNum);
  } catch (err) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="font-[--font-playfair] text-2xl font-bold mb-2">Could not generate edition</h1>
          <p className="text-gray-500 text-sm">
            {err instanceof Error ? err.message : "Unknown error"}
          </p>
          <a href="/" className="mt-4 inline-block text-sm underline">← Back to home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="mb-4 text-center">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600 font-[--font-inter]">
          ← Generate another edition
        </a>
      </div>
      <NewspaperLayout newspaper={newspaper} />
    </main>
  );
}
```

- [ ] **Step 2: End-to-end test (requires backend running)**

```bash
# Terminal 1: start backend
cd apps/backend && npm run dev

# Terminal 2: start frontend
cd apps/frontend && npm run dev

# Open browser:
open http://localhost:3000
```

Test the full flow:
1. Type "Berlin" in the search bar → press Enter → verify newspaper renders
2. Click a city on the map → click "Generate Edition" → verify newspaper renders with map coordinates
3. Try typing `<script>` → verify error message shows on newspaper page
4. Verify Swagger UI at `http://localhost:3001/api-docs` renders correctly

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/newspaper/
git commit -m "feat: add newspaper server page with error handling"
```

---

## Task 6: Root Monorepo Config + README

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `README.md` (root)

**Interfaces:**
- Produces: `npm run dev` at root starts both frontend and backend in parallel

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "citypaper",
  "version": "0.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.5.4"
  }
}
```

- [ ] **Step 2: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "persistent": true,
      "cache": false
    },
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 3: Create root `README.md`**

````markdown
# CityPaper

AI-powered daily city newspaper. Select a city, get a fully generated broadsheet edition with weather, local news, city highlights, and an AI-written lead story.

## Monorepo Structure

```
citypaper/
├── apps/
│   ├── backend/    Express 5 + TypeScript API (POST /agent)
│   └── frontend/   Next.js 15 newspaper UI
└── packages/
    └── shared/     Shared Zod schemas
```

## Quick Start

```bash
# 1. Install Ollama and pull the dev model
ollama pull llama3.2:3b

# 2. Configure environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
# Fill in OPENWEATHER_API_KEY, NEWS_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# 3. Install all dependencies
npm install

# 4. Start everything
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the frontend.  
Swagger UI: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

## Agent Architecture

See `apps/backend/README.md` for full agent docs and the UML diagram in `docs/uml-sequence.md`.

## Environment Variables

See `apps/backend/.env.example` and `apps/frontend/.env.local.example`.
````

- [ ] **Step 4: Install Turborepo at root**

```bash
cd /path/to/citypaper && npm install
```

Expected: All workspaces linked, `node_modules/.bin/turbo` present.

- [ ] **Step 5: Verify `npm run dev` starts both apps**

```bash
npm run dev
```

Expected: Both `citypaper-backend` and `citypaper-frontend` start, logs from both visible.

- [ ] **Step 6: Commit**

```bash
git add package.json turbo.json README.md
git commit -m "chore: add Turborepo root config and monorepo README"
```
````
