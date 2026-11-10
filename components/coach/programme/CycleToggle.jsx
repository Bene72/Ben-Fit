// components/coach/programme/CycleToggle.jsx
// Bascule « Cycle actuel / Cycle futur ». Extrait de ProgrammeTab.jsx.
// ── Toggle Actuel / Futur ──────────────────────────────────────
export default function CycleToggle({ mode, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--accent-dim)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {[
        { id: 'current', label: '🟢 Cycle actuel' },
        { id: 'future', label: '🔵 Cycle futur' },
      ].map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background:
              mode === id ? (id === 'future' ? 'var(--accent)' : 'var(--accent)') : 'transparent',
            color: mode === id ? 'var(--chalk)' : 'var(--chalk-dim)',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
