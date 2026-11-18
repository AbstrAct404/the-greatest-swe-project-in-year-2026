import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatRadius } from '../radius.js'
import RadiusFilter from './RadiusFilter.jsx'

describe('formatRadius', () => {
  it('uses meters under a kilometer and km from there', () => {
    expect(formatRadius(500)).toBe('500 m')
    expect(formatRadius(1000)).toBe('1 km')
    expect(formatRadius(2500)).toBe('2.5 km')
  })
})

describe('RadiusFilter', () => {
  it('offers walking-distance radii', () => {
    render(<RadiusFilter value={1000} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Within' })
    expect(trigger).toHaveTextContent('1 km')
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['500 m', '1 km', '2 km', '5 km'])
  })

  it('reports the chosen radius in meters', () => {
    const onChange = vi.fn()
    render(<RadiusFilter value={1000} onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Within' }))
    fireEvent.click(screen.getByRole('option', { name: '5 km' }))
    expect(onChange).toHaveBeenCalledWith(5000)
  })
})
