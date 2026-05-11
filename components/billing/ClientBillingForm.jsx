import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const lbl = {
  display: 'block', fontSize: '11px', letterSpacing: '1.5px',
  textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500',
}

const inp = {
  width: '100%', padding: '7px 10px', border: '1.5px solid #C5D0F0',
  borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif",
  background: 'white', outline: 'none', color: '#0D1B4E',
}

const btn = (bg, color, border) => ({
  padding: '7px 14px', background: bg, color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: '8px', fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
})

export default function ClientBillingForm({ coachId, onClose, onSuccess }) {
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [loadingClients, setLoadingClients] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    vat_number: '',
    email: ''
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoadingClients(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'client')
      .order('full_name')
    setClients(data || [])
    setLoadingClients(false)
  }

  const handleSubmit = async () => {
    if (!selectedClientId) {
      alert('Veuillez sélectionner un client')
      return
    }
    
    setSaving(true)
    
    const { error } = await supabase
      .from('billing_clients')
      .insert({
        coach_id: coachId,
        client_id: selectedClientId,
        company_name: form.company_name || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        country: form.country,
        vat_number: form.vat_number || null,
        email: form.email || null
      })
    
    if (error) {
      alert('Erreur: ' + error.message)
      setSaving(false)
      return
    }
    
    onSuccess?.()
    onClose()
    setSaving(false)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: 550, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>👥 Ajouter un client facturé</h3>
        
        {/* Sélection du client */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Client *</label>
          <select 
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={inp}
            disabled={loadingClients}
          >
            <option value="">-- Sélectionner un client --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
            ))}
          </select>
        </div>
        
        {/* Infos entreprise (optionnel) */}
        {selectedClientId && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Raison sociale (optionnel)</label>
              <input 
                value={form.company_name} 
                onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="Nom de l'entreprise"
                style={inp}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Adresse</label>
              <input 
                value={form.address} 
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Adresse"
                style={inp}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Code postal</label>
                <input 
                  value={form.postal_code} 
                  onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))}
                  placeholder="Code postal"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Ville</label>
                <input 
                  value={form.city} 
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="Ville"
                  style={inp}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Email (facturation)</label>
              <input 
                value={form.email} 
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder={selectedClient?.email || "Email"}
                style={inp}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Numéro TVA (optionnel)</label>
              <input 
                value={form.vat_number} 
                onChange={e => setForm(p => ({ ...p, vat_number: e.target.value }))}
                placeholder="FRXXXXXXXXXXX"
                style={inp}
              />
            </div>
          </>
        )}
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          <button 
            onClick={handleSubmit} 
            disabled={!selectedClientId || saving}
            style={btn(!selectedClientId ? '#CCC' : '#0D1B4E', 'white')}
          >
            {saving ? 'Ajout...' : '✓ Ajouter le client'}
          </button>
        </div>
      </div>
    </div>
  )
}
