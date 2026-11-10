/**
 * lib/pushServer.js — envoi des notifications push (CÔTÉ SERVEUR uniquement :
 * routes /api). Utilise la clé service Supabase et la clé privée VAPID, qui
 * ne doivent jamais être exposées au navigateur.
 *
 * Variables d'environnement (Vercel) :
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 * Sans elles, l'envoi est simplement ignoré (l'app fonctionne normalement).
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

let configured = null
export function pushReady() {
  if (configured !== null) return configured
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  configured = Boolean(pub && priv)
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@benandfit.fr', pub, priv)
  }
  return configured
}

/**
 * Envoie une notification à tous les appareils d'un utilisateur.
 * Les abonnements expirés (téléphone réinitialisé, notifications coupées)
 * sont retirés de la table push_subscriptions.
 * @returns {Promise<number>} nombre d'appareils atteints
 */
export async function sendPushToUser(userId, payload) {
  if (!pushReady() || !userId) return 0
  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error || !subs?.length) return 0

  let delivered = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 }
        )
        delivered++
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.warn('[push] envoi échoué', e?.statusCode || e?.message)
        }
      }
    })
  )
  return delivered
}

/**
 * Envoie au plus une fois par (utilisateur, type, référence) grâce à la table
 * notification_log (ex : un seul rappel de séance par jour).
 */
export async function sendOnce(userId, kind, ref, payload) {
  const { error } = await supabaseAdmin
    .from('notification_log')
    .insert({ user_id: userId, kind, ref })
  if (error) return 0 // déjà envoyé (contrainte unique) ou table absente
  return sendPushToUser(userId, payload)
}
