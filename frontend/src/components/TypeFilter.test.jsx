import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PARK_TYPES } from '../parkTypes.js'
import TypeFilter from './TypeFilter.jsx'

describe('TypeFilter', () => {
  it('offers every park type after an all-types option', () => {
    render(<TypeFilter value="" onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Park type' })
    expect(trigger).toHaveTextContent('All types')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['All types', ...PARK_TYPES])
  })

  it('reports the chosen type', () => {
    const onChange = vi.fn()
    render(<TypeFilter value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Park type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Playground', exact: true }))
    expect(onChange).toHaveBeenCalledWith('Playground')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard selection and cancellation', () => {
    const onChange = vi.fn()
    render(<TypeFilter value="Garden" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Park type' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('Historic House Park')
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('supports typing a type name and clearing the selection', () => {
    const onChange = vi.fn()
    render(<TypeFilter value="Garden" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Park type' })
    fireEvent.keyDown(trigger, { key: 'w' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('Waterfront Facility')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'All types' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('dismisses on outside clicks and when tabbing away', () => {
    render(<TypeFilter value="" onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Park type' })
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Tab' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
