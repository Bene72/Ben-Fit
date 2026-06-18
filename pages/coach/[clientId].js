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
  const [client, setClient] = useState(null)   // objet complet
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tab || 'overview')

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user)
      } else {
        router.push('/')
      }
    })
  }, [])

  // Chargement du profil complet du client (avec measures pour OverviewTab)
  useEffect(() => {
    if (!clientId || typeof clientId !== 'string') return
    const load = async () => {
      setLoading(true)
      try {
        // Profil complet
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single()
        if (error) throw error

        // Mesures pour lastWeight + sessionsThisWeek
        const { data: measures } = await supabase
          .from('measures')
          .select('weight, date')
          .eq('client_id', clientId)
          .order('date', { ascending: false })
          .limit(10)

        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('client_id', clientId)
          .gte('date', weekStart.toISOString().split('T')[0])

        setClient({
          ...profile,
          measures: measures || [],
          sessionsThisWeek: sessions?.length || 0,
        })
      } catch (e) {
        console.error('Erreur chargement client:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  // Sync onglet depuis URL
  useEffect(() => {
    if (tab && typeof tab === 'string') setActiveTab(tab)
  }, [tab])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    router.push({ pathname: `/coach/${clientId}`, query: { tab: tabId } }, undefined, { shallow: true })
  }

  // Callback quand OverviewTab met à jour le client (note coach, programme, poids)
  const handleClientUpdate = (updated) => setClient(updated)

  const tabs = [
    { id: 'overview',   label: '👁 Vue d\'ensemble' },
    { id: 'programme',  label: '🏋️ Programme' },
    { id: 'nutrition',  label: '🥗 Nutrition' },
    { id: 'bilan',      label: '📋 Bilan' },
    { id: 'messages',   label: '💬 Messages' },
    { id: 'gestion',    label: '⚙️ Gestion' },
  ]

  if (loading || !client) return (
    <Layout title="Chargement..." user={user}>
      <div style={{ textAlign: 'center', padding: '60px', color: '#6B7A99', fontSize: '14px', fontFamily: "'DM Sans',sans-serif" }}>
        Chargement...
      </div>
    </Layout>
  )

  if (!clientId || typeof clientId !== 'string') return (
    <Layout title="Erreur" user={user}>
      <div style={{ textAlign: 'center', padding: '60px', color: '#C45C3A' }}>Client non trouvé</div>
    </Layout>
  )

  return (
    <Layout title={client.full_name || 'Client'} user={user}>
      <div>
        {/* En-tête */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <button onClick={() => router.push('/coach')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7A99', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", padding: 0 }}>
              ← Accueil coach
            </button>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: '#0D1B4E', letterSpacing: '1.5px', margin: 0 }}>
            {client.full_name || 'Client'}
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '13px', margin: '4px 0 0' }}>
            {client.email} · Programme personnalisé
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', borderBottom: '2px solid #E8ECFA', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
              padding: '10px 18px', border: 'none', background: 'transparent',
              color: activeTab === t.id ? '#0D1B4E' : '#6B7A99',
              fontWeight: activeTab === t.id ? '700' : '400',
              fontSize: '13px', cursor: 'pointer',
              borderBottom: activeTab === t.id ? '3px solid #0D1B4E' : '3px solid transparent',
              transition: 'all 0.15s', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap',
              marginBottom: '-2px',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {activeTab === 'overview' && (
          <OverviewTab
            client={client}
            sessionsThisWeek={client.sessionsThisWeek}
            lastWeight={client.measures?.[0]?.weight}
            coachId={user?.id}
            onUpdate={handleClientUpdate}
          />
        )}
        {activeTab === 'programme' && (
          <ProgrammeTab clientId={clientId} clientName={client.full_name} coachId={user?.id} />
        )}
        {activeTab === 'nutrition' && (
          <NutritionTab clientId={clientId} clientName={client.full_name} />
        )}
        {activeTab === 'bilan' && (
          <BilanTab clientId={clientId} clientName={client.full_name} coachId={user?.id} />
        )}
        {activeTab === 'messages' && (
          <MessagesTab coachId={user?.id} clientId={clientId} clientName={client.full_name} onRead={() => {}} />
        )}
        {activeTab === 'gestion' && (
          <GestionTab client={client} onDelete={() => router.push('/coach')} />
        )}
      </div>
    </Layout>
  )
}
