import { z } from "zod";
import type { CityInfoData } from "#schemas";

const WikiSummarySchema = z.object({
  extract: z.string(),
});

const CITY_HIGHLIGHTS: Record<string, string[]> = {};

export async function fetchCityInfo(city: string): Promise<CityInfoData> {
  const encoded = encodeURIComponent(city.replace(/ /g, "_"));
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  );

  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status} for city "${city}"`);

  const data = WikiSummarySchema.parse(await res.json());
  const extract = data.extract;

  const populationMatch = extract.match(/population of ([\d,]+)/i) ??
    extract.match(/([\d,]+) (inhabitants|residents|people)/i);
  const population = populationMatch
    ? parseInt(populationMatch[1]!.replace(/,/g, ""), 10)
    : 0;

  const sentences = extract.split(". ").slice(0, 3);
  const highlights = CITY_HIGHLIGHTS[city.toLowerCase()] ?? sentences.slice(1);

  return {
    summary: extract.slice(0, 500),
    highlights: highlights.slice(0, 4),
    population,
  };
}
