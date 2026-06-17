/**
 * coachHelpers.js — fonctions et styles partagés entre tous les composants
 * de l'espace coach (ProgrammeTab, OverviewTab, NutritionTab, BilanTab, etc.)
 *
 * Extrait de coach.js — aucune logique modifiée, copie exacte.
 */

// ── Dates ────────────────────────────────────────────────────────────────
export function getWeekLabel(dateStr) {
  const d = new Date(dateStr)
  const end = new Date(d); end.setDate(end.getDate() + 6)
  return `Semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

export function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

// ── Storage Supabase ─────────────────────────────────────────────────────
export function buildStoragePublicUrlFromFileName(fileName) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!fileName || !SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fileName)}`
}

// ── Constantes Bilan ─────────────────────────────────────────────────────
export const BILAN_ITEMS = [
  { key: 'sommeil',            label: '😴 Sommeil',                      hasNote: true },
  { key: 'moral',              label: '🧠 Moral',                         hasNote: true },
  { key: 'assiduite_diete',    label: '🥗 Assiduité de la diète',        hasNote: true },
  { key: 'problemes_diete',    label: '⚠️ Problèmes rencontrés (diète)', hasNote: false, noteOnly: true },
  { key: 'assiduite_training', label: '🏋️ Assiduité de l\'entraînement', hasNote: true },
  { key: 'problemes_training', label: '⚠️ Problèmes rencontrés (entraînement)', hasNote: false, noteOnly: true },
  { key: 'neat',               label: '🚶 NEAT (activité quotidienne)',   hasNote: true },
  { key: 'autre',              label: '📝 Autre point',                   hasNote: false, noteOnly: true },
]

// ── Styles partagés (form fields, boutons) ──────────────────────────────
export const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500' }
export const inp = { width: '100%', padding: '7px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
export const ci = { width: '100%', padding: '10px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '15px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
export const btn = (bg, color, border, fs) => ({ padding: `7px 14px`, background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: fs||'13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })

export function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#0D1B4E', letterSpacing: '3px' }}>CHARGEMENT…</div>
}
