/**
 * lib/programme/saveQueue.js — enregistrement différé des champs du programme.
 *
 * Avant (10/11/2026) : chaque frappe dans un champ (nom, séries, charge…)
 * envoyait une écriture Supabase. Lent, et si deux écritures arrivaient dans
 * le désordre, une valeur tronquée pouvait rester en base.
 *
 * Maintenant : l'affichage se met à jour tout de suite, et l'écriture part
 * `delay` ms après la dernière frappe (ou immédiatement avec flush(), par
 * exemple quand on quitte la page). Les écritures d'un même champ sont
 * enchaînées dans l'ordre. onStatus reçoit 'saving' | 'saved' | 'error'.
 */
export function createSaveQueue({ delay = 700, onStatus = () => {} } = {}) {
  const timers = new Map() // key -> timeout
  const pending = new Map() // key -> fn
  let chain = Promise.resolve()
  let inFlight = 0
  let failed = false

  const run = (key) => {
    const fn = pending.get(key)
    pending.delete(key)
    timers.delete(key)
    if (!fn) return chain
    inFlight++
    onStatus('saving')
    chain = chain
      .then(fn)
      .then(
        () => {},
        (e) => {
          failed = true
          console.error('[programme] enregistrement', e)
        }
      )
      .finally(() => {
        inFlight--
        if (!inFlight && !pending.size) {
          onStatus(failed ? 'error' : 'saved')
          failed = false
        }
      })
    return chain
  }

  return {
    schedule(key, fn) {
      clearTimeout(timers.get(key))
      pending.set(key, fn)
      onStatus('pending')
      timers.set(
        key,
        setTimeout(() => run(key), delay)
      )
    },
    flush() {
      for (const key of [...pending.keys()]) {
        clearTimeout(timers.get(key))
        run(key)
      }
      return chain
    },
    hasPending: () => pending.size > 0 || inFlight > 0,
  }
}
