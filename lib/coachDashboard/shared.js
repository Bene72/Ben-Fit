// lib/coachDashboard/shared.js
// Constantes, tokens de style et helpers partagés par les composants
// du dashboard coach (extrait de pages/coach.js lors du découpage — aucune
// logique modifiée, copié tel quel).

// ─── OFFRES ───────────────────────────────────────────────────────────────────

export const OFFERS = {
  essentia_plus: {
    id: 'essentia_plus',
    name: 'Essentia Plus',
    price: 77,
    color: '#C8A95A',
    badge: '⚡',
    features: [
      'Suivi nutrition personnalisé',
      'Programme training sur mesure',
      'Bilan hebdomadaire',
      'Messages illimités',
      'Accès app Ben&Fit',
    ],
  },
  tutto_bene: {
    id: 'tutto_bene',
    name: 'Tutto Bene',
    price: 99,
    color: '#4A6FD4',
    badge: '🔥',
    features: [
      'Programme training sur mesure',
      'Bilan mensuel',
      'Messages inclus',
      'Accès app Ben&Fit',
    ],
  },
}

// ─── COULEURS POST-IT ─────────────────────────────────────────────────────────

export const NOTE_COLORS = [
  { id: 'yellow', bg: '#FFF9C4', border: '#F9E64F' },
  { id: 'blue', bg: '#DBEAFE', border: '#93C5FD' },
  { id: 'green', bg: '#D1FAE5', border: '#6EE7B7' },
  { id: 'pink', bg: '#FCE7F3', border: '#F9A8D4' },
  { id: 'orange', bg: '#FFEDD5', border: '#FED7AA' },
]

// ─── STYLES ───────────────────────────────────────────────────────────────────

export const S = {
  navy: 'var(--navy)',
  navyDeep: '#081230',
  gold: '#C8A95A',
  bg: '#F0F2F8',
  card: '#FFFFFF',
  border: '#E2E6F0',
  muted: '#6B7A99',
  green: '#3A8A5A',
  red: 'var(--danger)',
  blue: 'var(--accent)',
  gray: '#8B95A8',
  purple: '#7B6FAD',
}
export const font = "'DM Sans', system-ui, sans-serif"
export const bebas = "'Bebas Neue', 'DM Sans', sans-serif"
export const mono = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function complianceColor(v) {
  if (v >= 80) return S.green
  if (v >= 55) return '#C8A95A'
  return S.red
}

export function daysAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  return `Il y a ${diff}j`
}

export function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const start = first === 0 ? 6 : first - 1
  return Array.from({ length: start + days }, (_, i) => (i < start ? null : i - start + 1))
}

export function toClientModel(profile) {
  const nameRaw = profile.full_name || profile.name || profile.email || 'Inconnu'
  const initials =
    nameRaw
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  return {
    id: profile.id,
    name: nameRaw,
    avatar: initials,
    email: profile.email || '',
    offer: profile.offer || 'tutto_bene',
    status: profile.status || 'actif',
    archived: profile.archived || false,
    archivedAt: profile.archived_at || null,
    since: profile.created_at ? profile.created_at.split('T')[0] : '',
    nextPayment: profile.next_payment || null,
    balance: profile.balance || 0,
    weight: profile.weight || null,
    weightGoal: profile.weight_goal || null,
    compliance: profile.compliance ?? 0,
    lastBilan: profile.last_bilan || null,
    program: profile.current_program || '—',
    messages: profile.unread_messages || 0,
    objective: profile.objective || '',
    height: profile.height || null,
    notes: profile.coach_notes || [],
    _raw: profile,
  }
}

export function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 60000) // minutes
  if (diff < 1) return "à l'instant"
  if (diff < 60) return `il y a ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}
