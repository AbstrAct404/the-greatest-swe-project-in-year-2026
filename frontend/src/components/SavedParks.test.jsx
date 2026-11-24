import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { addFavorite, removeFavorite } from '../favorites.js'
import SavedParks from './SavedParks.jsx'

const CENTRAL = { _id: 'M010', name: 'Central Park', borough: 'M', type: 'Flagship Park', acres: 840.01 }
const BRYANT = { _id: 'M008', name: 'Bryant Park', borough: 'M', type: 'Neighborhood Park', acres: 9.6 }

it('shows nothing until a park is saved', () => {
  render(<SavedParks onSelect={() => {}} />)
  expect(screen.queryByRole('heading', { name: /Saved parks/ })).not.toBeInTheDocument()
})

it('lists saved parks in the order they were saved', () => {
  addFavorite(CENTRAL)
  addFavorite(BRYANT)
  render(<SavedParks onSelect={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Saved parks (2)' })).toBeInTheDocument()
  const names = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
  expect(names).toEqual(['Central Park', 'Bryant Park'])
  expect(screen.getByText('Manhattan · Flagship Park')).toBeInTheDocument()
})

it('opens a saved park', () => {
  addFavorite(CENTRAL)
  const onSelect = vi.fn()
  render(<SavedParks onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('button', { name: 'View details for Central Park' }))
  expect(onSelect).toHaveBeenCalledWith('M010')
})

it('drops a park when it is unsaved, and hides once empty', () => {
  addFavorite(CENTRAL)
  addFavorite(BRYANT)
  render(<SavedParks onSelect={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save Central Park' }))
  expect(screen.getByRole('heading', { name: 'Saved parks (1)' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Central Park' })).not.toBeInTheDocument()
  act(() => removeFavorite('M008'))
  expect(screen.queryByRole('heading', { name: /Saved parks/ })).not.toBeInTheDocument()
})
