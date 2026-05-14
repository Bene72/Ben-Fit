import { useCallback, useMemo } from 'react'
import debounce from 'lodash.debounce'
import { supabase } from '../../../lib/supabase'

export function useExercises(setWorkouts) {

  const saveExerciseDebounced = useMemo(() => {
    return debounce(async (exId, payload) => {
      const { error } = await supabase
        .from('exercises')
        .update(payload)
        .eq('id', exId)

      if (error) {
        console.error('Erreur save exercice:', error)
      }
    }, 500)
  }, [])

  const updateExercise = useCallback(async (
    workoutId,
    exId,
    field,
    value
  ) => {

    setWorkouts(prev =>
      prev.map(w => {
        if (w.id !== workoutId) return w

        return {
          ...w,
          exercises: w.exercises.map(e =>
            e.id === exId
              ? { ...e, [field]: value }
              : e
          )
        }
      })
    )

    saveExerciseDebounced(exId, {
      [field]: value
    })

  }, [setWorkouts, saveExerciseDebounced])

  return {
    updateExercise
  }
}
