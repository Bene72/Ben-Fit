/**
 * lib/exerciseImages.js
 * Association automatique "nom d'exercice → image de la bibliothèque"
 * (bucket Supabase Storage `exercise-images`).
 *
 * Avant le 10/11/2026, cette logique était copiée 3 fois dans
 * components/coach/ProgrammeTab.jsx (renommage d'un exercice, duplication de
 * programme, synchronisation des images), avec deux petits défauts :
 *   - un nom vide correspondait à la première image venue ;
 *   - les accents étaient retirés du nom d'exercice mais pas du nom de
 *     fichier, donc "développé couché.jpg" ne matchait jamais.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/** URL publique d'un fichier du bucket exercise-images. */
export function exerciseImageUrl(fileName) {
  if (!fileName || !SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fileName)}`
}

/** "Développé-Couché_v2" → "developpe couche v2" */
export function normalizeExerciseName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Prépare la liste des fichiers une seule fois (à réutiliser pour plusieurs recherches). */
export function buildImageIndex(fileNames = []) {
  return fileNames
    .filter(Boolean)
    .map((fileName) => ({
      normalized: normalizeExerciseName(fileName.replace(/\.[^.]+$/, '')),
      url: exerciseImageUrl(fileName),
    }))
    .filter((f) => f.normalized)
}

/**
 * Trouve l'URL d'image la plus probable pour un nom d'exercice, ou null.
 * Ordre : nom identique → l'un contient l'autre → au moins 2 mots (>2 lettres)
 * en commun (1 seul si le nom n'a qu'un mot significatif).
 */
export function findExerciseImage(exerciseName, index) {
  const name = normalizeExerciseName(exerciseName)
  if (!name || !index?.length) return null

  let match = index.find((f) => f.normalized === name)
  if (!match) match = index.find((f) => f.normalized.includes(name) || name.includes(f.normalized))
  if (!match) {
    const words = name.split(' ').filter((w) => w.length > 2)
    if (words.length) {
      const needed = Math.min(2, words.length)
      match = index.find((f) => words.filter((w) => f.normalized.includes(w)).length >= needed)
    }
  }
  return match ? match.url : null
}
