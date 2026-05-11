import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'
import InvoiceGenerator from './InvoiceGenerator'
import InvoiceList from './InvoiceList'
import ClientBillingForm from './ClientBillingForm'
import SessionManager from './SessionManager'
import CoachBillingSettings from './CoachBillingSettings'

export default function BillingTab({ coachId }) {
  const [activeView, setActiveView] = useState('clients')
  const [coachInfo, setCoachInfo] = useState(null)
  const [clients, setClients] = useState([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showInvoiceGen, setShowInvoiceGen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [coachId])

  const loadData = async () => {
    setLoading(true)
    
    const { data: coachData } = await supabase
      .from('coach_billing_info')
      .select('*')
      .eq('coach_id', coachId)
      .single()
    setCoachInfo(coachData)
    
    const { data: clientsData } = await supabase
      .from('billing_clients')
      .select('*, profiles(full_name, email)')
      .eq('coach_id', coachId)
    setClients(clientsData || [])
    
    setLoading(false)
  }

  const saveCoachInfo = async (formData) => {
    const { error } = await supabase
      .from('coach_billing_info')
      .upsert({ coach_id: coachId, ...formData })
    if (!error) loadData()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#0D1B4E' }}>
          💰 Facturation
        </h2>
        <p style={{ color: '#6B7A99' }}>Gérez vos clients, vos sessions et générez des factures</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #C5D0F0', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'clients', label: '👥 Clients facturés' },
          { id: 'sessions', label: '📊 Sessions' },
          { id: 'invoices', label: '📄 Factures' },
          { id: 'settings', label: '⚙️ Mon entreprise' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveView(tab.id)
              if (tab.id !== 'sessions') setSelectedClient(null)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeView === tab.id ? '#0D1B4E' : 'transparent',
              color: activeView === tab.id ? 'white' : '#6B7A99',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'clients' && (
        <div>
          <button onClick={() => setShowClientForm(true)} style={btn('#4A6FD4', 'white')}>
            + Ajouter un client facturé
          </button>
          
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clients.length === 0 ? (
              <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6B7A99' }}>
                Aucun client facturé. Clique sur "+ Ajouter" pour commencer.
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} style={{ background: '#F0F4FF', borderRadius: 12, padding: 16, border: '1px solid #C5D0F0', cursor: 'pointer' }} onClick={() => { setSelectedClient(client); setActiveView('sessions') }}>
                  <div style={{ fontWeight: 700 }}>{client.profiles?.full_name}</div>
                  <div style={{ fontSize: 13, color: '#6B7A99' }}>{client.company_name || 'Particulier'}</div>
                  <div style={{ fontSize: 12, color: '#6B7A99' }}>{client.email || client.profiles?.email}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeView === 'sessions' && (
        <SessionManager 
          coachId={coachId} 
          selectedClient={selectedClient}
          onGenerateInvoice={() => setShowInvoiceGen(true)}
        />
      )}

      {activeView === 'invoices' && (
        <InvoiceList coachId={coachId} />
      )}

      {activeView === 'settings' && (
        <CoachBillingSettings coachInfo={coachInfo} onSave={saveCoachInfo} />
      )}

      {showClientForm && (
        <ClientBillingForm
          coachId={coachId}
          onClose={() => setShowClientForm(false)}
          onSuccess={() => { loadData(); setShowClientForm(false) }}
        />
      )}

      {showInvoiceGen && selectedClient && (
        <InvoiceGenerator
          coachId={coachId}
          coachInfo={coachInfo}
          selectedClient={selectedClient}
          onClose={() => setShowInvoiceGen(false)}
          onSuccess={() => { setShowInvoiceGen(false); loadData(); setActiveView('invoices') }}
        />
      )}
    </div>
  )
}
