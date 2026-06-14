/**
 * Hook de fetch Supabase avec état loading/error centralisé
 *
 * Usage :
 *   const { data, loading, error, refetch } = useSupabaseData(
 *     () => supabase.from('workouts').select('*, exercises(*)').eq('client_id', userId),
 *     [userId]
 *   )
 */
import { useEffect, useState, useCallback } from 'react'

export function useSupabaseData(queryFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await queryFn()
      if (error) throw error
      setData(data)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
