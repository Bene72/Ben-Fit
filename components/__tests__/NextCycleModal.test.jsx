import { render, screen, fireEvent } from '@testing-library/react'
import NextCycleModal from '../coach/programme/NextCycleModal'

const workouts = [
  {
    exercises: [
      { target_weight: '100', reps: '5' },
      { target_weight: 'RPE 8', reps: '8-10' },
    ],
  },
  { exercises: [{ target_weight: '60 kg', reps: 'AMRAP' }] },
]

it('aperçu de la progression et confirmation', () => {
  const onConfirm = jest.fn()
  render(
    <NextCycleModal
      workouts={workouts}
      futureCount={2}
      preparing={false}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />
  )
  expect(screen.getByText(/2 exercices sur 3 seront ajustés/)).toBeTruthy()
  expect(screen.getByText(/contient déjà 2 séances/)).toBeTruthy()
  fireEvent.click(screen.getByText('+1 rep'))
  expect(screen.getByText(/2 exercices sur 3/)).toBeTruthy()
  fireEvent.click(screen.getByText('Identique'))
  expect(screen.getByText(/restent identiques/)).toBeTruthy()
  fireEvent.click(screen.getByText('Créer le cycle futur'))
  expect(onConfirm).toHaveBeenCalledWith('same')
})
