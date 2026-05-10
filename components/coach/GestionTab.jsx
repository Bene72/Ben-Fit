import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { callEdgeFunction } from '../../lib/coachUtils'
import { btn, lbl, inp } from '../../lib/coachUtils'

export default function GestionTab({ client, onDelete }) {
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const resetPassword = async () => {
    setResetting(true)
    await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setResetting(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 4000)
  }

  const deleteClient = async () => {
    setDeleting(true)
    try {
      await callEdgeFunction('delete-client', { client_id: client.id })
      onDelete()
    } catch(e) {
      alert('Erreur suppression : ' + e.message)
    }
    setDeleting(false)
  }

  return (
    <div style={{ maxWidth: '540px' }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: '#0D1B4E', letterSpacing: '2px', marginBottom: '24px' }}>
        GESTION — {client.full_name?.toUpperCase()}
      </div>

      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px' }}>🔑 Réinitialisation du mot de passe</div>
        <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '16px' }}>
          Envoie un email à <strong>{client.email}</strong> avec un lien pour choisir un nouveau mot de passe.
        </div>
        {resetDone ? (
          <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '8px', padding: '10px 14px', color: '#2E7D32', fontSize: '13px', fontWeight: '600' }}>
            ✅ Email envoyé à {client.email}
          </div>
        ) : (
          <button onClick={resetPassword} disabled={resetting} style={{ padding: '9px 20px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {resetting ? 'Envoi…' : '📧 Envoyer le lien de réinitialisation'}
          </button>
        )}
      </div>

      <div style={{ background: 'rgba(196,92,58,0.05)', border: '1px solid rgba(196,92,58,0.3)', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px', color: '#C45C3A' }}>🗑 Supprimer le compte client</div>
        <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '16px' }}>
          Supprime définitivement le compte de <strong>{client.full_name}</strong> — toutes ses données (programme, nutrition, messages, bilans) seront effacées. <strong>Action irréversible.</strong>
        </div>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ padding: '9px 20px', background: 'rgba(196,92,58,0.1)', color: '#C45C3A', border: '1.5px solid #C45C3A', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            🗑 Supprimer {client.full_name?.split(' ')[0]}
          </button>
        ) : (
          <div style={{ background: 'rgba(196,92,58,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(196,92,58,0.3)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#C45C3A', marginBottom: '12px' }}>
              ⚠️ Confirmer la suppression de {client.full_name} ?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={deleteClient} disabled={deleting} style={{ padding: '9px 20px', background: '#C45C3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {deleting ? 'Suppression…' : '✓ Oui, supprimer définitivement'}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: '9px 16px', background: 'transparent', color: '#6B7A99', border: '1px solid #C5D0F0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
