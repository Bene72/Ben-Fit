// Fuseau des utilisateurs réels : c'est là que le décalage UTC se voyait.
process.env.TZ = 'Europe/Paris'

const {
  toLocalISODate,
  parseLocalDate,
  addDaysISO,
  getMondayOfWeekString,
  getWeekStart,
  getDayName,
} = require('../dateUtils')
const { buildWeekDays } = require('../nutritionUtils')

describe('toLocalISODate', () => {
  it('garde la date locale juste après minuit (toISOString donnait la veille)', () => {
    expect(toLocalISODate(new Date(2026, 10, 11, 0, 30))).toBe('2026-11-11')
  })
  it("fonctionne aussi en heure d'été", () => {
    expect(toLocalISODate(new Date(2026, 6, 15, 1, 0))).toBe('2026-07-15')
  })
})

describe('getMondayOfWeekString', () => {
  it('renvoie le lundi (et non le dimanche) en semaine', () => {
    expect(getMondayOfWeekString(new Date(2026, 10, 10, 12))).toBe('2026-11-09')
  })
  it('un dimanche appartient à la semaine qui a commencé le lundi précédent', () => {
    expect(getMondayOfWeekString(new Date(2026, 10, 15, 20))).toBe('2026-11-09')
  })
  it('un lundi à 00:30 reste ce lundi', () => {
    expect(getMondayOfWeekString(new Date(2026, 10, 9, 0, 30))).toBe('2026-11-09')
  })
  it("fonctionne en heure d'été", () => {
    expect(getMondayOfWeekString(new Date(2026, 6, 15, 12))).toBe('2026-07-13')
  })
})

describe('getWeekStart', () => {
  it('accepte une date YYYY-MM-DD', () => {
    expect(getWeekStart('2026-11-15')).toBe('2026-11-09')
    expect(getWeekStart('2026-11-09')).toBe('2026-11-09')
  })
})

describe('addDaysISO / parseLocalDate / getDayName', () => {
  it('ajoute des jours sans décalage, y compris au changement d’heure', () => {
    expect(addDaysISO('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('parseLocalDate donne minuit local', () => {
    const d = parseLocalDate('2026-11-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 9, 0])
  })
  it('getDayName', () => {
    expect(getDayName('2026-11-09')).toBe('Lundi')
    expect(getDayName('2026-11-15')).toBe('Dimanche')
  })
})

describe('buildWeekDays', () => {
  it('produit Lun→Dim consécutifs à partir du lundi', () => {
    const days = buildWeekDays('2026-11-09', '2026-11-10', [])
    expect(days.map((d) => d.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
    expect(days[1].isToday).toBe(true)
  })
})
