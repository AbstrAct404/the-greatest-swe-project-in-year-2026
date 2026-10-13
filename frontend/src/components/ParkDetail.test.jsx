import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { getPark } from '../api.js'
import ParkDetail from './ParkDetail.jsx'

vi.mock('../api.js', () => ({ getPark: vi.fn() }))

beforeEach(() => {
  vi.mocked(getPark).mockReset()
})

it('shows the full details of a park', async () => {
  vi.mocked(getPark).mockResolvedValue({
    _id: 'M010', name: 'Central Park', type: 'Flagship Park', borough: 'M',
    acres: 840.01, address: '1000 5 AVENUE', zipcode: '10023, 10024, 10025',
    waterfront: false,
  })
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  expect(screen.getByText('Loading park…')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Central Park' })).toBeInTheDocument()
  expect(screen.getByText('Manhattan')).toBeInTheDocument()
  expect(screen.getByText('840.01 acres')).toBeInTheDocument()
  expect(screen.getByText('1000 5 AVENUE')).toBeInTheDocument()
  expect(screen.getByText('10023, 10024, 10025')).toBeInTheDocument()
  expect(screen.getByText('No')).toBeInTheDocument()
  expect(getPark).toHaveBeenCalledWith('M010')
})

it('fills in missing address details', async () => {
  vi.mocked(getPark).mockResolvedValue({
    _id: 'R015', name: 'Walker Park', type: 'Recreational Field/Courts',
    borough: 'R', acres: 5.278, waterfront: true,
  })
  render(<ParkDetail parkId="R015" onBack={() => {}} />)
  await screen.findByRole('heading', { name: 'Walker Park' })
  expect(screen.getAllByText('Not listed')).toHaveLength(2)
  expect(screen.getByText('Yes')).toBeInTheDocument()
})

it('says when the park does not exist', async () => {
  vi.mocked(getPark).mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }))
  render(<ParkDetail parkId="NOPE" onBack={() => {}} />)
  expect(await screen.findByText('Park not found.')).toBeInTheDocument()
})

it('shows an error when the park cannot be loaded', async () => {
  vi.mocked(getPark).mockRejectedValue(new TypeError('Failed to fetch'))
  render(<ParkDetail parkId="M010" onBack={() => {}} />)
  expect(await screen.findByText('Unable to load this park. Please try again later.')).toBeInTheDocument()
})

it('calls onBack from the back button', async () => {
  vi.mocked(getPark).mockReturnValue(new Promise(() => {}))
  const onBack = vi.fn()
  render(<ParkDetail parkId="M010" onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: '← Back to parks' }))
  expect(onBack).toHaveBeenCalled()
})
