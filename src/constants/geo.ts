import type { Country } from "@/types/domain"

/** Praveg operates in India and the UAE only. */
export const COUNTRIES: Country[] = ["India", "United Arab Emirates"]

export const STATES: Record<Country, string[]> = {
  India: [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
  ],
  "United Arab Emirates": ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
}

/**
 * Approximate city centres used as mock geocoding in the prototype.
 * Production: Google Places Autocomplete + Geocoding API return the real coordinates.
 */
export const CITY_COORDS: Record<string, { lat: number; lng: number; state: string; country: Country }> = {
  Ahmedabad: { lat: 23.0225, lng: 72.5714, state: "Gujarat", country: "India" },
  Surat: { lat: 21.1702, lng: 72.8311, state: "Gujarat", country: "India" },
  Vadodara: { lat: 22.3072, lng: 73.1812, state: "Gujarat", country: "India" },
  Rajkot: { lat: 22.3039, lng: 70.8022, state: "Gujarat", country: "India" },
  Jamnagar: { lat: 22.4707, lng: 70.0577, state: "Gujarat", country: "India" },
  Bharuch: { lat: 21.7051, lng: 72.9959, state: "Gujarat", country: "India" },
  Hazira: { lat: 21.1167, lng: 72.65, state: "Gujarat", country: "India" },
  Mumbai: { lat: 19.076, lng: 72.8777, state: "Maharashtra", country: "India" },
  "Navi Mumbai": { lat: 19.033, lng: 73.0297, state: "Maharashtra", country: "India" },
  Pune: { lat: 18.5204, lng: 73.8567, state: "Maharashtra", country: "India" },
  Nashik: { lat: 19.9975, lng: 73.7898, state: "Maharashtra", country: "India" },
  Hyderabad: { lat: 17.385, lng: 78.4867, state: "Telangana", country: "India" },
  Chennai: { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu", country: "India" },
  Bengaluru: { lat: 12.9716, lng: 77.5946, state: "Karnataka", country: "India" },
  Delhi: { lat: 28.6139, lng: 77.209, state: "Delhi", country: "India" },
  Kolkata: { lat: 22.5726, lng: 88.3639, state: "West Bengal", country: "India" },
  Dubai: { lat: 25.2048, lng: 55.2708, state: "Dubai", country: "United Arab Emirates" },
  "Jebel Ali": { lat: 25.0112, lng: 55.1136, state: "Dubai", country: "United Arab Emirates" },
  "Abu Dhabi": { lat: 24.4539, lng: 54.3773, state: "Abu Dhabi", country: "United Arab Emirates" },
  Mussafah: { lat: 24.3486, lng: 54.5034, state: "Abu Dhabi", country: "United Arab Emirates" },
  Ruwais: { lat: 24.1103, lng: 52.7306, state: "Abu Dhabi", country: "United Arab Emirates" },
  Sharjah: { lat: 25.3463, lng: 55.4209, state: "Sharjah", country: "United Arab Emirates" },
  Ajman: { lat: 25.4052, lng: 55.5136, state: "Ajman", country: "United Arab Emirates" },
  "Ras Al Khaimah": { lat: 25.8007, lng: 55.9762, state: "Ras Al Khaimah", country: "United Arab Emirates" },
  Fujairah: { lat: 25.1288, lng: 56.3265, state: "Fujairah", country: "United Arab Emirates" },
}

const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Gujarat: { lat: 22.2587, lng: 71.1924 }, Maharashtra: { lat: 19.7515, lng: 75.7139 }, Telangana: { lat: 18.1124, lng: 79.0193 },
  "Tamil Nadu": { lat: 11.1271, lng: 78.6569 }, Karnataka: { lat: 15.3173, lng: 75.7139 }, Delhi: { lat: 28.7041, lng: 77.1025 },
  "West Bengal": { lat: 22.9868, lng: 87.855 }, Rajasthan: { lat: 27.0238, lng: 74.2179 },
  Dubai: { lat: 25.2048, lng: 55.2708 }, "Abu Dhabi": { lat: 24.4539, lng: 54.3773 }, Sharjah: { lat: 25.3463, lng: 55.4209 },
  Ajman: { lat: 25.4052, lng: 55.5136 }, "Umm Al Quwain": { lat: 25.5647, lng: 55.5552 }, "Ras Al Khaimah": { lat: 25.8007, lng: 55.9762 },
  Fujairah: { lat: 25.1288, lng: 56.3265 },
}

/** Mock geocoder: city → coordinates, falling back to the state centre, then the country centre. */
export function geocode(city: string, state: string, country: Country): { lat: number; lng: number; precise: boolean } {
  const c = CITY_COORDS[city.trim()]
  if (c) return { lat: c.lat, lng: c.lng, precise: true }
  const s = STATE_CENTROIDS[state]
  if (s) return { ...s, precise: false }
  return country === "India" ? { lat: 21.1458, lng: 79.0882, precise: false } : { lat: 24.4667, lng: 54.3667, precise: false }
}

/** Great-circle distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

export const NEARBY_RADIUS_KM = 100

export function mapEmbedUrl(q: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=12&output=embed`
}

export function formatAddress(a: { line: string; city: string; state: string; country: string }): string {
  return [a.line, a.city, a.state, a.country].filter(Boolean).join(", ")
}
