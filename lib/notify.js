/**
 * lib/notify.js — déclenche une notification push côté serveur.
 * "Fire and forget" : une notification qui échoue ne doit jamais bloquer
 * l'envoi d'un message.
 */
import { apiFetch } from './api'

export function notifyNewMessage(messageId) {
  if (!messageId) return
  apiFetch('/api/push/message', {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  }).catch(() => {})
}
