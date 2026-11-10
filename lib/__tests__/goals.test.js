import { goalProgress } from '../goals'

describe('goalProgress', () => {
  it('avec valeur de départ', () => {
    expect(goalProgress({ baseline_value: 90, current_value: 110, target_value: 120 })).toEqual({
      percent: 67,
      done: false,
    })
  })
  it('atteint', () => {
    expect(goalProgress({ baseline_value: 90, current_value: 121, target_value: 120 })).toEqual({
      percent: 100,
      done: true,
    })
  })
  it('temps (plus bas = mieux)', () => {
    expect(
      goalProgress({
        baseline_value: 1500,
        current_value: 1420,
        target_value: 1380,
        lower_is_better: true,
      }).percent
    ).toBe(67)
    expect(
      goalProgress({ current_value: 1370, target_value: 1380, lower_is_better: true }).done
    ).toBe(true)
  })
  it('sans départ', () => {
    expect(goalProgress({ current_value: 8, target_value: 10 }).percent).toBe(80)
  })
  it('valeurs manquantes', () => {
    expect(goalProgress({ target_value: 10 })).toEqual({ percent: 0, done: false })
  })
})
