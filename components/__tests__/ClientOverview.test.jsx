import { render, screen, waitFor, fireEvent } from '@testing-library/react'

jest.mock('../../lib/supabase', () => {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    limit: () => q,
    update: () => q,
    single: async () => ({ data: { engagement_start: '2026-11-10' }, error: null }),
    then: (r) => Promise.resolve({ data: [], error: null }).then(r),
  }
  return { supabase: { from: () => q } }
})
jest.mock('../../lib/retentionData', () => ({
  loadGoals: jest.fn(async () => []),
  loadClientOverview: jest.fn(async () => ({
    weekDone: 3,
    weekPlanned: 4,
    adherence: 91,
    sessionsDone: 29,
    sessionsPlanned: 32,
    lastBilan: { weekStart: '2026-11-02', average: 4.2, trend: 0.5 },
    nextCycleEnd: { days_remaining: 6, end_date: '2026-11-16' },
  })),
}))

import OverviewTab from '../coach/OverviewTab'
import ClientHeader from '../coach/ClientHeader'

const client = {
  id: 'c1',
  full_name: 'Léa Martin',
  email: 'lea@example.com',
  offer: 'essentia_plus',
  current_cycle_name: 'Cycle Force',
  engagement_start: '2026-08-25',
  coach_note: 'Genou droit sensible',
  current_program: 'Force hiver',
  session_target: '5x5',
  coach_notes: [{ id: 1, text: 'Envoyer la vidéo', color: 'yellow', createdAt: '2026-11-08' }],
}

it('fiche client : chiffres clés, note coach, post-it', async () => {
  render(
    <OverviewTab
      client={client}
      measures={[
        { id: 'm1', date: '2026-09-01', weight: 65 },
        { id: 'm2', date: '2026-11-08', weight: 61.8 },
      ]}
      onMeasuresChange={() => {}}
      onUpdate={() => {}}
    />
  )
  await waitFor(() => expect(screen.getByText('91 %')).toBeTruthy())
  expect(screen.getByText('29 séances sur 32')).toBeTruthy()
  expect(screen.getByText('61,8 kg')).toBeTruthy()
  expect(screen.getByText('-3,2 kg depuis le début')).toBeTruthy()
  expect(screen.getByText('Genou droit sensible')).toBeTruthy()
  expect(screen.getByText(/J-7 · 16 nov/)).toBeTruthy()
  expect(screen.getByText('Envoyer la vidéo')).toBeTruthy()
  fireEvent.click(screen.getByText('Modifier'))
  expect(screen.getByDisplayValue('Force hiver')).toBeTruthy()
})

it("en-tête : offre, cycle, frise d'engagement, boutons", () => {
  const onMessage = jest.fn()
  render(
    <ClientHeader client={client} onBack={() => {}} onMessage={onMessage} onUpdate={() => {}} />
  )
  expect(screen.getByText('Léa Martin')).toBeTruthy()
  expect(screen.getByText(/Essentia Plus · 77 €\/mois/)).toBeTruthy()
  expect(screen.getByText('Cycle Force')).toBeTruthy()
  expect(screen.getByLabelText(/Semaine \d+ sur 12|Engagement non renseigné/)).toBeTruthy()
  fireEvent.click(screen.getByText('💬 Message'))
  expect(onMessage).toHaveBeenCalled()
  expect(screen.getByText('🔁 Renouvelé')).toBeTruthy()
})
