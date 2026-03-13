import NutritionClientView from './nutrition'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

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
  const [unreadCounts, setUnreadCounts] = useState({})
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard'); return }
      setUser(user)
      await loadClients(user.id)

      // Charger les messages non lus par client
      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('read', false)
      const counts = {}
      ;(unreadData || []).forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
      setUnreadCounts(counts)

      // Abonnement Realtime global — nouveaux messages reçus par le coach
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
      // Edge Function admin — ne déconnecte pas le coach
      const { data: { session } } = await supabase.auth.getSession()

      // ✅ CORRECTION : vérifier que la session est bien active avant d'envoyer
      if (!session?.user?.id) {
        setCreateError('Session expirée, veuillez vous reconnecter')
        setCreating(false); return
      }

      const res = await fetch('https://euoraelrducxdmipicbq.supabase.co/functions/v1/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: newClient.full_name,
          email: newClient.email,
          password: newClient.password,
          coach_id: session.user.id  // ✅ CORRECTION : source fiable (session) au lieu du state React
        })
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setCreateError('Erreur: ' + (result.error || 'Inconnue')); setCreating(false); return
      }
      await loadClients(session.user.id)
      setShowNewClient(false)
      setNewClient({ full_name: '', email: '', password: '' })
      alert('✅ Client créé !\n\nEmail: ' + newClient.email + '\nMot de passe: ' + newClient.password + '\n\nEnvoie-lui ces identifiants pour qu\'il se connecte.')
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

        {/* SIDEBAR */}
        <aside style={{ width: '260px', background: '#0D1B4E', position: 'fixed', top: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto' }}>
          <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'white', letterSpacing: '2px', lineHeight: 1 }}>BEN&FIT</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>Coach Dashboard</div>
            </div>
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

          {/* NEW CLIENT MODAL */}
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

        {/* MAIN */}
        <main style={{ marginLeft: '260px', flex: 1 }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px', color: '#6B7A99' }}>
              <div style={{ fontSize: '48px' }}>👈</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', letterSpacing: '3px', color: '#0D1B4E' }}>SÉLECTIONNE UN CLIENT</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '16px 32px', borderBottom: '1px solid #C5D0F0', background: '#EEF2FF', position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `hsl(${(selected.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'white', fontWeight: '700' }}>
                  {selected.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', letterSpacing: '2px', color: '#0D1B4E' }}>{selected.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>{selected.email}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[['overview','👁 Vue d\'ensemble'],['programme','🏋️ Programme'],['nutrition','🥗 Nutrition'],['messages','💬 Messages']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: tab === t ? '#0D1B4E' : 'transparent', color: tab === t ? 'white' : '#6B7A99', fontFamily: "'DM Sans',sans-serif" }}>{label}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '28px 32px' }}>
                {tab === 'overview' && <OverviewTab client={selected} sessionsThisWeek={sessionsThisWeek} lastWeight={lastWeight} coachId={user.id} onUpdate={(updated) => { setSelected(updated); setClients(prev => prev.map(c => c.id === updated.id ? updated : c)) }} />}
                {tab === 'programme' && <ProgrammeTab clientId={selected.id} clientName={selected.full_name} coachId={user.id} />}
                {tab === 'nutrition' && selected && <NutritionTab clientId={selected.id} clientName={selected.full_name} />}
                {tab === 'messages' && <MessagesTab coachId={user.id} clientId={selected.id} clientName={selected.full_name} onRead={(clientId) => setUnreadCounts(prev => ({ ...prev, [clientId]: 0 }))} />}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}

// ─── OVERVIEW TAB ───────────────────────────────────────────
function OverviewTab({ client, sessionsThisWeek, lastWeight, coachId, onUpdate }) {
  const [note, setNote] = useState(client.coach_note || '')
  const [program, setProgram] = useState(client.current_program || '')
  const [sessionTarget, setSessionTarget] = useState(client.session_target || 5)
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [editStats, setEditStats] = useState(false)

  const saveAll = async () => {
    setSaving(true)
    const updates = { coach_note: note, current_program: program, session_target: +sessionTarget }
    await supabase.from('profiles').update(updates).eq('id', client.id)
    if (newWeight) {
      await supabase.from('measures').insert({ client_id: client.id, date: new Date().toISOString().split('T')[0], weight: +newWeight })
    }
    onUpdate({ ...client, ...updates, measures: newWeight ? [{ weight: +newWeight, date: new Date().toISOString().split('T')[0] }, ...(client.measures || [])] : client.measures })
    setNewWeight('')
    setEditStats(false)
    setSaving(false)
  }

  const currentWeight = lastWeight(client)
  const sessions = sessionsThisWeek(client)
  const target = client.session_target || 5

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #4A6FD4' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Séances cette semaine</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E' }}>{sessions}<span style={{ fontSize: '16px', color: '#6B7A99' }}>/{target}</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Objectif / semaine</label>
              <input type="number" value={sessionTarget} onChange={e => setSessionTarget(e.target.value)} style={{ ...inp, width: '80px' }} />
            </div>
          )}
        </div>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #C45C3A' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Dernier poids</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E' }}>{currentWeight}<span style={{ fontSize: '16px', color: '#6B7A99' }}> kg</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Nouveau poids (kg)</label>
              <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="80.5" style={{ ...inp, width: '100px' }} />
            </div>
          )}
        </div>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #0D1B4E' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Programme actuel</div>
          {editStats ? (
            <input value={program} onChange={e => setProgram(e.target.value)} placeholder="Phase 2 · Hypertrophie" style={{ ...inp, fontFamily: "'Bebas Neue',sans-serif", fontSize: '15px' }} />
          ) : (
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#0D1B4E' }}>{program || '—'}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {editStats ? (
          <>
            <button onClick={saveAll} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer tout'}</button>
            <button onClick={() => { setEditStats(false); setProgram(client.current_program || ''); setSessionTarget(client.session_target || 5); setNewWeight('') }} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setEditStats(true)} style={btn('#EEF2FF', '#0D1B4E', '#4A6FD4')}>✏️ Modifier les stats</button>
        )}
      </div>

      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>📌 Message / Note pour {client.full_name?.split(' ')[0]}</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Écris une note ou message pour le client…" rows={5} style={{ width: '100%', padding: '12px', border: '1.5px solid #C5D0F0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', resize: 'vertical', outline: 'none', lineHeight: '1.6' }} />
        <button onClick={saveAll} disabled={saving} style={{ marginTop: '10px', padding: '8px 20px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ─── PROGRAMME TAB ──────────────────────────────────────────
function ProgrammeTab({ clientId, clientName, coachId }) {
  const [workouts, setWorkouts] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newW, setNewW] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('workouts').select('*, exercises(*)').eq('client_id', clientId).order('day_of_week')
      setWorkouts((data || []).map(w => ({ ...w, exercises: (w.exercises || []).sort((a, b) => a.order_index - b.order_index) })))
      setLoading(false)
    }
    load()
    setOpenWorkout(null); setEditMode(null)
  }, [clientId])

  const addWorkout = async () => {
    if (!newW.name.trim()) return
    const { data } = await supabase.from('workouts').insert({ ...newW, client_id: clientId }).select().single()
    if (data) { setWorkouts(prev => [...prev, { ...data, exercises: [] }]); setShowAdd(false); setNewW({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 }); setOpenWorkout(data.id); setEditMode(data.id) }
  }

  const deleteWorkout = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('workouts').delete().eq('id', id)
    setWorkouts(prev => prev.filter(w => w.id !== id)); setOpenWorkout(null)
  }

  const addExercise = async (workoutId, groupType, groupId) => {
    const w = workouts.find(w => w.id === workoutId)
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    const { data } = await supabase.from('exercises').insert({ workout_id: workoutId, name: 'Nouvel exercice', sets: 3, reps: '10', rest: '90s', note: '', target_weight: '', order_index: w?.exercises?.length || 0, group_type: groupType || 'Normal', group_id: gid }).select().single()
    if (data) setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, exercises: [...(w.exercises || []), data] } : w))
  }

  const updateExercise = async (workoutId, exId, field, value) => {
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, exercises: w.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) } : w))
    await supabase.from('exercises').update({ [field]: value }).eq('id', exId)
  }

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, exercises: w.exercises.filter(e => e.id !== exId) } : w))
  }

  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#4A6FD4' }

  if (loading) return <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          return (
            <div key={day} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)} style={{ background: workout ? '#0D1B4E' : '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: workout ? 'pointer' : 'default', opacity: workout ? 1 : 0.5 }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: workout ? '#D4E0CC' : '#6B7A99' }}>{day}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: workout ? 'white' : '#9A9A8A', marginTop: '4px' }}>{workout ? workout.name : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>PROGRAMME DE {clientName?.split(' ')[0]?.toUpperCase()}</div>
        <button onClick={() => setShowAdd(true)} style={btn('#0D1B4E', 'white')}>+ Nouvelle séance</button>
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
            <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', background: '#D4E0CC', color: '#0D1B4E' }}>{workout.type}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{workout.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>{DAYS[(workout.day_of_week||1)-1]} · {workout.exercises?.length||0} exercices · {workout.duration_min} min</div>
                </div>
              </div>
              <span style={{ color: '#6B7A99', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button onClick={() => setEditMode(isEdit ? null : workout.id)} style={btn(isEdit ? '#0D1B4E' : 'white', isEdit ? 'white' : '#6B7A99', '#C5D0F0')}>
                    {isEdit ? '✓ Terminer édition' : '✏️ Modifier'}
                  </button>
                  {isEdit && <button onClick={() => deleteWorkout(workout.id)} style={{ ...btn('rgba(196,92,58,0.1)', '#C45C3A'), marginLeft: 'auto' }}>🗑 Supprimer</button>}
                </div>

                {workout.exercises?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr 60px 70px 80px 90px 1fr 28px' : '1fr 60px 70px 80px 90px 1fr', gap: '6px', padding: '6px 10px', marginBottom: '4px' }}>
                    {['Exercice','Séries','Reps','Repos','Charge','Notes',isEdit?'':null].filter(h => h !== null).map(h => (
                      <div key={h} style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99' }}>{h}</div>
                    ))}
                  </div>
                )}

                {(() => {
                  const exs = workout.exercises || []
                  const rendered = new Set()
                  return exs.map(ex => {
                    if (rendered.has(ex.id)) return null
                    if (ex.group_id && ex.group_type !== 'Normal') {
                      const group = exs.filter(e => e.group_id === ex.group_id)
                      group.forEach(e => rendered.add(e.id))
                      return (
                        <div key={ex.group_id} style={{ border: `2px solid ${groupColors[ex.group_type]||'#C5D0F0'}`, borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                          <div style={{ background: groupColors[ex.group_type]||'#C5D0F0', color: 'white', padding: '4px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                            <span>⚡ {ex.group_type}</span>
                            {isEdit && <button onClick={() => addExercise(workout.id, ex.group_type, ex.group_id)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Exercice</button>}
                          </div>
                          {group.map(e => <ExRow key={e.id} ex={e} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} />)}
                        </div>
                      )
                    }
                    rendered.add(ex.id)
                    return <ExRow key={ex.id} ex={ex} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} />
                  })
                })()}

                {workout.exercises?.length === 0 && !isEdit && (
                  <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '13px', padding: '16px' }}>Passe en mode édition pour ajouter des exercices</div>
                )}

                {isEdit && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btn('#0D1B4E', 'white')}>+ Exercice</button>
                    <button onClick={() => addExercise(workout.id, 'Superset', null)} style={btn('#C45C3A', 'white')}>⚡ Superset</button>
                    <button onClick={() => addExercise(workout.id, 'Giant Set', null)} style={btn('#8FA07A', 'white')}>🔥 Giant Set</button>
                    <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={btn('#4A6FD4', 'white')}>📉 Drop Set</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ExRow({ ex, wId, edit, onUpdate, onDelete }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: edit ? '1fr 60px 70px 80px 90px 1fr 28px' : '1fr 60px 70px 80px 90px 1fr', gap: '6px', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      {edit ? <input value={ex.name} onChange={e => onUpdate(wId, ex.id, 'name', e.target.value)} style={ci} />
        : <div><div style={{ fontWeight: '500', fontSize: '13px' }}>{ex.name}</div>{ex.note && <div style={{ fontSize: '11px', color: '#6B7A99' }}>{ex.note}</div>}</div>}
      {edit ? <input type="number" value={ex.sets} onChange={e => onUpdate(wId, ex.id, 'sets', e.target.value)} style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.sets}</div>}
      {edit ? <input value={ex.reps} onChange={e => onUpdate(wId, ex.id, 'reps', e.target.value)} style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.reps}</div>}
      {edit ? <select value={ex.rest||'90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)} style={{ ...ci, textAlign: 'center' }}>
          {['30s','45s','60s','90s','2 min','3 min','4 min','5 min'].map(r => <option key={r}>{r}</option>)}
        </select>
        : <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>⏱ {ex.rest}</div>}
      {edit ? <input value={ex.target_weight||''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)} placeholder="80 kg" style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>{ex.target_weight ? `${ex.target_weight} kg` : '—'}</div>}
      {edit ? <input value={ex.note||''} onChange={e => onUpdate(wId, ex.id, 'note', e.target.value)} placeholder="Consigne…" style={ci} />
        : <div style={{ fontSize: '11px', color: '#6B7A99' }}>{ex.note}</div>}
      {edit && <button onClick={() => onDelete(wId, ex.id)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
    </div>
  )
}

// ─── NUTRITION TAB ──────────────────────────────────────────
function NutritionTab({ clientId, clientName }) {
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [editPlan, setEditPlan] = useState(false)
  const [planForm, setPlanForm] = useState({ target_calories: '', target_protein: '', target_carbs: '', target_fat: '', coach_note: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('week')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true).maybeSingle()
      setPlan(np)
      if (np) setPlanForm({ target_calories: np.target_calories||'', target_protein: np.target_protein||'', target_carbs: np.target_carbs||'', target_fat: np.target_fat||'', coach_note: np.coach_note||'' })
      const { data: lg } = await supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', clientId).order('date', { ascending: false }).limit(84)
      setLogs(lg || [])
      setLoading(false)
    }
    load()
    setEditPlan(false)
  }, [clientId])

  const savePlan = async () => {
    setSaving(true)
    const planData = { client_id: clientId, active: true, target_calories: +planForm.target_calories||0, target_protein: +planForm.target_protein||0, target_carbs: +planForm.target_carbs||0, target_fat: +planForm.target_fat||0, coach_note: planForm.coach_note }
    if (plan) { const { data } = await supabase.from('nutrition_plans').update(planData).eq('id', plan.id).select().single(); setPlan(data) }
    else { const { data } = await supabase.from('nutrition_plans').insert(planData).select().single(); setPlan(data) }
    setSaving(false); setEditPlan(false)
  }

  const upsertLog = async (date, fields) => {
    const existing = logs.find(l => l.date === date)
    if (existing) {
      const { data } = await supabase.from('nutrition_logs').update(fields).eq('id', existing.id).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
      return data
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ client_id: clientId, date, ...fields }).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => [data, ...prev].sort((a,b) => b.date.localeCompare(a.date)))
      return data
    }
  }

  if (loading) return <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>
            {plan ? 'PLAN NUTRITIONNEL ACTUEL' : 'CRÉER UN PLAN NUTRITIONNEL'}
          </div>
          <button onClick={() => setEditPlan(!editPlan)} style={btn(editPlan ? '#0D1B4E' : '#0D1B4E', 'white')}>
            {editPlan ? '✕ Annuler' : plan ? '✏️ Modifier' : '+ Créer le plan'}
          </button>
        </div>
        {editPlan ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
              {[['target_calories','🔥 Calories','2200'],['target_protein','🥩 Protéines (g)','160'],['target_carbs','🌾 Glucides (g)','220'],['target_fat','🥑 Lipides (g)','70']].map(([key,label,ph]) => (
                <div key={key}><label style={lbl}>{label}</label><input type="number" value={planForm[key]} onChange={e => setPlanForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inp} /></div>
              ))}
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Note coach</label><textarea value={planForm.coach_note} onChange={e => setPlanForm(p => ({ ...p, coach_note: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
            <button onClick={savePlan} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer le plan'}</button>
          </div>
        ) : plan ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {[['🔥',plan.target_calories,'kcal / jour'],['🥩',plan.target_protein,'g protéines'],['🌾',plan.target_carbs,'g glucides'],['🥑',plan.target_fat,'g lipides']].map(([icon,val,label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: '#0D1B4E' }}>{val||'—'}</div>
                <div style={{ fontSize: '12px', color: '#6B7A99' }}>{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#6B7A99', fontSize: '14px', textAlign: 'center', padding: '10px' }}>Aucun plan nutritionnel. Clique sur "+ Créer le plan" pour commencer.</div>
        )}
      </div>

      <div style={{ borderTop: '2px solid #EAEAEA', paddingTop: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginRight: '8px' }}>📊 Suivi client</div>
          {[['today',"Aujourd'hui"], ['week','Par semaine']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background: view===id ? '#0D1B4E' : 'white', color: view===id ? 'white' : '#666', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              {label}
            </button>
          ))}
        </div>
        {view === 'today' && <NutritionTodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />}
        {view === 'week'  && <NutritionWeekView logs={logs} plan={plan} onSave={upsertLog} today={today} />}
      </div>
    </div>
  )
}

function NutritionRing({ value, target, label, unit, color }) {
  const percent = target ? Math.min(100, (value / target) * 100) : 0
  const over = percent >= 100
  const radius = 50, stroke = 8
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percent / 100) * circumference
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ position:'relative', display:'inline-block' }}>
        <svg height={radius*2} width={radius*2} style={{ transform:'rotate(-90deg)' }}>
          <circle stroke="#EEEEEE" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
          <circle stroke={over?'#C45C3A':color} fill="transparent" strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition:'stroke-dashoffset 0.5s', strokeLinecap:'round' }}
            r={normalizedRadius} cx={radius} cy={radius} />
        </svg>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', lineHeight:1.2 }}>
          <div style={{ fontWeight:'800', fontSize:'14px', color: over?'#C45C3A':'#0D1B4E' }}>{value}</div>
          <div style={{ fontSize:'9px', color:'#AAA' }}>/{target}</div>
        </div>
      </div>
      <div style={{ marginTop:'6px', fontWeight:'600', fontSize:'12px', color:'#444' }}>{label}</div>
      <div style={{ fontSize:'10px', color:'#AAA' }}>{unit}</div>
    </div>
  )
}

function NutritionMacroBlock({ log, plan, date, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ calories: log?.calories||'', protein: log?.protein||'', carbs: log?.carbs||'', fat: log?.fat||'' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (log) setForm({ calories: log.calories||'', protein: log.protein||'', carbs: log.carbs||'', fat: log.fat||'' }) }, [log?.id, log?.calories])
  const save = async () => { setSaving(true); await onSave(date, { calories:+form.calories||0, protein:+form.protein||0, carbs:+form.carbs||0, fat:+form.fat||0 }); setSaving(false); setEditing(false) }
  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:plan?.target_calories, color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g',   target:plan?.target_protein,  color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g',   target:plan?.target_carbs,    color:'#2A50B0' },
    { key:'fat',      label:'Lipides',   unit:'g',   target:plan?.target_fat,      color:'#3A7BD5' }
  ]
  return (
    <div style={{ background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #EAEAEA', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <span style={{ fontWeight:'700', fontSize:'14px', color:'#0D1B4E' }}>📊 Apports du jour</span>
        <button onClick={() => setEditing(!editing)} style={{ padding:'4px 12px', background: editing?'#EEF0F5':'#0D1B4E', color: editing?'#666':'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
          {editing ? 'Annuler' : log?.calories > 0 ? '✏️ Modifier' : '+ Saisir'}
        </button>
      </div>
      {editing ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'14px' }}>
            {macros.map(m => (
              <div key={m.key}>
                <label style={{ display:'block', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', marginBottom:'4px', fontWeight:'600' }}>{m.label}</label>
                <input type="number" value={form[m.key]} onChange={e => setForm(p=>({...p,[m.key]:e.target.value}))} placeholder={m.target||'0'}
                  style={{ width:'100%', padding:'8px', border:`2px solid ${m.color}33`, borderRadius:'7px', fontSize:'13px', outline:'none' }} />
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ padding:'7px 18px', background:'#0D1B4E', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>{saving?'…':'✓ Enregistrer'}</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', justifyItems:'center' }}>
          {macros.map(m => <NutritionRing key={m.key} value={log?.[m.key]||0} target={m.target||0} label={m.label} unit={m.unit} color={m.color} />)}
        </div>
      )}
    </div>
  )
}

function NutritionScoreBlock({ log, plan }) {
  if (!log || !plan) return null
  const keys = ['calories','protein','carbs','fat']
  const targets = [plan.target_calories, plan.target_protein, plan.target_carbs, plan.target_fat]
  const score = keys.reduce((acc, k, i) => acc + (targets[i] ? Math.min(1, (log[k]||0) / targets[i]) : 0), 0) / 4 * 100
  const rounded = Math.min(100, Math.round(score))
  const color = rounded >= 80 ? '#3A7BD5' : rounded >= 50 ? '#2A50B0' : '#C45C3A'
  const feedback = []
  if ((log.protein||0) < plan.target_protein) feedback.push('💪 Augmente les protéines')
  if ((log.calories||0) < plan.target_calories * 0.8) feedback.push('⚡ Trop bas en calories')
  if ((log.carbs||0) < plan.target_carbs * 0.8) feedback.push("🌾 Manque de glucides")
  if ((log.fat||0) < plan.target_fat * 0.7) feedback.push('🥑 Lipides bas')
  if (feedback.length === 0) feedback.push('✅ Objectifs atteints !')
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
      <div style={{ padding:'14px 18px', borderRadius:'12px', background:'#F7F7F7', border:'1px solid #EAEAEA', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ fontSize:'26px', fontWeight:'800', color }}>{rounded}<span style={{ fontSize:'12px', color:'#999', fontWeight:'400' }}>/100</span></div>
        <div>
          <div style={{ fontWeight:'700', fontSize:'12px', color:'#333' }}>Score nutrition</div>
          <div style={{ fontSize:'11px', color:'#999' }}>{rounded >= 80 ? '🟢 Excellente journée' : rounded >= 50 ? '🟡 Peut mieux faire' : '🔴 Objectifs non atteints'}</div>
        </div>
      </div>
      <div style={{ padding:'14px 18px', borderRadius:'12px', background:'#EEF4FF', border:'1px solid #B8CBF5' }}>
        <div style={{ fontWeight:'700', fontSize:'12px', color:'#1A3580', marginBottom:'6px' }}>Feedback</div>
        {feedback.map((f,i) => <div key={i} style={{ fontSize:'12px', color:'#555', marginBottom:'2px' }}>{f}</div>)}
      </div>
    </div>
  )
}

function NutritionWeekGraph({ logs, plan, today }) {
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === ds)
    return { date:ds, calories: log?.calories||0, label: d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,2) }
  })
  const max = Math.max(...days.map(d => d.calories), plan?.target_calories || 1)
  return (
    <div style={{ padding:'14px 18px', borderRadius:'12px', background:'white', border:'1px solid #EAEAEA', marginBottom:'16px' }}>
      <div style={{ fontWeight:'700', fontSize:'13px', color:'#333', marginBottom:'14px' }}>📈 Calories — 7 derniers jours</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'70px' }}>
        {days.map((d,i) => {
          const h = max ? Math.max((d.calories/max)*100, 2) : 2
          const isToday = d.date === today
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', height:'100%', justifyContent:'flex-end' }}>
              {d.calories > 0 && <div style={{ fontSize:'8px', color:'#999' }}>{d.calories}</div>}
              <div style={{ width:'100%', height:`${h}%`, background: isToday ? '#0D1B4E' : '#C5CEEA', borderRadius:'3px 3px 0 0' }} />
              <div style={{ fontSize:'9px', color: isToday ? '#0D1B4E' : '#999', fontWeight: isToday ? '700' : '400' }}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NutritionFoodBlock({ log, clientId }) {
  const [items, setItems] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('100')
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (log?.id) supabase.from('nutrition_log_meals').select('*').eq('log_id', log.id).order('created_at').then(({ data }) => setItems(data || []))
    else setItems([])
  }, [log?.id])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const q = query.trim().toLowerCase()
      const { data } = await supabase.from('foods').select('*').ilike('name', `%${q}%`).order('name').limit(100)
      const sorted = (data || []).sort((a, b) => {
        const an = a.name.toLowerCase(), bn = b.name.toLowerCase()
        const aStarts = an.startsWith(q), bStarts = bn.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return an.localeCompare(bn, 'fr')
      }).slice(0, 20)
      setResults(sorted); setSearching(false)
    }, 300)
  }, [query])

  const addItem = async () => {
    if (!selected || !log?.id) return
    const ratio = parseFloat(qty)/100
    const item = { log_id: log.id, name: selected.name, quantity: parseFloat(qty)||100, unit:'g', calories: Math.round(selected.calories*ratio), protein: Math.round(selected.protein*ratio*10)/10, carbs: Math.round(selected.carbs*ratio*10)/10, fat: Math.round(selected.fat*ratio*10)/10, fiber:0 }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) { setItems(prev => [...prev, data]); setSelected(null); setQuery(''); setQty('100'); setResults([]) }
  }

  const deleteItem = async (id) => { await supabase.from('nutrition_log_meals').delete().eq('id', id); setItems(prev => prev.filter(i => i.id !== id)) }
  const totals = items.reduce((a,i) => ({ cal:a.cal+(i.calories||0), prot:a.prot+(i.protein||0), carbs:a.carbs+(i.carbs||0), fat:a.fat+(i.fat||0) }), {cal:0,prot:0,carbs:0,fat:0})

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #EAEAEA', overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:'700', fontSize:'13px', color:'#0D1B4E' }}>🍽️ Détail aliments</div>
        {log && <button onClick={() => setShowSearch(!showSearch)} style={{ padding:'4px 10px', background:'#0D1B4E', color:'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>+ Ajouter</button>}
      </div>
      {showSearch && log && (
        <div style={{ padding:'12px 16px', background:'#F5F8FF', borderBottom:'1px solid #EAEAEA' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:'8px', marginBottom:'8px' }}>
            <div style={{ position:'relative' }}>
              <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Rechercher un aliment…" style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} />
              {searching && <span style={{ position:'absolute', right:'8px', top:'8px', fontSize:'11px', color:'#999' }}>…</span>}
              {results.length > 0 && !selected && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #E0E0E0', borderRadius:'6px', boxShadow:'0 8px 20px rgba(0,0,0,0.12)', zIndex:200, maxHeight:'200px', overflowY:'auto' }}>
                  {results.map(f => (
                    <div key={f.id} onClick={() => { setSelected(f); setQuery(f.name); setResults([]) }}
                      style={{ padding:'7px 10px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between', fontSize:'12px' }}
                      onMouseEnter={e => e.currentTarget.style.background='#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.background='white'}>
                      <span>{f.name}</span>
                      <span style={{ color:'#0D1B4E', fontWeight:'700' }}>{f.calories}kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="100g" style={{ padding:'7px 8px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} />
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={addItem} disabled={!selected} style={{ padding:'6px 14px', background: selected?'#0D1B4E':'#CCC', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor: selected?'pointer':'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowSearch(false)} style={{ padding:'6px 10px', background:'transparent', color:'#666', border:'1px solid #DDD', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Fermer</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div style={{ padding:'16px', textAlign:'center', color:'#CCC', fontSize:'12px' }}>{log ? 'Aucun aliment' : "Saisis d'abord les apports"}</div>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id} style={{ padding:'8px 16px', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px' }}>
              <span style={{ fontWeight:'500' }}>{item.name} <span style={{ color:'#999' }}>({item.quantity}g)</span></span>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ color:'#666' }}>{item.calories}kcal · P:{item.protein}g · G:{item.carbs}g · L:{item.fat}g</span>
                <button onClick={() => deleteItem(item.id)} style={{ background:'none', border:'none', color:'#DDD', cursor:'pointer', fontSize:'14px' }} onMouseEnter={e=>e.target.style.color='#C45C3A'} onMouseLeave={e=>e.target.style.color='#DDD'}>×</button>
              </div>
            </div>
          ))}
          <div style={{ padding:'8px 16px', background:'#F0F4FF', display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'700', color:'#0D1B4E' }}>
            <span>Total</span>
            <span>{Math.round(totals.cal)}kcal · P:{Math.round(totals.prot*10)/10}g · G:{Math.round(totals.carbs*10)/10}g · L:{Math.round(totals.fat*10)/10}g</span>
          </div>
        </>
      )}
    </div>
  )
}

function NutritionTodayView({ today, logs, plan, onSave }) {
  const log = logs.find(l => l.date === today)
  return (
    <div>
      <div style={{ fontWeight:'700', fontSize:'14px', color:'#0D1B4E', marginBottom:'14px' }}>
        {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
      </div>
      <NutritionMacroBlock log={log} plan={plan} date={today} onSave={onSave} />
      <NutritionScoreBlock log={log} plan={plan} />
      <NutritionWeekGraph logs={logs} plan={plan} today={today} />
      <NutritionFoodBlock log={log} />
    </div>
  )
}

function NutritionWeekView({ logs, plan, onSave, today }) {
  const [openDay, setOpenDay] = useState(today)
  const getWeekStart = (dateStr) => { const d = new Date(dateStr), day = d.getDay()===0?7:d.getDay(); const mon = new Date(d); mon.setDate(d.getDate()-day+1); return mon.toISOString().split('T')[0] }
  const weeks = {}
  const thisWeek = getWeekStart(today)
  weeks[thisWeek] = []
  logs.forEach(log => { const wk = getWeekStart(log.date); if(!weeks[wk]) weeks[wk]=[]; weeks[wk].push(log) })
  const sortedWeeks = Object.keys(weeks).sort((a,b)=>b.localeCompare(a))
  const getWeekLabel = (wk) => { const s=new Date(wk), e=new Date(wk); e.setDate(e.getDate()+6); return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}` }
  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:'target_calories', color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g', target:'target_protein', color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g', target:'target_carbs',   color:'#2A50B0' },
    { key:'fat',      label:'Lipides',   unit:'g', target:'target_fat',     color:'#3A7BD5' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {sortedWeeks.map(weekStart => {
        const weekLogs = weeks[weekStart]
        const isCurrent = weekStart === getWeekStart(today)
        const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); const ds=d.toISOString().split('T')[0]; return { date:ds, log:weekLogs.find(l=>l.date===ds)||null, isToday:ds===today, isFuture:ds>today } })
        return (
          <div key={weekStart} style={{ background:'white', borderRadius:'12px', border:`1px solid ${isCurrent?'#C0CAEF':'#EAEAEA'}`, overflow:'hidden', boxShadow:'0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ padding:'10px 16px', background:isCurrent?'#EEF2FF':'#F5F7FF', borderBottom:'1px solid #EAEAEA', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontWeight:'700', fontSize:'13px', color:'#0D1B4E' }}>📅 {getWeekLabel(weekStart)}</div>
              <div style={{ fontSize:'11px', color:'#999' }}>{weekLogs.filter(l=>l.calories>0).length}/7 jours</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr 1fr 1fr', background:'#F8FAFF', borderBottom:'1px solid #F0F0F0' }}>
              {['Jour','Calories','Protéines','Glucides','Lipides'].map(h => (
                <div key={h} style={{ fontSize:'9px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', fontWeight:'600', padding:'6px 12px' }}>{h}</div>
              ))}
            </div>
            {days.map(({ date, log, isToday, isFuture }) => {
              const isOpen = openDay === date
              const dayName = DAYS_FR[new Date(date).getDay()===0?6:new Date(date).getDay()-1]
              const hasData = log && log.calories > 0
              return (
                <div key={date}>
                  <div onClick={() => !isFuture && setOpenDay(isOpen?null:date)}
                    style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr 1fr 1fr', borderBottom:'1px solid #F5F5F5', background:isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent', cursor:isFuture?'default':'pointer' }}
                    onMouseEnter={e => { if(!isFuture) e.currentTarget.style.background='#F0F4FF' }}
                    onMouseLeave={e => { e.currentTarget.style.background=isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent' }}>
                    <div style={{ padding:'9px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:isToday?'700':'500', color:isFuture?'#CCC':'#0D1B4E' }}>{isToday?'📍 ':''}{dayName}</div>
                    </div>
                    {macros.map(m => {
                      const val = log?.[m.key]||0; const target = plan?.[m.target]; const pct = target&&val ? Math.min(100,(val/target)*100) : 0
                      return (
                        <div key={m.key} style={{ padding:'9px 12px' }}>
                          {hasData && val > 0 ? (
                            <>
                              <div style={{ fontSize:'12px', fontWeight:'600', color:m.color }}>{val}<span style={{ fontSize:'9px', color:'#BBB' }}> {m.unit}</span></div>
                              {target && <div style={{ marginTop:'2px', height:'3px', width:'60px', background:'#F0F0F0', borderRadius:'2px', overflow:'hidden' }}><div style={{ height:'100%', background:m.color, width:`${pct}%` }} /></div>}
                            </>
                          ) : <span style={{ color:'#DDD', fontSize:'12px' }}>—</span>}
                        </div>
                      )
                    })}
                  </div>
                  {isOpen && (
                    <div style={{ padding:'14px 16px', background:'#F5F8FF', borderBottom:'2px solid #E8ECFA' }}>
                      <NutritionMacroBlock log={log} plan={plan} date={date} onSave={onSave} />
                      <NutritionFoodBlock log={log} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── MESSAGES TAB ───────────────────────────────────────────
function MessagesTab({ coachId, clientId, clientName, onRead }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      // 1. Charger l'historique
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${coachId},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${coachId})`)
        .order('created_at')
      setMessages(data || [])

      // 2. Marquer les messages du client comme lus
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', clientId)
        .eq('receiver_id', coachId)
        .eq('read', false)
      onRead?.(clientId)

      // 3. Scroll en bas
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

      // 4. Abonnement Realtime sur cette conversation
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      const channel = supabase
        .channel(`messages-${coachId}-${clientId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${coachId}`
        }, payload => {
          if (payload.new.sender_id !== clientId) return
          setMessages(prev => [...prev, payload.new])
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
        .subscribe()
      channelRef.current = channel
    }

    load()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [clientId])

  const send = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')

    // Ajout optimiste
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, sender_id: coachId, receiver_id: clientId, content, read: false, created_at: new Date().toISOString() }])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: coachId, receiver_id: clientId, content, read: false })
      .select().single()

    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    setSending(false)
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const isToday = date.toDateString() === new Date().toDateString()
    if (isToday) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '500px' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #C5D0F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${(clientName?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700', flexShrink: 0 }}>
          {clientName?.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0D1B4E' }}>{clientName}</div>
          <div style={{ fontSize: '11px', color: '#8FA07A' }}>● Conversation directe</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '14px', margin: 'auto' }}>
            Aucun message avec {clientName?.split(' ')[0]} 👋
          </div>
        )}
        {messages.map(msg => {
          const isCoach = msg.sender_id === coachId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.5', background: isCoach ? '#0D1B4E' : 'white', color: isCoach ? 'white' : '#0D1B4E', border: isCoach ? 'none' : '1px solid #C5D0F0', borderBottomRightRadius: isCoach ? '4px' : '14px', borderBottomLeftRadius: isCoach ? '14px' : '4px', opacity: msg.id?.toString().startsWith('temp-') ? 0.7 : 1 }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7A99', marginTop: '3px', textAlign: isCoach ? 'right' : 'left', display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px' }}>
                  {formatTime(msg.created_at)}
                  {isCoach && <span style={{ color: msg.read ? '#8FA07A' : '#6B7A99' }}>{msg.read ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #C5D0F0', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message à ${clientName?.split(' ')[0]}… (Entrée pour envoyer)`}
          rows={2}
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #C5D0F0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', resize: 'none', outline: 'none' }}
        />
        <button onClick={send} disabled={sending || !newMsg.trim()} style={{ padding: '10px 18px', background: !newMsg.trim() ? 'rgba(13,27,78,0.3)' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: !newMsg.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          Envoyer
        </button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#0D1B4E', letterSpacing: '3px' }}>CHARGEMENT…</div>
}

const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500' }
const inp = { width: '100%', padding: '7px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
const ci = { width: '100%', padding: '4px 6px', border: '1.5px solid #C5D0F0', borderRadius: '5px', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
const btn = (bg, color, border, fs) => ({ padding: `7px 14px`, background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: fs||'13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })
