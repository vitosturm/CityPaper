import { Agent, tool } from "@openai/agents";
import { MODEL_NAME } from "#config";
import { fetchCityInfo } from "#tools";

const cityInfoTool = tool({
  name: "fetch_city_info",
  description:
    "Fetch city summary, highlights, and population from Wikipedia.",
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
    return fetchCityInfo(city);
  },
});

export const cityInfoAgent = new Agent({
  name: "CityInfoAgent",
  instructions:
    "You fetch city information for a given city. Use the fetch_city_info tool and return the result as JSON.",
  tools: [cityInfoTool],
  model: MODEL_NAME,
});
