/**
 * lib/retentionData.js
 * Chargement Supabase pour les fonctions de rétention (calculs : lib/insights.js).
 *
 * Toutes les fonctions sont "défensives" : si une table ou une colonne
 * n'existe pas encore (migration 20261111090000_retention.sql non appliquée),
 * elles renvoient des listes vides au lieu de casser l'écran.
 */
import { supabase } from './supabase'
import { toLocalISODate, addDaysISO } from './dateUtils'
import {
  computeRisk,
  engagementStatus,
  progressSummary,
  plannedDays,
  activityDates,
  weekStreak,
  cycleToReport,
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

const groupBy = (rows, key) =>
  rows.reduce((acc, r) => {
    ;(acc[r[key]] = acc[r[key]] || []).push(r)
    return acc
  }, {})

/**
 * Vue coach : risque de chaque athlète actif + renouvellements à préparer.
 * @param {Array} clients modèles clients (toClientModel), actifs uniquement
 */
export async function loadCoachRetention(clients) {
  const ids = clients.map((c) => c.id)
  if (!ids.length) return { risks: [], renewals: [] }
  const today = toLocalISODate()
  const since = addDaysISO(today, -35)
  const sinceTs = `${since}T00:00:00`

  const [workouts, logs, sessions, nutrition, bilans] = await Promise.all([
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workouts')
          .select('client_id, day_of_week, is_archived, is_future')
          .in('client_id', ids)
          .eq('is_archived', false)
          .eq('is_future', false)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase.from('workout_logs').select('*').in('client_id', ids).gte('logged_at', sinceTs)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('workout_sessions')
          .select('client_id, date, completed')
          .in('client_id', ids)
          .gte('date', since)
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('nutrition_logs')
          .select('client_id, date')
          .in('client_id', ids)
          .gte('date', addDaysISO(today, -60))
      )
    ),
    safe(() =>
      fetchAll(() =>
        supabase
          .from('bilans')
          .select('*')
          .in('client_id', ids)
          .gte('week_start', addDaysISO(today, -70))
      )
    ),
  ])

  const W = groupBy(workouts, 'client_id')
  const L = groupBy(logs, 'client_id')
  const S = groupBy(sessions, 'client_id')
  const N = groupBy(nutrition, 'client_id')
  const B = groupBy(bilans, 'client_id')

  const risks = []
  const renewals = []
  for (const c of clients) {
    const risk = computeRisk({
      workouts: W[c.id] || [],
      logs: L[c.id] || [],
      sessions: S[c.id] || [],
      nutritionDates: (N[c.id] || []).map((n) => n.date),
      bilans: B[c.id] || [],
      today,
    })
    if (risk.level) risks.push({ client: c, ...risk })

    const engagement = engagementStatus(c._raw?.engagement_start, today)
    if (engagement?.renewal) renewals.push({ client: c, engagement })
  }

  risks.sort((a, b) =>
    a.level === b.level ? b.reasons.length - a.reasons.length : a.level === 'high' ? -1 : 1
  )
  renewals.sort((a, b) => b.engagement.week - a.engagement.week)
  return { risks, renewals }
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
          .eq('is_future', false)
          .eq('is_archived', false)
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
          .eq('is_archived', false)
          .eq('is_future', false)
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

  const streak = weekStreak(plannedDays(workouts), activityDates(logs, sessions), today)
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
