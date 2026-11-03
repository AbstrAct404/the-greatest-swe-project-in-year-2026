import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { getPark } from '../api.js'
import ParkDetail from './ParkDetail.jsx'

vi.mock('../api.js', () => ({ getPark: vi.fn() }))
// The map has its own tests; here we only check what it is given.
vi.mock('./NearbyParks.jsx', () => ({
  default: ({ park, onSelect }) => (
    <button type="button" onClick={() => onSelect('M053')}>
      {`Parks near ${park.name}`}
    </button>
  ),
}))
vi.mock('./ParkMap.jsx', () => ({
  default: ({ geometry, name }) => (
    <div data-testid="park-map" data-geometry={JSON.stringify(geometry)}>
      {`Map of ${name}`}
    </div>
  ),
}))

beforeEach(() => {
  vi.mocked(getPark).mockReset()
})

it('shows the full details of a park', async () => {
  vi.mocked(getPark).mockResolvedValue({
    _id: 'M010', name: 'Central Park', type: 'Flagship Park', borough: 'M',
    acres: 840.01, address: '1000 5 AVENUE', zipcode: '10023, 10024, 10025',
    waterfront: false,
  })
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  expect(screen.getByText('Loading park…')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
  expect(screen.getByText('Manhattan')).toBeInTheDocument()
  expect(screen.getByText('840.01 acres')).toBeInTheDocument()
  expect(screen.getByText('1000 5 AVENUE')).toBeInTheDocument()
  expect(screen.getByText('10023, 10024, 10025')).toBeInTheDocument()
  expect(screen.getByText('No')).toBeInTheDocument()
  expect(getPark).toHaveBeenCalledWith('M010')
})

it('fills in missing address details', async () => {
  vi.mocked(getPark).mockResolvedValue({
    _id: 'R015', name: 'Walker Park', type: 'Recreational Field/Courts',
    borough: 'R', acres: 5.278, waterfront: true,
  })
  render(<ParkDetail parkId="R015" onBack={() => {}} />)
  await screen.findByRole('heading', { name: 'Walker Park' })
  expect(screen.getAllByText('Not listed')).toHaveLength(2)
  expect(screen.getByText('Yes')).toBeInTheDocument()
})

it('says when the park does not exist', async () => {
  vi.mocked(getPark).mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }))
  render(<ParkDetail parkId="NOPE" onBack={() => {}} />)
  expect(await screen.findByText('Park not found.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
})

it('shows an error when the park cannot be loaded', async () => {
  vi.mocked(getPark).mockRejectedValue(new TypeError('Failed to fetch'))
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  expect(await screen.findByText('Unable to load this park. Please try again later.')).toBeInTheDocument()
})

it('retries the same park and shows loading until it recovers', async () => {
  let resolveRetry
  vi.mocked(getPark).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve }))
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(screen.getByText('Loading park…')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  expect(getPark).toHaveBeenNthCalledWith(2, 'M010')

  await act(async () => resolveRetry({
    _id: 'M010', name: 'Central Park', borough: 'M',
  }))
  expect(await screen.findByRole('heading', { name: 'Central Park' })).toHaveFocus()
  expect(screen.queryByText(/Unable to load this park/)).not.toBeInTheDocument()
})

it('allows another attempt after a retry also fails', async () => {
  vi.mocked(getPark).mockRejectedValue(new TypeError('Failed to fetch'))
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeEnabled()
  expect(getPark).toHaveBeenCalledTimes(2)
})

it('calls onBack from the back button', async () => {
  vi.mocked(getPark).mockReturnValue(new Promise(() => {}))
  const onBack = vi.fn()
  render(<ParkDetail parkId="M010" onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
  expect(onBack).toHaveBeenCalled()
})

it('shows the park boundary on a map', async () => {
  const geometry = { type: 'MultiPolygon', coordinates: [] }
  vi.mocked(getPark).mockResolvedValue({
    _id: 'M010', name: 'Central Park', borough: 'M', geometry,
  })
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  const map = await screen.findByTestId('park-map')
  expect(map).toHaveTextContent('Map of Central Park')
  expect(map).toHaveAttribute('data-geometry', JSON.stringify(geometry))
})

it('lists nearby parks and passes on a selection', async () => {
  vi.mocked(getPark).mockResolvedValue({ _id: 'M010', name: 'Central Park', borough: 'M' })
  const onSelect = vi.fn()
  render(<ParkDetail parkId="M010" onBack={() => {}} onSelect={onSelect} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Parks near Central Park' }))
  expect(onSelect).toHaveBeenCalledWith('M053')
})

it('moves focus to the park name once it loads', async () => {
  vi.mocked(getPark).mockResolvedValue({ _id: 'M010', name: 'Central Park', borough: 'M' })
  render(<ParkDetail parkId="M010" onBack={() => {}} onSelect={() => {}} />)
  expect(await screen.findByRole('heading', { name: 'Central Park' })).toHaveFocus()
})
