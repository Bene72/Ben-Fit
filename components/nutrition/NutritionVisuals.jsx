// components/nutrition/NutritionVisuals.jsx
// Visuels nutrition partagés entre la vue coach (components/coach/NutritionTab.jsx)
// et la vue athlète (pages/nutrition.js).
//
// `variant` : 'client' (thème clair, défaut) ou 'coach' (thème sombre du
// cockpit). Avant le 10/11/2026, NutritionTab.jsx en gardait une copie
// complète ne différant que par les couleurs.

import { addDaysISO, parseLocalDate } from '../../lib/dateUtils'

const THEMES = {
  client: {
    track: '#EEE',
    strong: 'var(--navy)',
    text: '#333',
    textSoft: '#444',
    textBody: '#555',
    muted: '#999',
    faint: '#AAA',
    panelBg: '#F7F7F7',
    panelBorder: '#EAEAEA',
    cardBg: 'white',
    feedbackBg: '#EEF4FF',
    feedbackBorder: '#B8CBF5',
    feedbackTitle: '#1A3580',
    scoreGood: '#3A7BD5',
    scoreMid: '#2A50B0',
    barToday: 'var(--navy)',
    bar: '#C5CEEA',
    warnBg: '#FFF8E1',
    warnBorder: '#FFD54F',
    warnText: '#7B6000',
    noPlan: '⚠️ Aucun plan nutritionnel défini',
    noData: '📝 Aucune donnée pour ce jour',
  },
  coach: {
    track: 'var(--chalk-dim)',
    strong: 'var(--chalk)',
    text: 'var(--chalk)',
    textSoft: 'var(--chalk)',
    textBody: 'var(--chalk)',
    muted: 'var(--chalk-dim)',
    faint: 'var(--chalk-dim)',
    panelBg: 'var(--bg-card-2)',
    panelBorder: 'var(--border)',
    cardBg: 'var(--bg-card)',
    feedbackBg: 'var(--accent-dim)',
    feedbackBorder: 'var(--accent-brd)',
    feedbackTitle: 'var(--chalk)',
    scoreGood: 'var(--accent)',
    scoreMid: 'var(--accent)',
    barToday: 'var(--accent)',
    bar: 'var(--border-hi)',
    warnBg: 'var(--gold-dim)',
    warnBorder: 'var(--gold)',
    warnText: 'var(--gold)',
    noPlan: '⚠️ Aucun plan nutritionnel défini pour ce client',
    noData: "📝 Aucune donnée pour aujourd'hui",
  },
}
const themeOf = (variant) => THEMES[variant] || THEMES.client

// ─── Anneau de progression (calories / macro) ──────────────────────────────
export function NutritionRing({ value, target, label, unit, color, variant }) {
  const t = themeOf(variant)
  const percent = target ? Math.min(100, (value / target) * 100) : 0
  const over = percent >= 100
  const R = 42,
    stroke = 7,
    nr = R - stroke * 2
  const circ = nr * 2 * Math.PI
  const offset = circ - (percent / 100) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg height={R * 2} width={R * 2} style={{ transform: 'rotate(-90deg)' }}>
          <circle stroke={t.track} fill="transparent" strokeWidth={stroke} r={nr} cx={R} cy={R} />
          <circle
            stroke={over ? 'var(--danger)' : color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circ} ${circ}`}
            style={{
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s',
              strokeLinecap: 'round',
            }}
            r={nr}
            cx={R}
            cy={R}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, color: over ? 'var(--danger)' : t.strong }}>
            {value}
          </div>
          <div style={{ fontSize: 9, color: t.faint }}>/{target}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12, color: t.textSoft }}>{label}</div>
      <div style={{ fontSize: 10, color: t.faint }}>{unit}</div>
    </div>
  )
}

// ─── Grille des 4 anneaux (calories/protéines/glucides/lipides) ────────────
// Palette harmonisée avec le reste de l'appli (bleu marine → bleu pastel),
// à la place de l'ancien dégradé rouge/vert/or/bleu. L'alerte "dépassement"
// (over) reste en var(--danger) : c'est un signal fonctionnel, pas une
// couleur décorative, donc on la garde pour ne pas perdre l'info.
export function NutritionRingsRow({ log, plan }) {
  const macros = [
    {
      key: 'calories',
      label: 'Calories',
      unit: 'kcal',
      color: '#0D1B4E',
      target: plan?.target_calories || 0,
    },
    {
      key: 'protein',
      label: 'Protéines',
      unit: 'g',
      color: '#2C64E5',
      target: plan?.target_protein || 0,
    },
    {
      key: 'carbs',
      label: 'Glucides',
      unit: 'g',
      color: '#4A6FD4',
      target: plan?.target_carbs || 0,
    },
    { key: 'fat', label: 'Lipides', unit: 'g', color: '#8FADE8', target: plan?.target_fat || 0 },
  ]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8,
        justifyItems: 'center',
      }}
    >
      {macros.map((m) => (
        <NutritionRing
          key={m.key}
          value={log?.[m.key] || 0}
          target={m.target}
          label={m.label}
          unit={m.unit}
          color={m.color}
        />
      ))}
    </div>
  )
}

// ─── Score du jour (0-100) + feedback textuel ───────────────────────────────
export function NutritionScoreBlock({ log, plan, variant }) {
  const t = themeOf(variant)
  if (!plan)
    return (
      <InfoBox bg={t.warnBg} border={t.warnBorder} color={t.warnText}>
        {t.noPlan}
      </InfoBox>
    )
  if (!log || log.calories === 0)
    return (
      <InfoBox bg={t.panelBg} border={t.panelBorder} color={t.muted}>
        {t.noData}
      </InfoBox>
    )

  const targets = [
    plan.target_calories || 0,
    plan.target_protein || 0,
    plan.target_carbs || 0,
    plan.target_fat || 0,
  ]
  const keys = ['calories', 'protein', 'carbs', 'fat']
  const score = Math.min(
    100,
    Math.round(
      (keys.reduce(
        (acc, k, i) => acc + (targets[i] ? Math.min(1, (log[k] || 0) / targets[i]) : 0),
        0
      ) /
        4) *
        100
    )
  )
  const color = score >= 80 ? t.scoreGood : score >= 50 ? t.scoreMid : 'var(--danger)'

  const feedback = []
  if ((log.protein || 0) < (plan.target_protein || 0)) feedback.push('💪 Augmente les protéines')
  if ((log.calories || 0) < (plan.target_calories || 0) * 0.8)
    feedback.push('⚡ Trop bas en calories')
  if ((log.carbs || 0) < (plan.target_carbs || 0) * 0.8) feedback.push('🌾 Manque de glucides')
  if ((log.fat || 0) < (plan.target_fat || 0) * 0.7) feedback.push('🥑 Lipides bas')
  if (feedback.length === 0) feedback.push('✅ Objectifs atteints !')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: t.panelBg,
          border: `1px solid ${t.panelBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color }}>
          {score}
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 400 }}>/100</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: t.text }}>Score nutrition</div>
          <div style={{ fontSize: 11, color: t.muted }}>
            {score >= 80
              ? '🟢 Excellente journée'
              : score >= 50
                ? '🟡 Peut mieux faire'
                : '🔴 Objectifs non atteints'}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: t.feedbackBg,
          border: `1px solid ${t.feedbackBorder}`,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, color: t.feedbackTitle, marginBottom: 6 }}>
          Feedback
        </div>
        {feedback.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: t.textBody, marginBottom: 2 }}>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Graphe calories des 7 derniers jours ───────────────────────────────────
export function NutritionWeekGraph({ logs, plan, today, variant }) {
  const t = themeOf(variant)
  const days = Array.from({ length: 7 }, (_, i) => {
    const ds = addDaysISO(today, i - 6)
    const d = parseLocalDate(ds)
    const log = logs.find((l) => l.date === ds)
    return {
      date: ds,
      calories: log?.calories || 0,
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2),
    }
  })
  const max = Math.max(...days.map((d) => d.calories), plan?.target_calories || 1)
  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: t.cardBg,
        border: `1px solid ${t.panelBorder}`,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 14 }}>
        📈 Calories — 7 derniers jours
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
        {days.map((d, i) => {
          const h = max ? Math.max((d.calories / max) * 100, 2) : 2
          const isToday = d.date === today
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {d.calories > 0 && <div style={{ fontSize: 8, color: t.muted }}>{d.calories}</div>}
              <div
                style={{
                  width: '100%',
                  height: `${h}%`,
                  background: isToday ? t.barToday : t.bar,
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: isToday ? t.strong : t.muted,
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {d.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoBox({ bg, border, color, children }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        marginBottom: 16,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 13, color }}>{children}</span>
    </div>
  )
}
