/**
 * lib/programme/duplicate.js — duplication d'un programme vers un athlète.
 * Extrait de components/coach/ProgrammeTab.jsx (10/11/2026), même logique :
 *   - chaque séance est recréée chez l'athlète cible (actuelle ou future)
 *   - ses exercices sont insérés en une requête, groupes (supersets/blocs)
 *     renumérotés, charges cibles optionnellement remises à zéro
 *   - image : celle de la source, sinon recherche dans la bibliothèque
 */
import { supabase } from '../supabase'
import { buildImageIndex, findExerciseImage } from '../exerciseImages'

export async function duplicateWorkouts({
  sourceWorkouts,
  targetClientId,
  isFuture,
  resetWeights,
  imageFiles = [],
}) {
  let exercisesInserted = 0
  const imageIndex = buildImageIndex(imageFiles)

  for (const workout of sourceWorkouts) {
    const { data: exData } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workout.id)
      .order('order_index')
    const exs = (exData || workout.exercises || []).sort(
      (a, b) => (a.order_index || 0) - (b.order_index || 0)
    )
    const { data: newWorkout, error: wInsErr } = await supabase
      .from('workouts')
      .insert({
        client_id: targetClientId,
        name: workout.name,
        type: workout.type,
        day_of_week: workout.day_of_week,
        duration_min: workout.duration_min,
        cycle_name: workout.cycle_name || null,
        is_future: isFuture,
      })
      .select()
      .single()
    if (wInsErr) throw new Error('Erreur création séance : ' + wInsErr.message)
    if (!newWorkout || !exs.length) continue

    const groupIdMap = {}
    let gIdx = 0
    exs.forEach((ex) => {
      if (ex.group_id && !groupIdMap[ex.group_id])
        groupIdMap[ex.group_id] = `dup_${newWorkout.id.slice(0, 8)}_g${gIdx++}`
    })
    const rows = exs.map((ex) => ({
      workout_id: newWorkout.id,
      name: String(ex.name || ''),
      sets: ex.sets != null ? parseInt(ex.sets) || null : null,
      reps: ex.reps != null ? String(ex.reps) : null,
      rest: ex.rest || null,
      note: ex.note || null,
      target_weight: resetWeights ? null : ex.target_weight || null,
      order_index: parseInt(ex.order_index) || 0,
      group_type: ex.group_type || 'Normal',
      group_id: ex.group_id ? groupIdMap[ex.group_id] : null,
      image_url: ex.image_url || findExerciseImage(ex.name, imageIndex) || null,
    }))
    const { error: exErr } = await supabase.from('exercises').insert(rows)
    if (exErr) throw new Error(`Exercices de « ${workout.name} » : ${exErr.message}`)
    exercisesInserted += rows.length
  }
  return { workouts: sourceWorkouts.length, exercises: exercisesInserted }
}

/**
 * Associe automatiquement une image de la bibliothèque aux exercices qui
 * n'en ont pas (ou à tous si forceAll). Renvoie le nombre d'images posées.
 */
export async function syncExerciseImages({ workouts, imageFiles, forceAll = false }) {
  const imageIndex = buildImageIndex(imageFiles)
  const toSync = workouts.flatMap((w) =>
    (w.exercises || []).filter((ex) => forceAll || !ex.image_url)
  )
  const updates = toSync
    .map((ex) => ({ id: ex.id, url: findExerciseImage(ex.name, imageIndex) }))
    .filter((u) => u.url)
  const results = await Promise.all(
    updates.map((u) => supabase.from('exercises').update({ image_url: u.url }).eq('id', u.id))
  )
  const failed = results.filter((r) => r.error).length
  if (failed) throw new Error(`${failed} image(s) non enregistrée(s)`)
  return { candidates: toSync.length, updated: updates.length }
}

/** Liste les images de la bibliothèque (bucket exercise-images). */
export async function listExerciseImageFiles() {
  const { data, error } = await supabase.storage
    .from('exercise-images')
    .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })
  if (error || !data?.length) return []
  return data
    .map((f) => f.name)
    .filter((n) => n && /\.(jpg|jpeg|png|gif|webp)$/i.test(n))
    .sort((a, b) => a.localeCompare(b, 'fr'))
}
