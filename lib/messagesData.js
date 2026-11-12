/**
 * lib/messagesData.js — chargement paginé d'une conversation.
 * Avant : tout l'historique était chargé à chaque ouverture. Maintenant : les
 * PAGE_SIZE derniers messages, puis les précédents à la demande.
 */
import { supabase } from './supabase'

export const PAGE_SIZE = 100

/**
 * @param {string} filter  filtre PostgREST `.or(...)` de la conversation
 * @param {string|null} before  created_at du plus ancien message déjà affiché
 * @returns {{ messages: Array, hasMore: boolean, error: any }} ordre chronologique
 */
export async function loadMessagesPage(filter, before = null) {
  let q = supabase
    .from('messages')
    .select('*')
    .or(filter)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  const rows = data || []
  return { messages: rows.slice(0, PAGE_SIZE).reverse(), hasMore: rows.length > PAGE_SIZE, error }
}
