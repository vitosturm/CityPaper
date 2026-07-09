import { Agent } from "@openai/agents";
import { MODEL_NAME } from "#config";

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
});
