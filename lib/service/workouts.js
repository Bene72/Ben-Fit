import { supabase } from "../../lib/supabase"

export function getExerciseLogKey(exerciseOrLog) {
  if (exerciseOrLog?.exercise_id) return `exercise_${exerciseOrLog.exercise_id}`
  if (exerciseOrLog?.id) return `exercise_${exerciseOrLog.id}`
  const safeName = String(exerciseOrLog?.exercise_name || exerciseOrLog?.name || '').trim().toLowerCase()
  return `name_${safeName}`
}

export function groupWorkoutLogs(logs = []) {
  return logs.reduce((acc, log) => {
    const key = getExerciseLogKey(log)
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
}

export async function fetchTrainingPageData(userId) {
  const [workoutsRes, sessionsRes, logsRes] = await Promise.all([
    supabase.from('workouts').select('*, exercises(*)').eq('client_id', userId).order('day_of_week'),
    (() => {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      return supabase.from('workout_sessions').select('*').eq('client_id', userId).gte('date', weekStart.toISOString().split('T')[0])
    })(),
    supabase.from('workout_logs').select('*').eq('client_id', userId).order('logged_at', { ascending: false }).limit(500),
  ])

  if (workoutsRes.error) throw workoutsRes.error
  if (sessionsRes.error) throw sessionsRes.error
  if (logsRes.error) throw logsRes.error

  return {
    workouts: (workoutsRes.data || []).map(w => ({ ...w, exercises: (w.exercises || []).sort((a, b) => a.order_index - b.order_index) })),
    sessions: sessionsRes.data || [],
    logsByExercise: groupWorkoutLogs(logsRes.data || []),
  }
}

export async function createWorkout(payload) {
  const res = await supabase.from('workouts').insert(payload).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function removeWorkout(workoutId) {
  const res = await supabase.from('workouts').delete().eq('id', workoutId)
  if (res.error) throw res.error
}

export async function createExercise(payload) {
  const res = await supabase.from('exercises').insert(payload).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function createExercisesBatch(exercises) {
  const res = await supabase.from('exercises').insert(exercises).select()
  if (res.error) throw res.error
  return res.data || []
}

export async function updateExerciseField(exId, field, value) {
  const res = await supabase.from('exercises').update({ [field]: value }).eq('id', exId)
  if (res.error) throw res.error
}

export async function removeExercise(exId) {
  const res = await supabase.from('exercises').delete().eq('id', exId)
  if (res.error) throw res.error
}

export async function createWorkoutLog(entry) {
  const res = await supabase.from('workout_logs').insert(entry).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function markWorkoutSessionDone(payload) {
  const res = await supabase.from('workout_sessions').insert(payload).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function saveWorkoutComment({ sessionId, payload }) {
  if (sessionId) {
    const res = await supabase.from('workout_sessions').update({ athlete_comment: payload.athlete_comment }).eq('id', sessionId).select().single()
    if (res.error) throw res.error
    return res.data
  }
  const res = await supabase.from('workout_sessions').insert(payload).select().single()
  if (res.error) throw res.error
  return res.data
}
