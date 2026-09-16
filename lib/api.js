/**
 * lib/api.js
 *
 * CORRECTIF AUDIT 09/09/2026 (point S2) :
 * lib/withAuth.js décrivait déjà, dans un commentaire, apiFetch() comme
 * "l'unique point d'entrée des appels API côté client" — mais ce fichier
 * n'existait pas. En réalité, chaque appelant reconstruisait à la main
 * `Authorization: Bearer ${session.access_token}` (pages/coach.js ×2,
 * CreateClientModal.jsx, GestionTab.jsx, lib/coachShared.js), sans jamais
 * vérifier que `session` n'était pas `null` : si le token avait expiré
 * entre le chargement de la page et le clic, ça plantait avec une
 * TypeError générique ("Cannot read properties of null") au lieu d'un
 * message clair invitant à se reconnecter.
 *
 * apiFetch() centralise cet appel pour nos propres routes /api/* (protégées
 * par lib/withAuth.js côté serveur) : un seul endroit à maintenir, un seul
 * endroit qui gère le cas "session absente".
 *
 * Ne pas confondre avec callEdgeFunction() (lib/coachShared.js), qui cible
 * les Supabase Edge Functions (`${SUPABASE_URL}/functions/v1/...`) et a
 * besoin en plus de la clé anon Supabase — un mécanisme différent, gardé
 * séparé.
 */

import { supabase } from './supabase'

export class SessionExpiredError extends Error {
  constructor(message = 'Session expirée, merci de te reconnecter.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

/**
 * Appelle une route API Next.js (/api/...) protégée par withAuth(), en
 * attachant automatiquement le token de session courant.
 *
 * @param {string} path - chemin de la route, ex: '/api/archive-client'
 * @param {RequestInit} [options] - options fetch standard (method, body...)
 * @throws {SessionExpiredError} si aucune session valide n'est disponible
 */
export async function apiFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new SessionExpiredError()
  }

  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
}

/**
 * Variante pratique : appelle apiFetch() puis parse le JSON et lève une
 * erreur lisible si la réponse n'est pas ok (évite de dupliquer ce
 * boilerplate dans chaque composant appelant).
 */
export async function apiFetchJson(path, options = {}) {
  const res = await apiFetch(path, options)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || `Erreur ${res.status}`)
  }
  return json
}
