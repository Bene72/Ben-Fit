// pages/coach/[clientId].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { watchBreakpoint } from '../../lib/breakpoints'
import AppShell from '../../components/ui/AppShell'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import OverviewTab from '../../components/coach/OverviewTab'
import ClientHeader from '../../components/coach/ClientHeader'
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

  useEffect(() => watchBreakpoint('mobile', setIsMobile), [])

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

        // (Les séances de la semaine sont calculées dans OverviewTab à partir
        // des perfs loguées : workout_sessions n'est alimentée par aucun écran.)
        setClient({
          ...profile,
          measures: measures || [],
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
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'programme', label: 'Programme' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'bilan', label: 'Bilan' },
    { id: 'messages', label: 'Messages' },
    { id: 'gestion', label: 'Gestion' },
  ]

  if (loading || !client)
    return (
      <AppShell title="Chargement...">
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner gold message="Chargement…" />
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
        <ClientHeader
          client={client}
          isMobile={isMobile}
          onBack={() => router.push('/coach')}
          onMessage={() => handleTabChange('messages')}
          onUpdate={handleClientUpdate}
        />

        {/* Onglets */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 4,
            width: 'max-content',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {tabs.map((t) => {
            const on = activeTab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => handleTabChange(t.id)}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: 9,
                  background: on ? 'var(--bg-card-2)' : 'transparent',
                  boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none',
                  color: on ? 'var(--chalk)' : 'var(--chalk-dim)',
                  fontWeight: on ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Contenu */}
        {activeTab === 'overview' && (
          <OverviewTab
            client={client}
            isMobile={isMobile}
            measures={client.measures}
            onMeasuresChange={(updated) => setClient((prev) => ({ ...prev, measures: updated }))}
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
