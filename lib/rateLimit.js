/**
 * lib/rateLimit.js
 * Rate limiter avec bascule automatique Upstash Redis ↔ mémoire locale.
 *
 * CORRECTIF AUDIT 10/07/2026 :
 * L'ancienne version de ce fichier était accompagnée, dans lib/withAuth.js,
 * d'un commentaire affirmant une bascule automatique vers Upstash Redis dès
 * que UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN étaient définies.
 * Ce n'était pas vrai : aucun code Upstash n'existait, uniquement ce Map()
 * en mémoire. Si ces variables avaient été renseignées sur Vercel en
 * pensant activer une protection distribuée, rien ne se serait passé.
 * Cette version implémente réellement la bascule décrite.
 *
 * - Si UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont définies :
 *   compteur distribué via l'API REST Upstash (fenêtre fixe, INCR + PEXPIRE
 *   NX en une seule requête pipeline — pas de dépendance npm supplémentaire
 *   nécessaire, juste fetch()).
 * - Sinon : fallback sur un Map() en mémoire (dev / single-instance).
 *
 * En cas d'échec réseau vers Upstash (config invalide, service indisponible),
 * on choisit de "fail open" (on laisse passer la requête) plutôt que de
 * bloquer tout le trafic à cause d'un problème d'infra tiers : le rate
 * limiting est une protection contre l'abus, pas le mécanisme d'authentification
 * principal. L'erreur est loggée pour rester visible.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const rateLimitStore = new Map()

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  )
}

export function isUsingDistributedRateLimit() {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN)
}

/**
 * Fenêtre fixe en mémoire locale. Fiable uniquement en dev / single-instance
 * (voir limitation documentée en haut de fichier).
 */
function isAllowedInMemory(ip, maxRequests, windowMs) {
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

/**
 * Fenêtre fixe distribuée via Upstash Redis REST API.
 * INCR incrémente le compteur (le crée à 1 s'il n'existe pas).
 * PEXPIRE ... NX pose un TTL uniquement s'il n'y en a pas déjà — sans le NX,
 * chaque requête repousserait l'expiration et la fenêtre ne se
 * réinitialiserait jamais (fenêtre glissante infinie au lieu d'une fenêtre
 * fixe de `windowMs`).
 */
async function isAllowedUpstash(ip, maxRequests, windowMs, routeKey) {
  const key = `ratelimit:${routeKey}:${ip}`

  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, String(windowMs), 'NX'],
    ]),
  })

  if (!res.ok) {
    throw new Error(`Upstash HTTP ${res.status}`)
  }

  const [incrResult] = await res.json()
  const count = Number(incrResult?.result)

  if (!Number.isFinite(count)) {
    throw new Error('Réponse Upstash invalide')
  }

  return count <= maxRequests
}

/**
 * Retourne true si la requête est AUTORISÉE (pas bloquée).
 * `routeKey` sert à isoler les compteurs entre routes (ex: "archive-client")
 * pour qu'un quota sur une route n'affecte pas les autres pour la même IP.
 */
export async function isAllowed(
  req,
  { maxRequests = 10, windowMs = 60_000, routeKey = 'default' } = {}
) {
  const ip = getClientIp(req)

  if (isUsingDistributedRateLimit()) {
    try {
      return await isAllowedUpstash(ip, maxRequests, windowMs, routeKey)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[rateLimit] Upstash indisponible, fail-open sur cette requête :', e.message)
      return true
    }
  }

  return isAllowedInMemory(ip, maxRequests, windowMs)
}
