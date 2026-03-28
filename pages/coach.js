import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

const COACH_TABS = [
  { label: 'Vue client', value: 'overview' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Bilans', value: 'bilans' },
  { label: 'Messages', value: 'messages' },
]

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return '—'
  }
}

function clientLabel(client) {
  return client?.display_name || client?.email || 'Client'
}

export default function CoachPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [coach, setCoach] = useState(null)

  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [workouts, setWorkouts] = useState([])
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [bilans, setBilans] = useState([])
  const [messages, setMessages] = useState([])

  const [creatingClient, setCreatingClient] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    let active = true
    let inboxChannel = null

    async function boot() {
      try {
        setLoading(true)
        setError('')

        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user

        if (!currentUser) {
          router.push('/')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profileError) throw profileError

        if (profile?.role !== 'coach') {
          router.push('/dashboard')
          return
        }

        if (!active) return
        setCoach(profile)

        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('coach_id', currentUser.id)
          .order('display_name', { ascending: true })

        if (clientsError) throw clientsError

        if (!active) return
        const safeClients = clientsData || []
        setClients(safeClients)

        if (safeClients[0]) {
          setSelectedClientId((prev) => prev || safeClients[0].id)
        }

        inboxChannel = supabase
          .channel('coach-messages-premium')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            () => {
              if (active && selectedClientId) loadMessages(selectedClientId)
            }
          )
          .subscribe()
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger le cockpit coach')
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()

    return () => {
      active = false
      if (inboxChannel) {
        supabase.removeChannel(inboxChannel)
      }
    }
  }, [router, selectedClientId])

  useEffect(() => {
    if (selectedClientId) {
      loadClientContext(selectedClientId)
    }
  }, [selectedClientId])

  async function loadMessages(clientId) {
    const { data, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${clientId},receiver_id.eq.${clientId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (messagesError) throw messagesError
    setMessages(data || [])
  }

  async function loadClientContext(clientId) {
    try {
      setRefreshing(true)
      setError('')
      setSuccess('')

      const [
        { data: workoutsData, error: workoutsError },
        { data: nutritionData, error: nutritionError },
        { data: bilansData, error: bilansError },
      ] = await Promise.all([
        supabase
          .from('workouts')
          .select('*, exercises(*)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true }),
        supabase
          .from('nutrition_plans')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('bilans')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      if (workoutsError) throw workoutsError
      if (nutritionError) throw nutritionError
      if (bilansError) throw bilansError

      const normalizedWorkouts = (workoutsData || []).map((w) => ({
        ...w,
        exercises: [...(w.exercises || [])].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        ),
      }))

      setWorkouts(normalizedWorkouts)
      setNutritionPlan(nutritionData?.[0] || null)
      setBilans(bilansData || [])

      await loadMessages(clientId)
    } catch (e) {
      setError(e.message || 'Impossible de charger les données client')
    } finally {
      setRefreshing(false)
    }
  }

  async function refreshClients() {
    try {
      setRefreshing(true)
      setError('')
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData?.user
      if (!currentUser) return

      const { data, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('coach_id', currentUser.id)
        .order('display_name', { ascending: true })

      if (clientsError) throw clientsError
      const safe = data || []
      setClients(safe)

      if (selectedClientId) {
        const stillExists = safe.find((c) => c.id === selectedClientId)
        if (!stillExists) {
          setSelectedClientId(safe[0]?.id || null)
        }
      } else {
        setSelectedClientId(safe[0]?.id || null)
      }
    } catch (e) {
      setError(e.message || 'Impossible de rafraîchir la liste clients')
    } finally {
      setRefreshing(false)
    }
  }

  async function createClient() {
    try {
      setCreatingClient(true)
      setError('')
      setSuccess('')

      const payload = {
        first_name: newClient.first_name.trim(),
        last_name: newClient.last_name.trim(),
        email: newClient.email.trim().toLowerCase(),
        password: newClient.password,
      }

      if (!payload.first_name || !payload.last_name || !payload.email || !payload.password) {
        throw new Error('Merci de remplir tous les champs pour créer le client')
      }

      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData?.user
      if (!currentUser) throw new Error('Session coach introuvable')

      const response = await fetch('/api/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, coach_id: currentUser.id }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || 'Impossible de créer le client')

      setNewClient({ first_name: '', last_name: '', email: '', password: '' })
      setSuccess('Client créé avec succès.')
      await refreshClients()
    } catch (e) {
      setError(e.message || 'Impossible de créer le client')
    } finally {
      setCreatingClient(false)
    }
  }

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => {
      const hay = `${client.display_name || ''} ${client.email || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [clients, search])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  )

  const workoutCount = workouts.length
  const exerciseCount = workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)
  const unreadMessages = messages.filter((m) => m.receiver_id === coach?.id && !m.read_at).length
  const latestBilan = bilans[0] || null

  return (
    <AppShell
      title="Coach cockpit"
      subtitle="Un cockpit propre et clair pour suivre tes clients, naviguer vite et piloter les actions importantes."
      actions={
        <div className="ui-cluster">
          <button type="button" className="ui-button ui-button--secondary" onClick={refreshClients} disabled={refreshing}>
            {refreshing ? 'Actualisation…' : 'Rafraîchir'}
          </button>
          <SegmentTabs items={COACH_TABS} value={activeTab} onChange={setActiveTab} />
        </div>
      }
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--success)' }}>OK</strong>
            <div className="ui-muted" style={{ color: 'var(--success)' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {loading ? (
        <SurfaceCard padded>
          <div className="ui-muted">Chargement du cockpit…</div>
        </SurfaceCard>
      ) : (
        <div className="ui-grid-3">
          <div className="ui-stack">
            <SurfaceCard padded sticky>
              <SectionHead
                title="Clients"
                caption="Recherche rapide, sélection et navigation."
                action={<StatusBadge tone="default">{clients.length} total</StatusBadge>}
              />

              <div style={{ marginBottom: 14 }}>
                <input
                  className="ui-input"
                  placeholder="Rechercher un client…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {filteredClients.length ? (
                <div className="ui-list">
                  {filteredClients.map((client) => {
                    const active = client.id === selectedClientId
                    return (
                      <button
                        key={client.id}
                        type="button"
                        className={`ui-list-item ${active ? 'is-active' : ''}`}
                        onClick={() => setSelectedClientId(client.id)}
                        style={{ textAlign: 'left', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{clientLabel(client)}</div>
                          <div className="ui-muted" style={{ fontSize: 13 }}>
                            {client.email || 'Email non renseigné'}
                          </div>
                        </div>
                        {active ? <StatusBadge tone="accent">Ouvert</StatusBadge> : null}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <EmptyPanel
                  title="Aucun client"
                  description="Essaie une autre recherche ou crée un nouveau client."
                />
              )}
            </SurfaceCard>

            <SurfaceCard padded>
              <SectionHead title="Créer un client" caption="Ajout rapide depuis le cockpit coach." />
              <div className="ui-stack">
                <input
                  className="ui-input"
                  placeholder="Prénom"
                  value={newClient.first_name}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, first_name: e.target.value }))}
                />
                <input
                  className="ui-input"
                  placeholder="Nom"
                  value={newClient.last_name}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, last_name: e.target.value }))}
                />
                <input
                  className="ui-input"
                  placeholder="Email"
                  value={newClient.email}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  className="ui-input"
                  placeholder="Mot de passe temporaire"
                  type="password"
                  value={newClient.password}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="ui-button ui-button--primary"
                  onClick={createClient}
                  disabled={creatingClient}
                >
                  {creatingClient ? 'Création…' : 'Créer le client'}
                </button>
              </div>
            </SurfaceCard>
          </div>

          <div className="ui-stack">
            {!selectedClient ? (
              <SurfaceCard padded>
                <EmptyPanel
                  title="Aucun client sélectionné"
                  description="Choisis un client dans la colonne de gauche pour ouvrir son cockpit."
                />
              </SurfaceCard>
            ) : (
              <>
                <SurfaceCard padded sticky style={{ top: 16, zIndex: 2 }}>
                  <div className="ui-toolbar">
                    <div>
                      <div className="ui-page-title" style={{ fontSize: 28 }}>
                        {clientLabel(selectedClient)}
                      </div>
                      <div className="ui-page-subtitle" style={{ marginTop: 6 }}>
                        {selectedClient.email || 'Email non renseigné'}
                      </div>
                    </div>
                    <div className="ui-cluster">
                      <StatusBadge tone="accent">Client actif</StatusBadge>
                      <button
                        type="button"
                        className="ui-button ui-button--secondary"
                        onClick={() => router.push(`/coach/${selectedClient.id}`)}
                      >
                        Ouvrir la fiche
                      </button>
                    </div>
                  </div>
                </SurfaceCard>

                {activeTab === 'overview' && (
                  <>
                    <SurfaceCard padded>
                      <SectionHead
                        title="Vue d’ensemble"
                        caption="Le résumé opérationnel du client sélectionné."
                      />
                      <div className="ui-kpi-row">
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Séances</p>
                          <p className="ui-kpi-value">{workoutCount}</p>
                        </div>
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Exercices</p>
                          <p className="ui-kpi-value">{exerciseCount}</p>
                        </div>
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Messages</p>
                          <p className="ui-kpi-value">{messages.length}</p>
                        </div>
                      </div>
                    </SurfaceCard>

                    <SurfaceCard padded>
                      <SectionHead title="Programme" caption="Séances actuellement disponibles." />
                      {workouts.length ? (
                        <div className="ui-stack">
                          {workouts.map((workout) => (
                            <div key={workout.id} className="ui-card ui-card--padded">
                              <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                                <div style={{ fontWeight: 800 }}>{workout.name || 'Séance'}</div>
                                <StatusBadge tone="default">{workout.exercises?.length || 0} exo</StatusBadge>
                              </div>
                              <div className="ui-muted" style={{ lineHeight: 1.6 }}>
                                {(workout.exercises || []).slice(0, 4).map((ex) => ex.name).filter(Boolean).join(' · ') || 'Aucun exercice'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyPanel
                          title="Aucun programme"
                          description="Ce client n’a pas encore de séances programmées."
                        />
                      )}
                    </SurfaceCard>
                  </>
                )}

                {activeTab === 'nutrition' && (
                  <SurfaceCard padded>
                    <SectionHead title="Nutrition" caption="Dernier plan nutritionnel enregistré." />
                    {nutritionPlan ? (
                      <div className="ui-stack">
                        <div className="ui-kpi-row">
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Calories</p>
                            <p className="ui-kpi-value">{nutritionPlan.calories || nutritionPlan.target_calories || '—'}</p>
                          </div>
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Protéines</p>
                            <p className="ui-kpi-value">{nutritionPlan.protein || nutritionPlan.target_protein || '—'}</p>
                          </div>
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Glucides</p>
                            <p className="ui-kpi-value">{nutritionPlan.carbs || nutritionPlan.target_carbs || '—'}</p>
                          </div>
                        </div>
                        <div className="ui-card ui-card--padded">
                          <div className="ui-label">Notes</div>
                          <div className="ui-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                            {nutritionPlan.notes || 'Aucune note nutritionnelle.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyPanel
                        title="Aucun plan nutritionnel"
                        description="Ce client n’a pas encore de plan nutrition enregistré."
                      />
                    )}
                  </SurfaceCard>
                )}

                {activeTab === 'bilans' && (
                  <SurfaceCard padded>
                    <SectionHead
                      title="Bilans"
                      caption="Historique récent et point d’entrée pour la réponse coach."
                      action={
                        selectedClient ? (
                          <button
                            type="button"
                            className="ui-button ui-button--primary"
                            onClick={() => router.push(`/agent-bilan?clientId=${selectedClient.id}`)}
                          >
                            Répondre avec AI
                          </button>
                        ) : null
                      }
                    />
                    {bilans.length ? (
                      <div className="ui-stack">
                        {bilans.map((bilan) => (
                          <div key={bilan.id} className="ui-card ui-card--padded">
                            <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                              <div style={{ fontWeight: 800 }}>{bilan.title || 'Bilan hebdo'}</div>
                              <StatusBadge tone="default">{formatDate(bilan.created_at)}</StatusBadge>
                            </div>
                            <div className="ui-muted" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {bilan.content || bilan.summary || 'Contenu du bilan indisponible.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel
                        title="Aucun bilan"
                        description="Le client n’a pas encore soumis de bilan."
                      />
                    )}
                  </SurfaceCard>
                )}

                {activeTab === 'messages' && (
                  <SurfaceCard padded>
                    <SectionHead title="Messages" caption="Derniers échanges avec le client." />
                    {messages.length ? (
                      <div className="ui-stack">
                        {messages.map((message) => {
                          const outbound = message.sender_id === coach?.id
                          return (
                            <div
                              key={message.id}
                              className="ui-card ui-card--padded"
                              style={{
                                borderColor: outbound ? 'var(--accent)' : 'var(--border)',
                                background: outbound ? '#f8fbff' : 'white',
                              }}
                            >
                              <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                                <StatusBadge tone={outbound ? 'accent' : 'default'}>
                                  {outbound ? 'Coach' : 'Client'}
                                </StatusBadge>
                                <div className="ui-muted" style={{ fontSize: 12 }}>
                                  {formatDate(message.created_at)}
                                </div>
                              </div>
                              <div style={{ lineHeight: 1.65 }}>{message.content || message.body || 'Message vide.'}</div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <EmptyPanel
                        title="Aucun message"
                        description="Aucun échange récent avec ce client."
                      />
                    )}
                  </SurfaceCard>
                )}
              </>
            )}
          </div>

          <div className="ui-stack">
            <SurfaceCard padded sticky>
              <SectionHead title="Contexte rapide" caption="Les infos utiles sans changer d’écran." />
              {!selectedClient ? (
                <EmptyPanel
                  title="Aucun contexte"
                  description="Sélectionne un client pour voir son état général."
                />
              ) : (
                <div className="ui-stack">
                  <div className="ui-card ui-card--soft ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Client sélectionné</div>
                    <div className="ui-muted">{clientLabel(selectedClient)}</div>
                  </div>

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Signaux rapides</div>
                    <div className="ui-stack" style={{ gap: 10 }}>
                      <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                        <span>Programme</span>
                        <StatusBadge tone={workoutCount ? 'success' : 'warning'}>
                          {workoutCount ? 'Actif' : 'Vide'}
                        </StatusBadge>
                      </div>
                      <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                        <span>Nutrition</span>
                        <StatusBadge tone={nutritionPlan ? 'success' : 'warning'}>
                          {nutritionPlan ? 'OK' : 'À faire'}
                        </StatusBadge>
                      </div>
                      <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                        <span>Messages non lus</span>
                        <StatusBadge tone={unreadMessages ? 'warning' : 'default'}>
                          {unreadMessages}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernier bilan</div>
                    {latestBilan ? (
                      <>
                        <div className="ui-muted" style={{ marginBottom: 8 }}>
                          {formatDate(latestBilan.created_at)}
                        </div>
                        <div className="ui-muted" style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                          {(latestBilan.summary || latestBilan.content || '').slice(0, 240) || 'Pas de résumé disponible.'}
                        </div>
                      </>
                    ) : (
                      <div className="ui-muted">Aucun bilan récent.</div>
                    )}
                  </div>

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Actions rapides</div>
                    <div className="ui-stack" style={{ gap: 10 }}>
                      <button
                        type="button"
                        className="ui-button ui-button--secondary"
                        onClick={() => selectedClient && router.push(`/coach/${selectedClient.id}`)}
                        disabled={!selectedClient}
                      >
                        Ouvrir la fiche client
                      </button>
                      <button
                        type="button"
                        className="ui-button ui-button--secondary"
                        onClick={() => setActiveTab('messages')}
                        disabled={!selectedClient}
                      >
                        Voir les messages
                      </button>
                      <button
                        type="button"
                        className="ui-button ui-button--secondary"
                        onClick={() => setActiveTab('bilans')}
                        disabled={!selectedClient}
                      >
                        Voir les bilans
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </SurfaceCard>
          </div>
        </div>
      )}
    </AppShell>
  )
}
