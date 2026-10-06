import { render, screen } from '@testing-library/react'
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
