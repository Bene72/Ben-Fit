import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/invoiceUtils'
import InvoicePDF from '../billing/InvoicePDF'

export default function BillingCockpit({ coachId }) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSessions, setSelectedSessions] = useState([])
  const [showPDF, setShowPDF] = useState(false)
  const [generatedInvoice, setGeneratedInvoice] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newHours, setNewHours] = useState('')
  const [newRate, setNewRate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Charger les clients
  const loadClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'client')
      .order('full_name')
    setClients(data || [])
  }

  // Charger les sessions non facturées d'un client
  const loadSessions = async (clientId) => {
    const { data } = await supabase
      .from('billable_sessions')
      .select('*')
      .eq('client_id', clientId)
      .is('invoice_id', null)
      .order('date', { ascending: false })
    setSessions(data || [])
  }

  // Ajouter une session
  const addSession = async () => {
    if (!selectedClient) return
    if (!newHours || !newRate) {
      alert('Veuillez renseigner le nombre d\'heures et le taux horaire')
      return
    }
    
    const { error } = await supabase.from('billable_sessions').insert({
      coach_id: coachId,
      client_id: selectedClient.id,
      date: new Date().toISOString().split('T')[0],
      hours: parseFloat(newHours),
      hourly_rate: parseFloat(newRate),
      description: `Coaching - ${newHours}h`
    })
    
    if (error) {
      alert('Erreur: ' + error.message)
      return
    }
    
    setNewHours('')
    setNewRate('')
    setShowAddForm(false)
    loadSessions(selectedClient.id)
  }

  // Supprimer une session
  const deleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette session ?')) return
    await supabase.from('billable_sessions').delete().eq('id', sessionId)
    loadSessions(selectedClient.id)
  }

  // Générer la facture
  const generateInvoice = async () => {
    if (selectedSessions.length === 0) {
      alert('Sélectionne au moins une session')
      return
    }
    
    setLoading(true)
    
    const subtotal = selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0)
    const taxAmount = subtotal * 0.2
    const total = subtotal + taxAmount
    
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000)
    const invoiceNumber = `FACT-${year}${month}-${random}`
    
    // Créer la facture
    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      coach_id: coachId,
      client_id: selectedClient.id,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax_rate: 20,
      tax_amount: taxAmount,
      total,
      notes: `Prestations pour ${selectedClient.full_name}`
    }).select().single()
    
    if (invError) {
      alert('Erreur création facture: ' + invError.message)
      setLoading(false)
      return
    }
    
    // Ajouter les lignes
    for (const session of selectedSessions) {
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: session.description || `Coaching - ${session.hours}h`,
        quantity: session.hours,
        unit_price: session.hourly_rate,
        total: session.hours * session.hourly_rate,
        session_id: session.id
      })
      
      // Marquer la session comme facturée
      await supabase.from('billable_sessions').update({ invoice_id: invoice.id }).eq('id', session.id)
    }
    
    // Charger les infos coach
    const { data: coach } = await supabase.from('coach_billing_info').select('*').eq('coach_id', coachId).single()
    setCoachInfo(coach)
    setGeneratedInvoice(invoice)
    setShowPDF(true)
    setLoading(false)
  }

  // Charger les clients au début
  useEffect(() => {
    loadClients()
  }, [])

  // Affichage du PDF
  if (showPDF && generatedInvoice) {
    const items = selectedSessions.map(s => ({
      description: s.description || `Coaching - ${s.hours}h`,
      quantity: s.hours,
      unit_price: s.hourly_rate,
      total: s.hours * s.hourly_rate
    }))
    
    const clientInfo = {
      profiles: { full_name: selectedClient?.full_name },
      company_name: null,
      address: null,
      city: null,
      postal_code: null
    }
    
    return (
      <div>
        <button 
          onClick={() => {
            setShowPDF(false)
            setSelectedSessions([])
            setSelectedClient(null)
            setSessions([])
          }} 
          style={{ marginBottom: 16, padding: '8px 16px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          ← Nouvelle facture
        </button>
        <div id="invoice-print">
          <InvoicePDF 
            invoice={generatedInvoice}
            coachInfo={coachInfo || { 
              company_name: 'BEN&FITNESS', 
              siret: '91947704200015', 
              address: '27 Rue de Coulmiers', 
              city: 'Nantes', 
              postal_code: '44000',
              country: 'France',
              iban: 'FR76 17906 00112 00060490772 82',
              bic: 'AGRIFRPP879'
            }}
            clientInfo={clientInfo}
            items={items}
          />
        </div>
        <button 
          onClick={() => window.print()} 
          style={{ marginTop: 16, padding: '10px 20px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          🖨️ Exporter PDF
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, marginBottom: 8, color: '#0D1B4E' }}>💰 Générer une facture</h2>
      <p style={{ color: '#6B7A99', marginBottom: 24 }}>Sélectionne un client, ajoute ses heures, puis génère la facture.</p>
      
      {/* Étape 1 : Sélection client */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0D1B4E' }}>1. Choisir le client</label>
        <select 
          onChange={async (e) => {
            const client = clients.find(c => c.id === e.target.value)
            setSelectedClient(client)
            setSelectedSessions([])
            if (client) {
              await loadSessions(client.id)
            } else {
              setSessions([])
            }
          }}
          value={selectedClient?.id || ''}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #C5D0F0', fontSize: 14 }}
        >
          <option value="">-- Sélectionner un client --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>
      
      {/* Étape 2 : Ajouter des heures */}
      {selectedClient && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0D1B4E' }}>2. Ajouter des heures à facturer</label>
          
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)} 
              style={{ padding: '10px 16px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              + Ajouter des heures
            </button>
          ) : (
            <div style={{ background: '#F0F4FF', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <input 
                  type="number" 
                  step="0.5"
                  placeholder="Nombre d'heures"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #C5D0F0' }}
                />
                <input 
                  type="number" 
                  step="5"
                  placeholder="Taux horaire (€)"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #C5D0F0' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addSession} style={{ padding: '8px 16px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✓ Ajouter</button>
                <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #C5D0F0', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          )}
          
          {/* Liste des heures en attente */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#0D1B4E' }}>Heures en attente de facturation :</div>
              {sessions.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottom: '1px solid #EEF2FF' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{new Date(s.date).toLocaleDateString('fr-FR')}</span>
                    <span style={{ marginLeft: 12, color: '#6B7A99' }}>{s.hours}h à {formatPrice(s.hourly_rate)}/h</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, marginRight: 16 }}>{formatPrice(s.hours * s.hourly_rate)}</span>
                    <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', color: '#C45C3A', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Étape 3 : Sélectionner les heures pour la facture */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0D1B4E' }}>3. Sélectionner les heures à facturer</label>
          <div style={{ background: '#F8FAFF', borderRadius: 12, padding: 12 }}>
            {sessions.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={selectedSessions.some(ss => ss.id === s.id)}
                  onChange={() => {
                    if (selectedSessions.some(ss => ss.id === s.id)) {
                      setSelectedSessions(selectedSessions.filter(ss => ss.id !== s.id))
                    } else {
                      setSelectedSessions([...selectedSessions, s])
                    }
                  }}
                />
                <span>{new Date(s.date).toLocaleDateString('fr-FR')} - {s.hours}h à {formatPrice(s.hourly_rate)}/h = <strong>{formatPrice(s.hours * s.hourly_rate)}</strong></span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Étape 4 : Générer la facture */}
      {selectedSessions.length > 0 && (
        <div>
          <div style={{ background: '#EEF4FF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total HT :</span>
              <strong>{formatPrice(selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0))}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>TVA (20%) :</span>
              <strong>{formatPrice(selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0) * 0.2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #C5D0F0', paddingTop: 8, fontWeight: 700 }}>
              <span>Total TTC :</span>
              <span style={{ color: '#0D1B4E', fontSize: 18 }}>{formatPrice(selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0) * 1.2)}</span>
            </div>
          </div>
          
          <button 
            onClick={generateInvoice} 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}
          >
            {loading ? 'Génération...' : '📄 Générer la facture'}
          </button>
        </div>
      )}
    </div>
  )
}
