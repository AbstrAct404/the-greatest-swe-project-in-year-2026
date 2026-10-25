import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPark, listParks, nearParks, searchParks } from './api.js'
import App from './App.jsx'

vi.mock('./api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, listParks: vi.fn(), searchParks: vi.fn(), getPark: vi.fn(),
    nearParks: vi.fn() }
})

beforeEach(() => {
  vi.mocked(listParks).mockReset()
  vi.mocked(listParks).mockResolvedValue(parkPage([]))
  vi.mocked(searchParks).mockReset()
  vi.mocked(searchParks).mockResolvedValue([])
  vi.mocked(getPark).mockReset()
  vi.mocked(nearParks).mockReset()
  vi.mocked(nearParks).mockResolvedValue([])
})

const CENTRAL = {
  _id: 'M010', name: 'Central Park', borough: 'M',
  type: 'Flagship Park', acres: 840.01,
}
const PROSPECT = {
  _id: 'B073', name: 'Prospect Park', borough: 'B',
  type: 'Flagship Park', acres: 526.25,
}

function parkPage(parks, page = 1, total = parks.length, per_page = 50) {
  return { parks, page, total, per_page }
}

function search(text) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search parks' }), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
}

describe('App retry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('shows loading during a retry and recovers from an initial failure', async () => {
    let resolveRetry
    vi.mocked(listParks).mockRejectedValueOnce(new Error('Unavailable'))
      .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Loading parks…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    await act(async () => resolveRetry(parkPage([CENTRAL])))
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(screen.queryByText(/Unable to load parks/)).not.toBeInTheDocument()
  })

  it('keeps the selected borough and page when retrying', async () => {
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(parkPage([CENTRAL], 2, 51))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    await screen.findByText('Page 2 of 2')
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', page: 2 })
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveValue('M')
  })

  it('retries the current search and keeps its borough filter', async () => {
    vi.mocked(searchParks).mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce([CENTRAL, PROSPECT])
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    await screen.findByText('No parks found in this borough.')
    search('park')
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith('park')
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('park')
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })
})

describe('App pagination', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('navigates both ways and disables buttons at page boundaries', async () => {
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 51))
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    expect(screen.getByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, page: 2 })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await screen.findByText('Page 1 of 2')
    expect(screen.getByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, page: 1 })
  })

  it('disables navigation while loading another page', async () => {
    let resolvePage
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 101))
      .mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve }))
    render(<App />)
    await screen.findByText('Page 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await act(async () => resolvePage(parkPage([PROSPECT], 2, 101)))
    await screen.findByText('Page 2 of 3')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('resets pagination when the borough changes and ignores an old page response', async () => {
    let resolvePage
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 101))
      .mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve }))
      .mockResolvedValueOnce(parkPage([PROSPECT]))
    render(<App />)
    await screen.findByText('Page 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'B' },
    })
    await screen.findByText('Page 1 of 1')
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'B', page: 1 })
    await act(async () => resolvePage(parkPage([CENTRAL], 2, 101)))
    expect(screen.getByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('resets to page one after searching and clearing the search', async () => {
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 51))
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
    vi.mocked(searchParks).mockResolvedValue([CENTRAL])
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    search('central')
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(screen.queryByRole('navigation', { name: 'Parks pagination' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await screen.findByText('Page 1 of 2')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, page: 1 })
  })

  it('disables both buttons for an empty list', async () => {
    render(<App />)
    await screen.findByText('No parks available yet.')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('preserves the current page when returning from park details', async () => {
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 51))
    vi.mocked(getPark).mockResolvedValue({ ...PROSPECT, address: '95 Prospect Park West' })
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'View details for Prospect Park' }))
    await screen.findByText('95 Prospect Park West')
    fireEvent.click(screen.getByRole('button', { name: /Back to parks/ }))
    expect(screen.getByText('Page 2 of 2')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Prospect Park', level: 3 })).toBeInTheDocument()
    expect(listParks).toHaveBeenCalledTimes(2)
  })
})

describe('App park details', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('opens a park and returns to the same search', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(searchParks).mockResolvedValue([CENTRAL])
    vi.mocked(getPark).mockResolvedValue({ ...CENTRAL, address: '1000 5 AVENUE' })
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })
    search('central')

    fireEvent.click(await screen.findByRole('button', { name: 'View details for Central Park' }))
    expect(await screen.findByText('1000 5 AVENUE')).toBeInTheDocument()
    expect(getPark).toHaveBeenCalledWith('M010')
    expect(screen.queryByRole('searchbox', { name: 'Search parks' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('central')
    expect(screen.getByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenCalledTimes(1)
  })
})

describe('App nearby parks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('opens a nearby park from the detail view', async () => {
    const ROOSEVELT = {
      _id: 'M053', name: 'Theodore Roosevelt Park', borough: 'M',
      type: 'Neighborhood Park', acres: 17.6,
      centroid: { type: 'Point', coordinates: [-73.9737, 40.7813] },
    }
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockImplementation(async (id) => (id === 'M010'
      ? { ...CENTRAL, centroid: { type: 'Point', coordinates: [-73.965558, 40.782484] } }
      : ROOSEVELT))
    vi.mocked(nearParks).mockResolvedValueOnce([
      { ...CENTRAL, distance: 0 }, { ...ROOSEVELT, distance: 542.3 },
    ])
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'View details for Central Park' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Theodore Roosevelt Park' }))
    expect(await screen.findByRole('heading', { name: 'Theodore Roosevelt Park', level: 2 })).toHaveFocus()
    expect(getPark).toHaveBeenLastCalledWith('M053')
    expect(screen.queryByRole('heading', { name: 'Central Park', level: 2 })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(screen.getByRole('heading', { name: 'Central Park', level: 3 })).toBeInTheDocument()
  })
})

describe('App search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('shows the parks matching a search', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(searchParks).mockResolvedValue([CENTRAL])
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })

    search('  central ')
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenCalledWith('central')
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('zzz')
    expect(await screen.findByText('No parks match "zzz".')).toBeInTheDocument()
  })

  it('narrows search results to the selected borough', async () => {
    vi.mocked(searchParks).mockResolvedValue([CENTRAL, PROSPECT])
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'B' },
    })
    search('park')
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Central Park' })).not.toBeInTheDocument()
  })

  it('returns to the full list when the search is cleared', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(searchParks).mockResolvedValue([CENTRAL])
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })
    search('central')
    await screen.findByRole('heading', { name: 'Central Park' })

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('')
  })

  it('treats a blank search as no search', async () => {
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('   ')
    await screen.findByText('No parks available yet.')
    expect(searchParks).not.toHaveBeenCalled()
  })

  it('shows an error when the search fails', async () => {
    vi.mocked(searchParks).mockRejectedValue(new Error('Unavailable'))
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('central')
    expect(await screen.findByText('Unable to load parks. Please try again later.')).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('requests a borough and allows returning to all boroughs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValueOnce(parkPage([{
      _id: 'B073', name: 'Prospect Park', borough: 'B',
      type: 'Flagship Park', acres: 526,
    }])).mockResolvedValueOnce(parkPage([{
      _id: 'M010', name: 'Central Park', borough: 'M',
      type: 'Flagship Park', acres: 840.01,
    }])).mockResolvedValueOnce(parkPage([]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', page: 1 })
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: '' },
    })
    await screen.findByText('No parks available yet.')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, page: 1 })
  })

  it('shows a borough-specific empty message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'Q' },
    })
    expect(await screen.findByText('No parks found in this borough.')).toBeInTheDocument()
  })

  it('requests a park type alongside the borough and resets the page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 120))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 3')

    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Park type' }), {
      target: { value: 'Flagship Park' },
    })
    await screen.findByText('Page 1 of 3')
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', type: 'Flagship Park', page: 1 })

    fireEvent.change(screen.getByRole('combobox', { name: 'Park type' }), {
      target: { value: '' },
    })
    await waitFor(() => {
      expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', type: undefined, page: 1 })
    })
  })

  it('narrows search results to the selected park type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(searchParks).mockResolvedValue([CENTRAL, {
      _id: 'M100', name: 'Central Playground', borough: 'M',
      type: 'Playground', acres: 1.2,
    }])
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Park type' }), {
      target: { value: 'Playground' },
    })
    search('central')
    expect(await screen.findByRole('heading', { name: 'Central Playground' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Central Park' })).not.toBeInTheDocument()
  })

  it('shows a filter-specific empty message for a park type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Park type' }), {
      target: { value: 'Garden' },
    })
    expect(await screen.findByText('No parks match these filters.')).toBeInTheDocument()
  })

  it('ignores a slow response for the previous selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    let resolvePrevious
    vi.mocked(listParks).mockReturnValueOnce(new Promise((resolve) => {
      resolvePrevious = resolve
    })).mockResolvedValueOnce(parkPage([{
      _id: 'M010', name: 'Central Park', borough: 'M',
      type: 'Flagship Park', acres: 840.01,
    }]))
    render(<App />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    await screen.findByRole('heading', { name: 'Central Park' })
    await act(async () => resolvePrevious(parkPage([{
      _id: 'B073', name: 'Prospect Park', borough: 'B',
      type: 'Flagship Park', acres: 526,
    }])))
    expect(screen.getByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })

  it('can recover from a failed borough request with a new selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(parkPage([]))
    render(<App />)
    await screen.findByText('Unable to load parks. Please try again later.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'X' },
    })
    await waitFor(() => expect(screen.queryByText(/Unable to load parks/)).not.toBeInTheDocument())
    expect(await screen.findByText('No parks found in this borough.')).toBeInTheDocument()
  })

  it('shows parks even when the backend health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValue(parkPage([{
      _id: 'example', name: 'Example Park', borough: 'Manhattan',
      type: 'Neighborhood Park', acres: 1.5,
    }]))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Example Park' })).toBeInTheDocument()
    expect(await screen.findByText(/Can't reach the API/)).toBeInTheDocument()
  })

  it('shows an empty message when there are no parks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    expect(await screen.findByText('No parks available yet.')).toBeInTheDocument()
  })

  it('shows a loading message while parks are being fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockImplementation(() => new Promise(() => {}))
    render(<App />)
    expect(screen.getByText('Loading parks…')).toBeInTheDocument()
    await screen.findByText(/Can't reach the API/)
  })

  it('shows an error when parks cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockRejectedValue(new Error('Unable to load'))
    render(<App />)
    expect(await screen.findByText('Unable to load parks. Please try again later.')).toBeInTheDocument()
  })

  it('shows connected when the API responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hello: 'world' }),
    }))
    render(<App />)
    expect(await screen.findByText(/Connected to API/)).toBeInTheDocument()
  })

  it('shows an error when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    expect(await screen.findByText(/Can't reach the API/)).toBeInTheDocument()
  })

  it('shows an error when the API returns a bad status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    render(<App />)
    expect(await screen.findByText(/Can't reach the API/)).toBeInTheDocument()
  })
})
