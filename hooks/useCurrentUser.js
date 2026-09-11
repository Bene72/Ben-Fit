/**
 * hooks/useCurrentUser.js
 * Hook d'authentification — remplace le bloc auth boilerplate répété
 * dans dashboard.js, training.js, nutrition.js, bilan.js, eleves.js, etc.
 *
 * Usage :
 *   const { user, profile, loading } = useCurrentUser()
 *   // ou avec redirect automatique si non connecté :
 *   const { user, profile, loading } = useCurrentUser({ redirectIfUnauthenticated: '/' })
 *   // ou réservé aux coachs :
 *   const { user, profile, loading } = useCurrentUser({ requireCoach: true })
 *
 * Avant (dans chaque page, ~15 lignes) :
 *   useEffect(() => {
 *     const load = async () => {
 *       const { data: { user } } = await supabase.auth.getUser()
 *       if (!user) { router.replace('/'); return }
 *       setUser(user)
 *       const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
 *       setProfile(prof)
 *     }
 *     load()
 *   }, [])
 *
 * Après (1 ligne) :
 *   const { user, profile, loading } = useCurrentUser({ redirectIfUnauthenticated: '/' })
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

/**
 * @param {object} options
 * @param {string}  [options.redirectIfUnauthenticated] - Route vers laquelle rediriger si non connecté (ex: '/')
 * @param {boolean} [options.requireCoach]              - Redirige vers '/' si l'utilisateur n'est pas coach
 * @param {string}  [options.profileSelect]             - Colonnes à sélectionner dans profiles (défaut: '*')
 */
export function useCurrentUser({
  redirectIfUnauthenticated = null,
  requireCoach = false,
  profileSelect = '*',
} = {}) {
  const router  = useRouter()
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          if (redirectIfUnauthenticated) router.replace(redirectIfUnauthenticated)
          return
        }

        if (cancelled) return
        setUser(currentUser)

        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select(profileSelect)
          .eq('id', currentUser.id)
          .single()

        if (profErr) throw profErr
        if (cancelled) return

        if (requireCoach && prof?.role !== 'coach') {
          router.replace('/')
          return
        }

        setProfile(prof)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, profile, loading, error }
}
