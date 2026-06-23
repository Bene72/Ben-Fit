/** components/training/CompactExerciseRow.jsx */
export default function CompactExerciseRow({ exercise, selected, latestLog, onSelect, isMobile }) {
  return (
    <button type="button" onClick={onSelect} style={{
      width: '100%', textAlign: 'left',
      background: selected ? '#EEF4FF' : '#FFFFFF',
      border: selected ? '1.5px solid #2C64E5' : '1px solid #DCE5F3',
      borderRadius: isMobile ? 10 : 12, padding: isMobile ? '8px' : '12px',
      cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
      marginBottom: isMobile ? 6 : 8,
      boxShadow: selected ? '0 0 0 2px rgba(44,100,229,0.1)' : 'none',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12,
    }}>
      <div style={{ width: isMobile ? 50 : 60, height: isMobile ? 50 : 60, borderRadius: 8, overflow: 'hidden', background: '#F0F5FF', border: '1px solid #E0E8F5', flexShrink: 0 }}>
        {exercise.image_url
          ? <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 18 }}>💪</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: '#0D1B4E', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercise.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: '#2C64E5', color: 'white', borderRadius: 6 }}>{exercise.sets} × {exercise.reps}</span>
          <span style={{ fontSize: 11, padding: '3px 8px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 6, border: '1px solid #DCE5F3' }}>{exercise.rest || '—'}</span>
        </div>
      </div>
      <div style={{ color: selected ? '#2C64E5' : '#E0E0E0', fontSize: 20 }}>{selected ? '●' : '○'}</div>
    </button>
  )
}
