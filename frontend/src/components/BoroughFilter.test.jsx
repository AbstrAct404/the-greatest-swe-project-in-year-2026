import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BoroughFilter from './BoroughFilter.jsx'
import TypeFilter from './TypeFilter.jsx'

describe('BoroughFilter', () => {
  it('shows the selected name and reports borough codes', () => {
    const onChange = vi.fn()
    render(<BoroughFilter value="M" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Borough' })
    expect(trigger).toHaveTextContent('Manhattan')
    fireEvent.click(trigger)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All boroughs', 'Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island',
    ])
    expect(screen.getByRole('option', { name: 'Manhattan' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'Brooklyn' }))
    expect(onChange).toHaveBeenCalledWith('B')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports keyboard selection and returning to all boroughs', () => {
    const onChange = vi.fn()
    render(<BoroughFilter value="M" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Borough' })
    fireEvent.keyDown(trigger, { key: 'q' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('Q')
    fireEvent.keyDown(trigger, { key: 'Home' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('keeps menu IDs separate and dismisses when another filter is clicked', () => {
    render(<>
      <BoroughFilter value="" onChange={() => {}} />
      <TypeFilter value="" onChange={() => {}} />
    </>)
    const borough = screen.getByRole('combobox', { name: 'Borough' })
    const type = screen.getByRole('combobox', { name: 'Park type' })
    fireEvent.click(borough)
    const boroughMenuId = borough.getAttribute('aria-controls')
    fireEvent.pointerDown(type)
    fireEvent.click(type)
    expect(borough).toHaveAttribute('aria-expanded', 'false')
    expect(type).toHaveAttribute('aria-expanded', 'true')
    expect(type.getAttribute('aria-controls')).not.toBe(boroughMenuId)
    expect(screen.getAllByRole('listbox')).toHaveLength(1)
  })
})
