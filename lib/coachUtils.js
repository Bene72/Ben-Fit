// ─── Imports ─────────────────────────────────────────────────
import { supabase } from './supabase'

// ─── Constantes partagées ────────────────────────────────────
export const DAYS     = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const DAYS_FR  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function formatLocalDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseLocalDate(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  return new Date(year, month - 1, day)
}

// ─── Style helpers ────────────────────────────────────────────
export const lbl = {
  display: 'block', fontSize: '11px', letterSpacing: '1.5px',
  textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500',
}
export const inp = {
  width: '100%', padding: '7px 10px', border: '1.5px solid #C5D0F0',
  borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif",
  background: 'white', outline: 'none', color: '#0D1B4E',
}
export const ci = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #C5D0F0',
  borderRadius: '8px', fontSize: '15px', fontFamily: "'DM Sans',sans-serif",
  background: 'white', outline: 'none', color: '#0D1B4E',
}
export const btn = (bg, color, border, fs) => ({
  padding: '7px 14px', background: bg, color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: '8px', fontSize: fs || '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
})

// ─── Stats client ─────────────────────────────────────────────
export function sessionsThisWeek(client) {
  const weekStart = getMondayOfWeek()
  return (client.workout_sessions || []).filter(s => String(s.date || '') >= weekStart).length
}

export function lastWeight(client) {
  const m = [...(client.measures || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return m[0]?.weight || '—'
}

export function getWeekLabel(dateStr) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return formatLocalDate(d)
}

// ─── Edge function helper ─────────────────────────────────────
export async function callEdgeFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Session expirée. Reconnecte-toi puis réessaie.')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Configuration Supabase manquante.')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
  return json
}

export function buildStoragePublicUrl(fileName) {
  if (!SUPABASE_URL) return ''
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fileName)}`
}
