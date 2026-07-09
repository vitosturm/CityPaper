import { describe, it, expect, vi } from "vitest";

describe("fetchCityInfo", () => {
  it("returns CityInfoData for a valid city", async () => {
    const mockSummary = {
      extract: "Berlin is the capital and largest city of Germany.",
      infobox: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSummary,
    });

    const { fetchCityInfo } = await import("./wikipedia.tool.js");
    const result = await fetchCityInfo("Berlin");

    expect(result.summary).toContain("Berlin");
    expect(Array.isArray(result.highlights)).toBe(true);
    expect(typeof result.population).toBe("number");
  });
});
