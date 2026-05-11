import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'
import { generateInvoiceNumber, calculateTotals, formatPrice } from '../../lib/invoiceUtils'
import InvoicePDF from './InvoicePDF'

export default function InvoiceGenerator({ coachId, coachInfo, onClose, onSuccess }) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientDetails, setClientDetails] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSessions, setSelectedSessions] = useState([])
  const [invoice, setInvoice] = useState({
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    tax_rate: 20,
    notes: ''
  })
  const [generating, setGenerating] = useState(false)
  const [generatedInvoice, setGeneratedInvoice] = useState(null)
  const [showPDF, setShowPDF] = useState(false)

  useEffect(() => {
    loadClients()
  }, [coachId])

  const loadClients = async () => {
    const { data } = await supabase
      .from('billing_clients')
      .select('*, profiles(full_name, email)')
      .eq('coach_id', coachId)
    setClients(data || [])
  }

  const loadSessions = async (clientId) => {
    const { data } = await supabase
      .from('billable_sessions')
      .select('*')
      .eq('client_id', clientId)
      .is('invoice_id', null)
      .order('date', { ascending: false })
    setSessions(data || [])
  }

  const loadClientDetails = async (clientId) => {
    const { data } = await supabase
      .from('billing_clients')
      .select('*, profiles(full_name, email)')
      .eq('client_id', clientId)
      .single()
    setClientDetails(data)
  }

  const toggleSession = (session) => {
    setSelectedSessions(prev => 
      prev.find(s => s.id === session.id)
        ? prev.filter(s => s.id !== session.id)
        : [...prev, session]
    )
  }

  const subtotal = selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0)
  const { taxAmount, total } = calculateTotals(subtotal, invoice.tax_rate)

  const generateInvoice = async () => {
    if (selectedSessions.length === 0) return
    setGenerating(true)
    
    const invoiceNumber = generateInvoiceNumber()
    const invoiceData = {
      invoice_number: invoiceNumber,
      coach_id: coachId,
      client_id: selectedClient.client_id,
      date: new Date().toISOString().split('T')[0],
      due_date: invoice.due_date,
      status: 'draft',
      subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: taxAmount,
      total,
      notes: invoice.notes
    }
    
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()
    
    if (error) {
      alert('Erreur: ' + error.message)
      setGenerating(false)
      return
    }
    
    // Ajouter les lignes de facture
    for (const session of selectedSessions) {
      await supabase.from('invoice_items').insert({
        invoice_id: newInvoice.id,
        description: `Coaching - ${session.hours}h`,
        quantity: session.hours,
        unit_price: session.hourly_rate,
        total: session.hours * session.hourly_rate,
        session_id: session.id
      })
      
      // Marquer la session comme facturée
      await supabase
        .from('billable_sessions')
        .update({ invoice_id: newInvoice.id })
        .eq('id', session.id)
    }
    
    setGeneratedInvoice(newInvoice)
    setShowPDF(true)
    setGenerating(false)
    onSuccess?.()
  }

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.client_id === clientId)
    setSelectedClient(client)
    loadSessions(clientId)
    loadClientDetails(clientId)
    setSelectedSessions([])
  }

  if (showPDF && generatedInvoice) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
          {/* Boutons d'action */}
          <div style={{ position: 'sticky', top: 0, background: 'white', padding: 16, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <button 
              onClick={() => window.print()}
              style={{ ...btn('#0D1B4E', 'white'), padding: '8px 16px' }}
            >
              🖨️ Imprimer / Exporter PDF
            </button>
            <button 
              onClick={() => { setShowPDF(false); onClose() }}
              style={{ ...btn('transparent', '#6B7A99', '#C5D0F0') }}
            >
              Fermer
            </button>
          </div>
          
          {/* PDF à imprimer */}
          <div id="invoice-print">
            <InvoicePDF 
              invoice={generatedInvoice}
              coachInfo={coachInfo}
              clientInfo={clientDetails}
              items={selectedSessions.map(s => ({
                description: `Coaching - ${s.hours}h`,
                quantity: s.hours,
                unit_price: s.hourly_rate,
                total: s.hours * s.hourly_rate
              }))}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: 700, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>📄 Générer une facture</h3>
        
        {/* Sélection du client */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Client</label>
          <select 
            value={selectedClient?.client_id || ''}
            onChange={(e) => handleClientSelect(e.target.value)}
            style={inp}
          >
            <option value="">-- Sélectionner un client --</option>
            {clients.map(c => (
              <option key={c.client_id} value={c.client_id}>{c.profiles?.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>
            ))}
          </select>
        </div>
        
        {/* Date d'échéance */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Date d'échéance</label>
          <input 
            type="date" 
            value={invoice.due_date} 
            onChange={(e) => setInvoice({ ...invoice, due_date: e.target.value })}
            style={inp}
          />
        </div>
        
        {/* Sessions non facturées */}
        {selectedClient && sessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Sessions à facturer</label>
            <div style={{ border: '1px solid #C5D0F0', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
              {sessions.map(session => (
                <label key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderBottom: '1px solid #EEF2FF' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSessions.some(s => s.id === session.id)}
                    onChange={() => toggleSession(session)}
                  />
                  <div style={{ flex: 1 }}>
                    <div>{new Date(session.date).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 12, color: '#6B7A99' }}>{session.hours}h à {formatPrice(session.hourly_rate)}/h</div>
                  </div>
                  <div>{formatPrice(session.hours * session.hourly_rate)}</div>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {selectedClient && sessions.length === 0 && (
          <div style={{ background: '#FFF8E1', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            ⚠️ Aucune session non facturée pour ce client.
          </div>
        )}
        
        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Notes (optionnel)</label>
          <textarea 
            value={invoice.notes} 
            onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
            placeholder="Description des prestations..."
            rows={3}
            style={inp}
          />
        </div>
        
        {/* Récapitulatif */}
        {selectedSessions.length > 0 && (
          <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Récapitulatif</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total HT</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>TVA ({invoice.tax_rate}%)</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid #C5D0F0', paddingTop: 8 }}>
              <span>Total TTC</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        )}
        
        {/* Boutons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          <button 
            onClick={generateInvoice} 
            disabled={selectedSessions.length === 0 || generating}
            style={btn(selectedSessions.length === 0 ? '#CCC' : '#0D1B4E', 'white')}
          >
            {generating ? 'Génération...' : '✓ Générer la facture'}
          </button>
        </div>
      </div>
    </div>
  )
}
