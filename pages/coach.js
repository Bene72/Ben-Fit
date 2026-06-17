/**
 * pages/coach.js — orchestrateur de l'espace coach
 * Routing entre les tabs (overview, programme, nutrition, bilan, messages, gestion)
 *
 * Découpé depuis un fichier monolithique de 2625 lignes en :
 *   - lib/coachHelpers.jsx       (constantes, styles, fonctions partagées)
 *   - components/coach/ProgrammeTab.jsx  (+ ExercisePicker, ExRow internes)
 *   - components/coach/OverviewTab.jsx
 *   - components/coach/CoachHub.jsx
 *   - components/coach/NutritionTab.jsx  (+ sous-composants internes)
 *   - components/coach/BilanTab.jsx
 *   - components/coach/MessagesTab.jsx
 *   - components/coach/GestionTab.jsx
 *
 * Aucune ligne de logique modifiée — uniquement déplacée et reliée par imports.
 */
import NutritionClientView from './nutrition'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

import ProgrammeTab from '../components/coach/ProgrammeTab'
import OverviewTab from '../components/coach/OverviewTab'
import CoachHub from '../components/coach/CoachHub'
import NutritionTab from '../components/coach/NutritionTab'
import BilanTab from '../components/coach/BilanTab'
import MessagesTab from '../components/coach/MessagesTab'
import GestionTab from '../components/coach/GestionTab'
import { LoadingScreen } from '../lib/coachHelpers'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ─── HELPER EDGE FUNCTIONS ──────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function callEdgeFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
  return json
}


export default function CoachPanel() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard'); return }
      setUser(user)
      await loadClients(user.id)

      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('read', false)
      const counts = {}
      ;(unreadData || []).forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
      setUnreadCounts(counts)

      supabase
        .channel('coach-inbox')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, payload => {
          setUnreadCounts(prev => ({
            ...prev,
            [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1
          }))
        })
        .subscribe()

      setLoading(false)
    }
    load()
  }, [])

  const loadClients = async (coachId) => {
    const { data } = await supabase
      .from('profiles')
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
      if (!session?.user?.id) {
        setCreateError('Session expirée, veuillez vous reconnecter')
        setCreating(false); return
      }
      const result = await callEdgeFunction('create-client', {
        full_name: newClient.full_name,
        email: newClient.email,
        password: newClient.password,
        coach_id: session.user.id
      })
      await loadClients(session.user.id)
      setShowNewClient(false)
      setCreateSuccess({ name: newClient.full_name, email: newClient.email, password: newClient.password })
      setNewClient({ full_name: '', email: '', password: '' })
    } catch(e) {
      setCreateError('Erreur: ' + e.message)
    }
    setCreating(false)
  }

  const sessionsThisWeek = (client) => {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    return (client.workout_sessions || []).filter(s => new Date(s.date) >= weekStart).length
  }
  const lastWeight = (client) => {
    const m = (client.measures || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    return m[0]?.weight || '—'
  }

  if (loading) return <LoadingScreen />

  return (
    <>
      <Head>
        <title>Ben&Fit — Coach</title>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#EEF0F5', fontFamily: "'DM Sans',sans-serif" }}>

        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ position: 'fixed', top: '16px', left: sidebarOpen ? '218px' : '12px', zIndex: 200, width: '32px', height: '32px', background: '#0D1B4E', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'left 0.25s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {sidebarOpen ? '←' : '☰'}
        </button>

        <aside style={{ width: sidebarOpen ? '260px' : '0px', background: '#0D1B4E', position: 'fixed', top: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden', transition: 'width 0.25s ease' }}>
          <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/dashboard" title="Retour à l'accueil" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '44px', height: '44px', objectFit: 'contain', transition: 'opacity 0.2s' }} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'white', letterSpacing: '2px', lineHeight: 1 }}>BEN&FIT</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>Coach Dashboard · 🏠 Accueil</div>
              </div>
            </a>
          </div>
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#444438', padding: '8px 12px' }}>{clients.length} clients</div>
            {clients.map(client => {
              const isSelected = selected?.id === client.id
              const w = sessionsThisWeek(client)
              return (
                <button key={client.id} onClick={() => selectClient(client)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? '#0D1B4E' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: "'DM Sans',sans-serif", marginBottom: '2px', transition: 'all 0.2s' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: `hsl(${(client.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700' }}>
                    {client.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: isSelected ? 'white' : '#C8C8B8', fontWeight: '500' }}>{client.full_name}</div>
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

          {showNewClient && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#0D1B4E', border: '1px solid #3E3E30', borderRadius: '16px', padding: '28px', width: '380px', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', color: '#EEF2FF', marginBottom: '20px', letterSpacing: '2px' }}>NOUVEAU CLIENT</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px' }}>Nom complet</label>
                  <input value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))} placeholder="Jean Dupont" style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px' }}>Email</label>
                  <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="jean@email.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px' }}>Mot de passe temporaire</label>
                  <input value={newClient.password} onChange={e => setNewClient(p => ({ ...p, password: e.target.value }))} placeholder="MotDePasse123!" style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {createError && <div style={{ color: '#FF8A8A', fontSize: '13px', marginBottom: '12px', background: 'rgba(220,53,69,0.15)', padding: '8px 12px', borderRadius: '7px' }}>{createError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={createClient} disabled={creating} style={{ flex: 1, padding: '10px', background: creating ? 'rgba(255,255,255,0.1)' : '#4A6FD4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {creating ? 'Création…' : '✓ Créer le client'}
                  </button>
                  <button onClick={() => { setShowNewClient(false); setCreateError('') }} style={{ padding: '10px 16px', background: 'transparent', color: '#6B7A99', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {createSuccess && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#0D1B4E', border: '1px solid #3E3E30', borderRadius: '16px', padding: '28px', width: '400px', fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', color: 'white', letterSpacing: '2px' }}>CLIENT CRÉÉ !</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{createSuccess.name} est maintenant dans ta liste</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Identifiants de connexion</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Email</span>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>{createSuccess.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Mot de passe</span>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>{createSuccess.password}</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textAlign: 'center' }}>
                📋 Copie ces identifiants et envoie-les à ton client
              </div>
              <button onClick={() => setCreateSuccess(null)} style={{ width: '100%', padding: '10px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                ✓ C'est noté !
              </button>
            </div>
          </div>
        )}

        <main style={{ marginLeft: sidebarOpen ? '260px' : '0px', flex: 1, transition: 'margin-left 0.25s ease' }}>
          {!selected ? (
            <CoachHub
              clients={clients}
              user={user}
              sessionsThisWeek={sessionsThisWeek}
              lastWeight={lastWeight}
              unreadCounts={unreadCounts}
              onSelectClient={selectClient}
              onNewClient={() => setShowNewClient(true)}
            />
          ) : (
            <>
              <div style={{ padding: '10px 24px', borderBottom: '1px solid #C5D0F0', background: '#EEF2FF', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <button onClick={() => setSelected(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7A99', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", padding: '3px 8px', borderRadius: '6px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E8ECFA'; e.currentTarget.style.color = '#0D1B4E' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7A99' }}
                  >
                    🏠 Accueil coach
                  </button>
                  <span style={{ color: '#C5D0F0', fontSize: '16px' }}>›</span>
                  <button onClick={() => setTab('overview')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", padding: '3px 8px', borderRadius: '6px', transition: 'all 0.15s', color: tab === 'overview' ? '#0D1B4E' : '#6B7A99' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E8ECFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `hsl(${(selected.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'white', fontWeight: '800' }}>
                      {selected.full_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0D1B4E' }}>{selected.full_name}</span>
                  </button>
                  {tab !== 'overview' && (
                    <>
                      <span style={{ color: '#C5D0F0', fontSize: '16px' }}>›</span>
                      <span style={{ fontSize: '12px', color: '#4A6FD4', fontWeight: '700' }}>
                        {tab === 'programme' ? '🏋️ Programme' : tab === 'nutrition' ? '🥗 Nutrition' : tab === 'bilan' ? '📋 Bilan' : tab === 'messages' ? '💬 Messages' : '⚙️ Gestion'}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#9BA8C0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.email}</div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[['overview',"👁 Vue d'ensemble"],['programme','🏋️ Programme'],['nutrition','🥗 Nutrition'],['bilan','📋 Bilan'],['messages','💬 Messages'],['gestion','⚙️ Gestion']].map(([t, label]) => (
                      <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none', background: tab === t ? (t === 'gestion' ? '#C45C3A' : '#0D1B4E') : 'transparent', color: tab === t ? 'white' : '#6B7A99', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '28px 32px' }}>
                {tab === 'overview' && <OverviewTab client={selected} sessionsThisWeek={sessionsThisWeek} lastWeight={lastWeight} coachId={user.id} onUpdate={(updated) => { setSelected(updated); setClients(prev => prev.map(c => c.id === updated.id ? updated : c)) }} />}
                {tab === 'programme' && <ProgrammeTab clientId={selected.id} clientName={selected.full_name} coachId={user.id} />}
                {tab === 'nutrition' && selected && <NutritionTab clientId={selected.id} clientName={selected.full_name} />}
                {tab === 'bilan' && <BilanTab clientId={selected.id} clientName={selected.full_name} coachId={user.id} />}
                {tab === 'messages' && <MessagesTab coachId={user.id} clientId={selected.id} clientName={selected.full_name} onRead={(clientId) => setUnreadCounts(prev => ({ ...prev, [clientId]: 0 }))} />}
                {tab === 'gestion' && <GestionTab client={selected} session={null} onDelete={() => { setSelected(null); loadClients(user.id) }} />}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
