/**
 * lib/coachShared.js
 * Source  unique de vérité pour tous les helpers partagés de l'espace coach.
 *
 * Remplace coachHelpers.jsx ET coachUtils.js — les deux fichiers exportaient
 * les mêmes constantes (lbl, inp, btn, ci, getWeekLabel, getMondayOfWeek)
 * avec de légères variantes. Ce fichier unifie tout.
 *
 * Migration :
 *   import { ... } from '../../lib/coachHelpers'  →  import { ... } from '../../lib/coachShared'
 *   import { ... } from '../../lib/coachUtils'    →  import { ... } from '../../lib/coachShared'
 */

import { supabase } from './supabase'
import { DAYS_FR, getWeekLabelLong, getMondayOfWeekString } from './dateUtils'

// ─── Constantes jours ────────────────────────────────────────────────────────
export const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export { DAYS_FR }

// ─── Env (côté client uniquement) ────────────────────────────────────────────
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ─── Styles partagés ─────────────────────────────────────────────────────────
export const lbl = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#6B7A99',
  marginBottom: '5px',
  fontWeight: '500',
}

export const inp = {
  width: '100%',
  padding: '7px 10px',
  border: '1.5px solid #C5D0F0',
  borderRadius: '7px',
  fontSize: '13px',
  fontFamily: "'DM Sans',sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E',
}

// ⚠️ AJOUT : coachInputStyle (alias de inp pour compatibilité)
export const coachInputStyle = inp

export const ci = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #C5D0F0',
  borderRadius: '8px',
  fontSize: '15px',
  fontFamily: "'DM Sans',sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E',
}

export const btn = (bg, color, border, fs) => ({
  padding: '7px 14px',
  background: bg,
  color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: '8px',
  fontSize: fs || '13px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
})

/** Boutons avec variant nommé — primary | outline | ghost | danger */
export const btnVariant = (variant) => {
  const map = {
    primary: { background: '#0D1B4E', color: 'white', border: 'none' },
    outline: { background: 'transparent', color: '#0D1B4E', border: '1.5px solid #0D1B4E' },
    ghost: { background: 'transparent', color: '#6B7A99', border: 'none' },
    danger: { background: '#C45C3A', color: 'white', border: 'none' },
  }
  return {
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    transition: 'all 0.15s',
    ...(map[variant] ?? map.primary),
  }
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * Retourne "Semaine du 2 juin au 8 juin" à partir d'une date ISO (lundi de semaine).
 * Utilisé dans BilanTab et NutritionTab.
 */
export function getWeekLabel(dateStr) {
  return getWeekLabelLong(dateStr)
}

/** Retourne la date du lundi de la semaine contenant `date`, format YYYY-MM-DD. */
export function getMondayOfWeek(date = new Date()) {
  return getMondayOfWeekString(date)
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/** URL publique d'une image d'exercice dans le bucket exercise-images. */
export function buildStoragePublicUrl(fileName) {
  if (!fileName || !SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fileName)}`
}

// ─── Stats client (OverviewTab) ──────────────────────────────────────────────

export function sessionsThisWeek(client) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  return (client.workout_sessions || []).filter((s) => new Date(s.date) >= weekStart).length
}

export function lastWeight(client) {
  const m = (client.measures || []).sort((a, b) => new Date(b.date) - new Date(a.date))
  return m[0]?.weight || '—'
}

// ─── Constantes Bilan ────────────────────────────────────────────────────────
export const BILAN_ITEMS = [
  { key: 'sommeil', label: '😴 Sommeil', hasNote: true },
  { key: 'moral', label: '🧠 Moral', hasNote: true },
  { key: 'assiduite_diete', label: '🥗 Assiduité de la diète', hasNote: true },
  {
    key: 'problemes_diete',
    label: '⚠️ Problèmes rencontrés (diète)',
    hasNote: false,
    noteOnly: true,
  },
  { key: 'assiduite_training', label: "🏋️ Assiduité de l'entraînement", hasNote: true },
  {
    key: 'problemes_training',
    label: '⚠️ Problèmes rencontrés (entraînement)',
    hasNote: false,
    noteOnly: true,
  },
  { key: 'neat', label: '🚶 NEAT (activité quotidienne)', hasNote: true },
  { key: 'autre', label: '📝 Autre point', hasNote: false, noteOnly: true },
]

// ─── Edge function helper ─────────────────────────────────────────────────────

/**
 * Appel une Supabase Edge Function avec le token de session courant.
 * @param {string} name  - Nom de la fonction (ex: 'generate-programme')
 * @param {object} body  - Corps JSON
 */
export async function callEdgeFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
  return json
}

// LoadingScreen a été retiré (jamais importé nulle part) — utiliser
// components/ui/LoadingSpinner à la place (<LoadingSpinner full />).
