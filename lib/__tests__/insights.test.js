process.env.TZ = 'Europe/Paris'

const {
  activityDates,
  plannedDays,
  missedInARow,
  weekStreak,
  bilanAverage,
  computeRisk,
  engagementStatus,
  progressSummary,
  summaryHeadline,
  cycleToReport,
  cycleUrgency,
} = require('../insights')

// Mardi 10 novembre 2026. Programme : lundi, mercredi, vendredi.
const TODAY = '2026-11-10'
const workouts = [{ day_of_week: 1 }, { day_of_week: 3 }, { day_of_week: 5 }]

describe('activité et séances manquées', () => {
  it('fusionne logs (timestamp) et séances (date)', () => {
    const s = activityDates(
      [{ logged_at: '2026-11-09T18:30:00+01:00' }],
      [{ date: '2026-11-06' }, { date: '2026-11-04', completed: false }]
    )
    expect([...s].sort()).toEqual(['2026-11-06', '2026-11-09'])
  })

  it('ignore les séances futures ou archivées', () => {
    expect([...plannedDays([...workouts, { day_of_week: 2, is_future: true }])].sort()).toEqual([
      1, 3, 5,
    ])
  })

  it("compte les séances manquées d'affilée depuis hier", () => {
    const planned = plannedDays(workouts)
    // actif mercredi 4/11 seulement → manqué ven 6 et lun 9
    expect(missedInARow(planned, new Set(['2026-11-04']), TODAY)).toBe(2)
    // actif lundi 9 → 0
    expect(missedInARow(planned, new Set(['2026-11-09']), TODAY)).toBe(0)
  })
})

describe('série de semaines complètes', () => {
  const planned = plannedDays(workouts)
  const week = (monday) => [
    monday,
    `${monday.slice(0, 8)}${String(+monday.slice(8) + 2).padStart(2, '0')}`,
    `${monday.slice(0, 8)}${String(+monday.slice(8) + 4).padStart(2, '0')}`,
  ]
  it('compte les semaines passées complètes (décalage de jour accepté)', () => {
    const act = new Set([...week('2026-11-02'), ...week('2026-10-26'), '2026-10-19', '2026-10-20'])
    expect(weekStreak(planned, act, TODAY)).toBe(2)
  })
  it('inclut la semaine en cours si déjà complète', () => {
    const act = new Set(['2026-11-09', '2026-11-10', '2026-11-11', ...week('2026-11-02')])
    expect(weekStreak(planned, act, '2026-11-11')).toBe(2)
  })
  it('0 sans programme', () => {
    expect(weekStreak(new Set(), new Set(['2026-11-02']), TODAY)).toBe(0)
  })
})

describe('computeRisk', () => {
  it('aucun risque pour un athlète régulier', () => {
    const r = computeRisk({
      workouts,
      logs: [{ logged_at: '2026-11-09T10:00:00Z' }],
      nutritionDates: ['2026-11-09'],
      bilans: [{ week_start: '2026-11-02', moral_score: 4 }],
      today: TODAY,
    })
    expect(r.level).toBeNull()
  })

  it('risque élevé avec plusieurs signaux', () => {
    const r = computeRisk({
      workouts,
      logs: [{ logged_at: '2026-11-04T10:00:00Z' }],
      nutritionDates: ['2026-11-03'],
      bilans: [
        { week_start: '2026-10-26', moral_score: 2, sommeil_score: 2 },
        { week_start: '2026-10-19', moral_score: 4, sommeil_score: 4 },
      ],
      today: TODAY,
    })
    expect(r.level).toBe('high')
    expect(r.reasons.map((x) => x.code).sort()).toEqual(['bilan', 'missed', 'mood', 'nutrition'])
  })

  it("ne signale pas la nutrition ni le bilan si l'athlète n'en tient pas", () => {
    const r = computeRisk({ workouts, logs: [{ logged_at: '2026-11-09T10:00:00Z' }], today: TODAY })
    expect(r.reasons).toEqual([])
  })

  it('un seul signal → à surveiller', () => {
    const r = computeRisk({
      workouts,
      logs: [{ logged_at: '2026-11-09T10:00:00Z' }],
      nutritionDates: ['2026-11-01'],
      today: TODAY,
    })
    expect(r.level).toBe('medium')
  })

  it('moyenne de bilan', () => {
    expect(bilanAverage({ moral_score: 4, sommeil_score: 3, autre: 'x' })).toBe(3.5)
    expect(bilanAverage({})).toBeNull()
  })
})

describe('engagementStatus', () => {
  it('sans date de fin : 12 semaines', () => {
    const s = engagementStatus('2026-09-08', TODAY)
    expect(s.week).toBe(10)
    expect(s.length).toBe(12)
    expect(s.endDate).toBe('2026-11-30')
    expect(s.daysLeft).toBe(20)
    expect(s.renewal).toBe(false)
  })
  it('renouvellement à 14 jours ou moins de la fin', () => {
    expect(engagementStatus('2026-09-08', TODAY, '2026-11-24').renewal).toBe(true)
    expect(engagementStatus('2026-10-20', TODAY).renewal).toBe(false)
  })
  it('engagement au mois', () => {
    const s = engagementStatus('2026-11-01', TODAY, '2026-11-30')
    expect(s.length).toBe(5)
    expect(s.week).toBe(2)
    expect(s.renewal).toBe(false)
  })
  it('terminé', () => {
    const s = engagementStatus('2026-08-01', TODAY, '2026-11-01')
    expect(s.ended).toBe(true)
    expect(s.renewal).toBe(true)
    expect(s.week).toBe(s.length)
  })
  it('sans date → null', () => {
    expect(engagementStatus(null, TODAY)).toBeNull()
  })
})

describe('progressSummary', () => {
  const logs = [
    { exercise_name: 'Back squat', weight_used: '90', logged_at: '2026-10-05T10:00:00Z' },
    { exercise_name: 'Back squat', weight_used: '95', logged_at: '2026-10-05T10:10:00Z' },
    { exercise_name: 'back squat', weight_used: '107,5', logged_at: '2026-11-02T10:00:00Z' },
    { exercise_name: 'Deadlift', weight_used: '120', logged_at: '2026-10-07T10:00:00Z' },
    { exercise_name: 'Deadlift', weight_used: '125', logged_at: '2026-10-30T10:00:00Z' },
    { exercise_name: 'Rameur', weight_used: '', logged_at: '2026-10-30T10:00:00Z' },
    { exercise_name: 'Hors période', weight_used: '50', logged_at: '2026-09-01T10:00:00Z' },
  ]
  const s = progressSummary({
    from: '2026-10-05',
    to: '2026-11-08',
    logs,
    workouts,
    measures: [
      { date: '2026-10-05', weight: 80 },
      { date: '2026-11-07', weight: 77.6 },
    ],
  })
  it('meilleurs gains', () => {
    expect(s.gains).toEqual([
      { exercise: 'Back squat', from: 95, to: 107.5, delta: 12.5 },
      { exercise: 'Deadlift', from: 120, to: 125, delta: 5 },
    ])
  })
  it('assiduité et poids', () => {
    expect(s.sessionsPlanned).toBe(15)
    expect(s.adherence).toBe(Math.round((4 / 15) * 100))
    expect(s.weightChange).toBe(-2.4)
  })
  it('phrase de résumé', () => {
    expect(summaryHeadline(s)).toBe(
      '+12,5 kg Back squat · 27 % de séances faites · -2,4 kg sur la balance'
    )
  })
})

describe('cycles', () => {
  it('choisit le cycle récemment terminé', () => {
    const c = cycleToReport(
      [
        { id: 1, start_date: '2026-10-05', duration_weeks: 5 },
        { id: 2, start_date: '2026-08-31', duration_weeks: 5 },
      ],
      TODAY
    )
    expect(c.id).toBe(1)
    expect(c.end).toBe('2026-11-08')
  })
  it("rien si le cycle en cours n'est pas presque fini", () => {
    expect(cycleToReport([{ start_date: '2026-11-02', duration_weeks: 5 }], TODAY)).toBeNull()
  })
  it('urgence', () => {
    expect(cycleUrgency(12)).toBe('J-14')
    expect(cycleUrgency(5)).toBe('J-7')
    expect(cycleUrgency(20)).toBeNull()
    expect(cycleUrgency(-1)).toBe('Terminé')
  })
})

describe('séances sans jour attribué', () => {
  const {
    weeklyTarget: wt,
    progressSummary: ps,
    weekStreak: ws,
    plannedDays: pd,
    activityDates: ad,
  } = require('../insights')
  const free = [
    { day_of_week: null },
    { day_of_week: null },
    { day_of_week: null, is_archived: null },
  ]
  it('cible = nombre de séances du programme', () => {
    expect(wt(free)).toBe(3)
    expect(wt([{ day_of_week: 1 }, { day_of_week: 1 }])).toBe(1)
  })
  it('assiduité calculée quand même', () => {
    const s = ps({
      from: '2026-10-13',
      to: '2026-11-09',
      workouts: free,
      logs: [{ logged_at: '2026-11-02T10:00:00Z' }, { logged_at: '2026-11-04T10:00:00Z' }],
    })
    expect(s.sessionsPlanned).toBe(12)
    expect(s.adherence).toBe(17)
  })
  it('série avec cible explicite', () => {
    const act = ad([], [{ date: '2026-11-02' }, { date: '2026-11-03' }, { date: '2026-11-05' }])
    expect(ws(pd(free), act, '2026-11-10', wt(free))).toBe(1)
  })
})
