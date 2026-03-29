const tones = {
  default: {
    bg: '#F3F6FB',
    fg: '#6B7A99',
    border: '#E2E8F3',
  },
  accent: {
    bg: '#E9F0FF',
    fg: '#2C64E5',
    border: '#D5E3FF',
  },
  success: {
    bg: '#EBF8EF',
    fg: '#16804A',
    border: '#CDEED8',
  },
  warning: {
    bg: '#FFF5E6',
    fg: '#C78310',
    border: '#F6E0B8',
  },
}

export default function StatusBadge({ children, tone = 'default' }) {
  const t = tones[tone] || tones.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
