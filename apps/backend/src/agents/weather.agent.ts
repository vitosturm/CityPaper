import { Agent, tool } from "@openai/agents";
import { MODEL_NAME } from "#config";
import { fetchWeather } from "#tools";

const weatherTool = tool({
  name: "fetch_weather",
  description: "Fetch current weather and 3-day forecast for a city.",
  parameters: {
    type: "object" as const,
    properties: {
      city: { type: "string", description: "The city name" },
    },
    required: ["city"] as ["city"],
    additionalProperties: false as false,
  },
  execute: async (input: unknown) => {
    const { city } = input as { city: string };
    return fetchWeather(city);
  },
});

export const weatherAgent = new Agent({
  name: "WeatherAgent",
  instructions:
    "You fetch weather data for a given city. Use the fetch_weather tool and return the result as JSON.",
  tools: [weatherTool],
  model: MODEL_NAME,
});
