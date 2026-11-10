import { render, screen, waitFor } from '@testing-library/react'

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/retentionData', () => ({
  loadGoals: jest.fn(async () => [
    {
      id: 'g1',
      name: 'Back squat 1RM',
      baseline_value: 90,
      current_value: 110,
      target_value: 120,
      unit: 'kg',
    },
  ]),
  loadAthleteInsights: jest.fn(async () => ({
    streak: 6,
    cycleReport: {
      cycle: { name: 'Force', start_date: '2026-10-05', end: '2026-11-08' },
      gains: [
        { exercise: 'Back squat', delta: 12.5 },
        { exercise: 'Deadlift', delta: 5 },
      ],
      adherence: 94,
      weightChange: -2.4,
    },
  })),
}))

import AthleteHighlights from '../athlete/AthleteHighlights'

it('affiche série, objectifs et bilan de cycle', async () => {
  render(<AthleteHighlights userId="u1" firstName="Léa" />)
  await waitFor(() => expect(screen.getByText('Back squat 1RM')).toBeTruthy())
  expect(screen.getByText('6 semaines complètes')).toBeTruthy()
  expect(screen.getByText('94 %')).toBeTruthy()
  expect(screen.getByText('+12,5 kg')).toBeTruthy()
  expect(screen.getByText('-2,4 kg')).toBeTruthy()
  expect(screen.getByText(/\+5 kg Deadlift/)).toBeTruthy()
  expect(screen.getByText('Partager mon bilan')).toBeTruthy()
})

it("n'affiche rien sans données", async () => {
  const rd = require('../../lib/retentionData')
  rd.loadGoals.mockResolvedValueOnce([])
  rd.loadAthleteInsights.mockResolvedValueOnce({ streak: 1, cycleReport: null })
  const { container } = render(<AthleteHighlights userId="u2" />)
  await waitFor(() => expect(rd.loadAthleteInsights).toHaveBeenCalled())
  expect(container.textContent).toBe('')
})
