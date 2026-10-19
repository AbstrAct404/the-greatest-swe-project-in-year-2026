import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_URL, getPark, listParks, nearParks, searchParks } from './api.js'

afterEach(() => vi.unstubAllGlobals())

function mockResponse(body, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok, status, json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('listParks', () => {
  it('preserves parks and pagination metadata from the backend response', async () => {
    const parks = [{ _id: 'M010', name: 'Central Park' }]
    const fetchMock = mockResponse({ parks, total: 1, page: 1, per_page: 50 })
    expect(await listParks()).toEqual({ parks, total: 1, page: 1, per_page: 50 })
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks`)
  })

  it('maps frontend filters to backend query parameters', async () => {
    const fetchMock = mockResponse({ parks: [], total: 0, page: 1, per_page: 50 })
    await listParks({ borough: 'M', type: 'Flagship Park', minAcres: 0, page: 2 })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(Object.fromEntries(url.searchParams)).toEqual({
      borough: 'M', park_type: 'Flagship Park', min_acres: '0', page: '2',
    })
  })

  it('omits empty and unspecified filters', async () => {
    const fetchMock = mockResponse({ parks: [], total: 0, page: 1, per_page: 50 })
    expect(await listParks({ borough: '', type: null })).toEqual({ parks: [], total: 0, page: 1, per_page: 50 })
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks`)
  })

  it('rejects unsuccessful HTTP responses', async () => {
    mockResponse({ message: 'Unavailable' }, false, 503)
    await expect(listParks()).rejects.toThrow('GET /parks failed: 503')
  })

  it('rejects malformed park responses', async () => {
    mockResponse({ parks: null })
    await expect(listParks()).rejects.toThrow('Invalid parks response')
  })

  it.each([
    { total: -1, page: 1, per_page: 50 },
    { total: 51, page: 0, per_page: 50 },
    { total: 51, page: 1, per_page: 0 },
    { total: 51, page: 1 },
  ])('rejects invalid pagination metadata: %j', async (metadata) => {
    mockResponse({ parks: [], ...metadata })
    await expect(listParks()).rejects.toThrow('Invalid parks response')
  })

  it('propagates connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(listParks()).rejects.toThrow('Failed to fetch')
  })
})

describe('searchParks', () => {
  it('returns the parks matching the search text', async () => {
    const parks = [{ _id: 'M010', name: 'Central Park' }]
    const fetchMock = mockResponse(parks)
    expect(await searchParks('central')).toEqual(parks)
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks/search?text=central`)
  })

  it('encodes the search text', async () => {
    const fetchMock = mockResponse([])
    await searchParks('Fox & Hound')
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.searchParams.get('text')).toBe('Fox & Hound')
  })

  it('rejects unsuccessful HTTP responses', async () => {
    mockResponse({ message: 'Search text cannot be empty.' }, false, 400)
    await expect(searchParks(' ')).rejects.toThrow('failed: 400')
  })

  it('rejects malformed search responses', async () => {
    mockResponse({ parks: [], total: 0, page: 1, per_page: 50 })
    await expect(searchParks('central')).rejects.toThrow('Invalid search response')
  })
})

describe('getPark', () => {
  it('returns one park by id', async () => {
    const park = { _id: 'M010', name: 'Central Park' }
    const fetchMock = mockResponse(park)
    expect(await getPark('M010')).toEqual(park)
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks/M010`)
  })

  it('encodes the park id', async () => {
    const fetchMock = mockResponse({})
    await getPark('a/b')
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks/a%2Fb`)
  })

  it('rejects a missing park with its status', async () => {
    mockResponse({ message: 'Park NOPE not found.' }, false, 404)
    await expect(getPark('NOPE')).rejects.toMatchObject({ status: 404 })
  })
})

describe('nearParks', () => {
  it('sends the point, radius and limit', async () => {
    const parks = [{ _id: 'M053', name: 'Theodore Roosevelt Park', distance: 542 }]
    const fetchMock = mockResponse(parks)
    expect(await nearParks({ lat: 40.78, lng: -73.97, radius: 1000, limit: 6 })).toEqual(parks)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/parks/near')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: '40.78', lng: '-73.97', radius: '1000', limit: '6',
    })
  })

  it('leaves out the radius and limit when not given', async () => {
    const fetchMock = mockResponse([])
    await nearParks({ lat: 40.78, lng: -73.97 })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect([...url.searchParams.keys()]).toEqual(['lat', 'lng'])
  })

  it('rejects unsuccessful HTTP responses', async () => {
    mockResponse({ message: 'Latitude and longitude are required.' }, false, 400)
    await expect(nearParks({ lat: 40.78, lng: -73.97 })).rejects.toMatchObject({ status: 400 })
  })

  it('rejects malformed responses', async () => {
    mockResponse({ parks: [], total: 0, page: 1, per_page: 50 })
    await expect(nearParks({ lat: 40.78, lng: -73.97 })).rejects.toThrow('Invalid nearby parks response')
  })
})
