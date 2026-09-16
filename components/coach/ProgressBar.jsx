// Aucune dépendance externe

export default function ProgressBar({ value, color, height = 5 }) {
  return (
    <div
      style={{ height, background: 'var(--bg-card-2)', borderRadius: 99, overflow: 'hidden', width: '100%' }}
    >
      <div
        style={{
          width: `${Math.min(100, value)}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
        }}
      />
    </div>
  )
}

