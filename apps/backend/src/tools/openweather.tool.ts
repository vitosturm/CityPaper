import { z } from "zod";
import type { WeatherData } from "#schemas";

const BASE = "https://api.openweathermap.org/data/2.5";

const OWMCurrentSchema = z.object({
  main: z.object({ temp: z.number(), feels_like: z.number() }),
  weather: z.array(z.object({ description: z.string(), icon: z.string() })),
});

const OWMForecastSchema = z.object({
  list: z.array(
    z.object({
      dt: z.number(),
      main: z.object({ temp: z.number() }),
      weather: z.array(z.object({ description: z.string() })),
    })
  ),
});

export async function fetchWeather(city: string): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("Missing OPENWEATHER API key — set OPENWEATHER_API_KEY in environment.");

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`),
    fetch(`${BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&cnt=3&appid=${key}`),
  ]);

  if (!currentRes.ok) throw new Error(`OpenWeatherMap current error: ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`OpenWeatherMap forecast error: ${forecastRes.status}`);

  const current = OWMCurrentSchema.parse(await currentRes.json());
  const forecast = OWMForecastSchema.parse(await forecastRes.json());

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    current: {
      temp: current.main.temp,
      feelsLike: current.main.feels_like,
      description: current.weather[0]!.description,
      icon: current.weather[0]!.icon,
    },
    forecast: forecast.list.map((item) => ({
      day: days[new Date(item.dt * 1000).getDay()]!,
      temp: item.main.temp,
      description: item.weather[0]!.description,
    })),
  };
}
