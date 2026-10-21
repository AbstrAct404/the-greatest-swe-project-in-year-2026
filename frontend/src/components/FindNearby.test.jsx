import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { geocode, nearParks, parksAt } from '../api.js'
import { formatDistance } from '../distance.js'
import FindNearby from './FindNearby.jsx'

vi.mock('../api.js', () => ({
  geocode: vi.fn(), nearParks: vi.fn(), parksAt: vi.fn(),
}))

const TIMES_SQUARE = {
  lat: 40.7562, lng: -73.98653, label: 'TIMES SQUARE, New York, NY, USA',
}
const DUFFY = { _id: 'M361', name: 'Father Duffy Square', distance: 0 }
const BRYANT = { _id: 'M008', name: 'Bryant Park', distance: 394.2 }

function searchFor(text) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Address or place' }), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Find parks' }))
}

function mockLocation(getCurrentPosition) {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition }, configurable: true,
  })
}

beforeEach(() => {
  vi.mocked(geocode).mockReset()
  vi.mocked(nearParks).mockReset()
  vi.mocked(parksAt).mockReset()
})

afterEach(() => {
  delete navigator.geolocation
})

it('formats distances', () => {
  expect(formatDistance(0)).toBe('here')
  expect(formatDistance(394.2)).toBe('394 m')
  expect(formatDistance(1530)).toBe('1.5 km')
})

it('finds parks near an address, closest first', async () => {
  vi.mocked(geocode).mockResolvedValue(TIMES_SQUARE)
  vi.mocked(nearParks).mockResolvedValue([DUFFY, BRYANT])
  vi.mocked(parksAt).mockResolvedValue([])
  render(<FindNearby onSelect={() => {}} />)

  searchFor('  Times Square  ')

  expect(screen.getByText('Finding parks…')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Bryant Park' })).toBeInTheDocument()
  expect(screen.getByText('394 m')).toBeInTheDocument()
  expect(screen.getByText(/within 1 km of TIMES SQUARE/)).toBeInTheDocument()
  expect(geocode).toHaveBeenCalledWith('Times Square')
  expect(nearParks).toHaveBeenCalledWith({
    lat: 40.7562, lng: -73.98653, radius: 1000, limit: 10,
  })
  expect(parksAt).toHaveBeenCalledWith({ lat: 40.7562, lng: -73.98653 })
})

it('says which park the address is in', async () => {
  vi.mocked(geocode).mockResolvedValue(TIMES_SQUARE)
  vi.mocked(nearParks).mockResolvedValue([DUFFY])
  vi.mocked(parksAt).mockResolvedValue([DUFFY])
  render(<FindNearby onSelect={() => {}} />)

  searchFor('Times Square')

  const banner = await screen.findByText(/is in/)
  expect(banner).toHaveTextContent('TIMES SQUARE, New York, NY, USA is in Father Duffy Square.')
})

it('opens a park when it is clicked', async () => {
  vi.mocked(geocode).mockResolvedValue(TIMES_SQUARE)
  vi.mocked(nearParks).mockResolvedValue([BRYANT])
  vi.mocked(parksAt).mockResolvedValue([])
  const onSelect = vi.fn()
  render(<FindNearby onSelect={onSelect} />)

  searchFor('Times Square')
  fireEvent.click(await screen.findByRole('button', { name: 'Bryant Park' }))

  expect(onSelect).toHaveBeenCalledWith('M008')
})

it('says when there are no parks nearby', async () => {
  vi.mocked(geocode).mockResolvedValue(TIMES_SQUARE)
  vi.mocked(nearParks).mockResolvedValue([])
  vi.mocked(parksAt).mockResolvedValue([])
  render(<FindNearby onSelect={() => {}} />)

  searchFor('Times Square')

  expect(await screen.findByText(/No parks within 1 km/)).toBeInTheDocument()
})

it('ignores a blank address', () => {
  render(<FindNearby onSelect={() => {}} />)
  searchFor('   ')
  expect(geocode).not.toHaveBeenCalled()
})

it('says when the address cannot be found', async () => {
  vi.mocked(geocode).mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }))
  render(<FindNearby onSelect={() => {}} />)

  searchFor('zzzzqqq')

  expect(await screen.findByText(/Couldn't find that address/)).toBeInTheDocument()
  expect(nearParks).not.toHaveBeenCalled()
})

it('shows an error when the search fails', async () => {
  vi.mocked(geocode).mockResolvedValue(TIMES_SQUARE)
  vi.mocked(nearParks).mockRejectedValue(new TypeError('Failed to fetch'))
  vi.mocked(parksAt).mockResolvedValue([])
  render(<FindNearby onSelect={() => {}} />)

  searchFor('Times Square')

  expect(await screen.findByText(/Unable to find parks right now/)).toBeInTheDocument()
})

it('hides the location button when the browser has no location support', () => {
  render(<FindNearby onSelect={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Use my location' })).not.toBeInTheDocument()
})

it('finds parks around the user and says which park they are in', async () => {
  mockLocation((success) => success({ coords: { latitude: 40.774, longitude: -73.9708 } }))
  vi.mocked(nearParks).mockResolvedValue([{ _id: 'M010', name: 'Central Park', distance: 0 }])
  vi.mocked(parksAt).mockResolvedValue([{ _id: 'M010', name: 'Central Park' }])
  render(<FindNearby onSelect={() => {}} />)

  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

  const banner = await screen.findByText(/You're in/)
  expect(banner).toHaveTextContent("You're in Central Park.")
  expect(screen.getByText('here')).toBeInTheDocument()
  expect(nearParks).toHaveBeenCalledWith({
    lat: 40.774, lng: -73.9708, radius: 1000, limit: 10,
  })
  expect(geocode).not.toHaveBeenCalled()
})

it('explains when location access is denied', async () => {
  mockLocation((success, failure) => failure({ code: 1, message: 'denied' }))
  render(<FindNearby onSelect={() => {}} />)

  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

  expect(await screen.findByText(/Couldn't get your location/)).toBeInTheDocument()
  expect(nearParks).not.toHaveBeenCalled()
})
