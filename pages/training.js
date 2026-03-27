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

  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)
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
      setIsMobile(window.innerWidth < 1100)
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
          setSelectedWorkoutId(firstWorkout.id)
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

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId) || null,
    [workouts, selectedWorkoutId]
  )

  const selectedExercise = useMemo(
    () => selectedWorkout?.exercises?.find((ex) => ex.id === selectedExerciseId) || null,
    [selectedWorkout, selectedExerciseId]
  )

  const groupedBlocks = useMemo(() => {
    if (!selectedWorkout?.exercises) return []

    const groups = new Map()

    selectedWorkout.exercises.forEach((ex) => {
      const block = ex.block_label || ex.block_type || 'Bloc'
      if (!groups.has(block)) groups.set(block, [])
      groups.get(block).push(ex)
    })

    return Array.from(groups.entries()).map(([label, exercises]) => ({
      label,
      exercises,
    }))
  }, [selectedWorkout])

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
    if (!user || !selectedWorkout || !selectedExercise) return

    try {
      setSavingLog(true)
      setError('')
      setSuccess('')

      const payload = {
        client_id: user.id,
        workout_id: selectedWorkout.id,
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

  function ExerciseInlineDetails({ exercise }) {
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
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
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
      <AppShell title="Training" subtitle="Chargement de ta séance...">
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
      </AppShell>
    )
  }

  if (!workouts.length) {
    return (
      <AppShell title="Training" subtitle="Aucune séance disponible pour le moment.">
        <EmptyPanel
          title="Aucune séance trouvée"
          description="Ton coach n'a pas encore ajouté de séance à ton programme."
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Training"
      subtitle="Une vue claire pour suivre la séance, comprendre l’exercice et enregistrer tes performances."
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '300px minmax(0, 1fr)',
          gap: 20,
        }}
      >
        <div className="ui-stack">
          <SurfaceCard padded sticky={!isMobile}>
            <SectionHead
              title="Séances"
              caption="Choisis la séance et navigue bloc par bloc."
            />
            <div className="ui-list">
              {workouts.map((w) => {
                const active = w.id === selectedWorkoutId
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`ui-list-item ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedWorkoutId(w.id)
                      setSelectedExerciseId(w.exercises?.[0]?.id || null)
                    }}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{w.name || 'Séance'}</div>
                      <div className="ui-muted" style={{ fontSize: 13 }}>
                        {(w.exercises || []).length} exercice(s)
                      </div>
                    </div>
                    {active ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                  </button>
                )
              })}
            </div>
          </SurfaceCard>

          {!isMobile ? (
            <SurfaceCard padded>
              <SectionHead title="Aperçu rapide" caption="Résumé de la séance sélectionnée." />
              <div className="ui-kpi-row">
                <div className="ui-kpi">
                  <p className="ui-kpi-label">Exercices</p>
                  <p className="ui-kpi-value">{selectedWorkout?.exercises?.length || 0}</p>
                </div>
                <div className="ui-kpi">
                  <p className="ui-kpi-label">Blocs</p>
                  <p className="ui-kpi-value">{groupedBlocks.length}</p>
                </div>
                <div className="ui-kpi">
                  <p className="ui-kpi-label">Logs</p>
                  <p className="ui-kpi-value">{logsForSelectedExercise.length}</p>
                </div>
              </div>
            </SurfaceCard>
          ) : null}
        </div>

        <div className="ui-stack">
          <SurfaceCard padded>
            <SectionHead
              title={selectedWorkout?.name || 'Séance'}
              caption="Clique sur un exercice pour ouvrir ses détails juste en dessous."
              action={<StatusBadge tone="default">{selectedWorkout?.day_label || 'Programme'}</StatusBadge>}
            />

            {isMobile ? (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                  }}
                >
                  <div className="ui-kpi" style={{ padding: 12 }}>
                    <p className="ui-kpi-label">Exos</p>
                    <p className="ui-kpi-value" style={{ fontSize: 20 }}>{selectedWorkout?.exercises?.length || 0}</p>
                  </div>
                  <div className="ui-kpi" style={{ padding: 12 }}>
                    <p className="ui-kpi-label">Blocs</p>
                    <p className="ui-kpi-value" style={{ fontSize: 20 }}>{groupedBlocks.length}</p>
                  </div>
                  <div className="ui-kpi" style={{ padding: 12 }}>
                    <p className="ui-kpi-label">Logs</p>
                    <p className="ui-kpi-value" style={{ fontSize: 20 }}>{logsForSelectedExercise.length}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {groupedBlocks.length ? (
              <div className="ui-stack">
                {groupedBlocks.map((block) => (
                  <div key={block.label}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{block.label}</div>
                      <StatusBadge tone="default">{block.exercises.length} exo</StatusBadge>
                    </div>

                    <div className="ui-stack" style={{ gap: 12 }}>
                      {block.exercises.map((ex) => {
                        const active = ex.id === selectedExerciseId
                        return (
                          <div key={ex.id}>
                            <button
                              type="button"
                              className={`ui-list-item ${active ? 'is-active' : ''}`}
                              onClick={() => setSelectedExerciseId(ex.id)}
                              style={{
                                textAlign: 'left',
                                cursor: 'pointer',
                                width: '100%',
                                alignItems: isMobile ? 'flex-start' : 'center',
                                flexDirection: isMobile ? 'column' : 'row',
                              }}
                            >
                              <div style={{ width: '100%' }}>
                                <div style={{ fontWeight: 800 }}>{ex.name || 'Exercice'}</div>
                                <div className="ui-muted" style={{ fontSize: 13, marginTop: 4 }}>
                                  {[
                                    ex.sets && `${ex.sets} séries`,
                                    ex.reps && `${ex.reps} reps`,
                                    ex.rest && `${ex.rest} repos`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Paramètres à compléter'}
                                </div>
                              </div>
                              {active ? <StatusBadge tone="accent">Ouvert</StatusBadge> : null}
                            </button>

                            {active ? <ExerciseInlineDetails exercise={ex} /> : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="Séance vide"
                description="Ton coach n'a pas encore structuré cette séance."
              />
            )}
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}
