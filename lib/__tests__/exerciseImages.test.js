process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co'
const { buildImageIndex, findExerciseImage, normalizeExerciseName } = require('../exerciseImages')

const index = buildImageIndex([
  'developpe-couche.jpg',
  'Squat_Barre.png',
  'tractions pronation.webp',
  'Développé militaire.jpg',
])

describe('exerciseImages', () => {
  it('normalise accents, tirets et casse', () => {
    expect(normalizeExerciseName('Développé-Couché_V2')).toBe('developpe couche v2')
  })
  it('nom identique', () => {
    expect(findExerciseImage('Développé couché', index)).toMatch(/developpe-couche\.jpg$/)
  })
  it('fichier avec accents', () => {
    expect(findExerciseImage('developpe militaire', index)).toMatch(/militaire\.jpg$/)
  })
  it("l'un contient l'autre", () => {
    expect(findExerciseImage('Back squat barre', index)).toMatch(/Squat_Barre\.png$/)
  })
  it('mots en commun', () => {
    expect(findExerciseImage('Tractions supination pronation', index)).toMatch(/tractions/)
  })
  it('nom vide ou inconnu → null', () => {
    expect(findExerciseImage('', index)).toBeNull()
    expect(findExerciseImage('Rameur', index)).toBeNull()
  })
})
