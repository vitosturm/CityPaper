import { run, setOpenAIAPI, OpenAIProvider, setDefaultModelProvider } from "@openai/agents";
import { openaiClient } from "#config";
import { EditorialSchema, NewspaperSchema } from "#schemas";
import type { Newspaper, WeatherData, NewsData, CityInfoData } from "#schemas";
import { weatherAgent } from "./weather.agent.js";
import { newsAgent } from "./news.agent.js";
import { cityInfoAgent } from "./cityinfo.agent.js";
import { editorAgent } from "./editor.agent.js";

// Configure the SDK to use our Ollama-backed OpenAI-compatible client
// and the Chat Completions API (Ollama does not support the Responses API)
setOpenAIAPI("chat_completions");
setDefaultModelProvider(
  new OpenAIProvider({ openAIClient: openaiClient as never })
);

export async function runOrchestrator(city: string): Promise<Newspaper> {
  const [weatherResult, newsResult, cityInfoResult] = await Promise.all([
    run(weatherAgent, `Fetch weather for ${city}`),
    run(newsAgent, `Fetch news for ${city}`),
    run(cityInfoAgent, `Fetch city info for ${city}`),
  ]);

  const weather = (weatherResult.finalOutput as unknown) as WeatherData;
  const news = (newsResult.finalOutput as unknown) as NewsData;
  const cityInfo = (cityInfoResult.finalOutput as unknown) as CityInfoData;

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
