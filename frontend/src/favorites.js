import { useSyncExternalStore } from 'react'

// Saved parks live in this browser's localStorage, so no account is needed.
// Each one keeps enough to show its card without asking the server.
export const FAVORITES_KEY = 'nyc-parks:favorites'
const FIELDS = ['_id', 'name', 'borough', 'type', 'acres']

const listeners = new Set()
let favorites = read()

// Storage can be blocked (private windows, strict settings), so a failure
// just means nothing was saved before.
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY))
    return Array.isArray(saved) ? saved.filter((park) => typeof park?._id === 'string') : []
  } catch {
    return []
  }
}

function update(next) {
  favorites = next
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  } catch {
    // Still saved for this visit, just not after a reload.
  }
  listeners.forEach((listener) => listener())
}

// Re-read storage, e.g. after another tab changed it.
export function loadFavorites() {
  favorites = read()
  listeners.forEach((listener) => listener())
}

export function getFavorites() {
  return favorites
}

export function isFavorite(id) {
  return favorites.some((park) => park._id === id)
}

export function addFavorite(park) {
  if (isFavorite(park._id)) return
  update([...favorites, Object.fromEntries(FIELDS.map((field) => [field, park[field]]))])
}

// Keep a saved park's card up to date with the latest data from the server.
export function refreshFavorite(park) {
  const index = favorites.findIndex((favorite) => favorite._id === park._id)
  if (index === -1) return
  const fresh = Object.fromEntries(FIELDS.map((field) => [field, park[field]]))
  if (FIELDS.every((field) => fresh[field] === favorites[index][field])) return
  update(favorites.map((favorite, i) => (i === index ? fresh : favorite)))
}

export function removeFavorite(id) {
  if (!isFavorite(id)) return
  update(favorites.filter((park) => park._id !== id))
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === FAVORITES_KEY || event.key === null) loadFavorites()
  })
}

// The saved parks, oldest first. Re-renders whenever they change.
export function useFavorites() {
  return useSyncExternalStore(subscribe, getFavorites)
}
