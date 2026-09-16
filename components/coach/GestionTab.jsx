/**
 * GestionTab — paramètres et suppression d'un client
 */
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
// CORRECTIF AUDIT 09/09/2026 (point S2) : callEdgeFunction() était dupliqué
// ici et dans lib/coachShared.js. On utilise désormais la version unique
// de coachShared.js (qui vérifie elle aussi la présence de la session).
import { callEdgeFunction } from '../../lib/coachShared'

function GestionTab({ client, onDelete }) {
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const resetPassword = async () => {
    setResetting(true)
    await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetting(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 4000)
  }

  const deleteClient = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await callEdgeFunction('delete-client', { client_id: client.id })
      onDelete()
    } catch (e) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ maxWidth: '540px' }}>
      <div
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '20px',
          fontWeight: 800,
          color: 'var(--chalk)',
          marginBottom: '24px',
        }}
      >
        Gestion — {client.full_name?.toUpperCase()}
      </div>

      <div
        style={{
          background: 'var(--gold-dim)',
          border: '1px solid var(--gold)',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: 'var(--chalk)' }}>
          🔑 Réinitialisation du mot de passe
        </div>
        <div style={{ fontSize: '13px', color: 'var(--chalk-dim)', marginBottom: '16px' }}>
          Envoie un email à <strong>{client.email}</strong> avec un lien pour choisir un nouveau mot
          de passe.
        </div>
        {resetDone ? (
          <div
            style={{
              background: 'var(--rx-dim)',
              border: '1px solid var(--rx)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--rx)',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            ✅ Email envoyé à {client.email}
          </div>
        ) : (
          <button
            onClick={resetPassword}
            disabled={resetting}
            style={{
              padding: '9px 20px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {resetting ? 'Envoi…' : '📧 Envoyer le lien de réinitialisation'}
          </button>
        )}
      </div>

      <div
        style={{
          background: 'rgba(196,92,58,0.05)',
          border: '1px solid rgba(196,92,58,0.3)',
          borderRadius: '14px',
          padding: '24px',
        }}
      >
        <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: 'var(--danger)' }}>
          🗑 Supprimer le compte client
        </div>
        <div style={{ fontSize: '13px', color: 'var(--chalk-dim)', marginBottom: '16px' }}>
          Supprime définitivement le compte de <strong>{client.full_name}</strong> — toutes ses
          données (programme, nutrition, messages, bilans) seront effacées.{' '}
          <strong>Action irréversible.</strong>
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '9px 20px',
              background: 'var(--danger-dim)',
              color: 'var(--danger)',
              border: '1.5px solid var(--danger)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            🗑 Supprimer {client.full_name?.split(' ')[0]}
          </button>
        ) : (
          <div
            style={{
              background: 'rgba(196,92,58,0.08)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(196,92,58,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--danger)',
                marginBottom: '12px',
              }}
            >
              ⚠️ Confirmer la suppression de {client.full_name} ?
            </div>
            {deleteError && (
              <div
                style={{
                  background: 'var(--danger-dim)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--danger)',
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={deleteClient}
                disabled={deleting}
                style={{
                  padding: '9px 20px',
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: deleting ? 'default' : 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Suppression…' : '✓ Oui, supprimer définitivement'}
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false)
                  setDeleteError('')
                }}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  color: 'var(--chalk-dim)',
                  border: '1px solid var(--border-hi)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GestionTab
