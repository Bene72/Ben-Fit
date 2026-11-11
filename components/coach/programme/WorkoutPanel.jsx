// components/coach/programme/WorkoutPanel.jsx
// Panneau latéral d'édition d'une séance (vue Semaine). Réutilise la carte
// séance complète (WorkoutCard) : mêmes fonctions qu'avant (jour, renommage,
// exercices, blocs, supersets…), juste présentée à côté du planning.
import { useEffect } from 'react'

export default function WorkoutPanel({ open, isMobile, onClose, children, title }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 150 }}
      />
      <aside
        role="dialog"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? '100%' : 'min(620px, 92vw)',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          zIndex: 151,
          overflowY: 'auto',
          padding: isMobile ? 14 : 20,
          boxShadow: '-20px 0 50px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'var(--chalk-dim)',
            }}
          >
            Modifier la séance
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--chalk)',
              borderRadius: 10,
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
            }}
          >
            ✕ Fermer
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}
