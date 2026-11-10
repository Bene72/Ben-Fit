/**
 * lib/db.js
 *
 * supabase-js ne LÈVE PAS d'exception quand une requête échoue : il renvoie
 * `{ data, error }`. Un simple `await supabase.from(...).update(...)` dans un
 * try/catch ne détecte donc jamais l'échec (RLS refusée, réseau coupé...) :
 * l'interface affiche "enregistré" alors que rien n'a été écrit.
 *
 * `must()` transforme ce `{ error }` en vraie exception.
 *
 *   await must(supabase.from('coach_tasks').update({ done: true }).eq('id', id))
 */
export async function must(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}
