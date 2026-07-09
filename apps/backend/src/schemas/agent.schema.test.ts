import { describe, it, expect } from "vitest";
import { AgentRequestSchema, NewspaperSchema } from "./agent.schema.js";

describe("AgentRequestSchema", () => {
  it("accepts valid city-only input", () => {
    const result = AgentRequestSchema.safeParse({ city: "Berlin" });
    expect(result.success).toBe(true);
  });

  it("accepts city with coordinates", () => {
    const result = AgentRequestSchema.safeParse({ city: "Berlin", lat: 52.5, lng: 13.4 });
    expect(result.success).toBe(true);
  });

  it("rejects missing city", () => {
    const result = AgentRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty city string", () => {
    const result = AgentRequestSchema.safeParse({ city: "" });
    expect(result.success).toBe(false);
  });
});

describe("NewspaperSchema", () => {
  it("validates a full newspaper object", () => {
    const newspaper = {
      city: "Berlin",
      generatedAt: new Date().toISOString(),
      weather: {
        current: { temp: 18, feelsLike: 16, description: "Cloudy", icon: "04d" },
        forecast: [
          { day: "Monday", temp: 20, description: "Sunny" },
          { day: "Tuesday", temp: 17, description: "Rainy" },
          { day: "Wednesday", temp: 15, description: "Cloudy" },
        ],
      },
      news: {
        politics: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
        sports: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
        culture: [{ title: "Headline", summary: "Summary", url: "https://example.com" }],
      },
      cityInfo: {
        summary: "Berlin is the capital of Germany.",
        highlights: ["Brandenburg Gate", "Museum Island"],
        population: 3700000,
      },
      editorial: {
        storyOfTheDay: "Today in Berlin...",
        editorsNote: "The city never sleeps...",
      },
    };
    const result = NewspaperSchema.safeParse(newspaper);
    expect(result.success).toBe(true);
  });
});
