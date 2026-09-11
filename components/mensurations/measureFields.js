// components/mensurations/measureFields.js
// Extrait de pages/mensurations.js (decoupage audit 09/09/2026, point 4) :
// utilise a la fois par pages/mensurations.js, BodyTracker.jsx et MiniChart.jsx.
export const MEASURE_FIELDS = [
  { key: 'weight', label: 'Poids', unit: 'kg', icon: '⚖️', color: 'var(--danger)', required: true },
  { key: 'waist', label: 'Tour de taille', unit: 'cm', icon: '📏', color: '#4A6FD4' },
  { key: 'hips', label: 'Tour de hanches', unit: 'cm', icon: '📏', color: '#8FA07A' },
  { key: 'glutes', label: 'Tour de fesses', unit: 'cm', icon: '📏', color: '#9B7BB8' },
  { key: 'chest', label: 'Tour de poitrine', unit: 'cm', icon: '📏', color: '#D4A017' },
  { key: 'arm', label: 'Tour de bras', unit: 'cm', icon: '💪', color: '#2C8A6E' },
  { key: 'thigh', label: 'Tour de cuisse', unit: 'cm', icon: '📏', color: 'var(--danger)' },
  { key: 'calf', label: 'Tour de mollet', unit: 'cm', icon: '📏', color: '#4A6FD4' },
]
