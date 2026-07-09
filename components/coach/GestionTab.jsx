/**
 * GestionTab — paramètres et suppression d'un client
 */
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ── Appel sécurisé d'une Edge Function Supabase ────────────────────────────
async function callEdgeFunction(functionName, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session expirée, reconnecte-toi.')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Erreur lors de l\'appel')
  return result
}

function GestionTab({ client, onDelete }) {
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: 800, color: '#0D1B4E', marginBottom: '24px' }}>
        Gestion — {client.full_name?.toUpperCase()}
      </div>

      <div style={{ background: '#FFFBEE', border: '1px solid #FFD97D', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: '#0D1B4E' }}>🔑 Réinitialisation du mot de passe</div>
        <div style={{ fontSize: '13px', color: '#8A8070', marginBottom: '16px' }}>
          Envoie un email à <strong>{client.email}</strong> avec un lien pour choisir un nouveau mot de passe.
        </div>
        {resetDone ? (
          <div style={{ background: '#EEF6EE', border: '1px solid #A5C4A5', borderRadius: '8px', padding: '10px 14px', color: '#3F7D58', fontSize: '13px', fontWeight: '700' }}>
            ✅ Email envoyé à {client.email}
          </div>
        ) : (
          <button onClick={resetPassword} disabled={resetting} style={{ padding: '9px 20px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {resetting ? 'Envoi…' : '📧 Envoyer le lien de réinitialisation'}
          </button>
        )}
      </div>

      <div style={{ background: 'rgba(196,92,58,0.05)', border: '1px solid rgba(196,92,58,0.3)', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: '#C45C3A' }}>🗑 Supprimer le compte client</div>
        <div style={{ fontSize: '13px', color: '#8A8070', marginBottom: '16px' }}>
          Supprime définitivement le compte de <strong>{client.full_name}</strong> — toutes ses données (programme, nutrition, messages, bilans) seront effacées. <strong>Action irréversible.</strong>
        </div>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ padding: '9px 20px', background: 'rgba(196,92,58,0.1)', color: '#C45C3A', border: '1.5px solid #C45C3A', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            🗑 Supprimer {client.full_name?.split(' ')[0]}
          </button>
        ) : (
          <div style={{ background: 'rgba(196,92,58,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(196,92,58,0.3)' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#C45C3A', marginBottom: '12px' }}>
              ⚠️ Confirmer la suppression de {client.full_name} ?
            </div>
            {deleteError && (
              <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', color: '#C45C3A', fontSize: 12, marginBottom: 10 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={deleteClient} disabled={deleting} style={{ padding: '9px 20px', background: '#C45C3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: deleting ? 'default' : 'pointer', fontFamily: "'DM Sans',sans-serif", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Suppression…' : '✓ Oui, supprimer définitivement'}
              </button>
              <button onClick={() => { setConfirmDelete(false); setDeleteError('') }} style={{ padding: '9px 16px', background: 'transparent', color: '#8A8070', border: '1px solid #E8E4DC', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
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
