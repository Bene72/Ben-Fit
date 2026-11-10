import {
  progressWeight,
  progressReps,
  applyProgression,
  countProgressed,
} from '../programme/progression'

describe('progressWeight', () => {
  it('+2,5 kg', () => {
    expect(progressWeight('100', 'kg2.5')).toBe('102.5')
    expect(progressWeight('100 kg', 'kg2.5')).toBe('102.5 kg')
    expect(progressWeight('82,5', 'kg2.5')).toBe('85')
    expect(progressWeight('62,5kg', 'kg2.5')).toBe('65 kg')
  })
  it('+5 % arrondi au 0,5', () => {
    expect(progressWeight('100', 'pct5')).toBe('105')
    expect(progressWeight('62', 'pct5')).toBe('65')
    expect(progressWeight('47.5', 'pct5')).toBe('50')
  })
  it('ne touche pas aux valeurs non chiffrées', () => {
    for (const v of ['70%', 'RPE 8', 'PDC', '2x24kg', '', null])
      expect(progressWeight(v, 'kg2.5')).toBe(v)
  })
})

describe('progressReps', () => {
  it('+1 rep', () => {
    expect(progressReps('5', 'rep1')).toBe('6')
    expect(progressReps('8-10', 'rep1')).toBe('9-11')
    expect(progressReps('12–15', 'rep1')).toBe('13–16')
    expect(progressReps('AMRAP', 'rep1')).toBe('AMRAP')
    expect(progressReps('5', 'kg2.5')).toBe('5')
  })
})

it('applyProgression et comptage', () => {
  const w = [
    {
      exercises: [
        { target_weight: '100', reps: '5' },
        { target_weight: 'RPE 8', reps: 'AMRAP' },
      ],
    },
  ]
  expect(applyProgression(w[0].exercises[0], 'kg2.5')).toEqual({
    target_weight: '102.5',
    reps: '5',
  })
  expect(countProgressed(w, 'kg2.5')).toBe(1)
  expect(countProgressed(w, 'rep1')).toBe(1)
  expect(countProgressed(w, 'same')).toBe(0)
})
