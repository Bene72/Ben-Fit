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
  const match = cleanNote.match(/(?:^|·)\s*RPE\s*([0-9]+(?:[.,][0-9]+)?)/i)
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
        .select('*')
        .eq('client_id', currentUserId)
        .order('logged_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data || []
    },
    async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
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
  throw lastError || new Error('Impossible d’enregistrer la performance')
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
      setError(e.message || 'Impossible d’enregistrer la performance')
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
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#F3C4C4', background: '#FEF2F2' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#B42318' }}>Erreur</strong>
            <div style={{ color: '#B42318' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#C9E9D5', background: '#F0FBF4' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#16804A' }}>OK</strong>
            <div style={{ color: '#16804A' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {imageLightbox ? (
        <div onClick={() => setImageLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <img src={imageLightbox} alt="Exercice" style={{ maxWidth: 'min(1000px, 100%)', maxHeight: '88vh', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }} />
        </div>
      ) : null}

      {activeTab === 'session' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px, 0.92fr) minmax(420px, 1.4fr) minmax(260px, 0.92fr)', gap: 18, alignItems: 'start' }}>
          <SurfaceCard padded sticky={!isMobile}>
            <SectionHead title="Séances" caption="Choisis la séance active puis navigue exercice par exercice." />
            {workouts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {workouts.map((workout) => {
                  const active = workout.id === openWorkout
                  return (
                    <button key={workout.id} type="button" onClick={() => openSession(workout.id)} style={{ width: '100%', textAlign: 'left', borderRadius: 16, border: active ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: active ? '#F5F8FF' : '#FFFFFF', padding: '16px 18px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 18, color: '#0D1B4E', marginBottom: 4 }}>{workout.name}</div>
                          <div style={{ color: '#6B7A99', fontSize: 14 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exercice(s)</div>
                        </div>
                        {active ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : <EmptyPanel title="Aucune séance" description="Ton coach n’a pas encore chargé de séance active." />}

            <div style={{ marginTop: 18 }}>
              <SectionHead title="Vue rapide" caption="Résumé de la séance sélectionnée." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <MiniKpi label="Exos" value={currentWorkout?.exercises?.length || 0} />
                <MiniKpi label="Blocs" value={currentWorkout ? buildExerciseGroups(currentWorkout.exercises).length : 0} />
                <MiniKpi label="Logs" value={currentWorkout ? workoutLogCount(currentWorkout, logsByExerciseName) : 0} />
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead
              title={currentWorkout?.name || 'Programme'}
              caption={isMobile ? "Appuie sur un exercice : son détail s’ouvre directement juste en dessous." : "Sélectionne un exercice depuis la liste. Le détail s’affiche dans l’espace de travail juste en dessous."}
              action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null}
            />

            {currentWorkout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {exerciseBlocks.map((block) => {
                  if (block.kind === 'group') {
                    return (
                      <div key={block.id} style={{ borderRadius: 18, border: '2px solid rgba(143,160,122,0.82)', overflow: 'hidden', background: 'white' }}>
                        <div style={{ background: 'rgba(143,160,122,0.96)', color: 'white', padding: '10px 14px', fontWeight: 800, letterSpacing: '1.2px', fontSize: 13, textTransform: 'uppercase' }}>
                          {block.groupType}
                        </div>
                        <div style={{ padding: 12 }}>
                          {block.exercises.map((exercise) => (
                            <div key={exercise.id}>
                              <ExerciseRow
                                exercise={exercise}
                                selected={selectedExerciseId === exercise.id}
                                latestLog={(logsByExerciseName[exercise.name] || [])[0]}
                                onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)}
                              />
                              {isMobile && selectedExerciseId === exercise.id ? (
                                <div style={{ marginTop: -2, marginBottom: 12 }}>
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
              <SectionHead title="Historique mouvement" caption="Repères rapides sur l’exercice sélectionné." />
              {selectedExercise ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedExercise.image_url ? (
                    <button type="button" onClick={() => setImageLightbox(selectedExercise.image_url)} style={{ padding: 0, border: '1px solid #DCE5F3', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
                      <img src={selectedExercise.image_url} alt={selectedExercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                    </button>
                  ) : null}

                  <InfoCard title="Exercice" value={selectedExercise.name} />
                  <InfoCard title="Dernière entrée" value={selectedLatestLog ? `${latestPerfText(selectedLatestLog)} · ${safeDateLabel(getLogDate(selectedLatestLog))}` : 'Aucune donnée pour cet exercice.'} />

                  <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}>
                    <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 10 }}>Historique rapide</div>
                    {selectedLogs.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedLogs.slice(0, 8).map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0D1B4E', fontSize: 14 }}>{latestPerfText(log)}</div>
                              <div style={{ color: '#6B7A99', fontSize: 12 }}>{safeDateLabel(getLogDate(log))}</div>
                            </div>
                            {getLogNote(log) ? <StatusBadge tone="accent">{getLogNote(log)}</StatusBadge> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#6B7A99', fontSize: 14 }}>Pas encore d’historique exploitable.</div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyPanel title="Sélectionne un exercice" description="Le détail historique s’affiche ici automatiquement." />
              )}
            </SurfaceCard>
          ) : null}
        </div>
      ) : (
        <SurfaceCard padded>
          <SectionHead title="Historique complet" caption="Toutes tes performances enregistrées, triées par exercice." />
          {Object.keys(logsByExerciseName).length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(logsByExerciseName).map(([exerciseName, list]) => (
                <div key={exerciseName} style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#0D1B4E' }}>{exerciseName}</div>
                    <StatusBadge tone="default">{list.length} log(s)</StatusBadge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {list.slice(0, 8).map((log) => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0D1B4E', fontSize: 14 }}>{latestPerfText(log)}</div>
                          <div style={{ color: '#6B7A99', fontSize: 12 }}>{safeDateLabel(getLogDate(log))}</div>
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
        background: selected ? '#F5F8FF' : '#FFFFFF',
        border: selected ? '1.5px solid #2C64E5' : '1px solid #DCE5F3',
        borderRadius: 18,
        padding: 16,
        cursor: 'pointer',
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) auto', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: 14, overflow: 'hidden', background: '#F4F7FC', border: '1px solid #DCE5F3' }}>
          {exercise.image_url ? (
            <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 28 }}>🏋️</div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#0D1B4E', marginBottom: 8 }}>{exercise.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <StatusBadge tone="default">{exercise.sets} × {exercise.reps}</StatusBadge>
            <StatusBadge tone="default">⏱ {exercise.rest || '—'}</StatusBadge>
            {exercise.target_weight ? <StatusBadge tone="warning">🎯 {exercise.target_weight}</StatusBadge> : null}
          </div>
          {latestLog ? <div style={{ color: '#6B7A99', marginTop: 10, fontSize: 13 }}>Dernier log : {latestPerfText(latestLog)}</div> : null}
        </div>

        <div style={{ color: selected ? '#2C64E5' : '#9AA8C2', fontWeight: 800, fontSize: 18 }}>{selected ? '●' : '○'}</div>
      </div>
    </button>
  )
}

function ExerciseWorkspace({ exercise, input, onInput, onLog, logging, onImageOpen, latestLog, isMobile }) {
  return (
    <div style={{ borderRadius: 20, border: '1px solid #DCE5F3', background: '#F8FBFF', padding: 18, marginBottom: 12 }}>
      <SectionHead title={exercise.name} caption="Zone d’exécution : détail exercice, note coach, saisie charge / reps et commentaire." action={<StatusBadge tone="accent">Ouvert</StatusBadge>} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 0.95fr) minmax(0, 1.05fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {exercise.image_url ? (
            <button type="button" onClick={() => onImageOpen(exercise.image_url)} style={{ padding: 0, border: '1px solid #DCE5F3', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
              <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
            </button>
          ) : null}
          <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}>
            <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 8 }}>Prescription</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <StatusBadge tone="default">{exercise.sets} × {exercise.reps}</StatusBadge>
              <StatusBadge tone="default">⏱ {exercise.rest || '—'}</StatusBadge>
            </div>
            <div style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: 14 }}>{exercise.note || 'Aucune note particulière pour cet exercice.'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}>
            <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 10 }}>Entrer mon résultat</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <Field label="Charge / poids"><input value={input.weight || ''} onChange={(e) => onInput('weight', e.target.value)} placeholder="ex. 60 kg" style={inputStyle()} /></Field>
              <Field label="Reps faites"><input value={input.reps || ''} onChange={(e) => onInput('reps', e.target.value)} placeholder="ex. 10" style={inputStyle()} /></Field>
              <Field label="RPE"><input value={input.rpe || ''} onChange={(e) => onInput('rpe', e.target.value)} placeholder="ex. 8" style={inputStyle()} /></Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#6B7A99', marginBottom: 6 }}>Commentaire</div>
              <textarea value={input.note || ''} onChange={(e) => onInput('note', e.target.value)} placeholder="Ressenti, difficulté, douleur, repère utile…" style={{ ...inputStyle(), minHeight: 116, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ color: '#6B7A99', fontSize: 13, lineHeight: 1.6 }}>Tu peux logger librement charge, reps et ressenti pour garder une vraie trace exploitable.</div>
              <button type="button" onClick={onLog} disabled={logging} style={{ border: 'none', background: '#2C64E5', color: 'white', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto' }}>
                {logging ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <InfoCard title="Dernière performance" value={latestLog ? `${latestPerfText(latestLog)} · ${safeDateLabel(getLogDate(latestLog))}${getLogNote(latestLog) ? ` · ${getLogNote(latestLog)}` : ''}` : 'Aucun log encore enregistré pour cet exercice.'} />
        </div>
      </div>
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #DCE5F3',
    background: '#F9FBFF',
    outline: 'none',
    fontSize: 14,
    color: '#0D1B4E',
    fontFamily: "'DM Sans',sans-serif",
  }
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#6B7A99', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function MiniKpi({ label, value }) {
  return <div style={{ border: '1px solid #DCE5F3', borderRadius: 16, background: '#FFFFFF', padding: 12 }}><div style={{ fontSize: 11, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 6 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 28, color: '#0D1B4E' }}>{value}</div></div>
}

function InfoCard({ title, value }) {
  return <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}><div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 8 }}>{title}</div><div style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: 14 }}>{value}</div></div>
}
