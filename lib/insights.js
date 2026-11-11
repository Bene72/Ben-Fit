/**
 * lib/insights.js
 *
 * Calculs "rétention" partagés coach / athlète, sans aucun accès réseau
 * (fonctions pures, testées dans lib/__tests__/insights.test.js) :
 *   - jours d'activité, séances manquées d'affilée, série de semaines complètes
 *   - niveau de risque d'un athlète (+ raisons lisibles)
 *   - semaine d'engagement (renouvellement à S10-S12)
 *   - résumé de progression sur une période (bilan de cycle, renouvellement)
 *
 * Conventions :
 *   - dates "YYYY-MM-DD" en heure LOCALE (voir lib/dateUtils.js)
 *   - workouts.day_of_week : 1 = lundi … 7 = dimanche
 *   - une "activité" = au moins une perf loguée (workout_logs.logged_at) ou une
 *     séance enregistrée (workout_sessions.date) ce jour-là
 */
import { toLocalISODate, parseLocalDate, addDaysISO, getMondayOfWeekString } from './dateUtils'

const isoDow = (dateStr) => {
  const d = parseLocalDate(dateStr).getDay()
  return d === 0 ? 7 : d
}

const daysBetween = (fromStr, toStr) =>
  Math.round((parseLocalDate(toStr) - parseLocalDate(fromStr)) / 86400000)

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Jours d'activité (Set de "YYYY-MM-DD") à partir des logs et des séances. */
export function activityDates(logs = [], sessions = []) {
  const set = new Set()
  for (const l of logs || []) {
    const at = l.logged_at || l.created_at
    if (at) set.add(at.length === 10 ? at : toLocalISODate(new Date(at)))
  }
  for (const s of sessions || []) {
    if (s.date && s.completed !== false) set.add(s.date)
  }
  return set
}

/** Jours de la semaine programmés (Set de 1..7) d'après les séances actives. */
export function plannedDays(workouts = []) {
  return new Set(
    (workouts || [])
      .filter((w) => !w.is_archived && !w.is_future)
      .map((w) => Number(w.day_of_week))
      .filter((d) => d >= 1 && d <= 7)
  )
}

/**
 * Nombre de séances par semaine attendues : jours programmés, ou à défaut
 * (séances sans jour attribué) une par séance du programme, plafonné à 7.
 */
export function weeklyTarget(workouts = []) {
  const days = plannedDays(workouts).size
  if (days) return days
  return Math.min(7, (workouts || []).filter((w) => !w.is_archived && !w.is_future).length)
}

/**
 * Nombre de séances programmées manquées d'affilée, en remontant depuis HIER
 * (la journée en cours n'est pas finie). S'arrête au premier jour programmé
 * où l'athlète a été actif. Plafonné à 28 jours.
 */
export function missedInARow(planned, activity, today = toLocalISODate()) {
  if (!planned?.size) return 0
  let missed = 0
  for (let i = 1; i <= 28; i++) {
    const day = addDaysISO(today, -i)
    if (!planned.has(isoDow(day))) continue
    if (activity.has(day)) break
    missed++
  }
  return missed
}

/**
 * Série de semaines complètes : une semaine (lun→dim) est complète si
 * l'athlète a été actif au moins autant de jours que de jours programmés
 * (il peut décaler une séance d'un jour à l'autre). La semaine en cours compte
 * seulement si elle est déjà complète.
 */
export function weekStreak(
  planned,
  activity,
  today = toLocalISODate(),
  target = planned?.size || 0
) {
  if (!target) return 0
  const activeDaysInWeek = (monday) => {
    let n = 0
    for (let i = 0; i < 7; i++) if (activity.has(addDaysISO(monday, i))) n++
    return n
  }
  const thisMonday = getMondayOfWeekString(today)
  let streak = activeDaysInWeek(thisMonday) >= target ? 1 : 0
  for (let w = 1; w <= 52; w++) {
    if (activeDaysInWeek(addDaysISO(thisMonday, -7 * w)) >= target) streak++
    else break
  }
  return streak
}

/** Moyenne des notes d'un bilan (champs *_score), ou null. */
export function bilanAverage(bilan) {
  if (!bilan) return null
  const scores = Object.entries(bilan)
    .filter(([k, v]) => k.endsWith('_score') && num(v) > 0)
    .map(([, v]) => num(v))
  if (!scores.length) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

/**
 * Risque de décrochage d'un athlète.
 * Règles (validées par le coach le 10/11/2026) :
 *   - 2 séances programmées manquées d'affilée
 *   - pas de journal nutrition depuis 5 jours (si l'athlète en tient un)
 *   - bilan de la semaine passée non rempli (si l'athlète en remplit)
 *   - ressenti en baisse : moyenne du dernier bilan ≥ 1 point sous le précédent
 * Niveau : 'high' dès 2 raisons ou 3 séances manquées, sinon 'medium'.
 */
export function computeRisk({
  workouts = [],
  logs = [],
  sessions = [],
  nutritionDates = [],
  bilans = [],
  today = toLocalISODate(),
}) {
  const reasons = []
  const planned = plannedDays(workouts)
  const activity = activityDates(logs, sessions)

  const missed = missedInARow(planned, activity, today)
  if (missed >= 2) reasons.push({ code: 'missed', label: `${missed} séances manquées d'affilée` })

  const lastNutrition = [...nutritionDates].filter(Boolean).sort().pop()
  if (lastNutrition) {
    const d = daysBetween(lastNutrition, today)
    if (d >= 5) reasons.push({ code: 'nutrition', label: `Pas de journal nutrition depuis ${d} j` })
  }

  const sorted = [...(bilans || [])]
    .filter((b) => b.week_start)
    .sort((a, b) => String(b.week_start).localeCompare(String(a.week_start)))
  if (sorted.length) {
    const lastWeek = addDaysISO(getMondayOfWeekString(today), -7)
    if (String(sorted[0].week_start).slice(0, 10) < lastWeek) {
      reasons.push({ code: 'bilan', label: 'Bilan de la semaine passée non rempli' })
    }
    const [last, prev] = sorted.map(bilanAverage).filter((v) => v !== null)
    if (last !== undefined && prev !== undefined && last <= prev - 1) {
      reasons.push({ code: 'mood', label: `Ressenti en baisse (${prev} → ${last})` })
    }
  }

  const level = !reasons.length ? null : reasons.length >= 2 || missed >= 3 ? 'high' : 'medium'
  return { level, reasons, missed }
}

/**
 * État de l'engagement d'un athlète à partir de ses dates de début et de fin
 * (saisies par le coach ; sans date de fin : 12 semaines, dernier jour inclus).
 *   - week / length : semaine en cours / nombre de semaines de l'engagement
 *   - daysLeft : jours restants jusqu'à la fin (négatif une fois terminé)
 *   - renewal : à préparer (14 jours ou moins avant la fin, ou terminé)
 */
export function engagementStatus(engagementStart, today = toLocalISODate(), engagementEnd = null) {
  if (!engagementStart) return null
  const start = String(engagementStart).slice(0, 10)
  const endDate = engagementEnd ? String(engagementEnd).slice(0, 10) : addDaysISO(start, 83)
  const totalDays = Math.max(1, daysBetween(start, endDate) + 1)
  const length = Math.max(1, Math.ceil(totalDays / 7))
  const days = daysBetween(start, today)
  const daysLeft = daysBetween(today, endDate)
  if (days < 0) return { week: 0, length, endDate, start, renewal: false, ended: false, daysLeft }
  return {
    start,
    week: Math.min(length, Math.floor(days / 7) + 1),
    length,
    endDate,
    daysLeft,
    ended: daysLeft < 0,
    renewal: daysLeft <= 14,
  }
}

/**
 * Résumé de progression entre deux dates incluses (bilan de cycle,
 * renouvellement) :
 *   - gains : pour chaque exercice logué au moins 2 jours différents sur la
 *     période, meilleure charge du PREMIER jour vs meilleure charge de la
 *     période ; top 3 des progressions positives
 *   - assiduité : jours actifs / jours programmés sur la période
 *   - poids : première vs dernière mesure de la période
 */
export function progressSummary({
  from,
  to,
  logs = [],
  workouts = [],
  sessions = [],
  measures = [],
}) {
  const inRange = (d) => d && d >= from && d <= to
  const byExercise = {}
  for (const l of logs || []) {
    const at = l.logged_at || l.created_at
    if (!at) continue
    const day = at.length === 10 ? at : toLocalISODate(new Date(at))
    const w = num(l.weight_used ?? l.weight)
    const name = (l.exercise_name || l.exercise || '').trim()
    if (!inRange(day) || w === null || w <= 0 || !name) continue
    const key = name.toLowerCase()
    byExercise[key] = byExercise[key] || { name, days: {} }
    byExercise[key].days[day] = Math.max(byExercise[key].days[day] || 0, w)
  }
  const gains = Object.values(byExercise)
    .map(({ name, days }) => {
      const dates = Object.keys(days).sort()
      if (dates.length < 2) return null
      const first = days[dates[0]]
      const best = Math.max(...Object.values(days))
      return { exercise: name, from: first, to: best, delta: Math.round((best - first) * 10) / 10 }
    })
    .filter((g) => g && g.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)

  const planned = plannedDays(workouts)
  const activity = activityDates(logs, sessions)
  const end = to < toLocalISODate() ? to : toLocalISODate()
  let plannedCount = 0
  let doneCount = 0
  let span = 0
  for (let d = from; d <= end; d = addDaysISO(d, 1)) {
    span++
    if (planned.has(isoDow(d))) plannedCount++
    if (activity.has(d)) doneCount++
  }
  // Séances sans jour de la semaine attribué : on attend chaque séance du
  // programme une fois par semaine.
  if (!planned.size) plannedCount = Math.round((weeklyTarget(workouts) * span) / 7)
  const adherence = plannedCount
    ? Math.min(100, Math.round((doneCount / plannedCount) * 100))
    : null

  const weights = (measures || [])
    .filter((m) => inRange(m.date) && num(m.weight) !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const weightChange =
    weights.length >= 2
      ? Math.round((num(weights[weights.length - 1].weight) - num(weights[0].weight)) * 10) / 10
      : null

  return {
    from,
    to,
    gains,
    adherence,
    sessionsDone: doneCount,
    sessionsPlanned: plannedCount,
    weightChange,
  }
}

/** Phrase courte du type « +12 kg au squat · 94 % de séances faites ». */
export function summaryHeadline(summary) {
  if (!summary) return ''
  const parts = []
  if (summary.gains?.[0])
    parts.push(`+${fmt(summary.gains[0].delta)} kg ${summary.gains[0].exercise}`)
  if (summary.adherence !== null && summary.adherence !== undefined)
    parts.push(`${summary.adherence} % de séances faites`)
  if (summary.weightChange)
    parts.push(
      `${summary.weightChange > 0 ? '+' : ''}${fmt(summary.weightChange)} kg sur la balance`
    )
  return parts.join(' · ')
}

export const fmt = (n) => String(n).replace('.', ',')

/** Fin théorique d'un cycle (start_date + duration_weeks semaines). */
export function cycleEnd(cycle) {
  if (!cycle?.start_date) return null
  return addDaysISO(
    String(cycle.start_date).slice(0, 10),
    (Number(cycle.duration_weeks) || 5) * 7 - 1
  )
}

/**
 * Cycle à présenter en "bilan de cycle" : le plus récent dont la fin
 * théorique tombe entre il y a 21 jours et dans 3 jours.
 */
export function cycleToReport(cycles = [], today = toLocalISODate()) {
  return (
    [...(cycles || [])]
      .filter((c) => c.start_date)
      .map((c) => ({ ...c, end: cycleEnd(c) }))
      .filter((c) => {
        const d = daysBetween(c.end, today)
        return d >= -3 && d <= 21
      })
      .sort((a, b) => b.end.localeCompare(a.end))[0] || null
  )
}

/** Libellé d'urgence de fin de cycle : 'J-7' (≤ 7 j), 'J-14' (≤ 14 j), sinon null. */
export function cycleUrgency(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return null
  if (daysRemaining < 0) return 'Terminé'
  if (daysRemaining <= 7) return 'J-7'
  if (daysRemaining <= 14) return 'J-14'
  return null
}
