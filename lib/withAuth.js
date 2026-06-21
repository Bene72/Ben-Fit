/**
 * lib/withAuth.js
 * Middleware d'authentification pour les API routes Next.js.
 *
 * Usage :
 *   export default withAuth(handler)
 *   export default withAuth(handler, { requireCoach: true })
 *
 * ⚠️  Rate limiter : ce module utilise un Map() en mémoire.
 *     Sur Vercel (serverless), chaque cold start spawn une nouvelle instance
 *     → le compteur repart à zéro. Cela suffit pour limiter les abus évidents
 *     mais NE remplace PAS un vrai rate limiter distribué (Upstash Redis / Vercel KV).
 *     Pour une protection sérieuse en production, remplace checkRateLimit par :
 *     https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

import { createClient } from '@supabase/supabase-js'

// ─── withAuth ─────────────────────────────────────────────────────────────────

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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée' })
    }

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

    req.user = user
    return handler(req, res)
  }
}

// ─── Rate limiter en mémoire ──────────────────────────────────────────────────
//
// ⚠️  LIMITATION SERVERLESS : chaque instance Vercel a son propre Map().
//     Efficace sur un seul process (dev local, single-instance), insuffisant
//     en prod multi-instance. À remplacer par Upstash/Vercel KV si nécessaire.

const rateLimitStore = new Map()

export function rateLimit({ maxRequests = 10, windowMs = 60_000 } = {}) {
  return function (req, res, next) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'

    const now    = Date.now()
    const record = rateLimitStore.get(ip) || { count: 0, resetAt: now + windowMs }

    if (now > record.resetAt) {
      record.count   = 0
      record.resetAt = now + windowMs
    }

    record.count++
    rateLimitStore.set(ip, record)

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Trop de requêtes. Réessaie dans quelques secondes.',
      })
    }

    if (typeof next === 'function') return next()
    return false
  }
}

/**
 * Helper : retourne true si la requête est bloquée par le rate limiter.
 * Usage dans un handler :
 *   if (checkRateLimit(req, res, { maxRequests: 5, windowMs: 60000 })) return
 */
export function checkRateLimit(req, res, options = {}) {
  const limiter  = rateLimit(options)
  const blocked  = limiter(req, res, () => {})
  return blocked !== false
}
