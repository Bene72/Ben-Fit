import { S, font } from '../../lib/coachDashboard/shared'

export default function Badge({ text, color, bg }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 20,
        background: bg || `${color}18`,
        color,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {text}
    </span>
  )
}

