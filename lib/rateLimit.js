/**
 * lib/rateLimit.js
 * Rate limiter en mémoire (Map()).
 *
 * ⚠️ LIMITATION SERVERLESS : chaque instance Vercel a son propre Map().
 * Efficace en dev/single-instance, pas fiable en prod serverless multi-instance
 * à fort trafic. Amélioration possible plus tard : bascule vers Upstash Redis
 * (nécessite d'ajouter @upstash/redis + @upstash/ratelimit à package.json).
 */

const rateLimitStore = new Map()

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

/**
 * Retourne true si la requête est AUTORISÉE (pas bloquée).
 */
export async function isAllowed(req, { maxRequests = 10, windowMs = 60_000 } = {}) {
  const ip = getClientIp(req)
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

export function isUsingDistributedRateLimit() {
  return false
}
