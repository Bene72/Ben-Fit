/**
 * POST /api/push/message  { messageId }
 * Prévient le destinataire d'un message qui vient d'être envoyé.
 * Sécurité : seul l'EXPÉDITEUR du message peut déclencher la notification.
 */
import { withAuth, checkRateLimit } from '../../../lib/withAuth'
import { sendPushToUser, supabaseAdmin, pushReady } from '../../../lib/pushServer'

const UUID = /^[0-9a-f-]{36}$/i

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  if (
    await checkRateLimit(req, res, { maxRequests: 30, windowMs: 60_000, routeKey: 'push-message' })
  )
    return
  if (!pushReady()) return res.status(200).json({ sent: 0, reason: 'push non configuré' })

  const { messageId } = req.body || {}
  if (typeof messageId !== 'string' || !UUID.test(messageId)) {
    return res.status(400).json({ error: 'messageId invalide' })
  }

  const { data: msg } = await supabaseAdmin()
    .from('messages')
    .select('id, sender_id, receiver_id, content')
    .eq('id', messageId)
    .single()
  if (!msg || msg.sender_id !== req.user.id) return res.status(403).json({ error: 'Interdit' })

  const [{ data: sender }, { data: receiver }] = await Promise.all([
    supabaseAdmin().from('profiles').select('full_name, role').eq('id', msg.sender_id).single(),
    supabaseAdmin().from('profiles').select('role').eq('id', msg.receiver_id).single(),
  ])
  const fromName = sender?.role === 'coach' ? 'ton coach' : sender?.full_name || 'un athlète'
  const preview = String(msg.content || '').slice(0, 120)
  const url = receiver?.role === 'coach' ? `/coach/${msg.sender_id}?tab=messages` : '/messages'

  const sent = await sendPushToUser(msg.receiver_id, {
    title: `💬 Nouveau message de ${fromName}`,
    body: preview,
    url,
    tag: `msg-${msg.sender_id}`,
  })
  return res.status(200).json({ sent })
}

export default withAuth(handler)
