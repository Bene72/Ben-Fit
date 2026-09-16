/**
 * lib/nutritionUtils.js
 * Fonctions pures et constantes partagées entre :
 *   - pages/nutrition.js          (vue client / coaché)
 *   - components/coach/NutritionTab.jsx  (vue coach)
 *
 * Aucune dépendance React ni Supabase.
 */

import { getWeekStart, getWeekLabelShort, DAYS_FR, getDayName } from './dateUtils'

export { getWeekStart, DAYS_FR, getDayName }

// ─── Dates ────────────────────────────────────────────────────────────────────

export function todayString() {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return '—'
  }
}

/** "DD MMM – DD MMM" à partir du lundi de semaine. */
export function getWeekLabel(weekStart) {
  return getWeekLabelShort(weekStart)
}

// ─── Calculs macros ───────────────────────────────────────────────────────────

/** Clamp 0-100, retourne le % d'un apport par rapport à un objectif. */
export function clampPercent(value, target) {
  if (!target) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(target || 1)) * 100)))
}

/** Calcule les totaux de macros d'une liste d'items aliments. */
export function sumItems(items = []) {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + (i.calories || 0),
      protein: a.protein + (i.protein || 0),
      carbs: a.carbs + (i.carbs || 0),
      fat: a.fat + (i.fat || 0),
      fiber: a.fiber + (i.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

// ─── Config macros (partagée entre les deux vues) ─────────────────────────────

/**
 * Tableau de définition des 4 macros.
 * Utilisé dans WeekTable, ProgressBar, NutritionRing, etc.
 */
export const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', target: 'target_calories', color: '#0D1B4E' },
  { key: 'protein', label: 'Protéines', unit: 'g', target: 'target_protein', color: '#C45C3A' },
  { key: 'carbs', label: 'Glucides', unit: 'g', target: 'target_carbs', color: '#2A50B0' },
  { key: 'fat', label: 'Lipides', unit: 'g', target: 'target_fat', color: '#3A7BD5' },
]

// DAYS_FR et getDayName sont importés de dateUtils.js (voir en tête de fichier)

// ─── Groupement par semaine ───────────────────────────────────────────────────

/**
 * Groupe une liste de logs par semaine (lundi).
 * Garantit que la semaine courante existe toujours dans le résultat.
 * @param {object[]} logs
 * @param {string}   today   YYYY-MM-DD
 * @returns {{ [weekStart: string]: object[] }}
 */
export function groupLogsByWeek(logs, today) {
  const weeks = { [getWeekStart(today)]: [] }
  logs.forEach((log) => {
    const wk = getWeekStart(log.date)
    if (!weeks[wk]) weeks[wk] = []
    weeks[wk].push(log)
  })
  return weeks
}

/**
 * Retourne les 7 jours (Lun→Dim) d'une semaine à partir de son lundi.
 * @param {string}   weekStart   YYYY-MM-DD
 * @param {string}   today       YYYY-MM-DD
 * @param {object[]} weekLogs
 */
export function buildWeekDays(weekStart, today, weekLogs) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    return {
      date: ds,
      log: weekLogs.find((l) => l.date === ds) || null,
      isToday: ds === today,
      isFuture: ds > today,
    }
  })
}
