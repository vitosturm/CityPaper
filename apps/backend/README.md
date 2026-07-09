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
cd apps/backend && npx tsx --conditions=development src/app.ts
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
