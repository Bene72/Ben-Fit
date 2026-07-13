// pages/coach/[clientId].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import AppShell from '../../components/ui/AppShell'
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
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tab || 'overview')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user
      if (!currentUser) {
        router.push('/login')
        return
      }
      // SÉCURITÉ (10/07/2026) : cette page n'avait jamais vérifié le rôle,
      // seulement qu'une session existait. N'importe quel client connecté
      // pouvait donc ouvrir la fiche de n'importe quel autre client.
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()
      if (profErr || prof?.role !== 'coach') {
        router.push('/dashboard')
        return
      }
      setUser(currentUser)
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécution unique au montage (souscription auth)
  }, [])

  // Chargement du profil complet du client
  useEffect(() => {
    // Vérifier que clientId est bien un UUID valide
    if (!clientId || typeof clientId !== 'string') return

    // Ne pas charger si clientId est un nom de route comme "activite"
    if (clientId === 'activite' || clientId === 'saison' || clientId === 'programmes') {
      router.push('/coach')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single()

        if (error) {
          if (error.code === '22P02') {
            // Invalid UUID format
            router.push('/coach')
            return
          }
          throw error
        }

        const { data: measures } = await supabase
          .from('measures')
          .select('id, weight, date')
          .eq('client_id', clientId)
          .order('date', { ascending: false })
          .limit(500)

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
        router.push('/coach')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit se relancer que si clientId change, pas à chaque re-render de router
  }, [clientId])

  // Sync onglet depuis URL
  useEffect(() => {
    if (tab && typeof tab === 'string') setActiveTab(tab)
  }, [tab])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    router.push({ pathname: `/coach/${clientId}`, query: { tab: tabId } }, undefined, {
      shallow: true,
    })
  }

  const handleClientUpdate = (updated) => setClient(updated)

  const tabs = [
    { id: 'overview', label: "👁 Vue d'ensemble" },
    { id: 'programme', label: '🏋️ Programme' },
    { id: 'nutrition', label: '🥗 Nutrition' },
    { id: 'bilan', label: '📋 Bilan' },
    { id: 'messages', label: '💬 Messages' },
    { id: 'gestion', label: '⚙️ Gestion' },
  ]

  if (loading || !client)
    return (
      <AppShell title="Chargement...">
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            color: '#8A8070',
            fontSize: '14px',
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid #E8E4DC',
              borderTopColor: 'var(--gold)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Chargement...
        </div>
      </AppShell>
    )

  return (
    <AppShell title={client.full_name || 'Client'}>
      <div
        style={{
          background: 'var(--bg)',
          minHeight: '100vh',
          fontFamily: "'DM Sans',sans-serif",
          margin: '-24px -28px',
          padding: isMobile ? '20px 16px' : '24px 28px',
        }}
      >
        {/* En-tête */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/coach')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#8A8070',
              fontSize: '13px',
              fontFamily: "'DM Sans',sans-serif",
              padding: 0,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ← Mes élèves
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0D1B2A, #1A2F4A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--gold)',
                flexShrink: 0,
                fontFamily: "'Playfair Display',serif",
              }}
            >
              {(client.full_name || client.email || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: isMobile ? 22 : 28,
                  fontWeight: 800,
                  color: '#0D1B2A',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {client.full_name || 'Client'}
              </h1>
              <p style={{ color: '#8A8070', fontSize: '13px', margin: '2px 0 0' }}>
                {client.email}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            marginBottom: '24px',
            borderBottom: '1px solid #E8E4DC',
            flexWrap: 'wrap',
            overflowX: 'auto',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                color: activeTab === t.id ? '#0D1B2A' : '#8A8070',
                fontWeight: activeTab === t.id ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                borderBottom: activeTab === t.id ? '2px solid #0D1B2A' : '2px solid transparent',
                transition: 'all 0.15s',
                fontFamily: "'DM Sans',sans-serif",
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {activeTab === 'overview' && (
          <OverviewTab
            client={client}
            sessionsThisWeek={client.sessionsThisWeek}
            measures={client.measures}
            onMeasuresChange={(updated) => setClient((prev) => ({ ...prev, measures: updated }))}
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
          <MessagesTab
            coachId={user?.id}
            clientId={clientId}
            clientName={client.full_name}
            onRead={() => {}}
          />
        )}
        {activeTab === 'gestion' && (
          <GestionTab client={client} onDelete={() => router.push('/coach')} />
        )}
      </div>
    </AppShell>
  )
}
