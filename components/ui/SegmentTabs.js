/**
 * components/ui/SegmentTabs.js
 * Harmonisé avec pages/training.js : pilule active en dégradé accent
 * (au lieu d'un simple fond blanc) pour matcher .tabs/.tab.active du
 * preview. Mêmes props, même API — juste l'habillage.
 */
export default function SegmentTabs({ items = [], value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--surface-alt, #EEF1F8)',
      border: '1px solid var(--border-strong, #DCE5F3)',
      borderRadius: 13,
      padding: 4,
      gap: 4,
      boxShadow: '0 6px 18px rgba(13,27,78,0.04)',
    }}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange?.(item.value)}
            style={{
              border: 'none',
              background: active
                ? 'linear-gradient(135deg, var(--accent, #2C64E5), var(--accent-deep, #1E4FC4))'
                : 'transparent',
              color: active ? '#FFFFFF' : 'var(--muted, #6B7A99)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: active ? 800 : 700,
              cursor: 'pointer',
              boxShadow: active ? '0 8px 18px rgba(44,100,229,0.28)' : 'none',
              fontFamily: "'DM Sans',sans-serif",
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
