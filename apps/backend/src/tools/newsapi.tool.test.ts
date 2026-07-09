import { describe, it, expect, vi } from "vitest";

vi.stubEnv("NEWS_API_KEY", "test-key");

describe("fetchNews", () => {
  it("returns NewsData with three categories", async () => {
    const mockArticles = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        title: `Title ${i}`,
        description: `Desc ${i}`,
        url: `https://example.com/${i}`,
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articles: mockArticles(5) }),
    });

    const { fetchNews } = await import("./newsapi.tool.js");
    const result = await fetchNews("Berlin");

    expect(result.politics.length).toBeGreaterThan(0);
    expect(result.sports.length).toBeGreaterThan(0);
    expect(result.culture.length).toBeGreaterThan(0);
  });
});
