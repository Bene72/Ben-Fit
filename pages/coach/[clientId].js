import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import OverviewTab from '../../components/coach/OverviewTab'
import ProgrammeTab from '../../components/coach/ProgrammeTab'
import NutritionTab from '../../components/coach/NutritionTab'
import GestionTab from '../../components/coach/GestionTab'
import MessagesTab from '../../components/coach/MessagesTab'
import BilanTab from '../../components/coach/BilanTab'

export default function ClientPage() {
  const router = useRouter()
  const { clientId, tab } = router.query
  const [user, setUser] = useState(null)
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tab || 'overview')

  useEffect(() => {
    // Récupérer l'utilisateur connecté
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user)
      } else {
        router.push('/login')
      }
    })
  }, [])

  useEffect(() => {
    // Récupérer le nom du client
    if (clientId && typeof clientId === 'string') {
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', clientId)
        .single()
        .then(({ data }) => {
          if (data) {
            setClientName(data.full_name)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [clientId])

  // Mettre à jour l'onglet actif quand l'URL change
  useEffect(() => {
    if (tab && typeof tab === 'string') {
      setActiveTab(tab)
    }
  }, [tab])

  const tabs = [
    { id: 'overview', label: '📊 Aperçu', component: OverviewTab },
    { id: 'programme', label: '💪 Programme', component: ProgrammeTab },
    { id: 'nutrition', label: '🍽️ Nutrition', component: NutritionTab },
    { id: 'gestion', label: '⚙️ Gestion', component: GestionTab },
    { id: 'messages', label: '💬 Messages', component: MessagesTab },
    { id: 'bilan', label: '📈 Bilan', component: BilanTab },
  ]

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    // Mettre à jour l'URL sans recharger la page
    router.push(
      {
        pathname: `/coach/${clientId}`,
        query: { tab: tabId }
      },
      undefined,
      { shallow: true }
    )
  }

  if (loading) {
    return (
      <Layout title="Chargement..." user={user}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7A99' }}>
          Chargement...
        </div>
      </Layout>
    )
  }

  if (!clientId || typeof clientId !== 'string') {
    return (
      <Layout title="Erreur" user={user}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#C45C3A' }}>
          Client non trouvé
        </div>
      </Layout>
    )
  }

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || tabs[0].component

  return (
    <Layout title={clientName || 'Client'} user={user}>
      <div>
        {/* En-tête avec le nom du client */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: '#0D1B4E', letterSpacing: '1.5px', marginBottom: '4px' }}>
            {clientName || 'Client'}
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '13px' }}>
            Programme personnalisé · Suivi nutritionnel
          </p>
        </div>

        {/* Onglets de navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '24px',
          borderBottom: '2px solid #E8ECFA',
          paddingBottom: '2px',
          flexWrap: 'wrap'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? '#0D1B4E' : '#6B7A99',
                fontWeight: activeTab === tab.id ? '700' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '3px solid #0D1B4E' : '3px solid transparent',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans',sans-serif",
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#0D1B4E'
                  e.currentTarget.style.borderBottomColor = '#C5D0F0'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6B7A99'
                  e.currentTarget.style.borderBottomColor = 'transparent'
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet actif */}
        <ActiveComponent 
          clientId={clientId} 
          clientName={clientName}
          coachId={user?.id}
        />
      </div>
    </Layout>
  )
}
