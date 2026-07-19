// pages/coach.js  — Ben&Fit Dashboard avec données Supabase réelles
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { watchBreakpoint } from '../lib/breakpoints'
import { signOutAndRedirect } from '../lib/auth'
import { Toast, useToast } from '../components/Toast'

import Avatar from '../components/coach/Avatar'
import KpiCard from '../components/coach/KpiCard'
import Badge from '../components/coach/Badge'
import ProgressBar from '../components/coach/ProgressBar'
import CreateClientModal from '../components/coach/CreateClientModal'
import OfferModal from '../components/coach/OfferModal'
import ArchiveModal from '../components/coach/ArchiveModal'
import ClientDetail from '../components/coach/ClientDetail'
import ActivityFeed from '../components/coach/ActivityFeed'
import CalendarPanel from '../components/coach/CalendarPanel'

import { OFFERS, S, font, bebas, daysAgo, toClientModel, computeCompliance } from '../lib/coachDashboard/shared'

export default function CoachDashboard() {
  const router = useRouter()
  const { toast, showToast } = useToast()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editingOffer, setEditingOffer] = useState(null)
  const [archivingClient, setArchivingClient] = useState(null)
  const [activeTab, setActiveTab] = useState('clients')
  const [clientSubTab, setClientSubTab] = useState('actifs')
  const [showCreate, setShowCreate] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [clientMeasures, setClientMeasures] = useState([])
  const [clientNutrition, setClientNutrition] = useState([])
  const [clientCompliance, setClientCompliance] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
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
        .gte(
          'date',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        )
      if (sess && sess.length > 0) {
        setSessions(
          sess.map((s) => ({
            date: s.date,
            client: s.client_name || s.client_id,
            type: s.type || 'Suivi',
            color: S.gold,
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

  useEffect(() => {
    const loadHistory = async () => {
      if (!selected) {
        setClientMeasures([])
        setClientNutrition([])
        setClientCompliance(null)
        return
      }
      setHistoryLoading(true)
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

        const [{ data: m }, { data: n }, { data: w }, { data: s }] = await Promise.all([
          supabase
            .from('measures')
            .select('*')
            .eq('client_id', selected)
            .order('date', { ascending: false })
            .limit(200),
          supabase
            .from('nutrition_logs')
            .select('*')
            .eq('client_id', selected)
            .order('date', { ascending: false })
            .limit(200),
          supabase
            .from('workouts')
            .select('id, day_of_week')
            .eq('client_id', selected),
          supabase
            .from('workout_sessions')
            .select('date, completed')
            .eq('client_id', selected)
            .gte('date', sevenDaysAgoStr),
        ])
        setClientMeasures(m || [])
        setClientNutrition(n || [])
        setClientCompliance(computeCompliance(w, s))
      } catch (err) {
        console.error('Erreur chargement historique client:', err)
        setClientMeasures([])
        setClientNutrition([])
        setClientCompliance(null)
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [selected])

  const archiveClient = async (clientId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/archive-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id: clientId, archived: true }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      const archivedAt = new Date().toISOString()
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, archived: true, archivedAt } : c))
      )
      setSelected(null)
      showToast('Client archivé', 'success')
    } catch (err) {
      console.error('Erreur archivage:', err)
      showToast('Erreur archivage : ' + err.message, 'error')
    }
  }

  const unarchiveClient = async (clientId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/archive-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id: clientId, archived: false }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, archived: false, archivedAt: null } : c))
      )
      setSelected(null)
      setClientSubTab('actifs')
      showToast('Client réactivé', 'success')
    } catch (err) {
      console.error('Erreur réactivation:', err)
      showToast('Erreur réactivation : ' + err.message, 'error')
    }
  }

  const handleNotesUpdate = (clientId, updatedNotes) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, notes: updatedNotes } : c)))
  }

  const handleSaveOffer = async (clientId, form) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, offer: form.offer, since: form.startDate, nextPayment: form.nextPayment }
          : c
      )
    )
    try {
      await supabase
        .from('profiles')
        .update({ offer: form.offer, next_payment: form.nextPayment || null })
        .eq('id', clientId)
    } catch (err) {
      console.error('Erreur mise à jour offre:', err)
    }
  }

  const activeClients = clients.filter((c) => !c.archived && c.status === 'actif')
  const archivedClients = clients.filter((c) => c.archived)
  const mrr = activeClients.reduce((s, c) => s + (OFFERS[c.offer]?.price || 0), 0)
  const pendingMsg = clients.reduce((s, c) => s + c.messages, 0)
  const selectedClient = selected ? clients.find((c) => c.id === selected) : null
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

  if (loading || !user)
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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: `3px solid ${S.border}`,
              borderTopColor: S.gold,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div
            style={{
              fontSize: 13,
              color: S.muted,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            Chargement
          </div>
        </div>
      </div>
    )

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
            background: 'white',
            borderRadius: 20,
            border: '1px solid #FECACA',
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
              background: S.navy,
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
      {toast && <Toast toast={toast} />}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* ── SIDEBAR ── */}
        {!isMobile && (
          <div
            style={{
              width: 220,
              background: `linear-gradient(180deg, ${S.navy}, ${S.navyDeep})`,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              height: '100vh',
            }}
          >
            <div
              style={{
                padding: '24px 20px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontFamily: bebas, fontSize: 26, color: S.gold, letterSpacing: 3 }}>
                  BEN&FIT
                </div>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: S.green,
                    boxShadow: `0 0 0 3px ${S.green}30`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                Cockpit Coach
              </div>
            </div>
            <nav style={{ padding: '16px 10px', flex: 1 }}>
              {[
                { id: 'clients', icon: '👥', label: 'Clients' },
                { id: 'offres', icon: '📦', label: 'Offres' },
                { id: 'calendar', icon: '📅', label: 'Calendrier' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setSelected(null)
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === item.id ? 'rgba(200,169,90,0.15)' : 'transparent',
                    color: activeTab === item.id ? S.gold : 'rgba(255,255,255,0.6)',
                    fontFamily: font,
                    fontSize: 13,
                    fontWeight: activeTab === item.id ? 700 : 500,
                    marginBottom: 2,
                    transition: 'all 0.15s',
                  }}
                >
                  {activeTab === item.id && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: -10,
                        top: '20%',
                        bottom: '20%',
                        width: 3,
                        borderRadius: 2,
                        background: S.gold,
                      }}
                    />
                  )}
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${S.gold}44`,
                  cursor: 'pointer',
                  background: `${S.gold}15`,
                  color: S.gold,
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 12,
                }}
              >
                + Nouvel élève
              </button>
            </nav>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar
                  initials={
                    user?.email?.[0]?.toUpperCase() + (user?.email?.[1]?.toUpperCase() || '') ||
                    'CO'
                  }
                  size={34}
                  color={S.gold}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Coach</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.45)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 120,
                    }}
                  >
                    {user?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => signOutAndRedirect(router)}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: font,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ⏻ Se déconnecter
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px', overflowY: 'auto' }}>
          {/* Nav mobile */}
          {isMobile && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 16,
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              {[
                { id: 'clients', icon: '👥' },
                { id: 'offres', icon: '📦' },
                { id: 'calendar', icon: '📅' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setSelected(null)
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === item.id ? S.navy : S.card,
                    color: activeTab === item.id ? S.gold : S.muted,
                    fontFamily: font,
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}

          {/* KPI Row — chaque tuile est un hyperlien vers la vue concernée */}
          {!selectedClient && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <KpiCard
                icon="👥"
                label="Clients actifs"
                value={activeClients.length}
                sub={`${archivedClients.length} archivé(s)`}
                onClick={() => {
                  setActiveTab('clients')
                  setClientSubTab('actifs')
                }}
              />
              <KpiCard
                icon="💰"
                label="MRR"
                value={`${mrr} €`}
                sub="Revenus mensuels"
                accent={S.gold}
              />
              {pendingMsg > 0 && (
                <KpiCard
                  icon="💬"
                  label="Messages"
                  value={pendingMsg}
                  sub="non lus"
                  accent={S.blue}
                  onClick={() => setActiveTab('clients')}
                />
              )}
            </div>
          )}

          {/* ── VUE DÉTAIL CLIENT ── */}
          {(activeTab === 'clients' || activeTab === 'calendar') && selectedClient ? (
            <ClientDetail
              client={selectedClient}
              onBack={() => setSelected(null)}
              onEditOffer={() => setEditingOffer(selectedClient)}
              onNavigate={(id) => router.push(`/coach/${id}?tab=overview`)}
              onArchive={(c) => setArchivingClient(c)}
              onUnarchive={unarchiveClient}
              onNotesUpdate={handleNotesUpdate}
              measures={clientMeasures}
              compliance={clientCompliance}
              nutritionLogs={clientNutrition}
              historyLoading={historyLoading}
            />
          ) : /* ── VUE CLIENTS ── */
          activeTab === 'clients' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
                gap: 16,
              }}
            >
              <div>
                {/* Sous-onglets Actifs / Anciens clients */}
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    marginBottom: 16,
                    borderBottom: `2px solid ${S.border}`,
                  }}
                >
                  {[
                    {
                      id: 'actifs',
                      label: `Actifs (${clients.filter((c) => !c.archived).length})`,
                      color: S.navy,
                    },
                    {
                      id: 'archives',
                      label: `Anciens clients (${archivedClients.length})`,
                      color: S.purple,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setClientSubTab(tab.id)
                        setSelected(null)
                      }}
                      style={{
                        padding: '8px 18px',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: font,
                        fontSize: 13,
                        fontWeight: clientSubTab === tab.id ? 700 : 500,
                        cursor: 'pointer',
                        color: clientSubTab === tab.id ? tab.color : S.muted,
                        borderBottom: `2px solid ${clientSubTab === tab.id ? tab.color : 'transparent'}`,
                        marginBottom: -2,
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bandeau info archives */}
                {clientSubTab === 'archives' && archivedClients.length > 0 && (
                  <div
                    style={{
                      background: '#F3F0FC',
                      border: `1px solid #C4B8E8`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      marginBottom: 14,
                      fontSize: 12,
                      color: S.purple,
                    }}
                  >
                    📦 Ces clients sont archivés. Leurs données sont conservées. Clique sur un
                    client pour le réactiver.
                  </div>
                )}

                {/* Barre de recherche + tri */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Rechercher un élève…"
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: `1px solid ${S.border}`,
                      fontFamily: font,
                      fontSize: 13,
                      outline: 'none',
                      background: S.card,
                    }}
                  />
                  <select
                    value={clientSort}
                    onChange={(e) => setClientSort(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: `1px solid ${S.border}`,
                      fontFamily: font,
                      fontSize: 12.5,
                      color: S.navy,
                      background: S.card,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="recent">Trier : activité récente</option>
                    <option value="name">Trier : nom (A→Z)</option>
                    <option value="balance">Trier : solde</option>
                  </select>
                </div>

                {displayedClients.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      background: 'white',
                      borderRadius: 20,
                      border: `2px dashed ${S.border}`,
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 12 }}>
                      {clientSubTab === 'archives' ? '📦' : '🏋️'}
                    </div>
                    <div
                      style={{ fontFamily: bebas, fontSize: 20, color: S.navy, marginBottom: 8 }}
                    >
                      {clientSubTab === 'archives' ? 'AUCUN ANCIEN CLIENT' : 'AUCUN ÉLÈVE'}
                    </div>
                    <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>
                      {clientSubTab === 'archives'
                        ? 'Les clients archivés apparaîtront ici.'
                        : 'Crée ton premier élève pour commencer.'}
                    </div>
                    {clientSubTab === 'actifs' && (
                      <button
                        onClick={() => setShowCreate(true)}
                        style={{
                          padding: '10px 22px',
                          background: S.navy,
                          color: 'white',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: font,
                        }}
                      >
                        + Nouvel élève
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayedClients.map((c) => {
                      const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
                      const archived = c.archived
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelected(c.id)}
                          style={{
                            background: archived ? '#F7F6FB' : S.card,
                            border: `1px solid ${archived ? '#D8D2EE' : S.border}`,
                            borderRadius: 14,
                            padding: '14px 18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            transition: 'box-shadow 0.15s, transform 0.15s',
                            opacity: archived ? 0.85 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,27,78,0.1)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          <Avatar
                            initials={c.avatar}
                            size={42}
                            color={offer.color}
                            grayscale={archived}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 4,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 14,
                                  color: archived ? S.muted : S.navy,
                                }}
                              >
                                {c.name}
                              </div>
                              <Badge text={offer.name} color={archived ? S.gray : offer.color} />
                              {archived ? (
                                <Badge text="Archivé" color={S.purple} bg="#EDE9F8" />
                              ) : (
                                c.status !== 'actif' && <Badge text="inactif" color={S.red} />
                              )}
                              {c.messages > 0 && (
                                <Badge text={`${c.messages} msg`} color={S.blue} />
                              )}
                              {c.notes && c.notes.length > 0 && (
                                <span
                                  title={`${c.notes.length} annotation(s)`}
                                  style={{ fontSize: 12 }}
                                >
                                  📌
                                </span>
                              )}
                            </div>
                            {archived && c.archivedAt ? (
                              <div style={{ fontSize: 11, color: S.purple }}>
                                Archivé le{' '}
                                {new Date(c.archivedAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: S.muted }}>{c.program}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div
                              style={{
                                fontFamily: bebas,
                                fontSize: 18,
                                color: c.balance < 0 ? S.red : archived ? S.muted : S.navy,
                              }}
                            >
                              {c.balance === 0 ? (archived ? '—' : '✓') : `${c.balance} €`}
                            </div>
                            <div style={{ fontSize: 10, color: S.muted }}>
                              {daysAgo(c.lastBilan)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ActivityFeed
                  items={activity}
                  loading={activityLoading}
                  onSelect={(id) => {
                    setSelected(id)
                    setActiveTab('clients')
                  }}
                />
                <CalendarPanel sessions={sessions} coachId={user?.id} clients={clients} />
              </div>
            </div>
          ) : /* ── VUE OFFRES ── */
          activeTab === 'offres' ? (
            <div>
              <div
                style={{
                  fontFamily: bebas,
                  fontSize: 18,
                  color: S.navy,
                  letterSpacing: 2,
                  marginBottom: 20,
                }}
              >
                MES OFFRES
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {Object.values(OFFERS).map((offer) => {
                  const count = clients.filter(
                    (c) => !c.archived && c.offer === offer.id && c.status === 'actif'
                  ).length
                  return (
                    <div
                      key={offer.id}
                      style={{
                        background: S.card,
                        border: `2px solid ${offer.color}44`,
                        borderRadius: 18,
                        padding: '24px 28px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{offer.badge}</div>
                          <div
                            style={{
                              fontFamily: bebas,
                              fontSize: 24,
                              color: S.navy,
                              letterSpacing: 2,
                            }}
                          >
                            {offer.name.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontFamily: bebas,
                              fontSize: 32,
                              color: offer.color,
                              letterSpacing: 1,
                            }}
                          >
                            {offer.price} €
                          </div>
                          <div style={{ fontSize: 11, color: S.muted }}>par mois</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {offer.features.map((f) => (
                          <div
                            key={f}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '5px 0',
                              borderBottom: `1px solid ${S.border}`,
                              fontSize: 13,
                            }}
                          >
                            <span style={{ color: offer.color, fontWeight: 800 }}>✓</span>
                            {f}
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: `${offer.color}10`,
                          borderRadius: 10,
                        }}
                      >
                        <span style={{ fontSize: 12, color: S.muted }}>
                          Clients actifs sur cette offre
                        </span>
                        <span style={{ fontFamily: bebas, fontSize: 22, color: offer.color }}>
                          {count}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  fontFamily: bebas,
                  fontSize: 14,
                  color: S.navy,
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                RÉPARTITION
              </div>
              <div
                style={{
                  background: S.card,
                  border: `1px solid ${S.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    background: '#F8FAFF',
                    padding: '10px 18px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: S.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    borderBottom: `1px solid ${S.border}`,
                  }}
                >
                  <span>Client</span>
                  <span>Offre</span>
                  <span>Tarif</span>
                  <span>Statut</span>
                </div>
                {clients
                  .filter((c) => !c.archived)
                  .map((c) => {
                    const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelected(c.id)
                          setActiveTab('clients')
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr 1fr',
                          padding: '12px 18px',
                          borderBottom: `1px solid ${S.border}`,
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFF')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar initials={c.avatar} size={28} color={offer.color} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                        </div>
                        <Badge text={offer.name} color={offer.color} />
                        <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy }}>
                          {offer.price} €
                        </div>
                        <Badge text={c.status} color={c.status === 'actif' ? S.green : S.red} />
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : /* ── VUE CALENDRIER ── */
          activeTab === 'calendar' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
                gap: 16,
              }}
            >
              <CalendarPanel sessions={sessions} coachId={user?.id} clients={clients} />
              <div>
                <div
                  style={{
                    fontFamily: bebas,
                    fontSize: 18,
                    color: S.navy,
                    letterSpacing: 2,
                    marginBottom: 14,
                  }}
                >
                  TOUS LES SUIVIS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: 'white',
                        borderRadius: 14,
                        border: `1px solid ${S.border}`,
                        color: S.muted,
                        fontSize: 13,
                      }}
                    >
                      Aucune session enregistrée ce mois-ci.
                    </div>
                  ) : (
                    sessions.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: S.card,
                          border: `1px solid ${S.border}`,
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 4,
                            height: 36,
                            borderRadius: 2,
                            background: s.color,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: S.navy }}>
                            {s.client}
                          </div>
                          <Badge text={s.type} color={s.color} />
                        </div>
                        <div style={{ fontSize: 12, color: S.muted }}>
                          {new Date(s.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
      {editingOffer && (
        <OfferModal
          client={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSave={handleSaveOffer}
        />
      )}
      {archivingClient && (
        <ArchiveModal
          client={archivingClient}
          onClose={() => setArchivingClient(null)}
          onConfirm={archiveClient}
        />
      )}
    </div>
  )
}
v
