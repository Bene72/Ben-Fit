/**
 * lib/dateUtils.js
 * Source unique de vérité pour la logique de dates partagée entre
 * lib/trainingUtils.js, lib/nutritionUtils.js et lib/coachShared.js.
 *
 * REFACTORING 10/07/2026 : avant ce fichier, le calcul "quel est le lundi
 * de cette semaine ?" était dupliqué au caractère près à deux endroits
 * (trainingUtils.getMondayOf / coachShared.getMondayOfWeek), et le libellé
 * de semaine existait en deux formats différents sans base commune
 * (nutritionUtils.getWeekLabel vs coachShared.getWeekLabel) — un bugfix sur
 * l'un des deux risquait de ne jamais être répercuté sur l'autre. Centralisé
 * ici ; trainingUtils/nutritionUtils/coachShared ré-exportent ces fonctions
 * pour ne rien casser côté imports existants.
 *
 * Aucune dépendance React ni Supabase — 100% testable unitairement.
 */

export const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const DAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
export const DAY_LABELS_FULL = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

/** Retourne le lundi de la semaine contenant `date`, comme objet Date (heure remise à 00:00). */
export function getMondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

/** Idem, mais retourne une chaîne YYYY-MM-DD (pratique pour les requêtes Supabase). */
export function getMondayOfWeekString(date = new Date()) {
  return getMondayOf(date).toISOString().split('T')[0]
}

/** Nom du jour en français à partir d'un objet Date ou d'une dateStr. */
export function getDayName(dateOrStr) {
  const d = new Date(dateOrStr)
  const jsDay = d.getDay() // 0 = Dimanche
  return DAYS_FR[jsDay === 0 ? 6 : jsDay - 1]
}

/** "3 juil – 9 juil" — format compact, utilisé côté vue client (espace limité). */
export function getWeekLabelShort(weekStart) {
  const s = new Date(weekStart)
  const e = new Date(weekStart)
  e.setDate(e.getDate() + 6)
  return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

/** "Semaine du 3 juillet au 9 juillet" — format long, utilisé côté vue coach. */
export function getWeekLabelLong(weekStart) {
  const s = new Date(weekStart)
  const e = new Date(weekStart)
  e.setDate(e.getDate() + 6)
  return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

/** Retourne le lundi de la semaine contenant `dateStr` (YYYY-MM-DD), en YYYY-MM-DD. */
export function getWeekStart(dateStr) {
  return getMondayOfWeekString(new Date(dateStr))
}
