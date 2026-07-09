import { Agent, tool } from "@openai/agents";
import { MODEL_NAME } from "#config";
import { fetchNews } from "#tools";

const newsTool = tool({
  name: "fetch_news",
  description:
    "Fetch local news articles for a city, categorised by politics, sports, and culture.",
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
    return fetchNews(city);
  },
});

export const newsAgent = new Agent({
  name: "NewsAgent",
  instructions:
    "You fetch categorised news for a given city. Use the fetch_news tool and return the result as JSON.",
  tools: [newsTool],
  model: MODEL_NAME,
});
