import { render, screen, fireEvent } from '@testing-library/react'
import WeekBoard from '../coach/programme/WeekBoard'

const workouts = [
  {
    id: 'w1',
    name: 'Force A',
    day_of_week: 1,
    exercises: [{ id: 'e1', name: 'Squat', sets: 5, reps: '5' }],
  },
  { id: 'w2', name: 'Engine', day_of_week: 3, exercises: [] },
  { id: 'w3', name: 'Mobilité', day_of_week: null, exercises: [] },
]

function dt() {
  const data = {}
  return { setData: (k, v) => (data[k] = v), getData: (k) => data[k], types: [], effectAllowed: '' }
}

it('range les séances par jour, avec une colonne « Sans jour »', () => {
  render(
    <WeekBoard
      workouts={workouts}
      onOpen={() => {}}
      onMoveToDay={() => {}}
      onAddForDay={() => {}}
    />
  )
  expect(screen.getByText('Force A')).toBeTruthy()
  expect(screen.getByText('5×5 Squat')).toBeTruthy()
  expect(screen.getByText('Sans jour')).toBeTruthy()
  expect(screen.getAllByText('Repos').length).toBe(5)
})

it('ouvre une séance, ajoute un jour, déplace par glisser-déposer', () => {
  const onOpen = jest.fn()
  const onMoveToDay = jest.fn()
  const onAddForDay = jest.fn()
  render(
    <WeekBoard
      workouts={workouts}
      onOpen={onOpen}
      onMoveToDay={onMoveToDay}
      onAddForDay={onAddForDay}
    />
  )
  fireEvent.click(screen.getByText('Engine'))
  expect(onOpen).toHaveBeenCalledWith('w2')
  fireEvent.click(screen.getByLabelText('Nouvelle séance Ven'))
  expect(onAddForDay).toHaveBeenCalledWith(5)
  const transfer = dt()
  fireEvent.dragStart(screen.getByText('Force A'), { dataTransfer: transfer })
  const fridayColumn = screen.getByLabelText('Nouvelle séance Ven').closest('div').parentElement
  fireEvent.dragOver(fridayColumn, { dataTransfer: transfer })
  fireEvent.drop(fridayColumn, { dataTransfer: transfer })
  expect(onMoveToDay).toHaveBeenCalledWith('w1', 5)
})
