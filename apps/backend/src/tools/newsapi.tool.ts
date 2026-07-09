import { z } from "zod";
import type { NewsData } from "#schemas";

const NewsAPIResponseSchema = z.object({
  articles: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      url: z.string(),
    })
  ),
});

export async function fetchNews(city: string): Promise<NewsData> {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new Error("NEWS_API_KEY is missing from environment.");

  const [politicsRes, sportsRes, cultureRes] = await Promise.all([
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+politics&pageSize=2&apiKey=${key}`
    ),
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+sports&pageSize=2&apiKey=${key}`
    ),
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}+culture&pageSize=2&apiKey=${key}`
    ),
  ]);

  const toItems = async (res: Response) => {
    if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
    const data = NewsAPIResponseSchema.parse(await res.json());
    return data.articles
      .filter((a) => a.title && a.description)
      .map((a) => ({
        title: a.title!,
        summary: a.description!,
        url: a.url,
      }));
  };

  const [politics, sports, culture] = await Promise.all([
    toItems(politicsRes),
    toItems(sportsRes),
    toItems(cultureRes),
  ]);

  return { politics, sports, culture };
}
