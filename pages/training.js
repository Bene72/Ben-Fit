import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function Training() {
  const [user, setUser] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: wk } = await supabase
        .from('workouts')
        .select('*, exercises(*)')
        .eq('client_id', user.id)
        .order('day_of_week')
      setWorkouts(wk || [])

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const { data: sess } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0])
      setSessions(sess || [])
      setLoading(false)
    }
    load()
  }, [])

  const markDone = async (workoutId) => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('workout_sessions').insert({
      client_id: user.id,
      workout_id: workoutId,
      date: today,
      completed: true
    })
    setSessions(prev => [...prev, { workout_id: workoutId, date: today }])
  }

  const isDone = (workoutId) => sessions.some(s => s.workout_id === workoutId)

  if (loading) return <LoadingScreen />

  const today = new Date().getDay() // 0=Sun, 1=Mon...

  return (
    <Layout title="Entraînements" user={user}>
      {/* Week overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '8px', marginBottom: '28px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          const done = workout && isDone(workout.id)
          const isToday = (i + 1) === (today === 0 ? 7 : today)
          return (
            <div key={day} style={{
              background: done ? '#4A5240' : '#FDFAF4',
              border: `1.5px solid ${isToday ? '#C8A85A' : done ? '#4A5240' : '#E0D9CC'}`,
              borderRadius: '10px', padding: '12px 8px', textAlign: 'center',
              boxShadow: isToday ? '0 0 0 2px rgba(200,168,90,0.2)' : 'none',
              opacity: !workout ? 0.5 : 1,
              cursor: workout ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)}>
              <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: done ? '#D4E0CC' : '#7A7A6A' }}>{day}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', margin: '4px 0', color: done ? 'white' : '#1A1A14' }}>
                {i + 1}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: done ? '#D4E0CC' : isToday ? '#C8A85A' : '#8FA07A' }}>
                {done ? '✓ ' : ''}{workout ? workout.name : 'Repos'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Workout cards */}
      {workouts.length === 0 ? (
        <EmptyState msg="Aucun programme assigné pour cette semaine. Ton coach va bientôt le configurer." />
      ) : workouts.map(workout => (
        <div key={workout.id} style={{
          background: '#FDFAF4', border: '1px solid #E0D9CC',
          borderRadius: '14px', overflow: 'hidden', marginBottom: '12px'
        }}>
          <div
            onClick={() => setOpenWorkout(openWorkout === workout.id ? null : workout.id)}
            style={{
              padding: '18px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              borderBottom: openWorkout === workout.id ? '1px solid #E0D9CC' : '1px solid transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '11px', fontWeight: '600', letterSpacing: '1px',
                textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '20px', background: '#D4E0CC', color: '#4A5240'
              }}>{workout.type || 'Séance'}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{workout.name}</div>
                <div style={{ fontSize: '13px', color: '#7A7A6A', marginTop: '2px' }}>
                  {workout.exercises?.length || 0} exercices · {workout.duration_min || 60}–{workout.duration_max || 75} min
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDone(workout.id)
                ? <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(143,160,122,0.2)', color: '#4A5240' }}>✓ Complété</span>
                : <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(200,168,90,0.15)', color: '#A07820' }}>À faire</span>
              }
              <span style={{ color: '#7A7A6A' }}>{openWorkout === workout.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {openWorkout === workout.id && (
            <div style={{ padding: '20px 24px' }}>
              {workout.exercises && workout.exercises.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', 'Exercice', 'Séries', 'Reps', 'Charge cible', 'Repos'].map(h => (
                        <th key={h} style={{
                          fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase',
                          color: '#7A7A6A', fontWeight: '500', textAlign: 'left',
                          padding: '8px 12px', borderBottom: '1px solid #E0D9CC'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workout.exercises.map((ex, idx) => (
                      <tr key={ex.id}>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono', monospace" }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>{ex.name}</div>
                          {ex.note && <div style={{ fontSize: '12px', color: '#7A7A6A', marginTop: '2px' }}>{ex.note}</div>}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{ex.sets}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{ex.reps}</td>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="text"
                            placeholder={ex.target_weight || '—'}
                            style={{
                              width: '60px', padding: '5px 8px',
                              border: '1.5px solid #E0D9CC', borderRadius: '6px',
                              fontSize: '13px', textAlign: 'center',
                              fontFamily: "'DM Mono', monospace", background: 'white'
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#7A7A6A' }}>{ex.rest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#7A7A6A', fontSize: '14px' }}>Aucun exercice configuré pour cette séance.</p>
              )}

              {!isDone(workout.id) && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => markDone(workout.id)} style={{
                    padding: '9px 20px', background: '#4A5240', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
                  }}>✓ Marquer comme terminé</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </Layout>
  )
}

function EmptyState({ msg }) {
  return (
    <div style={{
      background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px',
      padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px'
    }}>{msg}</div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#7A7A6A' }}>
      Chargement…
    </div>
  )
}
