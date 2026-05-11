import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'
import { generateInvoiceNumber, calculateTotals, formatPrice } from '../../lib/invoiceUtils'
import InvoicePDF from './InvoicePDF'

export default function InvoiceGenerator({ coachId, coachInfo, selectedClient, onClose, onSuccess }) {
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedClient) {
      loadData()
    }
  }, [selectedClient])

  const loadData = async () => {
    setLoading(true)
    
    // Charger les détails du client
    const { data: client } = await supabase
      .from('billing_clients')
      .select('*, profiles(full_name, email)')
      .eq('client_id', selectedClient.client_id)
      .single()
    setClientDetails(client)
    
    // Charger les sessions non facturées de ce client
    const { data: sessionsData } = await supabase
      .from('billable_sessions')
      .select('*')
      .eq('client_id', selectedClient.client_id)
      .is('invoice_id', null)
      .order('date', { ascending: false })
    setSessions(sessionsData || [])
    
    setLoading(false)
  }

  const toggleSession = (session) => {
    setSelectedSessions(prev => 
      prev.find(s => s.id === session.id)
        ? prev.filter(s => s.id !== session.id)
        : [...prev, session]
    )
  }

  const toggleAllSessions = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([])
    } else {
      setSelectedSessions([...sessions])
    }
  }

  const subtotal = selectedSessions.reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0)
  const { taxAmount, total } = calculateTotals(subtotal, invoice.tax_rate)

  const generateInvoice = async () => {
    if (selectedSessions.length === 0) {
      alert('Veuillez sélectionner au moins une session')
      return
    }
    
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
      notes: invoice.notes || `Prestations pour ${clientDetails?.profiles?.full_name || 'coaching'}`
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
        description: session.description || `Coaching - ${session.hours}h le ${new Date(session.date).toLocaleDateString('fr-FR')}`,
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

  const allSelected = selectedSessions.length === sessions.length && sessions.length > 0

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          Chargement...
        </div>
      </div>
    )
  }

  if (showPDF && generatedInvoice) {
    const items = selectedSessions.map(s => ({
      description: s.description || `Coaching - ${s.hours}h le ${new Date(s.date).toLocaleDateString('fr-FR')}`,
      quantity: s.hours,
      unit_price: s.hourly_rate,
      total: s.hours * s.hourly_rate
    }))

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
              items={items}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: 700, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>📄 Générer une facture</h3>
        <p style={{ color: '#6B7A99', marginBottom: 20, fontSize: 13 }}>
          Pour {clientDetails?.profiles?.full_name} {clientDetails?.company_name ? `(${clientDetails.company_name})` : ''}
        </p>
        
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
        {sessions.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={lbl}>Sessions à facturer</label>
              <button 
                onClick={toggleAllSessions}
                style={{ fontSize: 11, background: 'none', border: 'none', color: '#4A6FD4', cursor: 'pointer' }}
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div style={{ border: '1px solid #C5D0F0', borderRadius: 8, maxHeight: 250, overflowY: 'auto' }}>
              {sessions.map(session => (
                <label key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderBottom: '1px solid #EEF2FF', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSessions.some(s => s.id === session.id)}
                    onChange={() => toggleSession(session)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{new Date(session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontSize: 12, color: '#6B7A99' }}>{session.hours}h à {formatPrice(session.hourly_rate)}/h</div>
                    {session.description && <div style={{ fontSize: 11, color: '#4A6FD4', marginTop: 2 }}>{session.description}</div>}
                  </div>
                  <div style={{ fontWeight: 600 }}>{formatPrice(session.hours * session.hourly_rate)}</div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#FFF8E1', padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
            ⚠️ Aucune session non facturée pour ce client.
            <br />
            <span style={{ fontSize: 12 }}>Ajoute des sessions dans l'onglet "Sessions"</span>
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
