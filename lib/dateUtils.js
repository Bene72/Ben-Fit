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

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Date LOCALE au format YYYY-MM-DD.
 *
 * ⚠️ Ne pas utiliser `date.toISOString().split('T')[0]` pour une date du
 * calendrier : toISOString() convertit en UTC, donc en France (UTC+1/+2) une
 * date à minuit local devient la veille (ex: lundi 00:00 → "dimanche").
 * C'est ce qui faisait commencer les semaines un dimanche (fix 10/11/2026).
 */
export function toLocalISODate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Convertit "YYYY-MM-DD" en Date à minuit LOCAL (new Date('YYYY-MM-DD') donne
 * minuit UTC, ce qui décale d'un jour selon le fuseau). Accepte aussi une Date.
 */
export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

/** Ajoute `n` jours (négatif possible) à une date "YYYY-MM-DD", sans souci de fuseau ni d'heure d'été. */
export function addDaysISO(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Retourne le lundi de la semaine contenant `date`, comme objet Date (heure remise à 00:00). */
export function getMondayOf(date = new Date()) {
  const d = parseLocalDate(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

/** Idem, mais retourne une chaîne YYYY-MM-DD (pratique pour les requêtes Supabase). */
export function getMondayOfWeekString(date = new Date()) {
  return toLocalISODate(getMondayOf(date))
}

/** Nom du jour en français à partir d'un objet Date ou d'une dateStr. */
export function getDayName(dateOrStr) {
  const d = parseLocalDate(dateOrStr)
  const jsDay = d.getDay() // 0 = Dimanche
  return DAYS_FR[jsDay === 0 ? 6 : jsDay - 1]
}

/** "3 juil – 9 juil" — format compact, utilisé côté vue client (espace limité). */
export function getWeekLabelShort(weekStart) {
  const s = parseLocalDate(weekStart)
  const e = parseLocalDate(weekStart)
  e.setDate(e.getDate() + 6)
  return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

/** "Semaine du 3 juillet au 9 juillet" — format long, utilisé côté vue coach. */
export function getWeekLabelLong(weekStart) {
  const s = parseLocalDate(weekStart)
  const e = parseLocalDate(weekStart)
  e.setDate(e.getDate() + 6)
  return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

/** Retourne le lundi de la semaine contenant `dateStr` (YYYY-MM-DD), en YYYY-MM-DD. */
export function getWeekStart(dateStr) {
  return getMondayOfWeekString(parseLocalDate(dateStr))
}
