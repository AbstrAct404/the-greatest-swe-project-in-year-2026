import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_URL, listParks, searchParks } from './api.js'

afterEach(() => vi.unstubAllGlobals())

function mockResponse(body, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok, status, json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('listParks', () => {
  it('extracts parks from the backend page response', async () => {
    const parks = [{ _id: 'M010', name: 'Central Park' }]
    const fetchMock = mockResponse({ parks, total: 1, page: 1, per_page: 50 })
    expect(await listParks()).toEqual(parks)
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/parks`)
  })

  it('maps frontend filters to backend query parameters', async () => {
    const fetchMock = mockResponse({ parks: [] })
    await listParks({ borough: 'M', type: 'Flagship Park', minAcres: 0, page: 2 })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(Object.fromEntries(url.searchParams)).toEqual({
      borough: 'M', park_type: 'Flagship Park', min_acres: '0', page: '2',
    })
  })

  it('omits empty and unspecified filters', async () => {
    const fetchMock = mockResponse({ parks: [] })
    expect(await listParks({ borough: '', type: null })).toEqual([])
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
    mockResponse({ parks: [] })
    await expect(searchParks('central')).rejects.toThrow('Invalid search response')
  })
})
