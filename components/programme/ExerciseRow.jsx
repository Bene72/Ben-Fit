const moveExercise = async (workoutId, exId, direction) => {
  console.log('moveExercise appelé', { workoutId, exId, direction })
  
  const w = workouts.find(w => w.id === workoutId)
  if (!w) return
  
  const exs = [...w.exercises]
  const idx = exs.findIndex(e => e.id === exId)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= exs.length) return
  
  // Échanger les order_index
  const oldOrder = exs[idx].order_index
  const newOrder = exs[newIdx].order_index
  
  // Sauvegarder en BDD
  await supabase.from('exercises').update({ order_index: newOrder }).eq('id', exs[idx].id)
  await supabase.from('exercises').update({ order_index: oldOrder }).eq('id', exs[newIdx].id)
  
  // Mettre à jour le state local
  const tmp = exs[idx]
  exs[idx] = exs[newIdx]
  exs[newIdx] = tmp
  exs.forEach((ex, i) => { ex.order_index = i })
  
  setWorkouts(prev => prev.map(ww => ww.id === workoutId ? { ...ww, exercises: exs } : ww))
  
  console.log('Ordre mis à jour')
}
