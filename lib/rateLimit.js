/**
 * lib/rateLimit.js
 * Rate limiter avec bascule automatique :
 *   - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont définis
 *     → utilise Upstash Redis (distribué, fiable en serverless multi-instance).
 *   - Sinon → fallback sur un Map() en mémoire (suffisant en dev / single-instance,
 *     PAS fiable en prod serverless multi-instance).
 *
 * C'est un point identifié comme risque en audit sécurité : le rate limiter
 * en mémoire ne partage pas son état entre les instances Vercel. Ce module
 * ne force personne à configurer Upstash, mais rend la bascule immédiate
 * (juste ajouter les 2 variables d'env) sans changer le code appelant.
 *
 * Usage (inchangé pour les routes existantes) :
 *   import { checkRateLimit } from '../../lib/withAuth'
 *   if (await checkRateLimit(req, res, { maxRequests: 10, windowMs: 60_000 })) return
 */

let upstashLimiterPromise = null

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function getUpstashLimiter(maxRequests, windowMs) {
  const config = getUpstashConfig()
  if (!config) return null

  if (!upstashLimiterPromise) {
    upstashLimiterPromise = (async () => {
      try {
        const { Redis } = await import('@upstash/redis')
        const { Ratelimit } = await import('@upstash/ratelimit')
        const redis = new Redis({ url: config.url, token: config.token })
        return { Redis, Ratelimit, redis }
      } catch {
        // Packages non installés ou erreur réseau : on retombe en mémoire
        // plutôt que de faire échouer toutes les routes API.
        return null
      }
    })()
  }

  const ctx = await upstashLimiterPromise
  if (!ctx) return null

  return new ctx.Ratelimit({
    redis: ctx.redis,
    limiter: ctx.Ratelimit.slidingWindow(maxRequests, `${Math.ceil(windowMs / 1000)} s`),
  })
}

// ─── Fallback en mémoire (comportement historique, inchangé) ─────────────────
const rateLimitStore = new Map()

function checkInMemory(ip, maxRequests, windowMs) {
  const now = Date.now()
  const record = rateLimitStore.get(ip) || { count: 0, resetAt: now + windowMs }

  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + windowMs
  }

  record.count++
  rateLimitStore.set(ip, record)

  return record.count <= maxRequests
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

/**
 * Retourne true si la requête est AUTORISÉE (pas bloquée), false si elle
 * dépasse la limite. Utilise Upstash si configuré, sinon le Map en mémoire.
 */
export async function isAllowed(req, { maxRequests = 10, windowMs = 60_000 } = {}) {
  const ip = getClientIp(req)

  const limiter = await getUpstashLimiter(maxRequests, windowMs)
  if (limiter) {
    const { success } = await limiter.limit(ip)
    return success
  }

  return checkInMemory(ip, maxRequests, windowMs)
}

export function isUsingDistributedRateLimit() {
  return !!getUpstashConfig()
}
