import NutritionClientView from './nutrition'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

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

function buildStoragePublicUrlFromFileName(fileName) {
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fileName)}`
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

// ==================== PROGRAMME TAB CORRIGÉ ====================
function ProgrammeTab({ clientId, clientName, coachId }) {
  const [workouts, setWorkouts] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newW, setNewW] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const [loading, setLoading] = useState(true)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [allClients, setAllClients] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [archivedWorkouts, setArchivedWorkouts] = useState([])
  const [archiving, setArchiving] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProposal, setAiProposal] = useState(null)
  const [aiError, setAiError] = useState('')
  const [inserting, setInserting] = useState(false)
  const [imageSyncing, setImageSyncing] = useState(false)
  const [exerciseImageFiles, setExerciseImageFiles] = useState([])
  const [imageFilesLoading, setImageFilesLoading] = useState(true)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Fonction pour recharger les workouts
  async function reloadWorkouts() {
    const { data } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .order('day_of_week')
    
    setWorkouts((data || []).map(w => ({ 
      ...w, 
      exercises: (w.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) 
    })))
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await reloadWorkouts()
      setLoading(false)
      setOpenWorkout(null)
      setEditMode(null)
    }
    load()
  }, [clientId])

  // Charger les images
  useEffect(() => {
    setImageFilesLoading(true)
    fetch('/api/exercise-images')
      .then(r => r.json())
      .then(d => {
        const files = (d.files || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'))
        setExerciseImageFiles(files)
        setImageFilesLoading(false)
      })
      .catch(() => setImageFilesLoading(false))
  }, [])

  // CORRECTION: Fonction addExercise corrigée
  const addExercise = (workoutId, groupType, groupId) => {
    setExPicker({ workoutId, groupType, groupId })
    setExPickerQuery('')
    setExPickerMode('search')
    setExPickerFree('')
  }

  // CORRECTION: Fonction confirmAddExercise corrigée
  const confirmAddExercise = async (name, imageUrl) => {
    if (!exPicker || !name.trim()) return
    
    const { workoutId, groupType, groupId } = exPicker
    const w = workouts.find(w => w.id === workoutId)
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    
    const payload = {
      workout_id: workoutId,
      name: name.trim(),
      sets: 3,
      reps: '10',
      rest: '90s',
      note: '',
      target_weight: '',
      order_index: w?.exercises?.length || 0,
      group_type: groupType || 'Normal',
      group_id: gid,
      image_url: imageUrl || null
    }
    
    const { data, error } = await supabase.from('exercises').insert(payload).select().single()
    
    if (error) {
      console.error('Erreur insertion:', error)
      alert('Erreur: ' + error.message)
      return
    }
    
    if (data) {
      // Mettre à jour le state correctement
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return { 
            ...w, 
            exercises: [...(w.exercises || []), data].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          }
        }
        return w
      }))
    }
    
    setExPicker(null)
  }

  // États pour le picker
  const [exPicker, setExPicker] = useState(null)
  const [exPickerQuery, setExPickerQuery] = useState('')
  const [exPickerMode, setExPickerMode] = useState('search')
  const [exPickerFree, setExPickerFree] = useState('')

  const [wbPicker, setWbPicker] = useState(null)
  const [wbForm, setWbForm] = useState({
    type: 'For Time', rounds: '3', cap: '18', rest: '90s',
    objective: '', coachNote: '', movements: ''
  })

  // CORRECTION: Fonction updateExercise corrigée
  const updateExercise = async (workoutId, exId, field, value) => {
    // Mise à jour optimiste du state
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e)
        }
      }
      return w
    }))

    let payload = { [field]: value }

    // Si le nom change, essayer de trouver une image automatiquement
    if (field === 'name') {
      try {
        const exNorm = value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        const nf = exerciseImageFiles.map(name => ({
          normalized: name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
          url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
        }))
        
        let match = nf.find(f => f.normalized === exNorm)
        if (!match) match = nf.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
        if (!match) {
          const words = exNorm.split(' ').filter(w => w.length > 2)
          match = nf.find(f => words.filter(w => f.normalized.includes(w)).length >= Math.min(2, words.length))
        }
        if (match) payload.image_url = match.url
      } catch {}
    }

    await supabase.from('exercises').update(payload).eq('id', exId)

    if (field === 'name' && payload.image_url) {
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return {
            ...w,
            exercises: w.exercises.map(e => e.id === exId ? { ...e, image_url: payload.image_url } : e)
          }
        }
        return w
      }))
    }
  }

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        return { ...w, exercises: w.exercises.filter(e => e.id !== exId) }
      }
      return w
    }))
  }

  const moveExercise = async (workoutId, exId, direction) => {
    const w = workouts.find(w => w.id === workoutId)
    if (!w) return
    
    const exs = [...w.exercises]
    const idx = exs.findIndex(e => e.id === exId)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= exs.length) return
    
    // Échange
    const tmp = exs[idx]
    exs[idx] = exs[newIdx]
    exs[newIdx] = tmp
    
    // Mise à jour des order_index
    exs.forEach((ex, i) => { ex.order_index = i })
    
    setWorkouts(prev => prev.map(ww => ww.id === workoutId ? { ...ww, exercises: exs } : ww))
    
    await Promise.all([
      supabase.from('exercises').update({ order_index: newIdx }).eq('id', exs[idx].id),
      supabase.from('exercises').update({ order_index: idx }).eq('id', exs[newIdx].id),
    ])
  }

  const addWorkout = async () => {
    if (!newW.name.trim()) return
    const { data } = await supabase
      .from('workouts')
      .insert({ ...newW, client_id: clientId })
      .select()
      .single()
    
    if (data) {
      setWorkouts(prev => [...prev, { ...data, exercises: [] }])
      setShowAdd(false)
      setNewW({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id)
      setEditMode(data.id)
    }
  }

  const deleteWorkout = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('workouts').delete().eq('id', id)
    setWorkouts(prev => prev.filter(w => w.id !== id))
    if (openWorkout === id) setOpenWorkout(null)
  }

  const updateWorkoutDay = async (workoutId, newDay) => {
    await supabase.from('workouts').update({ day_of_week: +newDay }).eq('id', workoutId)
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, day_of_week: +newDay } : w))
  }

  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#4A6FD4', 'Workout Block': '#1A1A2E' }

  const addWorkoutBlock = (workoutId) => {
    setWbPicker({ workoutId })
    setWbForm({ type: 'For Time', rounds: '3', cap: '', rest: '90s', objective: '', coachNote: '', movements: '' })
  }

  const confirmAddWorkoutBlock = async () => {
    if (!wbPicker || !wbForm.movements.trim()) return
    const { workoutId } = wbPicker
    const w = workouts.find(w => w.id === workoutId)
    const gid = 'wb_' + Date.now().toString()
    const meta = JSON.stringify({
      type: wbForm.type,
      rounds: wbForm.rounds,
      cap: wbForm.cap,
      rest: wbForm.rest,
      objective: wbForm.objective,
      coachNote: wbForm.coachNote
    })
    
    const lines = wbForm.movements.split('\n').map(l => l.trim()).filter(Boolean)
    const baseIdx = w?.exercises?.length || 0
    const rows = lines.map((line, i) => ({
      workout_id: workoutId,
      name: line,
      sets: parseInt(wbForm.rounds) || 1,
      reps: '',
      rest: i === lines.length - 1 ? wbForm.rest : '0s',
      note: i === 0 ? meta : '',
      target_weight: '',
      order_index: baseIdx + i,
      group_type: 'Workout Block',
      group_id: gid,
      image_url: null
    }))
    
    const { data } = await supabase.from('exercises').insert(rows).select()
    if (data) {
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return { ...w, exercises: [...(w.exercises || []), ...data] }
        }
        return w
      }))
    }
    setWbPicker(null)
  }

  const syncImages = async (forceAll = false) => {
    setImageSyncing(true)
    try {
      const normalizedFiles = exerciseImageFiles.map(name => ({
        original: name,
        normalized: name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
        url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
      }))

      const toSync = []
      for (const workout of workouts) {
        for (const ex of (workout.exercises || [])) {
          if (!forceAll && ex.image_url) continue
          toSync.push(ex)
        }
      }

      if (!toSync.length) {
        alert('✅ Toutes les images sont déjà synchronisées')
        setImageSyncing(false)
        return
      }

      for (const ex of toSync) {
        const exNorm = ex.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        
        let match = normalizedFiles.find(f => f.normalized === exNorm)
        if (!match) match = normalizedFiles.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
        
        if (match) {
          await supabase.from('exercises').update({ image_url: match.url }).eq('id', ex.id)
        }
      }

      await reloadWorkouts()
      alert('✅ Images synchronisées !')
    } catch (e) {
      alert('Erreur sync images: ' + e.message)
    }
    setImageSyncing(false)
  }

  const exportPDF = async () => {
    setExporting(true)
    try {
      const imgToBase64 = async (url) => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch { return null }
      }

      const allExercises = workouts.flatMap(w => w.exercises || [])
      const imgCache = {}
      await Promise.all(allExercises.filter(e => e.image_url).map(async (e) => {
        if (!imgCache[e.image_url]) {
          imgCache[e.image_url] = await imgToBase64(e.image_url)
        }
      }))

      const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

      const workoutBlocks = workouts.map(workout => {
        const exercises = (workout.exercises || []).map((ex, idx) => {
          const img = ex.image_url && imgCache[ex.image_url]
            ? `<img src="${imgCache[ex.image_url]}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e0e6f0;" />`
            : `<div style="width:72px;height:72px;border-radius:8px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💪</div>`

          const details = [
            ex.sets && ex.reps ? `<span class="badge">${ex.sets} × ${ex.reps}</span>` : '',
            ex.rest ? `<span class="badge-outline">⏱ ${ex.rest}</span>` : '',
            ex.target_weight ? `<span class="badge-outline">🏋️ ${ex.target_weight}</span>` : '',
          ].filter(Boolean).join(' ')

          return `
            <div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #F0F4FF;">
              ${img}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:800;font-size:14px;color:#0D1B4E;margin-bottom:5px;">${idx + 1}. ${ex.name || '—'}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">${details}</div>
                ${ex.note ? `<div style="font-size:12px;color:#6B7A99;background:#F8FAFF;border-left:3px solid #4A6FD4;padding:6px 10px;border-radius:0 6px 6px 0;line-height:1.5;">${ex.note}</div>` : ''}
              </div>
            </div>`
        }).join('')

        const dayLabel = dayNames[(workout.day_of_week || 1) - 1] || ''
        const tag = workout.type ? `<span style="background:#EEF2FF;color:#4A6FD4;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;">${workout.type}</span>` : ''

        return `
          <div class="workout-block" style="page-break-inside:avoid;margin-bottom:28px;background:white;border-radius:14px;border:1px solid #E0E6F5;overflow:hidden;box-shadow:0 2px 8px rgba(13,27,78,0.06);">
            <div style="background:linear-gradient(135deg,#0D1B4E,#2C4A9E);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;">${dayLabel}</div>
                <div style="font-size:18px;font-weight:900;color:white;">${workout.name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px;">${(workout.exercises || []).length} exercices${workout.duration ? ' · ' + workout.duration + ' min' : ''}</div>
              </div>
              ${tag}
            </div>
            <div style="padding:4px 20px 8px;">${exercises}</div>
          </div>`
      }).join('')

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Programme — ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #F5F7FF; color: #0D1B4E; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
    .badge { display:inline-block; background:#0D1B4E; color:white; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:800; }
    .badge-outline { display:inline-block; background:#EEF2FF; color:#4A6FD4; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:700; }
    @media print {
      body { background: white; }
      .page { padding: 16px; }
      .workout-block { page-break-inside: avoid; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #E0E6F5;">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9BA8C0;margin-bottom:4px;">Programme d'entraînement</div>
      <div style="font-size:32px;font-weight:900;color:#0D1B4E;line-height:1;">${clientName}</div>
      <div style="font-size:13px;color:#6B7A99;margin-top:6px;">Exporté le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${workouts.length} séance${workouts.length > 1 ? 's' : ''}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:900;color:#0D1B4E;letter-spacing:1px;">BEN&FIT</div>
      <div style="font-size:9px;color:#9BA8C0;letter-spacing:2px;text-transform:uppercase;">Only Benefit · since 2021</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:28px;">
    ${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => {
      const w = workouts.find(x => x.day_of_week === i + 1)
      return `<div style="background:${w ? '#0D1B4E' : '#F0F4FF'};border-radius:8px;padding:8px 4px;text-align:center;">
        <div style="font-size:9px;text-transform:uppercase;color:${w ? 'rgba(255,255,255,0.5)' : '#9BA8C0'};letter-spacing:1px;">${d}</div>
        <div style="font-size:10px;font-weight:700;color:${w ? 'white' : '#C5D0F0'};margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w ? (w.name.length > 10 ? w.name.substring(0, 10) + '…' : w.name) : '—'}</div>
      </div>`
    }).join('')}
  </div>

  ${workoutBlocks}

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E0E6F5;text-align:center;font-size:11px;color:#C5D0F0;">
    BEN&FIT Coach · Programme confidentiel · ${clientName}
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (!win) alert('Autorise les popups pour télécharger le PDF')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch(e) {
      alert('Erreur export : ' + e.message)
    }
    setExporting(false)
  }

  if (loading) return <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          return (
            <div key={day} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)} 
              style={{ background: workout ? '#0D1B4E' : '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: workout ? 'pointer' : 'default', opacity: workout ? 1 : 0.5 }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: workout ? '#D4E0CC' : '#6B7A99' }}>{day}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: workout ? 'white' : '#9A9A8A', marginTop: '4px' }}>{workout ? workout.name : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>
          PROGRAMME DE {clientName?.split(' ')[0]?.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={exportPDF} disabled={exporting} style={btn('#C45C3A', 'white')}>{exporting ? '⏳ Génération…' : '⬇️ Exporter PDF'}</button>
          <button onClick={() => setShowAdd(true)} style={btn('#0D1B4E', 'white')}>+ Nouvelle séance</button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
            <div><label style={lbl}>Nom</label><input value={newW.name} onChange={e => setNewW(p => ({ ...p, name: e.target.value }))} placeholder="Push A" style={inp} /></div>
            <div><label style={lbl}>Type</label>
              <select value={newW.type} onChange={e => setNewW(p => ({ ...p, type: e.target.value }))} style={inp}>
                {['Push','Pull','Legs','Full Body','Upper','Lower','Cardio','Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Jour</label>
              <select value={newW.day_of_week} onChange={e => setNewW(p => ({ ...p, day_of_week: +e.target.value }))} style={inp}>
                {DAYS_FR.map((d, i) => <option key={d} value={i+1}>{d}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Durée (min)</label><input type="number" value={newW.duration_min} onChange={e => setNewW(p => ({ ...p, duration_min: +e.target.value }))} style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addWorkout} style={btn('#0D1B4E', 'white')}>✓ Créer</button>
            <button onClick={() => setShowAdd(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </div>
        </div>
      )}

      {workouts.length === 0 && !showAdd && (
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6B7A99' }}>
          Aucune séance pour {clientName?.split(' ')[0]}. Clique sur "+ Nouvelle séance" pour commencer 💪
        </div>
      )}

      {workouts.map(workout => {
        const isOpen = openWorkout === workout.id
        const isEdit = editMode === workout.id
        return (
          <div key={workout.id} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
              <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', background
