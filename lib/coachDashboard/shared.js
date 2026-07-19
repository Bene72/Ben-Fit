// lib/coachDashboard/shared.js
// Constantes, tokens de style et helpers partagés par les composants
// du dashboard coach (extrait de pages/coach.js lors du découpage — aucune
// logique modifiée, copié tel quel).

import { dowToJS } from '../trainingUtils'

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
  if (v == null) return S.gray
  if (v >= 80) return S.green
  if (v >= 55) return '#C8A95A'
  return S.red
}

// Compare le nombre de séances programmées (workouts, récurrentes par jour de
// semaine) au nombre de séances réellement loguées (workout_sessions) sur les
// `days` derniers jours. Retourne null s'il n'y a aucun programme (pas de
// division par zéro, pas de faux "0%").
//
// Remplace l'ancien champ `profiles.compliance` qui n'était jamais alimenté
// par aucun code de l'app — ce n'était pas un bug de calcul, c'est qu'aucun
// calcul n'existait du tout.
export function computeCompliance(workouts, sessions, days = 7) {
  if (!workouts || workouts.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let expected = 0
  let actual = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const jsDay = d.getDay() // 0=Dim…6=Sam
    const dateStr = d.toISOString().split('T')[0]

    const expectedToday = workouts.filter((w) => dowToJS(w.day_of_week) === jsDay).length
    if (expectedToday === 0) continue

    const actualToday = (sessions || []).filter(
      (s) => s.date === dateStr && s.completed !== false
    ).length

    expected += expectedToday
    // On plafonne par jour pour qu'une séance bonus non prévue ne gonfle pas
    // artificiellement le score au-delà de 100%.
    actual += Math.min(actualToday, expectedToday)
  }

  if (expected === 0) return null
  return Math.round((actual / expected) * 100)
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
