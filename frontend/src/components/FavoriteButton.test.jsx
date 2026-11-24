import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { isFavorite } from '../favorites.js'
import FavoriteButton from './FavoriteButton.jsx'

const CENTRAL = { _id: 'M010', name: 'Central Park', borough: 'M' }

it('saves and unsaves a park', () => {
  render(<FavoriteButton park={CENTRAL} />)
  const button = screen.getByRole('button', { name: 'Save Central Park' })
  expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(button).toHaveTextContent('Save')

  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(button).toHaveTextContent('Saved')
  expect(isFavorite('M010')).toBe(true)

  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(isFavorite('M010')).toBe(false)
})

it('keeps every button for the same park in step', () => {
  render(<><FavoriteButton park={CENTRAL} /><FavoriteButton park={CENTRAL} /></>)
  const [first, second] = screen.getAllByRole('button', { name: 'Save Central Park' })
  fireEvent.click(first)
  expect(second).toHaveAttribute('aria-pressed', 'true')
})

it('still works for this visit when storage is blocked', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  render(<FavoriteButton park={CENTRAL} />)
  const button = screen.getByRole('button', { name: 'Save Central Park' })
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-pressed', 'true')
  setItem.mockRestore()
})
