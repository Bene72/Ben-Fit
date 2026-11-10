/**
 * lib/goals.js — progression d'un objectif (barre de progression).
 *
 * Avec une valeur de départ : % du chemin parcouru entre départ et cible
 * (ex : squat 90 → 120, actuel 110 → 67 %). Sans valeur de départ : actuel /
 * cible. `lower_is_better` gère les temps (5 km : 25:00 → 23:00).
 */
const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function goalProgress(goal) {
  const target = num(goal?.target_value)
  const current = num(goal?.current_value)
  const base = num(goal?.baseline_value)
  if (target === null || current === null) return { percent: 0, done: false }
  const lower = !!goal.lower_is_better
  const done = lower ? current <= target : current >= target
  let ratio
  if (base !== null && base !== target) ratio = (current - base) / (target - base)
  else if (lower) ratio = current > 0 ? target / current : 0
  else ratio = target > 0 ? current / target : 0
  const percent = done ? 100 : Math.max(0, Math.min(99, Math.round(ratio * 100)))
  return { percent, done }
}
