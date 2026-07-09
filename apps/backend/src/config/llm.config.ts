import OpenAI from "openai";

export const MODEL_NAME =
  process.env.NODE_ENV === "development" ? "llama3.2:3b" : "glm-z1-32b";

export const openaiClient = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});
