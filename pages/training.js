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

export default function TrainingPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workouts, setWorkouts] = useState([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [view, setView] = useState('session')
  const [exerciseLogs, setExerciseLogs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function boot() {
      try {
        setLoading(true)
        setError('')

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
          exercises: [...(w.exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
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
          .order('logged_at', { ascending: false })
          .limit(500)

        if (logsError) throw logsError
        if (!active) return
        setExerciseLogs(logsData || [])
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger l’entraînement')
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

  const logsForSelectedExercise = useMemo(() => {
    if (!selectedExercise) return []
    return exerciseLogs.filter(
      (log) =>
        log.exercise_id === selectedExercise.id ||
        (!log.exercise_id && log.exercise_name === selectedExercise.name)
    )
  }, [exerciseLogs, selectedExercise])

  const latestLog = logsForSelectedExercise[0] || null

  async function updateExerciseField(field, value) {
    if (!selectedExercise) return

    const previous = workouts
    const updatedWorkouts = workouts.map((w) => {
      if (w.id !== selectedWorkout.id) return w
      return {
        ...w,
        exercises: (w.exercises || []).map((ex) =>
          ex.id === selectedExercise.id ? { ...ex, [field]: value } : ex
        ),
      }
    })

    setWorkouts(updatedWorkouts)

    try {
      setSaving(true)
      setError('')
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ [field]: value })
        .eq('id', selectedExercise.id)

      if (updateError) throw updateError
    } catch (e) {
      setWorkouts(previous)
      setError(e.message || "Impossible de mettre à jour l'exercice")
    } finally {
      setSaving(false)
    }
  }

  async function duplicateExercise() {
    if (!selectedExercise || !selectedWorkout) return

    try {
      setSaving(true)
      setError('')

      const payload = {
        ...selectedExercise,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        name: `${selectedExercise.name} (copie)`,
        workout_id: selectedWorkout.id,
        order_index: (selectedWorkout.exercises?.length || 0) + 1,
      }

      const { data, error: insertError } = await supabase
        .from('exercises')
        .insert([payload])
        .select()
        .single()

      if (insertError) throw insertError

      const next = workouts.map((w) =>
        w.id === selectedWorkout.id
          ? { ...w, exercises: [...(w.exercises || []), data] }
          : w
      )

      setWorkouts(next)
      setSelectedExerciseId(data.id)
    } catch (e) {
      setError(e.message || "Impossible de dupliquer l'exercice")
    } finally {
      setSaving(false)
    }
  }

  async function addExercise() {
    if (!selectedWorkout) return

    try {
      setSaving(true)
      setError('')

      const payload = {
        workout_id: selectedWorkout.id,
        name: 'Nouvel exercice',
        sets: '',
        reps: '',
        rest: '',
        notes: '',
        image_url: '',
        order_index: (selectedWorkout.exercises?.length || 0) + 1,
        block_label: 'Nouveau bloc',
      }

      const { data, error: insertError } = await supabase
        .from('exercises')
        .insert([payload])
        .select()
        .single()

      if (insertError) throw insertError

      const next = workouts.map((w) =>
        w.id === selectedWorkout.id
          ? { ...w, exercises: [...(w.exercises || []), data] }
          : w
      )

      setWorkouts(next)
      setSelectedExerciseId(data.id)
    } catch (e) {
      setError(e.message || "Impossible d'ajouter l'exercice")
    } finally {
      setSaving(false)
    }
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
      subtitle="Une vue plus claire, plus propre, plus utile pour exécuter et suivre ta séance."
      actions={
        <>
          <SegmentTabs items={VIEW_TABS} value={view} onChange={setView} />
          <button type="button" className="ui-button ui-button--primary" onClick={addExercise} disabled={saving}>
            + Ajouter un exercice
          </button>
        </>
      }
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div className="ui-grid-3">
        <div className="ui-stack">
          <SurfaceCard padded sticky>
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
        </div>

        <div className="ui-stack">
          <SurfaceCard padded>
            <SectionHead
              title={selectedWorkout?.name || 'Séance'}
              caption="Structure de la séance et édition rapide."
              action={<StatusBadge tone="default">{selectedWorkout?.day_label || 'Programme'}</StatusBadge>}
            />

            {groupedBlocks.length ? (
              <div className="ui-stack">
                {groupedBlocks.map((block) => (
                  <div key={block.label}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800 }}>{block.label}</div>
                      <StatusBadge tone="default">{block.exercises.length} exo</StatusBadge>
                    </div>

                    <div className="ui-list">
                      {block.exercises.map((ex) => {
                        const active = ex.id === selectedExerciseId
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            className={`ui-list-item ${active ? 'is-active' : ''}`}
                            onClick={() => setSelectedExerciseId(ex.id)}
                            style={{ textAlign: 'left', cursor: 'pointer' }}
                          >
                            <div>
                              <div style={{ fontWeight: 800 }}>{ex.name || 'Exercice'}</div>
                              <div className="ui-muted" style={{ fontSize: 13 }}>
                                {[ex.sets && `${ex.sets} séries`, ex.reps && `${ex.reps} reps`, ex.rest && `${ex.rest} repos`]
                                  .filter(Boolean)
                                  .join(' · ') || 'Paramètres à compléter'}
                              </div>
                            </div>
                            {active ? <StatusBadge tone="accent">Ouvert</StatusBadge> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="Séance vide"
                description="Ajoute un exercice pour commencer à structurer ta séance."
              />
            )}
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead title="Édition rapide" caption="Modifie les paramètres essentiels de l’exercice sélectionné." />
            {!selectedExercise ? (
              <EmptyPanel
                title="Aucun exercice sélectionné"
                description="Clique sur un exercice à gauche pour afficher ses détails."
              />
            ) : (
              <div className="ui-stack">
                <div>
                  <label className="ui-label">Nom</label>
                  <input
                    className="ui-input"
                    value={selectedExercise.name || ''}
                    onChange={(e) => updateExerciseField('name', e.target.value)}
                  />
                </div>

                <div className="ui-grid-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <div>
                    <label className="ui-label">Séries</label>
                    <input
                      className="ui-input"
                      value={selectedExercise.sets || ''}
                      onChange={(e) => updateExerciseField('sets', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ui-label">Reps</label>
                    <input
                      className="ui-input"
                      value={selectedExercise.reps || ''}
                      onChange={(e) => updateExerciseField('reps', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ui-label">Repos</label>
                    <input
                      className="ui-input"
                      value={selectedExercise.rest || ''}
                      onChange={(e) => updateExerciseField('rest', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="ui-label">Image URL</label>
                  <input
                    className="ui-input"
                    value={selectedExercise.image_url || ''}
                    onChange={(e) => updateExerciseField('image_url', e.target.value)}
                  />
                </div>

                <div>
                  <label className="ui-label">Notes coach</label>
                  <textarea
                    className="ui-textarea"
                    value={selectedExercise.notes || ''}
                    onChange={(e) => updateExerciseField('notes', e.target.value)}
                  />
                </div>

                <div className="ui-toolbar">
                  <div className="ui-cluster">
                    <button type="button" className="ui-button ui-button--secondary" onClick={duplicateExercise} disabled={saving}>
                      Dupliquer
                    </button>
                  </div>
                  <div className="ui-muted" style={{ fontSize: 13 }}>
                    {saving ? 'Sauvegarde…' : 'Sauvegarde instantanée'}
                  </div>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Contexte" caption="Tout ce qu’il faut pour exécuter l’exercice proprement." />

            {!selectedExercise ? (
              <EmptyPanel title="Aucun exercice" description="Sélectionne un exercice pour afficher son contexte." />
            ) : (
              <div className="ui-stack">
                {selectedExercise.image_url ? (
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
                      src={selectedExercise.image_url}
                      alt={selectedExercise.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <EmptyPanel
                    title="Aucune image"
                    description="Ajoute une image URL pour avoir une référence visuelle."
                  />
                )}

                <div className="ui-card ui-card--soft ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Exercice sélectionné</div>
                  <div className="ui-muted">{selectedExercise.name || 'Exercice'}</div>
                </div>

                {latestLog ? (
                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                    <div className="ui-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span>🕐 Dernière fois :</span>
                      {latestLog.weight_used ? <span style={{ fontWeight: 700, color: '#0D1B4E' }}>{latestLog.weight_used}</span> : null}
                      {latestLog.reps_done ? <span>{latestLog.reps_done} reps</span> : null}
                      <span style={{ color: '#9AA' }}>
                        {new Date(latestLog.logged_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ui-card ui-card--padded">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernière performance</div>
                    <div className="ui-muted">Aucun log encore enregistré pour cet exercice.</div>
                  </div>
                )}

                <div className="ui-card ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Historique rapide</div>
                  {logsForSelectedExercise.length ? (
                    <div className="ui-stack" style={{ gap: 10 }}>
                      {logsForSelectedExercise.slice(0, 5).map((log) => (
                        <div key={log.id} className="ui-list-item" style={{ padding: '10px 12px' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{log.weight_used || '—'} {log.reps_done ? `· ${log.reps_done} reps` : ''}</div>
                            <div className="ui-muted" style={{ fontSize: 12 }}>
                              {new Date(log.logged_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          {log.rpe ? <StatusBadge tone="default">RPE {log.rpe}</StatusBadge> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ui-muted">Pas encore d’historique exploitable.</div>
                  )}
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}
