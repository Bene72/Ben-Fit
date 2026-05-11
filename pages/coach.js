import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { callEdgeFunction, sessionsThisWeek, lastWeight } from '../lib/coachUtils'

import CoachHub      from '../components/coach/CoachHub'
import OverviewTab   from '../components/coach/OverviewTab'
import BilanTab      from '../components/coach/BilanTab'
import MessagesTab   from '../components/coach/MessagesTab'
import GestionTab    from '../components/coach/GestionTab'
import ProgrammeTab  from '../components/programme/ProgrammeTab'
import NutritionTab  from '../components/nutrition/NutritionTab'
import BillingCockpit from '../components/coach/BillingCockpit'
import LoadingScreen from '../components/coach/LoadingScreen'

// ─── Styles boutons inline réutilisables ─────────────────────
const btn = (bg, color, border) => ({
  padding: '6px 12px', background: bg, color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: '7px', fontSize: '12px', fontWeight: '600',
  cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
})

export default function CoachPanel() {
  const router = useRouter()
  const [user, setUser]               = useState(null)
  const [clients, setClients]         = useState([])
  const [selected, setSelected]       = useState(null)
  const [tab, setTab]                 = useState('overview')
  const [loading, setLoading]         = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient]     = useState({ full_name: '', email: '', password: '' })
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cockpitTab, setCockpitTab]   = useState('dashboard') // dashboard, clients, billing, settings

  // ── Boot ─────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard'); return }
      setUser(user)
      await loadClients(user.id)

      // Unread messages
      const { data: unreadData } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id).eq('read', false)
      const counts = {}
      ;(unreadData || []).forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
      setUnreadCounts(counts)

      // Realtime inbox
      supabase.channel('coach-inbox')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          payload => setUnreadCounts(prev => ({ ...prev, [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1 }))
        ).subscribe()

      setLoading(false)
    }
    boot()
  }, [])

  const loadClients = async (coachId) => {
    const { data } = await supabase.from('profiles')
      .select('*, measures(weight, date), workout_sessions(date)')
      .eq('coach_id', coachId).eq('role', 'client').order('full_name')
    setClients(data || [])
  }

  const selectClient = (client) => {
    setSelected(client)
    setTab('overview')
    setUnreadCounts(prev => ({ ...prev, [client.id]: 0 }))
  }

  const createClient = async () => {
    if (!newClient.full_name.trim() || !newClient.email.trim() || !newClient.password.trim()) {
      setCreateError('Tous les champs sont obligatoires'); return
    }
    setCreating(true); setCreateError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await callEdgeFunction('create-client', { ...newClient, coach_id: session.user.id })
      await loadClients(session.user.id)
      setCreateSuccess({ ...newClient })
      setShowNewClient(false)
      setNewClient({ full_name: '', email: '', password: '' })
    } catch(e) { setCreateError('Erreur: ' + e.message) }
    setCreating(false)
  }

  if (loading) return <LoadingScreen />

  const lbl2 = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px' }
  const inp2 = { width: '100%', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }

  return (
    <>
      <Head>
        <title>Ben&Fit — Coach</title>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#EEF0F5', fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── Toggle sidebar ── */}
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position: 'fixed', top: '16px', left: sidebarOpen ? '218px' : '12px', zIndex: 200, width: '32px', height: '32px', background: '#0D1B4E', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'left 0.25s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {sidebarOpen ? '←' : '☰'}
        </button>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: sidebarOpen ? '260px' : '0px', background: '#0D1B4E', position: 'fixed', top: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden', transition: 'width 0.25s ease' }}>
          <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'white', letterSpacing: '2px', lineHeight: 1 }}>BEN&FIT</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>Coach · 🏠 Accueil</div>
              </div>
            </a>
          </div>
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#444438', padding: '8px 12px' }}>{clients.length} clients</div>
            {clients.map(client => {
              const isSelected = selected?.id === client.id
              const w = sessionsThisWeek(client)
              const hue = (client.full_name?.charCodeAt(0) || 65) * 7 % 360
              return (
                <button key={client.id} onClick={() => selectClient(client)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: "'DM Sans',sans-serif", marginBottom: '2px', transition: 'all 0.2s' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: `hsl(${hue},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700' }}>
                    {client.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: isSelected ? 'white' : '#C8C8B8', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7A99' }}>{w}/5 séances · {lastWeight(client)} kg</div>
                  </div>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: w >= 4 ? '#8FA07A' : w <= 1 ? '#C45C3A' : '#4A6FD4', display: 'block' }} />
                    {unreadCounts[client.id] > 0 && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E53935', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0D1B4E' }}>
                        {unreadCounts[client.id] > 9 ? '9+' : unreadCounts[client.id]}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ padding: '16px', borderTop: '1px solid #2E2E24', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => setShowNewClient(true)} style={{ width: '100%', padding: '9px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Nouveau client</button>
            <button onClick={() => { supabase.auth.signOut(); router.push('/') }} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #2E2E24', borderRadius: '8px', color: '#6B7A99', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Déconnexion</button>
          </div>
        </aside>

        {/* ── CONTENU PRINCIPAL ── */}
        <main style={{ marginLeft: sidebarOpen ? '260px' : '0px', flex: 1, transition: 'margin-left 0.25s ease', minWidth: 0 }}>
          {!selected ? (
            // ── COCKPIT PRINCIPAL (aucun client sélectionné) ──
            <div style={{ padding: '28px 32px' }}>
              {/* Navigation du cockpit */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #C5D0F0', paddingBottom: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'dashboard', label: '📊 Dashboard' },
                  { id: 'clients', label: '👥 Clients' },
                  { id: 'billing', label: '💰 Facturation' }
                ].map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => setCockpitTab(tabItem.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: cockpitTab === tabItem.id ? '#0D1B4E' : 'transparent',
                      color: cockpitTab === tabItem.id ? 'white' : '#6B7A99',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>

              {/* Dashboard (vue par défaut) */}
              {cockpitTab === 'dashboard' && (
                <CoachHub
                  clients={clients}
                  user={user}
                  sessionsThisWeek={sessionsThisWeek}
                  lastWeight={lastWeight}
                  unreadCounts={unreadCounts}
                  onSelectClient={selectClient}
                  onNewClient={() => setShowNewClient(true)}
                />
              )}

              {/* Vue Clients (liste détaillée) */}
              {cockpitTab === 'clients' && (
                <ClientListView 
                  clients={clients}
                  onSelectClient={selectClient}
                  sessionsThisWeek={sessionsThisWeek}
                  lastWeight={lastWeight}
                  unreadCounts={unreadCounts}
                />
              )}

              {/* Vue Facturation */}
              {cockpitTab === 'billing' && (
                <BillingCockpit coachId={user?.id} />
              )}
            </div>
          ) : (
            // ── VUE DÉTAIL D'UN CLIENT (sélectionné) ──
            <>
              {/* ── Breadcrumb + nav ── */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid #C5D0F0', background: '#EEF2FF', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <button onClick={() => setSelected(null)}
                    style={{ ...btn('none', '#6B7A99'), padding: '3px 8px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E8ECFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    🏠 Accueil coach
                  </button>
                  <span style={{ color: '#C5D0F0', fontSize: '16px' }}>›</span>
                  <button onClick={() => setTab('overview')}
                    style={{ ...btn('none', '#0D1B4E'), display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E8ECFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `hsl(${(selected.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'white', fontWeight: '800' }}>
                      {selected.full_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{selected.full_name}</span>
                  </button>
                  {tab !== 'overview' && (
                    <>
                      <span style={{ color: '#C5D0F0', fontSize: '16px' }}>›</span>
                      <span style={{ fontSize: '12px', color: '#4A6FD4', fontWeight: '700' }}>
                        {tab === 'programme' ? 'Programme' : tab === 'nutrition' ? 'Nutrition' : tab === 'bilan' ? 'Bilan' : tab === 'messages' ? 'Messages' : 'Gestion'}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#9BA8C0' }}>{selected.email}</div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      ['overview', "Vue d'ensemble"],
                      ['programme', 'Programme'],
                      ['nutrition', 'Nutrition'],
                      ['bilan', 'Bilan'],
                      ['messages', 'Messages'],
                      ['gestion', 'Gestion'],
                    ].map(([t, label]) => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', background: tab === t ? (t === 'gestion' ? '#C45C3A' : '#0D1B4E') : 'transparent', color: tab === t ? 'white' : '#6B7A99', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Onglets client ── */}
              <div style={{ padding: '28px 32px' }}>
                {tab === 'overview'   && <OverviewTab client={selected} sessionsThisWeek={sessionsThisWeek} lastWeight={lastWeight} coachId={user?.id} onUpdate={c => { setSelected(c); setClients(prev => prev.map(x => x.id === c.id ? c : x)) }} />}
                {tab === 'programme'  && <ProgrammeTab clientId={selected.id} clientName={selected.full_name} coachId={user?.id} />}
                {tab === 'nutrition'  && <NutritionTab clientId={selected.id} clientName={selected.full_name} />}
                {tab === 'bilan'      && <BilanTab clientId={selected.id} clientName={selected.full_name} coachId={user?.id} />}
                {tab === 'messages'   && <MessagesTab coachId={user?.id} clientId={selected.id} clientName={selected.full_name} onRead={() => setUnreadCounts(prev => ({ ...prev, [selected.id]: 0 }))} />}
                {tab === 'gestion'    && <GestionTab client={selected} onDelete={() => { setSelected(null); loadClients(user.id) }} />}
              </div>
            </>
          )}
        </main>

        {/* ── Modal nouveau client ── */}
        {showNewClient && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#0D1B4E', border: '1px solid #3E3E30', borderRadius: '16px', padding: '28px', width: '380px', fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', color: '#EEF2FF', marginBottom: '20px', letterSpacing: '2px' }}>NOUVEAU CLIENT</div>
              {[
                { label: 'Nom complet', key: 'full_name', placeholder: 'Jean Dupont', type: 'text' },
                { label: 'Email', key: 'email', placeholder: 'jean@email.com', type: 'email' },
                { label: 'Mot de passe temporaire', key: 'password', placeholder: 'MotDePasse123!', type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ ...lbl2 }}>{f.label}</label>
                  <input type={f.type} value={newClient[f.key]} onChange={e => setNewClient(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp2} />
                </div>
              ))}
              {createError && <div style={{ color: '#FF8A8A', fontSize: '13px', marginBottom: '12px', background: 'rgba(220,53,69,0.15)', padding: '8px 12px', borderRadius: '7px' }}>{createError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={createClient} disabled={creating}
                  style={{ flex: 1, padding: '10px', background: creating ? 'rgba(255,255,255,0.1)' : '#4A6FD4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  {creating ? 'Création…' : '✓ Créer le client'}
                </button>
                <button onClick={() => { setShowNewClient(false); setCreateError('') }}
                  style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Success modal ── */}
        {createSuccess && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '380px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: '#0D1B4E', marginBottom: '12px' }}>Client créé !</div>
              <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '16px', lineHeight: 1.7 }}>
                <strong>{createSuccess.full_name}</strong><br />
                Email : {createSuccess.email}<br />
                Mot de passe : <code>{createSuccess.password}</code>
              </div>
              <button onClick={() => setCreateSuccess(null)} style={{ width: '100%', padding: '10px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── COMPOSANT CLIENT LIST VIEW (pour l'onglet Clients) ─────────────────
function ClientListView({ clients, onSelectClient, sessionsThisWeek, lastWeight, unreadCounts }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B4E' }}>👥 Tous les clients</h3>
        <p style={{ color: '#6B7A99', fontSize: 13 }}>{clients.length} client(s) actif(s)</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {clients.map(client => {
          const sessions = sessionsThisWeek(client)
          const target = client.session_target || 5
          const pct = Math.min(100, Math.round((sessions / target) * 100))
          const w = lastWeight(client)
          const hue = (client.full_name?.charCodeAt(0) || 65) * 7 % 360
          const statusColor = sessions >= target ? '#8FA07A' : sessions >= 2 ? '#4A6FD4' : '#C45C3A'
          const hasUnread = (unreadCounts[client.id] || 0) > 0

          return (
            <div key={client.id} onClick={() => onSelectClient(client)}
              style={{ background: 'white', borderRadius: 14, border: '1px solid #E8ECFA', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', boxShadow: '0 2px 6px rgba(13,27,78,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(13,27,78,0.12)'; e.currentTarget.style.borderColor = '#4A6FD4' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(13,27,78,0.04)'; e.currentTarget.style.borderColor = '#E8ECFA' }}
            >
              {hasUnread && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#C45C3A', color: 'white', borderRadius: 20, fontSize: 9, fontWeight: 800, padding: '2px 7px' }}>
                  💬 {unreadCounts[client.id]}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${hue},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white', fontWeight: 800, flexShrink: 0 }}>
                  {client.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', lineHeight: 1.2 }}>{client.full_name}</div>
                  <div style={{ fontSize: 10, color: '#9BA8C0', marginTop: 2 }}>{client.current_program || 'Aucun programme'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: '#F8FAFF', borderRadius: 9, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: '#9BA8C0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Séances</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: statusColor, lineHeight: 1.1 }}>{sessions}<span style={{ fontSize: 11, fontWeight: 400, color: '#9BA8C0' }}>/{target}</span></div>
                </div>
                <div style={{ background: '#F8FAFF', borderRadius: 9, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: '#9BA8C0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Poids</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: '#C45C3A', lineHeight: 1.1 }}>{w}<span style={{ fontSize: 11, fontWeight: 400, color: '#9BA8C0' }}> kg</span></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: '#9BA8C0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Progression semaine</span>
                  <span style={{ fontSize: 9, color: statusColor, fontWeight: 800 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: statusColor, width: `${pct}%`, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
