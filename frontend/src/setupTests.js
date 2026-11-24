import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { loadFavorites } from './favorites.js'

afterEach(() => {
  cleanup()
  // Saved parks live in localStorage, so don't let them leak between tests.
  localStorage.clear()
  loadFavorites()
})
