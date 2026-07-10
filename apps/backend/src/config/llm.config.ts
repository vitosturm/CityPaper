import OpenAI from "openai";

export const MODEL_NAME =
  process.env.NODE_ENV === "development"
    ? "llama3.2:3b"
    : "llama-3.3-70b-versatile";

export const openaiClient = new OpenAI({
  baseURL:
    process.env.NODE_ENV === "development"
      ? (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1")
      : "https://api.groq.com/openai/v1",
  apiKey:
    process.env.NODE_ENV === "development"
      ? "ollama"
      : (process.env.GROQ_API_KEY ?? ""),
});
