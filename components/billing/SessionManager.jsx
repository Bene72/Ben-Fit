import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'
import { formatPrice } from '../../lib/invoiceUtils'

export default function SessionManager({ coachId, selectedClient, onGenerateInvoice }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSession, setNewSession] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 1,
    hourly_rate: 50,
    description: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedClient) {
      loadSessions()
    }
  }, [selectedClient])

  const loadSessions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('billable_sessions')
      .select('*')
      .eq('client_id', selectedClient.client_id)
      .order('date', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  const addSession = async () => {
    if (!newSession.hours || newSession.hours <= 0) {
      alert('Veuillez renseigner un nombre d\'heures valide')
      return
    }
    
    setSaving(true)
    const { error } = await supabase
      .from('billable_sessions')
      .insert({
        coach_id: coachId,
        client_id: selectedClient.client_id,
        date: newSession.date,
        hours: newSession.hours,
        hourly_rate: newSession.hourly_rate,
        description: newSession.description || null
      })
    
    if (error) {
      alert('Erreur: ' + error.message)
      setSaving(false)
      return
    }
    
    await loadSessions()
    setShowAddForm(false)
    setNewSession({
      date: new Date().toISOString().split('T')[0],
      hours: 1,
      hourly_rate: 50,
      description: ''
    })
    setSaving(false)
  }

  const deleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette session ?')) return
    
    const { error } = await supabase
      .from('billable_sessions')
      .delete()
      .eq('id', sessionId)
    
    if (error) {
      alert('Erreur: ' + error.message)
      return
    }
    
    await loadSessions()
  }

  const totalHours = sessions.reduce((sum, s) => sum + s.hours, 0)
  const totalAmount = sessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0)
  const unbilledSessions = sessions.filter(s => !s.invoice_id)
  const unbilledTotal = unbilledSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0)

  if (!selectedClient) {
    return (
      <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6B7A99' }}>
        Sélectionne un client pour voir ses sessions
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
  }

  return (
    <div>
      {/* En-tête client */}
      <div style={{ background: '#0D1B4E', borderRadius: 12, padding: 16, marginBottom: 16, color: 'white' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedClient.profiles?.full_name}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedClient.company_name || 'Particulier'}</div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={btn('#4A6FD4', 'white')}>
            + Ajouter une session
          </button>
          {unbilledSessions.length > 0 && (
            <button onClick={onGenerateInvoice} style={btn('#8FA07A', 'white')}>
              💰 Générer facture ({unbilledSessions.length} session{unbilledSessions.length > 1 ? 's' : ''})
            </button>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#6B7A99' }}>
          Total : {totalHours}h · {formatPrice(totalAmount)}
        </div>
      </div>
      
      {/* Formulaire ajout session */}
      {showAddForm && (
        <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Nouvelle session facturable</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Date</label>
              <input 
                type="date" 
                value={newSession.date} 
                onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Heures</label>
              <input 
                type="number" 
                step="0.5"
                value={newSession.hours} 
                onChange={e => setNewSession(p => ({ ...p, hours: parseFloat(e.target.value) }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Taux horaire (€)</label>
              <input 
                type="number" 
                step="5"
                value={newSession.hourly_rate} 
                onChange={e => setNewSession(p => ({ ...p, hourly_rate: parseFloat(e.target.value) }))}
                style={inp}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Description (optionnel)</label>
            <input 
              value={newSession.description} 
              onChange={e => setNewSession(p => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Séance coaching, préparation physique..."
              style={inp}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddForm(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
            <button onClick={addSession} disabled={saving} style={btn('#0D1B4E', 'white')}>
              {saving ? 'Ajout...' : '✓ Ajouter'}
            </button>
          </div>
        </div>
      )}
      
      {/* Liste des sessions */}
      {sessions.length === 0 ? (
        <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 30, textAlign: 'center', color: '#6B7A99' }}>
          Aucune session enregistrée pour ce client.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map(session => (
            <div key={session.id} style={{ 
              background: session.invoice_id ? '#F8F9FB' : 'white', 
              borderRadius: 10, 
              border: '1px solid #C5D0F0', 
              padding: 12,
              opacity: session.invoice_id ? 0.7 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7A99' }}>
                    {session.hours}h · {formatPrice(session.hourly_rate)}/h
                  </div>
                  {session.description && (
                    <div style={{ fontSize: 11, color: '#4A6FD4', marginTop: 4 }}>{session.description}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{formatPrice(session.hours * session.hourly_rate)}</div>
                  {session.invoice_id ? (
                    <span style={{ fontSize: 10, color: '#8FA07A' }}>✓ Facturé</span>
                  ) : (
                    <button 
                      onClick={() => deleteSession(session.id)}
                      style={{ fontSize: 11, background: 'transparent', border: 'none', color: '#C45C3A', cursor: 'pointer', marginTop: 4 }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Récapitulatif non facturé */}
      {unbilledSessions.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: '#EEF4FF', borderRadius: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 13 }}>À facturer : </span>
          <strong>{formatPrice(unbilledTotal)}</strong> ({unbilledSessions.length} session{unbilledSessions.length > 1 ? 's' : ''})
        </div>
      )}
    </div>
  )
}
