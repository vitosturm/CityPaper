import { describe, it, expect, vi } from "vitest";

vi.stubEnv("OPENWEATHER_API_KEY", "test-key");

describe("fetchWeather", () => {
  it("returns WeatherData shaped object for a valid city", async () => {
    const mockCurrentResponse = {
      main: { temp: 18.5, feels_like: 16.2 },
      weather: [{ description: "scattered clouds", icon: "03d" }],
    };
    const mockForecastResponse = {
      list: [
        { dt: 1720000000, main: { temp: 20 }, weather: [{ description: "sunny" }] },
        { dt: 1720086400, main: { temp: 17 }, weather: [{ description: "rainy" }] },
        { dt: 1720172800, main: { temp: 15 }, weather: [{ description: "cloudy" }] },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockCurrentResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockForecastResponse });

    const { fetchWeather } = await import("./openweather.tool.js");
    const result = await fetchWeather("Berlin");

    expect(result.current.temp).toBeCloseTo(18.5);
    expect(result.current.description).toBe("scattered clouds");
    expect(result.forecast).toHaveLength(3);
  });

  it("throws when API key is missing", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const { fetchWeather } = await import("./openweather.tool.js");
    await expect(fetchWeather("Berlin")).rejects.toThrow(/API key/i);
  });
});
