import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import L from 'leaflet'
import ParkMap from './ParkMap.jsx'

// Leaflet needs a real browser to draw, so check how we drive it instead.
const map = { fitBounds: vi.fn(), remove: vi.fn() }
const layer = { addTo: vi.fn(() => layer), getBounds: vi.fn(() => 'bounds') }

vi.mock('leaflet', () => ({
  default: { map: vi.fn(), tileLayer: vi.fn(), geoJSON: vi.fn() },
}))
vi.mock('leaflet/dist/leaflet.css', () => ({}))

const BOUNDARY = {
  type: 'MultiPolygon',
  coordinates: [[[[-74, 40.7], [-73.99, 40.7], [-73.99, 40.71], [-74, 40.7]]]],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(L.map).mockReturnValue(map)
  vi.mocked(L.tileLayer).mockReturnValue(layer)
  vi.mocked(L.geoJSON).mockReturnValue(layer)
})

it('draws the park boundary and zooms to it', () => {
  render(<ParkMap geometry={BOUNDARY} name="Central Park" />)
  const container = screen.getByRole('img', { name: 'Map of Central Park' })
  expect(L.map).toHaveBeenCalledWith(container, expect.any(Object))
  expect(L.geoJSON).toHaveBeenCalledWith(BOUNDARY, expect.any(Object))
  expect(layer.addTo).toHaveBeenCalledWith(map)
  expect(map.fitBounds).toHaveBeenCalledWith('bounds', expect.any(Object))
})

it('uses OpenStreetMap tiles with attribution', () => {
  render(<ParkMap geometry={BOUNDARY} name="Central Park" />)
  const [url, options] = vi.mocked(L.tileLayer).mock.calls[0]
  expect(url).toContain('tile.openstreetmap.org')
  expect(options.attribution).toContain('OpenStreetMap')
})

it('removes the map when it unmounts', () => {
  const { unmount } = render(<ParkMap geometry={BOUNDARY} name="Central Park" />)
  unmount()
  expect(map.remove).toHaveBeenCalled()
})

it('says when there is no boundary to show', () => {
  render(<ParkMap geometry={undefined} name="Central Park" />)
  expect(screen.getByText('No map available for this park.')).toBeInTheDocument()
  expect(L.map).not.toHaveBeenCalled()
})
