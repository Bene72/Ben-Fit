/**
 * lib/withAuth.js
 * Middleware d'authentification pour les API routes Next.js.
 *
 * Usage :
 *   export default withAuth(handler)
 *   export default withAuth(handler, { requireCoach: true })
 *
 * SÉCURITÉ :
 * - La validation du token utilise désormais SUPABASE_SERVICE_ROLE_KEY
 *   plutôt que la clé anon. C'est plus robuste : la vérification du JWT
 *   ne dépend plus des policies RLS appliquées à la clé anon, et reste
 *   fiable même si les policies sur `profiles` changent par la suite.
 *
 * ⚠️  Rate limiter : voir lib/rateLimit.js. Bascule automatiquement sur
 *     Upstash Redis (compteur distribué, fiable multi-instance) si
 *     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN sont définies dans
 *     l'environnement Vercel. Sinon, fallback sur un Map() en mémoire
 *     (suffisant en dev/single-instance, pas fiable en prod serverless
 *     multi-instance à fort trafic — chaque cold start repart de zéro).
 */

import { createClient } from '@supabase/supabase-js'
import { isAllowed } from './rateLimit'

// Client admin instancié une seule fois au niveau module — réutilisé
// entre les invocations sur une même instance serverless (perf).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── withAuth ─────────────────────────────────────────────────────────────────

export function withAuth(handler, options = {}) {
  return async function (req, res) {
    // Uniquement Bearer token — apiFetch() (lib/api.js) est l'unique point
    // d'entrée des appels API côté client et envoie toujours un header
    // Authorization. Le fallback sur un cookie `sb-access-token` a été retiré :
    // ce cookie n'était posé nulle part dans l'app (code mort depuis la
    // migration vers @supabase/ssr), autant éviter qu'un futur cookie du même
    // nom soit lu ici sans qu'on ait vérifié son flag httpOnly/Secure.
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    // Validation du JWT via la service role key — fiable et indépendant
    // des policies RLS appliquées à la clé anon.
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée' })
    }

    if (options.requireCoach) {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileErr || profile?.role !== 'coach') {
        return res.status(403).json({ error: 'Accès réservé aux coachs' })
      }
    }

    req.user = user
    return handler(req, res)
  }
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
//
// Bascule automatiquement sur Upstash Redis si UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN sont définis (distribué, fiable multi-instance).
// Sinon, fallback sur un Map() en mémoire (dev / single-instance uniquement).
// Voir lib/rateLimit.js pour le détail de l'implémentation.

/**
 * Helper : retourne une Promise<boolean> — true si la requête est BLOQUÉE.
 *
 * ⚠️ Cette fonction est ASYNCHRONE : le `await` est OBLIGATOIRE.
 * Sans lui, `checkRateLimit(...)` renvoie une Promise (toujours "truthy" en
 * JS), donc `if (checkRateLimit(...))` est systématiquement vrai et le
 * handler retourne avant même d'avoir répondu à la requête — c'est le bug
 * corrigé sur 3 routes lors de l'audit du 10/07/2026 (voir CHANGELOG-AUDIT.md).
 *
 * Usage dans un handler :
 *   if (await checkRateLimit(req, res, { maxRequests: 5, windowMs: 60000, routeKey: 'ma-route' })) return
 */
export async function checkRateLimit(req, res, options = {}) {
  const allowed = await isAllowed(req, options)
  if (!allowed) {
    res.status(429).json({ error: 'Trop de requêtes. Réessaie dans quelques secondes.' })
    return true
  }
  return false
}
