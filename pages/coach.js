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
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard'); return }
      setUser(user)
      await loadClients(user.id)
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

  const selectClient = (client) => { setSelected(client); setTab('overview') }

  const createClient = async () => {
    if (!newClient.full_name.trim() || !newClient.email.trim() || !newClient.password.trim()) {
      setCreateError('Tous les champs sont obligatoires'); return
    }
    setCreating(true); setCreateError('')
    try {
      // Sign up the new client
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClient.email,
        password: newClient.password,
      })
      if (authError) { setCreateError('Erreur: ' + authError.message); setCreating(false); return }
      if (!authData?.user?.id) { setCreateError('Erreur création compte'); setCreating(false); return }
      // Insert profile
      await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: newClient.full_name,
        email: newClient.email,
        role: 'client',
        coach_id: user.id
      })
      await loadClients(user.id)
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
                <button key={client.id} onClick={() => selectClient(client)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? '#4A5240' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: "'DM Sans',sans-serif", marginBottom: '2px', transition: 'all 0.2s' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: `hsl(${(client.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700' }}>
                    {client.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: isSelected ? 'white' : '#C8C8B8', fontWeight: '500' }}>{client.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#7A7A6A' }}>{w}/5 séances · {lastWeight(client)} kg</div>
                  </div>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: w >= 4 ? '#8FA07A' : w <= 1 ? '#C45C3A' : '#C8A85A', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
          <div style={{ padding: '16px', borderTop: '1px solid #2E2E24', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => setShowNewClient(true)} style={{ width: '100%', padding: '9px', background: '#C8A85A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Nouveau client</button>
            <button onClick={() => { supabase.auth.signOut(); router.push('/') }} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #2E2E24', borderRadius: '8px', color: '#7A7A6A', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Déconnexion</button>
          </div>

          {/* NEW CLIENT MODAL */}
          {showNewClient && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#1A1A14', border: '1px solid #3E3E30', borderRadius: '16px', padding: '28px', width: '380px', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#F5F0E8', marginBottom: '20px' }}>Nouveau client</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px' }}>Nom complet</label>
                  <input value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))} placeholder="Jean Dupont" style={{ width: '100%', padding: '9px 12px', border: '1px solid #3E3E30', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: '#2A2A20', color: '#F5F0E8', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px' }}>Email</label>
                  <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="jean@email.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid #3E3E30', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: '#2A2A20', color: '#F5F0E8', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px' }}>Mot de passe temporaire</label>
                  <input value={newClient.password} onChange={e => setNewClient(p => ({ ...p, password: e.target.value }))} placeholder="MotDePasse123!" style={{ width: '100%', padding: '9px 12px', border: '1px solid #3E3E30', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: '#2A2A20', color: '#F5F0E8', outline: 'none' }} />
                </div>
                {createError && <div style={{ color: '#C45C3A', fontSize: '13px', marginBottom: '12px' }}>{createError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={createClient} disabled={creating} style={{ flex: 1, padding: '10px', background: '#C8A85A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {creating ? 'Création…' : '✓ Créer le client'}
                  </button>
                  <button onClick={() => { setShowNewClient(false); setCreateError('') }} style={{ padding: '10px 16px', background: 'transparent', color: '#7A7A6A', border: '1px solid #3E3E30', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{ marginLeft: '260px', flex: 1 }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px', color: '#7A7A6A' }}>
              <div style={{ fontSize: '48px' }}>👈</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px' }}>Sélectionne un client</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '16px 32px', borderBottom: '1px solid #E0D9CC', background: '#F5F0E8', position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `hsl(${(selected.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'white', fontWeight: '700' }}>
                  {selected.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: '700' }}>{selected.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{selected.email}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[['overview','👁 Vue d\'ensemble'],['programme','🏋️ Programme'],['nutrition','🥗 Nutrition'],['messages','💬 Messages']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: tab === t ? '#4A5240' : 'transparent', color: tab === t ? 'white' : '#7A7A6A', fontFamily: "'DM Sans',sans-serif" }}>{label}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '28px 32px' }}>
                {tab === 'overview' && <OverviewTab client={selected} sessionsThisWeek={sessionsThisWeek} lastWeight={lastWeight} coachId={user.id} onUpdate={(updated) => { setSelected(updated); setClients(prev => prev.map(c => c.id === updated.id ? updated : c)) }} />}
                {tab === 'programme' && <ProgrammeTab clientId={selected.id} clientName={selected.full_name} coachId={user.id} />}
                {tab === 'nutrition' && selected && (<><NutritionTab clientId={selected.id} clientName={selected.full_name} /><div style={{marginTop:'32px'}}><NutritionClientView clientId={selected.id} /></div></>)}
                {tab === 'messages' && <MessagesTab coachId={user.id} clientId={selected.id} clientName={selected.full_name} />}
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
      {/* Stats grid — cliquable pour modifier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
        {/* Séances */}
        <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #C8A85A' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '8px' }}>Séances cette semaine</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: '700' }}>{sessions}<span style={{ fontSize: '16px', color: '#7A7A6A' }}>/{target}</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Objectif / semaine</label>
              <input type="number" value={sessionTarget} onChange={e => setSessionTarget(e.target.value)} style={{ ...inp, width: '80px' }} />
            </div>
          )}
        </div>

        {/* Poids */}
        <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #C45C3A' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '8px' }}>Dernier poids</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: '700' }}>{currentWeight}<span style={{ fontSize: '16px', color: '#7A7A6A' }}> kg</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Nouveau poids (kg)</label>
              <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="80.5" style={{ ...inp, width: '100px' }} />
            </div>
          )}
        </div>

        {/* Programme */}
        <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #4A5240' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '8px' }}>Programme actuel</div>
          {editStats ? (
            <input value={program} onChange={e => setProgram(e.target.value)} placeholder="Phase 2 · Hypertrophie" style={{ ...inp, marginTop: '4px', fontFamily: "'Playfair Display',serif", fontSize: '15px' }} />
          ) : (
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', fontWeight: '700' }}>{program || '—'}</div>
          )}
        </div>
      </div>

      {/* Edit / Save bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {editStats ? (
          <>
            <button onClick={saveAll} disabled={saving} style={btn('#4A5240', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer tout'}</button>
            <button onClick={() => { setEditStats(false); setProgram(client.current_program || ''); setSessionTarget(client.session_target || 5); setNewWeight('') }} style={btn('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setEditStats(true)} style={btn('#F5F0E8', '#4A5240', '#C8A85A')}>✏️ Modifier les stats</button>
        )}
      </div>

      {/* Note coach */}
      <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>📌 Message / Note pour {client.full_name?.split(' ')[0]}</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Écris une note ou message pour le client…" rows={5} style={{ width: '100%', padding: '12px', border: '1.5px solid #E0D9CC', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', resize: 'vertical', outline: 'none', lineHeight: '1.6' }} />
        <button onClick={saveAll} disabled={saving} style={{ marginTop: '10px', padding: '8px 20px', background: '#4A5240', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
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

  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#C8A85A' }

  if (loading) return <div style={{ color: '#7A7A6A', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      {/* Week overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          return (
            <div key={day} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)} style={{ background: workout ? '#4A5240' : '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: workout ? 'pointer' : 'default', opacity: workout ? 1 : 0.5 }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: workout ? '#D4E0CC' : '#7A7A6A' }}>{day}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: workout ? 'white' : '#9A9A8A', marginTop: '4px' }}>{workout ? workout.name : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700' }}>Programme de {clientName?.split(' ')[0]}</div>
        <button onClick={() => setShowAdd(true)} style={btn('#4A5240', 'white')}>+ Nouvelle séance</button>
      </div>

      {showAdd && (
        <div style={{ background: '#FDFAF4', border: '2px solid #C8A85A', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
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
            <button onClick={addWorkout} style={btn('#4A5240', 'white')}>✓ Créer</button>
            <button onClick={() => setShowAdd(false)} style={btn('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
          </div>
        </div>
      )}

      {workouts.length === 0 && !showAdd && (
        <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#7A7A6A' }}>
          Aucune séance pour {clientName?.split(' ')[0]}. Clique sur "+ Nouvelle séance" pour commencer 💪
        </div>
      )}

      {workouts.map(workout => {
        const isOpen = openWorkout === workout.id
        const isEdit = editMode === workout.id
        return (
          <div key={workout.id} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #E0D9CC' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', background: '#D4E0CC', color: '#4A5240' }}>{workout.type}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{workout.name}</div>
                  <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{DAYS[(workout.day_of_week||1)-1]} · {workout.exercises?.length||0} exercices · {workout.duration_min} min</div>
                </div>
              </div>
              <span style={{ color: '#7A7A6A', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button onClick={() => setEditMode(isEdit ? null : workout.id)} style={btn(isEdit ? '#1A1A14' : 'white', isEdit ? 'white' : '#7A7A6A', '#E0D9CC')}>
                    {isEdit ? '✓ Terminer édition' : '✏️ Modifier'}
                  </button>
                  {isEdit && <button onClick={() => deleteWorkout(workout.id)} style={{ ...btn('rgba(196,92,58,0.1)', '#C45C3A'), marginLeft: 'auto' }}>🗑 Supprimer</button>}
                </div>

                {workout.exercises?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr 60px 70px 80px 90px 1fr 28px' : '1fr 60px 70px 80px 90px 1fr', gap: '6px', padding: '6px 10px', marginBottom: '4px' }}>
                    {['Exercice','Séries','Reps','Repos','Charge','Notes',isEdit?'':null].filter(h => h !== null).map(h => (
                      <div key={h} style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7A6A' }}>{h}</div>
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
                        <div key={ex.group_id} style={{ border: `2px solid ${groupColors[ex.group_type]||'#E0D9CC'}`, borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                          <div style={{ background: groupColors[ex.group_type]||'#E0D9CC', color: 'white', padding: '4px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
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
                  <div style={{ textAlign: 'center', color: '#7A7A6A', fontSize: '13px', padding: '16px' }}>Passe en mode édition pour ajouter des exercices</div>
                )}

                {isEdit && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btn('#4A5240', 'white')}>+ Exercice</button>
                    <button onClick={() => addExercise(workout.id, 'Superset', null)} style={btn('#C45C3A', 'white')}>⚡ Superset</button>
                    <button onClick={() => addExercise(workout.id, 'Giant Set', null)} style={btn('#8FA07A', 'white')}>🔥 Giant Set</button>
                    <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={btn('#C8A85A', 'white')}>📉 Drop Set</button>
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
        : <div><div style={{ fontWeight: '500', fontSize: '13px' }}>{ex.name}</div>{ex.note && <div style={{ fontSize: '11px', color: '#7A7A6A' }}>{ex.note}</div>}</div>}
      {edit ? <input type="number" value={ex.sets} onChange={e => onUpdate(wId, ex.id, 'sets', e.target.value)} style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.sets}</div>}
      {edit ? <input value={ex.reps} onChange={e => onUpdate(wId, ex.id, 'reps', e.target.value)} style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.reps}</div>}
      {edit ? <select value={ex.rest||'90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)} style={{ ...ci, textAlign: 'center' }}>
          {['30s','45s','60s','90s','2 min','3 min','4 min','5 min'].map(r => <option key={r}>{r}</option>)}
        </select>
        : <div style={{ fontSize: '12px', textAlign: 'center', color: '#7A7A6A' }}>⏱ {ex.rest}</div>}
      {edit ? <input value={ex.target_weight||''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)} placeholder="80 kg" style={{ ...ci, textAlign: 'center' }} />
        : <div style={{ fontSize: '12px', textAlign: 'center', color: '#7A7A6A' }}>{ex.target_weight ? `${ex.target_weight} kg` : '—'}</div>}
      {edit ? <input value={ex.note||''} onChange={e => onUpdate(wId, ex.id, 'note', e.target.value)} placeholder="Consigne…" style={ci} />
        : <div style={{ fontSize: '11px', color: '#7A7A6A' }}>{ex.note}</div>}
      {edit && <button onClick={() => onDelete(wId, ex.id)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
    </div>
  )
}

// ─── NUTRITION TAB ──────────────────────────────────────────
function NutritionTab({ clientId, clientName }) {
  const [plan, setPlan] = useState(null)
  const [meals, setMeals] = useState([])
  const [editPlan, setEditPlan] = useState(false)
  const [planForm, setPlanForm] = useState({ target_calories: '', target_protein: '', target_carbs: '', target_fat: '', coach_note: '' })
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [newMeal, setNewMeal] = useState({ name: '', time_slot: '08h00', calories: '', day: 'tous' })
  const [showAddFood, setShowAddFood] = useState(null)
  const [newFood, setNewFood] = useState({ name: '', quantity: '', unit: 'g', protein: '', carbs: '', fat: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true).maybeSingle()
      setPlan(np)
      if (np) {
        setPlanForm({ target_calories: np.target_calories||'', target_protein: np.target_protein||'', target_carbs: np.target_carbs||'', target_fat: np.target_fat||'', coach_note: np.coach_note||'' })
        const { data: ml } = await supabase.from('meals').select('*, food_items(*)').eq('nutrition_plan_id', np.id).order('order_index')
        setMeals(ml || [])
      } else {
        setPlanForm({ target_calories: '', target_protein: '', target_carbs: '', target_fat: '', coach_note: '' })
        setMeals([])
      }
      setLoading(false)
    }
    load()
    setEditPlan(false)
  }, [clientId])

  const savePlan = async () => {
    setSaving(true)
    const planData = { client_id: clientId, active: true, target_calories: +planForm.target_calories||0, target_protein: +planForm.target_protein||0, target_carbs: +planForm.target_carbs||0, target_fat: +planForm.target_fat||0, coach_note: planForm.coach_note }
    if (plan) {
      const { data } = await supabase.from('nutrition_plans').update(planData).eq('id', plan.id).select().single()
      setPlan(data)
    } else {
      const { data } = await supabase.from('nutrition_plans').insert(planData).select().single()
      setPlan(data)
    }
    setSaving(false); setEditPlan(false)
  }

  const addMeal = async () => {
    if (!plan || !newMeal.name.trim()) return
    const { data } = await supabase.from('meals').insert({ ...newMeal, nutrition_plan_id: plan.id, order_index: meals.length, calories: +newMeal.calories||0 }).select().single()
    if (data) { setMeals(prev => [...prev, { ...data, food_items: [] }]); setShowAddMeal(false); setNewMeal({ name: '', time_slot: '08h00', calories: '', day: 'tous' }) }
  }

  const deleteMeal = async (mealId) => {
    if (!confirm('Supprimer ce repas ?')) return
    await supabase.from('meals').delete().eq('id', mealId)
    setMeals(prev => prev.filter(m => m.id !== mealId))
  }

  const addFoodItem = async (mealId) => {
    if (!newFood.name.trim()) return
    const { data } = await supabase.from('food_items').insert({ ...newFood, meal_id: mealId, quantity: +newFood.quantity||0, protein: +newFood.protein||0, carbs: +newFood.carbs||0, fat: +newFood.fat||0 }).select().single()
    if (data) { setMeals(prev => prev.map(m => m.id === mealId ? { ...m, food_items: [...(m.food_items||[]), data] } : m)); setShowAddFood(null); setNewFood({ name: '', quantity: '', unit: 'g', protein: '', carbs: '', fat: '' }) }
  }

  const deleteFoodItem = async (mealId, foodId) => {
    await supabase.from('food_items').delete().eq('id', foodId)
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, food_items: m.food_items.filter(f => f.id !== foodId) } : m))
  }

  if (loading) return <div style={{ color: '#7A7A6A', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      {/* Plan objectifs */}
      <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700' }}>
            {plan ? 'Plan nutritionnel actuel' : 'Créer un plan nutritionnel'}
          </div>
          <button onClick={() => setEditPlan(!editPlan)} style={btn(editPlan ? '#1A1A14' : '#4A5240', 'white')}>
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
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Note / consigne coach</label><textarea value={planForm.coach_note} onChange={e => setPlanForm(p => ({ ...p, coach_note: e.target.value }))} placeholder="Indications nutritionnelles pour le client…" rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
            <button onClick={savePlan} disabled={saving} style={btn('#4A5240', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer le plan'}</button>
          </div>
        ) : plan ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {[['🔥',plan.target_calories,'kcal / jour'],['🥩',plan.target_protein,'g protéines'],['🌾',plan.target_carbs,'g glucides'],['🥑',plan.target_fat,'g lipides']].map(([icon,val,label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', fontWeight: '700' }}>{val||'—'}</div>
                <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#7A7A6A', fontSize: '14px', textAlign: 'center', padding: '10px' }}>
            Aucun plan nutritionnel. Clique sur "+ Créer le plan" pour commencer.
          </div>
        )}
      </div>

      {/* Repas */}
      {plan && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700' }}>Repas du plan</div>
            <button onClick={() => setShowAddMeal(true)} style={btn('#4A5240', 'white')}>+ Ajouter un repas</button>
          </div>

          {showAddMeal && (
            <div style={{ background: '#FDFAF4', border: '2px solid #C8A85A', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '10px' }}>
                <div><label style={lbl}>Nom</label><input value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))} placeholder="Déjeuner" style={inp} /></div>
                <div><label style={lbl}>Horaire</label><input value={newMeal.time_slot} onChange={e => setNewMeal(p => ({ ...p, time_slot: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Calories</label><input type="number" value={newMeal.calories} onChange={e => setNewMeal(p => ({ ...p, calories: e.target.value }))} placeholder="600" style={inp} /></div>
                <div><label style={lbl}>Jour</label>
                  <select value={newMeal.day} onChange={e => setNewMeal(p => ({ ...p, day: e.target.value }))} style={inp}>
                    <option value="tous">Tous les jours</option>
                    {DAYS_FR.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addMeal} style={btn('#4A5240', 'white')}>✓ Créer</button>
                <button onClick={() => setShowAddMeal(false)} style={btn('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
              </div>
            </div>
          )}

          {meals.map(meal => (
            <div key={meal.id} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '12px', padding: '16px 20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{meal.time_slot} · {meal.day}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{meal.name}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#A07820', background: 'rgba(200,168,90,0.12)', padding: '3px 8px', borderRadius: '20px' }}>{meal.calories} kcal</span>
                  <button onClick={() => setShowAddFood(showAddFood === meal.id ? null : meal.id)} style={btn('#4A5240', 'white', null, '12px')}>+ Aliment</button>
                  <button onClick={() => deleteMeal(meal.id)} style={btn('rgba(196,92,58,0.1)', '#C45C3A', null, '12px')}>🗑</button>
                </div>
              </div>
              {meal.food_items?.map(food => (
                <div key={food.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '13px' }}>
                  <span>{food.name} {food.quantity ? `(${food.quantity}${food.unit})` : ''}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>P:{food.protein}g · G:{food.carbs}g · L:{food.fat}g</span>
                    <button onClick={() => deleteFoodItem(meal.id, food.id)} style={{ background: 'none', border: 'none', color: '#C45C3A', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  </div>
                </div>
              ))}
              {showAddFood === meal.id && (
                <div style={{ marginTop: '10px', padding: '12px', background: '#F5F0E8', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 50px 55px 55px 55px', gap: '6px', marginBottom: '8px' }}>
                    <div><label style={lbl}>Aliment</label><input value={newFood.name} onChange={e => setNewFood(p => ({ ...p, name: e.target.value }))} placeholder="Riz cuit" style={inp} /></div>
                    <div><label style={lbl}>Qté</label><input type="number" value={newFood.quantity} onChange={e => setNewFood(p => ({ ...p, quantity: e.target.value }))} placeholder="200" style={inp} /></div>
                    <div><label style={lbl}>Unité</label><select value={newFood.unit} onChange={e => setNewFood(p => ({ ...p, unit: e.target.value }))} style={inp}>{['g','ml','cs','cc','pc'].map(u => <option key={u}>{u}</option>)}</select></div>
                    <div><label style={lbl}>Prot.</label><input type="number" value={newFood.protein} onChange={e => setNewFood(p => ({ ...p, protein: e.target.value }))} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>Gluc.</label><input type="number" value={newFood.carbs} onChange={e => setNewFood(p => ({ ...p, carbs: e.target.value }))} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>Lip.</label><input type="number" value={newFood.fat} onChange={e => setNewFood(p => ({ ...p, fat: e.target.value }))} placeholder="0" style={inp} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => addFoodItem(meal.id)} style={btn('#4A5240', 'white', null, '12px')}>✓ Ajouter</button>
                    <button onClick={() => setShowAddFood(null)} style={btn('transparent', '#7A7A6A', '#E0D9CC', '12px')}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MESSAGES TAB ───────────────────────────────────────────
function MessagesTab({ coachId, clientId, clientName }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${coachId},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${coachId})`)
        .order('created_at')
      setMessages(data || [])
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    load()
  }, [clientId])

  const send = async () => {
    if (!newMsg.trim()) return
    const { data } = await supabase.from('messages').insert({ sender_id: coachId, receiver_id: clientId, content: newMsg.trim(), read: false }).select().single()
    if (data) { setMessages(prev => [...prev, data]); setNewMsg(''); setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }
  }

  return (
    <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '500px' }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#7A7A6A', fontSize: '14px', margin: 'auto' }}>Aucun message avec {clientName?.split(' ')[0]}</div>}
        {messages.map(msg => {
          const isCoach = msg.sender_id === coachId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.5', background: isCoach ? '#4A5240' : '#E0D9CC', color: isCoach ? 'white' : '#1A1A14', borderBottomRightRadius: isCoach ? '4px' : '14px', borderBottomLeftRadius: isCoach ? '14px' : '4px' }}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E0D9CC', display: 'flex', gap: '10px' }}>
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={`Message à ${clientName?.split(' ')[0]}…`} style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E0D9CC', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none' }} />
        <button onClick={send} style={btn('#4A5240', 'white')}>Envoyer</button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display',serif", fontSize: '20px', color: '#7A7A6A' }}>Chargement…</div>
}

const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px', fontWeight: '500' }
const inp = { width: '100%', padding: '7px 10px', border: '1.5px solid #E0D9CC', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#1A1A14' }
const ci = { width: '100%', padding: '4px 6px', border: '1.5px solid #E0D9CC', borderRadius: '5px', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#1A1A14' }
const btn = (bg, color, border, fs) => ({ padding: `7px 14px`, background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: fs||'13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })
