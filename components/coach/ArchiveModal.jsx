import { useState } from 'react'
import { S, font, bebas } from '../../lib/coachDashboard/shared'

export default function ArchiveModal({ client, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    setLoading(true)
    await onConfirm(client.id)
    setLoading(false)
    onClose()
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,78,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 60px rgba(13,27,78,0.2)',
        }}
      >
        <div
          style={{
            fontFamily: bebas,
            fontSize: 22,
            color: S.navy,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          📦 ARCHIVER {client.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, marginBottom: 24 }}>
          Le profil de <strong>{client.name}</strong> sera déplacé dans l'onglet{' '}
          <strong>Anciens clients</strong>.<br />
          Toutes ses données (programme, nutrition, bilans) sont <strong>conservées</strong>.<br />
          Tu pourras le réactiver à tout moment.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              border: `1px solid ${S.border}`,
              borderRadius: 9,
              background: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: font,
            }}
          >
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            style={{
              padding: '9px 20px',
              border: 'none',
              borderRadius: 9,
              background: S.purple,
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: font,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Archivage…' : '📦 Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
