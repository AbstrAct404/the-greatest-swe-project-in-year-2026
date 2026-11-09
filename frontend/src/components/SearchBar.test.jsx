import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchBar from './SearchBar.jsx'

describe('SearchBar', () => {
  it('searches for the trimmed text on submit', () => {
    const onSearch = vi.fn()
    render(<SearchBar text="  Central  " onTextChange={() => {}} onSearch={onSearch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenCalledWith('Central')
  })

  it('reports typed text without searching', () => {
    const onTextChange = vi.fn()
    const onSearch = vi.fn()
    render(<SearchBar text="" onTextChange={onTextChange} onSearch={onSearch} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search parks' }), {
      target: { value: 'Prospect' },
    })
    expect(onTextChange).toHaveBeenCalledWith('Prospect')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('shows Clear only when there is text', () => {
    const { rerender } = render(
      <SearchBar text="" onTextChange={() => {}} onSearch={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    rerender(<SearchBar text="Central" onTextChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('clears the text and the active search', () => {
    const onTextChange = vi.fn()
    const onSearch = vi.fn()
    render(<SearchBar text="Central" onTextChange={onTextChange} onSearch={onSearch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onTextChange).toHaveBeenCalledWith('')
    expect(onSearch).toHaveBeenCalledWith('')
  })

  it('limits input to the server maximum of 200 characters', () => {
    render(<SearchBar text="" onTextChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole('searchbox', { name: 'Search parks' }))
      .toHaveAttribute('maxLength', '200')
  })
})
