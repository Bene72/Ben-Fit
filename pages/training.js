import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

const TRAINING_TABS = [
  { label: 'Séance', value: 'session' },
  { label: 'Historique', value: 'history' },
]

function safeDateLabel(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return '—'
  }
}

function normalizeExercises(exercises) {
  return [...(exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
}

function buildExerciseGroups(exercises) {
  const rendered = new Set()
  const items = []
  normalizeExercises(exercises).forEach((ex) => {
    if (rendered.has(ex.id)) return
    if (ex.group_id && ex.group_type && ex.group_type !== 'Normal') {
      const groupItems = normalizeExercises(exercises).filter((item) => item.group_id === ex.group_id)
      groupItems.forEach((item) => rendered.add(item.id))
      items.push({ kind: 'group', id: ex.group_id, groupType: ex.group_type, exercises: groupItems })
    } else {
      rendered.add(ex.id)
      items.push({ kind: 'single', id: ex.id, exercise: ex })
    }
  })
  return items
}

function workoutLogCount(workout, logsByExerciseName) {
  return (workout?.exercises || []).reduce((sum, ex) => sum + ((logsByExerciseName[ex.name] || []).length || 0), 0)
}

function latestPerfText(log) {
  if (!log) return 'Aucun log'
  const chunks = []
  if (log.weight_used) chunks.push(log.weight_used)
  if (log.reps_done) chunks.push(`${log.reps_done} reps`)
  return chunks.length ? chunks.join(' · ') : 'Log enregistré'
}

function getWorkoutDayLabel(day) {
  const labels = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
  return labels[day] || 'Jour'
}

function getLogNote(log) {
  return log?.notes || log?.note || log?.comment || ''
}

function getLogDate(log) {
  return log?.logged_at || log?.created_at || log?.date || null
}

function buildInputFromLog(log) {
  if (!log) return {}
  const noteText = log?.notes || log?.note || log?.comment || ''
  let cleanNote = noteText || ''
  let rpe = ''
  const match = cleanNote.match(/(?:^|·)\sRPE\s([0-9]+(?:[.,][0-9]+)?)/i)
  if (match) {
    rpe = String(match[1]).replace(',', '.')
    cleanNote = cleanNote.replace(match[0], '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim()
  }
  return {
    weight: log?.weight_used || '',
    reps: log?.reps_done || '',
    rpe,
    note: cleanNote,
  }
}

async function loadLogsForClient(currentUserId) {
  const attempts = [
    async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('')
        .eq('client_id', currentUserId)
        .order('logged_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data || []
    },
    async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('')
        .eq('client_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data || []
    },
    async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data || []).map((row) => ({
        ...row,
        exercise_name: row.exercise_name || row.exercise || row.name,
        weight_used: row.weight_used || row.weight || null,
        reps_done: row.reps_done || row.reps || null,
        notes: row.notes || row.note || row.comment || null,
        logged_at: row.logged_at || row.created_at || null,
      }))
    },
  ]
  let lastError = null
  for (const attempt of attempts) {
    try {
      const rows = await attempt()
      return rows
    } catch (e) {
      lastError = e
    }
  }
  if (lastError) throw lastError
  return []
}

async function insertWorkoutLogWithFallback(payload) {
  const attempts = [
    {
      table: 'workout_logs',
      build: () => ({
        client_id: payload.client_id,
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        exercise_name: payload.exercise_name,
        weight_used: payload.weight_used,
        reps_done: payload.reps_done,
        notes: payload.notes,
        logged_at: payload.logged_at,
      }),
    },
    {
      table: 'workout_logs',
      build: () => ({
        client_id: payload.client_id,
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        exercise_name: payload.exercise_name,
        weight_used: payload.weight_used,
        reps_done: payload.reps_done,
        note: payload.notes,
        logged_at: payload.logged_at,
      }),
    },
    {
      table: 'workout_logs',
      build: () => ({
        client_id: payload.client_id,
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        exercise_name: payload.exercise_name,
        weight_used: payload.weight_used,
        reps_done: payload.reps_done,
        notes: payload.notes,
      }),
    },
    {
      table: 'workout_logs',
      build: () => ({
        client_id: payload.client_id,
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        exercise_name: payload.exercise_name,
        weight_used: payload.weight_used,
        reps_done: payload.reps_done,
        note: payload.notes,
      }),
    },
    {
      table: 'workout_sessions',
      build: () => ({
        client_id: payload.client_id,
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        exercise_name: payload.exercise_name,
        weight_used: payload.weight_used,
        reps_done: payload.reps_done,
        comment: payload.notes,
        created_at: payload.logged_at,
      }),
    },
  ]
  let lastError = null
  for (const attempt of attempts) {
    try {
      const { data, error } = await supabase
        .from(attempt.table)
        .insert(attempt.build())
        .select()
        .single()
      if (error) throw error
      return {
        row: {
          ...data,
          exercise_name: data.exercise_name || payload.exercise_name,
          weight_used: data.weight_used || payload.weight_used,
          reps_done: data.reps_done || payload.reps_done,
          notes: data.notes || data.note || data.comment || payload.notes || null,
          logged_at: data.logged_at || data.created_at || payload.logged_at,
        },
        table: attempt.table,
      }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError || new Error('Impossible d'enregistrer la performance')
}

export default function TrainingPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('session')
  const [workouts, setWorkouts] = useState([])
  const [logsByExerciseName, setLogsByExerciseName] = useState({})
  const [openWorkout, setOpenWorkout] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [logInputs, setLogInputs] = useState({})
  const [loggingIds, setLoggingIds] = useState({})
  const [imageLightbox, setImageLightbox] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 980)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true)
        setError('')
        setSuccess('')
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user
        if (!currentUser) {
          router.push('/')
          return
        }
        if (!active) return
        setUser(currentUser)

        const [{ data: workoutData, error: workoutError }, logsData] = await Promise.all([
          supabase.from('workouts').select('*, exercises(*)').eq('client_id', currentUser.id).eq('is_archived', false).order('day_of_week', { ascending: true }),
          loadLogsForClient(currentUser.id),
        ])

        if (workoutError) throw workoutError
        if (!active) return

        const mapped = (workoutData || []).map((workout) => ({ ...workout, exercises: normalizeExercises(workout.exercises || []) }))
        const groupedLogs = {}
        ;(logsData || []).forEach((log) => {
          const key = log.exercise_name || 'Sans nom'
          if (!groupedLogs[key]) groupedLogs[key] = []
          groupedLogs[key].push(log)
        })

        setWorkouts(mapped)
        setLogsByExerciseName(groupedLogs)

        const prefills = {}
        mapped.forEach((workout) => {
          ;(workout.exercises || []).forEach((exercise) => {
            const latest = (groupedLogs[exercise.name] || [])[0]
            if (latest) prefills[exercise.id] = buildInputFromLog(latest)
          })
        })
        setLogInputs(prefills)

        if (mapped.length) {
          setOpenWorkout(mapped[0].id)
          if (mapped[0].exercises?.length) setSelectedExerciseId(mapped[0].exercises[0].id)
        }
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger la séance')
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  const currentWorkout = useMemo(() => workouts.find((workout) => workout.id === openWorkout) || null, [workouts, openWorkout])
  const selectedExercise = useMemo(() => {
    if (!currentWorkout) return null
    return (currentWorkout.exercises || []).find((item) => item.id === selectedExerciseId) || currentWorkout.exercises?.[0] || null
  }, [currentWorkout, selectedExerciseId])
  const selectedLogs = useMemo(() => (selectedExercise ? logsByExerciseName[selectedExercise.name] || [] : []), [selectedExercise, logsByExerciseName])
  const selectedLatestLog = selectedLogs[0] || null
  const exerciseBlocks = useMemo(() => (currentWorkout ? buildExerciseGroups(currentWorkout.exercises) : []), [currentWorkout])

  function openSession(id) {
    setOpenWorkout(id)
    const workout = workouts.find((w) => w.id === id)
    if (workout?.exercises?.length) setSelectedExerciseId(workout.exercises[0].id)
    else setSelectedExerciseId(null)
  }

  function onLogInput(exerciseId, field, value) {
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] || {}), [field]: value },
    }))
  }

  async function logPerformance(exercise) {
    const input = logInputs[exercise.id] || {}
    if (!input.weight && !input.reps && !input.note && !input.rpe) return
    try {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: true }))
      setError('')
      setSuccess('')

      const noteParts = []
      if (input.rpe) noteParts.push(`RPE ${input.rpe}`)
      if (input.note) noteParts.push(input.note)

      const payload = {
        client_id: user.id,
        workout_id: exercise.workout_id || null,
        exercise_id: exercise.id || null,
        exercise_name: exercise.name,
        weight_used: input.weight ? String(input.weight) : null,
        reps_done: input.reps ? String(input.reps) : null,
        notes: noteParts.length ? noteParts.join(' · ') : null,
        logged_at: new Date().toISOString(),
      }

      const { row } = await insertWorkoutLogWithFallback(payload)

      setLogsByExerciseName((prev) => ({ ...prev, [exercise.name]: [row, ...(prev[exercise.name] || [])] }))
      setLogInputs((prev) => ({ ...prev, [exercise.id]: buildInputFromLog(row) }))
      setSuccess('Performance enregistrée.')
    } catch (e) {
      setError(e.message || 'Impossible d'enregistrer la performance')
    } finally {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: false }))
    }
  }

  if (loading) {
    return (
      <AppShell title="Training" subtitle="Chargement de ta séance..." actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}>
        <SurfaceCard padded><div style={{ color: '#6B7A99' }}>Chargement…</div></SurfaceCard>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Training"
      subtitle="Un espace clair, premium et lisible pour naviguer entre tes séances, sélectionner un mouvement et enregistrer tes performances."
      actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}
    >
      {error ? (
        <div style={{ marginBottom: 12 }}>
          <SurfaceCard padded style={{ borderColor: '#F3C4C4', background: '#FEF2F2' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: '#B42318', fontSize: 13 }}>Erreur</strong>
            <div style={{ color: '#B42318', fontSize: 13 }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 12 }}>
          <SurfaceCard padded style={{ borderColor: '#C9E9D5', background: '#F0FBF4' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: '#16804A', fontSize: 13 }}>OK</strong>
            <div style={{ color: '#16804A', fontSize: 13 }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {imageLightbox ? (
        <div onClick={() => setImageLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <img src={imageLightbox} alt="Exercice" style={{ maxWidth: 'min(1000px, 100%)', maxHeight: '88vh', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }} />
        </div>
      ) : null}

      {activeTab === 'session' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 0.92fr) minmax(380px, 1.4fr) minmax(220px, 0.92fr)', gap: 14, alignItems: 'start' }}>
          <SurfaceCard padded sticky={!isMobile}>
            <SectionHead title="Séances" caption="Choisis la séance active puis navigue exercice par exercice." />
            {workouts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workouts.map((workout) => {
                  const active = workout.id === openWorkout
                  return (
                    <button key={workout.id} type="button" onClick={() => openSession(workout.id)} style={{ width: '100%', textAlign: 'left', borderRadius: 12, border: active ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: active ? '#F5F8FF' : '#FFFFFF', padding: '12px 14px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 15, color: '#0D1B4E', marginBottom: 2 }}>{workout.name}</div>
                          <div style={{ color: '#6B7A99', fontSize: 12 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exercice(s)</div>
                        </div>
                        {active ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de séance active." />}

            <div style={{ marginTop: 14 }}>
              <SectionHead title="Vue rapide" caption="Résumé de la séance sélectionnée." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <MiniKpi label="Exos" value={currentWorkout?.exercises?.length || 0} />
                <MiniKpi label="Blocs" value={currentWorkout ? buildExerciseGroups(currentWorkout.exercises).length : 0} />
                <MiniKpi label="Logs" value={currentWorkout ? workoutLogCount(currentWorkout, logsByExerciseName) : 0} />
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead
              title={currentWorkout?.name || 'Programme'}
              caption={isMobile ? "Appuie sur un exercice : son détail s'ouvre directement juste en dessous." : "Sélectionne un exercice depuis la liste. Le détail s'affiche dans l'espace de travail juste en dessous."}
              action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null}
            />

            {currentWorkout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {exerciseBlocks.map((block) => {
                  if (block.kind === 'group' && block.groupType === 'Workout Block') {
                    let meta = {}
                    try { meta = JSON.parse(block.exercises[0]?.note || '{}') } catch {}
                    const typeColors = {
                      'For Time': '#C45C3A', 'AMRAP': '#2C64E5', 'EMOM': '#3A7A5A',
                      'Hyrox': '#0D1B4E', 'Interval': '#6B4FD4', 'Zone 2': '#2A6B8A', 'Cap Time': '#B8860B'
                    }
                    const tc = typeColors[meta.type] || '#0D1B4E'
                    return (
                      <div key={block.id} style={{ borderRadius: 12, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 20px rgba(13,27,78,0.15)', marginBottom: 2 }}>
                        <div style={{ background: tc, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🔥</span>
                          <div>
                            <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase' }}>
                              {meta.type || 'Workout Block'}
                              {meta.cap ? ` — CAP ${meta.cap} min` : ''}
                              {meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}
                            </div>
                            {meta.objective && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 }}>🎯 {meta.objective}</div>}
                          </div>
                        </div>
                        <div style={{ background: '#0D1B4E', padding: '10px 12px' }}>
                          {block.exercises.map((e, i) => (
                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < block.exercises.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                              <span style={{ color: tc, fontSize: 11, fontWeight: 800, minWidth: 14 }}>•</span>
                              <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{e.name}</span>
                            </div>
                          ))}
                          {meta.coachNote && (
                            <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, borderLeft: `3px solid ${tc}` }}>
                              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' }}>🧠 Note coach</span>
                              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{meta.coachNote}</span>
                            </div>
                          )}
                          {meta.rest && meta.rest !== '0s' && (
                            <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>⏱ Repos entre rounds : {meta.rest}</div>
                          )}
                        </div>
                      </div>
                    )
                  }

                  if (block.kind === 'group') {
                    const groupBorderColors = { 'Superset': '#C45C3A', 'Giant Set': '#3A5FD4', 'Drop Set': '#2C64E5' }
                    const gc = groupBorderColors[block.groupType] || '#3A5FD4'
                    return (
                      <div key={block.id} style={{ borderRadius: 14, border: `2px solid ${gc}22`, overflow: 'hidden', background: 'white' }}>
                        <div style={{ background: gc, color: 'white', padding: '8px 12px', fontWeight: 800, letterSpacing: '1.2px', fontSize: 11, textTransform: 'uppercase' }}>
                          ⚡ {block.groupType}
                        </div>
                        <div style={{ padding: 10 }}>
                          {block.exercises.map((exercise) => (
                            <div key={exercise.id}>
                              <ExerciseRow
                                exercise={exercise}
                                selected={selectedExerciseId === exercise.id}
                                latestLog={(logsByExerciseName[exercise.name] || [])[0]}
                                onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)}
                              />
                              {isMobile && selectedExerciseId === exercise.id ? (
                                <div style={{ marginTop: -2, marginBottom: 10 }}>
                                  <ExerciseWorkspace
                                    exercise={exercise}
                                    input={logInputs[exercise.id] || {}}
                                    onInput={(field, value) => onLogInput(exercise.id, field, value)}
                                    onLog={() => logPerformance(exercise)}
                                    logging={!!loggingIds[exercise.id]}
                                    onImageOpen={setImageLightbox}
                                    latestLog={(logsByExerciseName[exercise.name] || [])[0]}
                                    isMobile={isMobile}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  const exercise = block.exercise
                  return (
                    <div key={exercise.id}>
                      <ExerciseRow
                        exercise={exercise}
                        selected={selectedExerciseId === exercise.id}
                        latestLog={(logsByExerciseName[exercise.name] || [])[0]}
                        onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)}
                      />
                      {isMobile && selectedExerciseId === exercise.id ? (
                        <div style={{ marginTop: -2 }}>
                          <ExerciseWorkspace
                            exercise={exercise}
                            input={logInputs[exercise.id] || {}}
                            onInput={(field, value) => onLogInput(exercise.id, field, value)}
                            onLog={() => logPerformance(exercise)}
                            logging={!!loggingIds[exercise.id]}
                            onImageOpen={setImageLightbox}
                            latestLog={(logsByExerciseName[exercise.name] || [])[0]}
                            isMobile={isMobile}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                {!isMobile && selectedExercise ? (
                  <ExerciseWorkspace
                    exercise={selectedExercise}
                    input={logInputs[selectedExercise.id] || {}}
                    onInput={(field, value) => onLogInput(selectedExercise.id, field, value)}
                    onLog={() => logPerformance(selectedExercise)}
                    logging={!!loggingIds[selectedExercise.id]}
                    onImageOpen={setImageLightbox}
                    latestLog={selectedLatestLog}
                    isMobile={isMobile}
                  />
                ) : null}
              </div>
            ) : (
              <EmptyPanel title="Aucune séance ouverte" description="Choisis une séance pour faire apparaître le détail premium." />
            )}
          </SurfaceCard>

          {!isMobile ? (
            <SurfaceCard padded sticky>
              <SectionHead title="Historique mouvement" caption="Repères rapides sur l'exercice sélectionné." />
              {selectedExercise ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedExercise.image_url ? (
                    <button type="button" onClick={() => setImageLightbox(selectedExercise.image_url)} style={{ padding: 0, border: '1px solid #DCE5F3', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
                      <img src={selectedExercise.image_url} alt={selectedExercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                    </button>
                  ) : null}

                  <InfoCard title="Exercice" value={selectedExercise.name} />
                  <InfoCard title="Dernière entrée" value={selectedLatestLog ? `${latestPerfText(selectedLatestLog)} · ${safeDateLabel(getLogDate(selectedLatestLog))}` : 'Aucune donnée pour cet exercice.'} />

                  <div style={{ border: '1px solid #DCE5F3', borderRadius: 14, background: '#FFFFFF', padding: 12 }}>
                    <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 8, fontSize: 12 }}>Historique rapide</div>
                    {selectedLogs.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedLogs.slice(0, 8).map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0D1B4E', fontSize: 12 }}>{latestPerfText(log)}</div>
                              <div style={{ color: '#6B7A99', fontSize: 11 }}>{safeDateLabel(getLogDate(log))}</div>
                            </div>
                            {getLogNote(log) ? <StatusBadge tone="accent">{getLogNote(log)}</StatusBadge> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#6B7A99', fontSize: 12 }}>Pas encore d'historique exploitable.</div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyPanel title="Sélectionne un exercice" description="Le détail historique s'affiche ici automatiquement." />
              )}
            </SurfaceCard>
          ) : null}
        </div>
      ) : (
        <SurfaceCard padded>
          <SectionHead title="Historique complet" caption="Toutes tes performances enregistrées, triées par exercice." />
          {Object.keys(logsByExerciseName).length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(logsByExerciseName).map(([exerciseName, list]) => (
                <div key={exerciseName} style={{ border: '1px solid #DCE5F3', borderRadius: 14, background: '#FFFFFF', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#0D1B4E', fontSize: 13 }}>{exerciseName}</div>
                    <StatusBadge tone="default">{list.length} log(s)</StatusBadge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {list.slice(0, 8).map((log) => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0D1B4E', fontSize: 12 }}>{latestPerfText(log)}</div>
                          <div style={{ color: '#6B7A99', fontSize: 11 }}>{safeDateLabel(getLogDate(log))}</div>
                        </div>
                        {getLogNote(log) ? <StatusBadge tone="accent">{getLogNote(log)}</StatusBadge> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="Aucun log" description="Commence à enregistrer tes performances pour remplir cet historique." />
          )}
        </SurfaceCard>
      )}
    </AppShell>
  )
}

function ExerciseRow({ exercise, selected, latestLog, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? '#EEF4FF' : '#FAFCFF',
        border: selected ? '2px solid #2C64E5' : '1.5px solid #C5D8F5',
        borderRadius: 12,
        padding: 10,
        cursor: 'pointer',
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: 8,
        boxShadow: selected ? '0 0 0 3px rgba(44,100,229,0.08)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) auto', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#E8F0FF', border: '1.5px solid #C5D8F5', flexShrink: 0 }}>
          {exercise.image_url ? (
            <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 20 }}>💪</div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 4 }}>{exercise.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>{exercise.sets} × {exercise.reps}</span>
            <span style={{ fontSize: 11, padding: '2px 7px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 20, border: '1px solid #C5D8F5' }}>⏱ {exercise.rest || '—'}</span>
            {exercise.target_weight ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', background: '#FFF3EE', color: '#C45C3A', borderRadius: 20 }}>🎯 {exercise.target_weight}</span> : null}
          </div>
          {latestLog ? <div style={{ color: '#6B8ED6', marginTop: 4, fontSize: 11, fontWeight: 500 }}>🕐 Dernier log : {latestPerfText(latestLog)}</div> : null}
        </div>

        <div style={{ color: selected ? '#2C64E5' : '#B8CCEF', fontWeight: 800, fontSize: 16 }}>{selected ? '●' : '○'}</div>
      </div>
    </button>
  )
}

function ExerciseWorkspace({ exercise, input, onInput, onLog, logging, onImageOpen, latestLog, isMobile }) {
  return (
    <div style={{ borderRadius: 14, border: '2px solid #2C64E5', background: '#EEF4FF', padding: 14, marginBottom: 10, boxShadow: '0 4px 20px rgba(44,100,229,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: '#0D1B4E' }}>{exercise.name}</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>Ouvert</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(200px, 0.9fr) minmax(0, 1.1fr)', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercise.image_url ? (
            <button type="button" onClick={() => onImageOpen(exercise.image_url)} style={{ padding: 0, border: '1.5px solid #C5D8F5', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
              <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
            </button>
          ) : null}
          <div style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', padding: 12 }}>
            <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 11, letterSpacing: '0.5px' }}>PRESCRIPTION</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>{exercise.sets} × {exercise.reps}</span>
              <span style={{ fontSize: 11, padding: '3px 8px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 20, border: '1px solid #C5D8F5' }}>⏱ {exercise.rest || '—'}</span>
            </div>
            <div style={{ color: '#4A6FB5', lineHeight: 1.5, fontSize: 12 }}>{exercise.note || 'Aucune note particulière.'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', padding: 14 }}>
            <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 10, fontSize: 11, letterSpacing: '0.5px' }}>MON RÉSULTAT</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <Field label="Charge"><input value={input.weight || ''} onChange={(e) => onInput('weight', e.target.value)} placeholder="ex. 60 kg" style={inputStyle()} /></Field>
              <Field label="Reps"><input value={input.reps || ''} onChange={(e) => onInput('reps', e.target.value)} placeholder="ex. 10" style={inputStyle()} /></Field>
              <Field label="RPE"><input value={input.rpe || ''} onChange={(e) => onInput('rpe', e.target.value)} placeholder="ex. 8" style={inputStyle()} /></Field>
            </div>
            <div style={{ marginTop: 8 }}>
              <Field label="Commentaire">
                <textarea value={input.note || ''} onChange={(e) => onInput('note', e.target.value)} placeholder="Ressenti, difficulté, repère utile…" style={{ ...inputStyle(), minHeight: 70, resize: 'vertical' }} />
              </Field>
            </div>
            <button type="button" onClick={onLog} disabled={logging}
              style={{ marginTop: 10, width: '100%', border: 'none', background: logging ? '#7FA3E8' : '#2C64E5', color: 'white', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 800, cursor: logging ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {logging ? 'Enregistrement…' : '✓ Enregistrer'}
            </button>
          </div>
          {latestLog && (
            <div style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', padding: 12 }}>
              <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 4, fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Dernière perf</div>
              <div style={{ color: '#2C64E5', fontWeight: 700, fontSize: 13 }}>{latestPerfText(latestLog)}</div>
              <div style={{ color: '#6B8ED6', fontSize: 11, marginTop: 1 }}>{safeDateLabel(getLogDate(latestLog))}{getLogNote(latestLog) ? ` · ${getLogNote(latestLog)}` : ''}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1.5px solid #B8CCEF',
    background: '#F0F5FF',
    outline: 'none',
    fontSize: 12,
    color: '#0D1B4E',
    fontFamily: "'DM Sans',sans-serif",
  }
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A99', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function MiniKpi({ label, value }) {
  return <div style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: '#EEF4FF', padding: 10 }}><div style={{ fontSize: 9, color: '#6B8ED6', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 4, fontWeight: 700 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 20, color: '#0D1B4E' }}>{value}</div></div>
}

function InfoCard({ title, value }) {
  return <div style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', padding: 12 }}><div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</div><div style={{ color: '#4A6FB5', lineHeight: 1.5, fontSize: 12 }}>{value}</div></div>
}