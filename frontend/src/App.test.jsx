import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
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
