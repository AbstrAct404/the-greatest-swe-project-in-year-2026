import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SortFilter from './SortFilter.jsx'

describe('SortFilter', () => {
  it('offers name, largest and smallest, defaulting to name', () => {
    render(<SortFilter value="" onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Sort by' })
    expect(trigger).toHaveTextContent('Name (A–Z)')
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Name (A–Z)', 'Largest first', 'Smallest first'])
  })

  it('reports the chosen order as the backend sort value', () => {
    const onChange = vi.fn()
    render(<SortFilter value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort by' }))
    fireEvent.click(screen.getByRole('option', { name: 'Largest first' }))
    expect(onChange).toHaveBeenCalledWith('largest')
  })

  it('shows the current order', () => {
    render(<SortFilter value="smallest" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent('Smallest first')
  })
})
