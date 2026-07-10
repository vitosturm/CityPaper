import OpenAI from "openai";
import { MODEL_NAME } from "#config";
import { fetchWeather, fetchNews, fetchCityInfo } from "#tools";
import { EditorialSchema, NewspaperSchema, ActivitySchema } from "#schemas";
import type { Newspaper } from "#schemas";
import { z } from "zod";

const client =
  process.env.NODE_ENV === "development"
    ? new OpenAI({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1", apiKey: "ollama" })
    : new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY ?? "" });

async function complete(system: string, user: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.choices[0]!.message.content ?? "";
}

export async function runOrchestrator(city: string): Promise<Newspaper> {
  const [weather, news, cityInfo] = await Promise.all([
    fetchWeather(city),
    fetchNews(city),
    fetchCityInfo(city),
  ]);

  const editorInput = JSON.stringify({ city, weather, news, cityInfo });

  const [editorialRaw, activitiesRaw] = await Promise.all([
    complete(
      `You are the chief editor of CityPaper, a daily city newspaper.
Given weather data, news articles, and city information as JSON input, write:
1. "storyOfTheDay": A compelling 3-sentence lead story tying together weather, top news, and a city highlight.
2. "editorsNote": A warm, witty 2-sentence closing note from the editor about today's city.
Respond ONLY with valid JSON, no markdown: { "storyOfTheDay": "...", "editorsNote": "..." }`,
      editorInput
    ),
    complete(
      `You are a travel expert for CityPaper newspaper.
Given a city name, suggest exactly 3 must-see activities or sights.
For each, provide:
- "name": the name of the sight or activity
- "description": a vivid 2-sentence description of why it is unmissable
- "category": one of "Sightseeing", "Museum", "Nature", "Food & Drink", "Entertainment"
- "unsplashQuery": a short 2-3 word English search query for an Unsplash photo (e.g. "Vienna opera house")
Respond ONLY with valid JSON array, no markdown: [{ "name": "...", "description": "...", "category": "...", "unsplashQuery": "..." }]`,
      `City: ${city}`
    ),
  ]);

  const editorialText = editorialRaw.replace(/```json\n?|\n?```/g, "").trim();
  const editorial = EditorialSchema.parse(JSON.parse(editorialText));

  const activitiesText = activitiesRaw.replace(/```json\n?|\n?```/g, "").trim();
  const activities = z.array(ActivitySchema).parse(JSON.parse(activitiesText));

  return NewspaperSchema.parse({ city, generatedAt: new Date().toISOString(), weather, news, cityInfo, editorial, activities });
}
