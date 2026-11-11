import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const updates = []
jest.mock('../../lib/supabase', () => {
  const q = {
    update: (payload) => (updates.push(payload), q),
    eq: () => q,
    select: () => q,
    single: async () => ({ data: updates[updates.length - 1], error: null }),
  }
  return { supabase: { from: () => q } }
})

import EngagementDates, { addOneMonth } from '../coach/EngagementDates'

const btn = () => ({})

describe('addOneMonth', () => {
  it('fin de mois → même jour le mois suivant', () => {
    expect(addOneMonth('2026-11-30')).toBe('2026-12-30')
    expect(addOneMonth('2026-12-15')).toBe('2027-01-15')
    expect(addOneMonth('2027-01-31')).toBe('2027-02-28')
  })
})

it('prolonge de 1 mois à partir de la fin actuelle', async () => {
  window.confirm = jest.fn(() => true)
  const onUpdate = jest.fn()
  render(
    <EngagementDates
      client={{ id: 'c1', engagement_start: '2026-11-01', engagement_end: '2026-11-30' }}
      onUpdate={onUpdate}
      btn={btn}
      editRequest={0}
    />
  )
  fireEvent.click(screen.getByText('⏩ Prolonger'))
  fireEvent.click(screen.getByText('+1 mois'))
  await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  expect(updates.at(-1)).toEqual({ engagement_start: '2026-11-01', engagement_end: '2026-12-30' })
})

it('modifie les deux dates et refuse une fin avant le début', async () => {
  const onUpdate = jest.fn()
  render(
    <EngagementDates
      client={{ id: 'c1', engagement_start: '2026-09-01', engagement_end: '2026-11-23' }}
      onUpdate={onUpdate}
      btn={btn}
      editRequest={0}
    />
  )
  fireEvent.click(screen.getByTitle('Modifier les dates'))
  const [startInput, endInput] = document.querySelectorAll('input[type="date"]')
  fireEvent.change(endInput, { target: { value: '2026-08-01' } })
  fireEvent.click(screen.getByText('OK'))
  expect(screen.getByText(/doit être après/)).toBeTruthy()
  fireEvent.change(startInput, { target: { value: '2026-10-01' } })
  fireEvent.change(endInput, { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByText('OK'))
  await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  expect(updates.at(-1)).toEqual({ engagement_start: '2026-10-01', engagement_end: '2026-12-31' })
})
