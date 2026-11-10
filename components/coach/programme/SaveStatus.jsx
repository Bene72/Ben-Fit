// components/coach/programme/SaveStatus.jsx
// Petit indicateur discret « Enregistrement… / Enregistré ✓ » du programme.
import { useEffect, useState } from 'react'

const LABELS = {
  pending: { text: 'Modifications en cours…', color: 'var(--chalk-dim)' },
  saving: { text: 'Enregistrement…', color: 'var(--chalk-dim)' },
  saved: { text: 'Enregistré ✓', color: 'var(--rx)' },
  error: { text: "⚠️ Échec de l'enregistrement — vérifie ta connexion", color: 'var(--danger)' },
}

export default function SaveStatus({ status }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (status === 'idle') return
    setVisible(true)
    if (status === 'saved') {
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
  }, [status])
  const l = LABELS[status]
  if (!visible || !l) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 50,
        background: 'var(--bg-card-2)',
        border: '1px solid var(--border-hi)',
        borderRadius: 999,
        padding: '7px 14px',
        fontSize: 12.5,
        fontWeight: 700,
        color: l.color,
        boxShadow: '0 8px 24px rgba(0,0,0,.3)',
      }}
    >
      {l.text}
    </div>
  )
}
