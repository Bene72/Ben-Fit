/**
 * lib/retentionData.js
 * Chargement Supabase pour les fonctions de rétention (calculs : lib/insights.js).
 *
 * Toutes les fonctions sont "défensives" : si une table ou une colonne
 * n'existe pas encore (migration 20261111090000_retention.sql non appliquée),
 * elles renvoient des listes vides au lieu de casser l'écran.
 */
import { supabase } from './supabase'
import { toLocalISODate, addDaysISO, getMondayOfWeekString } from './dateUtils'
import {
  engagementStatus,
  progressSummary,
  plannedDays,
  activityDates,
  weekStreak,
  cycleToReport,
  bilanAverage,
  weeklyTarget,
} from './insights'

/** Récupère toutes les lignes (Supabase plafonne à 1000 par requête). */
async function fetchAll(buildQuery, max = 10000) {
  const out = []
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await buildQuery().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const safe = async (fn, fallback = []) => {
  try {
    return await fn()
  } catch (e) {
    console.warn('[retention]', e?.message || e)
    return fallback
  }
}

/**
 * Vue coach : athlètes dont l'engagement se termine dans 14 jours ou moins
 * (ou est terminé). Aucune requête : les dates sont dans le profil.
 * @param {Array} clients modèles clients (toClientModel), actifs uniquement
 */
export function coachRenewals(clients, today = toLocalISODate()) {
  return (clients || [])
    .map((client) => ({
      client,
      engagement: engagementStatus(
        client._raw?.engagement_start,
        today,
        client._raw?.engagement_end
      ),
    }))
    .filter((r) => r.engagement?.renewal)
    .sort((a, b) => a.engagement.daysLeft - b.engagement.daysLeft)
}

/** Résumé de progression d'un athlète depuis une date (renouvellement). */
export async function loadProgressSince(clientId, from) {
  const to = toLocalISODate()
  const [logs, workouts, sessions, measures] = await Promise.all([
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_logs')
          .select('*')
          .eq('client_id', clientId)
          .gte('logged_at', `${from}T00:00:00`)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workouts')
          .select('day_of_week, is_archived, is_future')
          .eq('client_id', clientId)
          .not('is_future', 'is', true)
          .not('is_archived', 'is', true)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_sessions')
          .select('date, completed')
          .eq('client_id', clientId)
          .gte('date', from)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase.from('measures').select('date, weight').eq('client_id', clientId).gte('date', from)
      )
    ),
  ])
  return progressSummary({ from, to, logs, workouts, sessions, measures })
}

/** Objectifs d'un athlète (vide si la table n'existe pas encore). */
export async function loadGoals(clientId) {
  return safe(async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  })
}

/**
 * Vue athlète : série de semaines complètes + bilan du dernier cycle.
 */
export async function loadAthleteInsights(userId) {
  const today = toLocalISODate()
  const since = addDaysISO(today, -7 * 53)
  const [workouts, logs, sessions, cycles] = await Promise.all([
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workouts')
          .select('day_of_week, is_archived, is_future')
          .eq('client_id', userId)
          .not('is_archived', 'is', true)
          .not('is_future', 'is', true)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_logs')
          .select('*')
          .eq('client_id', userId)
          .gte('logged_at', `${since}T00:00:00`)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_sessions')
          .select('date, completed')
          .eq('client_id', userId)
          .gte('date', since)
      )
    ),
    safe(async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('client_id', userId)
        .order('start_date', { ascending: false })
        .limit(6)
      if (error) throw error
      return data || []
    }),
  ])

  const streak = weekStreak(
    plannedDays(workouts),
    activityDates(logs, sessions),
    today,
    weeklyTarget(workouts)
  )
  const cycle = cycleToReport(cycles, today)
  let cycleReport = null
  if (cycle) {
    const measures = await safe(() =>
      fetchAll(() =>
        supabase
          .from('measures')
          .select('date, weight')
          .eq('client_id', userId)
          .gte('date', cycle.start_date)
      )
    )
    cycleReport = {
      cycle,
      ...progressSummary({
        from: String(cycle.start_date).slice(0, 10),
        to: cycle.end,
        logs,
        workouts,
        sessions,
        measures,
      }),
    }
  }
  return { streak, cycleReport }
}

/**
 * Fiche client (Vue d'ensemble) : chiffres clés.
 *   - semaine en cours : jours actifs / séances programmées
 *   - assiduité sur 4 semaines
 *   - dernier bilan (moyenne des notes + évolution vs le précédent)
 *   - prochaine fin de cycle (vue cycle_alerts, sinon table cycles)
 */
export async function loadClientOverview(clientId) {
  const today = toLocalISODate()
  const from28 = addDaysISO(today, -27)
  const monday = getMondayOfWeekString(today)

  const [workouts, logs, sessions, bilans, alert] = await Promise.all([
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workouts')
          .select('day_of_week, is_archived, is_future')
          .eq('client_id', clientId)
          .not('is_archived', 'is', true)
          .not('is_future', 'is', true)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_logs')
          .select('*')
          .eq('client_id', clientId)
          .gte('logged_at', `${from28}T00:00:00`)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_sessions')
          .select('date, completed')
          .eq('client_id', clientId)
          .gte('date', from28)
      )
    ),
    safe(async () => {
      const { data, error } = await supabase
        .from('bilans')
        .select('*')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })
        .limit(2)
      if (error) throw error
      return data || []
    }),
    safe(async () => {
      const { data, error } = await supabase
        .from('cycle_alerts')
        .select('days_remaining, end_date, cycle_name')
        .eq('client_id', clientId)
        .order('end_date', { ascending: true })
        .limit(1)
      if (error) throw error
      return data?.[0] || null
    }, null),
  ])

  const activity = activityDates(logs, sessions)
  let weekDone = 0
  for (let i = 0; i < 7; i++) if (activity.has(addDaysISO(monday, i))) weekDone++
  const summary = progressSummary({ from: from28, to: today, logs, workouts, sessions })

  const [last, prev] = bilans
  const lastAvg = bilanAverage(last)
  const prevAvg = bilanAverage(prev)

  return {
    weekDone,
    weekPlanned: weeklyTarget(workouts),
    adherence: summary.adherence,
    sessionsDone: summary.sessionsDone,
    sessionsPlanned: summary.sessionsPlanned,
    lastBilan: last
      ? {
          weekStart: String(last.week_start).slice(0, 10),
          average: lastAvg,
          trend:
            lastAvg !== null && prevAvg !== null ? Math.round((lastAvg - prevAvg) * 10) / 10 : null,
        }
      : null,
    nextCycleEnd: alert,
  }
}
