/**
 * Middleware d'authentification pour les API routes Next.js
 * Usage : export default withAuth(handler)
 * Usage coach uniquement : export default withAuth(handler, { requireCoach: true })
 */
import { createClient } from '@supabase/supabase-js'

export function withAuth(handler, options = {}) {
  return async function (req, res) {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies?.['sb-access-token']

    if (!token) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée' })
    }

    // Vérification du rôle coach si demandé
    if (options.requireCoach) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'coach') {
        return res.status(403).json({ error: 'Accès réservé aux coachs' })
      }
    }

    // Injecter l'utilisateur dans la requête
    req.user = user
    return handler(req, res)
  }
}

/**
 * Rate limiter en mémoire (par IP)
 * Limite : maxRequests par windowMs
 */
const rateLimitStore = new Map()

export function rateLimit({ maxRequests = 10, windowMs = 60_000 } = {}) {
  return function (req, res, next) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'

    const now = Date.now()
    const key = ip
    const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs }

    if (now > record.resetAt) {
      record.count = 0
      record.resetAt = now + windowMs
    }

    record.count++
    rateLimitStore.set(key, record)

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Trop de requêtes. Réessaie dans quelques secondes.',
      })
    }

    if (typeof next === 'function') return next()
    return false // pas bloqué
  }
}

/**
 * Helper : vérifie le rate limit et retourne true si bloqué
 * Usage dans un handler :
 *   if (checkRateLimit(req, res, { maxRequests: 5, windowMs: 60000 })) return
 */
export function checkRateLimit(req, res, options = {}) {
  const limiter = rateLimit(options)
  const blocked = limiter(req, res, () => {})
  return blocked !== false
}
