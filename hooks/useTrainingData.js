/**
 * hooks/useTrainingData.js
 * Gère tout le data-fetching et les actions de la page training.
 * La page elle-même ne touche plus Supabase directement.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { normalizeExercises } from '../lib/trainingUtils'
import { loadCalendarNotes, upsertCalendarNote, deleteCalendarNote } from '../lib/calendarNotes'

// ─── Helpers Supabase privés ──────────────────────────────────────────────────

async function loadLogsForClient(userId) {
  const { data: d1, error: e1 } = await supabase
    .from('workout_logs').select('*').eq('client_id', userId)
    .order('logged_at', { ascending: false }).limit(300)
  if (!e1) return d1 || []

  const { data: d2, error: e2 } = await supabase
    .from('workout_logs').select('*').eq('client_id', userId)
    .order('created_at', { ascending: false }).limit(300)
  if (!e2) return d2 || []

  const { data: d3 } = await supabase
    .from('workout_sessions').select('*').eq('client_id', userId)
    .order('created_at', { ascending: false }).limit(300)
  return (d3 || []).map((row) => ({
    ...row,
    exercise_name: row.exercise_name || row.exercise || row.name,
    weight_used:   row.weight_used   || row.weight   || null,
    reps_done:     row.reps_done     || row.reps     || null,
    notes:         row.notes         || row.note     || row.comment || null,
    logged_at:     row.logged_at     || row.created_at || null,
  }))
}

async function insertLogWithFallback(payload) {
  const attempts = [
    { build: () => ({ client_id: payload.client_id, workout_id: payload.workout_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, weight_used: payload.weight_used, reps_done: payload.reps_done, notes: payload.notes, logged_at: payload.logged_at }) },
    { build: () => ({ client_id: payload.client_id, workout_id: payload.workout_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, weight_used: payload.weight_used, reps_done: payload.reps_done, note:  payload.notes, logged_at: payload.logged_at }) },
  ]
  let lastError = null
  for (const attempt of attempts) {
    const { data, error } = await supabase.from('workout_logs').insert(attempt.build()).select().single()
    if (!error) return {
      ...data,
      exercise_name: data.exercise_name || payload.exercise_name,
      weight_used:   data.weight_used   || payload.weight_used,
      reps_done:     data.reps_done     || payload.reps_done,
      notes:         data.notes         || data.note || payload.notes || null,
      logged_at:     data.logged_at     || data.created_at || payload.logged_at,
    }
    lastError = error
  }
  throw lastError || new Error("Impossible d'enregistrer la performance")
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainingData() {
  const router = useRouter()

  const [loading,            setLoading]            = useState(true)
  const [error,              setError]              = useState('')
  const [success,            setSuccess]            = useState('')
  const [user,               setUser]               = useState(null)
  const [workouts,           setWorkouts]           = useState([])
  const [archivedWorkouts,   setArchivedWorkouts]   = useState([])
  const [logsByExerciseName, setLogsByExerciseName] = useState({})
  const [currentCycleName,   setCurrentCycleName]   = useState('')
  const [userName,           setUserName]           = useState('')
  const [logInputs,          setLogInputs]          = useState({})
  const [loggingIds,         setLoggingIds]         = useState({})
  const [blockInputs,        setBlockInputs]        = useState({})
  const [loggingBlockIds,    setLoggingBlockIds]    = useState({})
  const [blockResults,       setBlockResults]       = useState({})

  // ── Annotations calendrier ─────────────────────────────────────────────────
  const [calendarNotes, setCalendarNotes] = useState({})
  const [noteDraft,     setNoteDraft]     = useState('')
  const [savingNote,    setSavingNote]    = useState(false)

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true); setError(''); setSuccess('')
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user
        if (!currentUser) { router.push('/'); return }
        if (!active) return
        setUser(currentUser)

        const [
          { data: workoutData, error: workoutErr },
          logsData,
          notesData,
          profileRes,
          archivedRes,
        ] = await Promise.all([
          supabase.from('workouts').select('*, exercises(*)')
            .eq('client_id', currentUser.id).eq('is_archived', false).eq('is_future', false)
            .order('day_of_week', { ascending: true }),
          loadLogsForClient(currentUser.id),
          loadCalendarNotes(currentUser.id),
          supabase.from('profiles').select('current_cycle_name, full_name')
            .eq('id', currentUser.id).single(),
          supabase.from('workouts').select('*, exercises(*)')
            .eq('client_id', currentUser.id).eq('is_archived', true)
            .order('archived_at', { ascending: false }),
        ])

        if (workoutErr) throw workoutErr
        if (!active) return

        setCalendarNotes(notesData || {})
        setCurrentCycleName(profileRes.data?.current_cycle_name || '')
        setUserName(profileRes.data?.full_name?.split(' ')[0] || '')
        setArchivedWorkouts(archivedRes.data || [])

        const mapped = (workoutData || []).map((w) => ({
          ...w, exercises: normalizeExercises(w.exercises || []),
        }))

        const groupedLogs = {}
        ;(logsData || []).forEach((log) => {
          const key = log.exercise_name || 'Sans nom'
          if (!groupedLogs[key]) groupedLogs[key] = []
          groupedLogs[key].push(log)
        })

        const prefills = {}
        mapped.forEach((w) => {
          ;(w.exercises || []).forEach((ex) => {
            prefills[ex.id] = { weight: ex.target_weight || '', reps: ex.reps || '', rpe: '', note: '' }
          })
        })

        setWorkouts(mapped)
        setLogsByExerciseName(groupedLogs)
        setLogInputs(prefills)
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger la séance')
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  // ── Action : log perf ──────────────────────────────────────────────────────
  async function logPerformance(exercise) {
    const input = logInputs[exercise.id] || {}
    if (!input.weight && !input.reps && !input.note && !input.rpe) return
    try {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: true }))
      setError(''); setSuccess('')
      const noteParts = []
      if (input.rpe)  noteParts.push(`RPE ${input.rpe}`)
      if (input.note) noteParts.push(input.note)
      const row = await insertLogWithFallback({
        client_id: user.id, workout_id: exercise.workout_id || null,
        exercise_id: exercise.id || null, exercise_name: exercise.name,
        weight_used: input.weight ? String(input.weight) : null,
        reps_done:   input.reps   ? String(input.reps)   : null,
        notes: noteParts.length ? noteParts.join(' · ') : null,
        logged_at: new Date().toISOString(),
      })
      setLogsByExerciseName((prev) => ({ ...prev, [exercise.name]: [row, ...(prev[exercise.name] || [])] }))
      setLogInputs((prev) => ({ ...prev, [exercise.id]: { weight: exercise.target_weight || '', reps: exercise.reps || '', rpe: '', note: '' } }))
      setSuccess('Performance enregistrée.')
    } catch (e) {
      setError(e.message || "Impossible d'enregistrer la performance")
    } finally {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: false }))
    }
  }

  function onLogInput(exerciseId, field, value) {
    setLogInputs((prev) => ({ ...prev, [exerciseId]: { ...(prev[exerciseId] || {}), [field]: value } }))
  }

  // ── Actions : annotations calendrier ──────────────────────────────────────
  async function saveNote(dateStr) {
    if (!dateStr) return
    const trimmed = noteDraft.trim()
    if (!trimmed) { await removeNote(dateStr); return }
    setSavingNote(true); setError('')
    try {
      const row = await upsertCalendarNote({ clientId: user.id, dateStr, text: trimmed, authorId: user.id })
      setCalendarNotes((prev) => ({ ...prev, [dateStr]: row }))
      setNoteDraft('')
    } catch (e) {
      setError(e.message || "Impossible d'enregistrer l'annotation")
    } finally {
      setSavingNote(false)
    }
  }

  async function removeNote(dateStr) {
    if (!dateStr) return
    setSavingNote(true); setError('')
    try {
      await deleteCalendarNote({ clientId: user.id, dateStr })
      setCalendarNotes((prev) => { const next = { ...prev }; delete next[dateStr]; return next })
      setNoteDraft('')
    } catch (e) {
      setError(e.message || "Impossible de supprimer l'annotation")
    } finally {
      setSavingNote(false)
    }
  }

  // ── Action : log résultat Workout Block ─────────────────────────────────────
  async function logBlockResult(groupId, workoutId, meta) {
    const input = blockInputs[groupId] || {}
    if (!input.time && !input.rounds && !input.reps && !input.note) return
    try {
      setLoggingBlockIds((prev) => ({ ...prev, [groupId]: true }))
      setError(''); setSuccess('')
      const { data, error } = await supabase
        .from('workout_block_results')
        .insert({
          client_id: user.id,
          workout_id: workoutId || null,
          group_id: groupId,
          format: meta?.type || null,
          time_result: input.time || null,
          rounds_result: input.rounds ? parseInt(input.rounds) : null,
          reps_result: input.reps ? parseInt(input.reps) : null,
          level: input.level || null,
          note: input.note || null,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      setBlockResults((prev) => ({ ...prev, [groupId]: [data, ...(prev[groupId] || [])] }))
      setSuccess('Résultat enregistré.')
    } catch (e) {
      setError(e.message || "Impossible d'enregistrer le résultat")
    } finally {
      setLoggingBlockIds((prev) => ({ ...prev, [groupId]: false }))
    }
  }

  function onBlockInput(groupId, field, value) {
    setBlockInputs((prev) => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), [field]: value } }))
  }

  return {
    loading, error, success,
    user, workouts, archivedWorkouts,
    logsByExerciseName, currentCycleName, userName,
    logInputs, loggingIds, logPerformance, onLogInput,
    blockInputs, loggingBlockIds, blockResults, logBlockResult, onBlockInput,
    calendarNotes, noteDraft, setNoteDraft, savingNote,
    saveNote, removeNote,
  }
}
