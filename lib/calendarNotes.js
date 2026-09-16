/**
 * lib/calendarNotes.js
 * Helpers Supabase pour les annotations de calendrier (calendar_notes).
 * Extraits de pages/training.js — isolés ici pour être réutilisables
 * depuis la vue coach si besoin.
 */

import { supabase } from './supabase'

/**
 * Charge toutes les annotations d'un client, indexées par date (YYYY-MM-DD).
 * @param {string} clientId
 * @returns {{ [dateStr]: { id, note_date, note, updated_by, updated_at } }}
 */
export async function loadCalendarNotes(clientId) {
  const { data, error } = await supabase
    .from('calendar_notes')
    .select('*')
    .eq('client_id', clientId)
  if (error) { console.warn('calendar_notes fetch error:', error.message); return {} }
  const byDate = {}
  ;(data || []).forEach(row => { byDate[row.note_date] = row })
  return byDate
}

/**
 * Crée ou met à jour une annotation pour un jour donné.
 * @param {{ clientId: string, dateStr: string, text: string, authorId: string }}
 * @returns {object} La ligne upsertée
 */
export async function upsertCalendarNote({ clientId, dateStr, text, authorId }) {
  const { data, error } = await supabase
    .from('calendar_notes')
    .upsert(
      { client_id: clientId, note_date: dateStr, note: text, updated_by: authorId, updated_at: new Date().toISOString() },
      { onConflict: 'client_id,note_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Supprime l'annotation d'un jour.
 * @param {{ clientId: string, dateStr: string }}
 */
export async function deleteCalendarNote({ clientId, dateStr }) {
  const { error } = await supabase
    .from('calendar_notes')
    .delete()
    .eq('client_id', clientId)
    .eq('note_date', dateStr)
  if (error) throw error
}
