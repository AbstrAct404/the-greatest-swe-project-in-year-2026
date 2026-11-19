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
  // The open park is kept in the URL, so start each test on the list.
  window.history.replaceState(null, '', '/')
  vi.mocked(listParks).mockReset()
  vi.mocked(listParks).mockResolvedValue(parkPage([]))
  vi.mocked(searchParks).mockReset()
  vi.mocked(searchParks).mockResolvedValue(parkPage([]))
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

describe('App result count', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('shows the full total across pages and updates it for filters', async () => {
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 2061))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 2061))
      .mockResolvedValueOnce(parkPage([PROSPECT], 1, 124))
    render(<App />)
    expect(await screen.findByText('2,061 parks found')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 42')
    expect(screen.getByText('2,061 parks found')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn', exact: true }))
    expect(await screen.findByText('124 parks found')).toBeInTheDocument()
  })

  it('counts every search match, not just the first page', async () => {
    vi.mocked(searchParks)
      .mockResolvedValueOnce(parkPage([CENTRAL, PROSPECT], 1, 734))
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 212))
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 1))
    render(<App />)
    await screen.findByText('0 parks found')
    search('park')
    expect(await screen.findByText('734 parks found')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    expect(await screen.findByText('212 parks found')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Flagship Park', exact: true }))
    expect(await screen.findByText('1 park found')).toBeInTheDocument()
  })

  it('hides the previous count while loading and after an error', async () => {
    let rejectRequest
    vi.mocked(listParks)
      .mockResolvedValueOnce(parkPage([CENTRAL]))
      .mockReturnValueOnce(new Promise((resolve, reject) => { rejectRequest = reject }))
    render(<App />)
    await screen.findByText('1 park found')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn', exact: true }))
    expect(screen.queryByText(/\d[\d,]* parks? found/)).not.toBeInTheDocument()
    await act(async () => rejectRequest(new Error('Unavailable')))
    await screen.findByText('Unable to load parks. Please try again later.')
    expect(screen.queryByText(/\d[\d,]* parks? found/)).not.toBeInTheDocument()
  })
})

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
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    await screen.findByText('Page 2 of 2')
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', page: 2 })
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('Manhattan')
  })

  it('retries the current search and keeps its borough filter', async () => {
    vi.mocked(searchParks).mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    await screen.findByText('No parks found in this borough.')
    search('park')
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'park', borough: 'M', page: 1 })
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('park')
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })
})

describe('Clear all filters', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL, PROSPECT], 1, 100))
  })

  it('clears the search, borough, type and size and restores the full list', async () => {
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Flagship Park', exact: true }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: '100+ acres' }))
    search('park')
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('All boroughs')
    expect(screen.getByRole('combobox', { name: 'Park type' })).toHaveTextContent('All types')
    expect(screen.getByRole('combobox', { name: 'Minimum size' })).toHaveTextContent('Any size')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, type: undefined, minAcres: undefined, page: 1 })
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeDisabled()
  })

  it('returns to page one even when no filters are selected', async () => {
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await screen.findByText('Page 1 of 2')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, type: undefined, page: 1 })
  })

  it('clears unsubmitted search text without leaving the list loading', async () => {
    render(<App />)
    await screen.findByText('Page 1 of 2')
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeDisabled()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search parks' }), {
      target: { value: 'central' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenCalledTimes(1)
    expect(searchParks).not.toHaveBeenCalled()
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn', exact: true }))
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
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    search('central')
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'central', page: 1 })
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
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
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
    // Back is async, so let it land before the next test resets the URL.
    await waitFor(() => expect(window.location.search).toBe('?q=central'))
  })

  it('returns focus to the park that was opened', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL, PROSPECT]))
    vi.mocked(getPark).mockResolvedValue(PROSPECT)
    render(<App />)
    const details = await screen.findByRole('button', { name: 'View details for Prospect Park' })
    details.focus()
    fireEvent.click(details)
    await screen.findByRole('heading', { name: 'Prospect Park', level: 2 })

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(screen.getByRole('button', { name: 'View details for Prospect Park' })).toHaveFocus()
  })

  it('keeps the open park in the URL', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockResolvedValue(CENTRAL)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'View details for Central Park' }))
    await screen.findByRole('heading', { name: 'Central Park', level: 2 })
    expect(window.location.search).toBe('?park=M010')

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('opens the park named in the URL on load', async () => {
    window.history.replaceState(null, '', '/?park=M010')
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(getPark).mockResolvedValue(CENTRAL)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Central Park', level: 2 })).toBeInTheDocument()
    expect(getPark).toHaveBeenCalledWith('M010')

    // There's no list entry behind a shared link, so Back replaces it.
    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(await screen.findByRole('heading', { name: 'Prospect Park', level: 3 })).toBeVisible()
    expect(window.location.search).toBe('')
  })

  it('closes the park when the browser goes back', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockResolvedValue(CENTRAL)
    render(<App />)
    const details = await screen.findByRole('button', { name: 'View details for Central Park' })
    details.focus()
    fireEvent.click(details)
    await screen.findByRole('heading', { name: 'Central Park', level: 2 })

    act(() => window.history.back())
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Central Park', level: 2 })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'View details for Central Park' })).toHaveFocus()
    expect(window.location.search).toBe('')
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
    const details = await screen.findByRole('button', { name: 'View details for Central Park' })
    details.focus()
    fireEvent.click(details)

    fireEvent.click(await screen.findByRole('button', { name: 'Theodore Roosevelt Park' }))
    expect(await screen.findByRole('heading', { name: 'Theodore Roosevelt Park', level: 2 })).toHaveFocus()
    expect(getPark).toHaveBeenLastCalledWith('M053')
    expect(screen.queryByRole('heading', { name: 'Central Park', level: 2 })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(screen.getByRole('heading', { name: 'Central Park', level: 3 })).toBeInTheDocument()
    // Back skips the nearby park and lands on the card the user started from.
    expect(screen.getByRole('button', { name: 'View details for Central Park' })).toHaveFocus()
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})

describe('App search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  it('shows the parks matching a search', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })

    search('  central ')
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenCalledWith({ text: 'central', page: 1 })
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('zzz')
    expect(await screen.findByText('No parks match "zzz".')).toBeInTheDocument()
  })

  it('asks the server to narrow search results to the selected borough', async () => {
    vi.mocked(searchParks).mockResolvedValue(parkPage([PROSPECT]))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn', exact: true }))
    search('park')
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'park', borough: 'B', page: 1 })
  })

  it('pages through search results', async () => {
    vi.mocked(searchParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 51))
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('park')
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'park', page: 2 })
  })

  it('goes back to the first page of results when a filter changes', async () => {
    vi.mocked(searchParks)
      .mockResolvedValueOnce(parkPage([CENTRAL], 1, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 2, 51))
      .mockResolvedValueOnce(parkPage([PROSPECT], 1, 3))
    render(<App />)
    await screen.findByText('No parks available yet.')
    search('park')
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn', exact: true }))
    await screen.findByText('Page 1 of 1')
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'park', borough: 'B', page: 1 })
  })

  it('returns to the full list when the search is cleared', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
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

    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', page: 1 })
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'All boroughs', exact: true }))
    await screen.findByText('No parks available yet.')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined, page: 1 })
  })

  it('shows a borough-specific empty message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Queens', exact: true }))
    expect(await screen.findByText('No parks found in this borough.')).toBeInTheDocument()
  })

  it('requests a park type alongside the borough and resets the page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 120))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 3')

    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Flagship Park', exact: true }))
    await screen.findByText('Page 1 of 3')
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', type: 'Flagship Park', page: 1 })

    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'All types', exact: true }))
    await waitFor(() => {
      expect(listParks).toHaveBeenLastCalledWith({ borough: 'M', type: undefined, page: 1 })
    })
  })

  it('asks the server to narrow search results to the selected park type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(searchParks).mockResolvedValue(parkPage([{
      _id: 'M100', name: 'Central Playground', borough: 'M',
      type: 'Playground', acres: 1.2,
    }]))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Playground', exact: true }))
    search('central')
    expect(await screen.findByRole('heading', { name: 'Central Playground' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'central', type: 'Playground', page: 1 })
  })

  it('requests a minimum size and resets the page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 120))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 3')

    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: '10+ acres' }))
    await screen.findByText('Page 1 of 3')
    expect(listParks).toHaveBeenLastCalledWith({ minAcres: 10, page: 1 })

    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: 'Any size' }))
    await waitFor(() => {
      expect(listParks).toHaveBeenLastCalledWith({ minAcres: undefined, page: 1 })
    })
  })

  it('asks the server to narrow search results to the minimum size', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: '100+ acres' }))
    search('central')
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(searchParks).toHaveBeenLastCalledWith({ text: 'central', minAcres: 100, page: 1 })
  })

  it('shows a filter-specific empty message for a minimum size', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: '50+ acres' }))
    expect(await screen.findByText('No parks match these filters.')).toBeInTheDocument()
  })

  it('shows a filter-specific empty message for a park type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    await screen.findByText('No parks available yet.')
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Garden', exact: true }))
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Bronx', exact: true }))
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

  it('shows connected when the API and database are up', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', database: 'up' }),
    }))
    render(<App />)
    expect(await screen.findByText(/Connected to API/)).toBeInTheDocument()
  })

  it('says when the API is up but the database is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ status: 'degraded', database: 'down' }),
    }))
    render(<App />)
    expect(await screen.findByText(/can't reach the database/)).toBeInTheDocument()
    expect(screen.queryByText(/Can't reach the API/)).not.toBeInTheDocument()
  })

  it('shows an error when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)
    expect(await screen.findByText(/Can't reach the API/)).toBeInTheDocument()
  })

  it('shows an error when the API returns a bad status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    render(<App />)
    expect(await screen.findByText(/Can't reach the API/)).toBeInTheDocument()
  })
})

describe('App sorting', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  function sortBy(label) {
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort by' }))
    fireEvent.click(screen.getByRole('option', { name: label }))
  }

  it('asks the backend for the chosen order and returns to page one', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 51))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(listParks).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })))

    sortBy('Largest first')

    await waitFor(() => expect(listParks).toHaveBeenLastCalledWith(
      { borough: undefined, type: undefined, page: 1, sort: 'largest' }))
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent('Largest first')
  })

  it('keeps the order when the borough changes', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    sortBy('Smallest first')
    fireEvent.click(screen.getByRole('combobox', { name: 'Borough' }))
    fireEvent.click(screen.getByRole('option', { name: 'Manhattan', exact: true }))
    await waitFor(() => expect(listParks).toHaveBeenLastCalledWith(
      expect.objectContaining({ borough: 'M', sort: 'smallest' })))
  })

  it('hides the sort while searching, since results are best match first', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('combobox', { name: 'Sort by' })
    search('central')
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Sort by' }))
      .not.toBeInTheDocument())
  })

  it('is reset by Clear all filters', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeDisabled()
    sortBy('Largest first')
    await screen.findByRole('heading', { name: 'Central Park' })

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))

    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent('Name (A–Z)')
    await waitFor(() => expect(listParks).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: undefined })))
  })
})

describe('App list URL', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  function choose(filter, option) {
    fireEvent.click(screen.getByRole('combobox', { name: filter }))
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }))
  }

  it('writes the filters, sort and page to the URL as they change', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 120))
    render(<App />)
    await screen.findByText('Page 1 of 3')
    expect(window.location.search).toBe('')

    choose('Borough', 'Manhattan')
    choose('Park type', 'Flagship Park')
    choose('Minimum size', '10+ acres')
    choose('Sort by', 'Largest first')
    await screen.findByText('Page 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 3')

    const params = new URLSearchParams(window.location.search)
    expect(Object.fromEntries(params)).toEqual({
      borough: 'M', type: 'Flagship Park', min_acres: '10', sort: 'largest', page: '2',
    })
  })

  it('writes the submitted search, not the text being typed', async () => {
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByText('Page 1 of 1')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search parks' }), {
      target: { value: 'cent' },
    })
    expect(window.location.search).toBe('')

    search('central')
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(window.location.search).toBe('?q=central')
  })

  it('restores the list from the URL on load', async () => {
    window.history.replaceState(null, '', '/?borough=B&type=Flagship+Park&min_acres=100&sort=smallest&page=2')
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT], 2, 60))
    render(<App />)
    await screen.findByText('Page 2 of 2')
    expect(listParks).toHaveBeenCalledTimes(1)
    expect(listParks).toHaveBeenCalledWith(
      { borough: 'B', type: 'Flagship Park', minAcres: 100, page: 2, sort: 'smallest' })
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('Brooklyn')
    expect(screen.getByRole('combobox', { name: 'Park type' })).toHaveTextContent('Flagship Park')
    expect(screen.getByRole('combobox', { name: 'Minimum size' })).toHaveTextContent('100+ acres')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent('Smallest first')
  })

  it('restores a search from the URL on load', async () => {
    window.history.replaceState(null, '', '/?q=central&borough=M')
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(searchParks).toHaveBeenCalledWith(
      { text: 'central', borough: 'M', type: undefined, minAcres: undefined, page: 1 })
    expect(listParks).not.toHaveBeenCalled()
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('central')
  })

  it('keeps the list in the URL while a park is open', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockResolvedValue(CENTRAL)
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    choose('Borough', 'Manhattan')
    fireEvent.click(await screen.findByRole('button', { name: 'View details for Central Park' }))
    await screen.findByRole('heading', { name: 'Central Park', level: 2 })
    expect(window.location.search).toBe('?borough=M&park=M010')

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    await waitFor(() => expect(window.location.search).toBe('?borough=M'))
  })

  it('removes the list from the URL when the filters are cleared', async () => {
    window.history.replaceState(null, '', '/?q=central&min_acres=5')
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(listParks).mockResolvedValue(parkPage([PROSPECT]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await screen.findByRole('heading', { name: 'Prospect Park' })
    expect(window.location.search).toBe('')
  })
})

describe('App URL history and bad values', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  })

  function choose(filter, option) {
    fireEvent.click(screen.getByRole('combobox', { name: filter }))
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }))
  }

  it('undoes a filter change with Back and redoes it with Forward', async () => {
    vi.mocked(listParks).mockImplementation(async ({ borough }) => (
      borough === 'B' ? parkPage([PROSPECT]) : parkPage([CENTRAL, PROSPECT])))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    choose('Borough', 'Brooklyn')
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Central Park' })).not.toBeInTheDocument())

    act(() => window.history.back())
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('All boroughs')

    act(() => window.history.forward())
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Central Park' })).not.toBeInTheDocument())
    expect(window.location.search).toBe('?borough=B')
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('Brooklyn')
  })

  it('goes back to the previous page and search', async () => {
    vi.mocked(listParks).mockImplementation(async ({ page }) => parkPage([CENTRAL], page, 51))
    vi.mocked(searchParks).mockResolvedValue(parkPage([PROSPECT]))
    render(<App />)
    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    search('prospect')
    await screen.findByRole('heading', { name: 'Prospect Park' })

    act(() => window.history.back())
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search parks' })).toHaveValue('')
    expect(window.location.search).toBe('?page=2')
  })

  it('steps back from a park to the filtered list, then past the filter', async () => {
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockResolvedValue(CENTRAL)
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    choose('Borough', 'Manhattan')
    fireEvent.click(await screen.findByRole('button', { name: 'View details for Central Park' }))
    await screen.findByRole('heading', { name: 'Central Park', level: 2 })

    act(() => window.history.back())
    await screen.findByRole('heading', { name: 'Central Park', level: 3 })
    expect(window.location.search).toBe('?borough=M')
    expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('Manhattan')

    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Borough' })).toHaveTextContent('All boroughs'))
    expect(window.location.search).toBe('')
    expect(listParks).toHaveBeenLastCalledWith(expect.objectContaining({ borough: undefined }))
  })

  it('drops values the filters do not offer and cleans up the URL', async () => {
    window.history.replaceState(null, '', '/?borough=Z&type=Castle&min_acres=7&sort=oldest&page=-3&q=++central++')
    const entries = window.history.length
    vi.mocked(searchParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Central Park' })
    expect(searchParks).toHaveBeenCalledTimes(1)
    expect(searchParks).toHaveBeenCalledWith(
      { text: 'central', borough: undefined, type: undefined, minAcres: undefined, page: 1 })
    expect(window.location.search).toBe('?q=central')
    expect(window.history.length).toBe(entries)
  })

  it.each(['abc', '1.5', '0', '1e400'])('treats page=%s as the first page', async (page) => {
    window.history.replaceState(null, '', `/?page=${page}`)
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL], 1, 120))
    render(<App />)
    await screen.findByText('Page 1 of 3')
    expect(listParks).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    expect(window.location.search).toBe('')
  })

  it('loads the last page for a page past the end, without a history entry', async () => {
    window.history.replaceState(null, '', '/?borough=M&page=99')
    const entries = window.history.length
    vi.mocked(listParks).mockImplementation(async ({ page }) => parkPage(page === 3 ? [CENTRAL] : [], page, 120))
    render(<App />)
    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 99 }))
    expect(listParks).toHaveBeenLastCalledWith(expect.objectContaining({ borough: 'M', page: 3 }))
    expect(window.location.search).toBe('?borough=M&page=3')
    expect(window.history.length).toBe(entries)
  })

  it('says when a linked park does not exist and goes back to the linked list', async () => {
    window.history.replaceState(null, '', '/?borough=M&park=NOPE')
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    vi.mocked(getPark).mockRejectedValue(Object.assign(new Error('GET failed: 404'), { status: 404 }))
    render(<App />)
    expect(await screen.findByText('Park not found.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
    expect(await screen.findByRole('heading', { name: 'Central Park', level: 3 })).toBeVisible()
    expect(window.location.search).toBe('?borough=M')
    expect(listParks).toHaveBeenCalledWith(expect.objectContaining({ borough: 'M' }))
  })

  it('shows the list for an empty park value', async () => {
    window.history.replaceState(null, '', '/?park=')
    vi.mocked(listParks).mockResolvedValue(parkPage([CENTRAL]))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Central Park', level: 3 })).toBeVisible()
    expect(getPark).not.toHaveBeenCalled()
  })
})
