// components/nutrition/NutritionVisuals.jsx
// Visuels nutrition partagés entre la vue coach (components/coach/NutritionTab.jsx)
// et la vue athlète (pages/nutrition.js). Extrait à l'identique de
// NutritionTab.jsx — aucune logique changée, juste rendu réutilisable pour
// que l'onglet athlète ait le même niveau de lisibilité que côté coach.

// ─── Anneau de progression (calories / macro) ──────────────────────────────
export function NutritionRing({ value, target, label, unit, color }) {
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
          <circle stroke="#EEE" fill="transparent" strokeWidth={stroke} r={nr} cx={R} cy={R} />
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
          <div
            style={{ fontWeight: 800, fontSize: 14, color: over ? 'var(--danger)' : 'var(--navy)' }}
          >
            {value}
          </div>
          <div style={{ fontSize: 9, color: '#AAA' }}>/{target}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12, color: '#444' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#AAA' }}>{unit}</div>
    </div>
  )
}

// ─── Grille des 4 anneaux (calories/protéines/glucides/lipides) ────────────
export function NutritionRingsRow({ log, plan }) {
  const macros = [
    { key: 'calories', label: 'Calories', unit: 'kcal', color: 'var(--danger)', target: plan?.target_calories || 0 },
    { key: 'protein', label: 'Protéines', unit: 'g', color: '#2C8A6E', target: plan?.target_protein || 0 },
    { key: 'carbs', label: 'Glucides', unit: 'g', color: 'var(--gold)', target: plan?.target_carbs || 0 },
    { key: 'fat', label: 'Lipides', unit: 'g', color: '#4A6FD4', target: plan?.target_fat || 0 },
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
export function NutritionScoreBlock({ log, plan }) {
  if (!plan)
    return (
      <InfoBox bg="#FFF8E1" border="#FFD54F" color="#7B6000">
        ⚠️ Aucun plan nutritionnel défini
      </InfoBox>
    )
  if (!log || log.calories === 0)
    return (
      <InfoBox bg="#F7F7F7" border="#EAEAEA" color="#999">
        📝 Aucune donnée pour ce jour
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
  const color = score >= 80 ? '#3A7BD5' : score >= 50 ? '#2A50B0' : 'var(--danger)'

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
          background: '#F7F7F7',
          border: '1px solid #EAEAEA',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color }}>
          {score}
          <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>/100</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#333' }}>Score nutrition</div>
          <div style={{ fontSize: 11, color: '#999' }}>
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
          background: '#EEF4FF',
          border: '1px solid #B8CBF5',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, color: '#1A3580', marginBottom: 6 }}>
          Feedback
        </div>
        {feedback.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Graphe calories des 7 derniers jours ───────────────────────────────────
export function NutritionWeekGraph({ logs, plan, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
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
        background: 'white',
        border: '1px solid #EAEAEA',
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 14 }}>
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
              {d.calories > 0 && <div style={{ fontSize: 8, color: '#999' }}>{d.calories}</div>}
              <div
                style={{
                  width: '100%',
                  height: `${h}%`,
                  background: isToday ? 'var(--navy)' : '#C5CEEA',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: isToday ? 'var(--navy)' : '#999',
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
