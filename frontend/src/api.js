// All calls to the backend go through this file, so swapping mock data for
// the real endpoints (or changing the server URL) only happens here.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5050'

async function get(path) {
  const resp = await fetch(`${API_URL}${path}`)
  if (!resp.ok) {
    const error = new Error(`GET ${path} failed: ${resp.status}`)
    error.status = resp.status
    throw error
  }
  return resp.json()
}

export function getHello() {
  return get('/hello')
}

// Return the page metadata so the list can navigate all matching parks.
// sort is 'largest' or 'smallest'; leave it out to sort by name.
export async function listParks({ borough, type, minAcres, page, sort } = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    borough, park_type: type, min_acres: minAcres, page, sort,
  })) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  }
  const query = params.toString()
  const result = await get(`/parks${query ? `?${query}` : ''}`)
  if (!Array.isArray(result?.parks)
    || !Number.isInteger(result.total) || result.total < 0
    || !Number.isInteger(result.page) || result.page < 1
    || !Number.isInteger(result.per_page) || result.per_page < 1) {
    throw new Error('Invalid parks response')
  }
  return result
}

// Name search returns a plain array, best matches first.
export async function searchParks(text) {
  const params = new URLSearchParams({ text })
  const result = await get(`/parks/search?${params}`)
  if (!Array.isArray(result)) {
    throw new Error('Invalid search response')
  }
  return result
}

// A missing park rejects with an error whose status is 404.
export function getPark(id) {
  return get(`/parks/${encodeURIComponent(id)}`)
}

// Parks within radius meters of a point, closest first. Each park has a
// distance in meters to its nearest edge (0 if the point is inside it).
export async function nearParks({ lat, lng, radius, limit }) {
  const params = new URLSearchParams({ lat, lng })
  if (radius !== undefined) params.set('radius', radius)
  if (limit !== undefined) params.set('limit', limit)
  const result = await get(`/parks/near?${params}`)
  if (!Array.isArray(result)) {
    throw new Error('Invalid nearby parks response')
  }
  return result
}

// Look up an NYC address or place. Resolves to { lat, lng, label }; an
// address with no match rejects with an error whose status is 404.
export async function geocode(address) {
  const params = new URLSearchParams({ address })
  const result = await get(`/geocode?${params}`)
  if (!Number.isFinite(result?.lat) || !Number.isFinite(result?.lng)) {
    throw new Error('Invalid geocode response')
  }
  return result
}

// The park(s) containing a point: usually none or one.
export async function parksAt({ lat, lng }) {
  const params = new URLSearchParams({ lat, lng })
  const result = await get(`/parks/at?${params}`)
  if (!Array.isArray(result)) {
    throw new Error('Invalid parks-at response')
  }
  return result
}
