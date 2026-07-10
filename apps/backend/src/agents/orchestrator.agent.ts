import OpenAI from "openai";
import { MODEL_NAME } from "#config";
import { fetchWeather } from "#tools";
import { fetchNews } from "#tools";
import { fetchCityInfo } from "#tools";
import { EditorialSchema, NewspaperSchema } from "#schemas";
import type { Newspaper } from "#schemas";

const client =
  process.env.NODE_ENV === "development"
    ? new OpenAI({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1", apiKey: "ollama" })
    : new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY ?? "" });

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_weather",
      description: "Fetch current weather and 3-day forecast for a city.",
      parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_news",
      description: "Fetch categorised news (politics, sports, culture) for a city.",
      parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_city_info",
      description: "Fetch city summary, highlights, and population from Wikipedia.",
      parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"], additionalProperties: false },
    },
  },
];

async function callTool(name: string, args: { city: string }): Promise<unknown> {
  if (name === "fetch_weather") return fetchWeather(args.city);
  if (name === "fetch_news") return fetchNews(args.city);
  if (name === "fetch_city_info") return fetchCityInfo(args.city);
  throw new Error(`Unknown tool: ${name}`);
}

async function runAgentLoop(systemPrompt: string, userMessage: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < 5; i++) {
    const response = await client.chat.completions.create({ model: MODEL_NAME, messages, tools, tool_choice: "auto" });
    const choice = response.choices[0]!;

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const fn = (tc as { id: string; function: { name: string; arguments: string } }).function;
        const args = JSON.parse(fn.arguments) as { city: string };
        const result = await callTool(fn.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) } as OpenAI.Chat.ChatCompletionToolMessageParam);
      }
    } else {
      return choice.message.content ?? "";
    }
  }
  throw new Error("Agent loop exceeded max iterations");
}

export async function runOrchestrator(city: string): Promise<Newspaper> {
  const [weatherRaw, newsRaw, cityInfoRaw] = await Promise.all([
    runAgentLoop(
      "You are a weather reporter. Use fetch_weather to get data and return the result as raw JSON only.",
      `Fetch weather for ${city}`
    ),
    runAgentLoop(
      "You are a news reporter. Use fetch_news to get data and return the result as raw JSON only.",
      `Fetch news for ${city}`
    ),
    runAgentLoop(
      "You are a city researcher. Use fetch_city_info to get data and return the result as raw JSON only.",
      `Fetch city info for ${city}`
    ),
  ]);

  const weather = JSON.parse(weatherRaw);
  const news = JSON.parse(newsRaw);
  const cityInfo = JSON.parse(cityInfoRaw);

  const editorInput = JSON.stringify({ city, weather, news, cityInfo });
  const editorialRaw = await runAgentLoop(
    `You are the chief editor of CityPaper, a daily city newspaper.
Given weather data, news articles, and city information as JSON input, write:
1. "storyOfTheDay": A compelling 3-sentence lead story tying together weather, top news, and a city highlight.
2. "editorsNote": A warm, witty 2-sentence closing note from the editor about today's city.
Respond ONLY with valid JSON: { "storyOfTheDay": "...", "editorsNote": "..." }`,
    editorInput
  );

  const editorialText = editorialRaw.replace(/```json\n?|\n?```/g, "").trim();
  const editorial = EditorialSchema.parse(JSON.parse(editorialText));

  return NewspaperSchema.parse({ city, generatedAt: new Date().toISOString(), weather, news, cityInfo, editorial });
}
