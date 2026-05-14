import { normalizeExerciseName } from './normalizeExerciseName'

export function matchExerciseImage(exerciseName, files, supabaseUrl) {

  const exNorm = normalizeExerciseName(exerciseName)

  const normalizedFiles = files.map(name => ({
    normalized: normalizeExerciseName(
      name.replace(/\.[^.]+$/, '')
    ),
    url: `${supabaseUrl}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
  }))

  let match = normalizedFiles.find(f =>
    f.normalized === exNorm
  )

  if (!match) {
    match = normalizedFiles.find(f =>
      f.normalized.includes(exNorm) ||
      exNorm.includes(f.normalized)
    )
  }

  if (!match) {
    const words = exNorm
      .split(' ')
      .filter(w => w.length > 2)

    match = normalizedFiles.find(f =>
      words.filter(w =>
        f.normalized.includes(w)
      ).length >= Math.min(2, words.length)
    )
  }

  return match || null
}
