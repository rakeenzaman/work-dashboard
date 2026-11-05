// Open-Meteo: free, no API key, CORS-enabled. https://open-meteo.com
export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
export type Unit = 'fahrenheit' | 'celsius';

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface PlaceResult extends Place {
  region: string;
}

export interface Weather {
  temp: number;
  high: number;
  low: number;
  code: number;
  isDay: boolean;
}

/** ~1 km precision: plenty for weather, and avoids sending exact coordinates anywhere. */
export const coarse = (n: number) => Math.round(n * 100) / 100;

export async function fetchWeather(place: Place, unit: Unit, signal?: AbortSignal): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(coarse(place.lat)),
    longitude: String(coarse(place.lon)),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
    temperature_unit: unit,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = await res.json();
  return {
    temp: data.current.temperature_2m,
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    high: data.daily.temperature_2m_max[0],
    low: data.daily.temperature_2m_min[0],
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(`City search failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    name: String(r.name),
    region: [r.admin1, r.country_code].filter(Boolean).join(', '),
    lat: Number(r.latitude),
    lon: Number(r.longitude),
  }));
}

// WMO weather interpretation codes, as returned by Open-Meteo.
const CODES: Record<number, [string, WeatherKind]> = {
  0: ['Clear', 'clear'],
  1: ['Mostly Clear', 'partly'],
  2: ['Partly Cloudy', 'partly'],
  3: ['Cloudy', 'cloudy'],
  45: ['Foggy', 'fog'],
  48: ['Foggy', 'fog'],
  51: ['Drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Drizzle', 'rain'],
  56: ['Freezing Drizzle', 'rain'],
  57: ['Freezing Drizzle', 'rain'],
  61: ['Light Rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy Rain', 'rain'],
  66: ['Freezing Rain', 'rain'],
  67: ['Freezing Rain', 'rain'],
  71: ['Light Snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy Snow', 'snow'],
  77: ['Snow Grains', 'snow'],
  80: ['Showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Heavy Showers', 'rain'],
  85: ['Snow Showers', 'snow'],
  86: ['Snow Showers', 'snow'],
  95: ['Thunderstorms', 'storm'],
  96: ['Thunderstorms', 'storm'],
  99: ['Thunderstorms', 'storm'],
};

export function describe(code: number): { label: string; kind: WeatherKind } {
  const [label, kind] = CODES[code] ?? ['—', 'cloudy'];
  return { label, kind };
}
