import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl } from '../../lib/coachUtils'
import { formatPrice, formatDate } from '../../lib/invoiceUtils'
import InvoicePDF from './InvoicePDF'

export default function InvoiceList({ coachId }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoiceDetails, setInvoiceDetails] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)
  const [clientInfo, setClientInfo] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    loadInvoices()
    loadCoachInfo()
  }, [coachId])

  const loadInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, profiles!invoices_client_id_fkey(full_name, email)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  const loadCoachInfo = async () => {
    const { data } = await supabase
      .from('coach_billing_info')
      .select('*')
      .eq('coach_id', coachId)
      .single()
    setCoachInfo(data)
  }

  const viewInvoice = async (invoice) => {
    setSelectedInvoice(invoice)
    
    // Charger les infos client
    const { data: client } = await supabase
      .from('billing_clients')
      .select('*, profiles(full_name, email)')
      .eq('client_id', invoice.client_id)
      .single()
    setClientInfo(client)
    
    // Charger les lignes de facture
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
    setItems(invoiceItems || [])
  }

  const updateStatus = async (invoiceId, newStatus) => {
    await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoiceId)
    loadInvoices()
  }

  const statusColors = {
    draft: '#6B7A99',
    sent: '#4A6FD4',
    paid: '#8FA07A',
    overdue: '#C45C3A'
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>

  if (selectedInvoice) {
    return (
      <div>
        <button onClick={() => setSelectedInvoice(null)} style={{ ...btn('#EEF2FF', '#0D1B4E', '#4A6FD4'), marginBottom: 16 }}>
          ← Retour à la liste
        </button>
        
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Facture {selectedInvoice.invoice_number}</h3>
            <button 
              onClick={() => window.print()}
              style={{ ...btn('#0D1B4E', 'white') }}
            >
              🖨️ Exporter PDF
            </button>
          </div>
          
          <div id="invoice-print">
            <InvoicePDF 
              invoice={selectedInvoice}
              coachInfo={coachInfo}
              clientInfo={clientInfo}
              items={items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
              }))}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>📄 Historique des factures</h3>
        <span style={{ fontSize: 13, color: '#6B7A99' }}>{invoices.length} facture(s)</span>
      </div>
      
      {invoices.length === 0 ? (
        <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6B7A99' }}>
          Aucune facture générée pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invoices.map(inv => (
            <div key={inv.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #C5D0F0', padding: 16, cursor: 'pointer' }} onClick={() => viewInvoice(inv)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{inv.invoice_number}</div>
                  <div style={{ fontSize: 12, color: '#6B7A99' }}>{inv.profiles?.full_name} · {formatDate(inv.date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>{formatPrice(inv.total)}</div>
                  <span style={{ 
                    background: statusColors[inv.status] || '#6B7A99', 
                    color: 'white', 
                    padding: '4px 10px', 
                    borderRadius: 20, 
                    fontSize: 11, 
                    fontWeight: 600 
                  }}>
                    {inv.status === 'draft' ? 'Brouillon' : inv.status === 'sent' ? 'Envoyée' : inv.status === 'paid' ? 'Payée' : 'En retard'}
                  </span>
                </div>
              </div>
              {inv.status !== 'paid' && inv.status !== 'sent' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'sent') }} style={btn('#4A6FD4', 'white')}>
                    📧 Marquer comme envoyée
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'paid') }} style={btn('#8FA07A', 'white')}>
                    💰 Marquer comme payée
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
