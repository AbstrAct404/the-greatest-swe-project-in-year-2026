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
