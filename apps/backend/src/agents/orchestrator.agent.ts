import { run, setOpenAIAPI, OpenAIProvider, setDefaultModelProvider } from "@openai/agents";
import OpenAI from "openai";
import { EditorialSchema, NewspaperSchema } from "#schemas";
import type { Newspaper, WeatherData, NewsData, CityInfoData } from "#schemas";
import { weatherAgent } from "./weather.agent.js";
import { newsAgent } from "./news.agent.js";
import { cityInfoAgent } from "./cityinfo.agent.js";
import { editorAgent } from "./editor.agent.js";

const agentClient =
  process.env.NODE_ENV === "development"
    ? new OpenAI({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1", apiKey: "ollama" })
    : new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY ?? "" });

setOpenAIAPI("chat_completions");
setDefaultModelProvider(
  new OpenAIProvider({ openAIClient: agentClient as never })
);

export async function runOrchestrator(city: string): Promise<Newspaper> {
  const [weatherResult, newsResult, cityInfoResult] = await Promise.all([
    run(weatherAgent, `Fetch weather for ${city}`),
    run(newsAgent, `Fetch news for ${city}`),
    run(cityInfoAgent, `Fetch city info for ${city}`),
  ]);

  const parseAgentOutput = (output: unknown, agentName: string): unknown => {
    if (typeof output !== "string") return output;
    try {
      return JSON.parse(output);
    } catch {
      throw new Error(`${agentName} returned non-JSON output: ${String(output).slice(0, 200)}`);
    }
  };

  const weather = parseAgentOutput(weatherResult.finalOutput, "WeatherAgent") as WeatherData;
  const news = parseAgentOutput(newsResult.finalOutput, "NewsAgent") as NewsData;
  const cityInfo = parseAgentOutput(cityInfoResult.finalOutput, "CityInfoAgent") as CityInfoData;

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
