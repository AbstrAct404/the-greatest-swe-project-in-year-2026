import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import ParkCard from './ParkCard.jsx'

it.each([
  ['X', 'Bronx'], ['B', 'Brooklyn'], ['M', 'Manhattan'],
  ['Q', 'Queens'], ['R', 'Staten Island'], ['Unknown', 'Unknown'],
])('displays borough %s as %s', (borough, name) => {
  render(<ParkCard park={{
    _id: 'example', name: 'Example Park', borough,
    type: 'Neighborhood Park', acres: 1.5,
  }} />)
  expect(screen.getByText(`${name} · Neighborhood Park`)).toBeInTheDocument()
})

it('shows the park name, borough, type, and acreage', () => {
  render(<ParkCard park={{
    _id: 'example',
    name: 'Example Park',
    borough: 'Manhattan',
    type: 'Neighborhood Park',
    acres: 1.5,
  }} />)

  expect(screen.getByRole('heading', { name: 'Example Park' })).toBeInTheDocument()
  expect(screen.getByText('Manhattan · Neighborhood Park')).toBeInTheDocument()
  expect(screen.getByText('1.5 acres')).toBeInTheDocument()
})

it('offers a details button only when it can be selected', () => {
  const park = { _id: 'M010', name: 'Central Park', borough: 'M', type: 'Flagship Park', acres: 840.01 }
  const onSelect = vi.fn()
  const { rerender } = render(<ParkCard park={park} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()

  rerender(<ParkCard park={park} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('button', { name: 'View details for Central Park' }))
  expect(onSelect).toHaveBeenCalledWith('M010')
})
