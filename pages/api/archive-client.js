/**
 * pages/api/archive-client.js
 *
 * Archive ou réactive un profil client.
 *
 * SÉCURITÉ :
 * - withAuth({ requireCoach: true }) : seul un coach authentifié peut appeler cette route
 * - checkRateLimit : 20 req/min/IP pour bloquer les abus
 * - Vérification que le client_id appartient bien au coach appelant (isolation multi-coach)
 * - Service role utilisé uniquement APRÈS validation de l'identité du coach
 * - Validation UUID du client_id pour éviter les injections
 */

import { createClient } from '@supabase/supabase-js'
import { withAuth, checkRateLimit } from '../../lib/withAuth'

// Regex UUID v4 — valide le format du client_id avant toute requête DB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Client admin instancié une fois au module level (hors du handler)
// — la service role key ne sera jamais exposée côté client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function handler(req, res) {
  // ── 1. Méthode ────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  if (checkRateLimit(req, res, { maxRequests: 20, windowMs: 60_000 })) return

  // ── 3. Validation du payload ──────────────────────────────────────────────
  const { client_id, archived } = req.body

  if (!client_id || typeof client_id !== 'string') {
    return res.status(400).json({ error: 'client_id requis' })
  }
  if (!UUID_REGEX.test(client_id)) {
    return res.status(400).json({ error: 'client_id invalide' })
  }
  if (typeof archived !== 'boolean') {
    return res.status(400).json({ error: 'archived doit être un booléen' })
  }

  // ── 4. Vérification que ce client appartient bien au coach appelant ───────
  // req.user est injecté par withAuth — c'est le coach authentifié
  const { data: targetProfile, error: lookupErr } = await supabaseAdmin
    .from('profiles')
    .select('id, coach_id, role')
    .eq('id', client_id)
    .maybeSingle()

  if (lookupErr) {
    console.error('[archive-client] lookup error:', lookupErr.message)
    return res.status(500).json({ error: 'Erreur serveur' })
  }

  if (!targetProfile) {
    // On ne révèle pas si le profil existe ou non
    return res.status(404).json({ error: 'Client introuvable' })
  }

  if (targetProfile.coach_id !== req.user.id) {
    // Le coach essaie d'archiver un client qui n'est pas le sien
    return res.status(403).json({ error: 'Ce client ne vous appartient pas' })
  }

  if (targetProfile.role !== 'client') {
    // Empêche d'archiver un autre coach par erreur
    return res.status(400).json({ error: 'Seuls les profils client peuvent être archivés' })
  }

  // ── 5. Mise à jour ────────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq('id', client_id)
    .select('id, full_name, archived, archived_at')

  if (error) {
    console.error('[archive-client] update error:', error.message)
    return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
  }

  return res.status(200).json({ success: true, data })
}

// withAuth vérifie le token Supabase ET que le caller a le rôle 'coach'
export default withAuth(handler, { requireCoach: true })
