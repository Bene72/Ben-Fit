/**
 * Constantes partagées Ben&Fit
 * Évite les magic strings et doublons dans coach.js + training.js
 */

export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const DAYS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Power', 'Accessoire']

export const GROUP_TYPES = ['Normal', 'Superset', 'Giant Set', 'Drop Set', 'Workout Block']

export const COACH_TABS = [
  { id: 'overview',   label: "Vue d'ensemble" },
  { id: 'programme',  label: 'Programme' },
  { id: 'nutrition',  label: 'Nutrition' },
  { id: 'bilan',      label: 'Bilan' },
  { id: 'messages',   label: 'Messages' },
  { id: 'gestion',    label: 'Gestion' },
]

/** Génère un avatar coloré depuis le nom */
export function avatarColor(name) {
  return `hsl(${(name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`
}

export function avatarInitials(name) {
  return name?.substring(0, 2).toUpperCase() || '??'
}

export function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}
