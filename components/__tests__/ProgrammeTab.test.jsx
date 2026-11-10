// Test de non-régression du découpage de ProgrammeTab (10/11/2026) :
// l'onglet s'affiche, les séances et exercices apparaissent, et les
// sous-composants extraits (barre d'outils, carte séance…) fonctionnent.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const tables = {
  workouts: [
    {
      id: 'w1',
      name: 'Force A',
      type: 'Push',
      day_of_week: 1,
      duration_min: 60,
      order_index: 1,
      is_future: false,
      is_archived: false,
    },
    {
      id: 'w2',
      name: 'Cardio B',
      type: 'Cardio',
      day_of_week: 3,
      duration_min: 45,
      order_index: 2,
      is_future: false,
      is_archived: false,
    },
  ],
  exercises: [
    {
      id: 'e1',
      workout_id: 'w1',
      name: 'Back squat',
      sets: 5,
      reps: '5',
      order_index: 0,
      group_type: 'Normal',
    },
    {
      id: 'e2',
      workout_id: 'w1',
      name: 'Développé couché',
      sets: 4,
      reps: '8',
      order_index: 1,
      group_type: 'Normal',
    },
  ],
  workout_logs: [],
}

function query(table) {
  const state = { filters: [] }
  const q = {
    select: () => q,
    eq: (col, val) => (state.filters.push([col, val]), q),
    in: (col, vals) => (state.filters.push([col, vals]), q),
    order: () => q,
    limit: () => q,
    gte: () => q,
    then: (resolve) => {
      let rows = tables[table] || []
      for (const [col, val] of state.filters) {
        rows = rows.filter((r) =>
          Array.isArray(val) ? val.includes(r[col]) : col in r ? r[col] === val : true
        )
      }
      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return q
}

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (t) => query(t),
    storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) },
  },
}))

import ProgrammeTab from '../coach/ProgrammeTab'

it('affiche le programme et ouvre une séance', async () => {
  render(<ProgrammeTab clientId="c1" clientName="Léa" coachId="coach" />)
  await waitFor(() => expect(screen.getByText('Force A')).toBeTruthy())
  expect(screen.getByText('Cardio B')).toBeTruthy()
  fireEvent.click(screen.getByText('Force A'))
  await waitFor(() => {
    const inInputs = screen.queryAllByDisplayValue('Back squat').length
    const inText = screen.queryAllByText('Back squat').length
    expect(inInputs + inText).toBeGreaterThan(0)
  })
})

it('ouvre le formulaire de nouvelle séance depuis la barre d’outils', async () => {
  render(<ProgrammeTab clientId="c1" clientName="Léa" coachId="coach" />)
  await waitFor(() => expect(screen.getByText('Force A')).toBeTruthy())
  const addBtn = screen
    .getAllByRole('button')
    .find((b) => /séance/i.test(b.textContent) && /\+/.test(b.textContent))
  fireEvent.click(addBtn)
  await waitFor(() => expect(document.body.textContent).toMatch(/Nom|Jour/))
})
