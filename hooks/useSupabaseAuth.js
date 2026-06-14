/**
 * Hook d'authentification réutilisable
 * Remplace le copier-coller de useEffect dans chaque page
 *
 * Usage :
 *   const { user, loading } = useSupabaseAuth({ role: 'coach' })
 *   const { user, loading } = useSupabaseAuth() // client ou coach, juste connecté
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export function useSupabaseAuth({ role = null, redirectIfNotRole = '/dashboard' } = {}) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) { router.push('/'); return }

        if (role) {
          const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', u.id).single()
          if (profile?.role !== role) {
            router.push(redirectIfNotRole)
            return
          }
        }

        if (!cancelled) { setUser(u); setLoading(false) }
      } catch (e) {
        console.error('Auth error:', e.message)
        if (!cancelled) router.push('/')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  return { user, loading }
}
