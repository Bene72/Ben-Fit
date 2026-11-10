// pages/coach.js  - Ben&Fit Dashboard avec données Supabase réelles
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { toLocalISODate } from '../lib/dateUtils'
import { watchBreakpoint } from '../lib/breakpoints'
import { signOutAndRedirect } from '../lib/auth'

import CreateClientModal from '../components/coach/CreateClientModal'
import LoadingSpinner from '../components/ui/LoadingSpinner'

// CORRECTIF AUDIT 09/09/2026 (point 4 : découpage des gros fichiers) —
// pages/coach.js faisait 1260 lignes. Le rendu (sidebar, nav mobile, KPI
// row, et les 3 onglets clients/offres/calendrier) a été extrait dans
// components/coach/dashboard/*, tel quel, sans changement de comportement.
// Ce fichier ne garde que l'état, le chargement de données et les handlers —
// l'orchestration.
import CoachSidebar from '../components/coach/dashboard/CoachSidebar'
import RenewalsPanel from '../components/coach/RenewalsPanel'
import AppPrompt from '../components/ui/AppPrompt'
import CoachMobileNav from '../components/coach/dashboard/CoachMobileNav'
import KpiRow from '../components/coach/dashboard/KpiRow'
import ClientsTab from '../components/coach/dashboard/ClientsTab'
import OffresTab from '../components/coach/dashboard/OffresTab'
import CalendarTab from '../components/coach/dashboard/CalendarTab'

import { OFFERS, S, font, bebas, toClientModel } from '../lib/coachDashboard/offersAndCompliance'

export default function CoachDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('clients')
  const [clientSubTab, setClientSubTab] = useState('actifs')

  // Deep-link : /coach?tab=offres ou /coach?tab=calendar ouvre directement
  // l'onglet correspondant (utilisé par la nav globale — components/ui/AppShell.js).
  useEffect(() => {
    if (!router.isReady) return
    const t = router.query.tab
    if (t === 'offres' || t === 'calendar' || t === 'clients') {
      setActiveTab(t)
    }
    // Depuis la fiche client : « Nouvel élève »
    if (router.query.new === '1') setShowCreate(true)
  }, [router.isReady, router.query.tab, router.query.new])
  const [showCreate, setShowCreate] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientSort, setClientSort] = useState('recent')
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => watchBreakpoint('tablet', setIsMobile), [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user
        if (!currentUser) {
          router.push('/login')
          return
        }
        // SÉCURITÉ (10/07/2026) : cette page n'avait jamais vérifié le rôle,
        // seulement qu'une session existait. N'importe quel client connecté
        // pouvait donc ouvrir /coach. Les requêtes de données restaient
        // protégées par la RLS, mais l'interface elle-même s'affichait.
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
        await loadData(currentUser.id)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécution unique au montage (init auth), pas à chaque changement de loadData/router
  }, [])

  const loadData = async (coachId) => {
    try {
      // SÉCURITÉ : pas de fallback "tous les clients" si ce filtre échoue.
      // Un échec ici doit rester une erreur visible, jamais un élargissement
      // de la lecture à des clients d'un autre coach.
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .eq('coach_id', coachId)
      if (profErr) throw profErr
      const clientModels = (profiles || []).map(toClientModel)
      setClients(clientModels)
      loadActivity(clientModels)
      const { data: sess } = await supabase
        .from('workout_sessions')
        .select('*')
        .gte('date', toLocalISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
      if (sess && sess.length > 0) {
        setSessions(
          sess.map((s) => ({
            date: s.date,
            client: s.client_name || s.client_id,
            type: s.type || 'Suivi',
            color: S.blue,
          }))
        )
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const loadActivity = async (clientList) => {
    const ids = clientList.map((c) => c.id)
    if (ids.length === 0) {
      setActivity([])
      setActivityLoading(false)
      return
    }
    setActivityLoading(true)
    try {
      const nameOf = (id) => clientList.find((c) => c.id === id)?.name || 'Client'
      const [{ data: logs }, { data: msgs }, { data: bilansData }] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('client_id, exercise_name, logged_at')
          .in('client_id', ids)
          .order('logged_at', { ascending: false })
          .limit(6),
        supabase
          .from('messages')
          .select('sender_id, receiver_id, created_at')
          .in('sender_id', ids)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('bilans')
          .select('client_id, week_start, created_at')
          .in('client_id', ids)
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      const items = [
        ...(logs || []).map((l) => ({
          type: 'log',
          clientId: l.client_id,
          clientName: nameOf(l.client_id),
          label: `a loggé ${l.exercise_name}`,
          at: l.logged_at,
        })),
        ...(msgs || []).map((m) => ({
          type: 'message',
          clientId: m.sender_id,
          clientName: nameOf(m.sender_id),
          label: 'a envoyé un message',
          at: m.created_at,
        })),
        ...(bilansData || []).map((b) => ({
          type: 'bilan',
          clientId: b.client_id,
          clientName: nameOf(b.client_id),
          label: 'a rempli son bilan',
          at: b.created_at || b.week_start,
        })),
      ]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 8)
      setActivity(items)
    } catch (err) {
      console.error('Erreur chargement activité:', err)
      setActivity([])
    } finally {
      setActivityLoading(false)
    }
  }

  // Fiche client unique : un clic sur un athlète ouvre /coach/[id] (même
  // cadre que le cockpit). Offre, archivage et post-it s'y gèrent désormais.
  const openClient = (id) => router.push(`/coach/${id}`)

  const activeClients = clients.filter((c) => !c.archived && c.status === 'actif')
  const archivedClients = clients.filter((c) => c.archived)
  const mrr = activeClients.reduce((s, c) => s + (OFFERS[c.offer]?.price || 0), 0)
  const pendingMsg = clients.reduce((s, c) => s + c.messages, 0)
  const baseClients =
    clientSubTab === 'archives' ? archivedClients : clients.filter((c) => !c.archived)
  const searchedClients = clientSearch.trim()
    ? baseClients.filter((c) => c.name.toLowerCase().includes(clientSearch.trim().toLowerCase()))
    : baseClients
  const SORTERS = {
    recent: (a, b) => new Date(b.lastBilan || 0) - new Date(a.lastBilan || 0),
    name: (a, b) => a.name.localeCompare(b.name),
    balance: (a, b) => a.balance - b.balance,
  }
  const displayedClients = [...searchedClients].sort(SORTERS[clientSort] || SORTERS.recent)

  if (loading || !user) return <LoadingSpinner full gold message="Chargement" />

  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: S.bg,
          fontFamily: font,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--danger)',
            maxWidth: 500,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: bebas, fontSize: 20, color: S.navy, marginBottom: 8 }}>
            ERREUR DE CHARGEMENT
          </div>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>{error}</div>
          <button
            onClick={() => user && loadData(user.id)}
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: font,
              fontWeight: 700,
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    )

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: font, color: S.navy }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* ── SIDEBAR ── */}
        {!isMobile && (
          <CoachSidebar
            user={user}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onCreateClient={() => setShowCreate(true)}
            onSignOut={() => signOutAndRedirect(router)}
          />
        )}

        {/* ── MAIN ── */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px', overflowY: 'auto' }}>
          {/* Nav mobile */}
          {isMobile && <CoachMobileNav activeTab={activeTab} onSelectTab={setActiveTab} />}

          {/* KPI Row — chaque tuile est un hyperlien vers la vue concernée */}
          <KpiRow
            activeCount={activeClients.length}
            archivedCount={archivedClients.length}
            mrr={mrr}
            pendingMessages={pendingMsg}
            onShowActiveClients={() => {
              setActiveTab('clients')
              setClientSubTab('actifs')
            }}
            onShowMessages={() => setActiveTab('clients')}
          />

          {activeTab === 'clients' && <AppPrompt userId={user?.id} dark />}

          {/* Renouvellements à préparer (S10+ de l'engagement de 12 semaines) */}
          {activeTab === 'clients' && clientSubTab !== 'archives' && (
            <RenewalsPanel coachId={user?.id} clients={activeClients} onOpenClient={openClient} />
          )}

          {/* ── VUE CLIENTS ── */}
          {activeTab === 'clients' ? (
            <ClientsTab
              isMobile={isMobile}
              clients={clients}
              archivedClients={archivedClients}
              clientSubTab={clientSubTab}
              onChangeSubTab={setClientSubTab}
              clientSearch={clientSearch}
              onChangeSearch={setClientSearch}
              clientSort={clientSort}
              onChangeSort={setClientSort}
              displayedClients={displayedClients}
              onSelectClient={openClient}
              onCreateClient={() => setShowCreate(true)}
              activity={activity}
              activityLoading={activityLoading}
              onSelectActivity={openClient}
              sessions={sessions}
              coachId={user?.id}
            />
          ) : /* ── VUE OFFRES ── */
          activeTab === 'offres' ? (
            <OffresTab isMobile={isMobile} clients={clients} onSelectClient={openClient} />
          ) : /* ── VUE CALENDRIER ── */
          activeTab === 'calendar' ? (
            <CalendarTab
              isMobile={isMobile}
              sessions={sessions}
              coachId={user?.id}
              clients={clients}
            />
          ) : null}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(nc) => setClients((prev) => [nc, ...prev])}
        />
      )}
    </div>
  )
}
