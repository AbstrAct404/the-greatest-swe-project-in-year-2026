import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import FilterDropdown from './FilterDropdown.jsx'

const options = [{ value: '', label: 'All' }, { value: 'M', label: 'Manhattan' }]

it('prevents opening and selecting while disabled, then supports selection again', () => {
  const onChange = vi.fn()
  const { rerender } = render(
    <FilterDropdown label="Test filter" options={options} value="" onChange={onChange} disabled />,
  )
  const trigger = screen.getByRole('combobox', { name: 'Test filter' })
  expect(trigger).toBeDisabled()
  fireEvent.click(trigger)
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  fireEvent.keyDown(trigger, { key: 'Enter' })
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(onChange).not.toHaveBeenCalled()

  rerender(<FilterDropdown label="Test filter" options={options} value="" onChange={onChange} />)
  expect(trigger).toBeEnabled()
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('option', { name: 'Manhattan' }))
  expect(onChange).toHaveBeenCalledWith('M')
})

it('hides an already-open list when the dropdown becomes disabled', () => {
  const props = { label: 'Test filter', options, value: '', onChange: vi.fn() }
  const { rerender } = render(<FilterDropdown {...props} />)
  fireEvent.click(screen.getByRole('combobox'))
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  rerender(<FilterDropdown {...props} disabled />)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
})
