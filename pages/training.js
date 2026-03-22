import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export const dynamic = 'force-dynamic'
  
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const REST_OPTIONS = ['30s', '45s', '60s', '90s', '2 min', '3 min', '4 min', '5 min']

export default function Training() {
  const [user, setUser] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [workoutLogs, setWorkoutLogs] = useState({}) // { exerciceId: [{weight_used, reps_done, logged_at}] }
  const [logInputs, setLogInputs] = useState({}) // { exerciceId: {weight, reps, note} }
  const [logging, setLogging] = useState({}) // { exerciceId: true/false }
  const [newWorkout, setNewWorkout] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      await loadWorkouts(user.id)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const { data: sess } = await supabase
        .from('workout_sessions').select('*')
        .eq('client_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0])
      setSessions(sess || [])

      // Charger les logs des 30 derniers jours
      const { data: logs } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(500)
      
      // Organiser par exercise_name
      const logsByExercise = {}
      ;(logs || []).forEach(log => {
        if (!logsByExercise[log.exercise_name]) logsByExercise[log.exercise_name] = []
        logsByExercise[log.exercise_name].push(log)
      })
      setWorkoutLogs(logsByExercise)
      setLoading(false)
    }
    load()
  }, [])

  const loadWorkouts = async (uid) => {
    const { data: wk } = await supabase
      .from('workouts').select('*, exercises(*)')
      .eq('client_id', uid).order('day_of_week')
    setWorkouts((wk || []).map(w => ({
      ...w, exercises: (w.exercises || []).sort((a, b) => a.order_index - b.order_index)
    })))
  }

  const addWorkout = async () => {
    if (!newWorkout.name.trim()) return
    const { data } = await supabase.from('workouts').insert({ ...newWorkout, client_id: user.id }).select().single()
    if (data) {
      setWorkouts(prev => [...prev, { ...data, exercises: [] }])
      setShowAddWorkout(false)
      setNewWorkout({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id)
      setEditMode(data.id)
    }
  }

  const deleteWorkout = async (workoutId) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('workouts').delete().eq('id', workoutId)
    setWorkouts(prev => prev.filter(w => w.id !== workoutId))
    setOpenWorkout(null)
  }

  const addExercise = async (workoutId, groupType, groupId) => {
    const workout = workouts.find(w => w.id === workoutId)
    const order = workout?.exercises?.length || 0
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    const { data } = await supabase.from('exercises').insert({
      workout_id: workoutId, name: 'Nouvel exercice',
      sets: 3, reps: '10', rest: '90s', note: '', target_weight: '',
      order_index: order, group_type: groupType || 'Normal', group_id: gid
    }).select().single()
    if (data) setWorkouts(prev => prev.map(w =>
      w.id === workoutId ? { ...w, exercises: [...(w.exercises || []), data] } : w
    ))
  }

  const addSuperset = async (workoutId) => {
    const w = workouts.find(w => w.id === workoutId)
    const order = w?.exercises?.length || 0
    const gid = `ss_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const base = { workout_id: workoutId, sets: 3, reps: '10', rest: '90s', note: '', target_weight: '', group_type: 'Superset', group_id: gid }
    const [resA, resB] = await Promise.all([
      supabase.from('exercises').insert({ ...base, name: 'Exercice A', order_index: order }).select().single(),
      supabase.from('exercises').insert({ ...base, name: 'Exercice B', order_index: order + 1 }).select().single(),
    ])
    if (resA.data && resB.data) {
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, exercises: [...(w.exercises || []), resA.data, resB.data] } : w))
    }
  }

  const addGiantSet = async (workoutId) => {
    const w = workouts.find(w => w.id === workoutId)
    const order = w?.exercises?.length || 0
    const gid = `gs_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const base = { workout_id: workoutId, sets: 3, reps: '10', note: '', target_weight: '', group_type: 'Giant Set', group_id: gid }
    const results = await Promise.all(
      ['Exercice A', 'Exercice B', 'Exercice C'].map((name, i) =>
        supabase.from('exercises').insert({ ...base, name, rest: i === 2 ? '90s' : '0s', order_index: order + i }).select().single()
      )
    )
    const newExs = results.map(r => r.data).filter(Boolean)
    if (newExs.length === 3) {
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, exercises: [...(w.exercises || []), ...newExs] } : w))
    }
  }

  const updateExercise = async (workoutId, exId, field, value) => {
    setWorkouts(prev => prev.map(w =>
      w.id === workoutId ? { ...w, exercises: w.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) } : w
    ))
    await supabase.from('exercises').update({ [field]: value }).eq('id', exId)
  }

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    setWorkouts(prev => prev.map(w =>
      w.id === workoutId ? { ...w, exercises: w.exercises.filter(e => e.id !== exId) } : w
    ))
  }

  const logPerformance = async (exercise) => {
    const input = logInputs[exercise.id] || {}
    if (!input.weight && !input.reps) return
    setLogging(prev => ({ ...prev, [exercise.id]: true }))
    
    const entry = {
      client_id: user.id,
      workout_id: exercise.workout_id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets_done: exercise.sets,
      reps_done: input.reps || exercise.reps,
      weight_used: input.weight || '',
      notes: input.note || '',
      cycle_name: ''
    }
    
    const { data } = await supabase.from('workout_logs').insert(entry).select().single()
    if (data) {
      setWorkoutLogs(prev => ({
        ...prev,
        [exercise.name]: [data, ...(prev[exercise.name] || [])]
      }))
      // Reset input après log
      setLogInputs(prev => ({ ...prev, [exercise.id]: {} }))
    }
    setLogging(prev => ({ ...prev, [exercise.id]: false }))
  }

  const markDone = async (workoutId) => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('workout_sessions').insert({ client_id: user.id, workout_id: workoutId, date: today, completed: true })
    setSessions(prev => [...prev, { workout_id: workoutId, date: today }])
  }

  const isDone = (wId) => sessions.some(s => s.workout_id === wId)
  const todayNum = new Date().getDay()
  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#4A6FD4', 'Normal': 'transparent' }

  if (loading) return <LoadingScreen />

  return (
    <Layout title="Entrainements" user={user}>
      {/* Week grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '8px', marginBottom: '28px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          const done = workout && isDone(workout.id)
          const isToday = (i + 1) === (todayNum === 0 ? 7 : todayNum)
          return (
            <div key={day} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)} style={{
              background: done ? '#0D1B4E' : '#F0F4FF',
              border: `1.5px solid ${isToday ? '#4A6FD4' : done ? '#0D1B4E' : '#C5D0F0'}`,
              borderRadius: '10px', padding: '12px 8px', textAlign: 'center',
              boxShadow: isToday ? '0 0 0 3px rgba(74,111,212,0.2)' : 'none',
              opacity: !workout ? 0.45 : 1, cursor: workout ? 'pointer' : 'default', transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: done ? '#D4E0CC' : '#6B7A99' }}>{day}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: '700', margin: '4px 0', color: done ? 'white' : '#0D1B4E' }}>{i + 1}</div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: done ? '#D4E0CC' : isToday ? '#4A6FD4' : '#8FA07A' }}>
                {done ? '✓ ' : ''}{workout ? workout.name : 'Repos'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', fontWeight: '700' }}>Programme de la semaine</div>
        <button onClick={() => setShowAddWorkout(true)} style={btnStyle('#0D1B4E', 'white')}>+ Nouvelle séance</button>
      </div>

      {/* New workout form */}
      {showAddWorkout && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '16px' }}>Créer une nouvelle séance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Nom', el: <input value={newWorkout.name} onChange={e => setNewWorkout(p => ({ ...p, name: e.target.value }))} placeholder="ex: Push A" style={fieldStyle} /> },
              { label: 'Type', el: <select value={newWorkout.type} onChange={e => setNewWorkout(p => ({ ...p, type: e.target.value }))} style={fieldStyle}>
                {['Push','Pull','Legs','Full Body','Upper','Lower','Cardio','Autre'].map(t => <option key={t}>{t}</option>)}
              </select> },
              { label: 'Jour', el: <select value={newWorkout.day_of_week} onChange={e => setNewWorkout(p => ({ ...p, day_of_week: +e.target.value }))} style={fieldStyle}>
                {DAYS.map((d, i) => <option key={d} value={i+1}>{d}</option>)}
              </select> },
              { label: 'Durée (min)', el: <input type="number" value={newWorkout.duration_min} onChange={e => setNewWorkout(p => ({ ...p, duration_min: +e.target.value }))} style={fieldStyle} /> }
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={labelSt}>{label}</label>
                {el}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={addWorkout} style={btnStyle('#0D1B4E', 'white')}>✓ Créer</button>
            <button onClick={() => setShowAddWorkout(false)} style={btnStyle('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </div>
        </div>
      )}

      {/* Workout list */}
      {workouts.length === 0 ? (
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#6B7A99', fontSize: '14px' }}>
          Aucune séance. Clique sur "+ Nouvelle séance" pour commencer 💪
        </div>
      ) : workouts.map(workout => {
        const isOpen = openWorkout === workout.id
        const isEdit = editMode === workout.id
        return (
          <div key={workout.id} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
            <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', background: '#D4E0CC', color: '#0D1B4E' }}>{workout.type}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>{workout.name}</div>
                  <div style={{ fontSize: '13px', color: '#6B7A99', marginTop: '2px' }}>
                    {DAYS[(workout.day_of_week||1)-1]} · {workout.exercises?.length||0} exercices · {workout.duration_min} min
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isDone(workout.id)
                  ? <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(143,160,122,0.2)', color: '#0D1B4E' }}>✓ Complété</span>
                  : <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(74,111,212,0.12)', color: '#2A50B0' }}>À faire</span>
                }
                <span style={{ color: '#6B7A99', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button onClick={() => setEditMode(isEdit ? null : workout.id)} style={btnStyle(isEdit ? '#0D1B4E' : 'white', isEdit ? 'white' : '#6B7A99', '#C5D0F0')}>
                    {isEdit ? "✓ Terminer l'édition" : '✏️ Modifier'}
                  </button>
                  {!isDone(workout.id) && (
                    <button onClick={() => markDone(workout.id)} style={btnStyle('#0D1B4E', 'white')}>✓ Séance terminée</button>
                  )}
                  {isEdit && (
                    <button onClick={() => deleteWorkout(workout.id)} style={{ ...btnStyle('rgba(196,92,58,0.1)', '#C45C3A'), marginLeft: 'auto' }}>🗑 Supprimer</button>
                  )}
                </div>

                {workout.exercises?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr 70px 80px 90px 100px 1fr 32px' : '1fr 80px 80px 90px 100px 1fr 32px', gap: '8px', padding: '8px 12px', marginBottom: '4px' }}>
                    {['Exercice','Séries','Reps','Repos','Charge','Notes / Consignes', ''].map(h => (
                      <div key={h} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '500' }}>{h}</div>
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
                        <div key={ex.group_id} style={{ border: `2px solid ${groupColors[ex.group_type]}`, borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
                          <div style={{ background: groupColors[ex.group_type], color: 'white', padding: '5px 14px', fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>⚡ {ex.group_type}</span>
                            {isEdit && <button onClick={() => addExercise(workout.id, ex.group_type, ex.group_id)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Exercice</button>}
                          </div>
                          {group.map(e => <ExRow key={e.id} ex={e} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} logs={workoutLogs[e.name] || []} logInput={logInputs[e.id] || {}} onLogInput={(field, val) => setLogInputs(prev => ({ ...prev, [e.id]: { ...(prev[e.id]||{}), [field]: val } }))} onLog={() => logPerformance(e)} isLogging={logging[e.id]} />)}
                        </div>
                      )
                    }
                    rendered.add(ex.id)
                    return <ExRow key={ex.id} ex={ex} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} logs={workoutLogs[ex.name] || []} logInput={logInputs[ex.id] || {}} onLogInput={(field, val) => setLogInputs(prev => ({ ...prev, [ex.id]: { ...(prev[ex.id]||{}), [field]: val } }))} onLog={() => logPerformance(ex)} isLogging={logging[ex.id]} />
                  })
                })()}

                {workout.exercises?.length === 0 && !isEdit && (
                  <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '14px', padding: '20px' }}>Passe en mode édition pour ajouter des exercices</div>
                )}

                {isEdit && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btnStyle('#0D1B4E', 'white')}>+ Exercice</button>
                    <button onClick={() => addSuperset(workout.id)} style={btnStyle('#C45C3A', 'white')}>⚡ Superset (2 exos)</button>
                    <button onClick={() => addGiantSet(workout.id)} style={btnStyle('#8FA07A', 'white')}>🔥 Giant Set (3+ exos)</button>
                    <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={btnStyle('#4A6FD4', 'white')}>📉 Drop Set</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </Layout>
  )
}

function ExRow({ ex, wId, edit, onUpdate, onDelete, logs, logInput, onLogInput, onLog, isLogging }) {
  const [showImg, setShowImg] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const lastLog = logs?.[0]
  return (
    <>
      {showImg && ex.image_url && (
        <div onClick={() => setShowImg(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '500px', width: '90%' }}>
            <img src={ex.image_url} alt={ex.name} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', color: 'white', marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{ex.name}</div>
            <button onClick={() => setShowImg(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: edit ? '1fr 70px 80px 90px 100px 1fr 32px' : '1fr 80px 80px 90px 100px 1fr 32px', gap: '8px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        {edit
          ? <input value={ex.name} onChange={e => onUpdate(wId, ex.id, 'name', e.target.value)} style={cellInput} />
          : <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {ex.image_url
                ? <img src={ex.image_url} alt={ex.name} onClick={() => setShowImg(true)} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, border: '1px solid #C5D0F0' }} />
                : <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#EEF2FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💪</div>
              }
              <div><div style={{ fontWeight: '500', fontSize: '14px' }}>{ex.name}</div>{ex.note && <div style={{ fontSize: '12px', color: '#6B7A99' }}>{ex.note}</div>}</div>
            </div>
        }
        {edit
          ? <input type="number" value={ex.sets} onChange={e => onUpdate(wId, ex.id, 'sets', e.target.value)} style={{ ...cellInput, textAlign: 'center' }} />
          : <div style={{ fontSize: '14px', textAlign: 'center', color: '#0D1B4E' }}>{ex.sets}</div>
        }
        {edit
          ? <input value={ex.reps} onChange={e => onUpdate(wId, ex.id, 'reps', e.target.value)} style={{ ...cellInput, textAlign: 'center' }} />
          : <div style={{ fontSize: '14px', textAlign: 'center', color: '#0D1B4E' }}>{ex.reps}</div>
        }
        {edit
          ? <select value={ex.rest||'90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)} style={{ ...cellInput, textAlign: 'center' }}>
              {['30s','45s','60s','90s','2 min','3 min','4 min','5 min'].map(r => <option key={r}>{r}</option>)}
            </select>
          : <div style={{ fontSize: '13px', textAlign: 'center', color: '#6B7A99' }}>⏱ {ex.rest}</div>
        }
        {edit
          ? <input value={ex.target_weight||''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)} placeholder="ex: 80 kg" style={{ ...cellInput, textAlign: 'center' }} />
          : <div style={{ fontSize: '13px', textAlign: 'center', color: '#6B7A99' }}>{ex.target_weight ? `${ex.target_weight}` : '—'}</div>
        }
        {edit
          ? <input value={ex.note||''} onChange={e => onUpdate(wId, ex.id, 'note', e.target.value)} placeholder="Consigne coach…" style={cellInput} />
          : <div style={{ fontSize: '12px', color: '#6B7A99' }}>{ex.note}</div>
        }
        {edit && (
          <button onClick={() => onDelete(wId, ex.id)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(196,92,58,0.1)', color: '#C45C3A', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        )}
        {!edit && (
          <button onClick={() => setShowLog(!showLog)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #C5D0F0', background: showLog ? '#0D1B4E' : 'white', color: showLog ? 'white' : '#6B7A99', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📝</button>
        )}
      </div>

      {/* Zone de log — saisie charges */}
      {!edit && showLog && (
        <div style={{ padding: '10px 14px 12px', background: '#F5F8FF', borderBottom: '1px solid #E8ECFA' }}>
          {/* Dernière perf */}
          {lastLog && (
            <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '8px', padding: '6px 10px', background: 'rgba(74,111,212,0.08)', borderRadius: '6px', display: 'flex', gap: '12px' }}>
              <span>🕐 Dernière fois :</span>
              {lastLog.weight_used && <span style={{ fontWeight: '700', color: '#0D1B4E' }}>{lastLog.weight_used}</span>}
              {lastLog.reps_done && <span>{lastLog.reps_done} reps</span>}
              <span style={{ color: '#9AA' }}>{new Date(lastLog.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}
          {/* Historique rapide */}
          {logs?.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {logs.slice(0, 5).map((log, i) => (
                <div key={log.id} style={{ fontSize: '10px', padding: '3px 8px', background: i === 0 ? '#0D1B4E' : '#EEF2FF', color: i === 0 ? 'white' : '#6B7A99', borderRadius: '20px' }}>
                  {log.weight_used || '—'} · {new Date(log.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </div>
              ))}
            </div>
          )}
          {/* Saisie */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={logInput?.weight || ''}
              onChange={e => onLogInput('weight', e.target.value)}
              placeholder="Charge (ex: 80 kg)"
              style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", outline: 'none', width: '130px' }}
            />
            <input
              value={logInput?.reps || ''}
              onChange={e => onLogInput('reps', e.target.value)}
              placeholder="Reps réelles"
              style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", outline: 'none', width: '110px' }}
            />
            <input
              value={logInput?.note || ''}
              onChange={e => onLogInput('note', e.target.value)}
              placeholder="Note (optionnel)"
              style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", outline: 'none', flex: 1, minWidth: '120px' }}
            />
            <button
              onClick={onLog}
              disabled={isLogging || (!logInput?.weight && !logInput?.reps)}
              style={{ padding: '6px 14px', background: (!logInput?.weight && !logInput?.reps) ? '#CCC' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
              {isLogging ? '…' : '✓ Logger'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const cellInput = { width: '100%', padding: '5px 8px', border: '1.5px solid #C5D0F0', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
const fieldStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
const labelSt = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '6px', fontWeight: '500' }
const btnStyle = (bg, color, borderColor) => ({ padding: '8px 16px', background: bg, color, border: borderColor ? `1.5px solid ${borderColor}` : 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'Playfair Display',serif", fontSize: '20px', color: '#6B7A99' }}>Chargement…</div>
}
