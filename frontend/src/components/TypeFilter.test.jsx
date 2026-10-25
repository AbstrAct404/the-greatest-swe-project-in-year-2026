import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PARK_TYPES } from '../parkTypes.js'
import TypeFilter from './TypeFilter.jsx'

describe('TypeFilter', () => {
  it('offers every park type after an all-types option', () => {
    render(<TypeFilter value="" onChange={() => {}} />)
    const options = screen.getAllByRole('option').map((option) => option.value)
    expect(options).toEqual(['', ...PARK_TYPES])
    expect(screen.getByRole('combobox', { name: 'Park type' })).toHaveValue('')
  })

  it('reports the chosen type', () => {
    const onChange = vi.fn()
    render(<TypeFilter value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Park type' }), {
      target: { value: 'Playground' },
    })
    expect(onChange).toHaveBeenCalledWith('Playground')
  })
})
