/**
 * lib/programme/progression.js — progression automatique d'un cycle au suivant.
 *
 * Modes :
 *   'same'  : identique
 *   'kg2.5' : +2,5 kg sur les charges cibles chiffrées
 *   'pct5'  : +5 % sur les charges cibles chiffrées (arrondi au 0,5 kg)
 *   'rep1'  : +1 répétition (« 5 » → « 6 », « 8-10 » → « 9-11 »)
 *
 * Une valeur qui n'est pas un simple nombre (« 70% », « RPE 8 », « PDC »,
 * « AMRAP ») n'est jamais modifiée : le coach l'ajuste à la main.
 */
export const PROGRESSIONS = [
  { id: 'same', label: 'Identique', hint: 'Copie sans changement' },
  { id: 'kg2.5', label: '+2,5 kg', hint: 'Sur chaque charge cible chiffrée' },
  { id: 'pct5', label: '+5 %', hint: 'Arrondi au 0,5 kg' },
  { id: 'rep1', label: '+1 rep', hint: '« 5 » → « 6 », « 8-10 » → « 9-11 »' },
]

const WEIGHT_RE = /^\s*(\d+(?:[.,]\d+)?)\s*(kg)?\s*$/i
const REPS_RE = /^\s*(\d+)\s*$/
const RANGE_RE = /^\s*(\d+)\s*([-–])\s*(\d+)\s*$/

function formatNumber(n, useComma) {
  const rounded = Math.round(n * 10) / 10
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return useComma ? str.replace('.', ',') : str
}

export function progressWeight(value, mode) {
  if (value === null || value === undefined || value === '') return value
  const m = String(value).match(WEIGHT_RE)
  if (!m) return value
  const n = parseFloat(m[1].replace(',', '.'))
  let next = n
  if (mode === 'kg2.5') next = n + 2.5
  else if (mode === 'pct5') next = Math.round((n * 1.05) / 0.5) * 0.5
  else return value
  const out = formatNumber(next, m[1].includes(','))
  return m[2] ? `${out} ${m[2]}` : out
}

export function progressReps(value, mode) {
  if (mode !== 'rep1' || value === null || value === undefined || value === '') return value
  const s = String(value)
  const single = s.match(REPS_RE)
  if (single) return String(Number(single[1]) + 1)
  const range = s.match(RANGE_RE)
  if (range) return `${Number(range[1]) + 1}${range[2]}${Number(range[3]) + 1}`
  return value
}

/** Applique la progression à une ligne d'exercice (renvoie une copie). */
export function applyProgression(exercise, mode) {
  if (!mode || mode === 'same') return { ...exercise }
  return {
    ...exercise,
    target_weight: progressWeight(exercise.target_weight, mode),
    reps: progressReps(exercise.reps, mode),
  }
}

/** Nombre d'exercices réellement modifiés (pour l'aperçu). */
export function countProgressed(workouts, mode) {
  if (!mode || mode === 'same') return 0
  let n = 0
  for (const w of workouts || [])
    for (const ex of w.exercises || []) {
      const p = applyProgression(ex, mode)
      if (p.target_weight !== ex.target_weight || p.reps !== ex.reps) n++
    }
  return n
}
