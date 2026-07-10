"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import type { Newspaper, NewsArticle } from "@/types/newspaper";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter = { lat: 48.2082, lng: 16.3738 };
const LIBRARIES: ("geocoding")[] = ["geocoding"];

function reverseGeocode(lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results) {
        for (const result of results) {
          const city = result.address_components.find(
            (c) => c.types.includes("locality") || c.types.includes("administrative_area_level_1")
          );
          if (city) { resolve(city.long_name); return; }
        }
      }
      resolve("");
    });
  });
}

function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: cityName }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

export default function Home() {
  const [city, setCity] = useState("");
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [newspaper, setNewspaper] = useState<Newspaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: MAPS_KEY, libraries: LIBRARIES });

  const fetchNewspaper = async (cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError("");
    setNewspaper(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${API_URL}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: cityName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json() as Newspaper & { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Unknown error");
      setNewspaper(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCityInput = (value: string) => {
    setCity(value);
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    if (value.trim().length < 2) return;
    geocodeTimeout.current = setTimeout(async () => {
      const pos = await geocodeCity(value.trim());
      if (pos) {
        setMarkerPos(pos);
        if (mapRef.current) {
          mapRef.current.panTo(pos);
          mapRef.current.setZoom(10);
        }
      }
    }, 600);
  };

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    const detectedCity = await reverseGeocode(lat, lng);
    if (detectedCity) {
      setCity(detectedCity);
    }
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="min-h-screen bg-amber-50 font-serif">
      {/* Header */}
      <header className="border-b-4 border-black bg-white px-6 py-6 text-center">
        <h1 className="text-6xl font-black tracking-tight">THE CITY PAPER</h1>
      </header>

      {/* Search Section */}
      <section className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-xl font-bold uppercase tracking-widest">Choose Your City</h2>
          <p className="text-sm text-gray-500">Type a city name or click on the map</p>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => handleCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchNewspaper(city)}
            placeholder="Enter city name (e.g. Vienna, Paris, Tokyo)..."
            className="flex-1 border-2 border-black bg-white px-4 py-2 font-serif text-base focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => fetchNewspaper(city)}
            disabled={loading}
            className="border-2 border-black bg-black px-6 py-2 font-bold uppercase tracking-widest text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        {isLoaded && (
          <div className="border-2 border-black">
            <p className="border-b border-black bg-black px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              📍 Or click on the map — city name fills automatically above
            </p>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={4}
              onLoad={onMapLoad}
              onClick={handleMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {markerPos && <Marker position={markerPos} />}
            </GoogleMap>
            {markerPos && city && (
              <div className="border-t border-black bg-amber-100 px-3 py-2 text-sm">
                📍 <strong>{city}</strong> selected — press <strong>Generate</strong> above
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 border-2 border-red-600 bg-red-50 px-4 py-3 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </section>

      {/* Loading */}
      {loading && (
        <section className="mx-auto max-w-4xl px-6 pb-12 text-center">
          <div className="border-2 border-black bg-white p-12">
            <p className="text-2xl font-black uppercase tracking-widest">🗞️ Press is running...</p>
            <p className="mt-2 text-sm text-gray-500">Our AI reporters are gathering stories. This may take 10–20 seconds.</p>
          </div>
        </section>
      )}

      {/* Newspaper Output */}
      {newspaper && !loading && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="mb-6 border-2 border-black bg-black py-4 text-center text-white">
            <h2 className="text-4xl font-black uppercase tracking-widest">{newspaper.city}</h2>
            <p className="text-xs uppercase tracking-widest opacity-75">{formatDate(newspaper.generatedAt)}</p>
          </div>

          <div className="mb-6 border-2 border-black bg-white p-6">
            <p className="mb-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">⭐ Story of the Day</p>
            <p className="text-lg leading-relaxed">{newspaper.editorial.storyOfTheDay}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="border-2 border-black bg-white p-4">
              <p className="mb-3 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">🌤️ Weather</p>
              <div className="mb-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://openweathermap.org/img/wn/${newspaper.weather.current.icon}@2x.png`}
                  alt={newspaper.weather.current.description}
                  className="h-12 w-12"
                />
                <div>
                  <p className="text-3xl font-black">{Math.round(newspaper.weather.current.temp)}°C</p>
                  <p className="capitalize text-sm text-gray-600">{newspaper.weather.current.description}</p>
                  <p className="text-xs text-gray-500">Feels like {Math.round(newspaper.weather.current.feelsLike)}°C</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 border-t border-black pt-2">
                {newspaper.weather.forecast.map((day) => (
                  <div key={day.day} className="text-center">
                    <p className="text-xs font-bold">{day.day.slice(0, 3)}</p>
                    <p className="text-sm font-black">{day.temp}°</p>
                    <p className="text-xs capitalize text-gray-500 leading-tight">{day.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-2 border-black bg-white p-4">
              <p className="mb-3 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">🏙️ About {newspaper.city}</p>
              <p className="text-sm leading-relaxed text-gray-700 line-clamp-5">{newspaper.cityInfo.summary}</p>
              {newspaper.cityInfo.population > 0 && (
                <p className="mt-2 text-xs text-gray-500">Population: {newspaper.cityInfo.population.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            {(["politics", "sports", "culture"] as const).map((section) => (
              <div key={section} className="border-2 border-black bg-white p-4">
                <p className="mb-3 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">
                  {section === "politics" ? "🏛️" : section === "sports" ? "⚽" : "🎭"} {section}
                </p>
                <div className="space-y-3">
                  {newspaper.news[section].map((article: NewsArticle) => (
                    <div key={article.url} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold leading-tight hover:underline">
                        {article.title}
                      </a>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600 line-clamp-3">{article.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-2 border-black bg-amber-100 p-6">
            <p className="mb-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">✍️ Editor&apos;s Note</p>
            <p className="italic leading-relaxed">{newspaper.editorial.editorsNote}</p>
            <p className="mt-3 text-right text-xs font-bold">— The Editor, CityPaper</p>
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            <p>© {new Date().getFullYear()} CityPaper · AI-Powered · All stories generated by Llama 3.3 70B on Groq</p>
          </div>
        </section>
      )}
    </main>
  );
}
