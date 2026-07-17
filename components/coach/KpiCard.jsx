import { S, font, mono } from '../../lib/coachDashboard/shared'

export default function KpiCard({ icon, label, value, sub, accent = S.navy, onClick }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(13,27,78,0.10)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 14,
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1,
        minWidth: 0,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: 26,
          color: accent,
          letterSpacing: 0.5,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: S.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginTop: 4,
        }}
      >
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

