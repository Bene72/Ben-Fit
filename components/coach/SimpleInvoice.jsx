import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/invoiceUtils'
import InvoicePDF from '../billing/InvoicePDF'

export default function SimpleInvoice({ coachId }) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSessions, setSelectedSessions] = useState([])
  const [showPDF, setShowPDF] = useState(false)
  const [generatedInvoice, setGeneratedInvoice] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)
  const [loading, setLoading] = useState(false)

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
    setSessions(data || [])
  }

  // Ajouter une session
  const addSession = async () => {
    if (!selectedClient) return
    const hours = prompt('Nombre d\'heures :')
    if (!hours) return
    const rate = prompt('Taux horaire (€) :')
    if (!rate) return
    
    await supabase.from('billable_sessions').insert({
      coach_id: coachId,
      client_id: selectedClient.id,
      date: new Date().toISOString().split('T')[0],
      hours: parseFloat(hours),
      hourly_rate: parseFloat(rate)
    })
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
    
    const invoiceNumber = `FACT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`
    
    // Créer la facture
    const { data: invoice } = await supabase.from('invoices').insert({
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
    
    // Ajouter les lignes
    for (const session of selectedSessions) {
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: `Coaching - ${session.hours}h`,
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

  if (showPDF && generatedInvoice) {
    const items = selectedSessions.map(s => ({
      description: `Coaching - ${s.hours}h`,
      quantity: s.hours,
      unit_price: s.hourly_rate,
      total: s.hours * s.hourly_rate
    }))
    
    return (
      <div>
        <button onClick={() => setShowPDF(false)} style={{ marginBottom: 16, padding: '8px 16px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          ← Retour
        </button>
        <div id="invoice-print">
          <InvoicePDF 
            invoice={generatedInvoice}
            coachInfo={coachInfo || { company_name: 'BEN&FITNESS', siret: '91947704200015', address: '27 Rue de Coulmiers', city: 'Nantes', postal_code: '44000', iban: 'FR76 17906 00112 00060490772 82', bic: 'AGRIFRPP879' }}
            clientInfo={{ profiles: { full_name: selectedClient?.full_name } }}
            items={items}
          />
        </div>
        <button onClick={() => window.print()} style={{ marginTop: 16, padding: '10px 20px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          🖨️ Exporter PDF
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, marginBottom: 20 }}>💰 Générer une facture</h2>
      
      {/* Sélection client */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>1. Choisir le client</label>
        <select 
          onChange={async (e) => {
            const client = clients.find(c => c.id === e.target.value)
            setSelectedClient(client)
            if (client) {
              await loadSessions(client.id)
            }
          }}
          onFocus={loadClients}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        >
          <option value="">-- Sélectionner un client --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>
      
      {/* Ajouter session */}
      {selectedClient && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>2. Ajouter des heures</label>
          <button onClick={addSession} style={{ padding: '8px 16px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            + Ajouter des heures
          </button>
          
          {/* Liste des sessions */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>3. Sélectionner les heures à facturer</label>
              {sessions.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderBottom: '1px solid #eee' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSessions.includes(s)}
                    onChange={() => {
                      if (selectedSessions.includes(s)) {
                        setSelectedSessions(selectedSessions.filter(ss => ss.id !== s.id))
                      } else {
                        setSelectedSessions([...selectedSessions, s])
                      }
                    }}
                  />
                  <span>{new Date(s.date).toLocaleDateString('fr-FR')} - {s.hours}h à {formatPrice(s.hourly_rate)}/h = {formatPrice(s.hours * s.hourly_rate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Générer facture */}
      {selectedSessions.length > 0 && (
        <button 
          onClick={generateInvoice} 
          disabled={loading}
          style={{ padding: '12px 24px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          {loading ? 'Génération...' : '📄 Générer la facture'}
        </button>
      )}
    </div>
  )
}
