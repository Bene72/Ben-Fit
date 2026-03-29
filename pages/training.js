import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

const VIEW_TABS = [
  { label: 'Séance', value: 'session' },
  { label: 'Historique', value: 'history' },
]

function formatLogDate(log) {
  const raw = log?.created_at || log?.logged_at || log?.session_date || null
  if (!raw) return '—'
  try {
    return new Date(raw).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function TrainingPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [workouts, setWorkouts] = useState([])
  const [exerciseLogs, setExerciseLogs] = useState([])

  const [openWorkoutId, setOpenWorkoutId] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [view, setView] = useState('session')
  const [savingLog, setSavingLog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [logForm, setLogForm] = useState({
    weight_used: '',
    reps_done: '',
    rpe: '',
    comment: '',
  })

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 980)
    }
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

        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*, exercises(*)')
          .eq('client_id', currentUser.id)
          .order('created_at', { ascending: true })

        if (workoutsError) throw workoutsError

        const normalized = (workoutsData || []).map((w) => ({
          ...w,
          exercises: [...(w.exercises || [])].sort(
            (a, b) => (a.order_index || 0) - (b.order_index || 0)
          ),
        }))

        if (!active) return

        setWorkouts(normalized)

        const firstWorkout = normalized[0]
        if (firstWorkout) {
          setOpenWorkoutId(firstWorkout.id)
          const firstExercise = firstWorkout.exercises?.[0]
          if (firstExercise) setSelectedExerciseId(firstExercise.id)
        }

        const { data: logsData, error: logsError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('client_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(500)

        if (logsError) throw logsError

        if (!active) return
        setExerciseLogs(logsData || [])
      } catch (e) {
        if (!active) return
        setError(e.message || "Impossible de charger l'entraînement")
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()
    return () => {
      active = false
    }
  }, [router])

  const openWorkout = useMemo(
    () => workouts.find((w) => w.id === openWorkoutId) || null,
    [workouts, openWorkoutId]
  )

  const selectedExercise = useMemo(
    () => openWorkout?.exercises?.find((ex) => ex.id === selectedExerciseId) || null,
    [openWorkout, selectedExerciseId]
  )

  const logsForExercise = (exercise) => {
    if (!exercise) return []
    return exerciseLogs.filter(
      (log) =>
        log.exercise_id === exercise.id ||
        (!log.exercise_id && log.exercise_name === exercise.name)
    )
  }

  const logsForSelectedExercise = useMemo(
    () => logsForExercise(selectedExercise),
    [exerciseLogs, selectedExercise]
  )

  const latestLog = logsForSelectedExercise[0] || null

  useEffect(() => {
    setLogForm({
      weight_used: latestLog?.weight_used || '',
      reps_done: latestLog?.reps_done || '',
      rpe: latestLog?.rpe || '',
      comment: '',
    })
  }, [selectedExerciseId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveLog() {
    if (!user || !openWorkout || !selectedExercise) return

    try {
      setSavingLog(true)
      setError('')
      setSuccess('')

      const payload = {
        client_id: user.id,
        workout_id: openWorkout.id,
        exercise_id: selectedExercise.id,
        exercise_name: selectedExercise.name || 'Exercice',
        weight_used: logForm.weight_used || null,
        reps_done: logForm.reps_done || null,
        rpe: logForm.rpe || null,
        comment: logForm.comment || null,
      }

      const { data, error: insertError } = await supabase
        .from('workout_sessions')
        .insert([payload])
        .select()
        .single()

      if (insertError) throw insertError

      setExerciseLogs((prev) => [data, ...prev])
      setSuccess('Performance enregistrée.')
      setLogForm((prev) => ({ ...prev, comment: '' }))
    } catch (e) {
      setError(e.message || 'Impossible d’enregistrer la performance')
    } finally {
      setSavingLog(false)
    }
  }

  function toggleWorkout(workout) {
    if (openWorkoutId === workout.id) {
      setOpenWorkoutId(null)
      setSelectedExerciseId(null)
      return
    }
    setOpenWorkoutId(workout.id)
    setSelectedExerciseId(workout.exercises?.[0]?.id || null)
  }

  function ExerciseDetails({ exercise }) {
    const exerciseLogsList = logsForExercise(exercise)
    const exerciseLatestLog = exerciseLogsList[0] || null

    return (
      <div
        style={{
          marginTop: 12,
          border: '1px solid var(--accent)',
          background: '#f8fbff',
          borderRadius: 18,
          padding: isMobile ? 14 : 18,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
            gap: 16,
          }}
        >
          <div className="ui-stack">
            <div className="ui-card ui-card--soft ui-card--padded">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{exercise.name || 'Exercice'}</div>
              <div className="ui-muted" style={{ lineHeight: 1.6 }}>
                {[
                  exercise.sets && `${exercise.sets} séries`,
                  exercise.reps && `${exercise.reps} reps`,
                  exercise.rest && `${exercise.rest} repos`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Paramètres fournis par le coach'}
              </div>
            </div>

            <div>
              <div className="ui-label">Notes du coach</div>
              <div className="ui-card ui-card--padded">
                <div className="ui-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {exercise.notes || 'Aucune note particulière pour cet exercice.'}
                </div>
              </div>
            </div>

            <div>
              <div className="ui-label">Mes résultats</div>
              <div className="ui-card ui-card--padded">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label className="ui-label">Charge / poids</label>
                    <input
                      className="ui-input"
                      value={logForm.weight_used}
                      onChange={(e) =>
                        setLogForm((prev) => ({ ...prev, weight_used: e.target.value }))
                      }
                      placeholder="ex. 60 kg"
                    />
                  </div>
                  <div>
                    <label className="ui-label">Reps faites</label>
                    <input
                      className="ui-input"
                      value={logForm.reps_done}
                      onChange={(e) =>
                        setLogForm((prev) => ({ ...prev, reps_done: e.target.value }))
                      }
                      placeholder="ex. 10"
                    />
                  </div>
                  <div>
                    <label className="ui-label">RPE</label>
                    <input
                      className="ui-input"
                      value={logForm.rpe}
                      onChange={(e) =>
                        setLogForm((prev) => ({ ...prev, rpe: e.target.value }))
                      }
                      placeholder="ex. 8"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="ui-label">Commentaire</label>
                  <textarea
                    className="ui-textarea"
                    value={logForm.comment}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    placeholder="Ressenti, difficulté, douleur, repère utile…"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div className="ui-muted" style={{ fontSize: 13 }}>
                    Tu peux uniquement enregistrer tes performances, pas modifier le programme.
                  </div>
                  <button
                    type="button"
                    className="ui-button ui-button--primary"
                    onClick={saveLog}
                    disabled={savingLog}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                  >
                    {savingLog ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="ui-stack">
            {exercise.image_url ? (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-muted)',
                }}
              >
                <img
                  src={exercise.image_url}
                  alt={exercise.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <EmptyPanel
                title="Aucune image"
                description="Le coach n’a pas encore ajouté de visuel pour cet exercice."
              />
            )}

            {exerciseLatestLog ? (
              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                <div className="ui-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {exerciseLatestLog.weight_used ? (
                    <span style={{ fontWeight: 700, color: '#0D1B4E' }}>{exerciseLatestLog.weight_used}</span>
                  ) : null}
                  {exerciseLatestLog.reps_done ? <span>{exerciseLatestLog.reps_done} reps</span> : null}
                  {exerciseLatestLog.rpe ? <span>RPE {exerciseLatestLog.rpe}</span> : null}
                  <span style={{ color: '#9AA' }}>{formatLogDate(exerciseLatestLog)}</span>
                </div>
                {exerciseLatestLog.comment ? (
                  <div className="ui-muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
                    {exerciseLatestLog.comment}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                <div className="ui-muted">Aucun log encore enregistré pour cet exercice.</div>
              </div>
            )}

            <div className="ui-card ui-card--padded">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Historique rapide</div>
              {exerciseLogsList.length ? (
                <div className="ui-stack" style={{ gap: 10 }}>
                  {exerciseLogsList.slice(0, 5).map((log) => (
                    <div key={log.id} className="ui-list-item" style={{ padding: '10px 12px' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {log.weight_used || '—'}
                          {log.reps_done ? ` · ${log.reps_done} reps` : ''}
                          {log.rpe ? ` · RPE ${log.rpe}` : ''}
                        </div>
                        <div className="ui-muted" style={{ fontSize: 12 }}>
                          {formatLogDate(log)}
                        </div>
                        {log.comment ? (
                          <div className="ui-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {log.comment}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ui-muted">Pas encore d’historique exploitable.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AppShell title={isMobile ? '' : 'Training'} subtitle="Chargement de ta séance...">
      {isMobile ? (
        <div style={ marginTop: '-6px', marginBottom: 16 }>
          <div style={ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }>
            <img src="/logo-small.png" alt="Ben&Fit" style={ width: 34, height: 34, objectFit: 'contain' } />
            <div>
              <div style={ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: '1.4px', color: '#0D1B4E', lineHeight: 1 }>
                BEN&FIT
              </div>
              <div style={ fontSize: 9, color: '#6B7A99', letterSpacing: '1px', textTransform: 'uppercase' }>
                Only Benefit · since 2021
              </div>
            </div>
          </div>
          <div style={ fontWeight: 900, fontSize: 22, color: '#0D1B4E', marginBottom: 6 }>Training</div>
          <div className='ui-muted' style={ marginBottom: 6 }>Clique sur une séance pour la dérouler, puis ouvre seulement l’exercice que tu veux travailler.</div>
        </div>
      ) : null}
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
      </AppShell>
    )
  }

  if (!workouts.length) {
    return (
      <AppShell title={isMobile ? '' : 'Training'} subtitle="Aucune séance disponible pour le moment.">
        <EmptyPanel
          title="Aucune séance trouvée"
          description="Ton coach n'a pas encore ajouté de séance à ton programme."
        />
      </AppShell>
    )
  }

  return (
    <AppShell title={isMobile ? '' : 'Training'}
      subtitle={isMobile ? '' : 'Clique sur une séance pour la dérouler, puis ouvre seulement l’exercice que tu veux travailler.'}
      actions={<SegmentTabs items={VIEW_TABS} value={view} onChange={setView} />}
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard
            padded
            style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}
          >
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard
            padded
            style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}
          >
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--success)' }}>
              OK
            </strong>
            <div className="ui-muted" style={{ color: 'var(--success)' }}>
              {success}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      <SurfaceCard padded>
        <SectionHead
          title="Mes séances"
          caption="La séance se déplie directement sous son titre. Ensuite tu ouvres seulement l’exercice que tu veux."
        />

        <div className="ui-stack">
          {workouts.map((workout) => {
            const isOpen = openWorkoutId === workout.id
            return (
              <div key={workout.id}>
                <button
                  type="button"
                  className={`ui-list-item ${isOpen ? 'is-active' : ''}`}
                  onClick={() => toggleWorkout(workout)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 900, fontSize: isMobile ? 18 : 22 }}>
                      {workout.name || 'Séance'}
                    </div>
                    <div className="ui-muted" style={{ fontSize: 14, marginTop: 4 }}>
                      {(workout.exercises || []).length} exercice(s)
                    </div>
                  </div>
                  <div className="ui-cluster">
                    {isOpen ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                    <StatusBadge tone="default">{isOpen ? 'Refermer' : 'Ouvrir'}</StatusBadge>
                  </div>
                </button>

                {isOpen ? (
                  <div style={{ marginTop: 14, paddingLeft: isMobile ? 0 : 10, paddingRight: isMobile ? 0 : 10 }}>
                    <SurfaceCard padded style={{ background: '#fbfcff' }}>
                      <div
                        className="ui-toolbar"
                        style={{
                          alignItems: isMobile ? 'flex-start' : 'center',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: 10,
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 22 }}>{workout.name || 'Séance'}</div>
                          <div className="ui-muted" style={{ marginTop: 4 }}>
                            Tous les exercices de la séance. Clique sur un exercice pour afficher son détail.
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 10,
                            width: isMobile ? '100%' : 'auto',
                          }}
                        >
                          <div className="ui-kpi" style={{ padding: 12 }}>
                            <p className="ui-kpi-label">Exos</p>
                            <p className="ui-kpi-value" style={{ fontSize: 20 }}>
                              {workout.exercises?.length || 0}
                            </p>
                          </div>
                          <div className="ui-kpi" style={{ padding: 12 }}>
                            <p className="ui-kpi-label">Logs</p>
                            <p className="ui-kpi-value" style={{ fontSize: 20 }}>
                              {selectedExerciseId && openWorkoutId === workout.id ? logsForSelectedExercise.length : 0}
                            </p>
                          </div>
                          <div className="ui-kpi" style={{ padding: 12 }}>
                            <p className="ui-kpi-label">État</p>
                            <p className="ui-kpi-value" style={{ fontSize: 16 }}>
                              Ouvert
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="ui-stack" style={{ gap: 12 }}>
                        {(workout.exercises || []).map((exercise) => {
                          const exerciseOpen = selectedExerciseId === exercise.id
                          return (
                            <div key={exercise.id}>
                              <button
                                type="button"
                                className={`ui-list-item ${exerciseOpen ? 'is-active' : ''}`}
                                onClick={() =>
                                  setSelectedExerciseId((prev) => (prev === exercise.id ? null : exercise.id))
                                }
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  alignItems: isMobile ? 'flex-start' : 'center',
                                  flexDirection: isMobile ? 'column' : 'row',
                                }}
                              >
                                <div style={{ width: '100%' }}>
                                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                                    {exercise.name || 'Exercice'}
                                  </div>
                                  <div className="ui-muted" style={{ fontSize: 14, marginTop: 4 }}>
                                    {[
                                      exercise.sets && `${exercise.sets} séries`,
                                      exercise.reps && `${exercise.reps} reps`,
                                      exercise.rest && `${exercise.rest} repos`,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ') || 'Paramètres à compléter'}
                                  </div>
                                </div>
                                {exerciseOpen ? (
                                  <StatusBadge tone="accent">Ouvert</StatusBadge>
                                ) : (
                                  <StatusBadge tone="default">Détail</StatusBadge>
                                )}
                              </button>

                              {exerciseOpen ? <ExerciseDetails exercise={exercise} /> : null}
                            </div>
                          )
                        })}
                      </div>
                    </SurfaceCard>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </SurfaceCard>
    </AppShell>
  )
}
