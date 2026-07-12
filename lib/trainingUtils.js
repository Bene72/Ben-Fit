/**
 * lib/trainingUtils.js
 * Fonctions pures extraites de pages/training.js.
 * Aucune dépendance React ni Supabase — 100% testables unitairement.
 */

import { getMondayOf, DAY_LABELS_SHORT, DAY_LABELS_FULL } from './dateUtils'

export { getMondayOf, DAY_LABELS_SHORT, DAY_LABELS_FULL }

// ─── Dates (timezone-safe) ────────────────────────────────────────────────────

export function getLocalDateString(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getTodayLocalString() {
  return getLocalDateString(new Date())
}

export function safeDateLabel(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return '—'
  }
}

// ─── Calendrier ───────────────────────────────────────────────────────────────

/** Retourne les 7 dates (Lun→Dim) décalées de `offset` semaines. */
export function getWeekDays(offset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monday = getMondayOf(today)
  monday.setDate(monday.getDate() + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Nombre max de semaines vers le futur (aujourd'hui + 2 mois). */
export function getMaxFutureWeekOffset() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = new Date(today)
  limit.setMonth(limit.getMonth() + 2)
  const mondayToday = getMondayOf(today)
  const mondayLimit = getMondayOf(limit)
  return Math.round((mondayLimit - mondayToday) / (7 * 24 * 60 * 60 * 1000))
}

/** "Sem. du DD MOIS au DD MOIS" */
export function weekLabel(days) {
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `Sem. du ${fmt(days[0])} au ${fmt(days[6])}`
}

/** Mappe day_of_week DB (1=Lun…7=Dim) → getDay() JS (0=Dim…6=Sam). */
export function dowToJS(dow) {
  return dow === 7 ? 0 : dow
}

export function getWorkoutDayLabel(day) {
  const labels = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
  return labels[day] || 'Jour'
}

/** Vérifie si des logs existent pour une date donnée dans logsByExerciseName. */
export function hasLogsOnDate(date, logsByExerciseName) {
  const dateStr = getLocalDateString(date)
  return Object.values(logsByExerciseName).some((logs) =>
    logs.some((log) => {
      const logDate = log.logged_at || log.created_at || log.date || null
      return logDate && logDate.startsWith(dateStr)
    })
  )
}

// ─── Exercices ────────────────────────────────────────────────────────────────

export function normalizeExercises(exercises) {
  return [...(exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
}

/**
 * Transforme la liste plate d'exercices en blocs rendables.
 * Kinds : 'single' | 'group' (Superset/Giant/Drop/Workout Block)
 */
export function buildExerciseGroups(exercises) {
  const rendered = new Set()
  const items = []
  normalizeExercises(exercises).forEach((ex) => {
    if (rendered.has(ex.id)) return
    if (ex.group_id && ex.group_type && ex.group_type !== 'Normal') {
      const groupItems = normalizeExercises(exercises).filter(
        (item) => item.group_id === ex.group_id
      )
      groupItems.forEach((item) => rendered.add(item.id))
      items.push({
        kind: 'group',
        id: ex.group_id,
        groupType: ex.group_type,
        exercises: groupItems,
      })
    } else {
      rendered.add(ex.id)
      items.push({ kind: 'single', id: ex.id, exercise: ex })
    }
  })
  return items
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function workoutLogCount(workout, logsByExerciseName) {
  return (workout?.exercises || []).reduce(
    (sum, ex) => sum + (logsByExerciseName[ex.name] || []).length,
    0
  )
}

export function latestPerfText(log) {
  if (!log) return 'Aucun log'
  const chunks = []
  if (log.weight_used) chunks.push(log.weight_used)
  if (log.reps_done) chunks.push(`${log.reps_done} reps`)
  return chunks.length ? chunks.join(' · ') : 'Log enregistré'
}

export function getLogNote(log) {
  return log?.notes || log?.note || log?.comment || ''
}

export function getLogDate(log) {
  return log?.logged_at || log?.created_at || log?.date || null
}

export function buildInputFromLog(log) {
  if (!log) return {}
  let cleanNote = log?.notes || log?.note || log?.comment || ''
  let rpe = ''
  const match = cleanNote.match(/(?:^|·)\sRPE\s([0-9]+(?:[.,][0-9]+)?)/i)
  if (match) {
    rpe = String(match[1]).replace(',', '.')
    cleanNote = cleanNote
      .replace(match[0], '')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .trim()
  }
  return { weight: log?.weight_used || '', reps: log?.reps_done || '', rpe, note: cleanNote }
}

// ─── Couleurs des blocs ───────────────────────────────────────────────────────

export const WORKOUT_BLOCK_COLORS = {
  'For Time': '#C45C3A',
  AMRAP: '#2C64E5',
  EMOM: '#3A7A5A',
  Hyrox: '#0D1B4E',
  Interval: '#6B4FD4',
  'Zone 2': '#2A6B8A',
  'Cap Time': '#B8860B',
}

export const GROUP_COLORS = {
  Superset: '#C45C3A',
  'Giant Set': '#3A5FD4',
  'Drop Set': '#2C64E5',
}
