import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SizeFilter from './SizeFilter.jsx'

describe('SizeFilter', () => {
  it('offers minimum sizes after an any-size option', () => {
    render(<SizeFilter value="" onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Minimum size' })
    expect(trigger).toHaveTextContent('Any size')
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Any size', '1+ acres', '5+ acres', '10+ acres', '50+ acres', '100+ acres'])
  })

  it('reports the chosen size as the backend min_acres value', () => {
    const onChange = vi.fn()
    render(<SizeFilter value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Minimum size' }))
    fireEvent.click(screen.getByRole('option', { name: '10+ acres' }))
    expect(onChange).toHaveBeenCalledWith('10')
  })

  it('shows the current size', () => {
    render(<SizeFilter value="50" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Minimum size' })).toHaveTextContent('50+ acres')
  })
})
