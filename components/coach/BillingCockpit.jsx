import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn } from '../../lib/coachUtils'
import InvoiceGenerator from '../billing/InvoiceGenerator'
import InvoiceList from '../billing/InvoiceList'
import ClientBillingForm from '../billing/ClientBillingForm'
import SessionManager from '../billing/SessionManager'
import CoachBillingSettings from '../billing/CoachBillingSettings'  

export default function BillingCockpit({ coachId }) {
  const [view, setView] = useState('clients') // clients, sessions, invoices, settings
  const [selectedClient, setSelectedClient] = useState(null)
  const [clients, setClients] = useState([])
  const [coachInfo, setCoachInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showInvoiceGen, setShowInvoiceGen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [coachId, refreshKey])

  const loadData = async () => {
    setLoading(true)
    
    // Infos facturation du coach
    const { data: coachData } = await supabase
      .from('coach_billing_info')
      .select('*')
      .eq('coach_id', coachId)
      .single()
    setCoachInfo(coachData)
    
    // Liste des clients facturés
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
    if (!error) setRefreshKey(prev => prev + 1)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#0D1B4E', marginBottom: 4 }}>
          💰 Facturation
        </h2>
        <p style={{ color: '#6B7A99' }}>Gérez vos clients, vos sessions et générez des factures</p>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #C5D0F0', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'clients', label: '👥 Clients facturés', count: clients.length },
          { id: 'invoices', label: '📄 Factures' },
          { id: 'settings', label: '⚙️ Mon entreprise' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id); setSelectedClient(null) }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: view === tab.id ? '#0D1B4E' : 'transparent',
              color: view === tab.id ? 'white' : '#6B7A99',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {tab.label}
            {tab.count > 0 && view !== tab.id && (
              <span style={{ background: '#EEF2FF', color: '#4A6FD4', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Vue Clients facturés */}
      {view === 'clients' && (
        <div>
          <button onClick={() => setShowClientForm(true)} style={btn('#4A6FD4', 'white')}>
            + Ajouter un client facturé
          </button>
          
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clients.length === 0 ? (
              <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 50, textAlign: 'center', color: '#6B7A99' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div>Aucun client facturé</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Clique sur "+ Ajouter un client facturé" pour commencer</div>
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} style={{ 
                  background: selectedClient?.id === client.id ? '#EEF4FF' : '#F8FAFF', 
                  borderRadius: 12, 
                  border: selectedClient?.id === client.id ? '2px solid #4A6FD4' : '1px solid #C5D0F0', 
                  padding: 16,
                  cursor: 'pointer'
                }} 
                onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{client.profiles?.full_name}</div>
                      <div style={{ fontSize: 13, color: '#6B7A99' }}>{client.company_name || 'Particulier'}</div>
                      <div style={{ fontSize: 12, color: '#6B7A99' }}>{client.email || client.profiles?.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setView('sessions') }}
                        style={btn('#EEF2FF', '#0D1B4E', '#4A6FD4')}
                      >
                        📊 Voir sessions
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowInvoiceGen(true) }}
                        style={btn('#8FA07A', 'white')}
                      >
                        💰 Facturer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Vue Sessions d'un client */}
      {view === 'sessions' && selectedClient && (
        <div>
          <button onClick={() => { setView('clients'); setSelectedClient(null) }} style={{ ...btn('#EEF2FF', '#0D1B4E', '#4A6FD4'), marginBottom: 16 }}>
            ← Retour aux clients
          </button>
          
          <div style={{ background: '#0D1B4E', borderRadius: 12, padding: 16, marginBottom: 16, color: 'white' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedClient.profiles?.full_name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedClient.company_name || 'Particulier'}</div>
          </div>
          
          <SessionManager 
            coachId={coachId} 
            selectedClient={selectedClient}
            onGenerateInvoice={() => setShowInvoiceGen(true)}
            onSessionAdded={() => setRefreshKey(prev => prev + 1)}
          />
        </div>
      )}

      {/* Vue Factures */}
      {view === 'invoices' && (
        <InvoiceList coachId={coachId} />
      )}

      {/* Vue Paramètres entreprise */}
      {view === 'settings' && (
        <CoachBillingSettings coachInfo={coachInfo} onSave={saveCoachInfo} />
      )}

      {/* Modals */}
      {showClientForm && (
        <ClientBillingForm
          coachId={coachId}
          onClose={() => setShowClientForm(false)}
          onSuccess={() => { setRefreshKey(prev => prev + 1); setShowClientForm(false) }}
        />
      )}

      {showInvoiceGen && selectedClient && (
        <InvoiceGenerator
          coachId={coachId}
          coachInfo={coachInfo}
          selectedClient={selectedClient}
          onClose={() => setShowInvoiceGen(false)}
          onSuccess={() => { setShowInvoiceGen(false); setRefreshKey(prev => prev + 1); setView('invoices') }}
        />
      )}
    </div>
  )
}
