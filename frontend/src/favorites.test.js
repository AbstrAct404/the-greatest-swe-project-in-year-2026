import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  FAVORITES_KEY, addFavorite, getFavorites, isFavorite, loadFavorites,
  refreshFavorite, removeFavorite, useFavorites,
} from './favorites.js'

const CENTRAL = {
  _id: 'M010', name: 'Central Park', borough: 'M', type: 'Flagship Park',
  acres: 840.01, geometry: { type: 'MultiPolygon', coordinates: [] },
}
const BRYANT = { _id: 'M008', name: 'Bryant Park', borough: 'M', type: 'Neighborhood Park', acres: 9.6 }

function stored() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY))
}

describe('favorites', () => {
  it('starts empty', () => {
    expect(getFavorites()).toEqual([])
    expect(isFavorite('M010')).toBe(false)
  })

  it('saves a park to localStorage without its boundary', () => {
    addFavorite(CENTRAL)
    expect(isFavorite('M010')).toBe(true)
    expect(stored()).toEqual([{
      _id: 'M010', name: 'Central Park', borough: 'M', type: 'Flagship Park', acres: 840.01,
    }])
  })

  it('keeps parks in the order they were saved, without duplicates', () => {
    addFavorite(BRYANT)
    addFavorite(CENTRAL)
    addFavorite(BRYANT)
    expect(getFavorites().map((park) => park._id)).toEqual(['M008', 'M010'])
  })

  it('removes a park', () => {
    addFavorite(CENTRAL)
    addFavorite(BRYANT)
    removeFavorite('M010')
    expect(getFavorites().map((park) => park._id)).toEqual(['M008'])
    expect(stored().map((park) => park._id)).toEqual(['M008'])
  })

  it('refreshes a saved park with the latest data', () => {
    addFavorite(BRYANT)
    refreshFavorite({ ...BRYANT, name: 'Bryant Park (renamed)', acres: 9.7, address: '42 St' })
    expect(getFavorites()).toEqual([{ ...BRYANT, name: 'Bryant Park (renamed)', acres: 9.7 }])
    expect(stored()[0].name).toBe('Bryant Park (renamed)')
  })

  it('does not save a park just because it was refreshed', () => {
    refreshFavorite(CENTRAL)
    expect(getFavorites()).toEqual([])
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull()
  })

  it('loads parks saved on an earlier visit', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([BRYANT]))
    loadFavorites()
    expect(isFavorite('M008')).toBe(true)
  })

  it.each(['not json', '{"_id": "M010"}', '[{"name": "No id"}]'])(
    'ignores bad saved data: %s', (value) => {
      localStorage.setItem(FAVORITES_KEY, value)
      loadFavorites()
      expect(getFavorites()).toEqual([])
    },
  )

  it('picks up changes made in another tab', () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([BRYANT]))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_KEY }))
    })
    expect(isFavorite('M008')).toBe(true)
  })

  it('re-renders components when parks are saved or removed', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current).toEqual([])
    act(() => addFavorite(CENTRAL))
    expect(result.current.map((park) => park._id)).toEqual(['M010'])
    act(() => removeFavorite('M010'))
    expect(result.current).toEqual([])
  })
})
