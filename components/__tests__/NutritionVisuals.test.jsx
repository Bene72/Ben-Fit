import { render, screen } from '@testing-library/react'
import {
  NutritionRingsRow,
  NutritionScoreBlock,
  NutritionWeekGraph,
} from '../nutrition/NutritionVisuals'

const plan = { target_calories: 2000, target_protein: 150, target_carbs: 200, target_fat: 60 }
const log = { calories: 1800, protein: 140, carbs: 190, fat: 55 }

describe.each(['client', 'coach'])('NutritionVisuals (%s)', (variant) => {
  it('affiche le score et le feedback', () => {
    render(<NutritionScoreBlock log={log} plan={plan} variant={variant} />)
    expect(screen.getByText('Score nutrition')).toBeTruthy()
    expect(screen.getByText('Feedback')).toBeTruthy()
  })

  it('message sans plan adapté au variant', () => {
    render(<NutritionScoreBlock log={log} plan={null} variant={variant} />)
    expect(screen.getByText(/Aucun plan nutritionnel défini/)).toBeTruthy()
  })

  it('graphe 7 jours', () => {
    const { container } = render(
      <NutritionWeekGraph
        logs={[{ date: '2026-11-10', calories: 1800 }]}
        plan={plan}
        today="2026-11-10"
        variant={variant}
      />
    )
    expect(screen.getByText('1800')).toBeTruthy()
    expect(container.textContent).toMatch(/7 derniers jours/)
  })
})

it('NutritionRingsRow affiche les 4 anneaux', () => {
  render(<NutritionRingsRow log={log} plan={plan} />)
  expect(screen.getByText('Calories')).toBeTruthy()
  expect(screen.getByText('Lipides')).toBeTruthy()
})
