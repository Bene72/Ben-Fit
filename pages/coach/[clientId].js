// pages/coach/[clientId].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { watchBreakpoint } from '../../lib/breakpoints'
import CoachSidebar from '../../components/coach/dashboard/CoachSidebar'
import CoachMobileNav from '../../components/coach/dashboard/CoachMobileNav'
import OfferModal from '../../components/coach/OfferModal'
import ArchiveModal from '../../components/coach/ArchiveModal'
import { Toast, useToast } from '../../components/Toast'
import { apiFetch } from '../../lib/api'
import { signOutAndRedirect } from '../../lib/auth'
import { S, font } from '../../lib/coachDashboard/offersAndCompliance'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import OverviewTab from '../../components/coach/OverviewTab'
import ClientHeader from '../../components/coach/ClientHeader'
import ProgrammeTab from '../../components/coach/ProgrammeTab'
import NutritionTab from '../../components/coach/NutritionTab'
import GestionTab from '../../components/coach/GestionTab'
import MessagesTab from '../../components/coach/MessagesTab'
import BilanTab from '../../components/coach/BilanTab'

// Cadre commun au cockpit : même menu latéral (desktop) / barre (mobile).
// Composant défini HORS de la page : défini à l'intérieur, il serait recréé à
// chaque rendu et tout son contenu (onglets, formulaires) serait remonté.
function CoachFrame({ user, isMobile, toast, onSelectTab, onCreateClient, onSignOut, children }) {
  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: font, color: S.navy }}>
      {toast && <Toast toast={toast} />}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {!isMobile && (
          <CoachSidebar
            user={user}
            activeTab="clients"
            onSelectTab={onSelectTab}
            onCreateClient={onCreateClient}
            onSignOut={onSignOut}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 16 : 28, overflowY: 'auto' }}>
          {isMobile && <CoachMobileNav activeTab="clients" onSelectTab={onSelectTab} />}
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ClientPage() {
  const router = useRouter()
  const { clientId, tab } = router.query
  const [user, setUser] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tab || 'overview')
  const [isMobile, setIsMobile] = useState(false)

  const [editingOffer, setEditingOffer] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const { toast, showToast } = useToast()

  // Même point de bascule que le cockpit (pages/coach.js)
  useEffect(() => watchBreakpoint('tablet', setIsMobile), [])

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
          .select('*')
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

  // Même logique que l'ancienne vue rapide du cockpit (pages/coach.js) :
  // on écrit d'abord, on vérifie qu'une ligne a bien été modifiée, puis on affiche.
  const saveOffer = async (id, form) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ offer: form.offer })
        .eq('id', id)
        .select()
      if (error) throw error
      if (!data?.length) throw new Error("Aucune ligne modifiée (droits d'accès ?)")
      setClient((prev) => ({ ...prev, ...data[0] }))
      showToast('Offre enregistrée', 'success')
      return true
    } catch (err) {
      showToast("Erreur : l'offre n'a pas été enregistrée — " + err.message, 'error')
      return false
    }
  }

  const setArchived = async (id, archived) => {
    try {
      const res = await apiFetch('/api/archive-client', {
        method: 'POST',
        body: JSON.stringify({ client_id: id, archived }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setClient((prev) => ({
        ...prev,
        archived,
        archived_at: archived ? new Date().toISOString() : null,
      }))
      showToast(archived ? 'Client archivé' : 'Client réactivé', 'success')
    } catch (err) {
      showToast(
        (archived ? 'Erreur archivage : ' : 'Erreur réactivation : ') + err.message,
        'error'
      )
    }
  }

  const goCockpit = (tabId) =>
    router.push(tabId && tabId !== 'clients' ? `/coach?tab=${tabId}` : '/coach')

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
      <CoachFrame
        user={user}
        isMobile={isMobile}
        toast={toast}
        onSelectTab={goCockpit}
        onCreateClient={() => router.push('/coach?new=1')}
        onSignOut={() => signOutAndRedirect(router)}
      >
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner gold message="Chargement…" />
        </div>
      </CoachFrame>
    )

  return (
    <CoachFrame
      user={user}
      isMobile={isMobile}
      toast={toast}
      onSelectTab={goCockpit}
      onCreateClient={() => router.push('/coach?new=1')}
      onSignOut={() => signOutAndRedirect(router)}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <ClientHeader
          client={client}
          isMobile={isMobile}
          onBack={() => router.push('/coach')}
          onMessage={() => handleTabChange('messages')}
          onUpdate={handleClientUpdate}
          onEditOffer={() => setEditingOffer(true)}
          onArchive={() => setArchiving(true)}
          onUnarchive={() => setArchived(client.id, false)}
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

      {editingOffer && (
        <OfferModal
          client={{ ...client, since: client.created_at?.split('T')[0] || '' }}
          onClose={() => setEditingOffer(false)}
          onSave={saveOffer}
        />
      )}
      {archiving && (
        <ArchiveModal
          client={{ ...client, name: client.full_name || client.email }}
          onClose={() => setArchiving(false)}
          onConfirm={(id) => setArchived(id, true)}
        />
      )}
    </CoachFrame>
  )
}
