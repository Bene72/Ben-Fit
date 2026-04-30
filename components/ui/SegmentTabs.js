export default function SegmentTabs({ items = [], value, onChange }) {
  return (
    <div style={{ 
      display: 'inline-flex', 
      background: 'rgba(255,255,255,0.85)', 
      border: '1px solid #DCE5F3', 
      borderRadius: 12, 
      padding: 3, 
      gap: 3, 
      boxShadow: '0 6px 18px rgba(13,27,78,0.04)' 
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
              background: active ? '#FFFFFF' : 'transparent', 
              color: active ? '#0D1B4E' : '#6B7A99', 
              borderRadius: 9, 
              padding: '7px 11px', 
              fontSize: 12, 
              fontWeight: active ? 800 : 700, 
              cursor: 'pointer', 
              boxShadow: active ? '0 4px 14px rgba(13,27,78,0.06)' : 'none', 
              fontFamily: "'DM Sans',sans-serif" 
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
