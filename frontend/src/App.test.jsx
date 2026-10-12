import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listParks } from './api.js'
import App from './App.jsx'

vi.mock('./api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, listParks: vi.fn() }
})

beforeEach(() => {
  vi.mocked(listParks).mockReset()
  vi.mocked(listParks).mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('requests a borough and allows returning to all boroughs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockResolvedValueOnce([{
      _id: 'B073', name: 'Prospect Park', borough: 'B',
      type: 'Flagship Park', acres: 526,
    }]).mockResolvedValueOnce([{
      _id: 'M010', name: 'Central Park', borough: 'M',
      type: 'Flagship Park', acres: 840.01,
    }]).mockResolvedValueOnce([])
    render(<App />)
    await screen.findByRole('heading', { name: 'Prospect Park' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(listParks).toHaveBeenLastCalledWith({ borough: 'M' })
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: '' },
    })
    await screen.findByText('No parks available yet.')
    expect(listParks).toHaveBeenLastCalledWith({ borough: undefined })
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

  it('ignores a slow response for the previous selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    let resolvePrevious
    vi.mocked(listParks).mockReturnValueOnce(new Promise((resolve) => {
      resolvePrevious = resolve
    })).mockResolvedValueOnce([{
      _id: 'M010', name: 'Central Park', borough: 'M',
      type: 'Flagship Park', acres: 840.01,
    }])
    render(<App />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Borough' }), {
      target: { value: 'M' },
    })
    await screen.findByRole('heading', { name: 'Central Park' })
    await act(async () => resolvePrevious([{
      _id: 'B073', name: 'Prospect Park', borough: 'B',
      type: 'Flagship Park', acres: 526,
    }]))
    expect(screen.getByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Prospect Park' })).not.toBeInTheDocument()
  })

  it('can recover from a failed borough request with a new selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.mocked(listParks).mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce([])
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
    vi.mocked(listParks).mockResolvedValue([{
      _id: 'example', name: 'Example Park', borough: 'Manhattan',
      type: 'Neighborhood Park', acres: 1.5,
    }])
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
