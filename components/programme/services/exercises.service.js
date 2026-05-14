import { supabase } from '../../../lib/supabase'

export async function createExercise(payload) {
  return supabase
    .from('exercises')
    .insert(payload)
    .select()
    .single()
}

export async function updateExerciseDb(id, payload) {
  return supabase
    .from('exercises')
    .update(payload)
    .eq('id', id)
}

export async function deleteExerciseDb(id) {
  return supabase
    .from('exercises')
    .delete()
    .eq('id', id)
}
