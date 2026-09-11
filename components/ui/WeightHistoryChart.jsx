/**
 * components/ui/WeightHistoryChart.jsx
 * Courbe SVG légère (aucune dépendance externe), inspirée du composant
 * MiniChart déjà utilisé côté client dans pages/dashboard.js — même style
 * visuel, mêmes conventions (dégradé sous la courbe, points, delta sur la
 * période), mais autonome pour ne pas risquer de casser le tableau de bord
 * client en le retouchant. À terme, les deux pourraient fusionner dans un
 * composant partagé unique (voir CHANGELOG-ROUND2.md sur la duplication).
 */
export default function WeightHistoryChart({ measures }) {
  const data = [...measures]
    .filter((m) => m.weight != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30)

  if (data.length < 2) {
    return (
      <div
        style={{
          height: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-faint)',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 28 }}>📉</div>
        <div style={{ fontSize: 12 }}>Ajoute au moins 2 pesées pour voir la courbe</div>
      </div>
    )
  }

  const color = 'var(--danger)'
  const vals = data.map((m) => +m.weight)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 400,
    H = 140,
    PX = 12,
    PY = 14

  const pts = data.map((m, i) => [
    PX + (i / (data.length - 1)) * (W - PX * 2),
    PY + ((max - +m.weight) / range) * (H - PY * 2 - 14),
  ])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area =
    `M${pts[0][0]},${H - 14} ` +
    pts.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${pts[pts.length - 1][0]},${H - 14} Z`

  const delta = (vals[vals.length - 1] - vals[0]).toFixed(1)
  const isPos = parseFloat(delta) > 0
  const deltaColor = isPos ? 'var(--danger)' : 'var(--success)'

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }}>
        <defs>
          <linearGradient id="g-coach-weight" x1="0" y1="0" x2="0" y2="1">
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
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        <path d={area} fill="url(#g-coach-weight)" />
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
        <text x={pts[0][0]} y={H - 1} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
          {new Date(data[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </text>
        <text
          x={pts[pts.length - 1][0]}
          y={H - 1}
          textAnchor="middle"
          fontSize="9"
          fill="var(--text-faint)"
        >
          {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          })}
        </text>
        <text x={W - PX + 3} y={PY + 3} fontSize="9" fill={color} fontWeight="700">
          {max}
        </text>
        <text x={W - PX + 3} y={H - PY - 12} fontSize="9" fill="var(--text-faint)">
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
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {data.length} pesées · du{' '}
          {new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{' '}
          au{' '}
          {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: deltaColor }}>
          {isPos ? '+' : ''}
          {delta} kg sur la période
        </div>
      </div>
    </div>
  )
}
