import { buildProgrammeHtml } from '../programme/exportPdf'

const workouts = [
  {
    name: 'Force <b>A</b>',
    day_of_week: 2,
    duration_min: 75,
    exercises: [
      {
        name: 'Squat',
        sets: 5,
        reps: 5,
        rest: '2 min',
        target_weight: '100 kg',
        note: 'Tempo 3-1-1',
        image_url: 'u1',
      },
      { name: '<img src=x onerror=alert(1)>', sets: 3, reps: 10 },
    ],
  },
]

describe('buildProgrammeHtml', () => {
  const html = buildProgrammeHtml({
    workouts,
    clientName: '<script>alert(1)</script>',
    isFuture: true,
    imgCache: { u1: 'data:image/png;base64,AAAA' },
  })
  it('échappe tout le texte injecté', () => {
    expect(html).not.toMatch(/<script>alert/)
    expect(html).not.toMatch(/<img src=x/)
    expect(html).toMatch(/&lt;script&gt;/)
    expect(html).toMatch(/Force &lt;b&gt;A&lt;\/b&gt;/)
  })
  it('contient le programme', () => {
    expect(html).toMatch(/Cycle futur/)
    expect(html).toMatch(/Mardi · 75 min/)
    expect(html).toMatch(/5 × 5/)
    expect(html).toMatch(/data:image\/png;base64,AAAA/)
    expect(html).toMatch(/1 séance</)
  })
  it("n'utilise plus de variables CSS (absentes de la fenêtre d'impression)", () => {
    expect(html).not.toMatch(/var\(--/)
  })
})
