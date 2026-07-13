/**
 * /api/login-guard
 * Vérification de rate limiting AVANT une tentative de connexion — appelée
 * par pages/login.js juste avant supabase.auth.signInWithPassword().
 *
 * SÉCURITÉ (11/07/2026, round 5) : Supabase applique déjà ses propres
 * limites de débit au niveau du serveur Auth (voir Rate Limits dans le
 * dashboard), mais elles sont globales au projet et pas toujours adaptées
 * à un usage précis. Cette route ajoute une couche complémentaire, à deux
 * niveaux :
 *   - par IP  : ralentit un brute-force générique depuis une seule machine
 *   - par email : ralentit un bourrage d'identifiants ciblé sur UN compte
 *     précis, même réparti sur plusieurs IP (VPN, botnet...)
 *
 * Cette route ne remplace pas la protection Supabase, elle s'ajoute par-dessus.
 * Pas de withAuth ici : par définition, l'utilisateur n'est pas encore
 * authentifié au moment de cet appel.
 */
import { isAllowed } from '../../lib/rateLimit'
import { isEmail, validate } from '../../lib/validate'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { valid, data } = validate(req.body, { email: isEmail })
  // Si l'email n'est même pas dans un format valide, pas besoin de consommer
  // de quota — mais on ne bloque pas non plus la tentative ici, ce n'est
  // pas le rôle de cette route (Supabase Auth renverra sa propre erreur).
  const email = valid ? data.email : null

  const ipAllowed = await isAllowed(req, {
    maxRequests: 15,
    windowMs: 5 * 60_000,
    routeKey: 'login-ip',
  })

  if (!ipAllowed) {
    return res.status(429).json({
      error: 'Trop de tentatives de connexion depuis cet appareil. Réessaie dans quelques minutes.',
    })
  }

  if (email) {
    // Clé par email plutôt que par IP : req est réutilisé par isAllowed
    // uniquement pour en extraire l'IP normalement, donc on construit une
    // pseudo-requête avec l'email en guise d'identifiant pour obtenir un
    // compteur distinct par compte ciblé.
    const emailAllowed = await isAllowed(
      { headers: { 'x-forwarded-for': `email:${email}` }, socket: {} },
      { maxRequests: 8, windowMs: 15 * 60_000, routeKey: 'login-email' }
    )
    if (!emailAllowed) {
      return res.status(429).json({
        error: 'Trop de tentatives sur ce compte. Réessaie dans quelques minutes.',
      })
    }
  }

  return res.status(200).json({ allowed: true })
}
