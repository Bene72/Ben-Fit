/**
 * GET /api/cron/daily — lancé chaque matin par Vercel Cron (voir vercel.json).
 *
 *   1. Athlètes : rappel « Séance du jour » s'il y a une séance programmée
 *   2. Athlètes (le dimanche) : rappel « Bilan de la semaine » s'il n'est pas rempli
 *   3. Coach : résumé (athlètes à risque, fins de cycle J-14/J-7, renouvellements S10/S11)
 *
 * Uniquement pour les utilisateurs ayant activé les notifications.
 * Chaque rappel n'est envoyé qu'une fois (table notification_log).
 * Sécurité : Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
 */
import { supabaseAdmin, sendOnce, pushReady } from '../../../lib/pushServer'
import { computeRisk, engagementStatus } from '../../../lib/insights'
import { addDaysISO, getMondayOfWeekString } from '../../../lib/dateUtils'

const parisToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date()) // YYYY-MM-DD

const isoDow = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

async function fetchAll(build) {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}
const safe = (p) => p.catch((e) => (console.warn('[cron]', e?.message || e), []))
const groupBy = (rows, k) => rows.reduce((a, r) => ((a[r[k]] = a[r[k]] || []).push(r), a), {})

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!pushReady()) return res.status(200).json({ skipped: 'push non configuré' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' })

  const today = parisToday()
  const dow = isoDow(today)
  const monday = getMondayOfWeekString(today)
  const report = { sessions: 0, bilans: 0, coaches: 0 }

  const subs = await safe(
    fetchAll(() => supabaseAdmin().from('push_subscriptions').select('user_id'))
  )
  const subscribed = [...new Set(subs.map((s) => s.user_id))]
  if (!subscribed.length) return res.status(200).json({ ...report, note: 'aucun abonné' })

  const profiles = await safe(
    fetchAll(() => supabaseAdmin().from('profiles').select('*').in('id', subscribed))
  )
  const athletes = profiles.filter((p) => p.role === 'client' && !p.archived)
  const coaches = profiles.filter((p) => p.role === 'coach')
  const athleteIds = athletes.map((a) => a.id)

  // ── 1 & 2. Rappels athlètes ────────────────────────────────────────────────
  if (athleteIds.length) {
    const [workouts, bilans] = await Promise.all([
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('workouts')
            .select('client_id, name, day_of_week')
            .in('client_id', athleteIds)
            .not('is_archived', 'is', true)
            .not('is_future', 'is', true)
            .eq('day_of_week', dow)
        )
      ),
      dow === 7
        ? safe(
            fetchAll(() =>
              supabaseAdmin()
                .from('bilans')
                .select('client_id')
                .in('client_id', athleteIds)
                .eq('week_start', monday)
            )
          )
        : Promise.resolve([]),
    ])
    const todays = groupBy(workouts, 'client_id')
    for (const a of athletes) {
      const list = todays[a.id]
      if (list?.length) {
        report.sessions += await sendOnce(a.id, 'session', today, {
          title: '🏋️ Séance du jour',
          body:
            list
              .map((w) => w.name)
              .filter(Boolean)
              .join(' + ') || 'Ta séance t’attend',
          url: '/training',
          tag: 'session',
        })
      }
    }
    if (dow === 7) {
      const done = new Set(bilans.map((b) => b.client_id))
      for (const a of athletes) {
        if (done.has(a.id)) continue
        report.bilans += await sendOnce(a.id, 'bilan', monday, {
          title: '📋 Bilan de la semaine',
          body: '2 minutes pour faire le point avec ton coach.',
          url: '/bilan',
          tag: 'bilan',
        })
      }
    }
  }

  // ── 3. Résumé coach ────────────────────────────────────────────────────────
  for (const coach of coaches) {
    const clients = await safe(
      fetchAll(() =>
        supabaseAdmin().from('profiles').select('*').eq('coach_id', coach.id).eq('role', 'client')
      )
    )
    const active = clients.filter((c) => !c.archived)
    const ids = active.map((c) => c.id)
    if (!ids.length) continue
    const since = addDaysISO(today, -35)
    const [w, logs, sessions, nutrition, bilans, alerts] = await Promise.all([
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('workouts')
            .select('client_id, day_of_week, is_archived, is_future')
            .in('client_id', ids)
            .not('is_archived', 'is', true)
            .not('is_future', 'is', true)
        )
      ),
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('workout_logs')
            .select('client_id, logged_at')
            .in('client_id', ids)
            .gte('logged_at', `${since}T00:00:00`)
        )
      ),
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('workout_sessions')
            .select('client_id, date, completed')
            .in('client_id', ids)
            .gte('date', since)
        )
      ),
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('nutrition_logs')
            .select('client_id, date')
            .in('client_id', ids)
            .gte('date', addDaysISO(today, -60))
        )
      ),
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('bilans')
            .select('*')
            .in('client_id', ids)
            .gte('week_start', addDaysISO(today, -70))
        )
      ),
      safe(
        fetchAll(() =>
          supabaseAdmin()
            .from('cycle_alerts')
            .select('client_id, client_name, days_remaining')
            .in('client_id', ids)
        )
      ),
    ])
    const W = groupBy(w, 'client_id')
    const L = groupBy(logs, 'client_id')
    const S = groupBy(sessions, 'client_id')
    const N = groupBy(nutrition, 'client_id')
    const B = groupBy(bilans, 'client_id')
    const first = (c) => (c.full_name || c.email || '').split(' ')[0]

    const atRisk = active.filter(
      (c) =>
        computeRisk({
          workouts: W[c.id] || [],
          logs: L[c.id] || [],
          sessions: S[c.id] || [],
          nutritionDates: (N[c.id] || []).map((n) => n.date),
          bilans: B[c.id] || [],
          today,
        }).level === 'high'
    )
    const cycles = alerts.filter((a) => a.days_remaining === 14 || a.days_remaining === 7)
    const renewals = active.filter((c) => {
      const e = engagementStatus(c.engagement_start, today)
      return e && (e.week === 10 || e.week === 11) && e.daysLeft % 7 === 0
    })

    const parts = []
    if (atRisk.length)
      parts.push(`${atRisk.length} à risque : ${atRisk.slice(0, 3).map(first).join(', ')}`)
    for (const a of cycles)
      parts.push(`Fin de cycle J-${a.days_remaining} : ${(a.client_name || '').split(' ')[0]}`)
    for (const c of renewals) parts.push(`Renouvellement à préparer : ${first(c)}`)
    if (!parts.length) continue

    report.coaches += await sendOnce(coach.id, 'coach-digest', today, {
      title: '🧠 Qui a besoin de toi aujourd’hui',
      body: parts.join(' · ').slice(0, 220),
      url: '/coach',
      tag: 'coach-digest',
    })
  }

  return res.status(200).json(report)
}
