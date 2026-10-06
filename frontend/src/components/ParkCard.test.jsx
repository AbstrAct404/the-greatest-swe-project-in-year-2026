import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import ParkCard from './ParkCard.jsx'

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
