import { z } from "zod";

export const AgentRequestSchema = z.object({
  city: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

export const WeatherCurrentSchema = z.object({
  temp: z.number(),
  feelsLike: z.number(),
  description: z.string(),
  icon: z.string(),
});

export const WeatherForecastItemSchema = z.object({
  day: z.string(),
  temp: z.number(),
  description: z.string(),
});

export const WeatherDataSchema = z.object({
  current: WeatherCurrentSchema,
  forecast: z.array(WeatherForecastItemSchema),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export const NewsItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string(),
});

export const NewsDataSchema = z.object({
  politics: z.array(NewsItemSchema),
  sports: z.array(NewsItemSchema),
  culture: z.array(NewsItemSchema),
});
export type NewsData = z.infer<typeof NewsDataSchema>;

export const CityInfoDataSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  population: z.number(),
});
export type CityInfoData = z.infer<typeof CityInfoDataSchema>;

export const EditorialSchema = z.object({
  storyOfTheDay: z.string(),
  editorsNote: z.string(),
});
export type Editorial = z.infer<typeof EditorialSchema>;

export const NewspaperSchema = z.object({
  city: z.string(),
  generatedAt: z.string(),
  weather: WeatherDataSchema,
  news: NewsDataSchema,
  cityInfo: CityInfoDataSchema,
  editorial: EditorialSchema,
});
export type Newspaper = z.infer<typeof NewspaperSchema>;
