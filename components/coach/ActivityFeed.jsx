import { timeAgo, S, font, bebas, mono } from '../../lib/coachDashboard/shared'

const SIGNAL_ICON = { log: '💪', message: '💬', bilan: '📈', session: '✅' }

export default function ActivityFeed({ items, loading, onSelect }) {
  return (
    <div
      style={{
        background: S.navy,
        borderRadius: 16,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${S.gold}30, transparent 70%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          position: 'relative',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: S.gold,
            boxShadow: `0 0 0 3px ${S.gold}30`,
            animation: 'signalPulse 2s ease-in-out infinite',
          }}
        />
        <div style={{ fontFamily: bebas, fontSize: 14, color: 'white', letterSpacing: 2 }}>
          SIGNAL
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            fontFamily: mono,
            marginLeft: 'auto',
          }}
        >
          LIVE
        </div>
      </div>
      <style>{`@keyframes signalPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      {loading ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', padding: '8px 0' }}>
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', padding: '8px 0' }}>
          Aucune activité récente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => onSelect(it.clientId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 8,
                width: '100%',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{SIGNAL_ICON[it.type] || '•'}</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <b style={{ color: 'white' }}>{it.clientName}</b> {it.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: S.gold,
                  fontFamily: mono,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {timeAgo(it.at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
