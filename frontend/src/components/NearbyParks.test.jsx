import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { nearParks } from '../api.js'
import NearbyParks from './NearbyParks.jsx'

vi.mock('../api.js', () => ({ nearParks: vi.fn() }))

const CENTRAL = {
  _id: 'M010', name: 'Central Park',
  centroid: { type: 'Point', coordinates: [-73.965558, 40.782484] },
}

function nearby(id, name, distance) {
  return { _id: id, name, distance }
}

beforeEach(() => {
  vi.mocked(nearParks).mockReset()
})

it('asks for parks near the centre of the park', async () => {
  vi.mocked(nearParks).mockResolvedValue([])
  render(<NearbyParks park={CENTRAL} onSelect={() => {}} />)
  expect(screen.getByText('Finding nearby parks…')).toBeInTheDocument()
  await screen.findByText('No other parks within 1 km.')
  expect(nearParks).toHaveBeenCalledWith({
    lat: 40.782484, lng: -73.965558, radius: 1000, limit: 6,
  })
})

it('lists the closest other parks with their distances', async () => {
  vi.mocked(nearParks).mockResolvedValue([
    nearby('M010', 'Central Park', 0),
    nearby('M053', 'Theodore Roosevelt Park', 542.4),
    nearby('M307', 'W 87th Street Garden', 672.6),
  ])
  render(<NearbyParks park={CENTRAL} onSelect={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Theodore Roosevelt Park' })).toBeInTheDocument()
  expect(screen.getByText('542 m')).toBeInTheDocument()
  expect(screen.getByText('673 m')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Central Park' })).not.toBeInTheDocument()
})

it('shows at most five parks', async () => {
  vi.mocked(nearParks).mockResolvedValue(
    [1, 2, 3, 4, 5, 6].map((n) => nearby(`P${n}`, `Park ${n}`, n * 100)),
  )
  render(<NearbyParks park={CENTRAL} onSelect={() => {}} />)
  await screen.findByRole('button', { name: 'Park 1' })
  expect(screen.getAllByRole('button')).toHaveLength(5)
})

it('passes the chosen park to onSelect', async () => {
  vi.mocked(nearParks).mockResolvedValue([nearby('M053', 'Theodore Roosevelt Park', 542)])
  const onSelect = vi.fn()
  render(<NearbyParks park={CENTRAL} onSelect={onSelect} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Theodore Roosevelt Park' }))
  expect(onSelect).toHaveBeenCalledWith('M053')
})

it('shows an error when nearby parks cannot be loaded', async () => {
  vi.mocked(nearParks).mockRejectedValue(new TypeError('Failed to fetch'))
  render(<NearbyParks park={CENTRAL} onSelect={() => {}} />)
  expect(await screen.findByText('Unable to load nearby parks.')).toBeInTheDocument()
})

it('shows nothing for a park without a location', () => {
  const { container } = render(
    <NearbyParks park={{ _id: 'X1', name: 'Unmapped Park' }} onSelect={() => {}} />,
  )
  expect(container).toBeEmptyDOMElement()
  expect(nearParks).not.toHaveBeenCalled()
})

it('ignores a late response after it is removed', async () => {
  let resolve
  vi.mocked(nearParks).mockReturnValue(new Promise((r) => { resolve = r }))
  const { unmount } = render(<NearbyParks park={CENTRAL} onSelect={() => {}} />)
  unmount()
  await act(async () => resolve([nearby('M053', 'Theodore Roosevelt Park', 542)]))
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
