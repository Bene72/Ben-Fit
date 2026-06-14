import { supabase } from "../../lib/supabase"

export function normalizeWorkoutPayload(workout) {
  return {
    name: workout.name,
    type: workout.type,
    day_of_week: workout.day_of_week,
    duration_min: workout.duration_min,
    exercises: (workout.exercises || []).map((ex, i) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest,
      note: ex.note || '',
      target_weight: ex.target_weight || '',
      order_index: ex.order_index ?? i,
      group_type: ex.group_type || 'Normal',
      group_id: ex.group_id || null,
      image_url: ex.image_url || null,
    }))
  }
}

export async function duplicateProgramClientSide({ workouts, targetClientId }) {
  for (const workout of workouts) {
    const { data: newWorkout, error } = await supabase.from('workouts').insert({
      client_id: targetClientId,
      name: workout.name,
      type: workout.type,
      day_of_week: workout.day_of_week,
      duration_min: workout.duration_min,
    }).select().single()
    if (error) throw error
    if (newWorkout && workout.exercises?.length) {
      const { error: exError } = await supabase.from('exercises').insert(
        workout.exercises.map((ex, i) => ({
          workout_id: newWorkout.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          note: ex.note || '',
          target_weight: ex.target_weight || '',
          order_index: ex.order_index ?? i,
          group_type: ex.group_type || 'Normal',
          group_id: ex.group_id || null,
          image_url: ex.image_url || null,
        }))
      )
      if (exError) throw exError
    }
  }
}

export async function insertAiProgramClientSide({ aiProposal, clientId }) {
  for (const workout of aiProposal.workouts || []) {
    const { data: newWorkout, error } = await supabase.from('workouts').insert({
      client_id: clientId,
      name: workout.name,
      type: workout.type,
      day_of_week: workout.day_of_week,
      duration_min: workout.duration_min,
      cycle_name: aiProposal.cycle_name,
      is_archived: false,
    }).select().single()
    if (error) throw error
    if (newWorkout && workout.exercises?.length) {
      const { error: exError } = await supabase.from('exercises').insert(
        workout.exercises.map((ex, i) => ({
          workout_id: newWorkout.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          note: ex.note || '',
          target_weight: ex.target_weight || '',
          order_index: i,
          group_type: ex.group_type || 'Normal',
          group_id: ex.group_id || null,
          image_url: ex.image_url || null,
        }))
      )
      if (exError) throw exError
    }
  }
}
