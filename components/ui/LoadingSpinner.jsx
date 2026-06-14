/**
 * LoadingSpinner — remplace les LoadingScreen dupliquées
 * Usage : <LoadingSpinner /> ou <LoadingSpinner full /> pour plein écran
 */
export default function LoadingSpinner({ full = false, message = 'Chargement…', dark = false }) {
  if (!full) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dark ? 'rgba(255,255,255,0.5)' : 'var(--text-soft)' }}>
      <div className="spinner" style={dark ? { borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' } : {}} />
      <span style={{ fontSize: 13 }}>{message}</span>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      background: dark ? 'var(--navy)' : 'var(--bg)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div className="spinner spinner-lg" style={dark ? { borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'white' } : {}} />
      <div style={{ fontSize: 13, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.4)' : 'var(--text-soft)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
        {message}
      </div>
    </div>
  )
}
