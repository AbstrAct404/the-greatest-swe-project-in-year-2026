import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import NearbyParkList from './NearbyParkList.jsx'

const parks = [
  { _id: 'M008', name: 'Bryant Park', distance: 394.2 },
  { _id: 'M361', name: 'Father Duffy Square', distance: 0 },
]

it('updates the displayed count with correct singular and plural wording', () => {
  const { rerender } = render(<NearbyParkList parks={parks.slice(0, 1)} onSelect={() => {}} />)
  expect(screen.getByText('Showing 1 nearby park')).toBeInTheDocument()
  rerender(<NearbyParkList parks={parks} onSelect={() => {}} />)
  expect(screen.getByText('Showing 2 nearby parks')).toBeInTheDocument()
  expect(screen.queryByText('Showing 1 nearby park')).not.toBeInTheDocument()
})

it('leaves the empty message to the parent', () => {
  render(<NearbyParkList parks={[]} onSelect={() => {}} />)
  expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('keeps park selection and distance labels alongside the count', () => {
  const onSelect = vi.fn()
  render(<NearbyParkList parks={parks} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('button', { name: 'Bryant Park' }))
  expect(onSelect).toHaveBeenCalledWith('M008')
  expect(screen.getByText('394 m')).toBeInTheDocument()
  expect(screen.getByText('here')).toBeInTheDocument()
})
