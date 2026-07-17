import { S, font } from '../../lib/coachDashboard/shared'

export default function CoachMiniChart({ entries, field, fieldsMeta }) {
  const data = [...entries]
    .filter((e) => e[field] != null && e[field] !== 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30)
  const meta = fieldsMeta.find((f) => f.key === field)
  const color = meta?.color || S.blue
  if (data.length < 2)
    return (
      <div
        style={{
          height: 140,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: S.border,
          gap: 8,
        }}
      >
        <div style={{ fontSize: 32 }}>📉</div>
        <div style={{ fontSize: 12, color: S.muted }}>
          Pas assez de données pour tracer une courbe (2 valeurs minimum)
        </div>
      </div>
    )
  const vals = data.map((e) => +e[field])
  const min = Math.min(...vals),
    max = Math.max(...vals)
  const range = max - min || 1
  const W = 400,
    H = 140,
    PX = 12,
    PY = 14
  const pts = data.map((e, i) => [
    PX + (i / (data.length - 1)) * (W - PX * 2),
    PY + ((max - +e[field]) / range) * (H - PY * 2 - 14),
  ])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area =
    `M${pts[0][0]},${H - 14} ` +
    pts.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${pts[pts.length - 1][0]},${H - 14} Z`
  const delta = (vals[vals.length - 1] - vals[0]).toFixed(
    field === 'weight' ||
      field === 'waist' ||
      field === 'hips' ||
      field === 'chest' ||
      field === 'arm' ||
      field === 'thigh' ||
      field === 'calf' ||
      field === 'glutes'
      ? 1
      : 0
  )
  const isPos = parseFloat(delta) > 0
  const dColor = field === 'weight' ? (isPos ? S.red : S.green) : isPos ? S.gold : S.red
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`cg-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={PX}
            y1={PY + t * (H - PY * 2 - 14)}
            x2={W - PX}
            y2={PY + t * (H - PY * 2 - 14)}
            stroke={S.border}
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        <path d={area} fill={`url(#cg-${field})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 5 : 3.5}
            fill="white"
            stroke={color}
            strokeWidth="2.5"
          />
        ))}
        <text x={pts[0][0]} y={H - 1} textAnchor="middle" fontSize="9" fill={S.muted}>
          {new Date(data[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </text>
        <text x={pts[pts.length - 1][0]} y={H - 1} textAnchor="middle" fontSize="9" fill={S.muted}>
          {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          })}
        </text>
        <text x={W - PX + 3} y={PY + 3} fontSize="9" fill={color} fontWeight="700">
          {max}
        </text>
        <text x={W - PX + 3} y={H - PY - 12} fontSize="9" fill={S.muted}>
          {min}
        </text>
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <div style={{ fontSize: 11, color: S.muted }}>
          {data.length} valeurs · du{' '}
          {new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{' '}
          au{' '}
          {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: dColor }}>
          {isPos ? '+' : ''}
          {delta} {meta?.unit} sur la période
        </div>
      </div>
    </div>
  )
}
