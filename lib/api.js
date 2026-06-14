/**
 * Helper fetch authentifié — à utiliser à la place de fetch() pour toutes les /api routes
 * Injecte automatiquement le Bearer token Supabase dans le header Authorization
 *
 * Usage :
 *   import { apiFetch } from '../lib/api'
 *   const res = await apiFetch('/api/generate-programme', {
 *     method: 'POST',
 *     body: JSON.stringify({ userMessage: '...' })
 *   })
 */
import { supabase } from './supabase'

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // Session expirée : renvoyer vers login
    if (typeof window !== 'undefined') window.location.href = '/'
    throw new Error('Session expirée')
  }

  if (res.status === 429) {
    throw new Error('Trop de requêtes. Attends quelques secondes.')
  }

  return res
}
