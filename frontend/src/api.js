// All calls to the backend go through this file, so swapping mock data for
// the real endpoints (or changing the server URL) only happens here.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5050'

async function get(path) {
  const resp = await fetch(`${API_URL}${path}`)
  if (!resp.ok) {
    throw new Error(`GET ${path} failed: ${resp.status}`)
  }
  return resp.json()
}

export function getHello() {
  return get('/hello')
}

// Keep the page's array contract while the backend returns paging metadata.
export async function listParks({ borough, type, minAcres, page } = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    borough, park_type: type, min_acres: minAcres, page,
  })) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  }
  const query = params.toString()
  const result = await get(`/parks${query ? `?${query}` : ''}`)
  if (!Array.isArray(result?.parks)) {
    throw new Error('Invalid parks response')
  }
  return result.parks
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
