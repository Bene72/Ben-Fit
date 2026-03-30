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
      items.push({
        kind: 'group',
        id: ex.group_id,
        groupType: ex.group_type,
        exercises: groupItems,
      })
    } else {
      rendered.add(ex.id)
      items.push({
        kind: 'single',
        id: ex.id,
        exercise: ex,
      })
    }
  })

  return items
}

function sumLogsForSession(workout, logsByExerciseName) {
  return (workout?.exercises || []).reduce((sum, ex) => sum + ((logsByExerciseName[ex.name] || []).length ? 1 : 0), 0)
}

export default function TrainingPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [activeTab, setActiveTab] = useState('session')
  const [workouts, setWorkouts] = useState([])
  const [logsByExerciseName, setLogsByExerciseName] = useState({})
  const [openWorkout, setOpenWorkout] = useState(null)
  const [openExercise, setOpenExercise] = useState(null)
  const [logInputs, setLogInputs] = useState({})
  const [loggingIds, setLoggingIds] = useState({})
  const [imageLightbox, setImageLightbox] = useState(null)

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

        const [{ data: workoutData, error: workoutError }, { data: logsData, error: logsError }] =
          await Promise.all([
            supabase
              .from('workouts')
              .select('*, exercises(*)')
              .eq('client_id', currentUser.id)
              .eq('is_archived', false)
              .order('day_of_week', { ascending: true }),
            supabase
              .from('workout_logs')
              .select('*')
              .eq('client_id', currentUser.id)
              .order('logged_at', { ascending: false })
              .limit(300),
          ])

        if (workoutError) throw workoutError
        if (logsError) throw logsError

        if (!active) return

        const mappedWorkouts = (workoutData || []).map((workout) => ({
          ...workout,
          exercises: normalizeExercises(workout.exercises || []),
        }))

        const groupedLogs = {}
        ;(logsData || []).forEach((log) => {
          const key = log.exercise_name || 'Sans nom'
          if (!groupedLogs[key]) groupedLogs[key] = []
          groupedLogs[key].push(log)
        })

        setWorkouts(mappedWorkouts)
        setLogsByExerciseName(groupedLogs)

        if (mappedWorkouts.length) {
          setOpenWorkout(mappedWorkouts[0].id)
        }
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger la séance')
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()

    return () => {
      active = false
    }
  }, [router])

  const currentWorkout = useMemo(
    () => workouts.find((workout) => workout.id === openWorkout) || null,
    [workouts, openWorkout]
  )

  function toggleWorkout(id) {
    setOpenWorkout((prev) => {
      const next = prev === id ? null : id
      if (prev !== id) setOpenExercise(null)
      return next
    })
  }

  function toggleExercise(id) {
    setOpenExercise((prev) => (prev === id ? null : id))
  }

  function onLogInput(exerciseId, field, value) {
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || {}),
        [field]: value,
      },
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
        note: noteParts.length ? noteParts.join(' · ') : null,
        logged_at: new Date().toISOString(),
      }

      const { data, error: insertError } = await supabase
        .from('workout_logs')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw insertError

      setLogsByExerciseName((prev) => ({
        ...prev,
        [exercise.name]: [data, ...(prev[exercise.name] || [])],
      }))
      setLogInputs((prev) => ({ ...prev, [exercise.id]: {} }))
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
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Training"
      subtitle="Clique sur une séance pour la dérouler, puis ouvre seulement l’exercice que tu veux travailler."
      actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--success)' }}>OK</strong>
            <div className="ui-muted" style={{ color: 'var(--success)' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {imageLightbox ? (
        <div
          onClick={() => setImageLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <img
            src={imageLightbox}
            alt="Exercice"
            style={{
              maxWidth: 'min(920px, 100%)',
              maxHeight: '88vh',
              borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            }}
          />
        </div>
      ) : null}

      <div className="ui-grid-3">
        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Mes séances" caption="La séance se déplie directement sous son titre. Ensuite tu ouvres seulement l’exercice que tu veux." />
            {workouts.length ? (
              <div className="ui-stack">
                {workouts.map((workout) => {
                  const active = workout.id === openWorkout
                  return (
                    <button
                      key={workout.id}
                      type="button"
                      onClick={() => toggleWorkout(workout.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 16,
                        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: active ? 'var(--surface-muted)' : 'white',
                        padding: '16px 18px',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      <div className="ui-toolbar">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-strong)', marginBottom: 4 }}>
                            {workout.name}
                          </div>
                          <div className="ui-muted">
                            {(workout.exercises || []).length} exercice(s)
                          </div>
                        </div>
                        {active ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyPanel title="Aucune séance" description="Ton coach n’a pas encore chargé de séance active." />
            )}
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead title="Aperçu rapide" caption="Résumé de la séance sélectionnée." />
            <div className="ui-kpi-row">
              <div className="ui-kpi">
                <p className="ui-kpi-label">Exercices</p>
                <p className="ui-kpi-value">{currentWorkout?.exercises?.length || 0}</p>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Blocs</p>
                <p className="ui-kpi-value">{currentWorkout ? buildExerciseGroups(currentWorkout.exercises).length : 0}</p>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Logs</p>
                <p className="ui-kpi-value">{currentWorkout ? sumLogsForSession(currentWorkout, logsByExerciseName) : 0}</p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="ui-stack">
          {activeTab === 'session' ? (
            <SurfaceCard padded>
              <SectionHead
                title={currentWorkout?.name || 'Programme'}
                caption="Clique sur un exercice pour ouvrir ses détails juste en dessous."
                action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null}
              />

              {currentWorkout ? (
                <div className="ui-stack">
                  {buildExerciseGroups(currentWorkout.exercises).map((item) => {
                    if (item.kind === 'group') {
                      return (
                        <div
                          key={item.id}
                          style={{
                            borderRadius: 18,
                            border: '2px solid rgba(143,160,122,0.9)',
                            overflow: 'hidden',
                            background: 'white',
                          }}
                        >
                          <div
                            style={{
                              background: 'rgba(143,160,122,0.96)',
                              color: 'white',
                              padding: '10px 14px',
                              fontWeight: 800,
                              letterSpacing: '1.2px',
                              fontSize: 13,
                              textTransform: 'uppercase',
                            }}
                          >
                            {item.groupType}
                          </div>

                          <div style={{ padding: 12 }}>
                            {item.exercises.map((exercise) => (
                              <ExercisePanel
                                key={exercise.id}
                                exercise={exercise}
                                isOpen={openExercise === exercise.id}
                                onToggle={() => toggleExercise(exercise.id)}
                                logs={logsByExerciseName[exercise.name] || []}
                                input={logInputs[exercise.id] || {}}
                                onInput={(field, value) => onLogInput(exercise.id, field, value)}
                                onLog={() => logPerformance(exercise)}
                                logging={!!loggingIds[exercise.id]}
                                onImageOpen={setImageLightbox}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <ExercisePanel
                        key={item.exercise.id}
                        exercise={item.exercise}
                        isOpen={openExercise === item.exercise.id}
                        onToggle={() => toggleExercise(item.exercise.id)}
                        logs={logsByExerciseName[item.exercise.name] || []}
                        input={logInputs[item.exercise.id] || {}}
                        onInput={(field, value) => onLogInput(item.exercise.id, field, value)}
                        onLog={() => logPerformance(item.exercise)}
                        logging={!!loggingIds[item.exercise.id]}
                        onImageOpen={setImageLightbox}
                      />
                    )
                  })}
                </div>
              ) : (
                <EmptyPanel title="Aucune séance ouverte" description="Choisis une séance dans la colonne de gauche." />
              )}
            </SurfaceCard>
          ) : (
            <SurfaceCard padded>
              <SectionHead title="Historique rapide" caption="Toutes tes charges / reps déjà enregistrées." />
              {Object.keys(logsByExerciseName).length ? (
                <div className="ui-stack">
                  {Object.entries(logsByExerciseName).map(([exerciseName, list]) => (
                    <div key={exerciseName} className="ui-card ui-card--padded">
                      <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 800 }}>{exerciseName}</div>
                        <StatusBadge tone="default">{list.length} log(s)</StatusBadge>
                      </div>
                      <div className="ui-stack">
                        {list.slice(0, 6).map((log) => (
                          <div key={log.id} className="ui-list-item">
                            <div>
                              <div style={{ fontWeight: 700 }}>
                                {log.weight_used || '—'} {log.reps_done ? `· ${log.reps_done} reps` : ''}
                              </div>
                              <div className="ui-muted">{safeDateLabel(log.logged_at)}</div>
                            </div>
                            {log.note ? <StatusBadge tone="accent">{log.note}</StatusBadge> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel title="Aucun log" description="Commence à enregistrer tes charges pour construire ton historique." />
              )}
            </SurfaceCard>
          )}
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Contexte" caption="Tout ce qu’il faut pour exécuter l’exercice proprement." />

            {openExercise && currentWorkout ? (() => {
              const ex = (currentWorkout.exercises || []).find((item) => item.id === openExercise)
              const logs = ex ? (logsByExerciseName[ex.name] || []) : []
              const latest = logs[0]
              if (!ex) return <EmptyPanel title="Aucun exercice" description="Ouvre un exercice pour voir les détails ici aussi." />

              return (
                <div className="ui-stack">
                  {ex.image_url ? (
                    <button
                      type="button"
                      onClick={() => setImageLightbox(ex.image_url)}
                      style={{
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 18,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'white',
                      }}
                    >
                      <img src={ex.image_url} alt={ex.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                    </button>
                  ) : null}

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Exercice sélectionné</div>
                    <div className="ui-muted" style={{ lineHeight: 1.7 }}>
                      {ex.name}
                    </div>
                  </div>

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                    {latest ? (
                      <div className="ui-muted" style={{ lineHeight: 1.7 }}>
                        {latest.weight_used || '—'} {latest.reps_done ? `· ${latest.reps_done} reps` : ''} · {safeDateLabel(latest.logged_at)}
                      </div>
                    ) : (
                      <div className="ui-muted">Aucun log encore enregistré pour cet exercice.</div>
                    )}
                  </div>

                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Historique rapide</div>
                    {logs.length ? (
                      <div className="ui-stack">
                        {logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="ui-list-item">
                            <div className="ui-muted">
                              {log.weight_used || '—'} {log.reps_done ? `· ${log.reps_done} reps` : ''}
                            </div>
                            <StatusBadge tone="default">{safeDateLabel(log.logged_at)}</StatusBadge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ui-muted">Pas encore d’historique exploitable.</div>
                    )}
                  </div>
                </div>
              )
            })() : (
              <EmptyPanel title="Sélectionne un exercice" description="Le contexte, les images et l’historique apparaissent ici." />
            )}
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}

function ExercisePanel({ exercise, isOpen, onToggle, logs, input, onInput, onLog, logging, onImageOpen }) {
  const latest = logs[0]

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          background: isOpen ? 'var(--surface-muted)' : 'white',
          border: isOpen ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 18,
          padding: 16,
          cursor: 'pointer',
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) auto', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 14,
              overflow: 'hidden',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {exercise.image_url ? (
              <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 28 }}>🏋️</div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-strong)', marginBottom: 8 }}>
              {exercise.name}
            </div>
            <div className="ui-cluster">
              <StatusBadge tone="default">{exercise.sets} × {exercise.reps}</StatusBadge>
              <StatusBadge tone="default">⏱ {exercise.rest || '—'}</StatusBadge>
              {exercise.target_weight ? <StatusBadge tone="accent">🎯 {exercise.target_weight}</StatusBadge> : null}
            </div>
            {exercise.note ? (
              <div className="ui-muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
                {exercise.note}
              </div>
            ) : null}
          </div>

          <div className="ui-muted" style={{ fontWeight: 700 }}>
            {isOpen ? '▲' : '▼'}
          </div>
        </div>
      </button>

      {isOpen ? (
        <div
          style={{
            marginTop: 8,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            padding: 16,
          }}
        >
          <div className="ui-grid-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
            <div className="ui-stack">
              {exercise.image_url ? (
                <button
                  type="button"
                  onClick={() => onImageOpen(exercise.image_url)}
                  style={{
                    padding: 0,
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'white',
                  }}
                >
                  <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                </button>
              ) : null}

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Notes du coach</div>
                <div className="ui-muted" style={{ lineHeight: 1.7 }}>
                  {exercise.note || 'Aucune note particulière pour cet exercice.'}
                </div>
              </div>
            </div>

            <div className="ui-stack">
              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Mes résultats</div>
                <div className="ui-grid-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <div>
                    <label className="ui-label">Charge / poids</label>
                    <input className="ui-input" value={input.weight || ''} onChange={(e) => onInput('weight', e.target.value)} placeholder="ex. 60 kg" />
                  </div>
                  <div>
                    <label className="ui-label">Reps faites</label>
                    <input className="ui-input" value={input.reps || ''} onChange={(e) => onInput('reps', e.target.value)} placeholder="ex. 10" />
                  </div>
                  <div>
                    <label className="ui-label">RPE</label>
                    <input className="ui-input" value={input.rpe || ''} onChange={(e) => onInput('rpe', e.target.value)} placeholder="ex. 8" />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="ui-label">Commentaire</label>
                  <textarea
                    className="ui-textarea"
                    value={input.note || ''}
                    onChange={(e) => onInput('note', e.target.value)}
                    placeholder="Ressenti, difficulté, douleur, repère utile…"
                  />
                </div>

                <div className="ui-toolbar" style={{ marginTop: 12 }}>
                  <div className="ui-muted">
                    Tu peux uniquement enregistrer tes performances, pas modifier le programme.
                  </div>
                  <button type="button" className="ui-button ui-button--primary" onClick={onLog} disabled={logging}>
                    {logging ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                {latest ? (
                  <div className="ui-muted" style={{ lineHeight: 1.7 }}>
                    {latest.weight_used || '—'} {latest.reps_done ? `· ${latest.reps_done} reps` : ''} · {safeDateLabel(latest.logged_at)}
                    {latest.note ? ` · ${latest.note}` : ''}
                  </div>
                ) : (
                  <div className="ui-muted">Aucun log encore enregistré pour cet exercice.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
